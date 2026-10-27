-- ===================================================================
-- O MOTOR DA MATRIZ DE RLS  (item TR-07.3)
-- ===================================================================
--
-- ⚠️  NUNCA rodar no Supabase de verdade. Este arquivo roda um insert, um
--     update e um delete em TODAS as tabelas, uma vez por papel. No banco
--     descartável do teste isso é inofensivo (cada sonda é desfeita na hora);
--     num banco de verdade seria um estrago.
--
-- Ele preenche `teste_rls.resultado` com uma linha por
-- (tabela × comando × papel), contendo quantas linhas aquele papel conseguiu
-- mexer. Quem compara isso com o expectativas.csv é o rodar.mjs.
--
-- Quatro decisões que valem entender antes de mexer aqui:
--
-- 1. CADA SONDA É DESFEITA. O bloco faz a conta e em seguida levanta um erro
--    de mentira (`ZZ001`) só pra o Postgres desfazer a subtransação. É o que
--    permite medir "quantas linhas eu conseguiria apagar" sem apagar nada e
--    sem uma sonda contaminar a próxima. Variável de PL/pgSQL não volta
--    atrás junto com a subtransação — é por isso que a contagem sobrevive.
--
-- 2. `session_replication_role = replica` DESLIGA GATILHO E CHAVE
--    ESTRANGEIRA — e NÃO desliga RLS (isso foi conferido, não suposto).
--    Sem ele, apagar um cliente que tem veículo daria erro de chave, e esse
--    erro se pareceria com "a RLS bloqueou". A sonda mede RLS e só RLS.
--
-- 3. ERRO QUE NÃO É DE RLS ESTOURA A RODADA, em vez de virar um zero. Um
--    zero silencioso é justamente o modo de falha que este teste existe pra
--    caçar; se a sonda em si estiver quebrada (coluna que não existe, CHECK
--    violado), isso tem que aparecer como vermelho, não como "bloqueado".
--
-- 4. AS VIEWS TAMBÉM SÃO SONDADAS, e nelas a regra do item 3 se inverte.
--    Uma view que existe pra abrir uma janela numa tabela fechada (a
--    `funcionarios_publico` do TR-04.3) roda com os direitos do dono, e por
--    isso NÃO reage a RLS nenhuma: o que a limita é o `where` escrito dentro
--    dela e o GRANT de quem pode chamá-la. Então, só pra view, "permission
--    denied" é resultado legítimo — é a tranca funcionando — e vira zero, em
--    vez de estourar a rodada. Numa tabela continua sendo banco montado
--    errado, como antes.
-- ===================================================================

drop table if exists teste_rls.resultado;
create table teste_rls.resultado (
  tabela   text not null,
  comando  text not null,
  papel    text not null,
  linhas   int,
  erro     text,
  primary key (tabela, comando, papel)
);

drop table if exists teste_rls.papeis;
create table teste_rls.papeis (
  papel     text primary key,
  ordem     int not null,
  db_role   text not null,
  uid       text not null
);
insert into teste_rls.papeis (papel, ordem, db_role, uid) values
  ('admin_ab',  1, 'authenticated', 'aaaaaaaa-1111-1111-1111-111111111111'),
  ('admin_a',   2, 'authenticated', 'aaaaaaaa-2222-2222-2222-222222222222'),
  ('caixa_a',   3, 'authenticated', 'aaaaaaaa-3333-3333-3333-333333333333'),
  ('orfao',     4, 'authenticated', 'aaaaaaaa-4444-4444-4444-444444444444'),
  ('sem_login', 5, 'anon',          '');

do $$
declare
  r_tabela   record;
  r_papel    record;
  comando    text;
  coluna_pk  text;
  sonda      text;
  contagem   int;
  problema   text;
begin
  for r_tabela in
    -- Tabelas com RLS ligada, mais TODAS as views do schema public. A view
    -- entra porque ela é, por construção, um caminho que não passa pela RLS:
    -- deixá-la de fora seria medir a tranca e ignorar a janela ao lado.
    select c.relname as tabela,
           c.relkind = 'v' as e_view,
           coalesce(
             (select a.attname
                from pg_index i
                join pg_attribute a
                  on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
               where i.indrelid = c.oid and i.indisprimary),
             -- View não tem chave primária: a sonda de UPDATE escreve a
             -- primeira coluna nela mesma, que serve igual.
             (select a.attname from pg_attribute a
               where a.attrelid = c.oid and a.attnum = 1 and c.relkind = 'v')
           ) as pk
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where (c.relkind = 'r' and c.relrowsecurity) or c.relkind = 'v'
     order by c.relname
  loop
    if r_tabela.pk is null then
      raise exception 'A tabela % tem RLS mas não tem chave primária — a sonda de UPDATE precisa de uma coluna pra escrever nela mesma', r_tabela.tabela;
    end if;
    coluna_pk := quote_ident(r_tabela.pk);

    for comando in select unnest(array['select','insert','update','delete']) loop
      -- Monta a sonda: sempre uma consulta que devolve UMA contagem.
      if comando = 'select' then
        sonda := format('select count(*) from %I', r_tabela.tabela);
      elsif comando = 'insert' then
        select s.insercao into sonda from teste_rls.sondas s where s.tabela = r_tabela.tabela;
        if sonda is null then
          raise exception 'Falta a sonda de INSERT da tabela % em sondas.sql (toda tabela com RLS precisa de uma)', r_tabela.tabela;
        end if;
        sonda := format('with s as (%s returning 1) select count(*) from s', sonda);
      elsif comando = 'update' then
        -- Escreve a chave primária nela mesma: não muda valor nenhum, e
        -- serve pra qualquer tabela sem precisar declarar coluna por tabela.
        sonda := format('with s as (update %I set %s = %s returning 1) select count(*) from s',
                        r_tabela.tabela, coluna_pk, coluna_pk);
      else
        sonda := format('with s as (delete from %I returning 1) select count(*) from s', r_tabela.tabela);
      end if;

      for r_papel in select * from teste_rls.papeis order by ordem loop
        contagem := null;
        problema := null;
        begin
          -- A ordem importa: `replica` exige superusuário, então é setado
          -- ANTES de virar o operador.
          execute 'set local session_replication_role = replica';
          execute 'set local role ' || quote_ident(r_papel.db_role);
          perform set_config('request.jwt.claim.sub', r_papel.uid, true);

          execute sonda into contagem;

          -- Deu certo: levanta o erro de mentira pra desfazer a sonda.
          raise exception using errcode = 'ZZ001', message = 'desfazer sonda';
        exception
          when sqlstate 'ZZ001' then
            null;  -- caminho normal: `contagem` sobreviveu
          when insufficient_privilege then
            -- 42501 chega por DOIS motivos bem diferentes, e confundir os
            -- dois faria o teste passar pelo motivo errado:
            --   • "violates row-level security policy" — a RLS recusou. É
            --     resultado legítimo da matriz: zero linhas.
            --   • "permission denied for table" — faltou GRANT. Isso NÃO é
            --     RLS; é o banco montado errado, e tem que aparecer vermelho.
            if sqlerrm like '%row-level security%' then
              contagem := 0;
            elsif r_tabela.e_view then
              -- Numa view, o GRANT É a tranca (decisão 4 do cabeçalho).
              contagem := 0;
            else
              problema := sqlstate || ': ' || sqlerrm;
              contagem := null;
            end if;
          when others then
            -- Numa view que o Postgres não sabe atualizar (GROUP BY, como a
            -- `estoque_saldos` da 0073), a escrita é recusada antes até do
            -- GRANT ("cannot insert into view", 55000). Também é tranca, e
            -- vira zero; em tabela, ou com outro erro, continua vermelho.
            if r_tabela.e_view and sqlstate = '55000' and sqlerrm like 'cannot % view %' then
              contagem := 0;
            else
              problema := sqlstate || ': ' || sqlerrm;
              contagem := null;
            end if;
        end;

        insert into teste_rls.resultado (tabela, comando, papel, linhas, erro)
        values (r_tabela.tabela, comando, r_papel.papel, contagem, problema);
      end loop;
    end loop;
  end loop;
end;
$$;

-- Sakura System — AutoCenter Edition
-- TESTE da migration 0082 (o link de avaliação no Google, #459). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava dado de
-- teste (e apaga o que gravou no fim).
--
-- A promessa:
--   • a tabela `configuracoes_avaliacao` existe, com o `loja_id` de chave
--     (uma linha por loja) e o link obrigatório;
--   • a trava aceita um link de verdade (https://g.page/r/abc/review) e
--     recusa http://, link sem https://, "https://" sozinho e link com
--     espaço, pela trava com o nome que a tela traduz (src/lib/errors.ts);
--   • apagar o link é apagar a linha;
--   • a RLS está ligada, com a policy de acesso por loja;
--   • rodar a migration de novo não quebra nem duplica a trava nem a policy.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql
-- (depois da instalação completa), ou `npm run test:sql -- testar-link-avaliacao`.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0082; esta segunda rodada é a de
-- "rodar de novo" (idempotente).
\ir ../migrations/0082_link_avaliacao.sql

do $$
declare
  loja     uuid := '04590000-0000-0000-0000-00000000000a';
  link     text;
  n        int;
  proibido text;
begin
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 82) then
    raise exception 'FALHOU 1: a 0082 não gravou a versão 82';
  end if;

  -- 2. a tabela existe, o link é obrigatório e o loja_id é a chave inteira
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'configuracoes_avaliacao'
     and column_name = 'link_google'
     and data_type = 'text'
     and is_nullable = 'NO';
  if n <> 1 then
    raise exception 'FALHOU 2: a coluna link_google não existe como text obrigatório';
  end if;
  if (select array_agg(a.attname::text)
        from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
       where i.indrelid = 'configuracoes_avaliacao'::regclass
         and i.indisprimary) is distinct from array['loja_id'] then
    raise exception 'FALHOU 2: a chave de configuracoes_avaliacao devia ser só o loja_id';
  end if;

  -- 3. a trava e a policy existem uma vez só (a segunda rodada não duplicou),
  --    e a RLS está ligada
  select count(*) into n
    from pg_constraint c
   where c.conrelid = 'configuracoes_avaliacao'::regclass
     and c.conname = 'ck_configuracoes_avaliacao_link_https';
  if n <> 1 then
    raise exception 'FALHOU 3: esperava 1 trava ck_configuracoes_avaliacao_link_https, achou %', n;
  end if;
  select count(*) into n
    from pg_policies
   where tablename = 'configuracoes_avaliacao';
  if n <> 1 then
    raise exception 'FALHOU 3: esperava 1 policy em configuracoes_avaliacao, achou %', n;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'configuracoes_avaliacao'::regclass) then
    raise exception 'FALHOU 3: a RLS de configuracoes_avaliacao está desligada';
  end if;

  -- ---- preparo -------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values (loja, 'Loja (teste link de avaliação)', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  -- 4. loja nova não tem link (sem linha = sem botão)
  if exists (select 1 from configuracoes_avaliacao where loja_id = loja) then
    raise exception 'FALHOU 4: a loja nova já nasceu com link de avaliação';
  end if;

  -- 5. aceita um link de verdade, e a data de atualização vem sozinha
  insert into configuracoes_avaliacao (loja_id, link_google)
    values (loja, 'https://g.page/r/abc/review');
  select link_google into link from configuracoes_avaliacao where loja_id = loja;
  if link is distinct from 'https://g.page/r/abc/review' then
    raise exception 'FALHOU 5: gravou o link e voltou %', link;
  end if;
  if (select atualizado_em from configuracoes_avaliacao where loja_id = loja) is null then
    raise exception 'FALHOU 5: atualizado_em veio vazio';
  end if;

  -- 6. uma linha por loja: a segunda vira chave duplicada
  begin
    insert into configuracoes_avaliacao (loja_id, link_google)
      values (loja, 'https://g.page/r/outro/review');
    raise exception 'FALHOU 6: a loja ficou com dois links';
  exception
    when unique_violation then null;
  end;

  -- 7. recusa o que não é link https, pela trava certa
  foreach proibido in array array[
    'http://g.page/r/abc/review',
    'g.page/r/abc/review',
    'https://',
    'https://g.page/r/abc /review',
    ' https://g.page/r/abc/review',
    'https://g.page/r/abc/review '
  ] loop
    begin
      update configuracoes_avaliacao set link_google = proibido where loja_id = loja;
      raise exception 'FALHOU 7: a trava deixou passar "%"', proibido;
    exception
      when check_violation then
        if sqlerrm not like '%ck_configuracoes_avaliacao_link_https%' then
          raise exception 'FALHOU 7: esperava a trava ck_configuracoes_avaliacao_link_https, veio: %', sqlerrm;
        end if;
    end;
  end loop;

  -- 8. o link vazio não entra (apagar o link é apagar a linha)
  begin
    update configuracoes_avaliacao set link_google = null where loja_id = loja;
    raise exception 'FALHOU 8: o link aceitou ficar vazio';
  exception
    when not_null_violation then null;
  end;

  -- 9. apagar o link é apagar a linha
  delete from configuracoes_avaliacao where loja_id = loja;
  if exists (select 1 from configuracoes_avaliacao where loja_id = loja) then
    raise exception 'FALHOU 9: o link não foi apagado';
  end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from configuracoes_avaliacao where loja_id = loja;
  delete from depositos where loja_id = loja;
  delete from configuracoes_garantia where loja_id = loja;
  delete from configuracoes_fiscais_loja where loja_id = loja;
  delete from configuracoes_painel_inicio where loja_id = loja;
  delete from configuracoes_juros_parcelas where loja_id = loja;
  delete from lojas where id = loja;
  delete from auditoria;
end;
$$;

\echo TODAS AS CHECAGENS PASSARAM

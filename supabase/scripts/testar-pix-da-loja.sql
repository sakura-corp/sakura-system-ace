-- Sakura System — AutoCenter Edition
-- TESTE da migration 0081 (a chave Pix da loja, #456). NÃO é migration, e
-- NUNCA deve ser rodado no Supabase de verdade — grava dado de teste (e apaga
-- o que gravou no fim). Só dado inventado: nenhuma chave Pix de verdade.
--
-- A promessa:
--   • a tabela `configuracoes_pix` existe, com as três travas e as quatro
--     policies, uma vez só (rodar a migration de novo não duplica nada);
--   • aceita o dado de verdade (inclusive no tamanho máximo) e recusa nome
--     com 26 letras, cidade com 16, chave vazia ou só espaço e chave com 78,
--     cada um pela trava com o nome que a tela traduz (src/lib/errors.ts);
--   • a chave Pix é pra onde vai o dinheiro do cliente, então:
--       – o balconista da loja LÊ a linha da loja dele (precisa, pra montar a
--         cobrança), mas NÃO grava, NÃO altera e NÃO apaga;
--       – o admin da loja grava, altera e apaga, só na loja dele;
--       – quem é de outra loja não lê; o anônimo não lê nem grava;
--       – o admin desligado (ativo = false) não altera;
--   • trocar a chave fica na trilha de auditoria.
--
-- As checagens de "não altera / não apaga" são SEM filtro e contam com
-- `get diagnostics ... = row_count` (§6 item 74): um `where loja_id = ...`
-- faria a regra de LEITURA valer junto, e o teste passaria pelo motivo
-- errado.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: `npm run test:sql -- testar-pix-da-loja`. Terminou imprimindo
-- "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0081; esta segunda rodada é a de
-- "rodar de novo" (idempotente).
\ir ../migrations/0081_pix_da_loja.sql

do $$
declare
  loja_a    uuid := '04560000-0000-0000-0000-00000000000a';
  loja_b    uuid := '04560000-0000-0000-0000-00000000000b';
  o_admin_a uuid := '04561111-0000-0000-0000-000000000001';  -- admin só da loja A
  o_balcao_a uuid := '04561111-0000-0000-0000-000000000002'; -- balconista da loja A (não admin)
  o_balcao_b uuid := '04561111-0000-0000-0000-000000000003'; -- balconista da loja B
  o_admin_b uuid := '04561111-0000-0000-0000-000000000004';  -- admin só da loja B
  o_desligado uuid := '04561111-0000-0000-0000-000000000005'; -- era admin da A, foi desligado
  -- Chaves inventadas: um e-mail de exemplo e um UUID que não é de ninguém.
  chave_a   text := 'pix-teste@exemplo.com.br';
  chave_b   text := '0f0f0f0f-0000-4000-8000-000000000456';
  quantas   int;
  achado    text;
  proibido  text[];
  operador  uuid;
begin
  -- ===================================================================
  -- 1 a 6. A estrutura
  -- ===================================================================
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 81) then
    raise exception 'FALHOU 1: a 0081 não gravou a versão 81';
  end if;

  -- 2. a tabela existe, com as cinco colunas, todas obrigatórias
  select count(*) into quantas
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'configuracoes_pix'
     and column_name in ('loja_id', 'chave', 'nome_recebedor', 'cidade_recebedor', 'atualizado_em')
     and is_nullable = 'NO';
  if quantas <> 5 then
    raise exception 'FALHOU 2: esperava 5 colunas obrigatórias em configuracoes_pix, achou %', quantas;
  end if;

  -- 3. cada trava existe uma vez só (a segunda rodada não duplicou)
  foreach achado in array array['ck_config_pix_chave', 'ck_config_pix_nome_recebedor', 'ck_config_pix_cidade_recebedor'] loop
    select count(*) into quantas
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
     where t.relname = 'configuracoes_pix'
       and c.conname = achado;
    if quantas <> 1 then
      raise exception 'FALHOU 3: esperava 1 trava %, achou %', achado, quantas;
    end if;
  end loop;

  -- 4. RLS ligada
  if not (select relrowsecurity from pg_class where relname = 'configuracoes_pix' and relnamespace = 'public'::regnamespace) then
    raise exception 'FALHOU 4: a RLS de configuracoes_pix está desligada';
  end if;

  -- 5. exatamente as quatro policies, uma por comando — uma `for all` que
  --    sobrasse reabriria a escrita (as policies se somam com OU)
  select count(*) into quantas
    from pg_policies
   where schemaname = 'public' and tablename = 'configuracoes_pix';
  if quantas <> 4 then
    raise exception 'FALHOU 5: configuracoes_pix tem % policies (deviam ser 4, uma por comando)', quantas;
  end if;
  select string_agg(policyname || '=' || cmd, ', ') into achado
    from pg_policies
   where schemaname = 'public' and tablename = 'configuracoes_pix'
     and (policyname, cmd) not in (
       ('configuracoes_pix_leitura', 'SELECT'),
       ('configuracoes_pix_insercao', 'INSERT'),
       ('configuracoes_pix_alteracao', 'UPDATE'),
       ('configuracoes_pix_exclusao', 'DELETE'));
  if achado is not null then
    raise exception 'FALHOU 5b: policy fora do lugar em configuracoes_pix: %', achado;
  end if;

  -- 6. o gatilho da auditoria existe uma vez só
  select count(*) into quantas
    from pg_trigger tg join pg_class t on t.oid = tg.tgrelid
   where t.relname = 'configuracoes_pix' and tg.tgname = 'trigger_auditoria' and not tg.tgisinternal;
  if quantas <> 1 then
    raise exception 'FALHOU 6: esperava 1 gatilho de auditoria em configuracoes_pix, achou %', quantas;
  end if;

  -- ===================================================================
  -- Preparo (como dono do banco, sem RLS)
  -- ===================================================================
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #456)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #456)', 'Araraquara', 'SP');
  insert into auth.users (id) values (o_admin_a), (o_balcao_a), (o_balcao_b), (o_admin_b), (o_desligado)
    on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_admin_a,   't456_admin_a',   'Dono da A (teste #456)',      true,  array[]::text[], true),
    (o_balcao_a,  't456_balcao_a',  'Balcão da A (teste #456)',    false, array['painel', 'ordens_servico', 'caixa', 'contas_receber'], true),
    (o_balcao_b,  't456_balcao_b',  'Balcão da B (teste #456)',    false, array['painel', 'ordens_servico', 'caixa', 'contas_receber'], true),
    (o_admin_b,   't456_admin_b',   'Dono da B (teste #456)',      true,  array[]::text[], true),
    (o_desligado, 't456_desligado', 'Desligado da A (teste #456)', true,  array[]::text[], false);
  insert into operador_lojas (operador_id, loja_id) values
    (o_admin_a, loja_a), (o_balcao_a, loja_a), (o_balcao_b, loja_b), (o_admin_b, loja_b), (o_desligado, loja_a);

  -- A loja B já tem Pix; a loja A começa sem (pra o INSERT do balconista
  -- ser recusado pela RLS, e não pela chave primária repetida).
  insert into configuracoes_pix (loja_id, chave, nome_recebedor, cidade_recebedor)
    values (loja_b, chave_b, 'Loja B Teste', 'Araraquara');

  -- ===================================================================
  -- 7 e 8. As travas (como dono)
  -- ===================================================================
  -- 7. aceita o tamanho máximo de cada campo: 77, 25 e 15
  update configuracoes_pix
     set chave = repeat('a', 77), nome_recebedor = repeat('N', 25), cidade_recebedor = repeat('C', 15)
   where loja_id = loja_b;
  update configuracoes_pix
     set chave = chave_b, nome_recebedor = 'Loja B Teste', cidade_recebedor = 'Araraquara'
   where loja_id = loja_b;

  -- 8. recusa o que não cabe no BR Code, ou em branco, pela trava certa
  foreach proibido slice 1 in array array[
    ['nome_recebedor',   repeat('N', 26), 'ck_config_pix_nome_recebedor'],
    ['nome_recebedor',   '   ',           'ck_config_pix_nome_recebedor'],
    ['cidade_recebedor', repeat('C', 16), 'ck_config_pix_cidade_recebedor'],
    ['cidade_recebedor', '',              'ck_config_pix_cidade_recebedor'],
    ['chave',            '',              'ck_config_pix_chave'],
    ['chave',            '   ',           'ck_config_pix_chave'],
    ['chave',            repeat('a', 78), 'ck_config_pix_chave']
  ] loop
    begin
      execute format('update configuracoes_pix set %I = %L where loja_id = %L', proibido[1], proibido[2], loja_b);
      raise exception 'FALHOU 8: a trava deixou passar % = "%"', proibido[1], proibido[2];
    exception
      when check_violation then
        if sqlerrm not like '%' || proibido[3] || '%' then
          raise exception 'FALHOU 8: % = "%": esperava a trava %, veio: %', proibido[1], proibido[2], proibido[3], sqlerrm;
        end if;
    end;
  end loop;

  -- ===================================================================
  -- 9. Ninguém logado (anon): nem lê, nem grava
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    select count(*) into quantas from configuracoes_pix;
    if quantas <> 0 then
      raise exception 'FALHOU 9a: o anônimo leu % linha(s) de configuracoes_pix', quantas;
    end if;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into configuracoes_pix (loja_id, chave, nome_recebedor, cidade_recebedor)
      values (loja_a, 'anonimo@exemplo.com.br', 'Anonimo', 'Araraquara');
    raise exception 'FALHOU 9b: o anônimo gravou a chave Pix da loja A';
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role authenticated;

  -- ===================================================================
  -- 10 a 13. O balconista da loja A (não admin)
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_balcao_a::text, true);

  -- 10. não grava a chave da loja dele
  begin
    insert into configuracoes_pix (loja_id, chave, nome_recebedor, cidade_recebedor)
      values (loja_a, 'balcao@exemplo.com.br', 'Balconista', 'Araraquara');
    raise exception 'FALHOU 10: o balconista gravou a chave Pix da loja A';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- O admin da A cadastra o Pix da loja (o caminho de verdade, pela RLS).
  perform set_config('request.jwt.claim.sub', o_admin_a::text, true);
  insert into configuracoes_pix (loja_id, chave, nome_recebedor, cidade_recebedor)
    values (loja_a, chave_a, 'Loja A Teste', 'Araraquara');
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU 10b: o admin da A não gravou a chave Pix da loja dele'; end if;

  perform set_config('request.jwt.claim.sub', o_balcao_a::text, true);

  -- 11. lê a linha da loja dele (e só ela)
  select count(*) into quantas from configuracoes_pix;
  if quantas <> 1 then
    raise exception 'FALHOU 11: o balconista da A leu % linha(s) (devia ler só a da loja dele)', quantas;
  end if;
  select chave into achado from configuracoes_pix where loja_id = loja_a;
  if achado is distinct from chave_a then
    raise exception 'FALHOU 11b: o balconista da A não leu a chave da loja dele (veio %)', achado;
  end if;

  -- 12. não altera (sem filtro: conta o que a regra de ALTERAÇÃO deixa)
  begin
    update configuracoes_pix set chave = 'balcao@exemplo.com.br';
    get diagnostics quantas = row_count;
    if quantas <> 0 then
      raise exception 'FALHOU 12: o balconista da A trocou a chave Pix de % loja(s)', quantas;
    end if;
  exception when insufficient_privilege then null;
  end;

  -- 13. não apaga
  begin
    delete from configuracoes_pix;
    get diagnostics quantas = row_count;
    if quantas <> 0 then
      raise exception 'FALHOU 13: o balconista da A apagou o Pix de % loja(s)', quantas;
    end if;
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- 14. Quem é de outra loja não lê a chave da A
  -- ===================================================================
  foreach operador in array array[o_balcao_b, o_admin_b] loop
    perform set_config('request.jwt.claim.sub', operador::text, true);
    select count(*) into quantas from configuracoes_pix where loja_id = loja_a;
    if quantas <> 0 then
      raise exception 'FALHOU 14: % (da loja B) leu a chave Pix da loja A', operador;
    end if;
    select count(*) into quantas from configuracoes_pix;
    if quantas <> 1 then
      raise exception 'FALHOU 14b: % (da loja B) leu % linha(s) (devia ler só a da B)', operador, quantas;
    end if;
  end loop;

  -- ===================================================================
  -- 15. O admin desligado não altera nem apaga
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_desligado::text, true);
  update configuracoes_pix set chave = 'desligado@exemplo.com.br';
  get diagnostics quantas = row_count;
  if quantas <> 0 then raise exception 'FALHOU 15: o admin desligado trocou a chave Pix'; end if;
  delete from configuracoes_pix;
  get diagnostics quantas = row_count;
  if quantas <> 0 then raise exception 'FALHOU 15b: o admin desligado apagou o Pix'; end if;

  -- ===================================================================
  -- 16 a 18. O admin da loja A: mexe na dele, e só na dele
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_admin_a::text, true);

  -- 16. não grava na loja B (a B já tem linha: a recusa tem de ser a da
  --     RLS, não a da chave primária)
  begin
    insert into configuracoes_pix (loja_id, chave, nome_recebedor, cidade_recebedor)
      values (loja_b, 'admin-a@exemplo.com.br', 'Admin A', 'Araraquara');
    raise exception 'FALHOU 16: o admin da A gravou a chave Pix da loja B';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- 17. altera: sem filtro, só a linha da loja dele
  update configuracoes_pix set nome_recebedor = 'Loja A Nova', atualizado_em = now();
  get diagnostics quantas = row_count;
  if quantas <> 1 then
    raise exception 'FALHOU 17: o admin da A alterou % linha(s) (devia ser só a da loja dele)', quantas;
  end if;

  -- 18. apaga: sem filtro, só a linha da loja dele; e grava de novo
  delete from configuracoes_pix;
  get diagnostics quantas = row_count;
  if quantas <> 1 then
    raise exception 'FALHOU 18: o admin da A apagou % linha(s) (devia ser só a da loja dele)', quantas;
  end if;
  insert into configuracoes_pix (loja_id, chave, nome_recebedor, cidade_recebedor)
    values (loja_a, chave_a, 'Loja A Teste', 'Araraquara');

  reset role;

  -- ===================================================================
  -- 19. Conferido como dono: o que os outros tentaram não mudou nada, e a
  --     troca do admin ficou na auditoria
  -- ===================================================================
  if (select chave from configuracoes_pix where loja_id = loja_b) is distinct from chave_b
     or (select nome_recebedor from configuracoes_pix where loja_id = loja_b) <> 'Loja B Teste'
     or (select chave from configuracoes_pix where loja_id = loja_a) is distinct from chave_a then
    raise exception 'FALHOU 19: uma chave Pix mudou sem ser pelo admin da loja';
  end if;
  select count(*) into quantas
    from auditoria
   where tabela = 'configuracoes_pix' and acao = 'atualizar'
     and registro_id = loja_a and operador_id = o_admin_a;
  if quantas <> 1 then
    raise exception 'FALHOU 19b: a troca do admin da A não ficou na auditoria (achou % linha(s))', quantas;
  end if;

  -- ===================================================================
  -- Limpeza
  -- ===================================================================
  delete from configuracoes_pix where loja_id in (loja_a, loja_b);
  delete from depositos where loja_id in (loja_a, loja_b);
  delete from configuracoes_garantia where loja_id in (loja_a, loja_b);
  delete from configuracoes_fiscais_loja where loja_id in (loja_a, loja_b);
  delete from configuracoes_painel_inicio where loja_id in (loja_a, loja_b);
  delete from configuracoes_juros_parcelas where loja_id in (loja_a, loja_b);
  delete from operador_lojas where operador_id in (o_admin_a, o_balcao_a, o_balcao_b, o_admin_b, o_desligado);
  delete from auditoria where operador_id in (o_admin_a, o_balcao_a, o_balcao_b, o_admin_b, o_desligado)
     or tabela = 'configuracoes_pix' or registro_id in (loja_a, loja_b);
  delete from operadores where id in (o_admin_a, o_balcao_a, o_balcao_b, o_admin_b, o_desligado);
  delete from auth.users where id in (o_admin_a, o_balcao_a, o_balcao_b, o_admin_b, o_desligado);
  delete from lojas where id in (loja_a, loja_b);
  delete from auditoria where registro_id in (loja_a, loja_b, o_admin_a, o_balcao_a, o_balcao_b, o_admin_b, o_desligado);
end;
$$;

\echo TODAS AS CHECAGENS PASSARAM

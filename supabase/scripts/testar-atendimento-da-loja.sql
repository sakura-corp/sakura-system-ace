-- Sakura System — AutoCenter Edition
-- TESTE da migration 0092 (o atendimento da loja, #1033). NÃO é migration, e
-- NUNCA deve ser rodado no Supabase de verdade — grava dado de teste (e apaga
-- o que gravou no fim). Só dado inventado: nenhum WhatsApp de verdade.
--
-- A promessa:
--   • a tabela `configuracoes_atendimento` existe, com o `loja_id` de chave
--     (uma linha por loja) e as três informações opcionais;
--   • aceita o dado de verdade e aceita tudo vazio (campo vazio = a linha
--     não aparece no recibo);
--   • recusa, pela trava com o nome que a tela traduz (src/lib/errors.ts):
--     WhatsApp com letra, curto (9), longo (14) ou com máscara; horário em
--     branco, só espaço ou com 81 letras; garantia 0, negativa ou 3651;
--   • a RLS está ligada, com a policy de acesso por loja: quem é da loja lê
--     e grava; quem é de outra loja não lê nem grava; o anônimo também não;
--   • rodar a migration de novo não quebra nem duplica trava nem policy.
--
-- As checagens de "não altera / não apaga" são SEM filtro e contam com
-- `get diagnostics ... = row_count` (§6 item 74), como no testar-pix-da-loja.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: `npm run test:sql -- testar-atendimento-da-loja`. Terminou
-- imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- A instalação completa JÁ rodou a 0092; esta segunda rodada é a de
-- "rodar de novo" (idempotente).
\ir ../migrations/0092_atendimento_da_loja.sql

do $$
declare
  loja_a     uuid := '10330000-0000-0000-0000-00000000000a';
  loja_b     uuid := '10330000-0000-0000-0000-00000000000b';
  o_balcao_a uuid := '10331111-0000-0000-0000-000000000001'; -- balconista só da loja A
  o_balcao_b uuid := '10331111-0000-0000-0000-000000000002'; -- balconista só da loja B
  horario    text := 'Seg a sex, 8h às 18h · Sáb, 8h às 12h';
  n          int;
  achado     text;
  proibido   text[];
begin
  -- ===================================================================
  -- 1 a 3. A estrutura
  -- ===================================================================
  -- 1. a migration grava a versão
  if not exists (select 1 from schema_versao where versao = 92) then
    raise exception 'FALHOU 1: a 0092 não gravou a versão 92';
  end if;

  -- 2. as colunas, com o tipo e o "pode ficar vazio" certos, e o loja_id é
  --    a chave inteira
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'configuracoes_atendimento'
     and (column_name, data_type, is_nullable) in (
       ('loja_id', 'uuid', 'NO'),
       ('whatsapp', 'text', 'YES'),
       ('horario_funcionamento', 'text', 'YES'),
       ('garantia_servico_dias', 'integer', 'YES'),
       ('atualizado_em', 'timestamp with time zone', 'NO'));
  if n <> 5 then
    raise exception 'FALHOU 2: esperava as 5 colunas de configuracoes_atendimento do jeito certo, achou %', n;
  end if;
  if (select array_agg(a.attname::text)
        from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
       where i.indrelid = 'configuracoes_atendimento'::regclass
         and i.indisprimary) is distinct from array['loja_id'] then
    raise exception 'FALHOU 2: a chave de configuracoes_atendimento devia ser só o loja_id';
  end if;

  -- 3. cada trava e a policy existem uma vez só (a segunda rodada não
  --    duplicou), e a RLS está ligada
  foreach achado in array array[
    'ck_configuracoes_atendimento_whatsapp',
    'ck_configuracoes_atendimento_horario',
    'ck_configuracoes_atendimento_garantia'
  ] loop
    select count(*) into n
      from pg_constraint c
     where c.conrelid = 'configuracoes_atendimento'::regclass
       and c.conname = achado;
    if n <> 1 then
      raise exception 'FALHOU 3: esperava 1 trava %, achou %', achado, n;
    end if;
  end loop;
  select count(*) into n
    from pg_policies
   where schemaname = 'public' and tablename = 'configuracoes_atendimento';
  if n <> 1 then
    raise exception 'FALHOU 3: esperava 1 policy em configuracoes_atendimento, achou %', n;
  end if;
  if not (select relrowsecurity from pg_class where oid = 'configuracoes_atendimento'::regclass) then
    raise exception 'FALHOU 3: a RLS de configuracoes_atendimento está desligada';
  end if;

  -- ===================================================================
  -- Preparo (como dono do banco, sem RLS)
  -- ===================================================================
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #1033)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #1033)', 'Araraquara', 'SP');
  insert into auth.users (id) values (o_balcao_a), (o_balcao_b) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_balcao_a, 't1033_balcao_a', 'Balcão da A (teste #1033)', false, array['painel', 'ordens_servico'], true),
    (o_balcao_b, 't1033_balcao_b', 'Balcão da B (teste #1033)', false, array['painel', 'ordens_servico'], true);
  insert into operador_lojas (operador_id, loja_id) values
    (o_balcao_a, loja_a), (o_balcao_b, loja_b);

  -- 4. loja nova não tem linha (tudo vazio)
  if exists (select 1 from configuracoes_atendimento where loja_id in (loja_a, loja_b)) then
    raise exception 'FALHOU 4: a loja nova já nasceu com atendimento';
  end if;

  -- ===================================================================
  -- 5 a 8. As travas (como dono)
  -- ===================================================================
  -- 5. aceita o dado de verdade, e a data de atualização vem sozinha
  insert into configuracoes_atendimento (loja_id, whatsapp, horario_funcionamento, garantia_servico_dias)
    values (loja_a, '16955500199', horario, 90);
  if (select whatsapp from configuracoes_atendimento where loja_id = loja_a) is distinct from '16955500199'
     or (select horario_funcionamento from configuracoes_atendimento where loja_id = loja_a) is distinct from horario
     or (select garantia_servico_dias from configuracoes_atendimento where loja_id = loja_a) is distinct from 90 then
    raise exception 'FALHOU 5: gravou o atendimento e voltou outra coisa';
  end if;
  if (select atualizado_em from configuracoes_atendimento where loja_id = loja_a) is null then
    raise exception 'FALHOU 5: atualizado_em veio vazio';
  end if;
  -- os limites que valem: 10 e 13 dígitos, 80 letras, 1 e 3650 dias
  update configuracoes_atendimento
     set whatsapp = '1695550019', horario_funcionamento = repeat('h', 80), garantia_servico_dias = 1
   where loja_id = loja_a;
  update configuracoes_atendimento
     set whatsapp = '5516955500199', garantia_servico_dias = 3650
   where loja_id = loja_a;

  -- 6. aceita tudo vazio (campo vazio = a linha não aparece no recibo)
  update configuracoes_atendimento
     set whatsapp = null, horario_funcionamento = null, garantia_servico_dias = null
   where loja_id = loja_a;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FALHOU 6: não deixou esvaziar as três informações';
  end if;
  insert into configuracoes_atendimento (loja_id) values (loja_b);

  -- 7. uma linha por loja: a segunda vira chave duplicada
  begin
    insert into configuracoes_atendimento (loja_id, whatsapp) values (loja_a, '16955500199');
    raise exception 'FALHOU 7: a loja ficou com duas linhas de atendimento';
  exception
    when unique_violation then null;
  end;

  -- 8. recusa o que está fora da regra, pela trava certa
  foreach proibido slice 1 in array array[
    ['whatsapp',              '1695550019a',      'ck_configuracoes_atendimento_whatsapp'],
    ['whatsapp',              '169555001',        'ck_configuracoes_atendimento_whatsapp'],
    ['whatsapp',              '55169555001990',   'ck_configuracoes_atendimento_whatsapp'],
    ['whatsapp',              '(16) 95550-0199',  'ck_configuracoes_atendimento_whatsapp'],
    ['whatsapp',              '+5516955500199',   'ck_configuracoes_atendimento_whatsapp'],
    ['whatsapp',              '',                 'ck_configuracoes_atendimento_whatsapp'],
    ['horario_funcionamento', '',                 'ck_configuracoes_atendimento_horario'],
    ['horario_funcionamento', '   ',              'ck_configuracoes_atendimento_horario'],
    ['horario_funcionamento', repeat('h', 81),    'ck_configuracoes_atendimento_horario'],
    ['garantia_servico_dias', '0',                'ck_configuracoes_atendimento_garantia'],
    ['garantia_servico_dias', '-30',              'ck_configuracoes_atendimento_garantia'],
    ['garantia_servico_dias', '3651',             'ck_configuracoes_atendimento_garantia']
  ] loop
    begin
      execute format('update configuracoes_atendimento set %I = %L where loja_id = %L', proibido[1], proibido[2], loja_a);
      raise exception 'FALHOU 8: a trava deixou passar % = "%"', proibido[1], proibido[2];
    exception
      when check_violation then
        if sqlerrm not like '%' || proibido[3] || '%' then
          raise exception 'FALHOU 8: % = "%": esperava a trava %, veio: %', proibido[1], proibido[2], proibido[3], sqlerrm;
        end if;
    end;
  end loop;

  -- Volta o dado de verdade na loja A, pra as checagens de RLS.
  update configuracoes_atendimento
     set whatsapp = '16955500199', horario_funcionamento = horario, garantia_servico_dias = 90
   where loja_id = loja_a;

  -- ===================================================================
  -- 9. Ninguém logado (anon): nem lê, nem grava
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    select count(*) into n from configuracoes_atendimento;
    if n <> 0 then
      raise exception 'FALHOU 9a: o anônimo leu % linha(s) de configuracoes_atendimento', n;
    end if;
  exception when insufficient_privilege then null;
  end;
  begin
    update configuracoes_atendimento set whatsapp = '16900000000';
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'FALHOU 9b: o anônimo alterou % linha(s) de configuracoes_atendimento', n;
    end if;
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role authenticated;

  -- ===================================================================
  -- 10 e 11. O balconista da loja A: lê e grava a dele
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_balcao_a::text, true);

  -- 10. lê só a linha da loja dele
  select count(*) into n from configuracoes_atendimento;
  if n <> 1 then
    raise exception 'FALHOU 10: o balconista da A leu % linha(s) (devia ler só a da loja dele)', n;
  end if;
  if (select whatsapp from configuracoes_atendimento where loja_id = loja_a) is distinct from '16955500199' then
    raise exception 'FALHOU 10b: o balconista da A não leu o atendimento da loja dele';
  end if;

  -- 11. altera: sem filtro, só a linha da loja dele
  update configuracoes_atendimento set garantia_servico_dias = 180, atualizado_em = now();
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FALHOU 11: o balconista da A alterou % linha(s) (devia ser só a da loja dele)', n;
  end if;

  -- ===================================================================
  -- 12 a 15. Quem é de outra loja (balconista da B) não lê nem grava a A
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_balcao_b::text, true);

  -- 12. não lê a linha da A (e lê só a da B)
  select count(*) into n from configuracoes_atendimento where loja_id = loja_a;
  if n <> 0 then
    raise exception 'FALHOU 12: o balconista da B leu o atendimento da loja A';
  end if;
  select count(*) into n from configuracoes_atendimento;
  if n <> 1 then
    raise exception 'FALHOU 12b: o balconista da B leu % linha(s) (devia ler só a da B)', n;
  end if;

  -- 13. não altera a da A (a única linha que ele alcança é a da B)
  update configuracoes_atendimento set whatsapp = '16900000000' where loja_id = loja_a;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU 13: o balconista da B alterou o atendimento da loja A';
  end if;

  -- 14. não apaga a da A
  delete from configuracoes_atendimento where loja_id = loja_a;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU 14: o balconista da B apagou o atendimento da loja A';
  end if;

  -- 15. não leva a linha dele pra loja A: o `with check` tem de recusar
  --     (pela RLS, e não pela chave duplicada)
  begin
    update configuracoes_atendimento set loja_id = loja_a where loja_id = loja_b;
    raise exception 'FALHOU 15: o balconista da B mudou a linha dele pra loja A';
  exception
    when insufficient_privilege then
      if sqlerrm not like '%row-level security%' then raise; end if;
    when unique_violation then
      raise exception 'FALHOU 15: o with check deixou passar (bateu só na chave duplicada)';
  end;

  reset role;

  -- 16. a loja A sem linha: quem é de outra loja não cria
  delete from configuracoes_atendimento where loja_id = loja_a;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_balcao_b::text, true);
  begin
    insert into configuracoes_atendimento (loja_id, whatsapp) values (loja_a, '16900000000');
    raise exception 'FALHOU 16: o balconista da B gravou o atendimento da loja A';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  -- e quem é da loja cria
  perform set_config('request.jwt.claim.sub', o_balcao_a::text, true);
  insert into configuracoes_atendimento (loja_id, whatsapp) values (loja_a, '16955500199');
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'FALHOU 16b: o balconista da A não gravou o atendimento da loja dele';
  end if;
  reset role;

  -- ===================================================================
  -- Limpeza
  -- ===================================================================
  delete from configuracoes_atendimento where loja_id in (loja_a, loja_b);
  delete from depositos where loja_id in (loja_a, loja_b);
  delete from configuracoes_garantia where loja_id in (loja_a, loja_b);
  delete from configuracoes_fiscais_loja where loja_id in (loja_a, loja_b);
  delete from configuracoes_painel_inicio where loja_id in (loja_a, loja_b);
  delete from configuracoes_juros_parcelas where loja_id in (loja_a, loja_b);
  delete from operador_lojas where operador_id in (o_balcao_a, o_balcao_b);
  delete from auditoria where operador_id in (o_balcao_a, o_balcao_b) or registro_id in (loja_a, loja_b);
  delete from operadores where id in (o_balcao_a, o_balcao_b);
  delete from auth.users where id in (o_balcao_a, o_balcao_b);
  delete from lojas where id in (loja_a, loja_b);
  delete from auditoria where registro_id in (loja_a, loja_b, o_balcao_a, o_balcao_b);
end;
$$;

\echo TODAS AS CHECAGENS PASSARAM

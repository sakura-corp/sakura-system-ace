-- Sakura System — AutoCenter Edition
-- TESTE da migration 0091 ("De onde veio", a origem do cliente, #1021). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava dado de
-- teste (dentro de uma transação que é desfeita no fim, então não sobra nada).
--
-- A promessa:
--   • `clientes` e `ordens_servico` ganharam `origem` e `origem_detalhe`,
--     opcionais: cliente, OS, orçamento e venda continuam salvando SEM elas;
--   • o banco aceita só os 7 valores da lista (ou vazio), e o detalhe tem no
--     máximo 80 letras — travas com o nome que a tela traduz;
--   • o Consumidor nunca tem origem, nem pela API;
--   • cliente SEM origem que ganha uma OS (ou orçamento, ou venda) com origem
--     passa a ter aquela origem; trocar a origem na OS NÃO muda o cliente que
--     já tem uma; e isso vale também pra quem tem só o módulo OS (que não
--     grava em `clientes`);
--   • o cadastro rápido grava a origem (vazio vira nulo);
--   • rodar a migration de novo não quebra nem duplica nada.
--
-- A rodada usa o arquivo da migration DE VERDADE (\ir), não uma cópia.
-- Como rodar: `npm run test:sql -- testar-origem-do-cliente` (ver o
-- cabeçalho de scripts/testar-sql.mjs), depois da instalação completa.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

\set ON_ERROR_STOP 1

begin;

-- O que a loja já preencheu antes da segunda rodada: tem que sobreviver.
insert into clientes (id, nome, origem, origem_detalhe) values
  ('10210000-0000-0000-0000-0000000000c9', 'Cliente que já tinha origem (#1021)', 'google', 'busca "pneu araraquara"');

-- A segunda rodada: idempotente, sem erro.
\ir ../migrations/0091_origem_do_cliente.sql

do $$
declare
  loja       uuid := '10210000-0000-0000-0000-00000000000a';
  o_os       uuid := '10211111-0000-0000-0000-000000000001';  -- só OS
  c_sem      uuid := '10212222-0000-0000-0000-000000000001';  -- sem origem
  c_com      uuid := '10212222-0000-0000-0000-000000000002';  -- com origem
  c_orc      uuid := '10212222-0000-0000-0000-000000000003';  -- herda pelo orçamento
  c_venda    uuid := '10212222-0000-0000-0000-000000000004';  -- herda pela venda
  c_edicao   uuid := '10212222-0000-0000-0000-000000000005';  -- herda ao editar a OS
  c_balcao   uuid := '10212222-0000-0000-0000-000000000006';  -- herda pelo balconista (só OS)
  consumidor uuid := '00000000-0000-0000-0000-00000000c000';
  os_id      uuid;
  linha      clientes%rowtype;
  resposta   jsonb;
  n          int;
begin
  -- 1. a migration grava a versão, e a segunda rodada não estragou o que havia
  if not exists (select 1 from schema_versao where versao = 91) then
    raise exception 'FALHOU 1: a 0091 não gravou a versão 91';
  end if;
  select * into linha from clientes where id = '10210000-0000-0000-0000-0000000000c9';
  if linha.origem is distinct from 'google' or linha.origem_detalhe is distinct from 'busca "pneu araraquara"' then
    raise exception 'FALHOU 1: rodar de novo mexeu na origem que a loja já tinha (%/%)', linha.origem, linha.origem_detalhe;
  end if;
  select count(*) into n from pg_constraint
   where conname in ('ck_clientes_origem', 'ck_ordens_servico_origem', 'ck_clientes_origem_detalhe',
                     'ck_ordens_servico_origem_detalhe', 'ck_clientes_consumidor_sem_origem');
  if n <> 5 then
    raise exception 'FALHOU 1: esperava 5 travas da origem e achei %', n;
  end if;
  select count(*) into n from pg_trigger where tgname = 'trigger_origem_da_ordem_no_cliente';
  if n <> 1 then
    raise exception 'FALHOU 1: esperava 1 gatilho da origem e achei %', n;
  end if;

  -- 2. a instalação não deu origem a ninguém (nem ao Consumidor)
  select count(*) into n from clientes where origem is not null and id <> '10210000-0000-0000-0000-0000000000c9';
  if n <> 0 then
    raise exception 'FALHOU 2: a instalação deixou % cliente(s) com origem', n;
  end if;

  -- ---- preparo -------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values (loja, 'Loja da origem (#1021)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into auth.users (id) values (o_os) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_os, 'teste_origem_os', 'Balcão de OS (#1021)', false, array['painel','ordens_servico'], true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values (o_os, loja) on conflict do nothing;

  -- 3. salvar SEM origem continua funcionando: cliente, OS, orçamento e venda
  insert into clientes (id, nome) values (c_sem, 'Sem origem (#1021)');
  insert into clientes (id, nome, origem, origem_detalhe) values (c_com, 'Veio por indicação (#1021)', 'indicacao', 'Zé da padaria');
  insert into clientes (id, nome) values (c_orc, 'Herda pelo orçamento (#1021)'), (c_venda, 'Herda pela venda (#1021)'),
    (c_edicao, 'Herda ao editar (#1021)'), (c_balcao, 'Herda pelo balconista (#1021)');
  insert into ordens_servico (loja_id, cliente_id) values (loja, c_sem) returning id into os_id;
  if (select origem from ordens_servico where id = os_id) is not null then
    raise exception 'FALHOU 3: OS sem origem nasceu com origem';
  end if;
  insert into ordens_servico (loja_id, cliente_id, status, validade) values (loja, c_sem, 'orcamento', current_date + 7);
  insert into ordens_servico (loja_id, cliente_id, tipo, status) values (loja, consumidor, 'venda_balcao', 'concluida');
  if (select origem from clientes where id = c_sem) is not null then
    raise exception 'FALHOU 3: OS sem origem deu origem ao cliente';
  end if;

  -- 4. valor fora da lista é recusado, no cliente e na OS
  begin
    insert into clientes (nome, origem) values ('Origem inventada', 'tiktok');
    raise exception 'FALHOU 4: o cliente aceitou a origem "tiktok"';
  exception when check_violation then
    if sqlerrm not like '%ck_clientes_origem%' then raise; end if;
  end;
  begin
    insert into ordens_servico (loja_id, cliente_id, origem) values (loja, c_sem, 'Indicação');
    raise exception 'FALHOU 4: a OS aceitou a origem "Indicação" (rótulo em vez do valor)';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_origem%' then raise; end if;
  end;
  -- e texto vazio também não é valor (vazio é nulo)
  begin
    insert into ordens_servico (loja_id, cliente_id, origem) values (loja, c_sem, '');
    raise exception 'FALHOU 4: a OS aceitou origem em branco ("")';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_origem%' then raise; end if;
  end;

  -- 5. o detalhe tem no máximo 80 letras (80 passa, 81 não)
  insert into clientes (nome, origem_detalhe) values ('Detalhe no limite', repeat('a', 80));
  begin
    insert into clientes (nome, origem_detalhe) values ('Detalhe comprido', repeat('a', 81));
    raise exception 'FALHOU 5: o cliente aceitou detalhe com 81 letras';
  exception when check_violation then
    if sqlerrm not like '%ck_clientes_origem_detalhe%' then raise; end if;
  end;
  begin
    insert into ordens_servico (loja_id, cliente_id, origem_detalhe) values (loja, c_sem, repeat('a', 81));
    raise exception 'FALHOU 5: a OS aceitou detalhe com 81 letras';
  exception when check_violation then
    if sqlerrm not like '%ck_ordens_servico_origem_detalhe%' then raise; end if;
  end;

  -- 6. o Consumidor nunca tem origem, nem gravada direto
  begin
    update clientes set origem = 'passou_na_frente' where id = consumidor;
    raise exception 'FALHOU 6: o Consumidor aceitou origem';
  exception when check_violation then
    if sqlerrm not like '%ck_clientes_consumidor_sem_origem%' then raise; end if;
  end;
  begin
    update clientes set origem_detalhe = 'alguém' where id = consumidor;
    raise exception 'FALHOU 6: o Consumidor aceitou detalhe de origem';
  exception when check_violation then
    if sqlerrm not like '%ck_clientes_consumidor_sem_origem%' then raise; end if;
  end;

  -- 7. a venda no Consumidor guarda a origem NA VENDA, e o Consumidor fica sem
  insert into ordens_servico (loja_id, cliente_id, tipo, status, origem)
    values (loja, consumidor, 'venda_balcao', 'concluida', 'passou_na_frente') returning id into os_id;
  if (select origem from ordens_servico where id = os_id) is distinct from 'passou_na_frente' then
    raise exception 'FALHOU 7: a venda no Consumidor não guardou a origem';
  end if;
  if (select origem from clientes where id = consumidor) is not null then
    raise exception 'FALHOU 7: o Consumidor ganhou origem pela venda';
  end if;

  -- 8. cliente sem origem herda a da primeira OS com origem (com o detalhe)
  insert into ordens_servico (loja_id, cliente_id, origem, origem_detalhe)
    values (loja, c_sem, 'anuncio_redes', 'IG-pneu-nov');
  select * into linha from clientes where id = c_sem;
  if linha.origem is distinct from 'anuncio_redes' or linha.origem_detalhe is distinct from 'IG-pneu-nov' then
    raise exception 'FALHOU 8: o cliente sem origem não herdou a da OS (ficou %/%)', linha.origem, linha.origem_detalhe;
  end if;

  -- 9. ... e a OS seguinte, com outra origem, NÃO troca a dele
  insert into ordens_servico (loja_id, cliente_id, origem) values (loja, c_sem, 'google');
  if (select origem from clientes where id = c_sem) is distinct from 'anuncio_redes' then
    raise exception 'FALHOU 9: a segunda OS trocou a origem do cliente';
  end if;

  -- 10. trocar a origem na OS não muda o cliente que já tem uma
  insert into ordens_servico (loja_id, cliente_id, origem) values (loja, c_com, 'indicacao') returning id into os_id;
  update ordens_servico set origem = 'google', origem_detalhe = null where id = os_id;
  select * into linha from clientes where id = c_com;
  if linha.origem is distinct from 'indicacao' or linha.origem_detalhe is distinct from 'Zé da padaria' then
    raise exception 'FALHOU 10: trocar na OS mudou o cliente (ficou %/%)', linha.origem, linha.origem_detalhe;
  end if;
  if (select origem from ordens_servico where id = os_id) is distinct from 'google' then
    raise exception 'FALHOU 10: a OS não guardou a origem trocada';
  end if;

  -- 11. o orçamento e a venda também passam a origem pro cliente sem nenhuma
  insert into ordens_servico (loja_id, cliente_id, status, validade, origem)
    values (loja, c_orc, 'orcamento', current_date + 7, 'parceiro');
  if (select origem from clientes where id = c_orc) is distinct from 'parceiro' then
    raise exception 'FALHOU 11: o orçamento não passou a origem pro cliente';
  end if;
  insert into ordens_servico (loja_id, cliente_id, tipo, status, origem)
    values (loja, c_venda, 'venda_balcao', 'concluida', 'outro');
  if (select origem from clientes where id = c_venda) is distinct from 'outro' then
    raise exception 'FALHOU 11: a venda não passou a origem pro cliente';
  end if;

  -- 12. OS aberta sem origem e preenchida depois, na edição: o cliente herda
  insert into ordens_servico (loja_id, cliente_id) values (loja, c_edicao) returning id into os_id;
  update ordens_servico set origem = 'ja_era_cliente' where id = os_id;
  if (select origem from clientes where id = c_edicao) is distinct from 'ja_era_cliente' then
    raise exception 'FALHOU 12: preencher a origem na edição da OS não passou pro cliente';
  end if;

  -- ===================================================================
  -- Quem tem só o módulo OS: não grava em clientes, e a herança vale igual
  -- ===================================================================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_os::text, true);

  -- 13. ele não consegue gravar a origem do cliente direto (a regra de sempre)
  update clientes set origem = 'google' where id = c_balcao;
  reset role;
  if (select origem from clientes where id = c_balcao) is not null then
    raise exception 'FALHOU 13: quem tem só OS gravou direto em clientes';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_os::text, true);

  -- 14. mas a OS dele com origem passa a origem pro cliente sem nenhuma
  insert into ordens_servico (loja_id, cliente_id, origem, origem_detalhe)
    values (loja, c_balcao, 'indicacao', 'Dona Maria');

  -- 15. o cadastro rápido grava a origem; vazio vira nulo; fora da lista não entra
  resposta := cadastrar_cliente_rapido(
    '{"nome":"Rápido com origem","origem":"google","origem_detalhe":"  anúncio de pneu  "}'::jsonb, null);
  reset role;

  if (select origem from clientes where id = c_balcao) is distinct from 'indicacao'
     or (select origem_detalhe from clientes where id = c_balcao) is distinct from 'Dona Maria' then
    raise exception 'FALHOU 14: a OS de quem tem só OS não passou a origem pro cliente';
  end if;
  select * into linha from clientes where id = (resposta ->> 'cliente_id')::uuid;
  if linha.origem is distinct from 'google' or linha.origem_detalhe is distinct from 'anúncio de pneu' then
    raise exception 'FALHOU 15: o cadastro rápido gravou %/% em vez de google/anúncio de pneu', linha.origem, linha.origem_detalhe;
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  resposta := cadastrar_cliente_rapido('{"nome":"Rápido sem origem","origem":"","origem_detalhe":""}'::jsonb, null);
  reset role;
  select * into linha from clientes where id = (resposta ->> 'cliente_id')::uuid;
  if linha.origem is not null or linha.origem_detalhe is not null then
    raise exception 'FALHOU 15: o cadastro rápido em branco gravou %/% (devia ser nulo)', linha.origem, linha.origem_detalhe;
  end if;
  -- o programa de antes (sem as chaves) continua cadastrando
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  resposta := cadastrar_cliente_rapido('{"nome":"Rápido do programa antigo","telefone":"16999990000"}'::jsonb, null);
  begin
    perform cadastrar_cliente_rapido('{"nome":"Rápido inventado","origem":"tiktok"}'::jsonb, null);
    raise exception 'FALHOU 15: o cadastro rápido aceitou a origem "tiktok"';
  exception when check_violation then
    if sqlerrm not like '%ck_clientes_origem%' then raise; end if;
  end;
  reset role;
  if (select origem from clientes where id = (resposta ->> 'cliente_id')::uuid) is not null then
    raise exception 'FALHOU 15: o cadastro rápido do programa antigo inventou origem';
  end if;

  -- 16. o gatilho não fica exposto como função chamável pela API
  if has_function_privilege('authenticated', 'origem_da_ordem_no_cliente()', 'EXECUTE')
     or has_function_privilege('anon', 'origem_da_ordem_no_cliente()', 'EXECUTE') then
    raise exception 'FALHOU 16: a função do gatilho ficou com EXECUTE pra anon/authenticated';
  end if;
  if has_function_privilege('anon', 'cadastrar_cliente_rapido(jsonb, jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'cadastrar_cliente_rapido(jsonb, jsonb)', 'EXECUTE') then
    raise exception 'FALHOU 16: os direitos do cadastro rápido mudaram (anon sem nada, logado pode)';
  end if;
end;
$$;

rollback;

\echo TODAS AS CHECAGENS PASSARAM

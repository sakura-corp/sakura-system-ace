-- Sakura System — AutoCenter Edition
-- TESTE da migration 0092 (corrigir peça, serviço e valor de OS já faturada,
-- com a diferença no Caixa de hoje, tarefa #1182). NÃO é migration, e NUNCA
-- deve ser rodado no Supabase de verdade: grava e apaga dado de teste.
--
-- A promessa:
--   • o que passa: o gerente (admin da loja) corrige com motivo, e a
--     diferença é acertada do jeito que vale pro caso:
--       - paga e subiu, "paga agora": 1 Entrada no Caixa de HOJE, nada no dia
--         da fatura;
--       - paga e subiu, "fica a receber": conta nova só da diferença, a do
--         faturamento continua igual;
--       - conta do faturamento em aberto: a conta muda de valor (desce e
--         sobe), nada no Caixa;
--       - paga e desceu: 1 Saída "Devolução ao cliente" hoje, e o estoque e o
--         custo seguem os itens novos;
--       - total igual, sem acerto: a troca de sempre, nada no Caixa;
--     o caixa do dia da fatura fechado NÃO bloqueia; a mesma chave de novo
--     devolve a mesma linha e não lança nada;
--   • o que é recusado, sem gravar nada: quem não é gerente (mesmo com OS,
--     Caixa e Contas a Receber), admin de outra loja, caixa de HOJE fechado
--     (SKCXH), nota emitida (SKNOT), total faturado que não bate (SKMUD),
--     acerto que não vale pro caso (SKMUD), sem forma, vencimento antes de
--     hoje ou sem vencimento, "hoje" longe de hoje, sem motivo, estoque
--     negativo sem confirmar (SKNEG, um erro no meio), OS não faturada, sem
--     chave, acerto desconhecido; sem login não chama;
--   • a conta do faturamento continua uma só por OS.
--
-- Como rodar: `npm run test:sql -- testar-corrigir-os-faturada` (no CI, sozinho).
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- Chama a função e devolve o id (se passou), o código do erro (null se
-- passou) e a mensagem, sem derrubar o teste. O bloco com `exception` desfaz
-- tudo o que a chamada gravou quando ela falha: é isso que o "nada foi
-- gravado" confere.
create function pg_temp.t1182_tentar(
  p_ordem uuid, p_itens jsonb, p_motivo text, p_hoje date, p_total numeric,
  p_acerto text, p_forma text, p_venc date, p_chave uuid, p_aceita boolean,
  out linha_id uuid, out codigo text, out mensagem text)
language plpgsql
as $$
begin
  linha_id := corrigir_os_faturada(p_ordem, p_itens, p_motivo, p_hoje, p_total,
                                   p_acerto, p_forma, p_venc, p_chave, p_aceita, auth.uid());
  codigo := null;
  mensagem := null;
exception when others then
  linha_id := null;
  codigo := sqlstate;
  mensagem := sqlerrm;
end;
$$;

-- O saldo da peça na loja.
create function pg_temp.t1182_saldo(p_peca uuid, p_loja uuid) returns numeric
language sql as $$
  select coalesce(sum(case tipo when 'entrada' then quantidade else -quantidade end), 0)
    from estoque_movimentos where peca_id = p_peca and loja_id = p_loja;
$$;

do $$
declare
  assinatura text := 'corrigir_os_faturada(uuid, jsonb, text, date, numeric, text, text, date, uuid, boolean, uuid)';
  loja_a    uuid := '11820000-0000-0000-0000-00000000000a';
  loja_b    uuid := '11820000-0000-0000-0000-00000000000b';
  dep_a     uuid := '11823333-0000-0000-0000-0000000000a1';
  gerente   uuid := '11821111-0000-0000-0000-00000000000a';  -- admin da loja A
  balcao    uuid := '11821111-0000-0000-0000-00000000000c';  -- OS, Caixa e Contas a Receber na A, não admin
  gerenteb  uuid := '11821111-0000-0000-0000-00000000000b';  -- admin só da loja B
  cliente   uuid := '11822222-0000-0000-0000-000000000001';
  p1        uuid := '11824444-0000-0000-0000-000000000001';
  p2        uuid := '11824444-0000-0000-0000-000000000002';
  p3        uuid := '11824444-0000-0000-0000-000000000003';  -- sem estoque
  serv      uuid := '11825555-0000-0000-0000-000000000001';
  os_pago   uuid := '11826666-0000-0000-0000-000000000001';  -- paga no Pix
  os_arec   uuid := '11826666-0000-0000-0000-000000000002';  -- a receber, já recebida
  os_aberta uuid := '11826666-0000-0000-0000-000000000003';  -- a receber, em aberto
  os_dev    uuid := '11826666-0000-0000-0000-000000000004';  -- paga, vai descer
  os_igual  uuid := '11826666-0000-0000-0000-000000000005';  -- total igual
  os_nota   uuid := '11826666-0000-0000-0000-000000000006';  -- nota emitida
  os_neg    uuid := '11826666-0000-0000-0000-000000000007';  -- estoque negativo
  os_and    uuid := '11826666-0000-0000-0000-000000000008';  -- não faturada
  os_b      uuid := '11826666-0000-0000-0000-000000000009';  -- loja B, caixa de hoje fechado
  i_pago    uuid := '11827777-0000-0000-0000-000000000001';
  i_arec    uuid := '11827777-0000-0000-0000-000000000002';
  i_aberta  uuid := '11827777-0000-0000-0000-000000000003';
  i_dev     uuid := '11827777-0000-0000-0000-000000000004';
  i_igual   uuid := '11827777-0000-0000-0000-000000000005';
  i_nota    uuid := '11827777-0000-0000-0000-000000000006';
  i_neg     uuid := '11827777-0000-0000-0000-000000000007';
  i_and     uuid := '11827777-0000-0000-0000-000000000008';
  i_b       uuid := '11827777-0000-0000-0000-000000000009';
  conta_arec   uuid := '11828888-0000-0000-0000-000000000001';
  conta_aberta uuid := '11828888-0000-0000-0000-000000000002';
  k1  uuid := '11829999-0000-0000-0000-000000000001';
  k2  uuid := '11829999-0000-0000-0000-000000000002';
  k3  uuid := '11829999-0000-0000-0000-000000000003';
  k3b uuid := '11829999-0000-0000-0000-000000000004';
  k4  uuid := '11829999-0000-0000-0000-000000000005';
  k5  uuid := '11829999-0000-0000-0000-000000000006';
  k6  uuid := '11829999-0000-0000-0000-000000000007';
  kx  uuid := '11829999-0000-0000-0000-0000000000ff';  -- usada só nas recusas
  k7  uuid := '11829999-0000-0000-0000-000000000008';
  ontem     timestamptz := now() - interval '1 day';
  hoje      date := (now() at time zone 'UTC')::date;
  dia_fat   date := ((now() - interval '1 day') at time zone 'UTC')::date;
  t         record;
  linha     record;
  n         int;
  primeira  uuid;
  custo_antes double precision;
  custo_depois double precision;
begin
  -- -----------------------------------------------------------------
  -- A. Quem pode chamar
  -- -----------------------------------------------------------------
  if has_function_privilege('anon', assinatura, 'execute') then
    raise exception 'FALHOU (A1): quem não está logado (anon) pode chamar a função';
  end if;
  if not has_function_privilege('authenticated', assinatura, 'execute') then
    raise exception 'FALHOU (A2): quem está logado não pode chamar a função';
  end if;

  -- -----------------------------------------------------------------
  -- O preparo (como dono do banco)
  -- -----------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #1182)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #1182)', 'Araraquara', 'SP');
  insert into depositos (id, loja_id, nome, ativo) values (dep_a, loja_a, 'Principal', true);

  insert into auth.users (id) values (gerente), (balcao), (gerenteb) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (gerente,  't1182_g', 'Gerente A (teste #1182)', true, array['painel'], true),
    (balcao,   't1182_c', 'Balconista A (teste #1182)', false,
               array['painel', 'ordens_servico', 'caixa', 'contas_receber', 'estoque'], true),
    (gerenteb, 't1182_b', 'Gerente B (teste #1182)', true, array['painel'], true);
  insert into operador_lojas (operador_id, loja_id) values
    (gerente, loja_a), (balcao, loja_a), (gerenteb, loja_b);

  insert into clientes (id, nome) values (cliente, 'Cliente (teste #1182)');
  insert into pecas (id, descricao, preco_venda, preco_custo) values
    (p1, 'Pneu 175/70 R13 (teste #1182)', 200, 120),
    (p2, 'Pneu 185/65 R15 (teste #1182)', 300, 150),
    (p3, 'Pneu sem estoque (teste #1182)', 80, 50);
  insert into servicos (id, descricao, preco_padrao) values (serv, 'Alinhamento (teste #1182)', 100);

  insert into estoque_movimentos (peca_id, deposito_id, tipo, quantidade, motivo, loja_id) values
    (p1, dep_a, 'entrada', 10, 'compra', loja_a),
    (p2, dep_a, 'entrada', 10, 'compra', loja_a);

  -- As OS, todas faturadas ONTEM (menos a os_and).
  insert into ordens_servico (id, numero, loja_id, cliente_id, status, forma_pagamento, parcelas, data_fechamento) values
    (os_pago,   9101, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_arec,   9102, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_aberta, 9103, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_dev,    9104, loja_a, cliente, 'faturada', 'Dinheiro', 1, ontem),
    (os_igual,  9105, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_nota,   9106, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_neg,    9107, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_b,      9201, loja_b, cliente, 'faturada', 'Pix', 1, ontem);
  insert into ordens_servico (id, numero, loja_id, cliente_id, status) values
    (os_and,    9108, loja_a, cliente, 'em_andamento');

  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, servico_id, descricao, quantidade, preco_unitario) values
    (i_pago,   os_pago,   'servico', null, serv, 'Alinhamento', 1, 100),
    (i_arec,   os_arec,   'servico', null, serv, 'Alinhamento', 1, 200),
    (i_aberta, os_aberta, 'servico', null, serv, 'Alinhamento', 1, 300),
    (i_dev,    os_dev,    'peca',    p1,   null, 'Pneu 175/70 R13', 2, 200),
    (i_igual,  os_igual,  'servico', null, serv, 'Alinhamento', 1, 150),
    (i_nota,   os_nota,   'servico', null, serv, 'Alinhamento', 1, 100),
    (i_neg,    os_neg,    'servico', null, serv, 'Alinhamento', 1, 50),
    (i_and,    os_and,    'servico', null, serv, 'Alinhamento', 1, 100),
    (i_b,      os_b,      'servico', null, serv, 'Alinhamento', 1, 100);

  -- O que o faturamento lançou, ONTEM.
  insert into caixa_movimentos (loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao, data) values
    (loja_a, os_pago,  'entrada', 'pix',      100, 'Faturamento da OS 9101', ontem),
    (loja_a, os_arec,  'entrada', 'pix',      200, 'Faturamento da OS 9102', ontem),  -- a conta recebida
    (loja_a, os_dev,   'entrada', 'dinheiro', 400, 'Faturamento da OS 9104', ontem),
    (loja_a, os_igual, 'entrada', 'pix',      150, 'Faturamento da OS 9105', ontem),
    (loja_a, os_neg,   'entrada', 'pix',       50, 'Faturamento da OS 9107', ontem),
    (loja_b, os_b,     'entrada', 'pix',      100, 'Faturamento da OS 9201', ontem);
  -- Contas do faturamento, sem `origem` (como o programa grava): uma já
  -- recebida, uma em aberto.
  insert into contas_receber (id, loja_id, cliente_id, ordem_servico_id, descricao, valor, vencimento, status, data_recebimento) values
    (conta_arec,   loja_a, cliente, os_arec,   'Faturamento da OS 9102', 200, hoje + 10, 'recebido', ontem),
    (conta_aberta, loja_a, cliente, os_aberta, 'Faturamento da OS 9103', 300, hoje + 10, 'pendente', null);

  -- Nota emitida na os_nota.
  insert into notas_fiscais_arquivos (loja_id, tipo, competencia, nome_arquivo, storage_path, ordem_servico_id, status) values
    (loja_a, 'nfe', date_trunc('month', current_date), 'n1182.xml', 'nfe/n1182.xml', os_nota, 'autorizado');

  -- Caixa da loja A fechado no DIA DA FATURA (não pode travar) e o da loja B
  -- fechado HOJE (trava).
  insert into fechamentos_caixa (loja_id, data, saldo_sistema, valor_contado, diferenca) values
    (loja_a, dia_fat, 0, 0, 0),
    (loja_b, hoje, 0, 0, 0);

  -- -----------------------------------------------------------------
  -- B. O que é recusado (sem gravar nada)
  -- -----------------------------------------------------------------
  set local role authenticated;

  -- B1. Balconista com OS, Caixa e Contas a Receber, mas não gerente.
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is null or t.mensagem not like 'Só quem é gerente%' then
    raise exception 'FALHOU (B1): quem não é gerente corrigiu ou levou outro erro: % %', t.codigo, t.mensagem;
  end if;

  -- B1b. E também não grava a linha de correção direto no histórico.
  begin
    insert into ordens_servico_trocas (ordem_servico_id, loja_id, tipo, operador_id, motivo, total,
                                       total_antes, total_depois, acerto)
    values (os_pago, loja_a, 'correcao_valor', balcao, 'à mão', 150, 100, 150, 'pago_agora');
    raise exception 'FALHOU (B1b): quem não é gerente gravou correção direto no histórico';
  exception when insufficient_privilege then
    null;  -- 42501: a policy recusou, que é o que se espera
  end;

  -- B2. Admin de OUTRA loja.
  perform set_config('request.jwt.claim.sub', gerenteb::text, true);
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is null or t.mensagem not like 'Esta ordem não foi encontrada%' then
    raise exception 'FALHOU (B2): o admin da loja B corrigiu OS da loja A';
  end if;

  -- B3. Caixa de HOJE fechado (loja B, pelo admin da B): SKCXH.
  t := pg_temp.t1182_tentar(os_b,
    jsonb_build_array(jsonb_build_object('id', i_b, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is distinct from 'SKCXH' or t.mensagem not like 'O caixa de hoje já foi fechado%' then
    raise exception 'FALHOU (B3): caixa de hoje fechado não recusou com SKCXH: % %', t.codigo, t.mensagem;
  end if;

  -- Daqui pra baixo, o gerente da loja A.
  perform set_config('request.jwt.claim.sub', gerente::text, true);

  -- B4. Nota emitida: SKNOT.
  t := pg_temp.t1182_tentar(os_nota,
    jsonb_build_array(jsonb_build_object('id', i_nota, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is distinct from 'SKNOT' or t.mensagem not like '%Cancele a nota antes (o cancelamento tem prazo)%' then
    raise exception 'FALHOU (B4): nota emitida não recusou com SKNOT: % %', t.codigo, t.mensagem;
  end if;

  -- B5. O total faturado que a tela mostrou não é o do banco: SKMUD.
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 90, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is distinct from 'SKMUD' or t.mensagem not like 'A OS mudou em outro computador%' then
    raise exception 'FALHOU (B5): total faturado diferente não recusou com SKMUD: % %', t.codigo, t.mensagem;
  end if;

  -- B6. Acerto que não vale pro caso: SKMUD (decidido no banco, não na tela).
  -- a) conta do faturamento em aberto, mas a tela mandou "devolvido";
  t := pg_temp.t1182_tentar(os_aberta,
    jsonb_build_array(jsonb_build_object('id', i_aberta, 'preco_unitario', 250)),
    'desconto combinado', hoje, 300, 'devolvido', 'pix', null, kx, false);
  if t.codigo is distinct from 'SKMUD' or t.mensagem not like 'A situação desta OS mudou%' then
    raise exception 'FALHOU (B6a): acerto devolvido com conta em aberto não recusou com SKMUD: % %', t.codigo, t.mensagem;
  end if;
  -- b) paga e subiu, mas "devolvido";
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'devolvido', 'pix', null, kx, false);
  if t.codigo is distinct from 'SKMUD' then
    raise exception 'FALHOU (B6b): subiu com acerto devolvido não recusou com SKMUD: % %', t.codigo, t.mensagem;
  end if;
  -- c) paga e subiu, sem acerto;
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, null, null, null, kx, false);
  if t.codigo is distinct from 'SKMUD' then
    raise exception 'FALHOU (B6c): subiu sem acerto não recusou com SKMUD: % %', t.codigo, t.mensagem;
  end if;
  -- d) total igual, com acerto;
  t := pg_temp.t1182_tentar(os_igual,
    jsonb_build_array(jsonb_build_object('id', i_igual, 'descricao', 'Alinhamento e balanceamento')),
    'descrição errada', hoje, 150, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is distinct from 'SKMUD' then
    raise exception 'FALHOU (B6d): total igual com acerto não recusou com SKMUD: % %', t.codigo, t.mensagem;
  end if;
  -- e) paga e desceu, mas "conta_aberta" (não há conta em aberto).
  t := pg_temp.t1182_tentar(os_dev,
    jsonb_build_array(jsonb_build_object('id', i_dev, 'preco_unitario', 150)),
    'desconto combinado', hoje, 400, 'conta_aberta', null, null, kx, false);
  if t.codigo is distinct from 'SKMUD' then
    raise exception 'FALHOU (B6e): desceu com conta_aberta sem conta em aberto não recusou com SKMUD: % %', t.codigo, t.mensagem;
  end if;

  -- B7. Paga agora sem forma; devolvido sem forma.
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', '  ', null, kx, false);
  if t.codigo is null or t.mensagem not like 'Escolha a forma de pagamento%' then
    raise exception 'FALHOU (B7a): pago agora sem forma passou: % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1182_tentar(os_dev,
    jsonb_build_array(jsonb_build_object('id', i_dev, 'preco_unitario', 150)),
    'desconto combinado', hoje, 400, 'devolvido', null, null, kx, false);
  if t.codigo is null or t.mensagem not like 'Escolha a forma de pagamento%' then
    raise exception 'FALHOU (B7b): devolvido sem forma passou: % %', t.codigo, t.mensagem;
  end if;

  -- B8. Fica a receber sem vencimento, e com vencimento antes de hoje.
  t := pg_temp.t1182_tentar(os_arec,
    jsonb_build_array(jsonb_build_object('id', i_arec, 'preco_unitario', 280)),
    'faltou o balanceamento', hoje, 200, 'a_receber', null, null, kx, false);
  if t.codigo is null or t.mensagem not like 'Informe o vencimento%' then
    raise exception 'FALHOU (B8a): a receber sem vencimento passou: % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1182_tentar(os_arec,
    jsonb_build_array(jsonb_build_object('id', i_arec, 'preco_unitario', 280)),
    'faltou o balanceamento', hoje, 200, 'a_receber', null, hoje - 1, kx, false);
  if t.codigo is null or t.mensagem not like 'O vencimento não pode ser antes de hoje%' then
    raise exception 'FALHOU (B8b): vencimento antes de hoje passou: % %', t.codigo, t.mensagem;
  end if;

  -- B9. "Hoje" longe de hoje (fugir da trava do caixa).
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje - 5, 100, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is null or t.mensagem not like 'Não deu pra saber o dia de hoje%' then
    raise exception 'FALHOU (B9): hoje longe de hoje passou: % %', t.codigo, t.mensagem;
  end if;

  -- B10. Sem motivo.
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    '  ', hoje, 100, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is null or t.mensagem not like 'Diga o motivo%' then
    raise exception 'FALHOU (B10): sem motivo passou: % %', t.codigo, t.mensagem;
  end if;

  -- B11. Erro no meio: estoque negativo sem confirmar (SKNEG), DEPOIS de os
  -- itens já terem sido trocados dentro da função. Nada pode ficar.
  t := pg_temp.t1182_tentar(os_neg,
    jsonb_build_array(jsonb_build_object('tipo', 'peca', 'peca_id', p3, 'descricao', 'Pneu sem estoque',
                                         'quantidade', 1, 'preco_unitario', 80)),
    'era pneu, não serviço', hoje, 50, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is distinct from 'SKNEG' or t.mensagem not like '%Pneu sem estoque%' then
    raise exception 'FALHOU (B11): estoque negativo sem confirmação não recusou com SKNEG: % %', t.codigo, t.mensagem;
  end if;

  -- B12. OS não faturada; sem chave; acerto desconhecido.
  t := pg_temp.t1182_tentar(os_and,
    jsonb_build_array(jsonb_build_object('id', i_and, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', 'pix', null, kx, false);
  if t.codigo is null or t.mensagem not like 'Esta OS ainda não foi faturada%' then
    raise exception 'FALHOU (B12a): OS em andamento passou pela correção de faturada: % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', 'pix', null, null, false);
  if t.codigo is null or t.mensagem not like 'Faltou a identificação%' then
    raise exception 'FALHOU (B12b): sem chave passou: % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'fiado', 'pix', null, kx, false);
  if t.codigo is null or t.mensagem not like 'Jeito de acertar a diferença desconhecido%' then
    raise exception 'FALHOU (B12c): acerto desconhecido passou: % %', t.codigo, t.mensagem;
  end if;

  -- Nada do que foi recusado gravou.
  reset role;
  if (select count(*) from ordens_servico_trocas where loja_id in (loja_a, loja_b)) <> 0 then
    raise exception 'FALHOU (B13): uma correção recusada deixou histórico';
  end if;
  if (select count(*) from caixa_movimentos where loja_id in (loja_a, loja_b)) <> 6 then
    raise exception 'FALHOU (B14): uma correção recusada lançou no Caixa';
  end if;
  if (select count(*) from contas_receber where loja_id = loja_a) <> 2
     or (select valor from contas_receber where id = conta_aberta) <> 300 then
    raise exception 'FALHOU (B15): uma correção recusada mexeu nas contas a receber';
  end if;
  if (select count(*) from estoque_movimentos where loja_id = loja_a) <> 2 then
    raise exception 'FALHOU (B16): uma correção recusada mexeu no estoque';
  end if;
  if (select preco_unitario from ordens_servico_itens where id = i_pago) <> 100
     or (select count(*) from ordens_servico_itens where ordem_servico_id = os_neg) <> 1
     or not exists (select 1 from ordens_servico_itens where id = i_neg) then
    raise exception 'FALHOU (B17): uma correção recusada mudou os itens';
  end if;

  -- -----------------------------------------------------------------
  -- C. O que passa
  -- -----------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);

  -- C1. Paga e subiu, "paga agora" no Pix (com o caixa do DIA DA FATURA
  -- fechado: não trava mais).
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    '  faltou o balanceamento  ', hoje, 100, 'pago_agora', 'pix', null, k1, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C1): paga e subiu foi recusada (o caixa do dia da fatura fechado travou?): % %', t.codigo, t.mensagem;
  end if;
  primeira := t.linha_id;

  reset role;
  select count(*) into n from caixa_movimentos where ordem_servico_id = os_pago;
  if n <> 2 then
    raise exception 'FALHOU (C2): paga e subiu deveria ter 2 lançamentos na OS (tem %)', n;
  end if;
  select * into linha from caixa_movimentos
   where ordem_servico_id = os_pago and (data at time zone 'UTC')::date = hoje;
  if linha.tipo is distinct from 'entrada' or linha.valor is distinct from 50 or linha.forma_pagamento is distinct from 'pix'
     or linha.descricao is distinct from 'Correção da OS 9101' or linha.categoria_id is not null or linha.loja_id is distinct from loja_a then
    raise exception 'FALHOU (C3): a Entrada de hoje não é a da diferença: %', linha;
  end if;
  if (select count(*) from caixa_movimentos
       where ordem_servico_id = os_pago and (data at time zone 'UTC')::date = dia_fat) <> 1
     or (select valor from caixa_movimentos
          where ordem_servico_id = os_pago and (data at time zone 'UTC')::date = dia_fat) <> 100 then
    raise exception 'FALHOU (C4): o dia da fatura mudou';
  end if;
  select * into linha from ordens_servico_trocas where id = primeira;
  if linha.tipo is distinct from 'correcao_valor' or linha.total_antes is distinct from 100 or linha.total_depois is distinct from 150 or linha.total is distinct from 150
     or linha.acerto is distinct from 'pago_agora' or linha.chave is distinct from k1 or linha.conta_receber_id is not null
     or linha.caixa_movimento_id is distinct from
        (select id from caixa_movimentos where ordem_servico_id = os_pago and (data at time zone 'UTC')::date = hoje)
     or linha.motivo is distinct from 'faltou o balanceamento' or linha.operador_id is distinct from gerente
     or linha.operador_nome is distinct from 'Gerente A (teste #1182)' then
    raise exception 'FALHOU (C5): o histórico da correção não está completo: %', linha;
  end if;
  select status, forma_pagamento, atualizado_por_id into linha from ordens_servico where id = os_pago;
  if linha.status is distinct from 'faturada' or linha.forma_pagamento is distinct from 'Pix' or linha.atualizado_por_id is distinct from gerente then
    raise exception 'FALHOU (C6): a OS mudou de status/pagamento ou não marcou quem mexeu: %', linha;
  end if;

  -- C7. A mesma chamada de novo (clique duplo): a mesma linha, nada novo.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1182_tentar(os_pago,
    jsonb_build_array(jsonb_build_object('id', i_pago, 'preco_unitario', 150)),
    'faltou o balanceamento', hoje, 100, 'pago_agora', 'pix', null, k1, false);
  if t.codigo is not null or t.linha_id is distinct from primeira then
    raise exception 'FALHOU (C7): a mesma chave de novo não devolveu a mesma linha: % % %', t.linha_id, t.codigo, t.mensagem;
  end if;
  -- A mesma chave em outra OS é recusada.
  t := pg_temp.t1182_tentar(os_igual,
    jsonb_build_array(jsonb_build_object('id', i_igual, 'descricao', 'Alinhamento e balanceamento')),
    'descrição errada', hoje, 150, null, null, null, k1, false);
  if t.codigo is null or t.mensagem not like 'Esta correção já foi usada em outra OS%' then
    raise exception 'FALHOU (C7b): a chave de uma OS foi aceita em outra: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  if (select count(*) from caixa_movimentos where ordem_servico_id = os_pago) <> 2
     or (select count(*) from ordens_servico_trocas where ordem_servico_id = os_pago) <> 1
     or (select count(*) from ordens_servico_trocas where ordem_servico_id = os_igual) <> 0 then
    raise exception 'FALHOU (C8): a mesma chave lançou duas vezes';
  end if;

  -- C9. Paga e subiu, "fica a receber": conta nova só da diferença; a do
  -- faturamento continua igual; nada no Caixa.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1182_tentar(os_arec,
    jsonb_build_array(jsonb_build_object('id', i_arec, 'preco_unitario', 280)),
    'faltou o balanceamento', hoje, 200, 'a_receber', null, hoje + 15, k2, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C9): fica a receber foi recusada: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  select * into linha from contas_receber where id = conta_arec;
  if linha.valor is distinct from 200 or linha.status is distinct from 'recebido' or linha.origem is distinct from 'faturamento' then
    raise exception 'FALHOU (C10): a conta do faturamento mudou: %', linha;
  end if;
  select count(*) into n from contas_receber where ordem_servico_id = os_arec;
  if n <> 2 then
    raise exception 'FALHOU (C11): deveria haver 2 contas na OS (a do faturamento e a da diferença), há %', n;
  end if;
  select * into linha from contas_receber where ordem_servico_id = os_arec and origem = 'correcao';
  if linha.valor is distinct from 80 or linha.status is distinct from 'pendente' or linha.vencimento is distinct from hoje + 15
     or linha.cliente_id is distinct from cliente or linha.loja_id is distinct from loja_a
     or linha.descricao is distinct from 'Diferença da correção da OS 9102' then
    raise exception 'FALHOU (C12): a conta da diferença não está certa: %', linha;
  end if;
  if (select count(*) from caixa_movimentos where ordem_servico_id = os_arec) <> 1 then
    raise exception 'FALHOU (C13): fica a receber lançou no Caixa';
  end if;
  if (select conta_receber_id from ordens_servico_trocas where chave = k2) is distinct from linha.id
     or (select acerto from ordens_servico_trocas where chave = k2) <> 'a_receber' then
    raise exception 'FALHOU (C14): o histórico não aponta pra conta da diferença';
  end if;

  -- C14b. Correção que DESCE numa OS paga que ainda tem diferença a receber
  -- (a dos 80 do C9): abate a conta da diferença, nada sai do Caixa. Achado
  -- da revisão: antes, isso obrigava a "devolver" um dinheiro que o cliente
  -- nunca pagou, e a conta dos 80 ficava em aberto.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  -- Desce 100, mas só faltam 80: recusa, pedindo pra corrigir em duas vezes.
  t := pg_temp.t1182_tentar(os_arec,
    jsonb_build_array(jsonb_build_object('id', i_arec, 'preco_unitario', 180)),
    'serviço não foi feito', hoje, 280, 'conta_aberta', null, null, k7, false);
  if t.codigo is distinct from 'SKMUD' or t.mensagem not like 'Esta OS ainda tem R$ 80,00 de correção a receber%' then
    raise exception 'FALHOU (C14b): descer mais do que falta receber não recusou: % %', t.codigo, t.mensagem;
  end if;
  -- Volta pros 200: "devolver" não vale (faltam 80 a receber).
  t := pg_temp.t1182_tentar(os_arec,
    jsonb_build_array(jsonb_build_object('id', i_arec, 'preco_unitario', 200)),
    'serviço não foi feito', hoje, 280, 'devolvido', 'dinheiro', null, k7, false);
  if t.codigo is distinct from 'SKMUD' then
    raise exception 'FALHOU (C14c): devolveu dinheiro que ainda estava a receber: % %', t.codigo, t.mensagem;
  end if;
  -- Volta pros 200 abatendo a conta: passa.
  t := pg_temp.t1182_tentar(os_arec,
    jsonb_build_array(jsonb_build_object('id', i_arec, 'preco_unitario', 200)),
    'serviço não foi feito', hoje, 280, 'conta_aberta', null, null, k7, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C14d): abater a diferença a receber foi recusado: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  if (select count(*) from contas_receber where ordem_servico_id = os_arec and origem = 'correcao') <> 0 then
    raise exception 'FALHOU (C14e): a conta da diferença de 80 não foi abatida (apagada ao zerar)';
  end if;
  if (select count(*) from caixa_movimentos where ordem_servico_id = os_arec) <> 1
     or exists (select 1 from caixa_movimentos where ordem_servico_id = os_arec and tipo = 'saida') then
    raise exception 'FALHOU (C14f): abater a diferença a receber mexeu no Caixa';
  end if;
  if (select acerto from ordens_servico_trocas where chave = k7) is distinct from 'conta_aberta'
     or (select valor from contas_receber where id = conta_arec) is distinct from 200 then
    raise exception 'FALHOU (C14g): o histórico não diz conta_aberta, ou a conta do faturamento mudou';
  end if;

  -- C15. Conta do faturamento em aberto: desce, a conta muda de valor, nada
  -- no Caixa. Depois sobe, e a conta acompanha.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1182_tentar(os_aberta,
    jsonb_build_array(jsonb_build_object('id', i_aberta, 'preco_unitario', 250)),
    'desconto combinado', hoje, 300, 'conta_aberta', null, null, k3, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C15): conta em aberto (desceu) foi recusada: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  select * into linha from contas_receber where id = conta_aberta;
  if linha.valor is distinct from 250 or linha.status is distinct from 'pendente' or linha.origem is distinct from 'faturamento' then
    raise exception 'FALHOU (C16): a conta em aberto não desceu pra 250: %', linha;
  end if;
  if (select count(*) from contas_receber where ordem_servico_id = os_aberta) <> 1 then
    raise exception 'FALHOU (C17): conta em aberto criou outra conta';
  end if;
  if (select count(*) from caixa_movimentos where ordem_servico_id = os_aberta) <> 0 then
    raise exception 'FALHOU (C18): conta em aberto lançou no Caixa';
  end if;
  select * into linha from ordens_servico_trocas where chave = k3;
  if linha.acerto is distinct from 'conta_aberta' or linha.conta_receber_id is distinct from conta_aberta
     or linha.caixa_movimento_id is not null or linha.total_antes is distinct from 300 or linha.total_depois is distinct from 250 then
    raise exception 'FALHOU (C19): o histórico da conta em aberto não está certo: %', linha;
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1182_tentar(os_aberta,
    jsonb_build_array(jsonb_build_object('id', i_aberta, 'preco_unitario', 320)),
    'faltou o balanceamento', hoje, 250, 'conta_aberta', null, null, k3b, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C20): conta em aberto (subiu) foi recusada: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  if (select valor from contas_receber where id = conta_aberta) <> 320
     or (select count(*) from caixa_movimentos where ordem_servico_id = os_aberta) <> 0 then
    raise exception 'FALHOU (C21): a conta em aberto não subiu pra 320, ou lançou no Caixa';
  end if;

  -- C22. Paga e desceu, "devolver agora": troca 2 pneus de 200 por 1 de 300
  -- (400 → 300). 1 Saída "Devolução ao cliente" hoje; o estoque e o custo
  -- seguem os itens novos.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  select custo into custo_antes from custo_das_ordens(array[os_dev]);
  t := pg_temp.t1182_tentar(os_dev,
    jsonb_build_array(jsonb_build_object('id', i_dev, 'peca_id', p2, 'descricao', 'Pneu 185/65 R15',
                                         'quantidade', 1, 'preco_unitario', 300)),
    'só precisou de um pneu', hoje, 400, 'devolvido', 'dinheiro', null, k4, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C22): paga e desceu foi recusada: % %', t.codigo, t.mensagem;
  end if;
  select custo into custo_depois from custo_das_ordens(array[os_dev]);
  reset role;
  -- A saída leva a OS (Sofia, 24/11: é "recebido a menos" daquela OS).
  select count(*) into n from caixa_movimentos where ordem_servico_id = os_dev and tipo = 'saida';
  if n <> 1 then
    raise exception 'FALHOU (C23): paga e desceu deveria ter 1 saída (tem %)', n;
  end if;
  select m.*, c.nome as categoria_nome, c.grupo as categoria_grupo into linha
    from caixa_movimentos m left join categorias_caixa c on c.id = m.categoria_id
   where m.id = (select caixa_movimento_id from ordens_servico_trocas
                  where ordem_servico_id = os_dev and acerto = 'devolvido');
  if linha.valor is distinct from 100 or linha.forma_pagamento is distinct from 'dinheiro'
     or linha.categoria_nome is distinct from 'Devolução ao cliente' or linha.categoria_grupo is distinct from 'a_classificar'
     or linha.descricao is distinct from 'Devolução da correção da OS 9104'
     or (linha.data at time zone 'UTC')::date is distinct from hoje then
    raise exception 'FALHOU (C24): a saída não é a devolução de hoje: %', linha;
  end if;
  if (select valor from caixa_movimentos where ordem_servico_id = os_dev and tipo = 'entrada') <> 400 then
    raise exception 'FALHOU (C25): a entrada do dia da fatura mudou';
  end if;
  if pg_temp.t1182_saldo(p1, loja_a) <> 12 or pg_temp.t1182_saldo(p2, loja_a) <> 9 then
    raise exception 'FALHOU (C26): estoque errado depois da correção (p1 = %, p2 = %; esperado 12 e 9)',
      pg_temp.t1182_saldo(p1, loja_a), pg_temp.t1182_saldo(p2, loja_a);
  end if;
  if (select count(*) from estoque_movimentos
       where loja_id = loja_a and referencia = 'OS 9104 (correção depois de faturada)') <> 2 then
    raise exception 'FALHOU (C27): os movimentos de estoque não têm a referência da correção';
  end if;
  -- Custo (e daí lucro e comissão) sai dos itens: 2 × 120 antes, 1 × 150 depois.
  if custo_antes <> 240 or custo_depois <> 150 then
    raise exception 'FALHOU (C28): o custo não seguiu os itens novos (antes %, depois %; esperado 240 e 150)',
      custo_antes, custo_depois;
  end if;
  if (select sum(quantidade * preco_unitario - desconto) from ordens_servico_itens where ordem_servico_id = os_dev) <> 300
     or (select total from ordens_servico_trocas where chave = k4) <> 300 then
    raise exception 'FALHOU (C29): o total dos itens novos não é 300';
  end if;

  -- C30. Total igual, sem acerto: a troca de sempre, nada no Caixa.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1182_tentar(os_igual,
    jsonb_build_array(jsonb_build_object('id', i_igual, 'descricao', 'Alinhamento e balanceamento')),
    'descrição errada', hoje, 150, null, null, null, k5, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C30): total igual sem acerto foi recusado: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  select * into linha from ordens_servico_trocas where chave = k5;
  if linha.tipo is distinct from 'troca' or linha.acerto is not null or linha.total_antes is distinct from 150 or linha.total_depois is distinct from 150
     or linha.caixa_movimento_id is not null or linha.conta_receber_id is not null then
    raise exception 'FALHOU (C31): o histórico do total igual não está certo: %', linha;
  end if;
  if (select count(*) from caixa_movimentos where ordem_servico_id = os_igual) <> 1
     or (select descricao from ordens_servico_itens where id = i_igual) <> 'Alinhamento e balanceamento' then
    raise exception 'FALHOU (C32): total igual lançou no Caixa ou não trocou a descrição';
  end if;

  -- C33. Estoque negativo COM confirmação passa (a mesma do B11).
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1182_tentar(os_neg,
    jsonb_build_array(jsonb_build_object('tipo', 'peca', 'peca_id', p3, 'descricao', 'Pneu sem estoque',
                                         'quantidade', 1, 'preco_unitario', 80)),
    'era pneu, não serviço', hoje, 50, 'pago_agora', 'pix', null, k6, true);
  if t.codigo is not null then
    raise exception 'FALHOU (C33): estoque negativo confirmado foi recusado: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  if pg_temp.t1182_saldo(p3, loja_a) <> -1
     or (select valor from caixa_movimentos where ordem_servico_id = os_neg and (data at time zone 'UTC')::date = hoje) is distinct from 30 then
    raise exception 'FALHOU (C34): a peça não baixou ou a diferença de 30 não entrou hoje';
  end if;

  -- -----------------------------------------------------------------
  -- D. A conta do faturamento continua uma só por OS
  -- -----------------------------------------------------------------
  begin
    insert into contas_receber (loja_id, cliente_id, ordem_servico_id, descricao, valor, vencimento)
    values (loja_a, cliente, os_aberta, 'Faturamento de novo', 10, hoje);
    raise exception 'FALHOU (D1): a OS ganhou uma segunda conta do faturamento';
  exception when unique_violation then
    null;
  end;

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

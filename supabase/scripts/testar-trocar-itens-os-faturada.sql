-- Sakura System — AutoCenter Edition
-- TESTE da migration 0090 (trocar peça ou serviço de OS já faturada, com o
-- total igual, tarefa #1145). NÃO é migration, e NUNCA deve ser rodado no
-- Supabase de verdade: grava e apaga dado de teste.
--
-- A promessa:
--   • o que passa: o gerente (admin da loja) troca uma peça por outra do
--     mesmo total, com motivo; a peça que saiu volta pro estoque, a que entrou
--     baixa; o histórico guarda quem, o motivo e o antes e depois; o Caixa, a
--     conta a receber, a forma de pagamento e o status da OS não mudam;
--     serviço no lugar de peça também vale; estoque negativo passa só com a
--     confirmação;
--   • o que é recusado, sem gravar nada: total diferente (SKTOT), estoque
--     negativo sem confirmar (SKNEG), quem não é admin da loja (mesmo com o
--     módulo OS), admin de outra loja, nota fiscal não cancelada, caixa do dia
--     fechado, dia da fatura que não bate, sem motivo, OS não faturada, item
--     de outra OS, item repetido, lista vazia; sem login não chama;
--   • a trava de antes continua: corrigir e acrescentar item pelo caminho
--     comum seguem recusando OS faturada.
--
-- Como rodar: `npm run test:sql -- testar-trocar-itens-os-faturada`.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- Chama a função e devolve o código do erro (null se passou) e a mensagem,
-- sem derrubar o teste. O bloco com `exception` desfaz tudo o que a chamada
-- gravou quando ela falha: é isso que o "nada foi gravado" confere.
create function pg_temp.t1145_tentar(
  p_ordem uuid, p_itens jsonb, p_motivo text, p_dia date, p_aceita boolean,
  out codigo text, out mensagem text)
language plpgsql
as $$
begin
  perform trocar_itens_os_faturada(p_ordem, p_itens, p_motivo, p_dia, p_aceita, auth.uid());
  codigo := null;
  mensagem := null;
exception when others then
  codigo := sqlstate;
  mensagem := sqlerrm;
end;
$$;

-- O saldo da peça na loja.
create function pg_temp.t1145_saldo(p_peca uuid, p_loja uuid) returns numeric
language sql as $$
  select coalesce(sum(case tipo when 'entrada' then quantidade else -quantidade end), 0)
    from estoque_movimentos where peca_id = p_peca and loja_id = p_loja;
$$;

do $$
declare
  loja_a   uuid := '10900000-0000-0000-0000-00000000000a';
  loja_b   uuid := '10900000-0000-0000-0000-00000000000b';
  dep_a    uuid := '10903333-0000-0000-0000-0000000000a1';
  gerente  uuid := '10901111-0000-0000-0000-00000000000a';  -- admin da loja A
  balcao   uuid := '10901111-0000-0000-0000-00000000000c';  -- só OS, loja A
  gerenteb uuid := '10901111-0000-0000-0000-00000000000b';  -- admin só da loja B
  cliente  uuid := '10902222-0000-0000-0000-000000000001';
  p1       uuid := '10904444-0000-0000-0000-000000000001';  -- pneu errado
  p2       uuid := '10904444-0000-0000-0000-000000000002';  -- pneu certo
  p3       uuid := '10904444-0000-0000-0000-000000000003';  -- sem estoque
  serv     uuid := '10905555-0000-0000-0000-000000000001';
  os1      uuid := '10906666-0000-0000-0000-000000000001';
  os2      uuid := '10906666-0000-0000-0000-000000000002';
  os_nota  uuid := '10906666-0000-0000-0000-000000000003';
  os_canc  uuid := '10906666-0000-0000-0000-000000000004';
  os_and   uuid := '10906666-0000-0000-0000-000000000005';
  os_neg   uuid := '10906666-0000-0000-0000-000000000006';
  os_fech  uuid := '10906666-0000-0000-0000-000000000007';
  i1       uuid := '10907777-0000-0000-0000-000000000001';
  i2a      uuid := '10907777-0000-0000-0000-000000000002';
  i2b      uuid := '10907777-0000-0000-0000-000000000003';
  i_nota   uuid := '10907777-0000-0000-0000-000000000004';
  i_canc   uuid := '10907777-0000-0000-0000-000000000005';
  i_and    uuid := '10907777-0000-0000-0000-000000000006';
  i_neg    uuid := '10907777-0000-0000-0000-000000000007';
  i_fech   uuid := '10907777-0000-0000-0000-000000000008';
  ontem    timestamptz := now() - interval '1 day';
  hoje     date := (now() at time zone 'UTC')::date;
  dia_fech date := ((now() - interval '1 day') at time zone 'UTC')::date;
  t        record;
  linha    record;
  n        int;
  troca    uuid;
begin
  -- -----------------------------------------------------------------
  -- A. Quem pode chamar
  -- -----------------------------------------------------------------
  if has_function_privilege('anon', 'trocar_itens_os_faturada(uuid, jsonb, text, date, boolean, uuid)', 'execute') then
    raise exception 'FALHOU (A1): quem não está logado (anon) pode chamar a função';
  end if;
  if not has_function_privilege('authenticated', 'trocar_itens_os_faturada(uuid, jsonb, text, date, boolean, uuid)', 'execute') then
    raise exception 'FALHOU (A2): quem está logado não pode chamar a função';
  end if;

  -- -----------------------------------------------------------------
  -- O preparo (como dono do banco)
  -- -----------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #1145)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #1145)', 'Araraquara', 'SP');
  insert into depositos (id, loja_id, nome, ativo) values (dep_a, loja_a, 'Principal', true);

  insert into auth.users (id) values (gerente), (balcao), (gerenteb) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (gerente,  't1145_g', 'Gerente A (teste #1145)', true, array['painel'], true),
    (balcao,   't1145_c', 'Balconista A (teste #1145)', false, array['painel', 'ordens_servico', 'caixa', 'estoque'], true),
    (gerenteb, 't1145_b', 'Gerente B (teste #1145)', true, array['painel'], true);
  insert into operador_lojas (operador_id, loja_id) values
    (gerente, loja_a), (balcao, loja_a), (gerenteb, loja_b);

  insert into clientes (id, nome) values (cliente, 'Cliente (teste #1145)');
  insert into pecas (id, descricao, preco_venda) values
    (p1, 'Pneu 175/70 R13 (errado)', 300),
    (p2, 'Pneu 175/65 R14 (certo)', 300),
    (p3, 'Pneu sem estoque', 300);
  insert into servicos (id, descricao, preco_padrao) values (serv, 'Balanceamento (teste #1145)', 50);

  -- Estoque: 10 de cada uma das duas primeiras; a terceira, nada.
  insert into estoque_movimentos (peca_id, deposito_id, tipo, quantidade, motivo, loja_id) values
    (p1, dep_a, 'entrada', 10, 'compra', loja_a),
    (p2, dep_a, 'entrada', 10, 'compra', loja_a);

  -- As OS, todas faturadas ONTEM (menos a os_and), cada uma com 2 pneus a
  -- 300 = 600 e um balanceamento de 50 (total 650).
  insert into ordens_servico (id, numero, loja_id, cliente_id, status, forma_pagamento, parcelas, data_fechamento) values
    (os1,     9001, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os2,     9002, loja_a, cliente, 'faturada', 'Dinheiro', 1, ontem),
    (os_nota, 9003, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_canc, 9004, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_neg,  9006, loja_a, cliente, 'faturada', 'Pix', 1, ontem),
    (os_fech, 9007, loja_b, cliente, 'faturada', 'Pix', 1, ontem);
  insert into ordens_servico (id, numero, loja_id, cliente_id, status) values
    (os_and,  9005, loja_a, cliente, 'em_andamento');

  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, servico_id, descricao, quantidade, preco_unitario) values
    (i1,     os1,     'peca', p1, null, 'Pneu 175/70 R13 (errado)', 2, 300),
    (i2a,    os2,     'peca', p1, null, 'Pneu 175/70 R13 (errado)', 2, 300),
    (i2b,    os2,     'servico', null, serv, 'Balanceamento', 1, 50),
    (i_nota, os_nota, 'peca', p1, null, 'Pneu', 2, 300),
    (i_canc, os_canc, 'peca', p1, null, 'Pneu', 2, 300),
    (i_and,  os_and,  'peca', p1, null, 'Pneu', 2, 300),
    (i_neg,  os_neg,  'servico', null, serv, 'Balanceamento', 1, 50),
    (i_fech, os_fech, 'servico', null, serv, 'Balanceamento', 1, 50);

  -- O que o faturamento lançou: Pix no Caixa (os1) e conta a receber (os2).
  insert into caixa_movimentos (loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao, data) values
    (loja_a, os1, 'entrada', 'pix', 600, 'Faturamento da OS 9001', ontem);
  insert into contas_receber (loja_id, cliente_id, ordem_servico_id, descricao, valor, vencimento) values
    (loja_a, cliente, os2, 'Faturamento da OS 9002', 650, current_date + 10);

  -- Notas: uma emitida (os_nota) e uma cancelada (os_canc).
  insert into notas_fiscais_arquivos (loja_id, tipo, competencia, nome_arquivo, storage_path, ordem_servico_id, status) values
    (loja_a, 'nfe', date_trunc('month', current_date), 'n1.xml', 'nfe/n1.xml', os_nota, 'autorizado'),
    (loja_a, 'nfe', date_trunc('month', current_date), 'n2.xml', 'nfe/n2.xml', os_canc, 'cancelado');

  -- Caixa da loja B fechado no dia da fatura.
  insert into fechamentos_caixa (loja_id, data, saldo_sistema, valor_contado, diferenca) values
    (loja_b, dia_fech, 0, 0, 0);

  -- -----------------------------------------------------------------
  -- B. O que é recusado (sem gravar nada)
  -- -----------------------------------------------------------------
  set local role authenticated;

  -- B1. Balconista com o módulo OS, mas não admin.
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i1, 'peca_id', p2, 'descricao', 'Pneu 175/65 R14 (certo)')),
    'medida errada', dia_fech, false);
  if t.codigo is null or t.mensagem not like 'Só quem é gerente%' then
    raise exception 'FALHOU (B1): o balconista (não admin) trocou ou levou outro erro: % %', t.codigo, t.mensagem;
  end if;

  -- B2. Admin de OUTRA loja.
  perform set_config('request.jwt.claim.sub', gerenteb::text, true);
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i1, 'peca_id', p2)), 'medida errada', dia_fech, false);
  if t.codigo is null then
    raise exception 'FALHOU (B2): o admin da loja B trocou item de OS da loja A';
  end if;

  -- B3. Caixa do dia fechado (loja B, pelo admin da B).
  t := pg_temp.t1145_tentar(os_fech,
    jsonb_build_array(jsonb_build_object('id', i_fech, 'descricao', 'Balanceamento das 4 rodas')),
    'descrição errada', dia_fech, false);
  if t.codigo is null or t.mensagem not like 'O caixa do dia % já foi fechado.%' then
    raise exception 'FALHOU (B3): caixa fechado não recusou: % %', t.codigo, t.mensagem;
  end if;

  -- Daqui pra baixo, o gerente da loja A.
  perform set_config('request.jwt.claim.sub', gerente::text, true);

  -- B4. Total diferente: SKTOT.
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i1, 'peca_id', p2, 'preco_unitario', 310)),
    'medida errada', dia_fech, false);
  if t.codigo is distinct from 'SKTOT' or t.mensagem not like 'O total mudaria de R$ 600,00 para R$ 620,00.%' then
    raise exception 'FALHOU (B4): total diferente não recusou com SKTOT: % %', t.codigo, t.mensagem;
  end if;

  -- B5. Sem motivo.
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i1, 'peca_id', p2)), '   ', dia_fech, false);
  if t.codigo is null or t.mensagem not like 'Diga o motivo%' then
    raise exception 'FALHOU (B5): sem motivo não recusou: % %', t.codigo, t.mensagem;
  end if;

  -- B6. Nota emitida bloqueia.
  t := pg_temp.t1145_tentar(os_nota,
    jsonb_build_array(jsonb_build_object('id', i_nota, 'peca_id', p2)), 'medida errada', dia_fech, false);
  if t.codigo is null or t.mensagem not like 'Esta OS já tem nota fiscal emitida%' then
    raise exception 'FALHOU (B6): nota emitida não bloqueou: % %', t.codigo, t.mensagem;
  end if;

  -- B7. OS não faturada.
  t := pg_temp.t1145_tentar(os_and,
    jsonb_build_array(jsonb_build_object('id', i_and, 'peca_id', p2)), 'medida errada', hoje, false);
  if t.codigo is null or t.mensagem not like 'Esta OS ainda não foi faturada%' then
    raise exception 'FALHOU (B7): OS em andamento passou pela troca de faturada: % %', t.codigo, t.mensagem;
  end if;

  -- B8. Dia da fatura que não bate (fugir da trava do caixa).
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i1, 'peca_id', p2)), 'medida errada', dia_fech - 10, false);
  if t.codigo is null or t.mensagem not like 'Não deu pra saber o dia da fatura%' then
    raise exception 'FALHOU (B8): dia da fatura longe da data de fechamento passou: % %', t.codigo, t.mensagem;
  end if;

  -- B9. Item de outra OS, item repetido, lista vazia.
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i2a, 'peca_id', p2)), 'medida errada', dia_fech, false);
  if t.codigo is null or t.mensagem not like 'Um dos itens não é mais desta OS%' then
    raise exception 'FALHOU (B9a): item de outra OS passou: % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i1), jsonb_build_object('id', i1)), 'medida errada', dia_fech, false);
  if t.codigo is null or t.mensagem not like '%item repetido%' then
    raise exception 'FALHOU (B9b): item repetido passou: % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1145_tentar(os1, '[]'::jsonb, 'medida errada', dia_fech, false);
  if t.codigo is null or t.mensagem not like 'A OS precisa continuar%' then
    raise exception 'FALHOU (B9c): lista vazia passou: % %', t.codigo, t.mensagem;
  end if;

  -- B10. Estoque negativo sem confirmar: SKNEG (serviço → peça sem estoque).
  t := pg_temp.t1145_tentar(os_neg,
    jsonb_build_array(jsonb_build_object('tipo', 'peca', 'peca_id', p3, 'descricao', 'Pneu sem estoque',
                                         'quantidade', 1, 'preco_unitario', 50)),
    'era peça, não serviço', dia_fech, false);
  if t.codigo is distinct from 'SKNEG' or t.mensagem not like '%Pneu sem estoque%' then
    raise exception 'FALHOU (B10): estoque negativo sem confirmação não recusou com SKNEG: % %', t.codigo, t.mensagem;
  end if;

  -- B10b. Peça nova sem cadastro (avulsa) não entra.
  t := pg_temp.t1145_tentar(os_neg,
    jsonb_build_array(jsonb_build_object('tipo', 'peca', 'peca_id', null, 'descricao', 'Peça digitada',
                                         'quantidade', 1, 'preco_unitario', 50)),
    'era peça, não serviço', dia_fech, true);
  if t.codigo is null or t.mensagem not like 'Escolha a peça do cadastro%' then
    raise exception 'FALHOU (B10b): peça nova sem cadastro entrou: % %', t.codigo, t.mensagem;
  end if;

  -- Nada do que foi recusado gravou.
  reset role;
  if (select count(*) from ordens_servico_trocas where loja_id in (loja_a, loja_b)) <> 0 then
    raise exception 'FALHOU (B11): uma troca recusada deixou histórico';
  end if;
  if (select count(*) from estoque_movimentos where loja_id = loja_a) <> 2 then
    raise exception 'FALHOU (B12): uma troca recusada mexeu no estoque';
  end if;
  if (select peca_id from ordens_servico_itens where id = i1) <> p1
     or (select count(*) from ordens_servico_itens where ordem_servico_id = os_neg) <> 1 then
    raise exception 'FALHOU (B13): uma troca recusada mudou os itens';
  end if;

  -- -----------------------------------------------------------------
  -- C. O que passa
  -- -----------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);

  -- C1. Troca o pneu errado pelo certo (mesmo preço) na os1.
  t := pg_temp.t1145_tentar(os1,
    jsonb_build_array(jsonb_build_object('id', i1, 'peca_id', p2, 'descricao', 'Pneu 175/65 R14 (certo)')),
    '  medida do pneu estava errada  ', dia_fech, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C1): a troca certa foi recusada: % %', t.codigo, t.mensagem;
  end if;

  reset role;
  select peca_id, descricao, quantidade, preco_unitario into linha from ordens_servico_itens where id = i1;
  if linha.peca_id <> p2 or linha.descricao <> 'Pneu 175/65 R14 (certo)' or linha.quantidade <> 2 or linha.preco_unitario <> 300 then
    raise exception 'FALHOU (C2): o item não ficou com a peça nova: %', linha;
  end if;
  if pg_temp.t1145_saldo(p1, loja_a) <> 12 or pg_temp.t1145_saldo(p2, loja_a) <> 8 then
    raise exception 'FALHOU (C3): estoque errado depois da troca (p1 = %, p2 = %; esperado 12 e 8)',
      pg_temp.t1145_saldo(p1, loja_a), pg_temp.t1145_saldo(p2, loja_a);
  end if;
  select count(*) into n from estoque_movimentos
   where loja_id = loja_a and referencia = 'OS 9001 (troca depois de faturada)'
     and ((peca_id = p1 and tipo = 'entrada' and motivo = 'ajuste' and quantidade = 2)
       or (peca_id = p2 and tipo = 'saida' and motivo = 'uso_em_os' and quantidade = 2));
  if n <> 2 then
    raise exception 'FALHOU (C4): os movimentos de estoque não são a volta e a baixa esperadas (%)', n;
  end if;
  select * into linha from ordens_servico_trocas where ordem_servico_id = os1;
  if linha.motivo <> 'medida do pneu estava errada' or linha.operador_id <> gerente
     or linha.operador_nome <> 'Gerente A (teste #1145)' or linha.total <> 600
     or linha.itens_antes -> 0 ->> 'peca_id' <> p1::text or linha.itens_depois -> 0 ->> 'peca_id' <> p2::text then
    raise exception 'FALHOU (C5): o histórico não guardou quem, o motivo, o total e o antes e depois: %', linha;
  end if;
  select status, forma_pagamento, atualizado_por_id into linha from ordens_servico where id = os1;
  if linha.status <> 'faturada' or linha.forma_pagamento <> 'Pix' or linha.atualizado_por_id <> gerente then
    raise exception 'FALHOU (C6): a OS mudou de status/pagamento ou não marcou quem mexeu: %', linha;
  end if;
  if (select count(*) from caixa_movimentos where ordem_servico_id = os1) <> 1
     or (select valor from caixa_movimentos where ordem_servico_id = os1) <> 600 then
    raise exception 'FALHOU (C7): o Caixa mudou com a troca';
  end if;

  -- C8. os2: tira o pneu e o balanceamento e põe um serviço de 650 (peça vira
  -- serviço, item some). A conta a receber fica igual; os 2 pneus voltam.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1145_tentar(os2,
    jsonb_build_array(jsonb_build_object('id', i2b, 'descricao', 'Balanceamento', 'preco_unitario', 50),
                      jsonb_build_object('tipo', 'servico', 'servico_id', null, 'descricao', 'Recapagem (serviço)',
                                         'quantidade', 1, 'preco_unitario', 600)),
    'era recapagem, não pneu novo', dia_fech, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C8): trocar peça por serviço foi recusado: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  if exists (select 1 from ordens_servico_itens where id = i2a)
     or (select count(*) from ordens_servico_itens where ordem_servico_id = os2) <> 2 then
    raise exception 'FALHOU (C9): o item que saiu continua na OS, ou o novo não entrou';
  end if;
  if pg_temp.t1145_saldo(p1, loja_a) <> 14 then
    raise exception 'FALHOU (C10): os pneus que saíram da os2 não voltaram ao estoque (p1 = %)', pg_temp.t1145_saldo(p1, loja_a);
  end if;
  if (select valor from contas_receber where ordem_servico_id = os2) <> 650 then
    raise exception 'FALHOU (C11): a conta a receber mudou com a troca';
  end if;

  -- C12. Nota CANCELADA não bloqueia.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1145_tentar(os_canc,
    jsonb_build_array(jsonb_build_object('id', i_canc, 'peca_id', p2)), 'medida errada', dia_fech, false);
  if t.codigo is not null then
    raise exception 'FALHOU (C12): nota cancelada bloqueou a troca: % %', t.codigo, t.mensagem;
  end if;

  -- C13. Estoque negativo COM confirmação passa.
  t := pg_temp.t1145_tentar(os_neg,
    jsonb_build_array(jsonb_build_object('tipo', 'peca', 'peca_id', p3, 'descricao', 'Pneu sem estoque',
                                         'quantidade', 1, 'preco_unitario', 50)),
    'era peça, não serviço', dia_fech, true);
  if t.codigo is not null then
    raise exception 'FALHOU (C13): estoque negativo confirmado foi recusado: % %', t.codigo, t.mensagem;
  end if;
  reset role;
  if pg_temp.t1145_saldo(p3, loja_a) <> -1 then
    raise exception 'FALHOU (C14): a peça sem estoque não baixou (%)', pg_temp.t1145_saldo(p3, loja_a);
  end if;

  -- -----------------------------------------------------------------
  -- D. A trava de antes continua no caminho comum
  -- -----------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  begin
    perform editar_item_ordem(i1, jsonb_build_object('descricao', 'outra'), gerente);
    raise exception 'FALHOU (D1): editar_item_ordem aceitou OS faturada';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;
  begin
    perform adicionar_itens_ordem(os1, jsonb_build_array(jsonb_build_object(
      'tipo', 'servico', 'descricao', 'x', 'quantidade', 1, 'preco_unitario', 0)), gerente);
    raise exception 'FALHOU (D2): adicionar_itens_ordem aceitou OS faturada';
  exception when others then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- E. O histórico: o balconista (módulo OS) lê, e não altera nem apaga.
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  select count(*) into n from ordens_servico_trocas where loja_id = loja_a;
  if n <> 4 then
    raise exception 'FALHOU (E1): o balconista da loja deveria ver as 4 trocas (viu %)', n;
  end if;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  update ordens_servico_trocas set motivo = 'apagado' where loja_id = loja_a;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU (E2): o histórico foi alterado';
  end if;
  delete from ordens_servico_trocas where loja_id = loja_a;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU (E3): o histórico foi apagado';
  end if;

  reset role;
  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

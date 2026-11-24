-- Sakura System — AutoCenter Edition
-- TESTE da migration 0093 (reabrir orçamento recusado, tarefa #1181). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade: grava e apaga
-- dado de teste.
--
-- A promessa:
--   • o que passa: quem tem o módulo OS na loja (sem ser gerente) reabre um
--     recusado; ele volta a orçamento aberto com o MESMO número de orçamento,
--     sem número de OS, sem recusa, com a validade nova; o histórico ganha uma
--     linha tipo 'reabertura' com quem e o motivo; nada baixa no estoque;
--     depois, a aprovação de sempre dá o número de OS e baixa o estoque;
--   • o que é recusado, sem gravar nada: orçamento que não está recusado, OS
--     aprovada, sem motivo, sem validade, quem é de outra loja, quem não tem o
--     módulo OS; sem login não chama;
--   • a trava de sempre continua: um update DIRETO de recusado pra orçamento
--     (e de recusado pra OS) é recusado pelo banco, mesmo pra quem pode
--     reabrir; a linha de reabertura não se grava à mão num recusado; o
--     histórico antigo ficou com o tipo 'troca'.
--
-- Como rodar: `npm run test:sql -- testar-reabrir-orcamento` (no CI, sozinho).
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- Chama a função e devolve o código do erro (null se passou) e a mensagem,
-- sem derrubar o teste. O bloco com `exception` desfaz o que a chamada gravou
-- quando ela falha: é isso que o "nada foi gravado" confere.
create function pg_temp.t1181_tentar(
  p_ordem uuid, p_motivo text, p_validade date,
  out codigo text, out mensagem text)
language plpgsql
as $$
begin
  perform reabrir_orcamento(p_ordem, p_motivo, p_validade, auth.uid());
  codigo := null;
  mensagem := null;
exception when others then
  codigo := sqlstate;
  mensagem := sqlerrm;
end;
$$;

-- Um update direto qualquer; devolve o código do erro (null se passou).
create function pg_temp.t1181_update(p_sql text, out codigo text, out mensagem text)
language plpgsql
as $$
begin
  execute p_sql;
  codigo := null;
  mensagem := null;
exception when others then
  codigo := sqlstate;
  mensagem := sqlerrm;
end;
$$;

-- O saldo da peça na loja.
create function pg_temp.t1181_saldo(p_peca uuid, p_loja uuid) returns numeric
language sql as $$
  select coalesce(sum(case tipo when 'entrada' then quantidade else -quantidade end), 0)
    from estoque_movimentos where peca_id = p_peca and loja_id = p_loja;
$$;

do $$
declare
  loja_a   uuid := '11810000-0000-0000-0000-00000000000a';
  loja_b   uuid := '11810000-0000-0000-0000-00000000000b';
  dep_a    uuid := '11813333-0000-0000-0000-0000000000a1';
  gerente  uuid := '11811111-0000-0000-0000-00000000000a';  -- admin da loja A
  balcao   uuid := '11811111-0000-0000-0000-00000000000c';  -- só OS (e estoque), loja A
  caixa    uuid := '11811111-0000-0000-0000-00000000000d';  -- só Caixa, loja A
  balcaob  uuid := '11811111-0000-0000-0000-00000000000b';  -- módulo OS, só loja B
  cliente  uuid := '11812222-0000-0000-0000-000000000001';
  p1       uuid := '11814444-0000-0000-0000-000000000001';
  serv     uuid := '11815555-0000-0000-0000-000000000001';
  orc1     uuid := '11816666-0000-0000-0000-000000000001';  -- recusado (preço)
  orc2     uuid := '11816666-0000-0000-0000-000000000002';  -- recusado, pra update direto
  orc_ab   uuid := '11816666-0000-0000-0000-000000000003';  -- orçamento aberto
  os_and   uuid := '11816666-0000-0000-0000-000000000004';  -- OS em andamento
  hist     uuid := '11817777-0000-0000-0000-000000000001';  -- linha antiga do histórico
  num1     int;
  validade date := current_date + 7;
  t        record;
  linha    record;
  n        int;
begin
  -- -----------------------------------------------------------------
  -- A. Quem pode chamar
  -- -----------------------------------------------------------------
  if has_function_privilege('anon', 'reabrir_orcamento(uuid, text, date, uuid)', 'execute') then
    raise exception 'FALHOU (A1): quem não está logado (anon) pode chamar a função';
  end if;
  if not has_function_privilege('authenticated', 'reabrir_orcamento(uuid, text, date, uuid)', 'execute') then
    raise exception 'FALHOU (A2): quem está logado não pode chamar a função';
  end if;

  -- -----------------------------------------------------------------
  -- O preparo (como dono do banco)
  -- -----------------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #1181)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #1181)', 'Araraquara', 'SP');
  insert into depositos (id, loja_id, nome, ativo) values (dep_a, loja_a, 'Principal', true);

  insert into auth.users (id) values (gerente), (balcao), (caixa), (balcaob) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (gerente, 't1181_g', 'Gerente A (teste #1181)', true, array['painel'], true),
    (balcao,  't1181_c', 'Balconista A (teste #1181)', false, array['painel', 'ordens_servico', 'estoque'], true),
    (caixa,   't1181_x', 'Caixa A (teste #1181)', false, array['painel', 'caixa'], true),
    (balcaob, 't1181_b', 'Balconista B (teste #1181)', false, array['painel', 'ordens_servico', 'estoque'], true);
  insert into operador_lojas (operador_id, loja_id) values
    (gerente, loja_a), (balcao, loja_a), (caixa, loja_a), (balcaob, loja_b);

  insert into clientes (id, nome) values (cliente, 'Cliente (teste #1181)');
  insert into pecas (id, descricao, preco_venda) values (p1, 'Pneu (teste #1181)', 300);
  insert into servicos (id, descricao, preco_padrao) values (serv, 'Alinhamento (teste #1181)', 80);
  insert into estoque_movimentos (peca_id, deposito_id, tipo, quantidade, motivo, loja_id) values
    (p1, dep_a, 'entrada', 10, 'compra', loja_a);

  -- Os orçamentos nascem orçamento (o gatilho dá o número) e são recusados
  -- pelo caminho de sempre.
  insert into ordens_servico (id, loja_id, cliente_id, status, validade) values
    (orc1,   loja_a, cliente, 'orcamento', current_date - 3),
    (orc2,   loja_a, cliente, 'orcamento', current_date - 3),
    (orc_ab, loja_a, cliente, 'orcamento', current_date + 3);
  insert into ordens_servico (id, numero, loja_id, cliente_id, status) values
    (os_and, 9101, loja_a, cliente, 'em_andamento');
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, servico_id, descricao, quantidade, preco_unitario) values
    (orc1, 'peca', p1, null, 'Pneu (teste #1181)', 2, 300),
    (orc1, 'servico', null, serv, 'Alinhamento', 1, 80),
    (orc2, 'peca', p1, null, 'Pneu (teste #1181)', 1, 300);
  update ordens_servico
     set status = 'recusado', motivo_recusa = 'preco', recusado_em = now() - interval '1 day'
   where id in (orc1, orc2);
  select numero_orcamento into num1 from ordens_servico where id = orc1;
  if num1 is null then
    raise exception 'FALHOU (P1): o orçamento de teste nasceu sem número';
  end if;

  -- Uma linha antiga do histórico (da 0087), gravada antes da coluna tipo.
  insert into ordens_servico_trocas (id, ordem_servico_id, loja_id, motivo, total)
    values (hist, os_and, loja_a, 'troca antiga', 600);
  if (select tipo from ordens_servico_trocas where id = hist) <> 'troca' then
    raise exception 'FALHOU (P2): linha sem tipo não ficou como troca';
  end if;

  -- -----------------------------------------------------------------
  -- B. O que é recusado (sem gravar nada)
  -- -----------------------------------------------------------------
  set local role authenticated;

  -- B1. Update DIRETO de recusado pra orçamento: a trava de sempre, mesmo pra
  -- quem pode reabrir.
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  t := pg_temp.t1181_update(format(
    'update ordens_servico set status = %L, motivo_recusa = null, recusado_em = null where id = %L',
    'orcamento', orc2));
  if t.codigo is distinct from '23514' or t.mensagem not like '%ck_ordens_servico_transicao_orcamento%' then
    raise exception 'FALHOU (B1): update direto de recusado pra orçamento passou: % %', t.codigo, t.mensagem;
  end if;

  -- B2. Nem ligando a marca à mão no update direto de OUTRA OS (a marca vale
  -- só pra OS que ela nomeia).
  perform set_config('sakura.reabrir_orcamento', orc1::text, true);
  t := pg_temp.t1181_update(format(
    'update ordens_servico set status = %L where id = %L', 'orcamento', orc2));
  perform set_config('sakura.reabrir_orcamento', '', true);
  if t.codigo is distinct from '23514' then
    raise exception 'FALHOU (B2): a marca de outra OS deixou o update direto passar: % %', t.codigo, t.mensagem;
  end if;

  -- B3. Recusado direto pra OS: recusado.
  t := pg_temp.t1181_update(format(
    'update ordens_servico set status = %L where id = %L', 'em_andamento', orc2));
  if t.codigo is distinct from '23514' then
    raise exception 'FALHOU (B3): recusado virou OS direto: % %', t.codigo, t.mensagem;
  end if;

  -- B4. Orçamento aberto e OS em andamento não reabrem.
  t := pg_temp.t1181_tentar(orc_ab, 'cliente voltou', validade);
  if t.codigo is null or t.mensagem not like 'Este orçamento não está recusado%' then
    raise exception 'FALHOU (B4a): orçamento aberto foi "reaberto": % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1181_tentar(os_and, 'cliente voltou', validade);
  if t.codigo is null or t.mensagem not like 'Este orçamento não está recusado%' then
    raise exception 'FALHOU (B4b): OS aprovada voltou a orçamento: % %', t.codigo, t.mensagem;
  end if;

  -- B5. Sem motivo e sem validade.
  t := pg_temp.t1181_tentar(orc1, '  ', validade);
  if t.codigo is null or t.mensagem not like 'Diga o motivo%' then
    raise exception 'FALHOU (B5): sem motivo passou: % %', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t1181_tentar(orc1, 'cliente voltou', null);
  if t.codigo is null or t.mensagem not like 'Escolha a nova validade%' then
    raise exception 'FALHOU (B6): sem validade passou: % %', t.codigo, t.mensagem;
  end if;

  -- B7. Quem é de outra loja (com o módulo OS lá) não alcança.
  perform set_config('request.jwt.claim.sub', balcaob::text, true);
  t := pg_temp.t1181_tentar(orc1, 'cliente voltou', validade);
  if t.codigo is null then
    raise exception 'FALHOU (B7): o balconista da loja B reabriu orçamento da loja A';
  end if;

  -- B8. Quem é da loja, mas sem o módulo OS (só Caixa).
  perform set_config('request.jwt.claim.sub', caixa::text, true);
  t := pg_temp.t1181_tentar(orc1, 'cliente voltou', validade);
  if t.codigo is null then
    raise exception 'FALHOU (B8): quem só tem o Caixa reabriu o orçamento';
  end if;

  -- B9. A linha de reabertura não se grava à mão numa OS que ainda está
  -- recusada (só a função, que reabre antes).
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  t := pg_temp.t1181_update(format(
    'insert into ordens_servico_trocas (ordem_servico_id, loja_id, tipo, operador_id, motivo, total) values (%L, %L, %L, %L, %L, 0)',
    orc2, loja_a, 'reabertura', balcao, 'à mão'));
  if t.codigo is null then
    raise exception 'FALHOU (B9): a balconista gravou reabertura à mão num recusado';
  end if;
  -- E nem uma "troca" (só o gerente grava troca).
  t := pg_temp.t1181_update(format(
    'insert into ordens_servico_trocas (ordem_servico_id, loja_id, tipo, operador_id, motivo, total) values (%L, %L, %L, %L, %L, 0)',
    orc_ab, loja_a, 'troca', balcao, 'à mão'));
  if t.codigo is null then
    raise exception 'FALHOU (B10): a balconista gravou troca no histórico';
  end if;

  -- Nada do que foi recusado gravou.
  reset role;
  select status, motivo_recusa, numero_orcamento into linha from ordens_servico where id = orc1;
  if linha.status <> 'recusado' or linha.motivo_recusa <> 'preco' then
    raise exception 'FALHOU (B11): uma reabertura recusada mudou o orçamento: %', linha;
  end if;
  if (select status from ordens_servico where id = orc2) <> 'recusado' then
    raise exception 'FALHOU (B12): o update direto mudou o recusado';
  end if;
  if (select count(*) from ordens_servico_trocas where loja_id in (loja_a, loja_b)) <> 1 then
    raise exception 'FALHOU (B13): uma reabertura recusada deixou histórico';
  end if;

  -- -----------------------------------------------------------------
  -- C. O que passa: a balconista (módulo OS, sem ser gerente) reabre
  -- -----------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  t := pg_temp.t1181_tentar(orc1,
    '  Cliente voltou e aceitou (tinha sido recusado em 23/11, motivo: Preço)  ', validade);
  if t.codigo is not null then
    raise exception 'FALHOU (C1): a reabertura certa foi recusada: % %', t.codigo, t.mensagem;
  end if;

  reset role;
  select * into linha from ordens_servico where id = orc1;
  if linha.status <> 'orcamento' or linha.numero_orcamento <> num1 or linha.numero is not null
     or linha.motivo_recusa is not null or linha.recusado_em is not null
     or linha.validade <> validade or linha.atualizado_por_id <> balcao then
    raise exception 'FALHOU (C2): o orçamento não voltou aberto, com o mesmo número, sem recusa e com a validade nova: %', linha;
  end if;
  select * into linha from ordens_servico_trocas where ordem_servico_id = orc1;
  if linha.tipo <> 'reabertura' or linha.operador_id <> balcao
     or linha.operador_nome <> 'Balconista A (teste #1181)'
     or linha.motivo <> 'Cliente voltou e aceitou (tinha sido recusado em 23/11, motivo: Preço)'
     or linha.total <> 680 or jsonb_array_length(linha.itens_antes) <> 2 then
    raise exception 'FALHOU (C3): o histórico não guardou tipo, quem, o motivo e os itens: %', linha;
  end if;
  -- Reaberto não entra em número nenhum: não baixou estoque.
  if pg_temp.t1181_saldo(p1, loja_a) <> 10 then
    raise exception 'FALHOU (C4): reabrir mexeu no estoque (saldo %)', pg_temp.t1181_saldo(p1, loja_a);
  end if;
  -- A marca não sobrou ligada depois da função.
  if coalesce(current_setting('sakura.reabrir_orcamento', true), '') <> '' then
    raise exception 'FALHOU (C5): a marca do gatilho ficou ligada depois da reabertura';
  end if;

  -- C6. Reabrir de novo (outro computador): já não está recusado.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  t := pg_temp.t1181_tentar(orc1, 'cliente voltou', validade);
  if t.codigo is null then
    raise exception 'FALHOU (C6): reabriu duas vezes';
  end if;

  -- C7. "Já aprovar agora": a aprovação de sempre, depois, dá o número de OS
  -- e baixa o estoque.
  if aprovar_orcamento(orc1, 'o cliente', balcao, '[]'::jsonb) is null then
    raise exception 'FALHOU (C7): a aprovação do reaberto não aconteceu';
  end if;
  reset role;
  select * into linha from ordens_servico where id = orc1;
  if linha.status <> 'em_andamento' or linha.numero is null or linha.numero_orcamento <> num1 then
    raise exception 'FALHOU (C8): aprovado depois de reaberto não virou OS numerada: %', linha;
  end if;
  if pg_temp.t1181_saldo(p1, loja_a) <> 8 then
    raise exception 'FALHOU (C9): a aprovação do reaberto não baixou o estoque (saldo %)', pg_temp.t1181_saldo(p1, loja_a);
  end if;

  -- C10. E a OS aprovada não volta a orçamento por esta função.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', gerente::text, true);
  t := pg_temp.t1181_tentar(orc1, 'cliente voltou', validade);
  if t.codigo is null then
    raise exception 'FALHOU (C10): a OS aprovada voltou a orçamento';
  end if;

  -- D. O histórico: quem tem o módulo OS lê as linhas; ninguém altera.
  perform set_config('request.jwt.claim.sub', balcao::text, true);
  select count(*) into n from ordens_servico_trocas where loja_id = loja_a;
  if n <> 2 then
    raise exception 'FALHOU (D1): a balconista deveria ver as 2 linhas do histórico (viu %)', n;
  end if;
  update ordens_servico_trocas set motivo = 'apagado' where loja_id = loja_a;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU (D2): o histórico foi alterado';
  end if;

  -- D3. O tipo só aceita os três valores.
  reset role;
  begin
    insert into ordens_servico_trocas (ordem_servico_id, loja_id, tipo, motivo, total)
      values (os_and, loja_a, 'qualquer', 'tipo inventado', 0);
    raise exception 'FALHOU (D3): o histórico aceitou um tipo fora da lista';
  exception when check_violation then
    null;
  end;

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

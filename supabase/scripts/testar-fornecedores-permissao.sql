-- Sakura System — AutoCenter Edition
-- TESTE do lote 7 do TR-04.1 (migration 0078, tarefa #880). NÃO é migration,
-- e NUNCA deve ser rodado no Supabase de verdade — grava e apaga dado de
-- teste.
--
-- Prova as duas metades da promessa, que são opostas e por isso precisam ser
-- medidas juntas:
--   • quem NÃO tem o módulo Fornecedores (nem o balcão com OS, Caixa e
--     Estoque, nem quem foi desligado, nem o anônimo) não lê, não grava, não
--     altera e não apaga fornecedor, pedido de compra, item de pedido nem
--     cotação — e é ali que mora o preço de compra, o mesmo número do custo
--     da peça que o lote 5 escondeu;
--   • e MESMO ASSIM quem compra continua comprando: com Fornecedores (sem
--     ser admin) cadastra fornecedor (com `returning`, como a importação do
--     XML), faz pedido (o número sai sozinho), lança item e cotação, recebe
--     o pedido (a entrada no estoque é a porta estreita da 0074) e cancela;
--     sempre só na loja dele. O admin continua vendo tudo.
--
-- Como rodar: `npm run test:sql -- testar-fornecedores-permissao`. Terminou
-- imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

do $$
declare
  loja_a   uuid := '88000000-0000-0000-0000-00000000000a';
  loja_b   uuid := '88000000-0000-0000-0000-00000000000b';
  dep_a    uuid := '88000000-1111-0000-0000-00000000000a';
  o_admin  uuid := '88001111-0000-0000-0000-000000000001';  -- admin das duas lojas
  o_forn   uuid := '88001111-0000-0000-0000-000000000002';  -- só Fornecedores, loja A
  o_balcao uuid := '88001111-0000-0000-0000-000000000003';  -- OS + Caixa + Estoque, loja A
  o_inativo uuid := '88001111-0000-0000-0000-000000000004'; -- tinha Fornecedores, foi desligado
  p1       uuid := '88005555-0000-0000-0000-000000000001';
  f1       uuid := '88007777-0000-0000-0000-000000000001';
  f2       uuid := '88007777-0000-0000-0000-000000000002';
  ped_a    uuid := '88009999-0000-0000-0000-00000000000a';
  ped_b    uuid := '88009999-0000-0000-0000-00000000000b';
  item_a   uuid := '88008888-0000-0000-0000-00000000000a';
  item_b   uuid := '88008888-0000-0000-0000-00000000000b';
  quantas  int;
  novo_forn uuid;
  novo_ped uuid;
  novo_num int;
  tabela   text;
begin
  -- Só as quatro policies novas por tabela: uma `for all` antiga que
  -- sobrasse reabriria tudo (as policies se somam com OU).
  select string_agg(tablename || '.' || policyname, ', ') into tabela
    from pg_policies
   where schemaname = 'public'
     and tablename in ('fornecedores', 'cotacoes_pecas', 'pedidos_compra', 'pedidos_compra_itens')
     and policyname !~ '_(leitura|insercao|alteracao|exclusao)$';
  if tabela is not null then
    raise exception 'FALHOU (P1): sobrou policy antiga nas tabelas de Fornecedores: %', tabela;
  end if;
  select count(*) into quantas
    from pg_policies
   where schemaname = 'public'
     and tablename in ('fornecedores', 'cotacoes_pecas', 'pedidos_compra', 'pedidos_compra_itens');
  if quantas <> 16 then
    raise exception 'FALHOU (P2): as tabelas de Fornecedores têm % policies (deviam ser 16, uma por comando)', quantas;
  end if;

  -- ===================================================================
  -- Preparo (como dono do banco, sem RLS)
  -- ===================================================================
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #880)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #880)', 'Araraquara', 'SP');
  insert into depositos (id, loja_id, nome, ativo) values (dep_a, loja_a, 'Principal A', true);
  insert into auth.users (id) values (o_admin), (o_forn), (o_balcao), (o_inativo) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_admin,   't880_admin',   'Dono (teste #880)',        true,  array[]::text[], true),
    (o_forn,    't880_forn',    'Compras (teste #880)',     false, array['fornecedores'], true),
    (o_balcao,  't880_balcao',  'Balcão (teste #880)',      false, array['painel', 'ordens_servico', 'caixa', 'estoque'], true),
    (o_inativo, 't880_inativo', 'Desligado (teste #880)',   false, array['fornecedores'], false);
  insert into operador_lojas (operador_id, loja_id) values
    (o_admin, loja_a), (o_admin, loja_b), (o_forn, loja_a), (o_balcao, loja_a), (o_inativo, loja_a);

  insert into pecas (id, descricao) values (p1, 'Pneu 175/70 R13 (teste #880)');
  insert into fornecedores (id, nome, ativo) values
    (f1, 'Distribuidora 1 (teste #880)', true),
    (f2, 'Distribuidora 2 (teste #880)', true);
  insert into cotacoes_pecas (peca_id, fornecedor_id, preco) values (p1, f1, 210.00), (p1, f2, 205.00);
  insert into pedidos_compra (id, numero, loja_id, fornecedor_id, status) values
    (ped_a, 1, loja_a, f1, 'pendente'),
    (ped_b, 1, loja_b, f2, 'pendente');
  insert into pedidos_compra_itens (id, pedido_compra_id, peca_id, quantidade_pedida, preco_unitario) values
    (item_a, ped_a, p1, 4, 210.00),
    (item_b, ped_b, p1, 2, 205.00);

  -- ===================================================================
  -- 0. Ninguém logado (anon): nada
  -- ===================================================================
  set local role anon;
  foreach tabela in array array['fornecedores', 'cotacoes_pecas', 'pedidos_compra', 'pedidos_compra_itens'] loop
    begin
      execute format('select count(*) from %I', tabela) into quantas;
      if quantas <> 0 then
        raise exception 'FALHOU (0): o anônimo leu % linha(s) de %', quantas, tabela;
      end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  -- A função da loja do item é `security definer`: sem o revoke, o
  -- anônimo chamaria ela (a recusa tem de ser a de executar).
  begin
    perform pedido_compra_acessivel(ped_a);
    raise exception 'FALHOU (0b): o anônimo chamou pedido_compra_acessivel';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then raise; end if;
  end;
  reset role;

  set local role authenticated;

  -- ===================================================================
  -- A. Sem o módulo Fornecedores: nem ler, nem gravar, nem mexer
  -- ===================================================================
  foreach novo_forn in array array[o_balcao, o_inativo] loop
    perform set_config('request.jwt.claim.sub', novo_forn::text, true);

    foreach tabela in array array['fornecedores', 'cotacoes_pecas', 'pedidos_compra', 'pedidos_compra_itens'] loop
      execute format('select count(*) from %I', tabela) into quantas;
      if quantas <> 0 then
        raise exception 'FALHOU (A1): % leu % linha(s) de % sem o módulo Fornecedores', novo_forn, quantas, tabela;
      end if;
    end loop;

    begin
      insert into fornecedores (nome) values ('Pelo balcão');
      raise exception 'FALHOU (A2): % cadastrou fornecedor sem o módulo', novo_forn;
    exception when insufficient_privilege then null;
    end;
    begin
      insert into cotacoes_pecas (peca_id, fornecedor_id, preco) values (p1, f1, 1.00);
      raise exception 'FALHOU (A3): % gravou cotação sem o módulo', novo_forn;
    exception when insufficient_privilege then null;
    end;
    begin
      insert into pedidos_compra (loja_id, fornecedor_id) values (loja_a, f1);
      raise exception 'FALHOU (A4): % fez pedido de compra sem o módulo', novo_forn;
    exception when insufficient_privilege then null;
    end;
    begin
      insert into pedidos_compra_itens (pedido_compra_id, peca_id, quantidade_pedida) values (ped_a, p1, 1);
      raise exception 'FALHOU (A5): % lançou item de pedido sem o módulo', novo_forn;
    exception when insufficient_privilege then null;
    end;

    update fornecedores set nome = 'Mexido' where id = f1;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A6): % alterou fornecedor sem o módulo', novo_forn; end if;
    update cotacoes_pecas set preco = 1.00 where peca_id = p1;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A7): % alterou cotação sem o módulo', novo_forn; end if;
    update pedidos_compra set status = 'cancelado' where id = ped_a;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A8): % cancelou pedido sem o módulo', novo_forn; end if;
    update pedidos_compra_itens set preco_unitario = 1.00 where id = item_a;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A9): % alterou item de pedido sem o módulo', novo_forn; end if;

    delete from pedidos_compra_itens where id = item_a;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A10): % apagou item de pedido sem o módulo', novo_forn; end if;
    delete from pedidos_compra where id = ped_a;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A11): % apagou pedido sem o módulo', novo_forn; end if;
    delete from cotacoes_pecas where peca_id = p1;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A12): % apagou cotação sem o módulo', novo_forn; end if;
    delete from fornecedores where id = f2;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (A13): % apagou fornecedor sem o módulo', novo_forn; end if;
  end loop;

  -- ===================================================================
  -- B. Com Fornecedores (sem ser admin): a compra inteira, só na loja dele
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_forn::text, true);

  select count(*) into quantas from fornecedores where id in (f1, f2);
  if quantas <> 2 then raise exception 'FALHOU (B1): com Fornecedores leu % de 2 fornecedores', quantas; end if;
  select count(*) into quantas from cotacoes_pecas where peca_id = p1;
  if quantas <> 2 then raise exception 'FALHOU (B2): com Fornecedores leu % de 2 cotações', quantas; end if;
  select count(*) into quantas from pedidos_compra where id in (ped_a, ped_b);
  if quantas <> 1 then raise exception 'FALHOU (B3): com Fornecedores leu % pedido(s); devia só o da loja A', quantas; end if;
  select count(*) into quantas from pedidos_compra_itens where id in (item_a, item_b);
  if quantas <> 1 then raise exception 'FALHOU (B4): com Fornecedores leu % item(ns) de pedido; devia só o da loja A', quantas; end if;

  -- Cadastrar fornecedor com `returning` (a importação do XML lê o id de volta).
  insert into fornecedores (nome) values ('Nova distribuidora (teste #880)') returning id into novo_forn;
  if novo_forn is null then raise exception 'FALHOU (B5): o cadastro de fornecedor não devolveu o id'; end if;
  update fornecedores set telefone = '(16) 3333-0000' where id = novo_forn;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (B6): com Fornecedores não alterou o fornecedor'; end if;

  -- Pedido novo: o número sai sozinho, contando os pedidos da loja.
  insert into pedidos_compra (loja_id, fornecedor_id) values (loja_a, novo_forn)
    returning id, numero into novo_ped, novo_num;
  if novo_num <> 2 then raise exception 'FALHOU (B7): o número do pedido saiu % (devia 2)', novo_num; end if;
  insert into pedidos_compra_itens (pedido_compra_id, peca_id, quantidade_pedida, preco_unitario)
    values (novo_ped, p1, 3, 199.90);
  insert into cotacoes_pecas (peca_id, fornecedor_id, preco) values (p1, novo_forn, 199.90);

  -- Pedido na loja B: fora do alcance dele.
  begin
    insert into pedidos_compra (loja_id, fornecedor_id) values (loja_b, novo_forn);
    raise exception 'FALHOU (B8): com Fornecedores fez pedido na loja B, que não é dele';
  exception when insufficient_privilege then null;
  end;
  update pedidos_compra set status = 'cancelado' where id = ped_b;
  get diagnostics quantas = row_count;
  if quantas <> 0 then raise exception 'FALHOU (B9): com Fornecedores cancelou o pedido da loja B'; end if;

  -- Receber o pedido da loja A: a quantidade recebida, a entrada no estoque
  -- (motivo 'compra', a porta da 0074) e o status.
  update pedidos_compra_itens set quantidade_recebida = 4 where id = item_a;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (B10): com Fornecedores não registrou o recebimento do item'; end if;
  insert into estoque_movimentos (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
    values (p1, dep_a, 'entrada', 4, 'compra', 'Pedido de compra 1', loja_a);
  update pedidos_compra set status = 'recebido' where id = ped_a;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (B11): com Fornecedores não marcou o pedido como recebido'; end if;

  -- Cancelar e apagar o pedido novo (o item vai junto, em cascata).
  update pedidos_compra set status = 'cancelado' where id = novo_ped;
  delete from pedidos_compra where id = novo_ped;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (B12): com Fornecedores não apagou o pedido dele'; end if;

  -- ===================================================================
  -- C. O admin continua vendo tudo, nas duas lojas
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_admin::text, true);
  select count(*) into quantas from pedidos_compra where id in (ped_a, ped_b);
  if quantas <> 2 then raise exception 'FALHOU (C1): o admin leu % de 2 pedidos', quantas; end if;
  select count(*) into quantas from pedidos_compra_itens where id in (item_a, item_b);
  if quantas <> 2 then raise exception 'FALHOU (C2): o admin leu % de 2 itens de pedido', quantas; end if;
  select count(*) into quantas from cotacoes_pecas where peca_id = p1;
  if quantas <> 3 then raise exception 'FALHOU (C3): o admin leu % de 3 cotações', quantas; end if;

  reset role;

  -- O que o balcão tentou mexer ficou igual (conferido como dono, sem RLS).
  if (select nome from fornecedores where id = f1) <> 'Distribuidora 1 (teste #880)'
     or not exists (select 1 from fornecedores where id = f2)
     or (select count(*) from cotacoes_pecas where peca_id = p1 and preco = 1.00) <> 0 then
    raise exception 'FALHOU (A14): alguma coisa que quem não tem o módulo tentou mexer mudou';
  end if;

  -- ===================================================================
  -- Limpeza
  -- ===================================================================
  delete from estoque_movimentos where loja_id in (loja_a, loja_b);
  delete from pedidos_compra where loja_id in (loja_a, loja_b);
  delete from cotacoes_pecas where peca_id = p1;
  delete from fornecedores where id in (f1, f2, novo_forn);
  delete from pecas where id = p1;
  delete from depositos where loja_id in (loja_a, loja_b);
  delete from operador_lojas where operador_id in (o_admin, o_forn, o_balcao, o_inativo);
  delete from operadores where id in (o_admin, o_forn, o_balcao, o_inativo);
  delete from lojas where id in (loja_a, loja_b);

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

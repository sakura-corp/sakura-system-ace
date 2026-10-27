-- Sakura System — AutoCenter Edition
-- TESTE do lote 5 do TR-04.1 (migrations 0073 e 0074, tarefa #366). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava e apaga
-- dado de teste.
--
-- Prova as duas metades da promessa, que são opostas e por isso precisam ser
-- medidas juntas:
--   • quem NÃO tem o módulo Estoque não alcança o CUSTO de peça nenhuma, não
--     lê movimento nem contagem, não mexe no cadastro e não lança movimento
--     fora das portas estreitas — nem pela tabela, nem pela janela, nem pelas
--     funções;
--   • e MESMO ASSIM o balcão continua: quem tem OS escolhe a peça pela janela
--     (com o preço de venda), vê o saldo da loja dele, baixa o estoque (pelas
--     funções da 0071 e pelo insert da venda de balcão), cadastra peça pela
--     função; Fornecedores dá entrada da compra; e o Caixa recebe o custo de
--     cada OS pronto, com os números certos.
--
-- Uma trava que também impede o balconista de vender não é segurança, é
-- sistema quebrado. Por isso a parte "ainda passa" pesa tanto quanto a outra.
--
-- Como rodar: `npm run test:sql -- testar-pecas-permissao`. Terminou
-- imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

do $$
declare
  loja_a   uuid := '36600000-0000-0000-0000-00000000000a';
  loja_b   uuid := '36600000-0000-0000-0000-00000000000b';
  dep_a    uuid := '36600000-1111-0000-0000-00000000000a';
  dep_b    uuid := '36600000-1111-0000-0000-00000000000b';
  o_os     uuid := '36601111-0000-0000-0000-000000000001';  -- OS + Caixa (o balcão de verdade)
  o_caixa  uuid := '36601111-0000-0000-0000-000000000002';  -- só Caixa
  o_painel uuid := '36601111-0000-0000-0000-000000000003';  -- só o Início
  o_forn   uuid := '36601111-0000-0000-0000-000000000004';  -- só Fornecedores
  o_rel    uuid := '36601111-0000-0000-0000-000000000005';  -- só Relações
  o_func   uuid := '36601111-0000-0000-0000-000000000006';  -- só Funcionários
  o_est    uuid := '36601111-0000-0000-0000-000000000007';  -- Estoque, não é admin
  o_orfao  uuid := '36601111-0000-0000-0000-000000000008';  -- OS, mas sem loja
  o_notas  uuid := '36601111-0000-0000-0000-000000000009';  -- só Notas Fiscais
  cliente  uuid := '36602222-0000-0000-0000-000000000001';
  p1       uuid := '36605555-0000-0000-0000-000000000001';  -- custo 30,00, venda 50,00
  p2       uuid := '36605555-0000-0000-0000-000000000002';  -- custo 12,50, venda 20,00
  p3       uuid := '36605555-0000-0000-0000-000000000003';  -- custo 0 (sem custo), fora de `todos`
  p4       uuid := '36605555-0000-0000-0000-000000000004';  -- custo em branco, fora de `todos`
  s1       uuid := '36606666-0000-0000-0000-000000000001';  -- serviço com custo 40,00
  os_1     uuid := '36604444-0000-0000-0000-000000000001';  -- loja A, a "completa"
  os_2     uuid := '36604444-0000-0000-0000-000000000002';  -- loja A, avulsa sem custo
  os_3     uuid := '36604444-0000-0000-0000-000000000003';  -- loja A, sem item
  os_b     uuid := '36604444-0000-0000-0000-00000000000b';  -- loja B
  orc      uuid := '36604444-0000-0000-0000-0000000000c1';  -- orçamento da loja A
  item_p1  uuid;
  todos    uuid[];
  quantas  int;
  numero   numeric;
  problema text;
  novo_id  uuid;
  linha    record;
  ordens   uuid[];
begin
  -- ---- preparo -------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A de Teste (#366)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B de Teste (#366)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into depositos (id, loja_id, nome, ativo) values
    (dep_a, loja_a, 'Principal A', true),
    (dep_b, loja_b, 'Principal B', true)
    on conflict (id) do nothing;

  insert into auth.users (id) values
    (o_os), (o_caixa), (o_painel), (o_forn), (o_rel), (o_func), (o_est), (o_orfao), (o_notas)
    on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_os,     't366_os',     'Balcão de OS e Caixa', false, array['painel','ordens_servico','caixa'], true),
    (o_caixa,  't366_caixa',  'Só Caixa',             false, array['painel','caixa'],                  true),
    (o_painel, 't366_painel', 'Só Início',            false, array['painel'],                          true),
    (o_forn,   't366_forn',   'Só Fornecedores',      false, array['painel','fornecedores'],           true),
    (o_rel,    't366_rel',    'Só Relações',          false, array['painel','relatorios'],             true),
    (o_func,   't366_func',   'Só Funcionários',      false, array['painel','funcionarios'],           true),
    (o_est,    't366_est',    'Quem tem Estoque',     false, array['painel','estoque'],                true),
    (o_orfao,  't366_orfao',  'OS sem loja',          false, array['painel','ordens_servico'],         true),
    (o_notas,  't366_notas',  'Só Notas',             false, array['painel','notas_fiscais'],          true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values
    (o_os, loja_a), (o_caixa, loja_a), (o_painel, loja_a), (o_forn, loja_a),
    (o_rel, loja_a), (o_func, loja_a), (o_est, loja_a), (o_notas, loja_a)
    on conflict do nothing;

  insert into clientes (id, nome) values (cliente, 'Cliente de Teste (#366)') on conflict (id) do nothing;
  insert into pecas (id, descricao, codigo_interno, unidade, preco_custo, preco_venda, ncm, cfop_padrao, origem, cst_ou_csosn, aliquota_icms) values
    (p1, 'Pneu de teste (#366)',    'T366-1', 'UN', 30.00, 50.00, '40111000', '5102', '0', '102', 18.00),
    (p2, 'Válvula de teste (#366)', 'T366-2', 'UN', 12.50, 20.00, '84818099', '5102', '0', '102', 18.00)
    on conflict (id) do nothing;
  -- As duas sem custo ficam fora de `todos`: só servem pro `sem_custo` da janela.
  insert into pecas (id, descricao, preco_custo, preco_venda, marca, modelo, medida) values
    (p3, 'Pneu sem custo (#366)',     0,    90.00, 'Marca X', 'Modelo Y', '175/70 R14'),
    (p4, 'Válvula sem custo (#366)',  null, 10.00, null, null, null)
    on conflict (id) do nothing;
  insert into servicos (id, descricao, custo, ativo) values
    (s1, 'Montagem de teste (#366)', 40.00, true)
    on conflict (id) do nothing;
  todos := array[p1, p2];

  -- Saldo de partida: loja A tem 7 pneus (10 − 3) e 5 válvulas; a B, 100 pneus.
  insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo) values
    (p1, dep_a, loja_a, 'entrada', 10,  'compra'),
    (p1, dep_a, loja_a, 'saida',    3,  'uso_em_os'),
    (p2, dep_a, loja_a, 'entrada',  5,  'compra'),
    (p1, dep_b, loja_b, 'entrada', 100, 'compra');
  insert into contagens_estoque (peca_id, deposito_id, loja_id, quantidade_contada, saldo_sistema, diferenca) values
    (p1, dep_a, loja_a, 7, 7, 0),
    (p1, dep_b, loja_b, 100, 100, 0);

  -- As ordens do custo. Os números esperados, feitos à mão:
  --   os_1: pneu 2 × 30,00 = 60,00
  --         montagem 1 × 40,00 = 40,00
  --         serviço sem cadastro (servico_id nulo) 1 × 0 = 0
  --         peça avulsa com custo 2 × 15,25 = 30,50
  --         total 130,50, completo
  --   os_2: válvula 1,5 × 12,50 = 18,75
  --         peça avulsa SEM custo 1 × (conta 0) = 0
  --         total 18,75, INCOMPLETO
  --   os_3: nenhum item → 0, completo
  --   os_b: pneu 1 × 30,00 = 30,00 (mas é da loja B)
  insert into ordens_servico (id, loja_id, cliente_id, status) values
    (os_1, loja_a, cliente, 'em_andamento'),
    (os_2, loja_a, cliente, 'em_andamento'),
    (os_3, loja_a, cliente, 'em_andamento'),
    (os_b, loja_b, cliente, 'em_andamento')
    on conflict (id) do nothing;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, servico_id, descricao, quantidade, preco_unitario, custo_unitario) values
    (os_1, 'peca',    p1,   null, 'Pneu',               2,   50.00, null),
    (os_1, 'servico', null, s1,   'Montagem',           1,   80.00, null),
    (os_1, 'servico', null, null, 'Serviço sem cadastro', 1, 10.00, null),
    (os_1, 'peca',    null, null, 'Avulsa com custo',   2,   25.00, 15.25),
    (os_2, 'peca',    p2,   null, 'Válvula',            1.5, 20.00, null),
    (os_2, 'peca',    null, null, 'Avulsa sem custo',   1,   30.00, null),
    (os_b, 'peca',    p1,   null, 'Pneu',               1,   50.00, null);
  -- O pagamento da os_1 no Caixa (é por ele que o Caixa chega nas ordens).
  insert into caixa_movimentos (loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao) values
    (loja_a, os_1, 'entrada', 'pix', 290.00, 'Faturamento de teste (#366)');

  -- Um orçamento com 1 pneu, pra aprovação baixar.
  insert into ordens_servico (id, loja_id, cliente_id, status) values (orc, loja_a, cliente, 'orcamento')
    on conflict (id) do nothing;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario) values
    (orc, 'peca', p1, 'Pneu orçado', 1, 50.00);

  -- ===================================================================
  -- 0. Ninguém logado (anon): nem janela, nem saldo, nem função
  -- ===================================================================
  set local role anon;
  begin
    select count(*) into quantas from pecas_janela;
    raise exception 'FALHOU: o anônimo leu a pecas_janela (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into quantas from estoque_saldos;
    raise exception 'FALHOU: o anônimo leu a estoque_saldos (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;
  -- As funções também barram por dentro (o anônimo não tem módulo), então
  -- confere que a recusa é a do `revoke` (permissão de executar), e não a de
  -- dentro — senão tirar o revoke passaria calado.
  begin
    perform * from custo_das_ordens(array[os_1]);
    raise exception 'FALHOU: o anônimo chamou custo_das_ordens';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FALHOU: custo_das_ordens está executável pelo anônimo (faltou o revoke)';
    end if;
  end;
  begin
    perform * from dados_fiscais_das_pecas(todos);
    raise exception 'FALHOU: o anônimo chamou dados_fiscais_das_pecas';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FALHOU: dados_fiscais_das_pecas está executável pelo anônimo (faltou o revoke)';
    end if;
  end;
  begin
    novo_id := cadastrar_peca_rapida('{"descricao":"Pelo anônimo"}'::jsonb);
    raise exception 'FALHOU: o anônimo chamou cadastrar_peca_rapida';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FALHOU: cadastrar_peca_rapida está executável pelo anônimo (faltou o revoke)';
    end if;
  end;
  reset role;

  -- ===================================================================
  -- A. A janela e o saldo nunca levam o custo (conferido no catálogo)
  -- ===================================================================
  select string_agg(table_name || '.' || column_name, ', ' order by table_name, column_name) into problema
    from information_schema.columns
   where table_schema = 'public'
     and ((table_name = 'pecas_janela'
           and column_name not in ('id','codigo_interno','codigo_barras','descricao','unidade',
                                   'preco_venda','prazo_garantia_dias','ativo',
                                   'marca','modelo','medida','sem_custo'))
       or (table_name = 'estoque_saldos' and column_name not in ('peca_id','loja_id','saldo')));
  if problema is not null then
    raise exception 'FALHOU: a janela ganhou coluna fora do combinado: %', problema;
  end if;
  select count(*) into quantas
    from information_schema.columns
   where table_schema = 'public' and table_name in ('pecas_janela', 'estoque_saldos');
  if quantas <> 15 then
    raise exception 'FALHOU: as duas janelas deviam ter 12 + 3 colunas e têm %', quantas;
  end if;
  -- e a função fiscal também não devolve custo
  select count(*) into quantas
    from pg_proc p
   where p.proname = 'dados_fiscais_das_pecas'
     and exists (select 1 from unnest(p.proargnames) a where a like '%custo%');
  if quantas <> 0 then
    raise exception 'FALHOU: dados_fiscais_das_pecas devolve uma coluna de custo';
  end if;

  set local role authenticated;

  -- ===================================================================
  -- B. Sem Estoque/Relações/Funcionários: as três tabelas somem
  -- ===================================================================
  foreach novo_id in array array[o_os, o_caixa, o_forn, o_notas, o_painel] loop
    perform set_config('request.jwt.claim.sub', novo_id::text, true);

    -- 1. o cadastro some inteiro, e o custo junto
    select count(*) into quantas from pecas where id = any (todos);
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque leu % peça(s) da tabela', novo_id, quantas;
    end if;
    -- 2. nenhum movimento e nenhuma contagem, nem da loja dele
    select count(*) into quantas from estoque_movimentos where peca_id = any (todos);
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque leu % movimento(s) de estoque', novo_id, quantas;
    end if;
    select count(*) into quantas from contagens_estoque where peca_id = any (todos);
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque leu % contagem(ns)', novo_id, quantas;
    end if;
    -- 3. não insere peça direto (a porta é cadastrar_peca_rapida)
    begin
      insert into pecas (descricao) values ('Direto na tabela');
      raise exception 'FALHOU: % sem Estoque inseriu direto em pecas', novo_id;
    exception when insufficient_privilege then null;
    end;
    -- 4. nem contagem
    begin
      insert into contagens_estoque (peca_id, deposito_id, loja_id, quantidade_contada, saldo_sistema, diferenca)
        values (p1, dep_a, loja_a, 1, 7, -6);
      raise exception 'FALHOU: % sem Estoque gravou contagem', novo_id;
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- 5. sem Estoque não altera nem apaga peça — nem quem LÊ (Relações,
  --    Funcionários). Update e delete SEM filtro e sem ler coluna (§6 item
  --    74): com a leitura aberta pra eles, quem barra é a policy de escrita.
  foreach novo_id in array array[o_os, o_rel, o_func] loop
    perform set_config('request.jwt.claim.sub', novo_id::text, true);
    update pecas set preco_venda = 1;
    get diagnostics quantas = row_count;
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque alterou % peça(s)', novo_id, quantas;
    end if;
    delete from pecas;
    get diagnostics quantas = row_count;
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque apagou % peça(s)', novo_id, quantas;
    end if;
    -- e movimento também não (nem quem lê o custo mexe no estoque)
    update estoque_movimentos set quantidade = 1;
    get diagnostics quantas = row_count;
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque alterou % movimento(s)', novo_id, quantas;
    end if;
    delete from estoque_movimentos;
    get diagnostics quantas = row_count;
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque apagou % movimento(s)', novo_id, quantas;
    end if;
    delete from contagens_estoque;
    get diagnostics quantas = row_count;
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Estoque apagou % contagem(ns)', novo_id, quantas;
    end if;
  end loop;

  -- 6. a janela não é porta de escrita (auto-atualizável + dono = sem RLS)
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  begin
    with s as (update pecas_janela set preco_venda = 1 returning 1)
    select count(*) into quantas from s;
    raise exception 'FALHOU: deu pra mudar preço por dentro da pecas_janela (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;
  begin
    with s as (delete from pecas_janela returning 1)
    select count(*) into quantas from s;
    raise exception 'FALHOU: deu pra apagar peça por dentro da pecas_janela (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- C. As portas estreitas de movimento: só o motivo certo, só na loja dele
  -- ===================================================================
  -- 7. OS não lança venda nem ajuste de saída (isso é do Estoque)
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'saida', 1, 'venda');
    raise exception 'FALHOU: quem tem OS lançou saída com motivo venda';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'saida', 1, 'ajuste');
    raise exception 'FALHOU: quem tem OS lançou ajuste de saída';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'entrada', 1, 'compra');
    raise exception 'FALHOU: quem tem OS (sem Fornecedores) lançou entrada de compra';
  exception when insufficient_privilege then null;
  end;
  -- 8. ...nem baixa na loja que não é dele
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_b, loja_b, 'saida', 1, 'uso_em_os');
    raise exception 'FALHOU: quem tem OS na loja A baixou estoque da loja B';
  exception when insufficient_privilege then null;
  end;
  -- 9. Fornecedores só dá ENTRADA de compra
  perform set_config('request.jwt.claim.sub', o_forn::text, true);
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'saida', 1, 'compra');
    raise exception 'FALHOU: Fornecedores lançou saída';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'entrada', 1, 'ajuste');
    raise exception 'FALHOU: Fornecedores lançou ajuste';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'saida', 1, 'uso_em_os');
    raise exception 'FALHOU: Fornecedores baixou peça de OS';
  exception when insufficient_privilege then null;
  end;
  -- 10. só Caixa não lança movimento nenhum
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'saida', 1, 'uso_em_os');
    raise exception 'FALHOU: quem só tem Caixa baixou estoque';
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- D. As funções recusam quem não é delas
  -- ===================================================================
  -- 11. custo_das_ordens: só o Início (painel) não basta
  perform set_config('request.jwt.claim.sub', o_painel::text, true);
  begin
    perform * from custo_das_ordens(array[os_1]);
    raise exception 'FALHOU: quem só tem o Início leu o custo das ordens';
  exception when insufficient_privilege then null;
  end;
  -- 12. dados fiscais e cadastro rápido: só Caixa não usa
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  begin
    perform * from dados_fiscais_das_pecas(todos);
    raise exception 'FALHOU: quem só tem Caixa leu os dados fiscais das peças';
  exception when insufficient_privilege then null;
  end;
  begin
    novo_id := cadastrar_peca_rapida('{"descricao":"Pelo caixa"}'::jsonb);
    raise exception 'FALHOU: quem só tem Caixa cadastrou peça';
  exception when insufficient_privilege then null;
  end;
  -- 13. o operador sem loja: nem janela, nem saldo, nem função (§6 item 23)
  perform set_config('request.jwt.claim.sub', o_orfao::text, true);
  select count(*) into quantas from pecas_janela where id = any (todos);
  if quantas <> 0 then
    raise exception 'FALHOU: o operador sem loja viu % peça(s) na janela', quantas;
  end if;
  select count(*) into quantas from estoque_saldos where peca_id = any (todos);
  if quantas <> 0 then
    raise exception 'FALHOU: o operador sem loja viu % saldo(s)', quantas;
  end if;
  begin
    novo_id := cadastrar_peca_rapida('{"descricao":"Pelo órfão"}'::jsonb);
    raise exception 'FALHOU: o operador sem loja cadastrou peça';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from dados_fiscais_das_pecas(todos);
    raise exception 'FALHOU: o operador sem loja leu os dados fiscais';
  exception when insufficient_privilege then null;
  end;
  select count(*) into quantas from custo_das_ordens(array[os_1, os_2, os_3, os_b]);
  if quantas <> 0 then
    raise exception 'FALHOU: o operador sem loja recebeu o custo de % ordem(ns)', quantas;
  end if;
  -- 14. o cadastro rápido recusa descrição em branco
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  begin
    novo_id := cadastrar_peca_rapida('{"descricao":"   "}'::jsonb);
    raise exception 'FALHOU: o cadastro rápido aceitou descrição em branco';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- ===================================================================
  -- E. AINDA PASSA: quem tem OS vende, orça e baixa sem o módulo Estoque
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_os::text, true);

  -- 15. a janela entrega as duas peças, com o preço de venda
  select count(*) into quantas from pecas_janela where id = any (todos);
  if quantas <> 2 then
    raise exception 'FALHOU: quem tem OS devia ver 2 peças na janela e viu %', quantas;
  end if;
  select preco_venda into numero from pecas_janela where id = p1;
  if numero is distinct from 50.00 then
    raise exception 'FALHOU: a janela devia dar o preço de venda 50,00 do pneu e deu %', numero;
  end if;
  -- o aviso "peça sem preço de custo" da OS: a janela diz SE falta custo
  -- (em branco ou zero, a regra do avisoPecaSemCusto), nunca quanto é
  select count(*) into quantas from pecas_janela
   where (id = p1 and not sem_custo) or (id = p3 and sem_custo) or (id = p4 and sem_custo);
  if quantas <> 3 then
    raise exception 'FALHOU: o sem_custo da janela devia ser falso no pneu (custo 30) e verdadeiro nas peças de custo 0 e em branco; acertou % de 3', quantas;
  end if;
  -- a busca por medida do pneu no balcão (marca, modelo e medida vêm na janela)
  select count(*) into quantas from pecas_janela
   where id = p3 and medida = '175/70 R14' and marca = 'Marca X' and modelo = 'Modelo Y';
  if quantas <> 1 then
    raise exception 'FALHOU: a janela devia trazer marca, modelo e medida do pneu sem custo';
  end if;

  -- 16. o saldo da loja dele, e só dela
  select saldo into numero from estoque_saldos where peca_id = p1 and loja_id = loja_a;
  if numero is distinct from 7.00 then
    raise exception 'FALHOU: o saldo do pneu na loja A devia ser 7 e veio %', numero;
  end if;
  select saldo into numero from estoque_saldos where peca_id = p2 and loja_id = loja_a;
  if numero is distinct from 5.00 then
    raise exception 'FALHOU: o saldo da válvula na loja A devia ser 5 e veio %', numero;
  end if;
  select count(*) into quantas from estoque_saldos where loja_id = loja_b;
  if quantas <> 0 then
    raise exception 'FALHOU: o balcão da loja A viu % saldo(s) da loja B', quantas;
  end if;

  -- 17. acrescentar peça numa OS (0071) baixa o estoque: pneu 7 → 5
  begin
    perform adicionar_itens_ordem(os_3, jsonb_build_array(
      jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                         'descricao', 'Pneu', 'quantidade', 2, 'preco_unitario', 50, 'desconto', 0)
    ), o_os);
  exception when insufficient_privilege then
    raise exception 'FALHOU: quem tem OS sem Estoque não conseguiu acrescentar peça numa OS (%)', sqlerrm;
  end;
  select saldo into numero from estoque_saldos where peca_id = p1 and loja_id = loja_a;
  if numero is distinct from 5.00 then
    raise exception 'FALHOU: adicionar_itens_ordem devia baixar 2 pneus (saldo 5) e o saldo ficou %', numero;
  end if;

  -- 18. corrigir pra MENOS devolve ao estoque (entrada "ajuste"): 2 → 1, pneu 5 → 6
  select id into item_p1 from ordens_servico_itens where ordem_servico_id = os_3 and peca_id = p1;
  begin
    perform editar_item_ordem(item_p1, '{"quantidade": 1}'::jsonb, o_os);
  exception when insufficient_privilege then
    raise exception 'FALHOU: quem tem OS sem Estoque não conseguiu corrigir o item pra menos (a devolução ao estoque) (%)', sqlerrm;
  end;
  select saldo into numero from estoque_saldos where peca_id = p1 and loja_id = loja_a;
  if numero is distinct from 6.00 then
    raise exception 'FALHOU: editar_item_ordem devia devolver 1 pneu (saldo 6) e o saldo ficou %', numero;
  end if;
  -- ...e pra MAIS baixa a diferença: 1 → 3, pneu 6 → 4
  begin
    perform editar_item_ordem(item_p1, '{"quantidade": 3}'::jsonb, o_os);
  exception when insufficient_privilege then
    raise exception 'FALHOU: quem tem OS sem Estoque não conseguiu corrigir o item pra mais (%)', sqlerrm;
  end;
  select saldo into numero from estoque_saldos where peca_id = p1 and loja_id = loja_a;
  if numero is distinct from 4.00 then
    raise exception 'FALHOU: editar_item_ordem devia baixar mais 2 pneus (saldo 4) e o saldo ficou %', numero;
  end if;

  -- 19. aprovar o orçamento baixa o pneu orçado: 4 → 3
  begin
    if aprovar_orcamento(orc, 'cliente', o_os) is null then
      raise exception 'FALHOU: quem tem OS não conseguiu aprovar o orçamento';
    end if;
  exception when insufficient_privilege then
    raise exception 'FALHOU: quem tem OS sem Estoque não conseguiu aprovar o orçamento (%)', sqlerrm;
  end;
  select saldo into numero from estoque_saldos where peca_id = p1 and loja_id = loja_a;
  if numero is distinct from 3.00 then
    raise exception 'FALHOU: aprovar_orcamento devia baixar 1 pneu (saldo 3) e o saldo ficou %', numero;
  end if;

  -- 20. a venda de balcão grava a baixa direto, sem `returning`: 3 → 2
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo, referencia)
      values (p1, dep_a, loja_a, 'saida', 1, 'uso_em_os', 'Venda de teste');
  exception when insufficient_privilege then
    raise exception 'FALHOU: a venda de balcão (insert uso_em_os) foi recusada pra quem tem OS (%)', sqlerrm;
  end;

  -- 21. o cadastro rápido (peça avulsa que ganha cadastro) devolve o id...
  novo_id := cadastrar_peca_rapida(
    '{"descricao":"Peça nova da OS (#366)","preco_custo":7.5,"preco_venda":15,"unidade":"UN","ncm":"40111000","campo_que_nao_existe":"x"}'::jsonb);
  if novo_id is null then
    raise exception 'FALHOU: cadastrar_peca_rapida não devolveu o id';
  end if;
  -- ...a peça aparece na janela, ativa, pra já vir escolhida...
  select count(*) into quantas from pecas_janela where id = novo_id and ativo and preco_venda = 15.00;
  if quantas <> 1 then
    raise exception 'FALHOU: a peça do cadastro rápido não apareceu ativa na janela';
  end if;
  todos := todos || novo_id;
  -- ...e o estoque inicial dela entra (entrada "ajuste")
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo, referencia)
      values (novo_id, dep_a, loja_a, 'entrada', 4, 'ajuste', 'Estoque inicial (cadastro do produto)');
  exception when insufficient_privilege then
    raise exception 'FALHOU: o estoque inicial da peça avulsa (entrada ajuste) foi recusado pra quem tem OS (%)', sqlerrm;
  end;
  select saldo into numero from estoque_saldos where peca_id = novo_id and loja_id = loja_a;
  if numero is distinct from 4.00 then
    raise exception 'FALHOU: o estoque inicial da peça nova devia ser 4 e veio %', numero;
  end if;

  -- 22. os dados fiscais da nota, sem custo
  select count(*) into quantas from dados_fiscais_das_pecas(array[p1, p2, novo_id]) d where d.ncm is not null;
  if quantas <> 3 then
    raise exception 'FALHOU: dados_fiscais_das_pecas devia trazer o NCM das 3 peças e trouxe %', quantas;
  end if;
  select aliquota_icms into numero from dados_fiscais_das_pecas(array[p1]);
  if numero is distinct from 18.00 then
    raise exception 'FALHOU: dados_fiscais_das_pecas devia trazer o ICMS 18 do pneu e trouxe %', numero;
  end if;

  -- 23. Fornecedores dá entrada da compra e cadastra peça
  perform set_config('request.jwt.claim.sub', o_forn::text, true);
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo, referencia)
      values (p2, dep_a, loja_a, 'entrada', 10, 'compra', 'Nota de teste');
  exception when insufficient_privilege then
    raise exception 'FALHOU: a entrada da compra foi recusada pra quem tem Fornecedores (%)', sqlerrm;
  end;
  novo_id := cadastrar_peca_rapida('{"descricao":"Peça nova da nota (#366)","preco_custo":3}'::jsonb);
  if novo_id is null then
    raise exception 'FALHOU: Fornecedores não cadastrou peça pela função';
  end if;
  todos := todos || novo_id;
  -- Notas Fiscais também lê os dados fiscais
  perform set_config('request.jwt.claim.sub', o_notas::text, true);
  select count(*) into quantas from dados_fiscais_das_pecas(array[p1, p2]);
  if quantas <> 2 then
    raise exception 'FALHOU: quem tem Notas devia ler os dados fiscais de 2 peças e leu %', quantas;
  end if;

  -- 24. conferência como dono do banco: TODOS os movimentos que as portas
  --     gravaram, com tipo e motivo certos (as funções rodam como quem chama
  --     e gravaram sob a RLS do balconista)
  reset role;
  select count(*) into quantas from estoque_movimentos where peca_id = any (todos);
  if quantas <> 11 then
    raise exception 'FALHOU: deviam existir 11 movimentos (4 de partida + 7 das portas) e existem %', quantas;
  end if;
  select sum(case tipo when 'entrada' then quantidade else -quantidade end) into numero
    from estoque_movimentos where peca_id = p1 and loja_id = loja_a;
  if numero is distinct from 2.00 then
    raise exception 'FALHOU: o pneu na loja A devia terminar com 2 (7 −2 +1 −2 −1 −1) e terminou com %', numero;
  end if;
  select sum(quantidade) into numero from estoque_movimentos
   where peca_id = p2 and loja_id = loja_a and tipo = 'entrada' and motivo = 'compra';
  if numero is distinct from 15.00 then
    raise exception 'FALHOU: a válvula devia ter 15 de entrada de compra (5 + 10) e tem %', numero;
  end if;
  select count(*) into quantas from pecas where id = any (todos) and preco_custo is not null;
  if quantas <> 4 then
    raise exception 'FALHOU: o cadastro rápido devia gravar o custo das 2 peças novas (4 com custo) e há %', quantas;
  end if;
  set local role authenticated;

  -- ===================================================================
  -- F. O custo das ordens: os números exatos, e só das lojas dele
  -- ===================================================================
  -- 25. o balcão chega nas ordens pelos pagamentos do Caixa (como a tela faz)
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  select array_agg(distinct ordem_servico_id) into ordens
    from caixa_movimentos where ordem_servico_id is not null and loja_id = loja_a;
  if ordens is distinct from array[os_1] then
    raise exception 'FALHOU: o Caixa da loja A devia ter o pagamento só da os_1 e tem %', ordens;
  end if;
  select custo, custo_completo into linha from custo_das_ordens(ordens);
  if linha.custo is distinct from 130.50 or linha.custo_completo is distinct from true then
    raise exception 'FALHOU: o custo da OS paga devia ser 130,50 completo e veio % (completo %)',
      linha.custo, linha.custo_completo;
  end if;

  -- 26. as quatro ordens de uma vez: a da loja B não vem
  --     (os_3 agora tem 3 pneus: 3 × 30,00 = 90,00)
  for linha in select * from custo_das_ordens(array[os_1, os_2, os_3, os_b, os_1]) loop
    if linha.ordem_servico_id = os_1 and (linha.custo <> 130.50 or not linha.custo_completo)
       or linha.ordem_servico_id = os_2 and (linha.custo <> 18.75 or linha.custo_completo)
       or linha.ordem_servico_id = os_3 and (linha.custo <> 90.00 or not linha.custo_completo)
       or linha.ordem_servico_id not in (os_1, os_2, os_3) then
      raise exception 'FALHOU: custo errado (ou de loja alheia) na ordem %: % (completo %)',
        linha.ordem_servico_id, linha.custo, linha.custo_completo;
    end if;
  end loop;
  select count(*) into quantas from custo_das_ordens(array[os_1, os_2, os_3, os_b, os_1]);
  if quantas <> 3 then
    raise exception 'FALHOU: custo_das_ordens devia devolver 3 ordens (uma linha cada, sem a da loja B) e devolveu %', quantas;
  end if;

  -- 27. ordem sem item: 0, completa (o orçamento recém-aprovado sem nada
  --     além do pneu não serve; uma ordem nova vazia, sim)
  reset role;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'em_andamento')
    returning id into novo_id;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  select custo, custo_completo into linha from custo_das_ordens(array[novo_id]);
  if linha.custo is distinct from 0::numeric or linha.custo_completo is distinct from true then
    raise exception 'FALHOU: ordem sem item devia vir com custo 0 completo e veio % (completo %)',
      linha.custo, linha.custo_completo;
  end if;
  -- ...e quem só tem Caixa recebe o mesmo número da os_1
  select custo into numero from custo_das_ordens(array[os_1]);
  if numero is distinct from 130.50 then
    raise exception 'FALHOU: quem só tem Caixa devia receber 130,50 da os_1 e recebeu %', numero;
  end if;

  -- ===================================================================
  -- G. Quem lê o cadastro inteiro continua lendo (com o custo)
  -- ===================================================================
  -- Sem esta parte, uma policy que barrasse todo mundo passaria no teste.
  foreach novo_id in array array[o_rel, o_func, o_est] loop
    perform set_config('request.jwt.claim.sub', novo_id::text, true);
    select count(*) into quantas from pecas where id = any (todos) and preco_custo is not null;
    if quantas <> 4 then
      raise exception 'FALHOU: % devia ler as 4 peças com custo e leu %', novo_id, quantas;
    end if;
  end loop;

  -- ===================================================================
  -- H. Quem tem Estoque faz tudo (na loja dele)
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_est::text, true);
  -- 28. lê os movimentos e as contagens da loja A, e não os da B
  select count(*) into quantas from estoque_movimentos where peca_id = any (todos);
  if quantas <> 10 then
    raise exception 'FALHOU: quem tem Estoque devia ler os 10 movimentos da loja A e leu %', quantas;
  end if;
  select count(*) into quantas from contagens_estoque where peca_id = any (todos);
  if quantas <> 1 then
    raise exception 'FALHOU: quem tem Estoque devia ler 1 contagem (a da loja A) e leu %', quantas;
  end if;
  -- 29. lança venda e ajuste de saída, que as portas estreitas não deixam
  insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
    values (p2, dep_a, loja_a, 'saida', 1, 'venda'), (p2, dep_a, loja_a, 'saida', 1, 'ajuste');
  -- ...mas nunca na loja B
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p2, dep_b, loja_b, 'entrada', 1, 'ajuste');
    raise exception 'FALHOU: quem tem Estoque na loja A lançou movimento na loja B';
  exception when insufficient_privilege then null;
  end;
  -- 30. conta, corrige e apaga contagem
  insert into contagens_estoque (peca_id, deposito_id, loja_id, quantidade_contada, saldo_sistema, diferenca)
    values (p2, dep_a, loja_a, 13, 13, 0);
  update contagens_estoque set observacao = 'conferido' where peca_id = any (todos);
  get diagnostics quantas = row_count;
  if quantas <> 2 then
    raise exception 'FALHOU: quem tem Estoque devia corrigir 2 contagens e corrigiu %', quantas;
  end if;
  delete from contagens_estoque where peca_id = p2;
  get diagnostics quantas = row_count;
  if quantas <> 1 then
    raise exception 'FALHOU: quem tem Estoque devia apagar 1 contagem e apagou %', quantas;
  end if;
  -- 31. cadastra, altera e apaga peça direto na tabela (com returning)
  insert into pecas (descricao, preco_custo) values ('Peça do Estoque (#366)', 1) returning id into novo_id;
  update pecas set preco_venda = 2 where id = novo_id;
  get diagnostics quantas = row_count;
  if quantas <> 1 then
    raise exception 'FALHOU: quem tem Estoque devia alterar a peça e alterou %', quantas;
  end if;
  delete from pecas where id = novo_id;
  get diagnostics quantas = row_count;
  if quantas <> 1 then
    raise exception 'FALHOU: quem tem Estoque devia apagar a peça e apagou %', quantas;
  end if;
  -- 32. altera e apaga movimento da loja dele
  with s as (delete from estoque_movimentos where peca_id = p2 and motivo = 'venda' returning 1)
  select count(*) into quantas from s;
  if quantas <> 1 then
    raise exception 'FALHOU: quem tem Estoque devia apagar o movimento de venda e apagou %', quantas;
  end if;

  -- ===================================================================
  -- I. Operador desligado (ativo = false) com a sessão ainda válida
  -- ===================================================================
  reset role;
  update operadores set ativo = false where id = o_os;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  select count(*) into quantas from pecas_janela where id = any (todos);
  if quantas <> 0 then
    raise exception 'FALHOU: o operador desligado viu % peça(s) na janela', quantas;
  end if;
  select count(*) into quantas from estoque_saldos;
  if quantas <> 0 then
    raise exception 'FALHOU: o operador desligado viu % saldo(s)', quantas;
  end if;
  begin
    perform * from custo_das_ordens(array[os_1]);
    raise exception 'FALHOU: o operador desligado leu o custo das ordens';
  exception when insufficient_privilege then null;
  end;
  begin
    novo_id := cadastrar_peca_rapida('{"descricao":"Pelo desligado"}'::jsonb);
    raise exception 'FALHOU: o operador desligado cadastrou peça';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into estoque_movimentos (peca_id, deposito_id, loja_id, tipo, quantidade, motivo)
      values (p1, dep_a, loja_a, 'saida', 1, 'uso_em_os');
    raise exception 'FALHOU: o operador desligado baixou estoque';
  exception when insufficient_privilege then null;
  end;

  reset role;
  raise notice 'TODAS AS CHECAGENS PASSARAM';
end;
$$;

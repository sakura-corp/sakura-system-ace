-- Sakura System — AutoCenter Edition
-- TESTE do lote 6 do TR-04.1 (migrations 0075 e 0076, tarefa #367). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava e apaga
-- dado de teste.
--
-- Prova as duas metades da promessa, que são opostas e por isso precisam ser
-- medidas juntas:
--   • quem NÃO tem o módulo Ordens de Serviço (nem Relações) não lê OS nem
--     item pela tabela, e ninguém sem o módulo cria, altera ou apaga OS;
--   • e MESMO ASSIM cada tela continua: o Caixa recebe o número, o cliente e
--     os valores de cada OS (os mesmos da tabela), Funcionários as OS
--     faturadas pra comissão, Garantias as peças vendidas, Notas o seletor de
--     OS, Clientes a ficha do veículo — cada um pela sua janela, só na loja
--     dele e só com as colunas combinadas; quem só tem Contas a Receber ainda
--     lança no Caixa a entrada de uma conta de OS; e quem tem OS continua
--     criando, editando e apagando OS e itens, com o número subindo certo.
--
-- Uma trava que também impede o balconista de trabalhar não é segurança, é
-- sistema quebrado. Por isso a parte "ainda passa" pesa tanto quanto a outra.
--
-- Como rodar: `npm run test:sql -- testar-os-permissao`. Terminou imprimindo
-- "TODAS AS CHECAGENS PASSARAM", passou.

do $$
declare
  loja_a     uuid := '36700000-0000-0000-0000-00000000000a';
  loja_b     uuid := '36700000-0000-0000-0000-00000000000b';
  o_os       uuid := '36701111-0000-0000-0000-000000000001';  -- só OS
  o_caixa    uuid := '36701111-0000-0000-0000-000000000002';  -- só Caixa
  o_gar      uuid := '36701111-0000-0000-0000-000000000003';  -- só Garantias
  o_rel      uuid := '36701111-0000-0000-0000-000000000004';  -- só Relações
  o_notas    uuid := '36701111-0000-0000-0000-000000000005';  -- só Notas Fiscais
  o_func     uuid := '36701111-0000-0000-0000-000000000006';  -- só Funcionários
  o_cli      uuid := '36701111-0000-0000-0000-000000000007';  -- só Clientes
  o_receber  uuid := '36701111-0000-0000-0000-000000000008';  -- só Contas a Receber
  o_painel   uuid := '36701111-0000-0000-0000-000000000009';  -- só o Início
  o_admin    uuid := '36701111-0000-0000-0000-00000000000a';  -- admin, só da loja A
  o_admin_ab uuid := '36701111-0000-0000-0000-00000000000b';  -- admin das duas lojas
  o_inativo  uuid := '36701111-0000-0000-0000-00000000000c';  -- tinha tudo, foi desligado
  o_orfao    uuid := '36701111-0000-0000-0000-00000000000d';  -- tem tudo, mas nenhuma loja
  o_os_ab    uuid := '36701111-0000-0000-0000-00000000000e';  -- OS nas duas lojas
  o_rec_ab   uuid := '36701111-0000-0000-0000-00000000000f';  -- Contas a Receber nas duas lojas
  cliente    uuid := '36702222-0000-0000-0000-000000000001';
  cliente_b  uuid := '36702222-0000-0000-0000-000000000002';
  veiculo    uuid := '36703333-0000-0000-0000-000000000001';
  func_1     uuid := '36704444-0000-0000-0000-000000000001';  -- vendedor e técnico
  p1         uuid := '36705555-0000-0000-0000-000000000001';  -- pneu, garantia de 90 dias
  s1         uuid := '36706666-0000-0000-0000-000000000001';  -- montagem
  os_fat     uuid := '36707777-0000-0000-0000-000000000001';  -- loja A, faturada, 3 itens
  os_aberta  uuid := '36707777-0000-0000-0000-000000000002';  -- loja A, em andamento, 1 item
  os_vazia   uuid := '36707777-0000-0000-0000-000000000003';  -- loja A, sem item
  os_b       uuid := '36707777-0000-0000-0000-00000000000b';  -- loja B, faturada
  os_orc     uuid := '36707777-0000-0000-0000-000000000004';  -- loja A, orçamento aberto, 1 peça
  os_rec     uuid := '36707777-0000-0000-0000-000000000005';  -- loja A, recusado, 1 peça
  item_p1    uuid := '36708888-0000-0000-0000-000000000001';
  item_s1    uuid := '36708888-0000-0000-0000-000000000002';
  item_av    uuid := '36708888-0000-0000-0000-000000000003';
  item_orc   uuid := '36708888-0000-0000-0000-000000000004';  -- peça do orçamento
  item_rec   uuid := '36708888-0000-0000-0000-000000000005';  -- peça do recusado
  item_ab_p  uuid := '36708888-0000-0000-0000-000000000006';  -- peça da OS aberta (sem fechamento)
  item_alin  uuid := '36708888-0000-0000-0000-0000000000ff';  -- serviço da OS aberta, gravado ANTES da peça
  quantas    int;
  numero_1   int;
  numero_2   int;
  total      numeric;
  esperado   text;
  obtido     text;
  problema   text;
  nova_os    uuid;
  novo_item  uuid;
  linha      record;
  visao      text;
begin
  -- ---- preparo -------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A de Teste (#367)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B de Teste (#367)', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  insert into auth.users (id) values
    (o_os), (o_caixa), (o_gar), (o_rel), (o_notas), (o_func), (o_cli), (o_receber),
    (o_painel), (o_admin), (o_admin_ab), (o_inativo), (o_orfao), (o_os_ab), (o_rec_ab)
    on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_os,      't367_os',      'Só OS',               false, array['painel','ordens_servico'], true),
    (o_caixa,   't367_caixa',   'Só Caixa',            false, array['painel','caixa'],          true),
    (o_gar,     't367_gar',     'Só Garantias',        false, array['painel','garantias'],      true),
    (o_rel,     't367_rel',     'Só Relações',         false, array['painel','relatorios'],     true),
    (o_notas,   't367_notas',   'Só Notas',            false, array['painel','notas_fiscais'],  true),
    (o_func,    't367_func',    'Só Funcionários',     false, array['painel','funcionarios'],   true),
    (o_cli,     't367_cli',     'Só Clientes',         false, array['painel','clientes'],       true),
    (o_receber, 't367_receber', 'Só Contas a Receber', false, array['painel','contas_receber'], true),
    (o_painel,  't367_painel',  'Só o Início',         false, array['painel'],                  true),
    (o_admin,   't367_admin',   'Admin da loja A',     true,  array['painel'],                  true),
    (o_admin_ab,'t367_admin_ab','Admin das duas',      true,  array['painel'],                  true),
    (o_inativo, 't367_inativo', 'Desligado',           false,
       array['painel','ordens_servico','caixa','garantias','relatorios','notas_fiscais',
             'funcionarios','clientes','contas_receber'], false),
    (o_orfao,   't367_orfao',   'Sem loja',            false,
       array['painel','ordens_servico','caixa','garantias','relatorios','notas_fiscais',
             'funcionarios','clientes','contas_receber'], true),
    (o_os_ab,   't367_os_ab',   'OS nas duas',         false, array['painel','ordens_servico'], true),
    (o_rec_ab,  't367_rec_ab',  'Receber nas duas',    false, array['painel','contas_receber'], true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values
    (o_os, loja_a), (o_caixa, loja_a), (o_gar, loja_a), (o_rel, loja_a), (o_notas, loja_a),
    (o_func, loja_a), (o_cli, loja_a), (o_receber, loja_a), (o_painel, loja_a),
    (o_admin, loja_a), (o_admin_ab, loja_a), (o_admin_ab, loja_b), (o_inativo, loja_a),
    (o_os_ab, loja_a), (o_os_ab, loja_b), (o_rec_ab, loja_a), (o_rec_ab, loja_b)
    on conflict do nothing;

  insert into clientes (id, nome) values
    (cliente,   'Cliente de Teste (#367)'),
    (cliente_b, 'Cliente da Loja B (#367)')
    on conflict (id) do nothing;
  insert into veiculos (id, cliente_id, placa, marca, modelo) values
    (veiculo, cliente, 'TST3A67', 'Marca de Teste', 'Modelo de Teste')
    on conflict (id) do nothing;
  insert into funcionarios (id, loja_id, nome) values (func_1, loja_a, 'Técnico de Teste (#367)')
    on conflict (id) do nothing;
  insert into pecas (id, descricao, preco_custo, preco_venda, prazo_garantia_dias) values
    (p1, 'Pneu de teste (#367)', 30.00, 50.00, 90)
    on conflict (id) do nothing;
  insert into servicos (id, descricao, custo, ativo) values (s1, 'Montagem de teste (#367)', 40.00, true)
    on conflict (id) do nothing;

  -- As ordens. O número sai do gatilho (0037/0065): loja A fica com 1, 2 e 3;
  -- a B com 1. A observação (descricao_problema) é o tipo de coisa que
  -- nenhuma janela pode levar.
  insert into ordens_servico (id, loja_id, cliente_id, veiculo_id, vendedor_id, km_entrada,
                              descricao_problema, status, data_fechamento) values
    (os_fat,    loja_a, cliente,   veiculo, func_1, 12345, 'Observação secreta (#367)', 'faturada', now()),
    (os_aberta, loja_a, cliente,   veiculo, null,   null,  'Outra observação',          'em_andamento', null),
    (os_vazia,  loja_a, cliente,   null,    null,   null,  null,                        'em_andamento', null),
    (os_b,      loja_b, cliente_b, null,    null,   null,  null,                        'faturada', now())
    on conflict (id) do nothing;
  -- Orçamento aberto e recusado (#379): nenhuma tela fora da de OS mostra
  -- (todas filtram com `contaNosNumeros`), então nenhuma janela pode levar.
  -- Os dois com data de fechamento de propósito: assim, na de Garantias, quem
  -- segura é o filtro de status, e não o de data. Não ganham número de OS
  -- (0065), então a numeração da loja A continua 1, 2 e 3.
  insert into ordens_servico (id, loja_id, cliente_id, veiculo_id, status, data_fechamento) values
    (os_orc, loja_a, cliente, veiculo, 'orcamento', now()),
    (os_rec, loja_a, cliente, veiculo, 'recusado',  now())
    on conflict (id) do nothing;
  -- os_fat: pneu 2 × 50,00 − 5,00 = 95,00; montagem 1 × 80,00 = 80,00;
  --         peça avulsa 1,5 × 20,00 (custo 15,00) = 30,00. Total: 205,00.
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, servico_id, tecnico_id,
                                    descricao, quantidade, preco_unitario, desconto, custo_unitario) values
    (item_p1, os_fat, 'peca',    p1,   null, null,   'Pneu',             2,   50.00, 5.00, null),
    (item_s1, os_fat, 'servico', null, s1,   func_1, 'Montagem',         1,   80.00, 0,    null),
    (item_av, os_fat, 'peca',    null, null, null,   'Avulsa com custo', 1.5, 20.00, 0,    15.00);
  -- O alinhamento entra antes da peça da mesma OS (lá embaixo), mas com id
  -- MAIOR: a janela tem de devolver os itens pelo id, não pela ordem de gravação.
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, servico_id, descricao, quantidade, preco_unitario) values
    (item_alin, os_aberta, 'servico', s1, 'Alinhamento', 1, 40.00);
  insert into ordens_servico_itens (ordem_servico_id, tipo, servico_id, descricao, quantidade, preco_unitario) values
    (os_b,      'peca',    null, 'Peça da loja B', 1, 50.00);
  -- Peças com prazo de garantia que NÃO podem virar garantia: a do orçamento,
  -- a do recusado e a da OS ainda aberta (sem data de fechamento).
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario) values
    (item_orc,  os_orc,    'peca', p1, 'Pneu orçado',   1, 50.00),
    (item_rec,  os_rec,    'peca', p1, 'Pneu recusado', 1, 50.00),
    (item_ab_p, os_aberta, 'peca', p1, 'Pneu da aberta', 1, 50.00);
  insert into caixa_movimentos (loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao) values
    (loja_a, os_fat, 'entrada', 'pix', 205.00, 'Faturamento de teste (#367)');

  -- ===================================================================
  -- 0. Ninguém logado (anon): nenhuma janela, e a função não é dele
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  foreach visao in array array['ordens_servico_caixa','ordens_servico_comissoes',
                               'ordens_servico_garantias','ordens_servico_notas',
                               'ordens_servico_clientes'] loop
    begin
      execute format('select count(*) from %I', visao) into quantas;
      raise exception 'FALHOU (0): o anônimo leu a % (% linha(s))', visao, quantas;
    exception when insufficient_privilege then null;
    end;
  end loop;
  select count(*) into quantas from ordens_servico;
  if quantas <> 0 then raise exception 'FALHOU (0b): o anônimo leu % OS', quantas; end if;
  reset role;
  -- A tranca que se quer provar é o `revoke`, não o comportamento de dentro
  -- (§6 item 76): conferido direto no catálogo.
  if has_function_privilege('anon', 'ordem_servico_da_loja(uuid, uuid)', 'execute') then
    raise exception 'FALHOU (0c): o anônimo pode chamar ordem_servico_da_loja (faltou o revoke)';
  end if;
  if has_function_privilege('public', 'ordem_servico_da_loja(uuid, uuid)', 'execute') then
    raise exception 'FALHOU (0d): ordem_servico_da_loja está aberta a PUBLIC (faltou o revoke)';
  end if;
  if has_function_privilege('anon', 'ordem_servico_acessivel(uuid)', 'execute')
     or has_function_privilege('public', 'ordem_servico_acessivel(uuid)', 'execute') then
    raise exception 'FALHOU (0e): ordem_servico_acessivel está aberta ao anônimo (faltou o revoke)';
  end if;

  -- ===================================================================
  -- A. As janelas no catálogo: só leitura, dono, barreira e as colunas
  --    EXATAS do combinado (nenhuma a mais, nenhuma a menos, nessa ordem)
  -- ===================================================================
  for linha in
    select * from (values
      ('ordens_servico_caixa',     'id,loja_id,numero,tipo,status,cliente_nome,itens'),
      ('ordens_servico_comissoes', 'id,loja_id,numero,tipo,status,data_abertura,data_fechamento,vendedor_id,cliente_nome,itens'),
      ('ordens_servico_garantias', 'id,quantidade,peca_id,peca_descricao,prazo_garantia_dias,ordem_servico_id,ordem_status,ordem_data_fechamento,loja_id,cliente_nome,veiculo_id,veiculo_placa'),
      ('ordens_servico_notas',     'id,loja_id,numero,tipo,status,data_abertura,cliente_nome'),
      ('ordens_servico_clientes',  'id,loja_id,numero,tipo,status,data_abertura,data_fechamento,cliente_id,cliente_nome,veiculo_id,km_entrada,veiculo_placa,veiculo_marca,veiculo_modelo,itens')
    ) v(visao, colunas)
  loop
    select string_agg(column_name, ',' order by ordinal_position) into obtido
      from information_schema.columns
     where table_schema = 'public' and table_name = linha.visao;
    if obtido is distinct from linha.colunas then
      raise exception 'FALHOU (A1): a % tem as colunas [%], o combinado é [%]', linha.visao, obtido, linha.colunas;
    end if;
    -- as opções da view: dono (atravessa a RLS de propósito) e barreira
    select coalesce(array_to_string(c.reloptions, ','), '') into obtido
      from pg_class c where c.relname = linha.visao and c.relkind = 'v';
    if obtido not like '%security_invoker=false%' or obtido not like '%security_barrier=true%' then
      raise exception 'FALHOU (A2): a % está com as opções [%]', linha.visao, obtido;
    end if;
    -- só SELECT pra quem está logado; nada pro anônimo
    if has_table_privilege('authenticated', 'public.' || linha.visao, 'INSERT')
       or has_table_privilege('authenticated', 'public.' || linha.visao, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || linha.visao, 'DELETE') then
      raise exception 'FALHOU (A3): dá pra escrever pela % (faltou o revoke)', linha.visao;
    end if;
    if has_table_privilege('anon', 'public.' || linha.visao, 'SELECT') then
      raise exception 'FALHOU (A4): o anônimo tem SELECT na % (faltou o revoke)', linha.visao;
    end if;
    if not has_table_privilege('authenticated', 'public.' || linha.visao, 'SELECT') then
      raise exception 'FALHOU (A5): faltou o grant select na %', linha.visao;
    end if;
  end loop;

  -- ===================================================================
  -- B. Sem OS e sem Relações: as duas tabelas somem, e nada se grava
  -- ===================================================================
  set local role authenticated;
  foreach nova_os in array array[o_caixa, o_gar, o_notas, o_func, o_cli, o_receber, o_painel,
                                 o_inativo, o_orfao, o_rec_ab] loop
    perform set_config('request.jwt.claim.sub', nova_os::text, true);

    select count(*) into quantas from ordens_servico;
    if quantas <> 0 then
      raise exception 'FALHOU (B1): % sem OS leu % OS direto da tabela', nova_os, quantas;
    end if;
    select count(*) into quantas from ordens_servico_itens;
    if quantas <> 0 then
      raise exception 'FALHOU (B2): % sem OS leu % item(ns) direto da tabela', nova_os, quantas;
    end if;
    begin
      insert into ordens_servico (loja_id, cliente_id) values (loja_a, cliente);
      raise exception 'FALHOU (B3): % sem OS criou OS', nova_os;
    exception
      when insufficient_privilege then
        if sqlerrm not like '%row-level security%' then raise; end if;
      -- Se a regra de inserção deixasse passar, o gatilho do número (que roda
      -- com a RLS de quem grava e não enxerga as OS) repetiria o número 1.
      when unique_violation then
        raise exception 'FALHOU (B3): % sem OS passou pela regra de inserção de OS (%)', nova_os, sqlerrm;
    end;
    begin
      insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario)
        values (os_aberta, 'servico', 'Item de fora', 1, 1.00);
      raise exception 'FALHOU (B4): % sem OS acrescentou item', nova_os;
    exception when insufficient_privilege then
      if sqlerrm not like '%row-level security%' then raise; end if;
    end;
  end loop;

  -- Alterar e apagar SEM filtro e sem ler coluna (§6 item 74): o comando tem
  -- de mexer exatamente nas linhas que a regra de escrita permite — zero. O
  -- Relações entra aqui de propósito: ele LÊ as duas tabelas, então quem
  -- barra é a regra de escrita, não a de leitura.
  foreach nova_os in array array[o_rel, o_caixa, o_gar, o_notas, o_func, o_cli, o_receber, o_painel] loop
    perform set_config('request.jwt.claim.sub', nova_os::text, true);
    -- Um erro de RLS aqui também é furo: quer dizer que a parte `using` da
    -- regra de alteração deixou a linha passar e só o `with check` segurou.
    begin
      update ordens_servico set km_entrada = 1;
      get diagnostics quantas = row_count;
    exception when insufficient_privilege then
      raise exception 'FALHOU (B5): a regra de alteração de OS deixou % chegar na linha (%)', nova_os, sqlerrm;
    end;
    if quantas <> 0 then raise exception 'FALHOU (B5): % sem OS alterou % OS', nova_os, quantas; end if;
    begin
      update ordens_servico_itens set preco_unitario = 0.01;
      get diagnostics quantas = row_count;
    exception when insufficient_privilege then
      raise exception 'FALHOU (B6): a regra de alteração de item deixou % chegar na linha (%)', nova_os, sqlerrm;
    end;
    if quantas <> 0 then raise exception 'FALHOU (B6): % sem OS alterou % item(ns)', nova_os, quantas; end if;
    delete from ordens_servico_itens;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (B7): % sem OS apagou % item(ns)', nova_os, quantas; end if;
    delete from ordens_servico;
    get diagnostics quantas = row_count;
    if quantas <> 0 then raise exception 'FALHOU (B8): % sem OS apagou % OS', nova_os, quantas; end if;
  end loop;
  -- ...e Relações também não cria
  perform set_config('request.jwt.claim.sub', o_rel::text, true);
  begin
    insert into ordens_servico (loja_id, cliente_id) values (loja_a, cliente);
    raise exception 'FALHOU (B9): Relações criou OS';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  begin
    insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario)
      values (os_aberta, 'servico', 'Item de Relações', 1, 1.00);
    raise exception 'FALHOU (B10): Relações acrescentou item';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;

  -- A janela não é porta de escrita: nem quem tem o módulo dela escreve.
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  begin
    with s as (update ordens_servico_caixa set status = 'faturada' returning 1)
    select count(*) into quantas from s;
    raise exception 'FALHOU (B11): deu pra mudar OS por dentro da janela do Caixa (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;
  begin
    with s as (delete from ordens_servico_caixa returning 1)
    select count(*) into quantas from s;
    raise exception 'FALHOU (B12): deu pra apagar OS por dentro da janela do Caixa (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- C. Cada janela, só pra quem tem o módulo dela, só da loja dele
  -- ===================================================================
  -- Loja A tem 5 ordens na tabela: 3 OS (1 faturada) mais 1 orçamento e 1
  -- recusado, que nenhuma janela leva; 7 itens, dos quais só as 2 peças da
  -- faturada são garantia. A B tem 1 OS faturada com 1 peça. Colunas: caixa,
  -- comissões, garantias, notas, clientes, e as duas tabelas (OS, itens).
  for linha in
    select * from (values
      (o_caixa,    3, 0, 0, 0, 0, 0, 0),
      (o_rel,      3, 0, 0, 0, 0, 5, 7),
      (o_func,     0, 1, 0, 0, 0, 0, 0),
      (o_gar,      0, 0, 2, 0, 0, 0, 0),
      (o_notas,    0, 0, 0, 3, 0, 0, 0),
      (o_cli,      0, 0, 0, 0, 3, 0, 0),
      (o_os,       0, 0, 0, 0, 3, 5, 7),
      (o_receber,  0, 0, 0, 0, 0, 0, 0),
      (o_painel,   0, 0, 0, 0, 0, 0, 0),
      (o_admin,    3, 1, 2, 3, 3, 5, 7),
      (o_admin_ab, 4, 2, 3, 4, 4, 6, 8),
      (o_os_ab,    0, 0, 0, 0, 4, 6, 8),
      (o_inativo,  0, 0, 0, 0, 0, 0, 0),
      (o_orfao,    0, 0, 0, 0, 0, 0, 0)
    ) v(quem, caixa, comissoes, garantias, notas, clientes, tabela_os, tabela_itens)
  loop
    perform set_config('request.jwt.claim.sub', linha.quem::text, true);
    select count(*) into quantas from ordens_servico_caixa;
    if quantas <> linha.caixa then
      raise exception 'FALHOU (C1): % leu % OS na janela do Caixa, esperado %', linha.quem, quantas, linha.caixa;
    end if;
    select count(*) into quantas from ordens_servico_comissoes;
    if quantas <> linha.comissoes then
      raise exception 'FALHOU (C2): % leu % OS na janela das comissões, esperado %', linha.quem, quantas, linha.comissoes;
    end if;
    select count(*) into quantas from ordens_servico_garantias;
    if quantas <> linha.garantias then
      raise exception 'FALHOU (C3): % leu % peça(s) na janela das garantias, esperado %', linha.quem, quantas, linha.garantias;
    end if;
    select count(*) into quantas from ordens_servico_notas;
    if quantas <> linha.notas then
      raise exception 'FALHOU (C4): % leu % OS na janela das notas, esperado %', linha.quem, quantas, linha.notas;
    end if;
    select count(*) into quantas from ordens_servico_clientes;
    if quantas <> linha.clientes then
      raise exception 'FALHOU (C5): % leu % OS na janela de clientes, esperado %', linha.quem, quantas, linha.clientes;
    end if;
    select count(*) into quantas from ordens_servico;
    if quantas <> linha.tabela_os then
      raise exception 'FALHOU (C6): % leu % OS na tabela, esperado %', linha.quem, quantas, linha.tabela_os;
    end if;
    select count(*) into quantas from ordens_servico_itens;
    if quantas <> linha.tabela_itens then
      raise exception 'FALHOU (C7): % leu % item(ns) na tabela, esperado %', linha.quem, quantas, linha.tabela_itens;
    end if;
  end loop;

  -- ===================================================================
  -- D. O que cada janela entrega é o certo
  -- ===================================================================
  -- 1. Caixa: as mesmas OS e os mesmos itens/valores da tabela. O esperado
  --    sai da tabela, lido sem RLS; o obtido, da janela, como o Caixa.
  reset role;
  select string_agg(
           format('%s|%s|%s|%s|%s|%s', o.id, o.numero, o.tipo, o.status,
                  (select c.nome from clientes c where c.id = o.cliente_id),
                  coalesce((select string_agg(format('%s;%s;%s', i.quantidade, i.preco_unitario, i.desconto), ','
                                              order by i.quantidade, i.preco_unitario, i.desconto)
                              from ordens_servico_itens i where i.ordem_servico_id = o.id), '')),
           E'\n' order by o.id)
    into esperado
    from ordens_servico o
   where o.loja_id = loja_a
     and o.status not in ('orcamento', 'recusado');  -- o mesmo `contaNosNumeros` do programa
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  select string_agg(
           format('%s|%s|%s|%s|%s|%s', v.id, v.numero, v.tipo, v.status, v.cliente_nome,
                  coalesce((select string_agg(format('%s;%s;%s', (e->>'quantidade')::numeric,
                                                     (e->>'preco_unitario')::numeric, (e->>'desconto')::numeric), ','
                                              order by (e->>'quantidade')::numeric, (e->>'preco_unitario')::numeric,
                                                       (e->>'desconto')::numeric)
                              from jsonb_array_elements(v.itens) e), '')),
           E'\n' order by v.id)
    into obtido
    from ordens_servico_caixa v;
  if obtido is distinct from esperado then
    raise exception 'FALHOU (D1): a janela do Caixa difere da tabela. Esperado: [%] Obtido: [%]', esperado, obtido;
  end if;
  -- o total da OS, feito à mão (2 × 50 − 5 + 80 + 1,5 × 20 = 205,00), pela
  -- conta do programa (quantidade × preço − desconto)
  select sum((e->>'quantidade')::numeric * (e->>'preco_unitario')::numeric - (e->>'desconto')::numeric)
    into total
    from ordens_servico_caixa v, jsonb_array_elements(v.itens) e
   where v.id = os_fat;
  if total is distinct from 205.00 then
    raise exception 'FALHOU (D2): o total da OS pela janela do Caixa deu %, esperado 205,00', total;
  end if;
  -- o número chega como número (o programa soma), e a OS sem item vem com
  -- lista vazia, não nula
  select jsonb_typeof(itens -> 0 -> 'quantidade') into obtido from ordens_servico_caixa where id = os_fat;
  if obtido is distinct from 'number' then
    raise exception 'FALHOU (D3): a quantidade do item chega como %, não como número', obtido;
  end if;
  select itens::text into obtido from ordens_servico_caixa where id = os_vazia;
  if obtido is distinct from '[]' then
    raise exception 'FALHOU (D4): a OS sem item chega com itens = %, esperado []', obtido;
  end if;

  -- 1b. Orçamento e recusado não saem por janela nenhuma (as telas filtram
  --     com `contaNosNumeros`; a janela não entrega o que a tela não mostra).
  --     E a peça de OS ainda sem data de fechamento não é garantia. Lido por
  --     quem tem tudo nas duas lojas, pra só o filtro da janela segurar.
  perform set_config('request.jwt.claim.sub', o_admin_ab::text, true);
  foreach visao in array array['ordens_servico_caixa','ordens_servico_comissoes',
                               'ordens_servico_notas','ordens_servico_clientes'] loop
    execute format('select count(*) from %I where id in ($1, $2)', visao)
      into quantas using os_orc, os_rec;
    if quantas <> 0 then
      raise exception 'FALHOU (D1b): a % entregou % orçamento(s)/recusado(s)', visao, quantas;
    end if;
  end loop;
  select count(*) into quantas from ordens_servico_garantias
   where id in (item_orc, item_rec) or ordem_servico_id in (os_orc, os_rec);
  if quantas <> 0 then
    raise exception 'FALHOU (D1c): a janela das garantias entregou % peça(s) de orçamento/recusado', quantas;
  end if;
  select count(*) into quantas from ordens_servico_garantias
   where id = item_ab_p or ordem_data_fechamento is null;
  if quantas <> 0 then
    raise exception 'FALHOU (D1d): a janela das garantias entregou % peça(s) de OS sem data de fechamento', quantas;
  end if;

  -- 2. As chaves de cada item: exatamente as combinadas (custo, descrição e
  --    técnico só onde a tela precisa)
  perform set_config('request.jwt.claim.sub', o_admin_ab::text, true);
  select string_agg(k, ',' order by k) into obtido
    from (select distinct jsonb_object_keys(e) k
            from ordens_servico_caixa v, jsonb_array_elements(v.itens) e) t;
  if obtido is distinct from 'desconto,preco_unitario,quantidade' then
    raise exception 'FALHOU (D5): os itens da janela do Caixa têm as chaves [%]', obtido;
  end if;
  select string_agg(k, ',' order by k) into obtido
    from (select distinct jsonb_object_keys(e) k
            from ordens_servico_comissoes v, jsonb_array_elements(v.itens) e) t;
  if obtido is distinct from 'custo_unitario,desconto,id,peca_id,preco_unitario,quantidade,servico_id,tecnico_id,tipo' then
    raise exception 'FALHOU (D6): os itens da janela das comissões têm as chaves [%]', obtido;
  end if;
  select string_agg(k, ',' order by k) into obtido
    from (select distinct jsonb_object_keys(e) k
            from ordens_servico_clientes v, jsonb_array_elements(v.itens) e) t;
  if obtido is distinct from 'desconto,descricao,id,peca_id,prazo_garantia_dias,preco_unitario,quantidade,tipo' then
    raise exception 'FALHOU (D7): os itens da janela de clientes têm as chaves [%]', obtido;
  end if;

  -- 3. Comissões: só a faturada, com vendedor, técnico e custo da avulsa
  perform set_config('request.jwt.claim.sub', o_func::text, true);
  select count(*) into quantas from ordens_servico_comissoes where id <> os_fat or status <> 'faturada';
  if quantas <> 0 then
    raise exception 'FALHOU (D8): a janela das comissões trouxe % OS que não é a faturada', quantas;
  end if;
  select count(*) into quantas
    from ordens_servico_comissoes v
   where v.id = os_fat and v.vendedor_id = func_1 and v.cliente_nome = 'Cliente de Teste (#367)'
     and v.data_fechamento is not null and jsonb_array_length(v.itens) = 3
     and exists (select 1 from jsonb_array_elements(v.itens) e
                  where (e->>'id')::uuid = item_s1 and (e->>'tecnico_id')::uuid = func_1
                    and (e->>'servico_id')::uuid = s1)
     and exists (select 1 from jsonb_array_elements(v.itens) e
                  where (e->>'id')::uuid = item_av and (e->>'custo_unitario')::numeric = 15.00);
  if quantas <> 1 then
    raise exception 'FALHOU (D9): a OS faturada não veio inteira na janela das comissões';
  end if;

  -- 4. Garantias: uma linha por peça, com o prazo do cadastro; a avulsa sem
  --    prazo; o serviço não aparece
  perform set_config('request.jwt.claim.sub', o_gar::text, true);
  select count(*) into quantas
    from ordens_servico_garantias g
   where g.id = item_p1 and g.quantidade = 2 and g.peca_id = p1
     and g.peca_descricao = 'Pneu de teste (#367)' and g.prazo_garantia_dias = 90
     and g.ordem_servico_id = os_fat and g.ordem_status = 'faturada'
     and g.ordem_data_fechamento is not null and g.loja_id = loja_a
     and g.cliente_nome = 'Cliente de Teste (#367)'
     and g.veiculo_id = veiculo and g.veiculo_placa = 'TST3A67';
  if quantas <> 1 then
    raise exception 'FALHOU (D10): a peça do cadastro não veio certa na janela das garantias';
  end if;
  select count(*) into quantas
    from ordens_servico_garantias g
   where g.id = item_av and g.peca_id is null and g.peca_descricao is null and g.prazo_garantia_dias is null;
  if quantas <> 1 then
    raise exception 'FALHOU (D11): a peça avulsa não veio (ou veio com prazo) na janela das garantias';
  end if;
  select count(*) into quantas from ordens_servico_garantias where id = item_s1;
  if quantas <> 0 then
    raise exception 'FALHOU (D12): o serviço apareceu na janela das garantias';
  end if;

  -- 5. Notas: o nome do cliente de cada OS
  perform set_config('request.jwt.claim.sub', o_notas::text, true);
  select cliente_nome into obtido from ordens_servico_notas where id = os_fat;
  if obtido is distinct from 'Cliente de Teste (#367)' then
    raise exception 'FALHOU (D13): a janela das notas trouxe o cliente %', obtido;
  end if;

  -- 6. Clientes: a ficha do veículo como a tela mostra
  perform set_config('request.jwt.claim.sub', o_cli::text, true);
  select count(*) into quantas
    from ordens_servico_clientes v
   where v.id = os_fat and v.cliente_id = cliente and v.cliente_nome = 'Cliente de Teste (#367)'
     and v.veiculo_id = veiculo and v.km_entrada = 12345 and v.veiculo_placa = 'TST3A67'
     and v.veiculo_marca = 'Marca de Teste' and v.veiculo_modelo = 'Modelo de Teste'
     and jsonb_array_length(v.itens) = 3
     and exists (select 1 from jsonb_array_elements(v.itens) e
                  where (e->>'id')::uuid = item_p1 and e->>'descricao' = 'Pneu'
                    and (e->>'prazo_garantia_dias')::int = 90)
     and exists (select 1 from jsonb_array_elements(v.itens) e
                  where (e->>'id')::uuid = item_s1 and e->'prazo_garantia_dias' = 'null'::jsonb);
  if quantas <> 1 then
    raise exception 'FALHOU (D14): a OS não veio certa na janela de clientes';
  end if;
  select itens::text into obtido from ordens_servico_clientes where id = os_vazia;
  if obtido is distinct from '[]' then
    raise exception 'FALHOU (D15): a OS sem item chega na janela de clientes com %', obtido;
  end if;

  -- ===================================================================
  -- E. Contas a Receber ainda lança no Caixa a entrada de uma conta de OS
  --    (o ramo da 0062, agora pela função da 0075), sem enxergar a OS
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_receber::text, true);
  -- igual ao app: id gerado antes, sem returning
  begin
    insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao)
      values (gen_random_uuid(), loja_a, os_fat, 'entrada', 'pix', 10.00, 'Recebido de OS (#367)');
  exception when insufficient_privilege then
    raise exception 'FALHOU (E0): quem só tem Contas a Receber não conseguiu lançar a entrada de uma conta de OS (%)', sqlerrm;
  end;
  -- ...mas não amarra numa OS que não existe
  begin
    insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao)
      values (gen_random_uuid(), loja_a, gen_random_uuid(), 'entrada', 'pix', 10.00, 'OS que não existe');
    raise exception 'FALHOU (E1): Contas a Receber amarrou lançamento numa OS que não existe';
  exception
    when insufficient_privilege then
      if sqlerrm not like '%row-level security%' then raise; end if;
    when foreign_key_violation then null;  -- a chave estrangeira também barra; tanto faz quem
  end;
  -- quem trabalha nas duas lojas não amarra lançamento da A numa OS da B
  -- (§6 item 73: só ele passa pela primeira trava e chega na segunda)
  perform set_config('request.jwt.claim.sub', o_rec_ab::text, true);
  begin
    insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao)
      values (gen_random_uuid(), loja_a, os_b, 'entrada', 'pix', 10.00, 'Loja A com OS da B');
    raise exception 'FALHOU (E2): Contas a Receber amarrou lançamento da loja A numa OS da loja B';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao)
    values (gen_random_uuid(), loja_b, os_b, 'entrada', 'pix', 10.00, 'Loja B com OS da B');
  -- o mesmo pra quem tem OS: faturar "a receber depois" e "recebido agora"
  perform set_config('request.jwt.claim.sub', o_os_ab::text, true);
  begin
    insert into contas_receber (loja_id, cliente_id, descricao, valor, vencimento, ordem_servico_id)
      values (loja_a, cliente, 'Conta da A com OS da B', 10.00, current_date, os_b);
    raise exception 'FALHOU (E3): OS criou conta a receber da loja A ligada a uma OS da loja B';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  begin
    insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao)
      values (gen_random_uuid(), loja_a, os_b, 'entrada', 'pix', 10.00, 'Faturamento da A com OS da B');
    raise exception 'FALHOU (E4): OS lançou no Caixa da loja A o faturamento de uma OS da loja B';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  insert into contas_receber (id, loja_id, cliente_id, descricao, valor, vencimento, ordem_servico_id)
    values (gen_random_uuid(), loja_a, cliente, 'Conta de OS (#367)', 10.00, current_date, os_fat);
  insert into caixa_movimentos (id, loja_id, ordem_servico_id, tipo, forma_pagamento, valor, descricao)
    values (gen_random_uuid(), loja_a, os_fat, 'entrada', 'pix', 10.00, 'Faturamento de OS (#367)');
  -- a função sozinha: só responde sim pra OS da loja certa, e só pra quem
  -- acessa a loja (não serve pra sondar OS de outra loja)
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);
  if not ordem_servico_da_loja(os_fat, loja_a) then
    raise exception 'FALHOU (E5): ordem_servico_da_loja negou a OS da própria loja';
  end if;
  if ordem_servico_da_loja(os_fat, loja_b) or ordem_servico_da_loja(os_b, loja_b) then
    raise exception 'FALHOU (E6): ordem_servico_da_loja respondeu sim sobre a loja B pra quem não a acessa';
  end if;
  -- a da 0076 (a loja do item) também: só sim pra OS das lojas dele
  if not ordem_servico_acessivel(os_fat) then
    raise exception 'FALHOU (E7): ordem_servico_acessivel negou a OS da própria loja';
  end if;
  if ordem_servico_acessivel(os_b) or ordem_servico_acessivel(gen_random_uuid()) then
    raise exception 'FALHOU (E8): ordem_servico_acessivel respondeu sim sobre OS de outra loja (ou que não existe)';
  end if;

  -- ===================================================================
  -- F. Quem tem OS continua trabalhando, e o número sobe certo
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  -- criar: o número sai do gatilho, com a RLS de quem grava (loja A tinha 1, 2 e 3)
  insert into ordens_servico (loja_id, cliente_id) values (loja_a, cliente)
    returning id, numero into nova_os, numero_1;
  if numero_1 is distinct from 4 then
    raise exception 'FALHOU (F1): a OS nova da loja A ganhou o número %, esperado 4', numero_1;
  end if;
  -- orçamento não tem número; aprovado, ganha o próximo (0065)
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'orcamento')
    returning id, numero into novo_item, numero_2;
  if numero_2 is not null then
    raise exception 'FALHOU (F2): o orçamento nasceu com número %', numero_2;
  end if;
  update ordens_servico set status = 'em_andamento' where id = novo_item returning numero into numero_2;
  if numero_2 is distinct from 5 then
    raise exception 'FALHOU (F3): o orçamento aprovado ganhou o número %, esperado 5', numero_2;
  end if;
  delete from ordens_servico where id = novo_item;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (F4): quem tem OS não apagou o orçamento aprovado'; end if;
  -- itens: acrescentar, editar, apagar
  insert into ordens_servico_itens (ordem_servico_id, tipo, servico_id, descricao, quantidade, preco_unitario)
    values (nova_os, 'servico', s1, 'Montagem', 1, 80.00)
    returning id into novo_item;
  update ordens_servico_itens set quantidade = 2 where id = novo_item;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (F5): quem tem OS não editou o item'; end if;
  update ordens_servico set km_entrada = 500, status = 'concluida' where id = nova_os;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (F6): quem tem OS não editou a OS'; end if;
  delete from ordens_servico_itens where id = novo_item;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (F7): quem tem OS não apagou o item'; end if;
  delete from ordens_servico where id = nova_os;
  get diagnostics quantas = row_count;
  if quantas <> 1 then raise exception 'FALHOU (F8): quem tem OS não apagou a OS'; end if;
  -- ...mas só na loja dele
  begin
    insert into ordens_servico (loja_id, cliente_id) values (loja_b, cliente_b);
    raise exception 'FALHOU (F9): quem tem OS na loja A criou OS na loja B';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  begin
    insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario)
      values (os_b, 'servico', 'Item na OS da B', 1, 1.00);
    raise exception 'FALHOU (F10): quem tem OS na loja A acrescentou item numa OS da loja B';
  exception when insufficient_privilege then
    if sqlerrm not like '%row-level security%' then raise; end if;
  end;
  -- quem tem OS nas duas lojas: o número de cada loja é dela (a B tinha 1)
  perform set_config('request.jwt.claim.sub', o_os_ab::text, true);
  insert into ordens_servico (loja_id, cliente_id) values (loja_b, cliente_b)
    returning numero into numero_1;
  if numero_1 is distinct from 2 then
    raise exception 'FALHOU (F11): a OS nova da loja B ganhou o número %, esperado 2', numero_1;
  end if;

  reset role;
  raise notice 'TODAS AS CHECAGENS PASSARAM';
end;
$$;

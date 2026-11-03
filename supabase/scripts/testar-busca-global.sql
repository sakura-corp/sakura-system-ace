-- Sakura System — AutoCenter Edition
-- TESTE da busca geral do Ctrl+K (migration 0077, tarefa #372). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava dado de
-- teste.
--
-- Prova as duas metades da promessa, que são opostas e por isso precisam ser
-- medidas juntas:
--   • A. a busca NUNCA mostra o que a pessoa não veria pela tela: sem Estoque
--     não vem peça, sem Fornecedores não vem fornecedor, sem OS não vem OS,
--     sem Clientes e sem OS não vem cliente nem veículo, OS de outra loja não
--     vem, quem não logou não chama, e o detalhe nunca leva telefone, CPF,
--     endereço ou custo;
--   • B. e MESMO ASSIM ela acha: a placa digitada de qualquer jeito, o nome
--     sem acento, o código de barras, o código da peça, o número da OS e o
--     CNPJ do fornecedor, na ordem certa e no limite certo.
--
-- Uma busca que esconde tudo também "passa" na parte A. Por isso a B pesa
-- tanto quanto ela.
--
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

do $$
declare
  loja_a     uuid := 'b05c0000-0000-0000-0000-00000000000a';
  loja_b     uuid := 'b05c0000-0000-0000-0000-00000000000b';
  o_tudo     uuid := 'b05c1111-0000-0000-0000-000000000001';  -- os quatro módulos, loja A
  o_os       uuid := 'b05c1111-0000-0000-0000-000000000002';  -- só OS
  o_cli      uuid := 'b05c1111-0000-0000-0000-000000000003';  -- só Clientes
  o_est      uuid := 'b05c1111-0000-0000-0000-000000000004';  -- só Estoque
  o_forn     uuid := 'b05c1111-0000-0000-0000-000000000005';  -- só Fornecedores
  o_caixa    uuid := 'b05c1111-0000-0000-0000-000000000006';  -- só Caixa
  o_orfao    uuid := 'b05c1111-0000-0000-0000-000000000007';  -- tudo, mas sem loja
  o_inativo  uuid := 'b05c1111-0000-0000-0000-000000000008';  -- tudo, mas desativado
  c_joao     uuid := 'b05c2222-0000-0000-0000-000000000001';
  c_ana      uuid := 'b05c2222-0000-0000-0000-000000000002';
  c_joaquim  uuid := 'b05c2222-0000-0000-0000-000000000003';
  v_joao     uuid := 'b05c3333-0000-0000-0000-000000000001';
  v_joao2    uuid := 'b05c3333-0000-0000-0000-000000000002';
  os_a       uuid := 'b05c4444-0000-0000-0000-00000000000a';
  os_b       uuid := 'b05c4444-0000-0000-0000-00000000000b';
  p_pneu     uuid := 'b05c5555-0000-0000-0000-000000000001';
  f_omega    uuid := 'b05c6666-0000-0000-0000-000000000001';
  consumidor uuid := '00000000-0000-0000-0000-00000000c000';
  quem       uuid;
  termo      text;
  quantas    int;
  linha      record;
begin
  -- ---- preparo -------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A da Busca', 'Araraquara', 'SP'),
    (loja_b, 'Loja B da Busca', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  insert into auth.users (id) values
    (o_tudo), (o_os), (o_cli), (o_est), (o_forn), (o_caixa), (o_orfao), (o_inativo)
    on conflict do nothing;

  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_tudo,    'teste_busca_tudo',    'Tem tudo',          false,
       array['painel','clientes','ordens_servico','estoque','fornecedores'], true),
    (o_os,      'teste_busca_os',      'Só OS',             false, array['painel','ordens_servico'], true),
    (o_cli,     'teste_busca_cli',     'Só Clientes',       false, array['painel','clientes'],       true),
    (o_est,     'teste_busca_est',     'Só Estoque',        false, array['painel','estoque'],        true),
    (o_forn,    'teste_busca_forn',    'Só Fornecedores',   false, array['painel','fornecedores'],   true),
    (o_caixa,   'teste_busca_caixa',   'Só Caixa',          false, array['painel','caixa'],          true),
    (o_orfao,   'teste_busca_orfao',   'Tudo, sem loja',    false,
       array['painel','clientes','ordens_servico','estoque','fornecedores'], true),
    (o_inativo, 'teste_busca_inativo', 'Tudo, desativado',  false,
       array['painel','clientes','ordens_servico','estoque','fornecedores'], false)
    on conflict (id) do nothing;

  -- Todos na loja A (menos o órfão). Ninguém na B.
  insert into operador_lojas (operador_id, loja_id) values
    (o_tudo, loja_a), (o_os, loja_a), (o_cli, loja_a), (o_est, loja_a),
    (o_forn, loja_a), (o_caixa, loja_a), (o_inativo, loja_a)
    on conflict do nothing;

  insert into clientes (id, nome, tipo_pessoa, cpf_cnpj, telefone, rua, numero, bairro, cidade, uf, cep) values
    (c_joao,    'João Peçanha', 'fisica', '11122233344', '16999990001', 'Rua Secreta', '10', 'Centro', 'Araraquara', 'SP', '14800000'),
    (c_ana,     'Ana Joaquina', 'fisica', '55566677788', '16999990002', 'Rua B',       '20', 'Centro', 'Araraquara', 'SP', '14800000'),
    (c_joaquim, 'Joaquim Alves','fisica', '99988877766', '16999990003', 'Rua C',       '30', 'Centro', 'Araraquara', 'SP', '14800000')
    on conflict (id) do nothing;

  -- A placa gravada do jeito que alguém digitou: minúscula e com hífen.
  insert into veiculos (id, cliente_id, placa, marca, modelo, ano, cor, km_atual) values
    (v_joao,  c_joao, 'abc-1d23', 'Fiat', 'Uno', 2010, 'Prata', 120000),
    (v_joao2, c_joao, 'XYZ9K88',  'VW',   'Gol', 2015, 'Preto',  80000)
    on conflict (id) do nothing;

  insert into ordens_servico (id, numero, loja_id, cliente_id, veiculo_id) values
    (os_a, 98761, loja_a, c_joao, v_joao),
    (os_b, 98762, loja_b, c_joao, v_joao)
    on conflict (id) do nothing;

  insert into pecas (id, descricao, codigo_interno, codigo_barras, marca, medida, preco_custo, preco_venda) values
    (p_pneu, 'Pneu Aro 14 Buscateste', 'PN-BUSCA-14', '7891234567895', 'Bridgestone', '175/70R14', 123.45, 399.90)
    on conflict (id) do nothing;

  insert into fornecedores (id, nome, cnpj, cidade, uf) values
    (f_omega, 'Distribuidora Ômega', '12.345.678/0001-90', 'Ribeirão Preto', 'SP')
    on conflict (id) do nothing;

  -- 25 clientes com o mesmo começo, pra medir o limite (1 a 20, padrão 5).
  insert into clientes (nome, tipo_pessoa)
    select 'Zuleica Limiteteste ' || lpad(i::text, 2, '0'), 'fisica'
      from generate_series(1, 25) i;

  -- ===================================================================
  -- 0. Ninguém logado (anon): nem chama a função
  -- ===================================================================
  set local role anon;
  begin
    perform * from buscar_global('joao', loja_a);
    raise exception 'FALHOU: o anônimo chamou buscar_global';
  exception when insufficient_privilege then
    -- A recusa tem que ser a do `revoke` (permissão de executar), e não a de
    -- dentro — senão tirar o revoke passaria calado.
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FALHOU: buscar_global está executável pelo anônimo (faltou o revoke): %', sqlerrm;
    end if;
  end;
  reset role;

  set local role authenticated;

  -- ===================================================================
  -- A. O que é RECUSADO
  -- ===================================================================

  -- 1. Sem módulo nenhum da busca (só Caixa), sem loja e desativado: nada,
  --    com nenhum termo.
  foreach quem in array array[o_caixa, o_orfao, o_inativo] loop
    perform set_config('request.jwt.claim.sub', quem::text, true);
    foreach termo in array array['abc1d23', 'joao', '98761', '7891234567895', 'omega', 'pn-busca'] loop
      select count(*) into quantas from buscar_global(termo, loja_a);
      if quantas <> 0 then
        raise exception 'FALHOU: % recebeu % resultado(s) buscando "%"', quem, quantas, termo;
      end if;
    end loop;
  end loop;

  -- 2. Sem Estoque não vem peça; sem Fornecedores não vem fornecedor.
  foreach quem in array array[o_os, o_cli, o_forn] loop
    perform set_config('request.jwt.claim.sub', quem::text, true);
    foreach termo in array array['7891234567895', 'pn-busca', 'buscateste'] loop
      select count(*) into quantas from buscar_global(termo, loja_a) where tipo = 'peca';
      if quantas <> 0 then
        raise exception 'FALHOU: % sem Estoque recebeu % peça(s) buscando "%"', quem, quantas, termo;
      end if;
    end loop;
  end loop;
  foreach quem in array array[o_os, o_cli, o_est] loop
    perform set_config('request.jwt.claim.sub', quem::text, true);
    foreach termo in array array['omega', '12345678'] loop
      select count(*) into quantas from buscar_global(termo, loja_a) where tipo = 'fornecedor';
      if quantas <> 0 then
        raise exception 'FALHOU: % sem Fornecedores recebeu % fornecedor(es) buscando "%"', quem, quantas, termo;
      end if;
    end loop;
  end loop;

  -- 3. Sem OS não vem OS (nem pra quem tem Clientes).
  foreach quem in array array[o_cli, o_est, o_forn] loop
    perform set_config('request.jwt.claim.sub', quem::text, true);
    select count(*) into quantas from buscar_global('98761', loja_a) where tipo = 'os';
    if quantas <> 0 then
      raise exception 'FALHOU: % sem OS recebeu % OS', quem, quantas;
    end if;
  end loop;

  -- 4. Sem Clientes e sem OS não vem cliente nem veículo.
  foreach quem in array array[o_est, o_forn] loop
    perform set_config('request.jwt.claim.sub', quem::text, true);
    foreach termo in array array['abc1d23', 'joao', 'xyz9'] loop
      select count(*) into quantas from buscar_global(termo, loja_a) where tipo in ('cliente', 'veiculo');
      if quantas <> 0 then
        raise exception 'FALHOU: % sem Clientes e sem OS recebeu % cliente(s)/veículo(s) buscando "%"',
          quem, quantas, termo;
      end if;
    end loop;
  end loop;

  -- 5. OS de outra loja não vem: nem buscando com a loja A aberta, nem
  --    pedindo a loja B (que ele não acessa).
  perform set_config('request.jwt.claim.sub', o_tudo::text, true);
  select count(*) into quantas from buscar_global('98762', loja_a) where tipo = 'os';
  if quantas <> 0 then
    raise exception 'FALHOU: a OS da loja B apareceu com a loja A aberta';
  end if;
  select count(*) into quantas from buscar_global('98762', loja_b) where tipo = 'os';
  if quantas <> 0 then
    raise exception 'FALHOU: quem não acessa a loja B achou a OS dela pedindo a loja B';
  end if;
  select count(*) into quantas from buscar_global('98762', null) where tipo = 'os';
  if quantas <> 0 then
    raise exception 'FALHOU: sem loja aberta (null) veio OS';
  end if;
  select count(*) into quantas from buscar_global('9876', loja_a) where tipo = 'os' and id = os_b;
  if quantas <> 0 then
    raise exception 'FALHOU: o começo do número trouxe a OS da loja B';
  end if;

  -- 6. O detalhe nunca leva telefone, CPF, endereço ou custo — de nenhum
  --    tipo, com nenhum termo, pra quem tem tudo.
  foreach termo in array array['abc1d23', 'xyz9', 'joao', 'pecanha', 'ana', '98761',
                               '7891234567895', 'pn-busca', 'buscateste', 'omega', '12345678'] loop
    for linha in select * from buscar_global(termo, loja_a, 20) loop
      if coalesce(linha.detalhe, '') ~ '(16999990001|16999990002|11122233344|55566677788|Rua Secreta|14800000|123[.,]45)'
         or coalesce(linha.titulo, '') ~ '(16999990001|11122233344|Rua Secreta|123[.,]45)' then
        raise exception 'FALHOU: dado proibido no resultado (% "%"): % / %',
          linha.tipo, termo, linha.titulo, linha.detalhe;
      end if;
    end loop;
  end loop;

  -- 7. O Consumidor (cliente fixo da venda de balcão) não aparece na busca.
  select count(*) into quantas from buscar_global('consumidor', loja_a) where id = consumidor;
  if quantas <> 0 then
    raise exception 'FALHOU: o cliente Consumidor apareceu na busca';
  end if;

  -- 8. Termo curto não procura; "%" e "_" não viram curinga.
  foreach termo in array array['', ' ', 'j', '  a  ', null] loop
    select count(*) into quantas from buscar_global(termo, loja_a);
    if quantas <> 0 then
      raise exception 'FALHOU: o termo curto "%" trouxe % resultado(s)', termo, quantas;
    end if;
  end loop;
  foreach termo in array array['__', '%%', '_%_'] loop
    select count(*) into quantas from buscar_global(termo, loja_a) where tipo in ('cliente', 'peca', 'fornecedor');
    if quantas <> 0 then
      raise exception 'FALHOU: "%" funcionou como curinga e trouxe % resultado(s)', termo, quantas;
    end if;
  end loop;

  -- ===================================================================
  -- B. O que PASSA
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_tudo::text, true);

  -- 9. A placa, digitada de qualquer jeito, acha a gravada como "abc-1d23".
  foreach termo in array array['ABC1D23', 'abc1d23', 'ABC-1D23', ' abc 1d2 ', 'AB'] loop
    select * into linha from buscar_global(termo, loja_a) where tipo = 'veiculo' and id = v_joao;
    if not found then
      raise exception 'FALHOU: "%" não achou o veículo abc-1d23', termo;
    end if;
    if linha.titulo <> 'abc-1d23' or linha.veiculo_id is distinct from v_joao
       or linha.detalhe not like '%João Peçanha%' or linha.detalhe not like '%Fiat Uno%' then
      raise exception 'FALHOU: o veículo veio errado buscando "%": % / % / %',
        termo, linha.titulo, linha.detalhe, linha.veiculo_id;
    end if;
  end loop;

  -- 10. "joao" acha "João Peçanha", com as placas no detalhe e o primeiro
  --     carro (pela placa) no veiculo_id.
  foreach termo in array array['joao', 'JOÃO', 'pecanha', 'Peçanha', 'joão peç'] loop
    select * into linha from buscar_global(termo, loja_a) where tipo = 'cliente' and id = c_joao;
    if not found then
      raise exception 'FALHOU: "%" não achou o cliente João Peçanha', termo;
    end if;
    if linha.titulo <> 'João Peçanha' or linha.detalhe <> 'abc-1d23, XYZ9K88'
       or linha.veiculo_id is distinct from v_joao then
      raise exception 'FALHOU: o cliente veio errado buscando "%": % / % / %',
        termo, linha.titulo, linha.detalhe, linha.veiculo_id;
    end if;
  end loop;

  -- 11. Quem só tem OS também acha o cliente e o veículo (é o balcão).
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  select count(*) into quantas from buscar_global('joao', loja_a) where tipo = 'cliente' and id = c_joao;
  if quantas <> 1 then
    raise exception 'FALHOU: quem só tem OS não achou o cliente pelo nome';
  end if;
  select count(*) into quantas from buscar_global('abc1d23', loja_a) where tipo = 'veiculo' and id = v_joao;
  if quantas <> 1 then
    raise exception 'FALHOU: quem só tem OS não achou o veículo pela placa';
  end if;
  -- e quem só tem Clientes também
  perform set_config('request.jwt.claim.sub', o_cli::text, true);
  select count(*) into quantas from buscar_global('abc1d23', loja_a) where tipo = 'veiculo' and id = v_joao;
  if quantas <> 1 then
    raise exception 'FALHOU: quem só tem Clientes não achou o veículo pela placa';
  end if;

  -- 12. O número da OS (com # e espaço), só da loja aberta.
  perform set_config('request.jwt.claim.sub', o_os::text, true);
  foreach termo in array array['98761', '#98761', ' # 98761 ', '9876'] loop
    select * into linha from buscar_global(termo, loja_a) where tipo = 'os' and id = os_a;
    if not found then
      raise exception 'FALHOU: "%" não achou a OS 98761', termo;
    end if;
    if linha.titulo <> '98761' or linha.veiculo_id is distinct from v_joao
       or linha.detalhe <> 'João Peçanha · abc-1d23 · Em andamento' then
      raise exception 'FALHOU: a OS veio errada buscando "%": % / % / %',
        termo, linha.titulo, linha.detalhe, linha.veiculo_id;
    end if;
  end loop;
  -- termo com letra não é número de OS
  select count(*) into quantas from buscar_global('os 98761', loja_a) where tipo = 'os';
  if quantas <> 0 then
    raise exception 'FALHOU: "os 98761" procurou OS (só número procura)';
  end if;

  -- 13. A peça pelo código de barras, pelo código e pela descrição — sem custo.
  perform set_config('request.jwt.claim.sub', o_est::text, true);
  foreach termo in array array['7891234567895', 'pn-busca', 'PN-BUSCA-14', 'buscateste', 'aro 14 busca'] loop
    select * into linha from buscar_global(termo, loja_a) where tipo = 'peca' and id = p_pneu;
    if not found then
      raise exception 'FALHOU: "%" não achou a peça', termo;
    end if;
    if linha.titulo <> 'Pneu Aro 14 Buscateste'
       or linha.detalhe <> 'PN-BUSCA-14 · Bridgestone · 175/70R14'
       or linha.veiculo_id is not null then
      raise exception 'FALHOU: a peça veio errada buscando "%": % / %', termo, linha.titulo, linha.detalhe;
    end if;
  end loop;

  -- 14. O fornecedor pelo nome sem acento e pelo começo do CNPJ.
  perform set_config('request.jwt.claim.sub', o_forn::text, true);
  foreach termo in array array['omega', 'ÔMEGA', 'distribuidora om', '12345678', '12.345.678/0001'] loop
    select * into linha from buscar_global(termo, loja_a) where tipo = 'fornecedor' and id = f_omega;
    if not found then
      raise exception 'FALHOU: "%" não achou o fornecedor', termo;
    end if;
    if linha.titulo <> 'Distribuidora Ômega' or linha.detalhe <> '12.345.678/0001-90' then
      raise exception 'FALHOU: o fornecedor veio errado buscando "%": % / %', termo, linha.titulo, linha.detalhe;
    end if;
  end loop;

  -- 14b. Termo com letra (uma placa) não procura pelo CNPJ: "XYZ1234" tem
  --      os dígitos "1234", o começo do CNPJ da Ômega (achado da revisão).
  select count(*) into quantas from buscar_global('XYZ1234', loja_a) where tipo = 'fornecedor';
  if quantas <> 0 then
    raise exception 'FALHOU: buscando a placa "XYZ1234" veio % fornecedor(es) pelo CNPJ', quantas;
  end if;

  -- 15. Quem começa com o termo vem antes de quem só contém.
  perform set_config('request.jwt.claim.sub', o_tudo::text, true);
  select titulo into termo from buscar_global('joaq', loja_a) where tipo = 'cliente' limit 1;
  if termo is distinct from 'Joaquim Alves' then
    raise exception 'FALHOU: buscando "joaq", o primeiro devia ser Joaquim Alves (começa com) e foi %', termo;
  end if;
  select count(*) into quantas from buscar_global('joaq', loja_a) where tipo = 'cliente' and id = c_ana;
  if quantas <> 1 then
    raise exception 'FALHOU: buscando "joaq", Ana Joaquina (contém) devia vir também';
  end if;

  -- 16. O limite por tipo: 5 sem dizer nada, nunca mais de 20, nunca menos de 1.
  select count(*) into quantas from buscar_global('limiteteste', loja_a) where tipo = 'cliente';
  if quantas <> 5 then
    raise exception 'FALHOU: sem limite deviam vir 5 clientes e vieram %', quantas;
  end if;
  select count(*) into quantas from buscar_global('limiteteste', loja_a, 500) where tipo = 'cliente';
  if quantas <> 20 then
    raise exception 'FALHOU: com limite 500 deviam vir 20 clientes (o teto) e vieram %', quantas;
  end if;
  select count(*) into quantas from buscar_global('limiteteste', loja_a, 0) where tipo = 'cliente';
  if quantas <> 1 then
    raise exception 'FALHOU: com limite 0 devia vir 1 cliente (o piso) e vieram %', quantas;
  end if;

  reset role;
  raise notice 'TODAS AS CHECAGENS PASSARAM';
end;
$$;

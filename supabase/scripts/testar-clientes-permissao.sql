-- Sakura System — AutoCenter Edition
-- TESTE do lote 4 do TR-04.1 (migration 0068, tarefa #365). NÃO é migration,
-- e NUNCA deve ser rodado no Supabase de verdade — grava e apaga dado de teste.
--
-- Prova as duas metades da promessa, que são opostas e por isso precisam ser
-- medidas juntas:
--   • quem NÃO tem o módulo Clientes não alcança telefone, CPF nem endereço
--     de ninguém — nem pela tabela, nem pela janela;
--   • e MESMO ASSIM o balcão continua: quem tem OS vê o nome do cliente e a
--     placa pela janela, faz o cadastro rápido e, na hora da nota, recebe o
--     CPF e o endereço do cliente DAQUELA OS — e só dela.
--
-- Uma trava que também impede o balconista de abrir OS não é segurança, é
-- sistema quebrado. Por isso a parte B pesa tanto quanto a A.
--
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

do $$
declare
  loja_a     uuid := 'c1e00000-0000-0000-0000-00000000000a';
  loja_b     uuid := 'c1e00000-0000-0000-0000-00000000000b';
  o_os       uuid := 'c1e01111-0000-0000-0000-000000000001';  -- só OS
  o_caixa    uuid := 'c1e01111-0000-0000-0000-000000000002';  -- só Caixa
  o_cli      uuid := 'c1e01111-0000-0000-0000-000000000003';  -- tem Clientes, não é admin
  o_orfao    uuid := 'c1e01111-0000-0000-0000-000000000004';  -- OS, mas sem loja
  c_1        uuid := 'c1e02222-0000-0000-0000-000000000001';
  c_2        uuid := 'c1e02222-0000-0000-0000-000000000002';
  v_1        uuid := 'c1e03333-0000-0000-0000-000000000001';
  v_2        uuid := 'c1e03333-0000-0000-0000-000000000002';
  os_a       uuid := 'c1e04444-0000-0000-0000-00000000000a';
  os_b       uuid := 'c1e04444-0000-0000-0000-00000000000b';
  consumidor uuid := '00000000-0000-0000-0000-00000000c000';
  testados   uuid[];
  quantas    int;
  problema   text;
  resposta   jsonb;
  novo_id    uuid;
begin
  -- ---- preparo -------------------------------------------------------
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A de Teste', 'Araraquara', 'SP'),
    (loja_b, 'Loja B de Teste', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  insert into auth.users (id) values (o_os), (o_caixa), (o_cli), (o_orfao) on conflict do nothing;

  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_os,    'teste_cli_os',    'Balcão de OS',      false, array['painel','ordens_servico'], true),
    (o_caixa, 'teste_cli_caixa', 'Balcão do Caixa',   false, array['painel','caixa'],          true),
    (o_cli,   'teste_cli_cli',   'Quem tem Clientes', false, array['painel','clientes'],       true),
    (o_orfao, 'teste_cli_orfao', 'Sem loja',          false, array['painel','ordens_servico'], true)
    on conflict (id) do nothing;

  insert into operador_lojas (operador_id, loja_id) values
    (o_os, loja_a), (o_caixa, loja_a), (o_cli, loja_a)
    on conflict do nothing;

  insert into clientes (id, nome, tipo_pessoa, cpf_cnpj, telefone, rua, numero, cidade, uf, cep, data_nascimento) values
    (c_1, 'Cliente Um',   'fisica', '11122233344', '16999990001', 'Rua A', '10', 'Araraquara', 'SP', '14800000', '1980-05-06'),
    (c_2, 'Cliente Dois', 'fisica', '55566677788', '16999990002', 'Rua B', '20', 'Araraquara', 'SP', '14800000', '1990-07-08')
    on conflict (id) do nothing;

  insert into veiculos (id, cliente_id, placa, marca, modelo, ano, cor, tipo, km_atual) values
    (v_1, c_1, 'TST1A11', 'Fiat', 'Uno',  2010, 'Prata', 'hatch', 120000),
    (v_2, c_2, 'TST2B22', 'VW',   'Gol',  2015, 'Preto', 'hatch',  80000)
    on conflict (id) do nothing;

  insert into ordens_servico (id, numero, loja_id, cliente_id, veiculo_id) values
    (os_a, 9901, loja_a, c_1, v_1),
    (os_b, 9902, loja_b, c_2, v_2)
    on conflict (id) do nothing;

  testados := array[c_1, c_2];

  -- ===================================================================
  -- 0. Ninguém logado (anon): nem tabela, nem janela, nem função
  -- ===================================================================
  set local role anon;
  begin
    select count(*) into quantas from clientes_janela;
    raise exception 'FALHOU: o anônimo leu a clientes_janela (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;
  -- As funções também barram por dentro (o anônimo não tem módulo), então
  -- confere que a recusa é a do `revoke` (permissão de executar), e não a de
  -- dentro — senão tirar o revoke passaria calado.
  begin
    resposta := cliente_e_veiculo_da_ordem(os_a);
    raise exception 'FALHOU: o anônimo chamou cliente_e_veiculo_da_ordem';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FALHOU: cliente_e_veiculo_da_ordem está executável pelo anônimo (faltou o revoke)';
    end if;
  end;
  begin
    resposta := cadastrar_cliente_rapido('{"nome":"Anônimo"}'::jsonb, null);
    raise exception 'FALHOU: o anônimo chamou cadastrar_cliente_rapido';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FALHOU: cadastrar_cliente_rapido está executável pelo anônimo (faltou o revoke)';
    end if;
  end;
  reset role;

  set local role authenticated;

  -- ===================================================================
  -- A. Sem o módulo Clientes: a tabela some (balcão de OS e de Caixa)
  -- ===================================================================
  foreach novo_id in array array[o_os, o_caixa] loop
    perform set_config('request.jwt.claim.sub', novo_id::text, true);

    -- 1. o cadastro some inteiro, e o CPF junto
    select count(*) into quantas from clientes where id = any (testados);
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Clientes leu % cliente(s) da tabela', novo_id, quantas;
    end if;

    -- 2. os veículos também (o ano e o KM do cadastro são do módulo)
    select count(*) into quantas from veiculos where cliente_id = any (testados);
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Clientes leu % veículo(s) da tabela', novo_id, quantas;
    end if;

    -- 3. nem altera nem apaga
    with s as (update clientes set nome = nome where id = any (testados) returning 1)
    select count(*) into quantas from s;
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Clientes alterou % cliente(s)', novo_id, quantas;
    end if;
    with s as (delete from veiculos where cliente_id = any (testados) returning 1)
    select count(*) into quantas from s;
    if quantas <> 0 then
      raise exception 'FALHOU: % sem Clientes apagou % veículo(s)', novo_id, quantas;
    end if;

    -- 4. nem insere direto (a porta dele é o cadastro rápido)
    begin
      insert into clientes (nome) values ('Direto na tabela');
      raise exception 'FALHOU: % sem Clientes inseriu direto em clientes', novo_id;
    exception when insufficient_privilege then null;
    end;

    -- 5. o Consumidor (0064) continua visível: a venda de balcão nasce nele
    select count(*) into quantas from clientes where id = consumidor;
    if quantas <> 1 then
      raise exception 'FALHOU: % devia ver o cliente Consumidor e viu %', novo_id, quantas;
    end if;

    -- ---- B. ...e a janela entrega o nome e a placa --------------------
    -- 6. os dois clientes, pelo nome
    select count(*) into quantas from clientes_janela where id = any (testados);
    if quantas <> 2 then
      raise exception 'FALHOU: % devia ver 2 clientes na janela e viu %', novo_id, quantas;
    end if;
    -- 7. e os dois carros, pela placa
    select count(*) into quantas from veiculos_janela where cliente_id = any (testados);
    if quantas <> 2 then
      raise exception 'FALHOU: % devia ver 2 veículos na janela e viu %', novo_id, quantas;
    end if;
  end loop;

  -- 8. a janela não pode ter ganhado coluna sensível por descuido
  select string_agg(table_name || '.' || column_name, ', ' order by table_name, column_name) into problema
    from information_schema.columns
   where table_schema = 'public'
     and ((table_name = 'clientes_janela' and column_name not in ('id','nome'))
       or (table_name = 'veiculos_janela'
           and column_name not in ('id','cliente_id','placa','marca','modelo','cor','tipo')));
  if problema is not null then
    raise exception 'FALHOU: a janela ganhou coluna fora do combinado: %', problema;
  end if;

  -- 9. e a janela não é porta de escrita (auto-atualizável + dono = sem RLS)
  begin
    with s as (update clientes_janela set nome = nome returning 1)
    select count(*) into quantas from s;
    raise exception 'FALHOU: deu pra escrever em clientes por dentro da janela (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;
  begin
    with s as (delete from veiculos_janela returning 1)
    select count(*) into quantas from s;
    raise exception 'FALHOU: deu pra apagar veículo por dentro da janela (% linha(s))', quantas;
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- C. Quem tem OS: cadastro rápido e os dados da nota
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_os::text, true);

  -- 10. cadastro rápido com veículo devolve os dois ids
  resposta := cadastrar_cliente_rapido(
    '{"nome":"Rápido da OS","telefone":"16988887777","tipo_pessoa":"fisica","cpf_cnpj":null,"rua":"Rua que não devia entrar"}'::jsonb,
    '{"placa":"RAP1D00","marca":"Ford","modelo":"Ka","ano":2012,"cor":"Azul","tipo":"hatch","km_atual":50000}'::jsonb);
  if resposta ->> 'cliente_id' is null or resposta ->> 'veiculo_id' is null then
    raise exception 'FALHOU: cadastrar_cliente_rapido devia devolver os dois ids e devolveu %', resposta;
  end if;
  testados := testados || (resposta ->> 'cliente_id')::uuid;

  -- 11. e o cliente novo aparece na janela pra ele (pra já vir escolhido)
  select count(*) into quantas from clientes_janela where id = (resposta ->> 'cliente_id')::uuid;
  if quantas <> 1 then
    raise exception 'FALHOU: o cliente do cadastro rápido não apareceu na janela';
  end if;

  -- 12. um carro a mais pra um cliente que já existe
  novo_id := cadastrar_veiculo_rapido(c_1, '{"placa":"RAP2D00","modelo":"Palio"}'::jsonb);
  select count(*) into quantas from veiculos_janela where id = novo_id and cliente_id = c_1;
  if quantas <> 1 then
    raise exception 'FALHOU: cadastrar_veiculo_rapido não pôs o carro no cliente';
  end if;

  -- 13. a nota: CPF e endereço do cliente DESTA OS
  resposta := cliente_e_veiculo_da_ordem(os_a);
  if resposta -> 'cliente' ->> 'cpf_cnpj' is distinct from '11122233344'
     or resposta -> 'cliente' ->> 'rua' is distinct from 'Rua A'
     or resposta -> 'veiculo' ->> 'placa' is distinct from 'TST1A11' then
    raise exception 'FALHOU: cliente_e_veiculo_da_ordem não entregou CPF/endereço/placa da OS: %', resposta;
  end if;
  -- ...sem o aniversário, que nem a nota nem a garantia usam
  if resposta -> 'cliente' ? 'data_nascimento' then
    raise exception 'FALHOU: cliente_e_veiculo_da_ordem entregou o aniversário';
  end if;

  -- 14. ...e nunca de uma OS de outra loja
  begin
    resposta := cliente_e_veiculo_da_ordem(os_b);
    raise exception 'FALHOU: o balcão da loja A leu o cliente da OS da loja B: %', resposta;
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- D. Quem não tem OS (só Caixa) não usa as portas da OS
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_caixa::text, true);

  -- 15. nem o cadastro rápido
  begin
    resposta := cadastrar_cliente_rapido('{"nome":"Pelo caixa"}'::jsonb, null);
    raise exception 'FALHOU: o balcão do Caixa usou o cadastro rápido da OS';
  exception when insufficient_privilege then null;
  end;
  -- 16. nem os dados da nota
  begin
    resposta := cliente_e_veiculo_da_ordem(os_a);
    raise exception 'FALHOU: o balcão do Caixa leu o CPF do cliente da OS';
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- E. Operador sem loja nenhuma (§6 item 23): nem a janela
  -- ===================================================================
  perform set_config('request.jwt.claim.sub', o_orfao::text, true);
  select count(*) into quantas from clientes_janela where id = any (testados);
  if quantas <> 0 then
    raise exception 'FALHOU: o operador sem loja viu % cliente(s) na janela', quantas;
  end if;
  begin
    resposta := cliente_e_veiculo_da_ordem(os_a);
    raise exception 'FALHOU: o operador sem loja leu o cliente de uma OS';
  exception when insufficient_privilege then null;
  end;

  -- ===================================================================
  -- F. Quem TEM o módulo continua com o cadastro inteiro
  -- ===================================================================
  -- Sem esta parte, uma policy que barrasse todo mundo passaria no teste.
  perform set_config('request.jwt.claim.sub', o_cli::text, true);

  -- 17. lê os três clientes de teste, com CPF e telefone
  select count(*) into quantas from clientes where id = any (testados) and telefone is not null;
  if quantas <> 3 then
    raise exception 'FALHOU: quem tem Clientes devia ler 3 clientes com telefone e leu %', quantas;
  end if;
  -- 18. e o cadastro rápido não gravou o que não é dele (a rua)
  select count(*) into quantas from clientes where id = testados[3] and rua is not null;
  if quantas <> 0 then
    raise exception 'FALHOU: o cadastro rápido gravou um campo fora da lista (rua)';
  end if;
  -- 19. edita e apaga
  with s as (update clientes set telefone = telefone where id = any (testados) returning 1)
  select count(*) into quantas from s;
  if quantas <> 3 then
    raise exception 'FALHOU: quem tem Clientes devia alterar 3 clientes e alterou %', quantas;
  end if;
  with s as (delete from veiculos where id = novo_id returning 1)
  select count(*) into quantas from s;
  if quantas <> 1 then
    raise exception 'FALHOU: quem tem Clientes devia apagar o veículo e apagou %', quantas;
  end if;

  reset role;
  raise notice 'TODAS AS CHECAGENS PASSARAM';
end;
$$;

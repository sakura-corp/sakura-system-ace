-- Sakura System — AutoCenter Edition
-- TESTE da migration 0077 (cadastrar peça do item com a ordem travada,
-- tarefa #803, caso 1). NÃO é migration, e NUNCA deve ser rodado no Supabase
-- de verdade — grava e apaga dado de teste, e abre ligações de volta pro
-- próprio banco (dblink) pra simular dois computadores ao mesmo tempo.
--
-- A promessa, em duas metades:
--   • o que passa: em orçamento, ligar a peça avulsa ao cadastro não mexe no
--     estoque (quem baixa é a aprovação); numa OS (em andamento ou já
--     faturada, que é quando a nota sai) liga E baixa, uma vez, com a
--     quantidade do banco, a referência "OS N" e o depósito ativo mais antigo
--     da loja; marca quem mexeu por último;
--   • o que é recusado (devolve false e não mexe em nada): item que já tem
--     peça, serviço, item que não existe, item de ordem de outra loja; numa
--     OS sem depósito ativo falha INTEIRO (a peça não fica ligada sem a
--     baixa); sem login não chama.
--
-- E A TRAVA (partes 3 e 4): dois "computadores" de verdade (duas ligações
-- dblink, cada uma a sua transação) se cruzando no mesmo orçamento — um
-- aprova enquanto o outro liga a peça, nas duas ordens. A função termina com
-- um `update ordens_servico`, que também espera a trava; por isso "o dois
-- esperou" sozinho não prova nada (docs/licoes.md, itens 73 e 76): o que
-- prova é o resultado, a peça baixada exatamente uma vez. A parte 3 foi
-- quebrada de propósito (tirando o `for update` da função) e ficou vermelha.
--
-- Como rodar: `npm run test:sql -- testar-cadastrar-peca-do-item`. Precisa
-- da extensão dblink e de entrar no próprio banco pela rede local com a senha
-- do runner (a mesma do .github/workflows/ci.yml). Terminou imprimindo
-- "TODAS AS CHECAGENS PASSARAM", passou.

create extension if not exists dblink;

-- ===================================================================
-- Parte 1: o preparo (gravado de verdade, pras ligações dblink enxergarem)
-- ===================================================================

do $$
declare
  loja_a  uuid := '08030000-0000-0000-0000-00000000000a';  -- com depósitos
  loja_b  uuid := '08030000-0000-0000-0000-00000000000b';  -- a "outra loja"
  loja_c  uuid := '08030000-0000-0000-0000-00000000000c';  -- só depósito inativo
  o_a     uuid := '08031111-0000-0000-0000-00000000000a';  -- lojas A e C
  o_b     uuid := '08031111-0000-0000-0000-00000000000b';  -- só a loja B
  cliente uuid := '08032222-0000-0000-0000-000000000001';
  p1      uuid := '08035555-0000-0000-0000-000000000001';
  r       int;
begin
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #803)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #803)', 'Araraquara', 'SP'),
    (loja_c, 'Loja C (teste #803)', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  -- Loja A: um depósito inativo MAIS antigo e dois ativos. O padrão é o
  -- ativo mais antigo (a2), não o mais antigo de todos.
  insert into depositos (id, loja_id, nome, ativo, criado_em) values
    ('08033333-0000-0000-0000-0000000000a1', loja_a, 'Antigo, desativado', false, now() - interval '3 days'),
    ('08033333-0000-0000-0000-0000000000a2', loja_a, 'Principal',          true,  now() - interval '2 days'),
    ('08033333-0000-0000-0000-0000000000a3', loja_a, 'Fundos',             true,  now() - interval '1 day'),
    ('08033333-0000-0000-0000-0000000000b1', loja_b, 'Principal B',        true,  now()),
    ('08033333-0000-0000-0000-0000000000c1', loja_c, 'Desativado C',       false, now())
    on conflict (id) do nothing;

  insert into auth.users (id) values (o_a), (o_b) on conflict do nothing;
  -- Com Estoque, além de OS: as conferências daqui leem estoque_movimentos
  -- como o balconista (desde a 0074 só o módulo Estoque lê).
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_a, 't803_a', 'Balconista A (teste #803)', false, array['painel', 'ordens_servico', 'estoque'], true),
    (o_b, 't803_b', 'Balconista B (teste #803)', false, array['painel', 'ordens_servico', 'estoque'], true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values
    (o_a, loja_a), (o_a, loja_c), (o_b, loja_b)
    on conflict do nothing;

  insert into clientes (id, nome) values (cliente, 'Cliente (teste #803)') on conflict (id) do nothing;
  insert into pecas (id, descricao) values (p1, 'Pneu 175/70 R13 (teste #803)') on conflict (id) do nothing;

  -- Os orçamentos dos cruzamentos (partes 3 e 4), cada um com uma peça
  -- avulsa de 2 unidades.
  for r in 1..2 loop
    insert into ordens_servico (id, loja_id, cliente_id, status)
      values (('08034444-0000-0000-0000-00000000000' || r)::uuid, loja_a, cliente, 'orcamento');
    insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
      values (('08036666-0000-0000-0000-00000000000' || r)::uuid,
              ('08034444-0000-0000-0000-00000000000' || r)::uuid,
              'peca', null, 'Pneu avulso', 2, 250);
  end loop;
end $$;

-- ===================================================================
-- Parte 2: o que passa, e o que é recusado (um computador só)
-- ===================================================================

do $$
declare
  loja_a  uuid := '08030000-0000-0000-0000-00000000000a';
  loja_b  uuid := '08030000-0000-0000-0000-00000000000b';
  loja_c  uuid := '08030000-0000-0000-0000-00000000000c';
  o_a     uuid := '08031111-0000-0000-0000-00000000000a';
  o_b     uuid := '08031111-0000-0000-0000-00000000000b';
  cliente uuid := '08032222-0000-0000-0000-000000000001';
  p1      uuid := '08035555-0000-0000-0000-000000000001';
  dep_padrao uuid := '08033333-0000-0000-0000-0000000000a2';
  inexistente uuid := '08039999-0000-0000-0000-000000000000';
  orc     uuid;
  os_and  uuid;
  os_fat  uuid;
  os_b    uuid;
  os_c    uuid;
  it_orc  uuid;
  it_and  uuid;
  it_fat  uuid;
  it_b    uuid;
  it_c    uuid;
  it_srv  uuid;
  it_cad  uuid;
  ok      boolean;
  ref     text;
  n       int;
  movs_antes int;
  linha   record;
begin
  -- Sem login não chama: a tranca é o `revoke` (docs/licoes.md, item 76).
  if has_function_privilege('anon', 'cadastrar_peca_do_item(uuid, uuid, uuid)', 'execute') then
    raise exception 'FALHOU: quem não está logado (anon) pode chamar cadastrar_peca_do_item';
  end if;
  if not has_function_privilege('authenticated', 'cadastrar_peca_do_item(uuid, uuid, uuid)', 'execute') then
    raise exception 'FALHOU: quem está logado (authenticated) não pode chamar cadastrar_peca_do_item';
  end if;

  -- As ordens desta parte, cada uma com uma peça avulsa de 3 unidades.
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'orcamento') returning id into orc;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'em_andamento') returning id into os_and;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'faturada') returning id into os_fat;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_b, cliente, 'em_andamento') returning id into os_b;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_c, cliente, 'em_andamento') returning id into os_c;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (orc, 'peca', null, 'Avulsa', 3, 10) returning id into it_orc;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (os_and, 'peca', null, 'Avulsa', 3, 10) returning id into it_and;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (os_fat, 'peca', null, 'Avulsa', 3, 10) returning id into it_fat;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (os_b, 'peca', null, 'Avulsa de outra loja', 3, 10) returning id into it_b;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (os_c, 'peca', null, 'Avulsa sem depósito', 3, 10) returning id into it_c;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (os_and, 'servico', null, 'Montagem', 1, 40) returning id into it_srv;
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (os_and, 'peca', p1, 'Pneu do cadastro', 1, 250) returning id into it_cad;

  select count(*) into movs_antes from estoque_movimentos;

  -- Daqui pra baixo, como o balconista A, sob a RLS.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_a::text, true);

  -- A. Em orçamento: liga, e não baixa nada.
  ok := cadastrar_peca_do_item(it_orc, p1, o_a);
  if ok is not true or (select peca_id from ordens_servico_itens where id = it_orc) is distinct from p1 then
    raise exception 'FALHOU (A1): em orçamento a peça devia ser ligada (devolveu %)', ok;
  end if;
  if (select count(*) from estoque_movimentos) <> movs_antes then
    raise exception 'FALHOU (A2): em orçamento ligar a peça não pode mexer no estoque';
  end if;
  if (select atualizado_por_id from ordens_servico where id = orc) is distinct from o_a then
    raise exception 'FALHOU (A3): não marcou quem mexeu por último na ordem';
  end if;

  -- B. Em OS: liga e baixa uma vez, com a quantidade do banco, "OS N" e o
  -- depósito padrão.
  ok := cadastrar_peca_do_item(it_and, p1, o_a);
  ref := 'OS ' || (select numero from ordens_servico where id = os_and);
  select count(*) as n, sum(quantidade) as qtd, min(deposito_id::text) as dep, min(motivo) as motivo
    into linha
    from estoque_movimentos where referencia = ref and tipo = 'saida' and peca_id = p1;
  if ok is not true or linha.n <> 1 or linha.qtd <> 3 or linha.dep <> dep_padrao::text or linha.motivo <> 'uso_em_os' then
    raise exception 'FALHOU (B1): na OS devia ligar e baixar 3 do depósito padrão uma vez (%, %)', ok, linha;
  end if;

  -- C. Em OS já faturada (é quando a nota sai): liga e baixa.
  ok := cadastrar_peca_do_item(it_fat, p1, o_a);
  ref := 'OS ' || (select numero from ordens_servico where id = os_fat);
  select count(*) into n from estoque_movimentos where referencia = ref and tipo = 'saida' and peca_id = p1;
  if ok is not true or n <> 1 then
    raise exception 'FALHOU (C1): na OS faturada devia ligar e baixar (%, % movimentos)', ok, n;
  end if;

  -- D. Recusas: devolvem false e não mexem em nada.
  select count(*) into movs_antes from estoque_movimentos;
  if cadastrar_peca_do_item(it_and, p1, o_a) is not false then
    raise exception 'FALHOU (D1): ligar de novo um item que já tem peça devia devolver false';
  end if;
  if cadastrar_peca_do_item(it_srv, p1, o_a) is not false
     or (select peca_id from ordens_servico_itens where id = it_srv) is not null then
    raise exception 'FALHOU (D2): serviço não pode ganhar peça';
  end if;
  if cadastrar_peca_do_item(it_cad, p1, o_a) is not false then
    raise exception 'FALHOU (D3): item que já é do cadastro devia devolver false';
  end if;
  if cadastrar_peca_do_item(inexistente, p1, o_a) is not false then
    raise exception 'FALHOU (D4): item que não existe devia devolver false';
  end if;
  if cadastrar_peca_do_item(it_b, p1, o_a) is not false then
    raise exception 'FALHOU (D5): o balconista A ligou peça numa OS da loja B (fora da RLS dele)';
  end if;
  if (select count(*) from estoque_movimentos) <> movs_antes then
    raise exception 'FALHOU (D6): uma recusa mexeu no estoque';
  end if;

  -- E. OS sem depósito ativo: falha inteira, a peça não fica ligada.
  begin
    perform cadastrar_peca_do_item(it_c, p1, o_a);
    raise exception 'FALHOU (E1): numa OS sem depósito ativo devia dar erro';
  exception when others then
    if sqlerrm not like 'Nenhum depósito ativo encontrado pra essa loja.%' then
      raise;
    end if;
  end;
  if (select peca_id from ordens_servico_itens where id = it_c) is not null then
    raise exception 'FALHOU (E2): a peça ficou ligada sem a baixa (devia ser tudo ou nada)';
  end if;

  reset role;
  if (select peca_id from ordens_servico_itens where id = it_b) is not null then
    raise exception 'FALHOU (D7): o item da loja B ganhou peça';
  end if;
end $$;

-- ===================================================================
-- Partes 3 e 4: dois computadores ao mesmo tempo (dblink)
-- ===================================================================
-- O computador 1 ("um") começa uma transação, chama uma função e NÃO
-- termina — a linha da ordem fica presa. O computador 2 ("dois") chama a
-- outra função na mesma ordem, sem esperar a resposta (dblink_send_query).
-- Conferimos que o dois ficou ESPERANDO; o um termina (commit); o dois
-- entra, e o resultado final tem de ser o certo.

create function pg_temp.t803_abrir(p_nome text, p_operador uuid)
returns int
language plpgsql
as $$
declare
  v_pid int;
begin
  perform dblink_connect(p_nome, format(
    'host=127.0.0.1 port=%s dbname=%s user=postgres password=postgres',
    coalesce(inet_server_port(), 5432), current_database()));
  select p into v_pid from dblink(p_nome, 'select pg_backend_pid()') as t(p int);
  perform dblink_exec(p_nome, 'begin');
  perform dblink_exec(p_nome, 'set local role authenticated');
  perform * from dblink(p_nome, format('select set_config(''request.jwt.claim.sub'', %L, true)', p_operador)) as t(x text);
  return v_pid;
end;
$$;

-- O processo `p_pid` está parado esperando uma trava? (até 5 segundos)
create function pg_temp.t803_esperando(p_pid int)
returns boolean
language plpgsql
as $$
begin
  for i in 1..100 loop
    if exists (select 1 from pg_locks where pid = p_pid and not granted) then
      return true;
    end if;
    perform pg_sleep(0.05);
  end loop;
  return false;
end;
$$;

-- ===================================================================
-- Parte 3: um APROVA enquanto dois LIGA a peça avulsa — a peça baixa uma
-- vez (vigia o `for update` de cadastrar_peca_do_item)
-- ===================================================================
-- Sem a trava, o dois lia "ainda é orçamento", ligava sem baixar, e a
-- aprovação do um já tinha lido os itens com a peça ainda avulsa: a peça
-- virava do cadastro numa OS sem nunca sair do estoque (o caso 1 da #803).

do $$
declare
  o_a  uuid := '08031111-0000-0000-0000-00000000000a';
  p1   uuid := '08035555-0000-0000-0000-000000000001';
  orc  uuid := '08034444-0000-0000-0000-000000000001';
  item uuid := '08036666-0000-0000-0000-000000000001';
  pid_dois int;
  resposta text;
  ref text;
  baixado numeric;
begin
  perform pg_temp.t803_abrir('um', o_a);
  pid_dois := pg_temp.t803_abrir('dois', o_a);

  perform * from dblink('um', format('select aprovar_orcamento(%L, %L, %L)', orc, 'cliente', o_a)) as t(x text);

  perform dblink_send_query('dois', format('select cadastrar_peca_do_item(%L, %L, %L)', item, p1, o_a));
  if not pg_temp.t803_esperando(pid_dois) then
    raise exception 'FALHOU (3a): ligar a peça não esperou a aprovação terminar';
  end if;

  perform dblink_exec('um', 'commit');
  select x into resposta from dblink_get_result('dois') as t(x text);
  perform * from dblink_get_result('dois') as t(x text);
  perform dblink_exec('dois', 'commit');
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  ref := 'OS ' || (select numero from ordens_servico where id = orc);
  select sum(quantidade) into baixado from estoque_movimentos where referencia = ref and tipo = 'saida' and peca_id = p1;
  if resposta is distinct from 't'
     or (select peca_id from ordens_servico_itens where id = item) is distinct from p1
     or baixado is distinct from 2.00 then
    raise exception 'FALHOU (3b): ligada: %, baixado: % (a peça ligada no meio da aprovação escapou do estoque ou baixou duas vezes)',
      resposta, baixado;
  end if;
end $$;

-- ===================================================================
-- Parte 4: um LIGA a peça enquanto dois APROVA — a aprovação espera e
-- baixa a peça já ligada, uma vez (vigia a ordem inversa)
-- ===================================================================

do $$
declare
  o_a  uuid := '08031111-0000-0000-0000-00000000000a';
  p1   uuid := '08035555-0000-0000-0000-000000000001';
  orc  uuid := '08034444-0000-0000-0000-000000000002';
  item uuid := '08036666-0000-0000-0000-000000000002';
  pid_dois int;
  resposta text;
  ref text;
  baixado numeric;
begin
  perform pg_temp.t803_abrir('um', o_a);
  pid_dois := pg_temp.t803_abrir('dois', o_a);

  perform * from dblink('um', format('select cadastrar_peca_do_item(%L, %L, %L)', item, p1, o_a)) as t(x text);

  perform dblink_send_query('dois', format('select aprovar_orcamento(%L, %L, %L)', orc, 'cliente', o_a));
  if not pg_temp.t803_esperando(pid_dois) then
    raise exception 'FALHOU (4a): a aprovação não esperou a peça ser ligada';
  end if;

  perform dblink_exec('um', 'commit');
  select x into resposta from dblink_get_result('dois') as t(x text);
  perform * from dblink_get_result('dois') as t(x text);
  perform dblink_exec('dois', 'commit');
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  ref := 'OS ' || (select numero from ordens_servico where id = orc);
  select sum(quantidade) into baixado from estoque_movimentos where referencia = ref and tipo = 'saida' and peca_id = p1;
  if resposta is null or baixado is distinct from 2.00 then
    raise exception 'FALHOU (4b): aprovou: %, baixado: % (devia aprovar e baixar a peça já ligada uma vez)',
      resposta is not null, baixado;
  end if;
end $$;

-- ===================================================================
-- Limpeza
-- ===================================================================

do $$
declare
  lojas_teste uuid[] := array['08030000-0000-0000-0000-00000000000a',
                              '08030000-0000-0000-0000-00000000000b',
                              '08030000-0000-0000-0000-00000000000c']::uuid[];
begin
  delete from estoque_movimentos where loja_id = any (lojas_teste);
  delete from ordens_servico where loja_id = any (lojas_teste);
  delete from depositos where loja_id = any (lojas_teste);
  delete from operador_lojas where operador_id in ('08031111-0000-0000-0000-00000000000a', '08031111-0000-0000-0000-00000000000b');
  delete from operadores where id in ('08031111-0000-0000-0000-00000000000a', '08031111-0000-0000-0000-00000000000b');
  delete from pecas where id = '08035555-0000-0000-0000-000000000001';
  delete from clientes where id = '08032222-0000-0000-0000-000000000001';
  delete from lojas where id = any (lojas_teste);

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

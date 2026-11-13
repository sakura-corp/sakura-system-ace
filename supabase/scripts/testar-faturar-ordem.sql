-- Sakura System — AutoCenter Edition
-- TESTE da migration 0083 (faturar a OS com a ordem travada e o total
-- conferido no banco, tarefa #803, caso 2). NÃO é migration, e NUNCA deve ser
-- rodado no Supabase de verdade — grava e apaga dado de teste, e abre
-- ligações de volta pro próprio banco (dblink) pra simular dois computadores
-- ao mesmo tempo.
--
-- A promessa, em duas metades:
--   • o que passa: a OS em andamento e a venda de balcão (que nasce
--     concluída) viram faturadas, com a forma de pagamento, as parcelas, a
--     data de fechamento e quem mexeu por último, quando o total da tela bate
--     no centavo com a soma dos itens do banco (com o desconto descontado, e
--     aceitando a cauda de ponto flutuante da tela: 0.1 + 0.2);
--   • o que é recusado (e não grava nada): total diferente ou sem total (com
--     o código SK803, que o programa reconhece), orçamento, recusado, OS já
--     faturada, OS de outra loja, quem só tem Relatórios; sem login não chama.
--
-- E A TRAVA (partes 3, 4 e 5): dois "computadores" de verdade (duas ligações
-- dblink, cada uma a sua transação) se cruzando na mesma OS — um acrescenta
-- (ou corrige) um item enquanto o outro fatura com o total de antes, e a
-- ordem inversa. A função termina com um `update ordens_servico`, que também
-- espera a trava; por isso "o dois esperou" sozinho não prova nada
-- (docs/licoes.md, itens 73 e 76): o que prova é o resultado, a OS recusada e
-- não faturada. A parte 3 foi quebrada de propósito (tirando o `for update`
-- da função) e ficou vermelha: o dois esperou do mesmo jeito (3a passou), mas
-- faturou pelo total velho (3b reprovou). Sem o `for update`, o E3 também
-- reprova: quem só tem Relatórios "fatura" sem erro e nada é gravado (o
-- `update` cai na RLS calado), e a tela lançaria o Caixa assim mesmo.
--
-- Como rodar: `npm run test:sql -- testar-faturar-ordem`. Precisa da extensão
-- dblink e de entrar no próprio banco pela rede local com a senha do runner
-- (a mesma do .github/workflows/ci.yml). Terminou imprimindo "TODAS AS
-- CHECAGENS PASSARAM", passou.

create extension if not exists dblink;

-- ===================================================================
-- Parte 1: o preparo (gravado de verdade, pras ligações dblink enxergarem)
-- ===================================================================

do $$
declare
  loja_a  uuid := '08860000-0000-0000-0000-00000000000a';
  loja_b  uuid := '08860000-0000-0000-0000-00000000000b';  -- a "outra loja"
  o_a     uuid := '08861111-0000-0000-0000-00000000000a';  -- OS na loja A
  o_b     uuid := '08861111-0000-0000-0000-00000000000b';  -- OS na loja B
  o_r     uuid := '08861111-0000-0000-0000-00000000000c';  -- só Relatórios, loja A
  cliente uuid := '08862222-0000-0000-0000-000000000001';
  r       int;
begin
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #803 faturar)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #803 faturar)', 'Araraquara', 'SP')
    on conflict (id) do nothing;
  insert into depositos (id, loja_id, nome, ativo) values
    ('08863333-0000-0000-0000-0000000000a1', loja_a, 'Principal', true),
    ('08863333-0000-0000-0000-0000000000b1', loja_b, 'Principal B', true)
    on conflict (id) do nothing;

  insert into auth.users (id) values (o_a), (o_b), (o_r) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_a, 't803f_a', 'Balconista A (teste #803 faturar)', false, array['painel', 'ordens_servico'], true),
    (o_b, 't803f_b', 'Balconista B (teste #803 faturar)', false, array['painel', 'ordens_servico'], true),
    (o_r, 't803f_r', 'Só relatórios (teste #803 faturar)', false, array['painel', 'relatorios'], true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values
    (o_a, loja_a), (o_b, loja_b), (o_r, loja_a)
    on conflict do nothing;

  insert into clientes (id, nome) values (cliente, 'Cliente (teste #803 faturar)') on conflict (id) do nothing;

  -- As OS dos cruzamentos (partes 3, 4 e 5), em andamento, cada uma com uma
  -- peça avulsa de 2 × 100 (total 200). Peça avulsa não mexe no estoque.
  for r in 1..3 loop
    insert into ordens_servico (id, loja_id, cliente_id, status)
      values (('08864444-0000-0000-0000-00000000000' || r)::uuid, loja_a, cliente, 'em_andamento');
    insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
      values (('08866666-0000-0000-0000-00000000000' || r)::uuid,
              ('08864444-0000-0000-0000-00000000000' || r)::uuid,
              'peca', null, 'Pneu avulso', 2, 100);
  end loop;
end $$;

-- ===================================================================
-- Parte 2: o que passa, e o que é recusado (um computador só)
-- ===================================================================

-- Chama marcar_ordem_faturada e devolve o código do erro (null se passou) e a
-- mensagem, sem derrubar o teste.
create function pg_temp.t803f_tentar(p_ordem uuid, p_total numeric, p_operador uuid, out codigo text, out mensagem text)
language plpgsql
as $$
begin
  perform marcar_ordem_faturada(p_ordem, 'Pix', 1, p_total, p_operador);
  codigo := null;
  mensagem := null;
exception when others then
  codigo := sqlstate;
  mensagem := sqlerrm;
end;
$$;

do $$
declare
  loja_a  uuid := '08860000-0000-0000-0000-00000000000a';
  loja_b  uuid := '08860000-0000-0000-0000-00000000000b';
  o_a     uuid := '08861111-0000-0000-0000-00000000000a';
  o_r     uuid := '08861111-0000-0000-0000-00000000000c';
  cliente uuid := '08862222-0000-0000-0000-000000000001';
  inexistente uuid := '08869999-0000-0000-0000-000000000000';
  os_and  uuid;
  venda   uuid;
  os_cent uuid;
  os_dif  uuid;
  orc     uuid;
  rec     uuid;
  os_fat  uuid;
  os_b    uuid;
  os_rel  uuid;
  linha   record;
  t       record;
begin
  -- Sem login não chama: a tranca é o `revoke` (docs/licoes.md, item 76).
  if has_function_privilege('anon', 'marcar_ordem_faturada(uuid, text, integer, numeric, uuid)', 'execute') then
    raise exception 'FALHOU (A1): quem não está logado (anon) pode chamar marcar_ordem_faturada';
  end if;
  if has_function_privilege('public', 'marcar_ordem_faturada(uuid, text, integer, numeric, uuid)', 'execute') then
    raise exception 'FALHOU (A2): PUBLIC pode chamar marcar_ordem_faturada';
  end if;
  if not has_function_privilege('authenticated', 'marcar_ordem_faturada(uuid, text, integer, numeric, uuid)', 'execute') then
    raise exception 'FALHOU (A3): quem está logado (authenticated) não pode chamar marcar_ordem_faturada';
  end if;

  -- As ordens desta parte.
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'em_andamento') returning id into os_and;
  insert into ordens_servico (loja_id, cliente_id, status, tipo) values (loja_a, cliente, 'concluida', 'venda_balcao') returning id into venda;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'em_andamento') returning id into os_cent;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'em_andamento') returning id into os_dif;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'orcamento') returning id into orc;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'recusado') returning id into rec;
  insert into ordens_servico (loja_id, cliente_id, status, forma_pagamento, parcelas, data_fechamento)
    values (loja_a, cliente, 'faturada', 'Dinheiro', 1, now() - interval '1 hour') returning id into os_fat;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_b, cliente, 'em_andamento') returning id into os_b;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'em_andamento') returning id into os_rel;

  -- OS em andamento: 2 × 100 com 10 de desconto, mais um serviço de 40 = 230.
  insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario, desconto) values
    (os_and, 'peca', 'Pneu avulso', 2, 100, 10),
    (os_and, 'servico', 'Montagem', 1, 40, 0);
  -- Venda de balcão: 3 × 25,50 = 76,50.
  insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario) values
    (venda, 'peca', 'Válvula', 3, 25.50);
  -- Os centavos: um item de 0,30 (a tela soma 0,1 + 0,2).
  insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario) values
    (os_cent, 'peca', 'Bico', 1, 0.10),
    (os_cent, 'peca', 'Tampa', 1, 0.20);
  -- O do total diferente: 50 com 5 de desconto = 45.
  insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario, desconto) values
    (os_dif, 'servico', 'Alinhamento', 1, 50, 5);
  -- As demais: 50 cada.
  insert into ordens_servico_itens (ordem_servico_id, tipo, descricao, quantidade, preco_unitario) values
    (orc, 'servico', 'Alinhamento', 1, 50),
    (rec, 'servico', 'Alinhamento', 1, 50),
    (os_fat, 'servico', 'Alinhamento', 1, 50),
    (os_b, 'servico', 'Alinhamento', 1, 50),
    (os_rel, 'servico', 'Alinhamento', 1, 50);

  -- Daqui pra baixo, como o balconista A, sob a RLS.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_a::text, true);

  -- B. Fatura certo: OS em andamento (com o desconto descontado).
  perform marcar_ordem_faturada(os_and, 'Pix + Cartão de crédito', 3, 230, o_a);
  select status, forma_pagamento, parcelas, data_fechamento, atualizado_por_id into linha
    from ordens_servico where id = os_and;
  if linha.status <> 'faturada' or linha.forma_pagamento is distinct from 'Pix + Cartão de crédito'
     or linha.parcelas <> 3 or linha.data_fechamento is null
     or linha.data_fechamento < now() - interval '1 minute'
     or linha.atualizado_por_id is distinct from o_a then
    raise exception 'FALHOU (B1): a OS em andamento não ficou faturada como pedido (%)', linha;
  end if;

  -- B2. A venda de balcão (nasce concluída) também.
  perform marcar_ordem_faturada(venda, 'Dinheiro', 1, 76.50, o_a);
  select status, forma_pagamento, parcelas, data_fechamento, atualizado_por_id into linha
    from ordens_servico where id = venda;
  if linha.status <> 'faturada' or linha.forma_pagamento is distinct from 'Dinheiro'
     or linha.parcelas <> 1 or linha.data_fechamento is null or linha.atualizado_por_id is distinct from o_a then
    raise exception 'FALHOU (B2): a venda de balcão concluída não ficou faturada (%)', linha;
  end if;

  -- C. Total diferente: SK803, nada gravado.
  t := pg_temp.t803f_tentar(os_dif, 44.99, o_a);
  if t.codigo is distinct from 'SK803' or t.mensagem <> 'Esta OS mudou em outro computador. Atualize a tela e fature de novo.' then
    raise exception 'FALHOU (C1): total diferente devia dar SK803 (veio %: %)', t.codigo, t.mensagem;
  end if;
  -- C2. Sem total também.
  t := pg_temp.t803f_tentar(os_dif, null, o_a);
  if t.codigo is distinct from 'SK803' then
    raise exception 'FALHOU (C2): sem total devia dar SK803 (veio %: %)', t.codigo, t.mensagem;
  end if;
  -- C3. O total sem o desconto (50 em vez de 45) também é diferente.
  t := pg_temp.t803f_tentar(os_dif, 50, o_a);
  if t.codigo is distinct from 'SK803' then
    raise exception 'FALHOU (C3): o total sem o desconto devia dar SK803 (veio %: %)', t.codigo, t.mensagem;
  end if;
  select status, forma_pagamento, data_fechamento into linha from ordens_servico where id = os_dif;
  if linha.status <> 'em_andamento' or linha.forma_pagamento is not null or linha.data_fechamento is not null then
    raise exception 'FALHOU (C4): uma recusa por total gravou alguma coisa (%)', linha;
  end if;
  -- C5. A cauda de ponto flutuante da tela (0.1 + 0.2 = 0.30000000000000004)
  -- é aceita: a conta é no centavo.
  perform marcar_ordem_faturada(os_cent, 'Pix', 1, (0.1::float8 + 0.2::float8)::numeric, o_a);
  if (select status from ordens_servico where id = os_cent) <> 'faturada' then
    raise exception 'FALHOU (C5): 0.1 + 0.2 contra um total de 0,30 devia faturar';
  end if;

  -- D. Recusas pela situação: orçamento, recusado, já faturada.
  t := pg_temp.t803f_tentar(orc, 50, o_a);
  if t.mensagem is distinct from 'Orçamento não é faturado: aprove o orçamento antes (ele vira OS).' then
    raise exception 'FALHOU (D1): orçamento devia ser recusado (veio %: %)', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t803f_tentar(rec, 50, o_a);
  if t.mensagem is distinct from 'Orçamento não é faturado: aprove o orçamento antes (ele vira OS).' then
    raise exception 'FALHOU (D2): recusado devia ser recusado (veio %: %)', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t803f_tentar(os_fat, 50, o_a);
  if t.mensagem is distinct from 'Esta OS já foi faturada (talvez em outro computador). Atualize a lista.' then
    raise exception 'FALHOU (D3): OS já faturada devia ser recusada (veio %: %)', t.codigo, t.mensagem;
  end if;
  if (select status from ordens_servico where id = orc) <> 'orcamento'
     or (select status from ordens_servico where id = rec) <> 'recusado'
     or (select forma_pagamento from ordens_servico where id = orc) is not null
     or (select forma_pagamento from ordens_servico where id = os_fat) is distinct from 'Dinheiro'
     or (select data_fechamento from ordens_servico where id = os_fat) > now() - interval '30 minutes'
     or (select atualizado_por_id from ordens_servico where id = os_fat) is not null then
    raise exception 'FALHOU (D4): uma recusa pela situação mexeu na ordem';
  end if;

  -- E. OS de outra loja (fora da RLS do A) e ordem que não existe: "não
  -- encontrada".
  t := pg_temp.t803f_tentar(os_b, 50, o_a);
  if t.mensagem is distinct from 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.' then
    raise exception 'FALHOU (E1): o balconista A faturou (ou quase) uma OS da loja B (veio %: %)', t.codigo, t.mensagem;
  end if;
  t := pg_temp.t803f_tentar(inexistente, 50, o_a);
  if t.mensagem is distinct from 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.' then
    raise exception 'FALHOU (E2): ordem que não existe devia dar "não encontrada" (veio %: %)', t.codigo, t.mensagem;
  end if;

  -- E3. Quem só tem Relatórios lê a OS mas não grava: não fatura. O `for
  -- update` também passa pela policy de alteração, então pra ele a ordem
  -- "não foi encontrada".
  perform set_config('request.jwt.claim.sub', o_r::text, true);
  if not exists (select 1 from ordens_servico where id = os_rel) then
    raise exception 'FALHOU (E3a): quem só tem Relatórios devia enxergar a OS (o preparo mudou?)';
  end if;
  t := pg_temp.t803f_tentar(os_rel, 50, o_r);
  if t.mensagem is distinct from 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.' then
    raise exception 'FALHOU (E3): quem só tem Relatórios não podia faturar (veio %: %)', t.codigo, t.mensagem;
  end if;

  reset role;
  if (select status from ordens_servico where id = os_b) <> 'em_andamento'
     or (select forma_pagamento from ordens_servico where id = os_b) is not null then
    raise exception 'FALHOU (E4): a OS da loja B mudou';
  end if;
  if (select status from ordens_servico where id = os_rel) <> 'em_andamento' then
    raise exception 'FALHOU (E5): a OS ficou faturada por quem só tem Relatórios';
  end if;
end $$;

-- ===================================================================
-- Partes 3, 4 e 5: dois computadores ao mesmo tempo (dblink)
-- ===================================================================
-- O computador 1 ("um") começa uma transação, chama uma função e NÃO
-- termina — a linha da ordem fica presa. O computador 2 ("dois") chama a
-- outra função na mesma ordem, sem esperar a resposta (dblink_send_query).
-- Conferimos que o dois ficou ESPERANDO; o um termina (commit); o dois
-- entra, e o resultado final tem de ser o certo.

create function pg_temp.t803f_abrir(p_nome text, p_operador uuid)
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
create function pg_temp.t803f_esperando(p_pid int)
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

-- Pega a resposta do "dois": o código do erro (null se passou) e a mensagem.
-- O dblink repassa o código e a mensagem do outro lado. Depois esvazia a fila
-- e termina a transação do dois (rollback se deu erro, commit se passou).
create function pg_temp.t803f_resposta_do_dois(out codigo text, out mensagem text)
language plpgsql
as $$
begin
  begin
    perform * from dblink_get_result('dois') as t(x text);
    codigo := null;
    mensagem := null;
  exception when others then
    codigo := sqlstate;
    mensagem := sqlerrm;
  end;
  perform * from dblink_get_result('dois') as t(x text);
  if codigo is null then
    perform dblink_exec('dois', 'commit');
  else
    perform dblink_exec('dois', 'rollback');
  end if;
end;
$$;

-- ===================================================================
-- Parte 3: um ACRESCENTA uma peça enquanto dois FATURA com o total de antes
-- — o faturamento é recusado (SK803) e a OS não fica faturada (vigia o
-- `for update` de marcar_ordem_faturada)
-- ===================================================================
-- Sem a trava, o dois somava os itens sem a peça nova (o um ainda não tinha
-- terminado), achava que o total batia, esperava só no `update` final e
-- faturava pelo total velho depois do commit do um: o Caixa recebia 200 e a
-- OS ficava com 250 (o caso 2 da #803).

do $$
declare
  o_a  uuid := '08861111-0000-0000-0000-00000000000a';
  os   uuid := '08864444-0000-0000-0000-000000000001';
  pid_dois int;
  t record;
  linha record;
begin
  perform pg_temp.t803f_abrir('um', o_a);
  pid_dois := pg_temp.t803f_abrir('dois', o_a);

  perform * from dblink('um', format(
    'select adicionar_itens_ordem(%L, %L::jsonb, %L)',
    os, '[{"tipo": "peca", "peca_id": null, "descricao": "Válvula avulsa", "quantidade": 1, "preco_unitario": 50}]', o_a))
    as r(x text);

  perform dblink_send_query('dois', format(
    'select marcar_ordem_faturada(%L, %L, %s, %s, %L)', os, 'Pix', 1, 200, o_a));
  if not pg_temp.t803f_esperando(pid_dois) then
    raise exception 'FALHOU (3a): faturar não esperou o item acabar de entrar';
  end if;

  perform dblink_exec('um', 'commit');
  t := pg_temp.t803f_resposta_do_dois();
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  select status, forma_pagamento, data_fechamento into linha from ordens_servico where id = os;
  if t.codigo is distinct from 'SK803' or linha.status <> 'em_andamento'
     or linha.forma_pagamento is not null or linha.data_fechamento is not null
     or (select count(*) from ordens_servico_itens where ordem_servico_id = os) <> 2 then
    raise exception 'FALHOU (3b): o faturamento com o total de antes devia ser recusado (SK803) e a OS continuar em andamento com 2 itens. Veio: % (%), OS: %',
      t.codigo, t.mensagem, linha;
  end if;
end $$;

-- ===================================================================
-- Parte 4: um CORRIGE o preço de um item enquanto dois FATURA com o total
-- de antes — recusado do mesmo jeito
-- ===================================================================

do $$
declare
  o_a  uuid := '08861111-0000-0000-0000-00000000000a';
  os   uuid := '08864444-0000-0000-0000-000000000002';
  item uuid := '08866666-0000-0000-0000-000000000002';
  pid_dois int;
  t record;
begin
  perform pg_temp.t803f_abrir('um', o_a);
  pid_dois := pg_temp.t803f_abrir('dois', o_a);

  perform * from dblink('um', format(
    'select editar_item_ordem(%L, %L::jsonb, %L)', item, '{"preco_unitario": 110}', o_a))
    as r(x text);

  perform dblink_send_query('dois', format(
    'select marcar_ordem_faturada(%L, %L, %s, %s, %L)', os, 'Pix', 1, 200, o_a));
  if not pg_temp.t803f_esperando(pid_dois) then
    raise exception 'FALHOU (4a): faturar não esperou a correção do item terminar';
  end if;

  perform dblink_exec('um', 'commit');
  t := pg_temp.t803f_resposta_do_dois();
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  if t.codigo is distinct from 'SK803'
     or (select status from ordens_servico where id = os) <> 'em_andamento'
     or (select preco_unitario from ordens_servico_itens where id = item) <> 110 then
    raise exception 'FALHOU (4b): faturar com o total de antes da correção devia ser recusado (veio %: %)',
      t.codigo, t.mensagem;
  end if;
end $$;

-- ===================================================================
-- Parte 5: um FATURA enquanto dois ACRESCENTA — o item é recusado ("já foi
-- faturada", da 0071) e a OS fica faturada com os itens de antes (vigia a
-- ordem inversa)
-- ===================================================================

do $$
declare
  o_a  uuid := '08861111-0000-0000-0000-00000000000a';
  os   uuid := '08864444-0000-0000-0000-000000000003';
  pid_dois int;
  t record;
begin
  perform pg_temp.t803f_abrir('um', o_a);
  pid_dois := pg_temp.t803f_abrir('dois', o_a);

  perform * from dblink('um', format(
    'select marcar_ordem_faturada(%L, %L, %s, %s, %L)', os, 'Pix', 1, 200, o_a))
    as r(x text);

  perform dblink_send_query('dois', format(
    'select adicionar_itens_ordem(%L, %L::jsonb, %L)',
    os, '[{"tipo": "peca", "peca_id": null, "descricao": "Válvula avulsa", "quantidade": 1, "preco_unitario": 50}]', o_a));
  if not pg_temp.t803f_esperando(pid_dois) then
    raise exception 'FALHOU (5a): acrescentar não esperou o faturamento terminar';
  end if;

  perform dblink_exec('um', 'commit');
  t := pg_temp.t803f_resposta_do_dois();
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  if t.mensagem is distinct from 'Esta OS já foi faturada (talvez em outro computador): não dá mais pra acrescentar ou corrigir peça ou serviço nela. Atualize a OS.'
     or (select status from ordens_servico where id = os) <> 'faturada'
     or (select count(*) from ordens_servico_itens where ordem_servico_id = os) <> 1 then
    raise exception 'FALHOU (5b): acrescentar depois do faturamento devia ser recusado e a OS ficar faturada com 1 item (veio %: %)',
      t.codigo, t.mensagem;
  end if;
end $$;

-- ===================================================================
-- Limpeza
-- ===================================================================

do $$
declare
  lojas_teste uuid[] := array['08860000-0000-0000-0000-00000000000a',
                              '08860000-0000-0000-0000-00000000000b']::uuid[];
  operadores_teste uuid[] := array['08861111-0000-0000-0000-00000000000a',
                                   '08861111-0000-0000-0000-00000000000b',
                                   '08861111-0000-0000-0000-00000000000c']::uuid[];
begin
  delete from estoque_movimentos where loja_id = any (lojas_teste);
  delete from ordens_servico where loja_id = any (lojas_teste);
  delete from depositos where loja_id = any (lojas_teste);
  delete from operador_lojas where operador_id = any (operadores_teste);
  delete from operadores where id = any (operadores_teste);
  delete from clientes where id = '08862222-0000-0000-0000-000000000001';
  delete from lojas where id = any (lojas_teste);

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

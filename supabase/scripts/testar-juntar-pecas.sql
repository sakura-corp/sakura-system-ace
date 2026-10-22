-- Sakura System — AutoCenter Edition
-- TESTE da migration 0067 (juntar peças repetidas, tarefa #656). NÃO é
-- migration, e NUNCA deve ser rodado no Supabase de verdade — grava e apaga
-- dado de teste.
--
-- A promessa:
--   • só administrador junta, e só quem administra TODAS as lojas onde a peça
--     que vai sumir aparece — recusado, nada muda;
--   • a prévia bate: depois de juntar, a peça que fica tem a soma das linhas
--     das duas, e o saldo de cada loja é a soma dos dois saldos;
--   • nenhuma tabela do banco fica apontando pra peça que sumiu (conferido
--     pelo catálogo do banco, não por uma lista fixa — uma tabela nova entra
--     sozinha na checagem);
--   • uma terceira peça, que não tem nada com a junção, fica intocada;
--   • os campos escolhidos vêm da peça que sai, o resto continua da que fica,
--     e campo fora da lista é recusado;
--   • a trilha de auditoria guarda a peça que sumiu inteira, quem juntou e
--     uma linha da junção com os ids de tudo que era da peça que sumiu;
--   • prévia velha não passa: se os números mudaram desde a prévia que a
--     tela mostrou, a junção é recusada e nada muda;
--   • TUDO OU NADA: uma falha no meio da junção não deixa nada mudado.
--
-- Como rodar: ver o cabeçalho de supabase/scripts/testar-auditoria.sql.
-- Terminou imprimindo "TODAS AS CHECAGENS PASSARAM", passou.

-- "Retrato" do banco: tudo que a junção pode mexer, num número só. Se o
-- retrato antes e depois de uma tentativa recusada for igual, nada mudou.
-- (pg_temp: some no fim da sessão.)
create or replace function pg_temp.retrato()
returns text
language sql
as $$
  select md5(
    coalesce((select string_agg(to_jsonb(t)::text, '|' order by t.id) from pecas t), '') || '#' ||
    coalesce((select string_agg(to_jsonb(t)::text, '|' order by t.id) from estoque_movimentos t), '') || '#' ||
    coalesce((select string_agg(to_jsonb(t)::text, '|' order by t.id) from contagens_estoque t), '') || '#' ||
    coalesce((select string_agg(to_jsonb(t)::text, '|' order by t.id) from ordens_servico_itens t), '') || '#' ||
    coalesce((select string_agg(to_jsonb(t)::text, '|' order by t.id) from pedidos_compra_itens t), '') || '#' ||
    coalesce((select string_agg(to_jsonb(t)::text, '|' order by t.id) from cotacoes_pecas t), '')
  );
$$;

-- A falha de propósito do teste de "tudo ou nada". Só dispara quando o
-- próprio teste liga o trigger, lá embaixo.
create or replace function teste_juntar_falha_no_meio()
returns trigger
language plpgsql
as $$
begin
  raise exception 'falha de propósito no meio da junção';
end;
$$;

do $$
declare
  -- duas lojas: o nome da 2 vem antes no alfabeto, pra provar a ordem da prévia
  loja1    uuid := '65600000-0000-0000-0000-0000000000a1';  -- "Juntar Zeta"
  loja2    uuid := '65600000-0000-0000-0000-0000000000a2';  -- "Juntar Alfa"
  dep1     uuid := '65600000-0000-0000-0000-0000000000d1';
  dep2     uuid := '65600000-0000-0000-0000-0000000000d2';
  o_admin2 uuid := '65601111-0000-0000-0000-000000000001';  -- admin das duas
  o_admin1 uuid := '65601111-0000-0000-0000-000000000002';  -- admin só da loja 1
  o_comum  uuid := '65601111-0000-0000-0000-000000000003';  -- não é admin
  cliente  uuid := '65602222-0000-0000-0000-000000000001';
  fornec   uuid := '65602222-0000-0000-0000-000000000002';
  os1      uuid := '65603333-0000-0000-0000-000000000001';  -- loja 1: item da A, da B e um serviço
  os2      uuid := '65603333-0000-0000-0000-000000000002';  -- loja 2: item da B
  pc1      uuid := '65604444-0000-0000-0000-000000000001';  -- loja 1: item da A e da B
  pc2      uuid := '65604444-0000-0000-0000-000000000002';  -- loja 2: item da B
  peca_a   uuid := '65605555-0000-0000-0000-00000000000a';  -- fica
  peca_b   uuid := '65605555-0000-0000-0000-00000000000b';  -- sai
  peca_c   uuid := '65605555-0000-0000-0000-00000000000c';  -- testemunha
  peca_d   uuid := '65605555-0000-0000-0000-00000000000d';  -- só na loja 1

  retrato_antes text;
  resumo_a   jsonb;
  resumo_b   jsonb;
  resumo_c   jsonb;
  depois     jsonb;
  devolvido  jsonb;
  peca_c_antes jsonb;
  linha      record;
  k          text;
  quantas    int;
  fks        int;
  resta      boolean;
  ids_mov    uuid[];
  ids_cont   uuid[];
  ids_os     uuid[];
  ids_pc     uuid[];
  ids_cot    uuid[];
  peca_final record;
  esperado   jsonb;
  audit_antes uuid[];
  extra_mov  uuid := '65606666-0000-0000-0000-000000000001';
begin
  -- =====================================================================
  -- Preparo (como dono do banco: sem RLS)
  -- =====================================================================
  insert into lojas (id, nome, cidade, uf) values
    (loja1, 'Juntar Zeta', 'Araraquara', 'SP'),
    (loja2, 'Juntar Alfa', 'Araraquara', 'SP');
  insert into depositos (id, loja_id, nome) values
    (dep1, loja1, 'Principal'), (dep2, loja2, 'Principal');

  insert into auth.users (id) values (o_admin2), (o_admin1), (o_comum);
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_admin2, 'jp_admin2', 'Admin das duas (juntar)', true,  array['inicio'], true),
    (o_admin1, 'jp_admin1', 'Admin da loja 1 (juntar)', true, array['inicio'], true),
    (o_comum,  'jp_comum',  'Operador comum (juntar)', false, array['inicio', 'estoque'], true);
  insert into operador_lojas (operador_id, loja_id) values
    (o_admin2, loja1), (o_admin2, loja2),
    (o_admin1, loja1),
    (o_comum, loja1), (o_comum, loja2);

  insert into clientes (id, nome) values (cliente, 'Cliente (juntar)');
  insert into fornecedores (id, nome) values (fornec, 'Fornecedor (juntar)');

  insert into pecas (id, codigo_interno, codigo_barras, descricao, marca, ncm, preco_custo, preco_venda, medida, dot, ativo) values
    (peca_a, 'A-1', '111', 'Pneu 175/70 R13 (A)', 'Marca A', '40111000', 200, 300, '175/70 R13', null, false),
    (peca_b, 'B-1', '222', 'PNEU 175 70 13 (B)', 'Marca B', '40119090', 210, 320, null, '3823', true),
    (peca_c, 'C-1', '333', 'Câmara de ar (C)', 'Marca C', '40131000', 20, 35, null, null, true),
    (peca_d, 'D-1', '444', 'Válvula (D)', 'Marca D', '40169990', 2, 5, null, null, true);

  -- movimentos — A: loja 1 = 10 − 3 = 7, loja 2 = 5. B: loja 1 = 4, loja 2 = 2 − 1 = 1.
  insert into estoque_movimentos (peca_id, tipo, quantidade, motivo, loja_id, deposito_id) values
    (peca_a, 'entrada', 10, 'compra', loja1, dep1),
    (peca_a, 'saida',    3, 'venda',  loja1, dep1),
    (peca_a, 'entrada',  5, 'compra', loja2, dep2),
    (peca_b, 'entrada',  4, 'compra', loja1, dep1),
    (peca_b, 'entrada',  2, 'compra', loja2, dep2),
    (peca_b, 'saida',    1, 'ajuste', loja2, dep2),
    (peca_c, 'entrada',  9, 'compra', loja1, dep1),
    (peca_d, 'entrada',  6, 'compra', loja1, dep1);

  insert into contagens_estoque (peca_id, quantidade_contada, saldo_sistema, diferenca, loja_id, deposito_id) values
    (peca_a, 7, 7, 0, loja1, dep1),
    (peca_b, 1, 1, 0, loja2, dep2),
    (peca_c, 9, 9, 0, loja1, dep1);

  insert into ordens_servico (id, loja_id, cliente_id) values (os1, loja1, cliente), (os2, loja2, cliente);
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario) values
    (os1, 'peca', peca_a, 'Pneu A', 1, 300),
    (os1, 'peca', peca_b, 'Pneu B', 1, 320),
    (os1, 'servico', null, 'Montagem', 1, 20),
    (os2, 'peca', peca_b, 'Pneu B', 2, 320),
    (os2, 'peca', peca_c, 'Câmara', 1, 35);

  insert into pedidos_compra (id, loja_id, fornecedor_id) values (pc1, loja1, fornec), (pc2, loja2, fornec);
  insert into pedidos_compra_itens (pedido_compra_id, peca_id, quantidade_pedida, preco_unitario) values
    (pc1, peca_a, 4, 200),
    (pc1, peca_b, 4, 210),
    (pc2, peca_b, 2, 210),
    (pc2, peca_c, 5, 20);

  insert into cotacoes_pecas (peca_id, fornecedor_id, preco) values
    (peca_a, fornec, 200),
    (peca_b, fornec, 210),
    (peca_b, fornec, 205),
    (peca_c, fornec, 20);

  select array_agg(id) into ids_mov  from estoque_movimentos   where peca_id = peca_b;
  select array_agg(id) into ids_cont from contagens_estoque    where peca_id = peca_b;
  select array_agg(id) into ids_os   from ordens_servico_itens where peca_id = peca_b;
  select array_agg(id) into ids_pc   from pedidos_compra_itens where peca_id = peca_b;
  select array_agg(id) into ids_cot  from cotacoes_pecas       where peca_id = peca_b;
  select to_jsonb(p) into peca_c_antes from pecas p where id = peca_c;

  -- =====================================================================
  -- 0. Quem não está logado não chama nem a prévia
  -- =====================================================================
  if has_function_privilege('anon', 'juntar_pecas(uuid, uuid, text[], jsonb)', 'execute')
     or has_function_privilege('anon', 'resumo_peca_para_juntar(uuid)', 'execute') then
    raise exception 'FALHOU: o anon (sem login) consegue chamar as funções de juntar peças';
  end if;
  if not has_function_privilege('authenticated', 'juntar_pecas(uuid, uuid, text[], jsonb)', 'execute') then
    raise exception 'FALHOU: quem está logado não consegue chamar juntar_pecas';
  end if;

  retrato_antes := pg_temp.retrato();

  -- =====================================================================
  -- 1. Operador comum é recusado (na prévia e na junção) e nada muda
  -- =====================================================================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_comum::text, true);

  begin
    perform resumo_peca_para_juntar(peca_b);
    raise exception 'FALHOU: o operador comum viu a prévia de juntar';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Só um administrador pode juntar peças.%' then
      raise exception 'FALHOU: recusa do comum com a mensagem errada: %', sqlerrm;
    end if;
  end;

  begin
    perform juntar_pecas(peca_a, peca_b, '{}');
    raise exception 'FALHOU: o operador comum juntou peças';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Só um administrador pode juntar peças.%' then
      raise exception 'FALHOU: recusa do comum com a mensagem errada: %', sqlerrm;
    end if;
  end;

  -- =====================================================================
  -- 2. Admin só da loja 1: a B aparece na loja 2 → prévia sem números,
  --    junção recusada, nada muda
  -- =====================================================================
  perform set_config('request.jwt.claim.sub', o_admin1::text, true);

  resumo_b := resumo_peca_para_juntar(peca_b);
  if resumo_b <> '{"lojas_sem_acesso": 1}'::jsonb then
    raise exception 'FALHOU: a prévia pro admin de uma loja só devia ser só {"lojas_sem_acesso": 1}, veio %', resumo_b;
  end if;

  begin
    perform juntar_pecas(peca_a, peca_b, '{descricao}');
    raise exception 'FALHOU: o admin só da loja 1 juntou uma peça que tem histórico na loja 2';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like '%1 loja(s) que você não administra%' then
      raise exception 'FALHOU: recusa do admin de uma loja com a mensagem errada: %', sqlerrm;
    end if;
  end;

  -- A que FICA também conta: a D só aparece na loja 1, mas a A tem histórico
  -- na loja 2 — juntar mudaria o cadastro da peça que a loja 2 usa.
  begin
    perform juntar_pecas(peca_a, peca_d, '{descricao}');
    raise exception 'FALHOU: o admin só da loja 1 juntou numa peça que fica e tem histórico na loja 2';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like '%peça que fica tem histórico em 1 loja(s) que você não administra%' then
      raise exception 'FALHOU: recusa da peça que fica com a mensagem errada: %', sqlerrm;
    end if;
  end;

  reset role;
  if pg_temp.retrato() <> retrato_antes then
    raise exception 'FALHOU: uma tentativa recusada (comum ou admin de uma loja) mudou alguma coisa';
  end if;

  -- =====================================================================
  -- 3. A prévia, como admin das duas lojas
  -- =====================================================================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);

  resumo_a := resumo_peca_para_juntar(peca_a);
  resumo_b := resumo_peca_para_juntar(peca_b);
  resumo_c := resumo_peca_para_juntar(peca_c);

  if resumo_a <> jsonb_build_object(
       'lojas_sem_acesso', 0, 'movimentos', 3, 'itens_os', 1, 'os', 1, 'contagens', 1,
       'itens_compra', 1, 'compras', 1, 'cotacoes', 1,
       'estoque', jsonb_build_array(
         jsonb_build_object('loja_id', loja2, 'loja_nome', 'Juntar Alfa', 'saldo', 5),
         jsonb_build_object('loja_id', loja1, 'loja_nome', 'Juntar Zeta', 'saldo', 7)))
  then
    raise exception 'FALHOU: a prévia da peça A veio diferente do esperado: %', resumo_a;
  end if;

  if resumo_b <> jsonb_build_object(
       'lojas_sem_acesso', 0, 'movimentos', 3, 'itens_os', 2, 'os', 2, 'contagens', 1,
       'itens_compra', 2, 'compras', 2, 'cotacoes', 2,
       'estoque', jsonb_build_array(
         jsonb_build_object('loja_id', loja2, 'loja_nome', 'Juntar Alfa', 'saldo', 1),
         jsonb_build_object('loja_id', loja1, 'loja_nome', 'Juntar Zeta', 'saldo', 4)))
  then
    raise exception 'FALHOU: a prévia da peça B veio diferente do esperado: %', resumo_b;
  end if;

  -- =====================================================================
  -- 4. Recusas que não mudam nada: campo fora da lista e a mesma peça
  -- =====================================================================
  foreach k in array array['id', 'ativo', 'criado_em', 'descricao = ''x'', ncm', ''] loop
    begin
      perform juntar_pecas(peca_a, peca_b, array['descricao', k]);
      raise exception 'FALHOU: aceitou trazer o campo "%" da peça que sai', k;
    exception when raise_exception then
      if sqlerrm like 'FALHOU%' then raise; end if;
      if sqlerrm not like 'O campo "%" não pode ser trazido da peça que vai sumir.' then
        raise exception 'FALHOU: recusa do campo "%" com a mensagem errada: %', k, sqlerrm;
      end if;
    end;
  end loop;

  begin
    perform juntar_pecas(peca_a, null, '{}');
    raise exception 'FALHOU: aceitou juntar com a peça que sai vazia';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  begin
    perform juntar_pecas(peca_a, peca_a, '{}');
    raise exception 'FALHOU: aceitou juntar uma peça com ela mesma';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Escolha duas peças diferentes%' then
      raise exception 'FALHOU: recusa da mesma peça com a mensagem errada: %', sqlerrm;
    end if;
  end;

  begin
    perform juntar_pecas(peca_a, '65605555-0000-0000-0000-0000000000ff', '{}');
    raise exception 'FALHOU: aceitou juntar com uma peça que não existe';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Uma das peças não existe mais%' then
      raise exception 'FALHOU: recusa da peça inexistente com a mensagem errada: %', sqlerrm;
    end if;
  end;

  reset role;
  if pg_temp.retrato() <> retrato_antes then
    raise exception 'FALHOU: uma tentativa recusada (campo, mesma peça, peça inexistente) mudou alguma coisa';
  end if;

  -- =====================================================================
  -- 5. TUDO OU NADA: uma falha no último passo desfaz todos os anteriores
  -- =====================================================================
  -- A falha é no `delete` da peça que sai — o último passo da função, depois
  -- de atualizar a peça que fica, repor as CINCO tabelas e gravar a linha da
  -- junção na auditoria. Se tudo isso volta, a junção é mesmo tudo ou nada.
  create trigger teste_juntar_falha
    before delete on pecas
    for each row execute function teste_juntar_falha_no_meio();

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  begin
    perform juntar_pecas(peca_a, peca_b, '{descricao, codigo_barras}');
    raise exception 'FALHOU: a junção terminou como se nada fosse, mesmo com uma falha no meio';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'falha de propósito no meio da junção%' then
      raise exception 'FALHOU: esperava a falha de propósito, veio: %', sqlerrm;
    end if;
  end;
  reset role;

  drop trigger teste_juntar_falha on pecas;

  if not exists (select 1 from pecas where id = peca_b) then
    raise exception 'FALHOU: depois da falha no meio, a peça B sumiu';
  end if;
  select count(*) into quantas from estoque_movimentos where peca_id = peca_b;
  if quantas <> 3 then
    raise exception 'FALHOU: depois da falha no meio, a peça B ficou com % movimentos (eram 3)', quantas;
  end if;
  select count(*) into quantas from ordens_servico_itens where peca_id = peca_b;
  if quantas <> 2 then
    raise exception 'FALHOU: depois da falha no meio, a peça B ficou com % itens de OS (eram 2)', quantas;
  end if;
  select count(*) into quantas from pedidos_compra_itens where peca_id = peca_b;
  if quantas <> 2 then
    raise exception 'FALHOU: depois da falha no meio, a peça B ficou com % itens de compra (eram 2)', quantas;
  end if;
  select count(*) into quantas from cotacoes_pecas where peca_id = peca_b;
  if quantas <> 2 then
    raise exception 'FALHOU: depois da falha no meio, a peça B ficou com % cotações (eram 2)', quantas;
  end if;
  select count(*) into quantas from contagens_estoque where peca_id = peca_b;
  if quantas <> 1 then
    raise exception 'FALHOU: depois da falha no meio, a peça B ficou com % contagens (era 1)', quantas;
  end if;
  if pg_temp.retrato() <> retrato_antes then
    raise exception 'FALHOU: a falha no meio da junção deixou alguma coisa mudada';
  end if;
  if exists (select 1 from auditoria where tabela = 'pecas' and registro_id = peca_b and acao = 'excluir') then
    raise exception 'FALHOU: a falha no meio deixou rastro de exclusão da B na auditoria';
  end if;
  if exists (select 1 from auditoria where tabela = 'pecas' and dados_antes ? 'juntada') then
    raise exception 'FALHOU: a falha no meio deixou a linha da junção na auditoria';
  end if;
  if exists (select 1 from auditoria where tabela = 'pecas' and registro_id = peca_a and acao = 'atualizar') then
    raise exception 'FALHOU: a falha no meio deixou o "atualizar" da A na auditoria';
  end if;

  -- =====================================================================
  -- 5b. PRÉVIA VELHA: os números mudaram depois da prévia → recusa, nada muda
  -- =====================================================================
  -- a prévia leva também os campos que a tela mostrou de cada peça (o
  -- listarPecas() de quando abriu): a linha inteira, como o programa manda
  esperado := jsonb_build_object(
    'fica', resumo_a || jsonb_build_object('peca', (select to_jsonb(p) from pecas p where p.id = peca_a)),
    'sai',  resumo_b || jsonb_build_object('peca', (select to_jsonb(p) from pecas p where p.id = peca_b)));

  -- os updates de "outro computador" abaixo deixam linha na auditoria; elas
  -- são apagadas no fim deste bloco, pra não contar nas checagens da seção 6
  audit_antes := array(select id from auditoria);

  -- outro computador muda o preço da B (de 320 pra 350) depois da prévia: a
  -- pessoa escolheu "R$ 320,00", então juntar gravaria um preço que ela não viu
  update pecas set preco_venda = 350 where id = peca_b;
  retrato_antes := pg_temp.retrato();
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  begin
    perform juntar_pecas(peca_a, peca_b, '{preco_venda}', esperado);
    raise exception 'FALHOU: juntou com o preço da B mudado depois da prévia';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Os dados das peças mudaram desde a prévia%' then
      raise exception 'FALHOU: recusa do preço mudado com a mensagem errada: %', sqlerrm;
    end if;
  end;
  reset role;
  if pg_temp.retrato() <> retrato_antes then
    raise exception 'FALHOU: a junção recusada por preço mudado mudou alguma coisa';
  end if;
  update pecas set preco_venda = 320 where id = peca_b;

  -- a que fica também: a descrição da A mudou depois da prévia → recusa
  update pecas set descricao = 'Pneu A renomeado' where id = peca_a;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  begin
    perform juntar_pecas(peca_a, peca_b, '{}', esperado);
    raise exception 'FALHOU: juntou com a descrição da A mudada depois da prévia';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Os dados das peças mudaram desde a prévia%' then
      raise exception 'FALHOU: recusa da descrição mudada com a mensagem errada: %', sqlerrm;
    end if;
  end;
  reset role;
  update pecas set descricao = 'Pneu 175/70 R13 (A)' where id = peca_a;

  -- prévia sem os campos da peça: não dá pra garantir o que a pessoa viu → recusa
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  begin
    perform juntar_pecas(peca_a, peca_b, '{}', esperado #- '{sai,peca}');
    raise exception 'FALHOU: juntou com uma prévia sem os campos da peça';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Os dados das peças mudaram desde a prévia%' then
      raise exception 'FALHOU: recusa da prévia sem campos com a mensagem errada: %', sqlerrm;
    end if;
  end;
  reset role;
  delete from auditoria where not (id = any (audit_antes));

  -- outro computador lança um movimento da B depois da prévia
  insert into estoque_movimentos (id, peca_id, tipo, quantidade, motivo, loja_id, deposito_id)
    values (extra_mov, peca_b, 'entrada', 1, 'compra', loja1, dep1);
  retrato_antes := pg_temp.retrato();

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  begin
    perform juntar_pecas(peca_a, peca_b, '{descricao}', esperado);
    raise exception 'FALHOU: juntou com a prévia velha (a B ganhou um movimento depois)';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Os números das peças mudaram desde a prévia%' then
      raise exception 'FALHOU: recusa da prévia velha com a mensagem errada: %', sqlerrm;
    end if;
  end;
  reset role;
  if pg_temp.retrato() <> retrato_antes then
    raise exception 'FALHOU: a junção recusada por prévia velha mudou alguma coisa';
  end if;

  delete from estoque_movimentos where id = extra_mov;
  retrato_antes := pg_temp.retrato();

  -- mesma contagem de linhas, só o saldo de uma loja diferente na prévia: recusa
  -- (prova que o saldo é conferido por si, não só as contagens)
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  begin
    perform juntar_pecas(peca_a, peca_b, '{}',
      jsonb_set(esperado, '{fica,estoque,0,saldo}', '99'::jsonb));
    raise exception 'FALHOU: juntou com o saldo da prévia diferente do de agora';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Os números das peças mudaram desde a prévia%' then
      raise exception 'FALHOU: recusa do saldo diferente com a mensagem errada: %', sqlerrm;
    end if;
  end;
  -- prévia ilegível (número torto): recusa também, com a mesma frase
  begin
    perform juntar_pecas(peca_a, peca_b, '{}',
      jsonb_set(esperado, '{sai,movimentos}', '"três"'::jsonb));
    raise exception 'FALHOU: juntou com uma prévia ilegível';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    if sqlerrm not like 'Os números das peças mudaram desde a prévia%' then
      raise exception 'FALHOU: recusa da prévia ilegível com a mensagem errada: %', sqlerrm;
    end if;
  end;
  reset role;
  if pg_temp.retrato() <> retrato_antes then
    raise exception 'FALHOU: uma junção recusada por prévia diferente mudou alguma coisa';
  end if;

  -- =====================================================================
  -- 6. A junção de verdade, como admin das duas lojas
  -- =====================================================================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);

  -- com a prévia certa — e com números como o programa pode mandar
  -- ("3.00" em texto, saldo "4.00"): conferência é por número, não por texto
  -- e o preço como o PostgREST às vezes manda (texto "320.00", ou 320 sem
  -- casas): campo de número é conferido como número
  esperado := jsonb_set(jsonb_set(esperado, '{sai,movimentos}', '"3.00"'::jsonb),
                        '{sai,estoque,1,saldo}', '"4.00"'::jsonb);
  esperado := jsonb_set(jsonb_set(esperado, '{sai,peca,preco_venda}', '"320.00"'::jsonb),
                        '{fica,peca,preco_venda}', '300'::jsonb);
  devolvido := juntar_pecas(peca_a, peca_b,
    array['descricao', 'codigo_barras', 'preco_venda', 'dot', 'medida', 'descricao'], esperado);
  depois := resumo_peca_para_juntar(peca_a);

  if devolvido <> depois then
    raise exception 'FALHOU: juntar_pecas devolveu % mas a prévia da A depois é %', devolvido, depois;
  end if;

  -- a prévia bate: cada contagem de linhas é a soma das duas
  foreach k in array array['movimentos', 'itens_os', 'contagens', 'itens_compra', 'cotacoes'] loop
    if (depois ->> k)::int <> (resumo_a ->> k)::int + (resumo_b ->> k)::int then
      raise exception 'FALHOU: "%" depois da junção é %, mas a prévia somava % + %',
        k, depois ->> k, resumo_a ->> k, resumo_b ->> k;
    end if;
  end loop;
  -- OS e pedidos distintos: a OS 1 e o pedido 1 tinham as duas peças, então
  -- não é soma — são 2 de cada.
  if (depois ->> 'os')::int <> 2 or (depois ->> 'compras')::int <> 2 then
    raise exception 'FALHOU: esperava 2 OS e 2 pedidos na A depois, veio % e %', depois ->> 'os', depois ->> 'compras';
  end if;
  if (depois ->> 'lojas_sem_acesso')::int <> 0 then
    raise exception 'FALHOU: lojas_sem_acesso devia ser 0 pro admin das duas: %', depois;
  end if;

  -- o saldo de cada loja é a soma dos dois saldos da prévia
  if jsonb_array_length(depois -> 'estoque') <> 2 then
    raise exception 'FALHOU: esperava saldo em 2 lojas depois da junção: %', depois -> 'estoque';
  end if;
  for linha in
    select e ->> 'loja_id' as loja, (e ->> 'saldo')::numeric as saldo from jsonb_array_elements(depois -> 'estoque') e
  loop
    if linha.saldo <>
       coalesce((select sum((x ->> 'saldo')::numeric) from jsonb_array_elements(resumo_a -> 'estoque') x where x ->> 'loja_id' = linha.loja), 0)
     + coalesce((select sum((x ->> 'saldo')::numeric) from jsonb_array_elements(resumo_b -> 'estoque') x where x ->> 'loja_id' = linha.loja), 0)
    then
      raise exception 'FALHOU: saldo da loja % depois é %, não a soma das duas prévias', linha.loja, linha.saldo;
    end if;
  end loop;
  if depois -> 'estoque' <> jsonb_build_array(
       jsonb_build_object('loja_id', loja2, 'loja_nome', 'Juntar Alfa', 'saldo', 6),
       jsonb_build_object('loja_id', loja1, 'loja_nome', 'Juntar Zeta', 'saldo', 11)) then
    raise exception 'FALHOU: o estoque da A depois devia ser Alfa 6 e Zeta 11: %', depois -> 'estoque';
  end if;

  reset role;

  -- =====================================================================
  -- 7. A peça B não existe, e NENHUMA tabela aponta pra ela — pelo catálogo
  -- =====================================================================
  if exists (select 1 from pecas where id = peca_b) then
    raise exception 'FALHOU: a peça B continua existindo depois da junção';
  end if;

  fks := 0;
  for linha in
    select c.conrelid::regclass as tabela, a.attname as coluna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f' and c.confrelid = 'pecas'::regclass
  loop
    fks := fks + 1;
    execute format('select exists (select 1 from %s where %I = $1)', linha.tabela, linha.coluna)
      into resta using peca_b;
    if resta then
      raise exception 'FALHOU: a tabela % (coluna %) ainda aponta pra peça B', linha.tabela, linha.coluna;
    end if;
  end loop;
  -- pra checagem acima não passar por não ter achado nada
  if fks < 5 then
    raise exception 'FALHOU: o catálogo só achou % chaves apontando pra pecas (eram pelo menos 5)', fks;
  end if;

  -- e as linhas que eram da B são as mesmas, agora da A (não foram recriadas)
  if (select count(*) from estoque_movimentos   where id = any (ids_mov)  and peca_id = peca_a) <> cardinality(ids_mov)
  or (select count(*) from contagens_estoque    where id = any (ids_cont) and peca_id = peca_a) <> cardinality(ids_cont)
  or (select count(*) from ordens_servico_itens where id = any (ids_os)   and peca_id = peca_a) <> cardinality(ids_os)
  or (select count(*) from pedidos_compra_itens where id = any (ids_pc)   and peca_id = peca_a) <> cardinality(ids_pc)
  or (select count(*) from cotacoes_pecas       where id = any (ids_cot)  and peca_id = peca_a) <> cardinality(ids_cot)
  then
    raise exception 'FALHOU: alguma linha que era da peça B não está, intacta, na peça A';
  end if;

  -- o item de serviço (sem peça) continua sem peça
  if (select count(*) from ordens_servico_itens where ordem_servico_id = os1 and peca_id is null) <> 1 then
    raise exception 'FALHOU: o item de serviço da OS 1 ganhou peça na junção';
  end if;

  -- =====================================================================
  -- 8. A peça C ficou intocada
  -- =====================================================================
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  if resumo_peca_para_juntar(peca_c) <> resumo_c then
    raise exception 'FALHOU: a peça C mudou com a junção: antes %, depois %', resumo_c, resumo_peca_para_juntar(peca_c);
  end if;
  reset role;
  if (select to_jsonb(p) from pecas p where id = peca_c) <> peca_c_antes then
    raise exception 'FALHOU: o cadastro da peça C mudou com a junção';
  end if;

  -- =====================================================================
  -- 9. Os campos: os escolhidos vieram da B, o resto continua da A
  -- =====================================================================
  select * into peca_final from pecas where id = peca_a;
  if peca_final.descricao <> 'PNEU 175 70 13 (B)' or peca_final.codigo_barras <> '222'
     or peca_final.preco_venda <> 320 or peca_final.dot is distinct from '3823'
     or peca_final.medida is not null then
    raise exception 'FALHOU: os campos escolhidos não vieram da B: %', to_jsonb(peca_final);
  end if;
  if peca_final.codigo_interno <> 'A-1' or peca_final.marca <> 'Marca A'
     or peca_final.ncm <> '40111000' or peca_final.preco_custo <> 200 then
    raise exception 'FALHOU: um campo NÃO escolhido mudou na A: %', to_jsonb(peca_final);
  end if;
  -- ativo é "ou": a A estava inativa, a B ativa
  if not peca_final.ativo then
    raise exception 'FALHOU: a A devia ficar ativa (a B estava ativa)';
  end if;

  -- =====================================================================
  -- 10. A trilha de auditoria
  -- =====================================================================
  select * into linha from auditoria
   where tabela = 'pecas' and registro_id = peca_b and acao = 'excluir';
  if linha is null or linha.operador_id is distinct from o_admin2
     or linha.operador_nome is distinct from 'Admin das duas (juntar)' then
    raise exception 'FALHOU: a exclusão da B não ficou na auditoria com quem fez: %', to_jsonb(linha);
  end if;
  if linha.dados_antes ->> 'descricao' <> 'PNEU 175 70 13 (B)' or linha.dados_antes ->> 'codigo_barras' <> '222'
     or linha.dados_antes ->> 'marca' <> 'Marca B' then
    raise exception 'FALHOU: a auditoria não guardou a peça B inteira: %', linha.dados_antes;
  end if;
  select count(*) into quantas from auditoria where tabela = 'pecas' and registro_id = peca_b and acao = 'excluir';
  if quantas <> 1 then
    raise exception 'FALHOU: esperava 1 exclusão da B na auditoria (as tentativas recusadas não deixam rastro), achei %', quantas;
  end if;

  select count(*) into quantas from auditoria
   where tabela = 'pecas' and registro_id = peca_a and acao = 'atualizar'
     and operador_id = o_admin2
     and dados_antes ->> 'descricao' = 'Pneu 175/70 R13 (A)'
     and dados_depois ->> 'descricao' = 'PNEU 175 70 13 (B)'
     and (dados_antes ->> 'ativo')::boolean = false
     and (dados_depois ->> 'ativo')::boolean = true;
  if quantas <> 1 then
    raise exception 'FALHOU: esperava 1 "atualizar" da A na auditoria, com antes e depois, achei %', quantas;
  end if;

  select count(*) into quantas from auditoria
   where tabela = 'ordens_servico_itens' and acao = 'atualizar' and registro_id = any (ids_os)
     and dados_antes ->> 'peca_id' = peca_b::text and dados_depois ->> 'peca_id' = peca_a::text;
  if quantas <> cardinality(ids_os) then
    raise exception 'FALHOU: a troca de peça nos itens de OS não ficou na auditoria (% de %)', quantas, cardinality(ids_os);
  end if;

  -- a linha da junção, gravada pela função: dá pra saber o que cada peça
  -- tinha e refazer à mão
  select count(*) into quantas from auditoria
   where tabela = 'pecas' and registro_id = peca_a and acao = 'atualizar' and dados_antes ? 'juntada';
  if quantas <> 1 then
    raise exception 'FALHOU: esperava 1 linha da junção na auditoria da A, achei %', quantas;
  end if;
  select * into linha from auditoria
   where tabela = 'pecas' and registro_id = peca_a and acao = 'atualizar' and dados_antes ? 'juntada';
  if linha.operador_id is distinct from o_admin2
     or linha.operador_nome is distinct from 'Admin das duas (juntar)' then
    raise exception 'FALHOU: a linha da junção não diz quem juntou: % / %', linha.operador_id, linha.operador_nome;
  end if;
  if linha.dados_antes -> 'juntada' <> 'true'::jsonb
     or linha.dados_antes -> 'peca_que_saiu' ->> 'id' <> peca_b::text
     or linha.dados_antes -> 'peca_que_saiu' ->> 'descricao' <> 'PNEU 175 70 13 (B)'
     or linha.dados_antes -> 'peca_que_saiu' ->> 'marca' <> 'Marca B' then
    raise exception 'FALHOU: a linha da junção não guardou a peça que saiu inteira: %', linha.dados_antes -> 'peca_que_saiu';
  end if;
  if linha.dados_antes -> 'resumo_fica' <> resumo_a or linha.dados_antes -> 'resumo_sai' <> resumo_b then
    raise exception 'FALHOU: a linha da junção não guardou as prévias das duas: %', linha.dados_antes;
  end if;
  if linha.dados_antes -> 'campos_da_que_sai'
     <> '["codigo_barras", "descricao", "dot", "medida", "preco_venda"]'::jsonb then
    raise exception 'FALHOU: a linha da junção não guardou os campos trazidos: %', linha.dados_antes -> 'campos_da_que_sai';
  end if;
  if linha.dados_antes -> 'ids_movimentos'   <> (select jsonb_agg(x order by x) from unnest(ids_mov)  x)
  or linha.dados_antes -> 'ids_itens_os'     <> (select jsonb_agg(x order by x) from unnest(ids_os)   x)
  or linha.dados_antes -> 'ids_itens_compra' <> (select jsonb_agg(x order by x) from unnest(ids_pc)   x)
  or linha.dados_antes -> 'ids_cotacoes'     <> (select jsonb_agg(x order by x) from unnest(ids_cot)  x)
  or linha.dados_antes -> 'ids_contagens'    <> (select jsonb_agg(x order by x) from unnest(ids_cont) x)
  then
    raise exception 'FALHOU: os ids na linha da junção não são os que eram da B: %', linha.dados_antes;
  end if;
  if linha.dados_depois <> (select to_jsonb(p) from pecas p where id = peca_a) then
    raise exception 'FALHOU: dados_depois da linha da junção não é a A como ficou: %', linha.dados_depois;
  end if;

  -- =====================================================================
  -- 11. Sem nada escolhido, a A ainda é atualizada (pra auditoria) e nada
  --     além de ativo muda
  -- =====================================================================
  -- C é juntada na A sem campo nenhum: só pra provar o caminho do '{}'.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_admin2::text, true);
  perform juntar_pecas(peca_a, peca_c);
  reset role;
  if (select descricao from pecas where id = peca_a) <> 'PNEU 175 70 13 (B)' then
    raise exception 'FALHOU: juntar sem campo escolhido mudou a descrição da A';
  end if;
  select count(*) into quantas from auditoria
   where tabela = 'pecas' and registro_id = peca_a and acao = 'atualizar' and not (dados_antes ? 'juntada');
  if quantas <> 2 then
    raise exception 'FALHOU: juntar sem campo escolhido devia deixar um "atualizar" da A na auditoria (achei % no total)', quantas;
  end if;
  select count(*) into quantas from auditoria
   where tabela = 'pecas' and registro_id = peca_a and dados_antes ? 'juntada'
     and dados_antes -> 'peca_que_saiu' ->> 'id' = peca_c::text
     and dados_antes -> 'campos_da_que_sai' = '[]'::jsonb;
  if quantas <> 1 then
    raise exception 'FALHOU: a segunda junção (C na A, sem campo) não deixou a linha da junção';
  end if;

  -- ---- limpeza ------------------------------------------------------------
  delete from estoque_movimentos where loja_id in (loja1, loja2);
  delete from contagens_estoque where loja_id in (loja1, loja2);
  delete from ordens_servico where id in (os1, os2);
  delete from pedidos_compra where id in (pc1, pc2);
  delete from cotacoes_pecas where fornecedor_id = fornec;
  delete from pecas where id in (peca_a, peca_b, peca_c, peca_d);
  delete from fornecedores where id = fornec;
  delete from clientes where id = cliente;
  delete from operador_lojas where operador_id in (o_admin2, o_admin1, o_comum);
  delete from operadores where id in (o_admin2, o_admin1, o_comum);
  delete from depositos where id in (dep1, dep2);
  delete from lojas where id in (loja1, loja2);

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

drop function if exists teste_juntar_falha_no_meio();

-- Sakura System — AutoCenter Edition
-- TESTE da migration 0071 (item que entra no orçamento na hora da aprovação,
-- tarefa #706). NÃO é migration, e NUNCA deve ser rodado no Supabase de
-- verdade — grava e apaga dado de teste, e abre ligações de volta pro próprio
-- banco (dblink) pra simular dois computadores ao mesmo tempo.
--
-- A promessa, em duas metades:
--   • o que passa: em orçamento, acrescentar e corrigir item não mexe no
--     estoque; aprovar baixa as peças que estão no banco nessa hora
--     (inclusive as acrescentadas antes, por qualquer caminho), com a
--     referência "OS N" e no depósito ativo mais antigo da loja; item
--     acrescentado DEPOIS da aprovação baixa sozinho; corrigir item numa OS
--     lança só a diferença (mais peça: saída; menos: entrada "ajuste"; trocar
--     a peça: as duas; peça virando serviço: entrada; serviço virando peça:
--     saída; 2,3 → 2,0: 0,30 exato; só o preço: nada); item e correção sem a
--     chave custo_unitario funcionam (e a correção não apaga o custo); o
--     vínculo de peça avulsa liga e baixa; orçamento só com serviço aprova
--     mesmo sem depósito;
--   • o que é recusado: aprovar de novo (devolve null, não baixa mais nada);
--     um vínculo que falha não derruba a aprovação (vem em nao_ligados); o
--     vínculo não troca a peça de item do cadastro, não põe peça em serviço
--     e não mexe em item de outra ordem;
--     aprovar com peça e sem depósito ativo falha INTEIRO (continua
--     orçamento); quem é de outra loja não acrescenta, não corrige e não
--     aprova; sem login não chama nenhuma das funções.
--
-- E A TRAVA (partes 3 a 8), que é o motivo da migration: dois "computadores"
-- de verdade (duas ligações dblink, cada uma a sua transação) se cruzando no
-- mesmo orçamento. Um detalhe que decidiu o desenho destas partes: as três
-- funções terminam com um `update ordens_servico`, e um update também prende
-- a linha até o fim da transação. Então "a linha fica presa depois da
-- chamada" passaria mesmo SEM o `for update` do começo — não prova nada
-- sozinho (docs/licoes.md, itens 73 e 76). O que prova é o cruzamento: o
-- segundo computador tem de ESPERAR o primeiro e, quando entra, ver o que o
-- primeiro gravou. Cada parte foi quebrada de propósito (tirando o `for
-- update` da função que ela vigia) e ficou vermelha.
--
-- Como rodar: `npm run test:sql -- testar-item-na-aprovacao`. Precisa da
-- extensão dblink (vem com o Postgres; a imagem postgres:16 do CI tem) e de
-- entrar no próprio banco pela rede local com a senha do runner (a mesma do
-- .github/workflows/ci.yml). Terminou imprimindo "TODAS AS CHECAGENS
-- PASSARAM", passou.

create extension if not exists dblink;

-- ===================================================================
-- Parte 1: o preparo (gravado de verdade, pras ligações dblink enxergarem)
-- ===================================================================

do $$
declare
  loja_a  uuid := '07100000-0000-0000-0000-00000000000a';  -- com depósitos
  loja_b  uuid := '07100000-0000-0000-0000-00000000000b';  -- a "outra loja"
  loja_c  uuid := '07100000-0000-0000-0000-00000000000c';  -- só depósito inativo
  o_a     uuid := '07101111-0000-0000-0000-00000000000a';  -- OS nas lojas A e C
  o_b     uuid := '07101111-0000-0000-0000-00000000000b';  -- OS só na loja B
  cliente uuid := '07102222-0000-0000-0000-000000000001';
  p1      uuid := '07105555-0000-0000-0000-000000000001';
  p2      uuid := '07105555-0000-0000-0000-000000000002';
  p3      uuid := '07105555-0000-0000-0000-000000000003';
  r       int;
begin
  insert into lojas (id, nome, cidade, uf) values
    (loja_a, 'Loja A (teste #706)', 'Araraquara', 'SP'),
    (loja_b, 'Loja B (teste #706)', 'Araraquara', 'SP'),
    (loja_c, 'Loja C (teste #706)', 'Araraquara', 'SP')
    on conflict (id) do nothing;

  -- Loja A: um depósito inativo MAIS antigo e dois ativos. O padrão é o
  -- ativo mais antigo (dep 2), não o mais antigo de todos.
  insert into depositos (id, loja_id, nome, ativo, criado_em) values
    ('07103333-0000-0000-0000-0000000000a1', loja_a, 'Antigo, desativado', false, now() - interval '3 days'),
    ('07103333-0000-0000-0000-0000000000a2', loja_a, 'Principal',          true,  now() - interval '2 days'),
    ('07103333-0000-0000-0000-0000000000a3', loja_a, 'Fundos',             true,  now() - interval '1 day'),
    ('07103333-0000-0000-0000-0000000000b1', loja_b, 'Principal B',        true,  now()),
    ('07103333-0000-0000-0000-0000000000c1', loja_c, 'Desativado C',       false, now())
    on conflict (id) do nothing;

  insert into auth.users (id) values (o_a), (o_b) on conflict do nothing;
  insert into operadores (id, usuario, nome, admin, permissoes, ativo) values
    (o_a, 't706_a', 'Balconista A (teste #706)', false, array['painel', 'ordens_servico'], true),
    (o_b, 't706_b', 'Balconista B (teste #706)', false, array['painel', 'ordens_servico'], true)
    on conflict (id) do nothing;
  insert into operador_lojas (operador_id, loja_id) values
    (o_a, loja_a), (o_a, loja_c), (o_b, loja_b)
    on conflict do nothing;

  insert into clientes (id, nome) values (cliente, 'Cliente (teste #706)') on conflict (id) do nothing;
  insert into pecas (id, descricao) values
    (p1, 'Pneu 175/70 R13 (teste #706)'),
    (p2, 'Válvula (teste #706)'),
    (p3, 'Bico (teste #706)')
    on conflict (id) do nothing;

  -- Os orçamentos dos cruzamentos (partes 3 a 6), cada um com 2 pneus.
  for r in 1..4 loop
    insert into ordens_servico (id, loja_id, cliente_id, status)
      values (('07104444-0000-0000-0000-00000000000' || r)::uuid, loja_a, cliente, 'orcamento');
    insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
      values (('07106666-0000-0000-0000-00000000000' || r)::uuid,
              ('07104444-0000-0000-0000-00000000000' || r)::uuid,
              'peca', p1, 'Pneu', 2, 250);
  end loop;
  -- E uma OS em andamento pra parte 7.
  insert into ordens_servico (id, loja_id, cliente_id, status)
    values ('07104444-0000-0000-0000-000000000005', loja_a, cliente, 'em_andamento');
  insert into ordens_servico_itens (id, ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values ('07106666-0000-0000-0000-000000000005', '07104444-0000-0000-0000-000000000005',
            'peca', p1, 'Pneu', 1, 250);
end $$;

-- ===================================================================
-- Parte 2: o que passa, e o que é recusado (um computador só)
-- ===================================================================

do $$
declare
  loja_a  uuid := '07100000-0000-0000-0000-00000000000a';
  loja_c  uuid := '07100000-0000-0000-0000-00000000000c';
  o_a     uuid := '07101111-0000-0000-0000-00000000000a';
  o_b     uuid := '07101111-0000-0000-0000-00000000000b';
  cliente uuid := '07102222-0000-0000-0000-000000000001';
  p1      uuid := '07105555-0000-0000-0000-000000000001';
  p2      uuid := '07105555-0000-0000-0000-000000000002';
  p3      uuid := '07105555-0000-0000-0000-000000000003';
  dep_padrao uuid := '07103333-0000-0000-0000-0000000000a2';
  inexistente uuid := '07109999-0000-0000-0000-000000000000';
  orc     uuid;
  orc_c   uuid;
  orc_c2  uuid;
  item_p1 uuid;
  item_srv uuid;
  avulso_ok uuid;
  avulso_falha uuid;
  item_depois uuid;
  item_x  uuid;
  item_dec uuid;
  avulso_outra uuid;
  res     jsonb;
  ref     text;
  n       int;
  movs_antes int;
  linha   record;
begin
  -- Sem login não chama nenhuma: a tranca é o `revoke` (docs/licoes.md, item 76).
  if has_function_privilege('anon', 'adicionar_itens_ordem(uuid, jsonb, uuid)', 'execute')
     or has_function_privilege('anon', 'editar_item_ordem(uuid, jsonb, uuid)', 'execute')
     or has_function_privilege('anon', 'aprovar_orcamento(uuid, text, uuid, jsonb)', 'execute')
     or has_function_privilege('anon', 'nome_documento_ordem(text, integer, integer, text)', 'execute')
     or has_function_privilege('anon', 'deposito_padrao_da_loja(uuid)', 'execute') then
    raise exception 'FALHOU: quem não está logado (anon) pode chamar uma das funções da 0071';
  end if;
  if not has_function_privilege('authenticated', 'adicionar_itens_ordem(uuid, jsonb, uuid)', 'execute')
     or not has_function_privilege('authenticated', 'editar_item_ordem(uuid, jsonb, uuid)', 'execute')
     or not has_function_privilege('authenticated', 'aprovar_orcamento(uuid, text, uuid, jsonb)', 'execute') then
    raise exception 'FALHOU: quem está logado (authenticated) não pode chamar as funções da 0071';
  end if;

  -- Os orçamentos desta parte, gravados como o programa grava.
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'orcamento')
    returning id into orc;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_c, cliente, 'orcamento')
    returning id into orc_c;
  insert into ordens_servico (loja_id, cliente_id, status) values (loja_c, cliente, 'orcamento')
    returning id into orc_c2;
  -- Uma peça avulsa de OUTRA ordem: o vínculo da aprovação do `orc` não
  -- pode mexer nela, mesmo que alguém mande o id dela.
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (orc_c2, 'peca', null, 'Avulsa de outra ordem', 1, 5)
    returning id into avulso_outra;

  select count(*) into movs_antes from estoque_movimentos;

  -- Daqui pra baixo, como o balconista A, sob a RLS.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', o_a::text, true);

  -- ===================================================================
  -- A. Em orçamento, acrescentar e corrigir item não mexe no estoque
  -- ===================================================================
  perform adicionar_itens_ordem(orc, jsonb_build_array(
    jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Pneu', 'quantidade', 2, 'preco_unitario', 250, 'desconto', 0),
    jsonb_build_object('tipo', 'servico', 'peca_id', null, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Montagem', 'quantidade', 1, 'preco_unitario', 40, 'desconto', 0),
    jsonb_build_object('tipo', 'peca', 'peca_id', null, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Válvula avulsa', 'quantidade', 1, 'preco_unitario', 15, 'desconto', 0,
                       'custo_unitario', 5),
    jsonb_build_object('tipo', 'peca', 'peca_id', null, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Bico sem cadastro', 'quantidade', 1, 'preco_unitario', 10, 'desconto', 0)
  ), o_a);

  select count(*) into n from ordens_servico_itens where ordem_servico_id = orc;
  if n <> 4 then
    raise exception 'FALHOU (A1): acrescentar devia gravar os 4 itens no orçamento, gravou %', n;
  end if;
  select id into item_p1      from ordens_servico_itens where ordem_servico_id = orc and peca_id = p1;
  select id into item_srv     from ordens_servico_itens where ordem_servico_id = orc and tipo = 'servico';
  select id into avulso_ok    from ordens_servico_itens where ordem_servico_id = orc and descricao = 'Válvula avulsa';
  select id into avulso_falha from ordens_servico_itens where ordem_servico_id = orc and descricao = 'Bico sem cadastro';
  if (select custo_unitario from ordens_servico_itens where id = avulso_ok) is distinct from 5.00
     or (select custo_unitario from ordens_servico_itens where id = item_p1) is not null then
    raise exception 'FALHOU (A2): o custo_unitario do item não foi gravado como veio';
  end if;
  if (select atualizado_por_id from ordens_servico where id = orc) is distinct from o_a then
    raise exception 'FALHOU (A3): acrescentar item não marcou quem mexeu por último na ordem';
  end if;

  -- O programa de antes grava item direto na tabela: a aprovação tem de
  -- baixar esse também (ela lê o banco, não o que veio pela função).
  insert into ordens_servico_itens (ordem_servico_id, tipo, peca_id, descricao, quantidade, preco_unitario)
    values (orc, 'peca', p3, 'Bico', 1, 8);

  perform editar_item_ordem(item_p1, '{"quantidade": 5}'::jsonb, o_a);
  if (select quantidade from ordens_servico_itens where id = item_p1) is distinct from 5.00 then
    raise exception 'FALHOU (A4): corrigir a quantidade no orçamento não gravou';
  end if;

  select count(*) into n from estoque_movimentos;
  if n <> movs_antes then
    raise exception 'FALHOU (A5): em orçamento, acrescentar/corrigir item lançou % movimento(s) de estoque', n - movs_antes;
  end if;

  -- ===================================================================
  -- B. Aprovar baixa o que está no banco; o vínculo que falha não derruba
  -- ===================================================================
  res := aprovar_orcamento(orc, '  o próprio cliente  ', o_a, jsonb_build_array(
    jsonb_build_object('item_id', avulso_ok,    'peca_id', p2),
    jsonb_build_object('item_id', avulso_falha, 'peca_id', inexistente),  -- erro de chave estrangeira
    -- Os três que o vínculo não pode pegar (não é erro: só não mexe):
    jsonb_build_object('item_id', item_p1,      'peca_id', p3),  -- já tem peça do cadastro
    jsonb_build_object('item_id', item_srv,     'peca_id', p2),  -- é serviço
    jsonb_build_object('item_id', avulso_outra, 'peca_id', p2)   -- é de outra ordem
  ));
  if res is null then
    raise exception 'FALHOU (B1): aprovar o orçamento devolveu null';
  end if;
  if res -> 'ordem' ->> 'status' <> 'em_andamento' or res -> 'ordem' ->> 'numero' is null
     or res -> 'ordem' ->> 'aprovado_por' is distinct from 'o próprio cliente'
     or res -> 'ordem' ->> 'aprovado_em' is null
     or (res -> 'ordem' ->> 'atualizado_por_id')::uuid is distinct from o_a then
    raise exception 'FALHOU (B2): a ordem devolvida não é a aprovada: %', res -> 'ordem';
  end if;
  ref := 'OS ' || (res -> 'ordem' ->> 'numero');
  if (select numero from ordens_servico where id = orc)::text is distinct from res -> 'ordem' ->> 'numero' then
    raise exception 'FALHOU (B3): o número devolvido não é o gravado';
  end if;

  -- O vínculo bom ligou; o ruim ficou avulso e veio na lista.
  if (select peca_id from ordens_servico_itens where id = avulso_ok) is distinct from p2
     or (select peca_id from ordens_servico_itens where id = avulso_falha) is not null then
    raise exception 'FALHOU (B4): o vínculo bom não ligou, ou o que falhou ligou';
  end if;
  if (select peca_id from ordens_servico_itens where id = item_p1) is distinct from p1
     or (select peca_id from ordens_servico_itens where id = item_srv) is not null
     or (select peca_id from ordens_servico_itens where id = avulso_outra) is not null then
    raise exception 'FALHOU (B4b): o vínculo trocou a peça de um item do cadastro, pôs peça num serviço ou mexeu em item de outra ordem';
  end if;
  if res -> 'nao_ligados' is distinct from
     jsonb_build_array(jsonb_build_object('id', avulso_falha, 'descricao', 'Bico sem cadastro')) then
    raise exception 'FALHOU (B5): nao_ligados devia trazer só o bico sem cadastro, veio %', res -> 'nao_ligados';
  end if;

  -- A baixa: pneu 5 (a quantidade corrigida), válvula 1 (ligada agora),
  -- bico 1 (gravado direto); o serviço e o avulso não ligado, nada.
  select count(*) into n from estoque_movimentos;
  if n - movs_antes <> 3 then
    raise exception 'FALHOU (B6): aprovar devia lançar 3 movimentos, lançou %', n - movs_antes;
  end if;
  for linha in
    select peca_id, sum(quantidade) as q, bool_and(tipo = 'saida' and motivo = 'uso_em_os'
             and referencia = ref and loja_id = loja_a and deposito_id = dep_padrao) as certo
      from estoque_movimentos where peca_id in (p1, p2, p3) group by peca_id
  loop
    if not linha.certo
       or linha.q is distinct from (case linha.peca_id when p1 then 5.00 else 1.00 end) then
      raise exception 'FALHOU (B7): movimento errado da peça % (quantidade %, tipo/motivo/referência "%"/depósito certos: %)',
        linha.peca_id, linha.q, ref, linha.certo;
    end if;
  end loop;

  -- Aprovar de novo (dois cliques): null, e nada a mais — nem o vínculo que
  -- vier junto (o bico continua avulso).
  res := aprovar_orcamento(orc, 'outro', o_a,
    jsonb_build_array(jsonb_build_object('item_id', avulso_falha, 'peca_id', p2)));
  if res is not null then
    raise exception 'FALHOU (B8): aprovar de novo devia devolver null, veio %', res;
  end if;
  select count(*) into n from estoque_movimentos;
  if n - movs_antes <> 3 or (select aprovado_por from ordens_servico where id = orc) <> 'o próprio cliente' then
    raise exception 'FALHOU (B9): aprovar de novo mexeu na ordem ou no estoque';
  end if;
  if (select peca_id from ordens_servico_itens where id = avulso_falha) is not null then
    raise exception 'FALHOU (B9b): aprovar de novo gravou o vínculo mandado junto';
  end if;

  -- Orçamento RECUSADO com peça não aprova: null, continua recusado, nada baixa.
  declare
    recusado uuid;
  begin
    insert into ordens_servico (loja_id, cliente_id, status) values (loja_a, cliente, 'orcamento')
      returning id into recusado;
    perform adicionar_itens_ordem(recusado, jsonb_build_array(
      jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                         'descricao', 'Pneu recusado', 'quantidade', 2, 'preco_unitario', 250, 'desconto', 0)
    ), o_a);
    update ordens_servico set status = 'recusado', recusado_em = now() where id = recusado;
    res := aprovar_orcamento(recusado, 'cliente', o_a, '[]'::jsonb);
    select count(*) into n from estoque_movimentos;
    if res is not null or n - movs_antes <> 3
       or (select status from ordens_servico where id = recusado) <> 'recusado' then
      raise exception 'FALHOU (B10): orçamento recusado foi aprovado ou baixou estoque (res %, movimentos a mais %)',
        res, n - movs_antes - 3;
    end if;
  end;

  -- ===================================================================
  -- C. Depois de aprovada: item novo baixa sozinho; correção lança só a
  --    diferença
  -- ===================================================================
  perform adicionar_itens_ordem(orc, jsonb_build_array(
    jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Pneu do estepe', 'quantidade', 1, 'preco_unitario', 250, 'desconto', 0)
  ), o_a);
  select id into item_depois from ordens_servico_itens where ordem_servico_id = orc and descricao = 'Pneu do estepe';
  if (select count(*) from estoque_movimentos
       where peca_id = p1 and tipo = 'saida' and motivo = 'uso_em_os' and quantidade = 1
         and referencia = ref and deposito_id = dep_padrao) <> 1
     or (select count(*) from estoque_movimentos) - movs_antes <> 4 then
    raise exception 'FALHOU (C1): o item acrescentado depois da aprovação não baixou (ou baixou errado)';
  end if;

  -- 5 → 7: saída de 2.
  perform editar_item_ordem(item_p1, '{"quantidade": 7}'::jsonb, o_a);
  if (select count(*) from estoque_movimentos
       where peca_id = p1 and tipo = 'saida' and motivo = 'uso_em_os' and quantidade = 2
         and referencia = ref || ' (correção de item)') <> 1
     or (select count(*) from estoque_movimentos) - movs_antes <> 5 then
    raise exception 'FALHOU (C2): aumentar de 5 pra 7 devia lançar uma saída de 2 "(correção de item)"';
  end if;

  -- 7 → 4: entrada de 3, "ajuste".
  perform editar_item_ordem(item_p1, '{"quantidade": 4}'::jsonb, o_a);
  if (select count(*) from estoque_movimentos
       where peca_id = p1 and tipo = 'entrada' and motivo = 'ajuste' and quantidade = 3
         and referencia = ref || ' (correção de item)') <> 1
     or (select count(*) from estoque_movimentos) - movs_antes <> 6 then
    raise exception 'FALHOU (C3): diminuir de 7 pra 4 devia lançar uma entrada "ajuste" de 3';
  end if;

  -- Só o preço (e um id/ordem no patch, que nunca mudam): nada no estoque.
  perform editar_item_ordem(item_p1,
    jsonb_build_object('preco_unitario', 199.90, 'id', inexistente, 'ordem_servico_id', inexistente), o_a);
  select * into linha from ordens_servico_itens where id = item_p1;
  if linha.preco_unitario is distinct from 199.90 or linha.quantidade is distinct from 4.00
     or linha.ordem_servico_id is distinct from orc then
    raise exception 'FALHOU (C4): trocar o preço não gravou, ou mexeu em quantidade/ordem: %', to_jsonb(linha);
  end if;
  if (select count(*) from estoque_movimentos) - movs_antes <> 6 then
    raise exception 'FALHOU (C5): trocar só o preço lançou movimento de estoque';
  end if;

  -- Trocar a peça (pneu do estepe vira válvula): volta 1 pneu, sai 1 válvula.
  perform editar_item_ordem(item_depois, jsonb_build_object('peca_id', p2), o_a);
  if (select count(*) from estoque_movimentos
       where peca_id = p1 and tipo = 'entrada' and motivo = 'ajuste' and quantidade = 1
         and referencia = ref || ' (correção de item)') <> 1
     or (select count(*) from estoque_movimentos
          where peca_id = p2 and tipo = 'saida' and motivo = 'uso_em_os' and quantidade = 1
            and referencia = ref || ' (correção de item)') <> 1
     or (select count(*) from estoque_movimentos) - movs_antes <> 8 then
    raise exception 'FALHOU (C6): trocar a peça do item devia devolver 1 pneu e tirar 1 válvula';
  end if;

  -- Casa decimal: 2,3 → 2,0 devolve 0,30 exato (sem resto de ponto flutuante).
  perform adicionar_itens_ordem(orc, jsonb_build_array(
    jsonb_build_object('tipo', 'peca', 'peca_id', p3, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Bico a granel', 'quantidade', 2.3, 'preco_unitario', 3, 'desconto', 0)
  ), o_a);
  select id into item_dec from ordens_servico_itens where ordem_servico_id = orc and descricao = 'Bico a granel';
  perform editar_item_ordem(item_dec, '{"quantidade": 2.0}'::jsonb, o_a);
  if (select count(*) from estoque_movimentos
       where peca_id = p3 and tipo = 'entrada' and motivo = 'ajuste' and quantidade = 0.30
         and referencia = ref || ' (correção de item)') <> 1
     or (select count(*) from estoque_movimentos) - movs_antes <> 10 then
    raise exception 'FALHOU (C8): 2,3 → 2,0 devia lançar uma entrada "ajuste" de 0,30 exato';
  end if;

  -- Peça virando serviço: as 2 voltam pra prateleira (entrada "ajuste").
  perform editar_item_ordem(item_dec, '{"tipo": "servico", "peca_id": null}'::jsonb, o_a);
  if (select count(*) from estoque_movimentos
       where peca_id = p3 and tipo = 'entrada' and motivo = 'ajuste' and quantidade = 2
         and referencia = ref || ' (correção de item)') <> 1
     or (select count(*) from estoque_movimentos) - movs_antes <> 11 then
    raise exception 'FALHOU (C9): peça virando serviço devia devolver as 2 (entrada "ajuste")';
  end if;

  -- Serviço virando peça: sai 1.
  perform editar_item_ordem(item_dec, jsonb_build_object('tipo', 'peca', 'peca_id', p3, 'quantidade', 1), o_a);
  if (select count(*) from estoque_movimentos
       where peca_id = p3 and tipo = 'saida' and motivo = 'uso_em_os' and quantidade = 1
         and referencia = ref || ' (correção de item)') <> 1
     or (select count(*) from estoque_movimentos) - movs_antes <> 12 then
    raise exception 'FALHOU (C10): serviço virando peça devia tirar 1 do estoque';
  end if;

  -- Patch sem a chave custo_unitario não apaga o custo que o item já tinha.
  perform editar_item_ordem(avulso_ok, '{"preco_unitario": 18}'::jsonb, o_a);
  if (select custo_unitario from ordens_servico_itens where id = avulso_ok) is distinct from 5.00 then
    raise exception 'FALHOU (C11): corrigir sem mandar custo_unitario apagou o custo do item';
  end if;
  if (select count(*) from estoque_movimentos) - movs_antes <> 12 then
    raise exception 'FALHOU (C12): trocar só o preço da válvula lançou movimento';
  end if;

  -- O saldo que ficou pra essa OS bate com os itens dela: pneu 4, válvula 2
  -- (a ligada e a do estepe), bico 2 (o gravado direto e o a granel).
  for linha in
    select i.peca_id, sum(i.quantidade) as nos_itens,
           (select sum(case when m.tipo = 'saida' then m.quantidade else -m.quantidade end)
              from estoque_movimentos m where m.peca_id = i.peca_id and m.referencia like ref || '%') as baixado
      from ordens_servico_itens i
     where i.ordem_servico_id = orc and i.tipo = 'peca' and i.peca_id is not null
     group by i.peca_id
  loop
    if linha.nos_itens is distinct from linha.baixado then
      raise exception 'FALHOU (C7): peça %: % nos itens, % baixado', linha.peca_id, linha.nos_itens, linha.baixado;
    end if;
  end loop;

  -- ===================================================================
  -- D. Sem depósito ativo: aprovar com peça falha INTEIRO
  -- ===================================================================
  -- Em orçamento o depósito nem é procurado (não há o que lançar).
  perform adicionar_itens_ordem(orc_c, jsonb_build_array(
    jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Pneu', 'quantidade', 1, 'preco_unitario', 250, 'desconto', 0)
  ), o_a);
  begin
    perform aprovar_orcamento(orc_c, 'cliente', o_a, '[]'::jsonb);
    raise exception 'FALHOU (D1): aprovou com peça numa loja sem depósito ativo';
  exception when others then
    if sqlerrm not like 'Nenhum depósito ativo encontrado pra essa loja.%' then
      raise exception 'FALHOU (D2): esperava a mensagem do depósito, veio: %', sqlerrm;
    end if;
  end;
  select * into linha from ordens_servico where id = orc_c;
  if linha.status <> 'orcamento' or linha.numero is not null or linha.aprovado_em is not null then
    raise exception 'FALHOU (D3): a aprovação que falhou deixou a ordem mudada (status %, numero %)',
      linha.status, linha.numero;
  end if;
  if exists (select 1 from estoque_movimentos where loja_id = loja_c) then
    raise exception 'FALHOU (D4): a aprovação que falhou deixou movimento de estoque';
  end if;
  -- Orçamento só com serviço aprova mesmo sem depósito.
  perform adicionar_itens_ordem(orc_c2, jsonb_build_array(
    jsonb_build_object('tipo', 'servico', 'peca_id', null, 'servico_id', null, 'tecnico_id', null,
                       'descricao', 'Alinhamento', 'quantidade', 1, 'preco_unitario', 60, 'desconto', 0)
  ), o_a);
  res := aprovar_orcamento(orc_c2, '', o_a);
  if res is null or res -> 'ordem' ->> 'status' <> 'em_andamento'
     or res -> 'ordem' -> 'aprovado_por' <> 'null'::jsonb or res -> 'nao_ligados' <> '[]'::jsonb then
    raise exception 'FALHOU (D5): orçamento só com serviço devia aprovar sem depósito (e aprovado_por vazio = null): %', res;
  end if;

  -- ===================================================================
  -- E. Quem é de outra loja não acrescenta, não corrige e não aprova
  -- ===================================================================
  -- Um orçamento da loja A, ainda aberto: o dos cruzamentos da parte 6
  -- serve, e só é lido aqui.
  select id into item_x from ordens_servico_itens where id = '07106666-0000-0000-0000-000000000004';
  perform set_config('request.jwt.claim.sub', o_b::text, true);

  begin
    perform adicionar_itens_ordem('07104444-0000-0000-0000-000000000004', jsonb_build_array(
      jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                         'descricao', 'Intruso', 'quantidade', 1, 'preco_unitario', 1, 'desconto', 0)
    ), o_b);
    raise exception 'FALHOU (E1): quem é de outra loja acrescentou item';
  exception when others then
    if sqlerrm not like 'Esta ordem não foi encontrada%' then
      raise exception 'FALHOU (E2): esperava "Esta ordem não foi encontrada", veio: %', sqlerrm;
    end if;
  end;
  begin
    perform editar_item_ordem(item_x, '{"quantidade": 9}'::jsonb, o_b);
    raise exception 'FALHOU (E3): quem é de outra loja corrigiu item';
  exception when others then
    if sqlerrm not like 'Este item não foi encontrado%' then
      raise exception 'FALHOU (E4): esperava "Este item não foi encontrado", veio: %', sqlerrm;
    end if;
  end;
  res := aprovar_orcamento('07104444-0000-0000-0000-000000000004', 'intruso', o_b);
  if res is not null then
    raise exception 'FALHOU (E5): quem é de outra loja aprovou o orçamento: %', res;
  end if;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);

  select * into linha from ordens_servico where id = '07104444-0000-0000-0000-000000000004';
  if linha.status <> 'orcamento' or linha.atualizado_por_id is not null then
    raise exception 'FALHOU (E6): a tentativa de outra loja mexeu na ordem (status %, atualizado_por %)',
      linha.status, linha.atualizado_por_id;
  end if;
  if (select count(*) from ordens_servico_itens where ordem_servico_id = '07104444-0000-0000-0000-000000000004') <> 1
     or (select quantidade from ordens_servico_itens where id = item_x) <> 2 then
    raise exception 'FALHOU (E7): a tentativa de outra loja gravou ou mudou item';
  end if;
  if exists (select 1 from estoque_movimentos where referencia like 'Orçamento%' or peca_id = p1 and loja_id <> loja_a) then
    raise exception 'FALHOU (E8): sobrou movimento de estoque que não devia existir';
  end if;
end $$;

-- ===================================================================
-- Partes 3 a 8: dois computadores ao mesmo tempo (dblink)
-- ===================================================================
-- Em todas: o computador 1 ("um") começa uma transação, chama uma função e
-- NÃO termina — a linha da ordem fica presa. O computador 2 ("dois") chama
-- outra função na mesma ordem, sem esperar a resposta (dblink_send_query).
-- Conferimos que o dois ficou ESPERANDO; o um termina (commit); o dois
-- entra, e o resultado final tem de ser o certo.
--
-- As ligações são do próprio runner (banco descartável, senha do CI).
--
-- Três ajudantes do teste (só desta sessão, em pg_temp; somem no fim):

-- Abre o "computador" `p_nome`: liga, começa a transação e entra como o
-- operador, sob a RLS. Devolve o número do processo dele no Postgres.
create function pg_temp.t706_abrir(p_nome text, p_operador uuid)
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
create function pg_temp.t706_esperando(p_pid int)
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

-- A linha da ordem está presa por outra transação agora?
create function pg_temp.t706_presa(p_ordem uuid)
returns boolean
language plpgsql
as $$
begin
  perform 1 from ordens_servico where id = p_ordem for update nowait;
  return false;
exception when lock_not_available then
  return true;
end;
$$;

-- ===================================================================
-- Parte 3: um APROVA enquanto dois ACRESCENTA um pneu — o pneu baixa uma
-- vez (vigia o `for update` de adicionar_itens_ordem)
-- ===================================================================
-- Sem a trava, o dois lia "ainda é orçamento", gravava o pneu sem baixar, e
-- a aprovação do um já tinha lido os itens sem ele: o pneu escapava.

do $$
declare
  o_a  uuid := '07101111-0000-0000-0000-00000000000a';
  p1   uuid := '07105555-0000-0000-0000-000000000001';
  orc  uuid := '07104444-0000-0000-0000-000000000001';
  pid_dois int;
  ref text;
  nos_itens numeric;
  baixado numeric;
begin
  perform pg_temp.t706_abrir('um', o_a);
  pid_dois := pg_temp.t706_abrir('dois', o_a);

  perform * from dblink('um', format('select aprovar_orcamento(%L, %L, %L)', orc, 'cliente', o_a)) as t(x text);
  if not pg_temp.t706_presa(orc) then
    raise exception 'FALHOU (3a): a aprovação, ainda sem commit, não deixou a linha da ordem presa';
  end if;

  perform dblink_send_query('dois', format('select adicionar_itens_ordem(%L, %L::jsonb, %L)', orc,
    jsonb_build_array(jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                      'descricao', 'Pneu a mais', 'quantidade', 1, 'preco_unitario', 250, 'desconto', 0)),
    o_a));
  if not pg_temp.t706_esperando(pid_dois) then
    raise exception 'FALHOU (3b): o acrescentar não esperou a aprovação terminar';
  end if;

  perform dblink_exec('um', 'commit');
  perform * from dblink_get_result('dois') as t(x text);
  perform * from dblink_get_result('dois') as t(x text);
  perform dblink_exec('dois', 'commit');
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  ref := 'OS ' || (select numero from ordens_servico where id = orc);
  select sum(quantidade) into nos_itens from ordens_servico_itens where ordem_servico_id = orc and peca_id = p1;
  select sum(quantidade) into baixado from estoque_movimentos where referencia = ref and tipo = 'saida' and peca_id = p1;
  if nos_itens is distinct from 3.00 or baixado is distinct from nos_itens then
    raise exception 'FALHOU (3c): pneus na OS: %, baixados: % (o pneu acrescentado no meio da aprovação escapou do estoque ou baixou duas vezes)',
      nos_itens, baixado;
  end if;
end $$;

-- ===================================================================
-- Parte 4: um APROVA enquanto dois CORRIGE a quantidade (2 → 5)
-- (vigia o `for update` de editar_item_ordem)
-- ===================================================================
-- Sem a trava, o dois lia "ainda é orçamento", gravava 5 sem lançar a
-- diferença, e a aprovação do um baixava os 2 que tinha lido: 3 escapavam.

do $$
declare
  o_a  uuid := '07101111-0000-0000-0000-00000000000a';
  p1   uuid := '07105555-0000-0000-0000-000000000001';
  orc  uuid := '07104444-0000-0000-0000-000000000002';
  item uuid := '07106666-0000-0000-0000-000000000002';
  pid_dois int;
  ref text;
  nos_itens numeric;
  baixado numeric;
begin
  perform pg_temp.t706_abrir('um', o_a);
  pid_dois := pg_temp.t706_abrir('dois', o_a);

  perform * from dblink('um', format('select aprovar_orcamento(%L, %L, %L)', orc, 'cliente', o_a)) as t(x text);
  if not pg_temp.t706_presa(orc) then
    raise exception 'FALHOU (4a): a aprovação, ainda sem commit, não deixou a linha da ordem presa';
  end if;

  perform dblink_send_query('dois', format('select editar_item_ordem(%L, %L::jsonb, %L)',
    item, '{"quantidade": 5}', o_a));
  if not pg_temp.t706_esperando(pid_dois) then
    raise exception 'FALHOU (4b): a correção não esperou a aprovação terminar';
  end if;

  perform dblink_exec('um', 'commit');
  perform * from dblink_get_result('dois') as t(x text);
  perform * from dblink_get_result('dois') as t(x text);
  perform dblink_exec('dois', 'commit');
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  ref := 'OS ' || (select numero from ordens_servico where id = orc);
  select quantidade into nos_itens from ordens_servico_itens where id = item;
  select sum(case when tipo = 'saida' then quantidade else -quantidade end) into baixado
    from estoque_movimentos where referencia like ref || '%' and peca_id = p1;
  if nos_itens is distinct from 5.00 or baixado is distinct from nos_itens then
    raise exception 'FALHOU (4c): pneus no item: %, baixados: % (a correção no meio da aprovação não lançou a diferença)',
      nos_itens, baixado;
  end if;
end $$;

-- ===================================================================
-- Parte 5: um APROVA enquanto dois APROVA também — o dois recebe null e
-- nada baixa duas vezes (vigia o `for update` de aprovar_orcamento)
-- ===================================================================
-- Sem a trava, o dois lia "ainda é orçamento", esperava só no update do
-- status, e depois aprovava de novo: as peças baixavam duas vezes.

do $$
declare
  o_a  uuid := '07101111-0000-0000-0000-00000000000a';
  p1   uuid := '07105555-0000-0000-0000-000000000001';
  orc  uuid := '07104444-0000-0000-0000-000000000003';
  pid_dois int;
  resposta text;
  ref text;
  baixado numeric;
begin
  perform pg_temp.t706_abrir('um', o_a);
  pid_dois := pg_temp.t706_abrir('dois', o_a);

  perform * from dblink('um', format('select aprovar_orcamento(%L, %L, %L)', orc, 'cliente', o_a)) as t(x text);
  if not pg_temp.t706_presa(orc) then
    raise exception 'FALHOU (5a): a aprovação, ainda sem commit, não deixou a linha da ordem presa';
  end if;

  perform dblink_send_query('dois', format('select aprovar_orcamento(%L, %L, %L)', orc, 'outro computador', o_a));
  if not pg_temp.t706_esperando(pid_dois) then
    raise exception 'FALHOU (5b): a segunda aprovação não esperou a primeira terminar';
  end if;

  perform dblink_exec('um', 'commit');
  select x into resposta from dblink_get_result('dois') as t(x text);
  perform * from dblink_get_result('dois') as t(x text);
  perform dblink_exec('dois', 'commit');
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  if resposta is not null then
    raise exception 'FALHOU (5c): a segunda aprovação, no mesmo instante, devia devolver null e devolveu %', resposta;
  end if;
  ref := 'OS ' || (select numero from ordens_servico where id = orc);
  select sum(quantidade) into baixado from estoque_movimentos where referencia = ref and peca_id = p1;
  if baixado is distinct from 2.00
     or (select aprovado_por from ordens_servico where id = orc) is distinct from 'cliente' then
    raise exception 'FALHOU (5d): duas aprovações no mesmo instante baixaram % pneus (o orçamento tem 2)', baixado;
  end if;
end $$;

-- ===================================================================
-- Parte 6: um ACRESCENTA enquanto dois APROVA — a aprovação espera e
-- baixa o pneu novo também (o caso da tarefa, na outra ordem)
-- ===================================================================

do $$
declare
  o_a  uuid := '07101111-0000-0000-0000-00000000000a';
  p1   uuid := '07105555-0000-0000-0000-000000000001';
  orc  uuid := '07104444-0000-0000-0000-000000000004';
  pid_dois int;
  resposta text;
  ref text;
  nos_itens numeric;
  baixado numeric;
begin
  perform pg_temp.t706_abrir('um', o_a);
  pid_dois := pg_temp.t706_abrir('dois', o_a);

  perform * from dblink('um', format('select adicionar_itens_ordem(%L, %L::jsonb, %L)', orc,
    jsonb_build_array(jsonb_build_object('tipo', 'peca', 'peca_id', p1, 'servico_id', null, 'tecnico_id', null,
                      'descricao', 'Pneu a mais', 'quantidade', 1, 'preco_unitario', 250, 'desconto', 0)),
    o_a)) as t(x text);
  if not pg_temp.t706_presa(orc) then
    raise exception 'FALHOU (6a): acrescentar, ainda sem commit, não deixou a linha da ordem presa';
  end if;

  perform dblink_send_query('dois', format('select aprovar_orcamento(%L, %L, %L)', orc, 'cliente', o_a));
  if not pg_temp.t706_esperando(pid_dois) then
    raise exception 'FALHOU (6b): a aprovação não esperou o acrescentar terminar';
  end if;

  perform dblink_exec('um', 'commit');
  select x into resposta from dblink_get_result('dois') as t(x text);
  perform * from dblink_get_result('dois') as t(x text);
  perform dblink_exec('dois', 'commit');
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  if resposta is null then
    raise exception 'FALHOU (6c): a aprovação que esperou devolveu null';
  end if;
  ref := 'OS ' || (select numero from ordens_servico where id = orc);
  select sum(quantidade) into nos_itens from ordens_servico_itens where ordem_servico_id = orc and peca_id = p1;
  select sum(quantidade) into baixado from estoque_movimentos where referencia = ref and tipo = 'saida' and peca_id = p1;
  if nos_itens is distinct from 3.00 or baixado is distinct from nos_itens then
    raise exception 'FALHOU (6d): pneus na OS: %, baixados: %', nos_itens, baixado;
  end if;
end $$;

-- ===================================================================
-- Parte 7: CORRIGIR item também deixa a linha presa até o fim, e o
-- rollback desfaz tudo (item e estoque)
-- ===================================================================

do $$
declare
  o_a  uuid := '07101111-0000-0000-0000-00000000000a';
  orc  uuid := '07104444-0000-0000-0000-000000000005';
  item uuid := '07106666-0000-0000-0000-000000000005';
  movs int;
begin
  select count(*) into movs from estoque_movimentos;
  perform pg_temp.t706_abrir('um', o_a);
  perform * from dblink('um', format('select editar_item_ordem(%L, %L::jsonb, %L)', item, '{"quantidade": 3}', o_a)) as t(x text);
  if not pg_temp.t706_presa(orc) then
    raise exception 'FALHOU (7a): a correção, ainda sem commit, não deixou a linha da ordem presa';
  end if;
  perform dblink_exec('um', 'rollback');
  perform dblink_disconnect('um');

  if pg_temp.t706_presa(orc) then
    raise exception 'FALHOU (7b): a linha continuou presa depois do rollback';
  end if;
  if (select quantidade from ordens_servico_itens where id = item) <> 1
     or (select count(*) from estoque_movimentos) <> movs then
    raise exception 'FALHOU (7c): o rollback não desfez a correção inteira';
  end if;
end $$;

-- ===================================================================
-- Parte 8: a versão anterior do programa corrige o item direto na tabela
-- (1 → 3, sem commit) enquanto dois corrige pela função (→ 5): a função
-- espera e lança a diferença a partir do 3, não do 1 que tinha lido antes
-- (vigia o `for update` do ITEM em editar_item_ordem)
-- ===================================================================

do $$
declare
  o_a  uuid := '07101111-0000-0000-0000-00000000000a';
  p1   uuid := '07105555-0000-0000-0000-000000000001';
  orc  uuid := '07104444-0000-0000-0000-000000000005';
  item uuid := '07106666-0000-0000-0000-000000000005';
  pid_dois int;
  ref text;
  lancado numeric;
begin
  perform pg_temp.t706_abrir('um', o_a);
  pid_dois := pg_temp.t706_abrir('dois', o_a);

  perform dblink_exec('um', format('update ordens_servico_itens set quantidade = 3 where id = %L', item));
  perform dblink_send_query('dois', format('select editar_item_ordem(%L, %L::jsonb, %L)',
    item, '{"quantidade": 5}', o_a));
  if not pg_temp.t706_esperando(pid_dois) then
    raise exception 'FALHOU (8a): a correção pela função não esperou a correção direta terminar';
  end if;

  perform dblink_exec('um', 'commit');
  perform * from dblink_get_result('dois') as t(x text);
  perform * from dblink_get_result('dois') as t(x text);
  perform dblink_exec('dois', 'commit');
  perform dblink_disconnect('um');
  perform dblink_disconnect('dois');

  ref := 'OS ' || (select numero from ordens_servico where id = orc) || ' (correção de item)';
  select sum(quantidade) into lancado from estoque_movimentos
   where referencia = ref and peca_id = p1 and tipo = 'saida';
  if (select quantidade from ordens_servico_itens where id = item) <> 5 or lancado is distinct from 2.00 then
    raise exception 'FALHOU (8b): de 3 pra 5 devia lançar saída de 2, lançou % (a conta partiu do item velho)', lancado;
  end if;
end $$;

-- ===================================================================
-- Limpeza
-- ===================================================================

do $$
declare
  lojas_teste uuid[] := array['07100000-0000-0000-0000-00000000000a',
                              '07100000-0000-0000-0000-00000000000b',
                              '07100000-0000-0000-0000-00000000000c']::uuid[];
begin
  delete from estoque_movimentos where loja_id = any (lojas_teste);
  delete from ordens_servico where loja_id = any (lojas_teste);
  delete from depositos where loja_id = any (lojas_teste);
  delete from operador_lojas where operador_id in ('07101111-0000-0000-0000-00000000000a', '07101111-0000-0000-0000-00000000000b');
  delete from operadores where id in ('07101111-0000-0000-0000-00000000000a', '07101111-0000-0000-0000-00000000000b');
  delete from pecas where id in ('07105555-0000-0000-0000-000000000001', '07105555-0000-0000-0000-000000000002',
                                 '07105555-0000-0000-0000-000000000003');
  delete from clientes where id = '07102222-0000-0000-0000-000000000001';
  delete from lojas where id = any (lojas_teste);

  raise notice 'TODAS AS CHECAGENS PASSARAM';
end $$;

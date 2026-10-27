-- Sakura System — AutoCenter Edition
-- Migration 0071: item que entra no orçamento na hora da aprovação não pode
-- escapar do estoque (tarefa #706).
--
-- O PROBLEMA. Dois computadores com o mesmo orçamento aberto: o A acrescenta
-- um pneu enquanto o B aprova. Até aqui quem fazia tudo era o programa
-- (src/lib/ordensServico.ts), em pedidos separados ao banco:
--   • acrescentar item: lia o status da ordem ("é orçamento? então não
--     baixa") e SÓ DEPOIS gravava o item;
--   • aprovar: mudava o status pra OS e SÓ DEPOIS lia os itens pra baixar.
-- Se a aprovação do B cai entre a leitura e a gravação do A, o pneu entra
-- numa OS já aprovada sem baixar: o A achou que era orçamento, e o B leu os
-- itens antes de o pneu existir. O pneu sai da prateleira e nunca sai do
-- estoque. Com a ordem trocada (o A lê "já é OS" e o B lê os itens depois de
-- o pneu gravar) o pneu baixaria DUAS vezes. A correção de item tinha o
-- mesmo buraco. É raro (precisa cair no mesmo instante), mas quando cai
-- ninguém percebe até a contagem do estoque não bater.
--
-- O QUE ESTA MIGRATION CRIA: três funções que o programa chama no lugar dos
-- pedidos separados, cada uma uma transação só:
--
--   • adicionar_itens_ordem(ordem, itens, operador) — grava os itens e, se a
--     ordem já é OS, baixa as peças deles;
--   • editar_item_ordem(item, patch, operador) — corrige um item e, se a
--     ordem já é OS, lança só a diferença no estoque;
--   • aprovar_orcamento(ordem, aprovado_por, operador, vínculos) — vira OS,
--     liga as peças avulsas que ganharam cadastro (#655) e baixa as peças.
--
-- QUATRO DECISÕES QUE VALEM SABER ANTES DE MEXER AQUI:
--
-- 1. A TRAVA É A LINHA DA ORDEM. As três começam com `select ... from
--    ordens_servico where id = ... for update`: a linha da ordem fica presa
--    até o fim da transação. Quem chega depois ESPERA a vez — e, quando
--    entra, relê o status já com o que o outro gravou. Então ou o pneu entra
--    antes (e a aprovação, que lê os itens depois de travar, baixa ele) ou
--    entra depois (e vê "já é OS" e baixa sozinho). Nunca no meio. Não há
--    tranca nova nem tabela nova: é a trava de linha comum do Postgres, que
--    some sozinha no commit ou no erro.
--
-- 2. TUDO OU NADA. Erro em qualquer passo desfaz a função inteira: não sobra
--    item gravado sem a baixa dele, nem orçamento aprovado com metade das
--    peças baixadas. Por isso, sem depósito ativo na loja, aprovar um
--    orçamento com peça FALHA inteiro (continua orçamento) — antes a OS
--    ficava aprovada e a baixa falhava depois. A única exceção, de
--    propósito, são os vínculos de peça avulsa na aprovação (decisão 4).
--
-- 3. RODAM COMO QUEM CHAMA (`security invoker`). Não atravessam a RLS: quem
--    não enxerga a ordem pela RLS de hoje recebe "não encontrada" (ou null,
--    na aprovação) e nada é gravado. Nenhuma policy muda aqui.
--
-- 4. VÍNCULO QUE FALHA NÃO DERRUBA A APROVAÇÃO. Igual ao programa de antes
--    (#655): cada vínculo roda num bloco próprio (`begin ... exception`); se
--    um falha por peça apagada ou id inválido (só esses erros; qualquer outro
--    derruba a aprovação inteira), o item fica avulso — sem
--    baixa, o que é coerente —, os outros seguem, a aprovação vale, e a
--    função devolve quais itens não foram ligados, pra tela avisar.
--
-- 5. OS FATURADA NÃO ACEITA ITEM. Acrescentar e corrigir recusam a OS já
--    faturada, conferida depois da trava: o pagamento já entrou no Caixa pelo
--    total de antes, e outro computador pode ter faturado com a tela aberta.
--
-- As regras de "nome do documento" (a referência do movimento: "Orçamento
-- 45", "OS 17", "Venda 17") e de "depósito padrão" (o depósito ativo mais
-- antigo da loja) são as mesmas do programa (nomeDocumento em
-- src/types/os.ts e buscarDepositoPadraoId em src/lib/depositos.ts), escritas
-- uma vez cada numa função pequena aqui embaixo, pras três usarem.
--
-- ORDEM AO SUBIR: tanto faz. Só acrescenta funções; a versão anterior do
-- programa continua funcionando igual (com o mesmo risco raro de antes), por
-- isso esta migration NÃO tem a linha de versão mínima do programa.
--
-- Idempotente: seguro rodar de novo.

drop function if exists adicionar_itens_ordem(uuid, jsonb, uuid);
drop function if exists editar_item_ordem(uuid, jsonb, uuid);
drop function if exists aprovar_orcamento(uuid, text, uuid, jsonb);
drop function if exists nome_documento_ordem(text, integer, integer, text);
drop function if exists deposito_padrao_da_loja(uuid);

-- ---------------------------------------------------------------------------
-- 0. As duas pequenas
-- ---------------------------------------------------------------------------

-- O nome do documento, igual a nomeDocumento (src/types/os.ts): sem número de
-- OS, ou ainda orçamento/recusado → "Orçamento N"; senão "OS N" (ou "Venda N"
-- na venda de balcão).
create or replace function nome_documento_ordem(
  p_status text,
  p_numero integer,
  p_numero_orcamento integer,
  p_tipo text
)
returns text
language sql
immutable
security invoker
set search_path = public
as $$
  select case
    when p_numero is null or p_status in ('orcamento', 'recusado')
      then trim('Orçamento ' || coalesce(p_numero_orcamento::text, ''))
    else (case when p_tipo = 'venda_balcao' then 'Venda ' else 'OS ' end) || p_numero::text
  end;
$$;

comment on function nome_documento_ordem(text, integer, integer, text) is
  '#706. O nome do documento ("Orçamento 45", "OS 17", "Venda 17"), igual a '
  'nomeDocumento (src/types/os.ts). Usado como referência do movimento de estoque.';

-- O depósito padrão da loja, igual a buscarDepositoPadraoId
-- (src/lib/depositos.ts): o ativo mais antigo. Sem nenhum, recusa com a mesma
-- mensagem do programa. Pela RLS de quem chama (depósito de loja que a pessoa
-- não enxerga não conta).
create or replace function deposito_padrao_da_loja(p_loja uuid)
returns uuid
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_deposito uuid;
begin
  select id into v_deposito
    from depositos
   where loja_id = p_loja
     and ativo
   order by criado_em
   limit 1;
  if v_deposito is null then
    raise exception 'Nenhum depósito ativo encontrado pra essa loja. Cadastre ou reative um depósito em Configurações antes de continuar.';
  end if;
  return v_deposito;
end;
$$;

comment on function deposito_padrao_da_loja(uuid) is
  '#706. O depósito ativo mais antigo da loja (igual a buscarDepositoPadraoId, '
  'src/lib/depositos.ts); sem nenhum, recusa com a mensagem do programa.';

-- ---------------------------------------------------------------------------
-- 1. Acrescentar itens numa ordem (orçamento ou OS)
-- ---------------------------------------------------------------------------
-- p_itens: lista de itens no formato NovoItemOS (tipo, peca_id, servico_id,
-- tecnico_id, descricao, quantidade, preco_unitario, desconto e, opcional,
-- custo_unitario). Lista vazia só marca quem mexeu por último.
-- Em orçamento (ou recusado) não baixa nada: quem baixa é a aprovação.

create or replace function adicionar_itens_ordem(
  p_ordem uuid,
  p_itens jsonb,
  p_operador uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem ordens_servico%rowtype;
  v_pecas ordens_servico_itens[];
  v_deposito uuid;
begin
  -- A trava (decisão 1 do cabeçalho).
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found then
    raise exception 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.';
  end if;

  -- OS faturada não aceita item: o pagamento já entrou no Caixa pelo total
  -- de antes. A tela esconde o botão, mas outro computador pode ter faturado
  -- com ela aberta; com a trava, a situação lida aqui é a de verdade.
  if v_ordem.status = 'faturada' then
    raise exception 'Esta OS já foi faturada (talvez em outro computador): não dá mais pra acrescentar ou corrigir peça ou serviço nela. Atualize a OS.';
  end if;

  -- p_itens é lido uma vez só: o insert devolve as peças do cadastro que
  -- gravou (já com a quantidade como ficou na tabela), e é delas que sai o
  -- estoque. preco_unitario e desconto têm padrão 0 na tabela; item que não
  -- disser fica com o padrão, como num insert comum.
  with gravados as (
    insert into ordens_servico_itens
      (ordem_servico_id, tipo, peca_id, servico_id, tecnico_id, descricao,
       quantidade, preco_unitario, desconto, custo_unitario)
    select p_ordem, i.tipo, i.peca_id, i.servico_id, i.tecnico_id, i.descricao,
           i.quantidade, coalesce(i.preco_unitario, 0), coalesce(i.desconto, 0), i.custo_unitario
      from jsonb_populate_recordset(null::ordens_servico_itens, coalesce(p_itens, '[]'::jsonb)) i
    returning *
  )
  select array_agg(g order by g.id) into v_pecas
    from gravados g
   where g.tipo = 'peca' and g.peca_id is not null;

  -- Já é OS: as peças do cadastro saem do estoque agora, um movimento por
  -- item (como o programa sempre fez). Peça avulsa e serviço não mexem.
  if v_ordem.status not in ('orcamento', 'recusado') and v_pecas is not null then
    v_deposito := deposito_padrao_da_loja(v_ordem.loja_id);
    insert into estoque_movimentos
      (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
    select i.peca_id, v_deposito, 'saida', i.quantidade, 'uso_em_os',
           nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo),
           v_ordem.loja_id
      from unnest(v_pecas) i;
  end if;

  update ordens_servico set atualizado_por_id = p_operador where id = p_ordem;
end;
$$;

comment on function adicionar_itens_ordem(uuid, jsonb, uuid) is
  '#706. Acrescenta itens (lista de NovoItemOS) numa ordem, com a linha da ordem '
  'travada (for update) até o fim; se a ordem já é OS, baixa as peças do cadastro '
  'na mesma transação ("saida", "uso_em_os", referência = nome do documento). '
  'Em orçamento/recusado não baixa. Pela RLS de quem chama.';

-- ---------------------------------------------------------------------------
-- 2. Corrigir um item já lançado
-- ---------------------------------------------------------------------------
-- p_patch: só os campos que mudam (o resto fica como está no banco). id e
-- ordem_servico_id nunca mudam, mesmo que venham no patch.
-- O "antes" da conta do estoque é o item do BANCO, relido depois da trava —
-- não o que a tela tinha, que pode estar velho.

create or replace function editar_item_ordem(
  p_item uuid,
  p_patch jsonb,
  p_operador uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem_id uuid;
  v_ordem ordens_servico%rowtype;
  v_original ordens_servico_itens%rowtype;
  v_novo ordens_servico_itens%rowtype;
  v_deposito uuid;
  v_dif record;
begin
  select ordem_servico_id into v_ordem_id from ordens_servico_itens where id = p_item;
  if v_ordem_id is not null then
    -- A trava (decisão 1 do cabeçalho).
    select * into v_ordem from ordens_servico where id = v_ordem_id for update;
  end if;
  if v_ordem_id is null or v_ordem.id is null then
    raise exception 'Este item não foi encontrado (talvez tenha sido apagado em outro computador). Atualize a OS.';
  end if;

  -- OS faturada não aceita item: o pagamento já entrou no Caixa pelo total
  -- de antes. A tela esconde o botão, mas outro computador pode ter faturado
  -- com ela aberta; com a trava, a situação lida aqui é a de verdade.
  if v_ordem.status = 'faturada' then
    raise exception 'Esta OS já foi faturada (talvez em outro computador): não dá mais pra acrescentar ou corrigir peça ou serviço nela. Atualize a OS.';
  end if;

  -- Só agora, com a ordem presa, o item como está. O `for update` do item
  -- cobre também quem mexe nele sem passar por aqui (a versão anterior do
  -- programa): a conta parte sempre da última versão gravada.
  select * into v_original
    from ordens_servico_itens
   where id = p_item and ordem_servico_id = v_ordem_id
     for update;
  if not found then
    raise exception 'Este item não foi encontrado (talvez tenha sido apagado em outro computador). Atualize a OS.';
  end if;

  v_novo := jsonb_populate_record(v_original, coalesce(p_patch, '{}'::jsonb));

  -- O item vai antes do estoque (tudo na mesma transação de qualquer jeito).
  -- O `returning` traz o que ficou gravado (quantidade já com 2 casas), que
  -- é o que a conta do estoque usa.
  update ordens_servico_itens
     set tipo           = v_novo.tipo,
         peca_id        = v_novo.peca_id,
         servico_id     = v_novo.servico_id,
         tecnico_id     = v_novo.tecnico_id,
         descricao      = v_novo.descricao,
         quantidade     = v_novo.quantidade,
         preco_unitario = v_novo.preco_unitario,
         desconto       = v_novo.desconto,
         custo_unitario = v_novo.custo_unitario
   where id = p_item
  returning * into v_novo;

  -- Já é OS: lança só a diferença, peça por peça (a mesma conta de
  -- diferencasDeEstoque em src/lib/ordensServico.ts). Mudou só o preço: nada.
  -- Saiu mais peça: "saida"/"uso_em_os". Voltou peça pra prateleira:
  -- "entrada"/"ajuste" (não existe "des-uso em OS").
  if v_ordem.status not in ('orcamento', 'recusado') then
    for v_dif in
      select d.peca_id, sum(d.quantidade) as diferenca
        from (
          select v_novo.peca_id as peca_id, v_novo.quantidade as quantidade
           where v_novo.tipo = 'peca' and v_novo.peca_id is not null
          union all
          select v_original.peca_id, -v_original.quantidade
           where v_original.tipo = 'peca' and v_original.peca_id is not null
        ) d
       group by d.peca_id
      having sum(d.quantidade) <> 0
       order by d.peca_id
    loop
      if v_deposito is null then
        v_deposito := deposito_padrao_da_loja(v_ordem.loja_id);
      end if;
      insert into estoque_movimentos
        (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
      values (
        v_dif.peca_id,
        v_deposito,
        case when v_dif.diferenca > 0 then 'saida' else 'entrada' end,
        abs(v_dif.diferenca),
        case when v_dif.diferenca > 0 then 'uso_em_os' else 'ajuste' end,
        nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo)
          || ' (correção de item)',
        v_ordem.loja_id
      );
    end loop;
  end if;

  update ordens_servico set atualizado_por_id = p_operador where id = v_ordem_id;
end;
$$;

comment on function editar_item_ordem(uuid, jsonb, uuid) is
  '#706. Corrige um item (p_patch = só os campos que mudam), com a linha da ordem '
  'travada (for update) e o item relido do banco depois da trava; se a ordem já é '
  'OS, lança só a diferença por peça na mesma transação (mais peça: saida/uso_em_os; '
  'menos: entrada/ajuste; referência "<documento> (correção de item)"). Pela RLS de quem chama.';

-- ---------------------------------------------------------------------------
-- 3. Aprovar o orçamento
-- ---------------------------------------------------------------------------
-- p_vinculos (#655): [{"item_id": ..., "peca_id": ...}, ...] — as peças
-- avulsas que ganham cadastro na aprovação.
--
-- Devolve null se a ordem não existe (ou a pessoa não enxerga) ou já não é
-- orçamento (outro computador aprovou ou recusou antes): nada muda. Senão:
--   {"ordem": <a linha já aprovada, com o número de OS>,
--    "nao_ligados": [{"id": .., "descricao": ..}, ...]}   ('[]' se nenhum)

create or replace function aprovar_orcamento(
  p_ordem uuid,
  p_aprovado_por text,
  p_operador uuid,
  p_vinculos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem ordens_servico%rowtype;
  v_vinculo jsonb;
  v_nao_ligados text[] := '{}';
  v_lista jsonb;
  v_deposito uuid;
begin
  -- A trava (decisão 1 do cabeçalho).
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found or v_ordem.status <> 'orcamento' then
    return null;
  end if;

  -- Vira OS. O gatilho da 0065 dá o próximo número e a data de abertura.
  update ordens_servico
     set status            = 'em_andamento',
         aprovado_por      = nullif(trim(p_aprovado_por), ''),
         aprovado_em       = now(),
         atualizado_por_id = p_operador
   where id = p_ordem
     and status = 'orcamento'
  returning * into v_ordem;
  -- Segunda proteção: com a trava acima isto nunca acontece, mas se um dia a
  -- trava sair, a segunda aprovação cai aqui em vez de aprovar de novo.
  if not found then
    return null;
  end if;

  -- Os vínculos, cada um no seu bloco (decisão 4 do cabeçalho). Só pega item
  -- desta ordem que ainda é peça avulsa: nunca troca a peça de um item do
  -- cadastro nem põe peça num serviço.
  for v_vinculo in
    select e from jsonb_array_elements(coalesce(p_vinculos, '[]'::jsonb)) e
  loop
    begin
      update ordens_servico_itens
         set peca_id = (v_vinculo ->> 'peca_id')::uuid
       where id = (v_vinculo ->> 'item_id')::uuid
         and ordem_servico_id = p_ordem
         and tipo = 'peca'
         and peca_id is null;
    -- Só os erros esperados de um vínculo (peça apagada, id que não é uuid).
    -- Qualquer outro derruba a aprovação inteira, em vez de virar "não ligado".
    exception when foreign_key_violation or invalid_text_representation then
      v_nao_ligados := v_nao_ligados || (v_vinculo ->> 'item_id');
    end;
  end loop;

  -- A baixa: os itens como estão AGORA no banco (depois dos vínculos), um
  -- movimento por item de peça do cadastro, com o nome da OS já aprovada.
  if exists (
    select 1 from ordens_servico_itens
     where ordem_servico_id = p_ordem and tipo = 'peca' and peca_id is not null
  ) then
    v_deposito := deposito_padrao_da_loja(v_ordem.loja_id);
    insert into estoque_movimentos
      (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
    select i.peca_id, v_deposito, 'saida', i.quantidade, 'uso_em_os',
           nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo),
           v_ordem.loja_id
      from ordens_servico_itens i
     where i.ordem_servico_id = p_ordem
       and i.tipo = 'peca'
       and i.peca_id is not null;
  end if;

  -- Os não ligados que ainda existem (item apagado em outro computador não
  -- tem peça pra avisar), na ordem em que vieram.
  select coalesce(
           jsonb_agg(jsonb_build_object('id', i.id, 'descricao', i.descricao)
                     order by array_position(v_nao_ligados, i.id::text)),
           '[]'::jsonb
         )
    into v_lista
    from ordens_servico_itens i
   where i.ordem_servico_id = p_ordem
     and i.id::text = any (v_nao_ligados);

  return jsonb_build_object('ordem', to_jsonb(v_ordem), 'nao_ligados', v_lista);
end;
$$;

comment on function aprovar_orcamento(uuid, text, uuid, jsonb) is
  '#706. Aprova o orçamento com a linha da ordem travada (for update): vira '
  'em_andamento (o gatilho da 0065 numera), liga as peças avulsas de p_vinculos '
  '(cada uma no seu bloco: a que falha não para a aprovação) e baixa as peças do '
  'cadastro lidas depois dos vínculos, tudo na mesma transação. Devolve null se '
  'não achou ou já não é orçamento; senão {"ordem": .., "nao_ligados": [{"id","descricao"}]}. '
  'Pela RLS de quem chama.';

-- O Postgres dá EXECUTE a PUBLIC (e o Supabase ao `anon`) em toda função
-- nova. Mesmo rodando como quem chama, só quem está logado.
revoke all on function nome_documento_ordem(text, integer, integer, text) from public, anon;
revoke all on function deposito_padrao_da_loja(uuid) from public, anon;
revoke all on function adicionar_itens_ordem(uuid, jsonb, uuid) from public, anon;
revoke all on function editar_item_ordem(uuid, jsonb, uuid) from public, anon;
revoke all on function aprovar_orcamento(uuid, text, uuid, jsonb) from public, anon;
grant execute on function nome_documento_ordem(text, integer, integer, text) to authenticated;
grant execute on function deposito_padrao_da_loja(uuid) to authenticated;
grant execute on function adicionar_itens_ordem(uuid, jsonb, uuid) to authenticated;
grant execute on function editar_item_ordem(uuid, jsonb, uuid) to authenticated;
grant execute on function aprovar_orcamento(uuid, text, uuid, jsonb) to authenticated;

insert into schema_versao (versao) values (71) on conflict do nothing;

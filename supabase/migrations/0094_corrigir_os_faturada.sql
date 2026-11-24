-- Sakura System — AutoCenter Edition
-- Migration 0094: corrigir peça, serviço E VALOR de uma OS (ou venda de
-- balcão) JÁ FATURADA, com a diferença no Caixa de HOJE (tarefa #1182;
-- decisões da Sofia em 24/11/2026).
--
-- O PROBLEMA. A troca da 0087 só aceita o mesmo total ("mudar o valor vem
-- numa próxima etapa"). Na loja, a OS já faturada e paga às vezes precisa de
-- um serviço a mais, ou de uma peça mais barata, e o total muda. Esta é a
-- próxima etapa: a diferença entra no Caixa de HOJE e o dia da fatura nunca
-- muda (não se reescreve o passado).
--
-- O QUE ESTA MIGRATION CRIA:
--   1. `contas_receber.origem` ('faturamento' ou 'correcao'). Até aqui era UMA
--      conta por OS (`contas_receber_ordem_id_unique`, 0036). Agora a regra de
--      "uma só" vale só pra conta do FATURAMENTO (índice único parcial); a
--      diferença que fica a receber vira uma conta nova, de origem 'correcao'.
--      O faturar do programa não manda `origem` e cai no padrão 'faturamento':
--      nada muda pra ele.
--   2. A categoria de caixa "Devolução ao cliente" (saída) NÃO é semeada:
--      ela nasce na primeira devolução, em "a_classificar" (a loja escolhe o
--      grupo do DRE, como em toda categoria em uso, 0088). Se já existe uma com
--      esse nome, é ela que é usada.
--   3. Em `ordens_servico_trocas` (o histórico da OS, 0087/0093): o total
--      antes e depois, o acerto ('conta_aberta', 'pago_agora', 'a_receber',
--      'devolvido'), o lançamento de caixa e a conta a receber que a correção
--      criou ou mudou, e a CHAVE (uma por janela aberta: a mesma chamada duas
--      vezes não lança duas vezes).
--   4. A função `corrigir_os_faturada(...)`, uma transação só, no padrão da
--      0087: trava a OS; só faturada; só o gerente (admin da loja); nota
--      fiscal não cancelada bloqueia (SKNOT); motivo obrigatório; caixa de
--      HOJE fechado bloqueia (SKCXH; o do dia da fatura fechado NÃO trava
--      mais); o total que a tela mostrou como faturado tem que ser o do banco
--      (SKMUD); itens, estoque e peça avulsa exatamente como a 0087 (SKNEG).
--      Depois acerta a diferença, decidindo o caso AQUI, sem confiar na tela:
--        • a conta a receber do faturamento ainda em aberto → a conta muda de
--          valor ('conta_aberta'), nada no Caixa;
--        • senão, subiu → 'pago_agora' (Entrada no Caixa de hoje) ou
--          'a_receber' (conta nova só da diferença, com vencimento);
--        • senão, desceu → 'devolvido' (Saída "Devolução ao cliente" no Caixa
--          de hoje);
--        • diferença zero → sem acerto (é a troca de total igual de sempre).
--      Acerto que não vale pro caso → SKMUD (a situação mudou em outro
--      computador). E grava a linha do histórico.
--
-- A 0087 (`trocar_itens_os_faturada`) FICA como está: a versão anterior do
-- programa ainda a usa. A versão nova chama só esta, também com o total igual
-- (acerto nulo).
--
-- O QUE NÃO MUDA, de propósito: a nota fiscal (só a mensagem leva à janela de
-- cancelar que já existe); o dia da fatura e o que foi lançado nele; a conta
-- do faturamento quando ela já foi recebida; a forma de pagamento da OS.
-- Comissão, custo e lucro são recalculados dos itens e seguem os novos.
--
-- POR QUE O "HOJE" VEM DA TELA. O banco não sabe o fuso da loja (a mesma
-- razão do `p_momento` da 0058 e do dia da fatura da 0087): o caixa de hoje é
-- o dia no relógio da loja. O banco só aceita um dia a até 1 dia da data de
-- agora em UTC, pra não dar pra fugir da trava mandando uma data qualquer.
--
-- RODA COMO QUEM CHAMA (`security invoker`, decisão 3 da 0071): a RLS de cada
-- tabela vale como se a pessoa tivesse feito cada passo. Nenhuma policy muda:
-- o admin da loja já pode lançar no Caixa (tem todos os módulos, 0062/0075),
-- criar e mudar conta a receber (0061/0075) e gravar no histórico (0093).
--
-- ORDEM AO SUBIR: migration ANTES da versão do programa que tem a janela
-- "Corrigir a OS". Só acrescenta (colunas com padrão, um índice no lugar de
-- uma constraint que diz a mesma coisa pro faturamento, e uma função); a versão anterior continua igual. NÃO tem a linha de versão mínima
-- do programa.
--
-- Idempotente: seguro rodar de novo.

-- ---------------------------------------------------------------------------
-- 1. Contas a receber: de onde a conta veio
-- ---------------------------------------------------------------------------

alter table contas_receber
  add column if not exists origem text not null default 'faturamento';

alter table contas_receber drop constraint if exists ck_contas_receber_origem;
alter table contas_receber add constraint ck_contas_receber_origem
  check (origem in ('faturamento', 'correcao'));

comment on column contas_receber.origem is
  '#1182. faturamento: a conta criada ao faturar a OS "a receber depois" (uma só por OS). '
  'correcao: a diferença de uma correção de OS faturada que ficou a receber (pode haver várias).';

-- A conta do faturamento continua uma só por OS; as da correção, não.
alter table contas_receber drop constraint if exists contas_receber_ordem_id_unique;
drop index if exists contas_receber_ordem_id_unique;
drop index if exists contas_receber_faturamento_unique;
create unique index contas_receber_faturamento_unique
  on contas_receber (ordem_servico_id)
  where origem = 'faturamento' and ordem_servico_id is not null;

-- As contas de uma OS (a do faturamento e as das correções) são lidas pela OS.
create index if not exists contas_receber_ordem_servico_idx
  on contas_receber (ordem_servico_id);

-- ---------------------------------------------------------------------------
-- 3. O histórico ganha o acerto
-- ---------------------------------------------------------------------------

alter table ordens_servico_trocas add column if not exists total_antes numeric(12,2);
alter table ordens_servico_trocas add column if not exists total_depois numeric(12,2);
alter table ordens_servico_trocas add column if not exists acerto text;
alter table ordens_servico_trocas
  add column if not exists caixa_movimento_id uuid references caixa_movimentos (id) on delete set null;
alter table ordens_servico_trocas
  add column if not exists conta_receber_id uuid references contas_receber (id) on delete set null;
alter table ordens_servico_trocas add column if not exists chave uuid;

alter table ordens_servico_trocas drop constraint if exists ck_ordens_servico_trocas_acerto;
alter table ordens_servico_trocas add constraint ck_ordens_servico_trocas_acerto
  check (acerto is null or acerto in ('conta_aberta', 'pago_agora', 'a_receber', 'devolvido'));

-- A linha de correção de valor sempre diz o antes, o depois e o acerto.
alter table ordens_servico_trocas drop constraint if exists ck_ordens_servico_trocas_correcao;
alter table ordens_servico_trocas add constraint ck_ordens_servico_trocas_correcao
  check (tipo <> 'correcao_valor'
         or (acerto is not null and total_antes is not null and total_depois is not null));

drop index if exists ordens_servico_trocas_chave_unique;
create unique index ordens_servico_trocas_chave_unique
  on ordens_servico_trocas (chave)
  where chave is not null;

comment on column ordens_servico_trocas.acerto is
  '#1182. Como a diferença da correção foi acertada: conta_aberta (a conta do faturamento '
  'mudou de valor), pago_agora (Entrada no Caixa do dia), a_receber (conta nova só da '
  'diferença) ou devolvido (Saída "Devolução ao cliente"). Nulo quando o total não mudou.';
comment on column ordens_servico_trocas.chave is
  '#1182. Uma por janela aberta: a mesma correção mandada duas vezes devolve a mesma linha '
  'e não lança nada de novo.';

-- ---------------------------------------------------------------------------
-- 4. A correção
-- ---------------------------------------------------------------------------
-- p_itens: a LISTA FINAL de itens da OS (como na 0087: com "id" fica, sem
--   "id" é novo, o que não está na lista sai).
-- p_hoje: o dia de hoje no relógio da loja (o Caixa em que a diferença entra).
-- p_total_faturado: o total que a tela mostrou como faturado.
-- p_acerto: nulo quando o total não muda; senão um dos quatro (ver o
--   cabeçalho). p_forma_pagamento: pago_agora e devolvido. p_vencimento:
--   a_receber.
-- p_chave: uma por janela aberta (idempotência).
-- p_aceita_estoque_negativo: a pessoa viu o aviso de estoque e confirmou.
-- Devolve o id da linha do histórico.

drop function if exists corrigir_os_faturada(uuid, jsonb, text, date, numeric, text, text, date, uuid, boolean, uuid);

create or replace function corrigir_os_faturada(
  p_ordem uuid,
  p_itens jsonb,
  p_motivo text,
  p_hoje date,
  p_total_faturado numeric,
  p_acerto text,
  p_forma_pagamento text,
  p_vencimento date,
  p_chave uuid,
  p_aceita_estoque_negativo boolean,
  p_operador uuid
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem ordens_servico%rowtype;
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_forma text := nullif(trim(coalesce(p_forma_pagamento, '')), '');
  v_nome text;
  v_existente record;
  v_antes jsonb;
  v_depois jsonb;
  v_total_antes numeric;
  v_total_depois numeric;
  v_diferenca numeric(12,2);
  v_ids_lista uuid[];
  v_item jsonb;
  v_original ordens_servico_itens%rowtype;
  v_novo ordens_servico_itens%rowtype;
  v_deposito uuid;
  v_referencia text;
  v_dif record;
  v_negativas text;
  v_conta contas_receber%rowtype;
  v_conta_em_aberto boolean;
  v_acerto_vale boolean;
  v_categoria uuid;
  v_movimento uuid;
  v_conta_id uuid;
  v_linha uuid;
begin
  if p_chave is null then
    raise exception 'Faltou a identificação desta correção. Feche a janela, abra de novo e tente outra vez.';
  end if;

  -- 1. A trava (decisão 1 da 0071).
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found then
    raise exception 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.';
  end if;

  -- 2. Só o gerente (admin da loja da OS).
  if not operador_e_admin_da_loja(v_ordem.loja_id) then
    raise exception 'Só quem é gerente (administrador da loja) pode corrigir uma OS já faturada.';
  end if;

  -- 3. A mesma correção de novo (clique duplo, ou a resposta se perdeu):
  -- devolve a linha que já foi gravada e não faz mais nada. Vem DEPOIS da
  -- trava: uma segunda chamada simultânea espera a primeira terminar e então
  -- enxerga a linha dela.
  select id, ordem_servico_id into v_existente
    from ordens_servico_trocas
   where chave = p_chave;
  if found then
    if v_existente.ordem_servico_id <> v_ordem.id then
      raise exception 'Esta correção já foi usada em outra OS. Feche a janela, abra de novo e tente outra vez.';
    end if;
    return v_existente.id;
  end if;

  -- 4. Só OS faturada: as outras corrigem item pelo caminho comum.
  if v_ordem.status <> 'faturada' then
    raise exception 'Esta OS ainda não foi faturada: corrija os itens direto na OS.';
  end if;

  -- 5. Nota fiscal emitida (não cancelada) bloqueia: a nota ficaria
  -- diferente da OS. A tela leva à janela de cancelar a nota.
  if exists (
    select 1 from notas_fiscais_arquivos
     where ordem_servico_id = v_ordem.id
       and coalesce(status, '') <> 'cancelado'
  ) then
    raise exception 'Esta OS já tem nota fiscal emitida: não dá pra corrigir, porque a nota ficaria diferente da OS. Cancele a nota antes (o cancelamento tem prazo) e depois corrija.'
      using errcode = 'SKNOT';
  end if;

  -- 6. O caixa de HOJE (o dia no relógio da loja) fechado bloqueia: a
  -- diferença entraria nele. O do dia da fatura não trava mais.
  if p_hoje is null
     or abs(p_hoje - (now() at time zone 'UTC')::date) > 1 then
    raise exception 'Não deu pra saber o dia de hoje (confira a data e a hora deste computador) e tente de novo.';
  end if;
  if exists (
    select 1 from fechamentos_caixa
     where loja_id = v_ordem.loja_id and data = p_hoje
  ) then
    raise exception 'O caixa de hoje já foi fechado: desfaça o fechamento de hoje no Caixa antes de corrigir a OS.'
      using errcode = 'SKCXH';
  end if;

  -- 7. O motivo.
  if length(v_motivo) < 3 then
    raise exception 'Diga o motivo da correção (por exemplo: "faltou lançar o alinhamento").';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'A OS precisa continuar com pelo menos um item.';
  end if;

  if p_acerto is not null
     and p_acerto not in ('conta_aberta', 'pago_agora', 'a_receber', 'devolvido') then
    raise exception 'Jeito de acertar a diferença desconhecido. Atualize o programa e tente de novo.';
  end if;

  -- 8. Os itens como estão AGORA no banco (presos até o fim), e o total
  -- faturado que a tela mostrou tem que ser este (a folga de meio centavo da
  -- 0086).
  perform 1 from ordens_servico_itens where ordem_servico_id = v_ordem.id for update;

  select coalesce(sum(quantidade * preco_unitario - desconto), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'tipo', tipo, 'peca_id', peca_id, 'servico_id', servico_id, 'tecnico_id', tecnico_id,
           'descricao', descricao, 'quantidade', quantidade,
           'preco_unitario', preco_unitario, 'desconto', desconto) order by id), '[]'::jsonb)
    into v_total_antes, v_antes
    from ordens_servico_itens
   where ordem_servico_id = v_ordem.id;

  if p_total_faturado is null or abs(v_total_antes - p_total_faturado) > 0.005 then
    raise exception 'A OS mudou em outro computador. Atualize e tente de novo.'
      using errcode = 'SKMUD';
  end if;

  -- Os ids da lista precisam ser desta OS, e cada um uma vez só.
  select coalesce(array_agg((e ->> 'id')::uuid), '{}')
    into v_ids_lista
    from jsonb_array_elements(p_itens) e
   where nullif(e ->> 'id', '') is not null;
  if (select count(distinct x) from unnest(v_ids_lista) x) <> coalesce(array_length(v_ids_lista, 1), 0) then
    raise exception 'A lista de itens veio com um item repetido. Atualize a OS e tente de novo.';
  end if;
  if exists (
    select 1 from unnest(v_ids_lista) x
     where not exists (select 1 from ordens_servico_itens i where i.id = x and i.ordem_servico_id = v_ordem.id)
  ) then
    raise exception 'Um dos itens não é mais desta OS (talvez tenha mudado em outro computador). Atualize a OS e tente de novo.';
  end if;

  -- 9. Sai o que não está na lista; corrige os que ficam e grava os novos
  -- (igual à 0087).
  delete from ordens_servico_itens
   where ordem_servico_id = v_ordem.id
     and not (id = any (v_ids_lista));

  for v_item in select e from jsonb_array_elements(p_itens) e loop
    if nullif(v_item ->> 'id', '') is not null then
      select * into v_original from ordens_servico_itens where id = (v_item ->> 'id')::uuid;
      v_novo := jsonb_populate_record(v_original, v_item - 'id' - 'ordem_servico_id');
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
       where id = v_original.id;
    else
      v_novo := jsonb_populate_record(null::ordens_servico_itens, v_item - 'id');
      insert into ordens_servico_itens
        (ordem_servico_id, tipo, peca_id, servico_id, tecnico_id, descricao,
         quantidade, preco_unitario, desconto, custo_unitario)
      values
        (v_ordem.id, v_novo.tipo, v_novo.peca_id, v_novo.servico_id, v_novo.tecnico_id, v_novo.descricao,
         v_novo.quantidade, coalesce(v_novo.preco_unitario, 0), coalesce(v_novo.desconto, 0), v_novo.custo_unitario);
    end if;
  end loop;

  select coalesce(sum(quantidade * preco_unitario - desconto), 0),
         coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'tipo', tipo, 'peca_id', peca_id, 'servico_id', servico_id, 'tecnico_id', tecnico_id,
           'descricao', descricao, 'quantidade', quantidade,
           'preco_unitario', preco_unitario, 'desconto', desconto) order by id), '[]'::jsonb)
    into v_total_depois, v_depois
    from ordens_servico_itens
   where ordem_servico_id = v_ordem.id;

  -- Peça sem cadastro (avulsa, 0066) só se já estava na OS assim (igual à 0087).
  if exists (
    select 1 from jsonb_array_elements(v_depois) d
     where d ->> 'tipo' = 'peca' and nullif(d ->> 'peca_id', '') is null
       and not exists (
         select 1 from jsonb_array_elements(v_antes) a
          where a ->> 'id' = d ->> 'id' and a ->> 'tipo' = 'peca' and nullif(a ->> 'peca_id', '') is null
       )
  ) then
    raise exception 'Escolha a peça do cadastro em cada linha de peça.';
  end if;

  -- 10. A diferença, no centavo (até meio centavo é zero, como na 0086), e o
  -- acerto que vale pro caso, decidido AQUI com a conta do faturamento presa.
  if abs(v_total_depois - v_total_antes) <= 0.005 then
    v_diferenca := 0;
  else
    v_diferenca := round(v_total_depois - v_total_antes, 2);
  end if;

  select * into v_conta
    from contas_receber
   where ordem_servico_id = v_ordem.id and origem = 'faturamento'
   for update;
  v_conta_em_aberto := found and v_conta.status = 'pendente';

  if v_diferenca = 0 then
    v_acerto_vale := p_acerto is null;
  elsif v_conta_em_aberto then
    v_acerto_vale := p_acerto = 'conta_aberta';
  elsif v_diferenca > 0 then
    v_acerto_vale := p_acerto in ('pago_agora', 'a_receber');
  else
    v_acerto_vale := p_acerto = 'devolvido';
  end if;
  if not coalesce(v_acerto_vale, false) then
    raise exception 'A situação desta OS mudou (o total, ou a conta a receber dela, mudou em outro computador). Atualize e tente de novo.'
      using errcode = 'SKMUD';
  end if;

  -- O que cada acerto precisa, antes de mexer em estoque e dinheiro.
  if p_acerto in ('pago_agora', 'devolvido') and v_forma is null then
    raise exception 'Escolha a forma de pagamento.';
  end if;
  if p_acerto = 'a_receber' then
    if p_vencimento is null then
      raise exception 'Informe o vencimento da diferença.';
    end if;
    if p_vencimento < p_hoje then
      raise exception 'O vencimento não pode ser antes de hoje.';
    end if;
  end if;

  -- 11. O estoque, pela diferença de cada peça do cadastro (igual à 0087).
  v_nome := nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo);
  v_referencia := v_nome || ' (correção depois de faturada)';
  for v_dif in
    select d.peca_id, sum(d.quantidade) as diferenca
      from (
        select (e ->> 'peca_id')::uuid as peca_id, (e ->> 'quantidade')::numeric as quantidade
          from jsonb_array_elements(v_depois) e
         where e ->> 'tipo' = 'peca' and nullif(e ->> 'peca_id', '') is not null
        union all
        select (e ->> 'peca_id')::uuid, -(e ->> 'quantidade')::numeric
          from jsonb_array_elements(v_antes) e
         where e ->> 'tipo' = 'peca' and nullif(e ->> 'peca_id', '') is not null
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
      v_referencia,
      v_ordem.loja_id
    );

    -- Peça que baixou e ficou negativa, sem a pessoa ter confirmado.
    if v_dif.diferenca > 0 and not coalesce(p_aceita_estoque_negativo, false) then
      if (select coalesce(sum(case tipo when 'entrada' then quantidade else -quantidade end), 0)
            from estoque_movimentos
           where peca_id = v_dif.peca_id and loja_id = v_ordem.loja_id) < 0 then
        v_negativas := concat_ws(', ', v_negativas,
          (select descricao from pecas where id = v_dif.peca_id));
      end if;
    end if;
  end loop;

  if v_negativas is not null then
    raise exception 'O estoque ficaria negativo: %. Confira e confirme de novo se quiser seguir assim.', v_negativas
      using errcode = 'SKNEG';
  end if;

  -- 12. O dinheiro. `now()` é o momento de agora, que no relógio da loja é
  -- `p_hoje`: a diferença cai no Caixa de hoje, nunca no dia da fatura.
  if p_acerto = 'conta_aberta' then
    if v_conta.valor + v_diferenca < 0 then
      raise exception 'A conta a receber desta OS ficaria negativa (% + %). Confira os itens.',
        dinheiro_br(v_conta.valor), dinheiro_br(v_diferenca);
    end if;
    update contas_receber
       set valor = v_conta.valor + v_diferenca
     where id = v_conta.id;
    if not found then
      raise exception 'Você não tem permissão pra mudar a conta a receber desta OS.';
    end if;
    v_conta_id := v_conta.id;

  elsif p_acerto = 'pago_agora' then
    insert into caixa_movimentos
      (loja_id, data, ordem_servico_id, tipo, forma_pagamento, valor, descricao, categoria_id)
    values
      (v_ordem.loja_id, now(), v_ordem.id, 'entrada', v_forma, v_diferenca,
       'Correção da ' || v_nome, null)
    returning id into v_movimento;

  elsif p_acerto = 'a_receber' then
    insert into contas_receber
      (loja_id, cliente_id, ordem_servico_id, descricao, valor, vencimento, status, origem)
    values
      (v_ordem.loja_id, v_ordem.cliente_id, v_ordem.id, 'Diferença da correção da ' || v_nome,
       v_diferenca, p_vencimento, 'pendente', 'correcao')
    returning id into v_conta_id;

  elsif p_acerto = 'devolvido' then
    select id into v_categoria
      from categorias_caixa
     where nome = 'Devolução ao cliente' and tipo = 'saida';
    if v_categoria is null then
      -- A primeira devolução cria a categoria, "a classificar" (0088: o grupo
      -- do DRE é a loja que escolhe; nada é classificado sozinho).
      insert into categorias_caixa (nome, tipo, grupo)
      values ('Devolução ao cliente', 'saida', 'a_classificar')
      on conflict (nome, tipo) do nothing
      returning id into v_categoria;
      if v_categoria is null then
        select id into v_categoria
          from categorias_caixa
         where nome = 'Devolução ao cliente' and tipo = 'saida';
      end if;
    end if;
    -- SEM `ordem_servico_id`, de propósito: o programa lê os lançamentos de
    -- uma OS como PAGAMENTOS dela (as formas da NFC-e, a garantia, o lucro
    -- por lançamento), e uma saída ali entraria como se fosse pagamento. A
    -- ligação com a OS fica no histórico (`caixa_movimento_id`) e na
    -- descrição; no Caixa ela aparece como as outras saídas com categoria.
    insert into caixa_movimentos
      (loja_id, data, ordem_servico_id, tipo, forma_pagamento, valor, descricao, categoria_id)
    values
      (v_ordem.loja_id, now(), null, 'saida', v_forma, abs(v_diferenca),
       'Devolução da correção da ' || v_nome, v_categoria)
    returning id into v_movimento;
  end if;

  -- 13. O histórico, e quem mexeu por último.
  insert into ordens_servico_trocas
    (ordem_servico_id, loja_id, tipo, operador_id, operador_nome, motivo, itens_antes, itens_depois,
     total, total_antes, total_depois, acerto, caixa_movimento_id, conta_receber_id, chave)
  values (
    v_ordem.id, v_ordem.loja_id,
    case when v_diferenca = 0 then 'troca' else 'correcao_valor' end,
    auth.uid(),
    (select nome from operadores where id = auth.uid()),
    v_motivo, v_antes, v_depois,
    round(v_total_depois, 2), round(v_total_antes, 2), round(v_total_depois, 2),
    case when v_diferenca = 0 then null else p_acerto end,
    v_movimento, v_conta_id, p_chave
  )
  returning id into v_linha;

  update ordens_servico set atualizado_por_id = p_operador where id = v_ordem.id;

  return v_linha;
end;
$$;

comment on function corrigir_os_faturada(uuid, jsonb, text, date, numeric, text, text, date, uuid, boolean, uuid) is
  '#1182. Corrige peça, serviço e valor de uma OS FATURADA, com a OS travada, numa '
  'transação só. Só admin da loja; nota fiscal não cancelada (SKNOT), caixa de hoje '
  'fechado (SKCXH) e sem motivo recusam; total faturado diferente do banco ou acerto que '
  'não vale pro caso: SKMUD; estoque negativo sem confirmação: SKNEG. A diferença: conta '
  'do faturamento em aberto muda de valor; senão Entrada no Caixa de hoje, conta nova só '
  'da diferença, ou Saída "Devolução ao cliente". Mesma p_chave de novo devolve a mesma '
  'linha sem lançar nada. Grava o histórico em ordens_servico_trocas. Pela RLS de quem chama.';

revoke all on function corrigir_os_faturada(uuid, jsonb, text, date, numeric, text, text, date, uuid, boolean, uuid) from public, anon;
grant execute on function corrigir_os_faturada(uuid, jsonb, text, date, numeric, text, text, date, uuid, boolean, uuid) to authenticated;

insert into schema_versao (versao) values (94) on conflict do nothing;

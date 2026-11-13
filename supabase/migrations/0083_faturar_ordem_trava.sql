-- Sakura System — AutoCenter Edition
-- Migration 0083: faturar a OS com a linha da ordem travada e o total
-- conferido no banco (tarefa #803, caso 2). O mesmo caminho da 0071 (#706)
-- e da 0079 (#803, caso 1).
--
-- O PROBLEMA. Faturar é a tela somar os itens que ELA tem, cobrar o cliente
-- por esse total e mandar o banco marcar a OS como faturada. Até aqui o
-- programa (faturarOrdem, em src/lib/ordensServico.ts) mandava só um
-- `update ordens_servico set status = 'faturada'`, sem olhar os itens. Se
-- outro computador acrescentava ou corrigia uma peça na mesma OS no mesmo
-- instante, a OS era faturada com um total que já não era o do banco: o
-- Caixa recebia o valor velho, e a OS (e a nota) ficava com o novo. Quem
-- acrescenta já recusa OS faturada (decisão 5 da 0071), mas só se o
-- faturamento chegar PRIMEIRO; se o item chega antes, nada avisava.
--
-- O QUE ESTA MIGRATION CRIA: marcar_ordem_faturada(ordem, forma de
-- pagamento, parcelas, total da tela, operador), uma transação só:
--   1. trava a linha da ordem (`select ... for update`, decisão 1 da 0071):
--      quem acrescenta ou corrige item no meio espera, ou é esperado;
--   2. recusa orçamento/recusado (com a mesma frase do programa) e OS já
--      faturada (outro computador faturou antes);
--   3. soma os itens COMO ESTÃO NO BANCO (quantidade × preço − desconto) e
--      compara, no centavo, com o total que a tela cobrou. Diferente (ou
--      sem total) → recusa com o código próprio SK803, pra o programa
--      reconhecer e pedir pra atualizar a tela. Nada é gravado;
--   4. bateu → marca faturada, com a forma de pagamento, as parcelas, a
--      data de fechamento e quem mexeu por último.
-- O Caixa e as Contas a Receber continuam sendo lançados pelo programa,
-- DEPOIS desta função dar certo (é ela quem decide se o total vale).
--
-- A ESPERA É O QUE FAZ A CONTA VALER. Sem a trava, o faturamento podia ler
-- os itens antes de o item do outro computador gravar (a soma "bate" com a
-- tela velha) e marcar faturada logo depois do item entrar. Com a trava, ou
-- o item entra antes (e a soma daqui já o vê: recusa) ou depois (e quem
-- acrescenta vê "já foi faturada": recusa, pela 0071).
--
-- O STATUS. A troca pra 'faturada' passa pelo gatilho da 0065
-- (definir_numero_ordem_servico, `update of status`): de em_andamento,
-- concluida (inclusive a venda de balcão, que nasce concluída, 0064) ou
-- faturada ele não faz nada; de orçamento/recusado recusaria, mas esta
-- função já recusa antes, com a frase da tela. A data de fechamento é
-- `now()`, como o programa fazia; a trava de datas da 0060 aceita.
--
-- RODA COMO QUEM CHAMA (`security invoker`, decisão 3 da 0071): não
-- atravessa a RLS; quem não enxerga a ordem (outra loja, ou sem o módulo
-- OS) recebe "não encontrada" e nada é gravado. Nenhuma policy muda.
--
-- ORDEM AO SUBIR: migration ANTES da versão do programa que chama esta
-- função. Só acrescenta uma função; a versão anterior do programa continua
-- faturando do jeito de hoje (com o mesmo risco raro), por isso NÃO tem a
-- linha de versão mínima do programa.
--
-- O NÚMERO pode mudar se outro PR com migration (0083) entrar antes; quem
-- mescla depois renumera.
--
-- Idempotente: seguro rodar de novo.

drop function if exists marcar_ordem_faturada(uuid, text, integer, numeric, uuid);

create or replace function marcar_ordem_faturada(
  p_ordem uuid,
  p_forma_pagamento text,
  p_parcelas integer,
  p_total_da_tela numeric,
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
  v_total_do_banco numeric;
begin
  -- A trava (decisão 1 da 0071).
  select * into v_ordem from ordens_servico where id = p_ordem for update;
  if not found then
    raise exception 'Esta ordem não foi encontrada (talvez tenha sido apagada em outro computador). Atualize a lista.';
  end if;

  if v_ordem.status in ('orcamento', 'recusado') then
    raise exception 'Orçamento não é faturado: aprove o orçamento antes (ele vira OS).';
  end if;

  if v_ordem.status = 'faturada' then
    raise exception 'Esta OS já foi faturada (talvez em outro computador). Atualize a lista.';
  end if;

  -- Só agora, com a ordem presa, a soma dos itens como estão no banco.
  select coalesce(sum(quantidade * preco_unitario - desconto), 0)
    into v_total_do_banco
    from ordens_servico_itens
   where ordem_servico_id = v_ordem.id;

  if p_total_da_tela is null or round(v_total_do_banco, 2) <> round(p_total_da_tela, 2) then
    raise exception 'Esta OS mudou em outro computador. Atualize a tela e fature de novo.'
      using errcode = 'SK803';
  end if;

  update ordens_servico
     set status = 'faturada',
         forma_pagamento = p_forma_pagamento,
         parcelas = p_parcelas,
         data_fechamento = now(),
         atualizado_por_id = p_operador
   where id = v_ordem.id;
end;
$$;

comment on function marcar_ordem_faturada(uuid, text, integer, numeric, uuid) is
  '#803. Marca a OS como faturada (forma de pagamento, parcelas, data de fechamento, '
  'quem mexeu) com a linha da ordem travada (for update) até o fim, só se a soma dos '
  'itens no banco bate no centavo com o total que a tela cobrou; senão recusa com o '
  'código SK803 e não grava nada. Recusa orçamento/recusado e OS já faturada. Pela RLS '
  'de quem chama.';

-- O Postgres dá EXECUTE a PUBLIC (e o Supabase ao `anon`) em toda função
-- nova. Mesmo rodando como quem chama, só quem está logado.
revoke all on function marcar_ordem_faturada(uuid, text, integer, numeric, uuid) from public, anon;
grant execute on function marcar_ordem_faturada(uuid, text, integer, numeric, uuid) to authenticated;

insert into schema_versao (versao) values (83) on conflict do nothing;

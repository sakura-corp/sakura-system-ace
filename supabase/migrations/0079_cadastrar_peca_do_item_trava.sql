-- Sakura System — AutoCenter Edition
-- Migration 0079: ligar a peça avulsa ao cadastro com a ordem travada
-- (tarefa #803, caso 1). O mesmo caminho da 0071 (#706).
--
-- O PROBLEMA. "Cadastrar agora" na emissão da nota (#655) liga um item de
-- peça avulsa a uma peça do cadastro e, se a ordem já é OS, baixa o estoque.
-- Até aqui quem fazia isso era o programa (cadastrarPecaDoItem, em
-- src/lib/ordensServico.ts), em pedidos separados ao banco: gravava o
-- vínculo e decidia a baixa pela situação da ordem QUE ESTAVA NA TELA. Se
-- outro computador aprovava o orçamento no mesmo instante, a aprovação lia
-- os itens antes do vínculo (a peça ainda avulsa, sem baixa) e este
-- computador, achando que ainda era orçamento, também não baixava: a OS
-- ficava com uma peça do cadastro que nunca saiu do estoque.
--
-- O QUE ESTA MIGRATION CRIA: cadastrar_peca_do_item(item, peça, operador),
-- uma transação só:
--   1. trava a linha da ordem (`select ... for update`, decisão 1 da 0071):
--      uma aprovação no meio espera, ou é esperada;
--   2. liga a peça, só se o item ainda é peça avulsa desta ordem (nunca troca
--      a peça de um item do cadastro nem põe peça num serviço);
--   3. se a ordem já é OS (qualquer situação fora orçamento/recusado,
--      inclusive faturada, que é quando a nota sai), baixa a quantidade do
--      item COMO ESTÁ NO BANCO, no depósito padrão, com o nome do documento —
--      as mesmas duas funções pequenas da 0071;
--   4. marca quem mexeu por último.
-- Devolve true se ligou; false se não achou o item (ou a ordem, pela RLS de
-- quem chama) ou se o item já não é peça avulsa (outro computador ligou
-- antes). Nada é gravado nesses casos.
--
-- TUDO OU NADA (decisão 2 da 0071). Antes, se a baixa falhava a peça ficava
-- ligada mesmo assim e a tela mandava lançar a saída à mão. Agora, sem
-- depósito ativo, ligar a peça numa OS falha INTEIRO: o item continua
-- avulso, e a mensagem diz pra cadastrar ou reativar um depósito.
--
-- RODA COMO QUEM CHAMA (`security invoker`, decisão 3 da 0071): não
-- atravessa a RLS; quem não enxerga a ordem recebe false. Nenhuma policy muda.
--
-- ORDEM AO SUBIR: migration ANTES da versão do programa que chama esta
-- função (a de antes não usa e continua igual, com o mesmo risco raro). Só
-- acrescenta uma função; por isso NÃO tem a linha de versão mínima.
--
-- Idempotente: seguro rodar de novo.

drop function if exists cadastrar_peca_do_item(uuid, uuid, uuid);

create or replace function cadastrar_peca_do_item(
  p_item uuid,
  p_peca uuid,
  p_operador uuid
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_ordem_id uuid;
  v_ordem ordens_servico%rowtype;
  v_item ordens_servico_itens%rowtype;
begin
  select ordem_servico_id into v_ordem_id from ordens_servico_itens where id = p_item;
  if not found then
    return false;
  end if;

  -- A trava (decisão 1 da 0071).
  select * into v_ordem from ordens_servico where id = v_ordem_id for update;
  if not found then
    return false;
  end if;

  -- Só agora, com a ordem presa, o vínculo: só pega o item se ele ainda é
  -- peça avulsa desta ordem.
  update ordens_servico_itens
     set peca_id = p_peca
   where id = p_item
     and ordem_servico_id = v_ordem.id
     and tipo = 'peca'
     and peca_id is null
  returning * into v_item;
  if not found then
    return false;
  end if;

  -- Já é OS: a peça sai do estoque agora, com a quantidade do banco.
  if v_ordem.status not in ('orcamento', 'recusado') then
    insert into estoque_movimentos
      (peca_id, deposito_id, tipo, quantidade, motivo, referencia, loja_id)
    values
      (v_item.peca_id, deposito_padrao_da_loja(v_ordem.loja_id), 'saida', v_item.quantidade, 'uso_em_os',
       nome_documento_ordem(v_ordem.status, v_ordem.numero, v_ordem.numero_orcamento, v_ordem.tipo),
       v_ordem.loja_id);
  end if;

  update ordens_servico set atualizado_por_id = p_operador where id = v_ordem.id;
  return true;
end;
$$;

comment on function cadastrar_peca_do_item(uuid, uuid, uuid) is
  '#803. Liga a peça do cadastro a um item de peça avulsa, com a linha da ordem '
  'travada (for update) até o fim; se a ordem já é OS (inclusive faturada), baixa a '
  'quantidade do item na mesma transação ("saida", "uso_em_os", referência = nome do '
  'documento). Devolve false se não achou o item/ordem ou se o item já não é peça '
  'avulsa. Pela RLS de quem chama.';

-- O Postgres dá EXECUTE a PUBLIC (e o Supabase ao `anon`) em toda função
-- nova. Mesmo rodando como quem chama, só quem está logado.
revoke all on function cadastrar_peca_do_item(uuid, uuid, uuid) from public, anon;
grant execute on function cadastrar_peca_do_item(uuid, uuid, uuid) to authenticated;

insert into schema_versao (versao) values (79) on conflict do nothing;

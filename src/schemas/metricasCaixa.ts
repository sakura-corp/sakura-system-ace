import { arredondarCentavo } from "./dinheiro";
import { custoUnitarioDoItem } from "./orcamento";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ItemOS, ItemParaVenda } from "@/types/os";
import { ehVendaBalcao, totalOrdem } from "@/types/os";

/**
 * Contas de Caixa usadas em mais de uma tela (Início, Caixa Diário e
 * Relações). Ficam aqui, como funções puras testáveis, porque as três
 * calculavam "lucro" de um jeito diferente e davam números diferentes pro
 * mesmo dia — ver PROJETO_STATUS.md, seção 6.
 *
 * Duas armadilhas que este arquivo existe pra resolver de uma vez:
 *
 * 1. Uma OS faturada com pagamento dividido gera VÁRIOS lançamentos de
 *    Caixa (um por forma). Somar o custo — ou contar a OS — uma vez por
 *    lançamento infla o resultado.
 * 2. Custo não é só o `preco_custo` da peça: o serviço também tem `custo`
 *    (mão de obra). Ignorar isso faz o lucro parecer maior do que é.
 *
 * E uma regra de 26/09/2026 (venda de balcão, migration 0064): a venda de
 * balcão é dinheiro de verdade, então entra em vendas, custo e lucro como
 * qualquer OS — mas NÃO entra no ticket médio. Ticket médio responde "quanto
 * rende cada carro que passa pela oficina", e um par de palhetas vendido no
 * balcão puxaria essa média pra baixo sem ter nada a ver com a pergunta.
 */

export type MapaCusto = Map<string, number>;

/** O que `custoDosItens` lê do item (a janela das comissões entrega só isso, #367). */
export type ItemParaCusto = Pick<
  ItemOS,
  "quantidade" | "tipo" | "peca_id" | "servico_id" | "custo_unitario"
>;

export function mapaCustoPecas(pecas: { id: string; preco_custo: number | null }[]): MapaCusto {
  return new Map(pecas.map((peca) => [peca.id, peca.preco_custo ?? 0]));
}

export function mapaCustoServicos(servicos: { id: string; custo: number | null }[]): MapaCusto {
  return new Map(servicos.map((servico) => [servico.id, servico.custo ?? 0]));
}

/**
 * Quanto custou pra loja o que foi vendido nesses itens (peça + serviço).
 * Peça avulsa (#655) usa o custo digitado no orçamento; sem ele, conta zero
 * aqui (o mesmo que peça cadastrada sem custo) — quem precisa saber que
 * falta custo usa `custoUnitarioDoItem` direto.
 */
export function custoDosItens(
  itens: readonly ItemParaCusto[],
  custoPeca: MapaCusto,
  custoServico: MapaCusto,
): number {
  return itens.reduce((total, item) => {
    const unitario = custoUnitarioDoItem(item, custoPeca, custoServico) ?? 0;
    return total + item.quantidade * unitario;
  }, 0);
}

/**
 * "Quanto custou essa ordem": recebe o id da OS e os itens dela. Existe pra
 * `resumirMovimentos` e `lucroPorMovimento` não dependerem de quem calcula o
 * custo: quem pode ver o cadastro de peças calcula pelos mapas; quem não pode
 * (Caixa e Início sem o módulo Estoque, #366) recebe o custo pronto do banco.
 */
export type CustoDaOrdem = (ordemId: string, itens: ItemParaVenda[]) => number;

/** Custo da ordem calculado item a item pelos mapas de custo (Relações etc.). */
export function custoDaOrdemPelosMapas(
  custoPeca: MapaCusto,
  custoServico: MapaCusto,
): CustoDaOrdem {
  // O Caixa de hoje só recebe quantidade/preço/desconto (janela da #367), que
  // não bastam pra este cálculo: ele serve a quem tem os itens inteiros.
  return (_ordemId, itens) =>
    custoDosItens(itens as unknown as readonly ItemParaCusto[], custoPeca, custoServico);
}

/** O que a função `custo_das_ordens` do banco devolve por OS. */
export type CustoDoBanco = Map<string, { custo: number; completo: boolean }>;

/** Custo da ordem vindo pronto do banco (OS que o banco não devolveu conta 0). */
export function custoDaOrdemPeloBanco(custos: CustoDoBanco): CustoDaOrdem {
  return (ordemId) => custos.get(ordemId)?.custo ?? 0;
}

export interface ResumoCaixa {
  /** Tudo que entrou (vendas de OS + entradas manuais). */
  entradas: number;
  /** Saídas lançadas à mão (aluguel, sucata, fornecedor pago...). */
  saidas: number;
  /** Custo do que foi vendido, contado uma vez por OS. */
  custoDeAquisicao: number;
  /** entradas − saídas − custo do que foi vendido. */
  lucro: number;
  /** Quantas OS distintas geraram entrada no período (sem venda de balcão). */
  ordensDistintas: number;
  /**
   * Média por OS — por ORDEM, não por lançamento, e só de OS: venda de
   * balcão fica de fora (ver o topo do arquivo).
   */
  ticketMedio: number;
}

export function resumirMovimentos(
  movimentos: MovimentoCaixa[],
  custoDaOrdem: CustoDaOrdem,
): ResumoCaixa {
  let entradas = 0;
  let saidas = 0;
  let custoDeAquisicao = 0;
  let totalDeOrdens = 0;
  // Uma OS com pagamento dividido aparece em vários lançamentos: o custo
  // dela entra uma vez só, e ela conta como uma OS só no ticket médio.
  const ordensJaContadas = new Set<string>();
  // O ticket médio conta à parte porque a venda de balcão entra no custo
  // (acima) mas não na média.
  const ordensDoTicket = new Set<string>();

  for (const movimento of movimentos) {
    if (movimento.tipo === "saida") {
      saidas += movimento.valor;
      continue;
    }

    entradas += movimento.valor;

    const ordemId = movimento.ordem_servico_id;
    if (!ordemId) continue;

    if (!ehVendaBalcao(movimento.ordem_servico)) {
      totalDeOrdens += movimento.valor;
      ordensDoTicket.add(ordemId);
    }
    if (ordensJaContadas.has(ordemId)) continue;
    ordensJaContadas.add(ordemId);
    custoDeAquisicao += custoDaOrdem(ordemId, movimento.ordem_servico?.itens ?? []);
  }

  const ordensDistintas = ordensDoTicket.size;

  return {
    entradas,
    saidas,
    custoDeAquisicao,
    lucro: entradas - saidas - custoDeAquisicao,
    ordensDistintas,
    ticketMedio: ordensDistintas > 0 ? totalDeOrdens / ordensDistintas : 0,
  };
}

/**
 * Lucro de cada lançamento, pra mostrar linha a linha. O lucro pertence à
 * OS inteira (venda − custo), então numa OS paga em duas formas ele é
 * repartido entre os lançamentos na proporção do que foi pago em cada um —
 * repetir o valor cheio em cada linha faria a coluna não fechar com o total.
 */
export function lucroPorMovimento(
  movimentos: MovimentoCaixa[],
  custoDaOrdem: CustoDaOrdem,
): Map<string, number> {
  const pagoPorOrdem = new Map<string, number>();
  for (const movimento of movimentos) {
    if (movimento.tipo !== "entrada" || !movimento.ordem_servico_id) continue;
    const atual = pagoPorOrdem.get(movimento.ordem_servico_id) ?? 0;
    pagoPorOrdem.set(movimento.ordem_servico_id, atual + movimento.valor);
  }

  const lucros = new Map<string, number>();
  for (const movimento of movimentos) {
    const ordem = movimento.ordem_servico;
    if (movimento.tipo !== "entrada" || !movimento.ordem_servico_id || !ordem) continue;

    const lucroDaOrdem =
      totalOrdem(ordem.itens ?? []) - custoDaOrdem(movimento.ordem_servico_id, ordem.itens ?? []);
    const pagoNaOrdem = pagoPorOrdem.get(movimento.ordem_servico_id) ?? 0;
    const fatia = pagoNaOrdem > 0 ? movimento.valor / pagoNaOrdem : 1;
    lucros.set(movimento.id, arredondarCentavo(lucroDaOrdem * fatia));
  }
  return lucros;
}

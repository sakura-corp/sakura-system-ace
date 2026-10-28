import { diaLocal } from "@/lib/datas";
import { resumirMovimentos, type CustoDaOrdem } from "./metricasCaixa";
import { DIAS_DE_CONTAS_VENCENDO } from "@/types/configuracao";
import type { CartaoMetrica } from "@/types/configuracao";
import type { ContaPagar } from "@/types/contaPagar";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ModuloChave } from "@/types/operador";

/**
 * As contas da tela Início, como funções puras.
 *
 * Ficam aqui, e não dentro de `PainelPage.tsx`, pela razão de sempre: conta
 * de dinheiro escrita dentro de uma tela já divergiu quatro vezes neste
 * projeto (PROJETO_STATUS.md, seção 6, itens 35, 40, 44 e 49), e o Início foi
 * justamente uma das telas que mostrava faturamento no lugar de lucro.
 *
 * O que é conta de Caixa mesmo (lucro, custo de aquisição, ticket médio) não
 * é reescrito aqui — vem de `metricasCaixa.ts`, que é onde o Caixa Diário e
 * as Relações também buscam, pra as três telas continuarem respondendo o
 * mesmo número pro mesmo período.
 */

/**
 * A janela do cartão "Contas a pagar vencendo" era "o mês corrente", e isso
 * tinha um ponto cego conhecido: no dia 31 o cartão mostrava R$ 0,00 com uma
 * conta vencendo no dia seguinte, porque a fronteira do mês não significa
 * nada pra quem paga conta. Agora são dias corridos
 * (`DIAS_DE_CONTAS_VENCENDO`, em `types/configuracao.ts` — fica lá porque a
 * explicação do cartão cita esse mesmo número).
 */

/**
 * A partir de quantos dias uma OS aberta (ou um carro parado no pátio) passa
 * a aparecer em cor de alerta.
 *
 * Três dias porque carro parado é dinheiro parado e é reclamação a caminho —
 * não é um número sagrado, é o ponto em que vale chamar atenção.
 */
export const DIAS_PARA_ALERTAR_OS = 3;

export interface JanelaDeDias {
  inicio: Date;
  fim: Date;
}

export interface MetricasDoPeriodo {
  vendas: number;
  custos: number;
  lucro: number;
  ticketMedio: number;
}

/** Do primeiro dia do mês até o fim do dia de referência. */
export function janelaDoMesAteODia(referencia: Date): JanelaDeDias {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  return {
    inicio: new Date(ano, mes, 1),
    fim: new Date(ano, mes, referencia.getDate(), 23, 59, 59, 999),
  };
}

/**
 * A mesma fatia de dias, um mês atrás — é contra ela que a variação dos
 * cartões é medida.
 *
 * Comparar o mês corrente pela metade com o mês anterior inteiro diria que a
 * loja está sempre caindo; o que responde a pergunta de verdade ("estou indo
 * melhor que mês passado?") é comparar do dia 1º até o mesmo dia do mês.
 *
 * O dia é segurado no último dia do mês de destino: 31 de março comparado
 * com fevereiro vira 28 (ou 29), e não "31 de fevereiro", que em JavaScript
 * silenciosamente vira 3 de março — a mesma armadilha que já fez conta
 * recorrente pular um mês inteiro (seção 6, item 43).
 */
export function mesmaJanelaNoMesAnterior(referencia: Date): JanelaDeDias {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const ultimoDiaDoMesAnterior = new Date(ano, mes, 0).getDate();
  const dia = Math.min(referencia.getDate(), ultimoDiaDoMesAnterior);
  return {
    inicio: new Date(ano, mes - 1, 1),
    fim: new Date(ano, mes - 1, dia, 23, 59, 59, 999),
  };
}

/** Os lançamentos de Caixa que caem dentro da janela. */
export function movimentosDaJanela(
  movimentos: MovimentoCaixa[],
  janela: JanelaDeDias,
): MovimentoCaixa[] {
  return movimentos.filter((movimento) => {
    const data = new Date(movimento.data);
    return data >= janela.inicio && data <= janela.fim;
  });
}

export function metricasDoPeriodo(
  movimentos: MovimentoCaixa[],
  janela: JanelaDeDias,
  custoDaOrdem: CustoDaOrdem,
): MetricasDoPeriodo {
  const resumo = resumirMovimentos(movimentosDaJanela(movimentos, janela), custoDaOrdem);
  return {
    vendas: resumo.entradas,
    // Custo aqui é o custo de verdade: o que a loja pagou pelas peças e pelo
    // serviço vendidos, MAIS as saídas lançadas à mão (aluguel, sucata).
    custos: resumo.saidas + resumo.custoDeAquisicao,
    lucro: resumo.lucro,
    ticketMedio: resumo.ticketMedio,
  };
}

/**
 * Quanto está pendente com vencimento até daqui a N dias.
 *
 * Conta vencida entra: é justamente a mais urgente, e esconder dela o
 * lojista seria o oposto do que o cartão serve.
 */
export function contasVencendoAte(
  contas: ContaPagar[],
  hoje: Date,
  dias = DIAS_DE_CONTAS_VENCENDO,
): number {
  const limite = diaLocal(
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias),
  );
  let total = 0;
  for (const conta of contas) {
    if (conta.status !== "pendente") continue;
    // Data no formato "YYYY-MM-DD" compara certo como texto, sem fuso no meio.
    if (conta.vencimento > limite) continue;
    total += conta.valor;
  }
  return total;
}

export function valoresPorCartao(
  metricas: MetricasDoPeriodo,
  contasVencendo: number,
): Record<CartaoMetrica, number> {
  return {
    vendas_mes: metricas.vendas,
    custos_mes: metricas.custos,
    lucro_mes: metricas.lucro,
    ticket_medio_mes: metricas.ticketMedio,
    contas_pagar_vencendo: contasVencendo,
  };
}

/**
 * De quanto por cento o valor mudou — ou `null` quando não dá pra dizer.
 *
 * Devolve `null` se não houve nada no período anterior: "subiu 100%" partindo
 * de zero não é informação, é enfeite. A tela mostra a variação só quando ela
 * existe, em vez de uma seta neutra que promete tendência e não entrega.
 */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function variacoesPorCartao(
  atual: MetricasDoPeriodo,
  anterior: MetricasDoPeriodo,
): Record<CartaoMetrica, number | null> {
  return {
    vendas_mes: variacaoPercentual(atual.vendas, anterior.vendas),
    custos_mes: variacaoPercentual(atual.custos, anterior.custos),
    lucro_mes: variacaoPercentual(atual.lucro, anterior.lucro),
    ticket_medio_mes: variacaoPercentual(atual.ticketMedio, anterior.ticketMedio),
    // "Contas a pagar vencendo" olha pra frente, não pra um período fechado —
    // comparar com o mês passado não quer dizer nada aqui.
    contas_pagar_vencendo: null,
  };
}

/**
 * Quem enxerga os lançamentos do Caixa INTEIROS (migration 0062): o próprio
 * Caixa e Relações. Outros módulos veem só um pedaço — quem tem OS vê só os
 * lançamentos de OS —, e um pedaço somado vira um número errado com cara de
 * certo. Por isso o Início só pede os lançamentos pra quem tem um destes.
 */
export const MODULOS_QUE_LEEM_O_CAIXA: readonly ModuloChave[] = ["caixa", "relatorios"];

/**
 * Os módulos que dão o número de cada cartão — basta ter UM deles
 * (TR-04.1, migrations 0061 e 0062).
 *
 * Sem eles, o banco devolve ZERO linha — sem erro nenhum — e zero linha
 * somada vira R$ 0,00: um número com cara de verdade pra quem simplesmente
 * não pode ver os dados. Pra esse operador o cartão mostra "—" e diz por quê.
 * Decisão dela, 26/09/2026, pros dois lotes.
 */
export const MODULOS_DO_CARTAO: Record<CartaoMetrica, readonly ModuloChave[]> = {
  vendas_mes: MODULOS_QUE_LEEM_O_CAIXA,
  custos_mes: MODULOS_QUE_LEEM_O_CAIXA,
  lucro_mes: MODULOS_QUE_LEEM_O_CAIXA,
  ticket_medio_mes: MODULOS_QUE_LEEM_O_CAIXA,
  contas_pagar_vencendo: ["contas_pagar"],
};

/**
 * O módulo que falta pra este cartão ter número (o primeiro da lista, que é
 * o que a tela cita), ou `null` se a pessoa tem algum deles.
 */
export function moduloQueFaltaAoCartao(
  cartao: CartaoMetrica,
  podeVer: (modulo: ModuloChave) => boolean,
): ModuloChave | null {
  const modulos = MODULOS_DO_CARTAO[cartao];
  return modulos.some(podeVer) ? null : modulos[0];
}

/**
 * Se subir é bom ou ruim depende do cartão: vender mais é ótimo, gastar mais
 * não. Sem isso, "custos +30%" sairia em verde.
 */
export const SUBIR_E_BOM: Record<CartaoMetrica, boolean> = {
  vendas_mes: true,
  custos_mes: false,
  lucro_mes: true,
  ticket_medio_mes: true,
  contas_pagar_vencendo: false,
};

function meiaNoiteLocal(chave: string): Date {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * Quantos dias inteiros se passaram — contando dia de calendário no fuso de
 * quem usa, não horas corridas.
 *
 * O `Math.round` não é preguiça: com horário de verão um "dia" tem 23 ou 25
 * horas, e dividir por 24 daria 0,96 de dia.
 */
export function diasDesde(dataIso: string, hoje: Date): number {
  const inicio = meiaNoiteLocal(diaLocal(dataIso));
  const fim = meiaNoiteLocal(diaLocal(hoje));
  return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000);
}

/** "hoje", "ontem", "há 3 dias" — o que a data crua obriga a contar nos dedos. */
export function rotuloDeIdade(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/**
 * Tributos aproximados na nota (Lei 12.741/2012, #1040).
 *
 * A loja do Simples Nacional não usa a tabela do IBPT: informa a alíquota
 * efetiva do Simples que a contabilidade passa (a do serviço, a das peças e,
 * nas peças com substituição tributária, uma estimativa do ICMS-ST a mais).
 * Aqui mora a conta; quem monta a nota (`lib/focusNfe.ts`) só chama.
 *
 * Sem alíquota (vazia ou zero) não há linha nenhuma: a nota sai igual a antes.
 */

import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import { arredondarCentavo, paraCentavos, deCentavos } from "./dinheiro";

export interface TributosAproximados {
  /** O valor de cada linha, arredondado no centavo. */
  linhas: number[];
  /** A soma dos valores das linhas (a base da porcentagem). */
  base: number;
  /** A soma das linhas JÁ arredondadas: é o número que bate com o DANFE. */
  total: number;
  /** total ÷ base × 100, com duas casas. */
  percentual: number;
  /** Alguma linha levou a estimativa do ICMS-ST. */
  incluiST: boolean;
}

/** Uma linha da nota: o que ela vale (já com desconto) e se a peça tem ST. */
export interface LinhaTributavel {
  valor: number;
  temST: boolean;
}

type LojaServico = Pick<ConfiguracaoFiscalLoja, "regime_tributario" | "percentual_tributos_simples">;
type LojaPecas = Pick<
  ConfiguracaoFiscalLoja,
  "regime_tributario" | "percentual_tributos_pecas" | "percentual_estimativa_icms_st"
>;

function positivo(valor: number | null | undefined): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? valor : 0;
}

function calcular(
  linhas: readonly LinhaTributavel[],
  percentualBase: number,
  percentualST: number,
): TributosAproximados | null {
  if (percentualBase <= 0 || linhas.length === 0) return null;
  const valores = linhas.map((linha) => {
    const percentual = percentualBase + (linha.temST ? percentualST : 0);
    return arredondarCentavo((linha.valor * percentual) / 100);
  });
  const baseCentavos = linhas.reduce((soma, linha) => soma + paraCentavos(linha.valor), 0);
  if (baseCentavos <= 0) return null;
  const totalCentavos = valores.reduce((soma, valor) => soma + paraCentavos(valor), 0);
  return {
    linhas: valores,
    base: deCentavos(baseCentavos),
    total: deCentavos(totalCentavos),
    percentual: arredondarCentavo((totalCentavos / baseCentavos) * 100),
    incluiST: percentualST > 0 && linhas.some((linha) => linha.temST),
  };
}

// O texto da nota fala em "alíquota efetiva do Simples Nacional": loja fora
// do Simples não sai com essa linha, mesmo que tenha um número salvo.

/** Os tributos aproximados da NFS-e: uma linha só, o valor dos serviços. */
export function tributosDoServico(valorServicos: number, loja: LojaServico): TributosAproximados | null {
  if (loja.regime_tributario !== "simples_nacional") return null;
  return calcular([{ valor: valorServicos, temST: false }], positivo(loja.percentual_tributos_simples), 0);
}

/** Os tributos aproximados da NFC-e: uma conta por peça (com ou sem ST). */
export function tributosDasPecas(
  linhas: readonly LinhaTributavel[],
  loja: LojaPecas,
): TributosAproximados | null {
  if (loja.regime_tributario !== "simples_nacional") return null;
  return calcular(
    linhas,
    positivo(loja.percentual_tributos_pecas),
    positivo(loja.percentual_estimativa_icms_st),
  );
}

// Número com duas casas do jeito brasileiro (1.234,50), sem depender do
// `toLocaleString`: o `formatarMoeda` de dinheiro.ts põe um espaço especial
// (não separável) depois do "R$", e na nota vai o espaço comum.
export function duasCasas(valor: number): string {
  const [inteiro, centavos] = Math.abs(valor).toFixed(2).split(".");
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}${comPontos},${centavos}`;
}

/**
 * A frase que vai na nota (NFC-e: informações adicionais; NFS-e: fim da
 * discriminação). "Inclui estimativa do ICMS-ST" só quando alguma peça levou.
 */
export function textoTributosAproximados(tributos: TributosAproximados): string {
  const st = tributos.incluiST ? ", inclui estimativa do ICMS-ST" : "";
  return (
    `Tributos aproximados: R$ ${duasCasas(tributos.total)} (${duasCasas(tributos.percentual)}%)${st}. ` +
    "Alíquota efetiva do Simples Nacional, Lei 12.741/2012."
  );
}

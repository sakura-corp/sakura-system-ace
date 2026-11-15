import { diaLocal } from "@/lib/datas";
import type { CustoDaOrdem } from "./metricasCaixa";
import { janelaDoMesAteODia, metricasDoPeriodo, valoresPorCartao } from "./painelInicio";
import type { CartaoMetrica } from "@/types/configuracao";
import type { MovimentoCaixa } from "@/types/caixa";

/**
 * O fio de gráfico dos cartões do Início: como o número do cartão foi
 * crescendo do dia 1º até hoje.
 *
 * Regra de ouro: cada ponto é EXATAMENTE o número que o cartão mostraria se
 * hoje fosse aquele dia. Por isso a conta não é reescrita aqui: cada dia
 * passa pela mesma `metricasDoPeriodo` do cartão (custo da OS uma vez só,
 * ticket médio por OS, venda de balcão fora do ticket). O último ponto sai
 * igual, centavo por centavo, ao número grande do cartão.
 */

/** Com menos dias que isso, o "fio" é um tracinho que não conta história nenhuma. */
export const DIAS_MINIMOS_PARA_O_FIO = 3;

/**
 * Valor ACUMULADO do mês do cartão, dia 1 até o dia de `referencia`: um
 * número por dia (índice 0 = dia 1). Devolve null quando não há como
 * desenhar um fio honesto: cartão sem série (contas_pagar_vencendo), menos
 * de 3 dias do mês decorridos, ou nenhum lançamento de entrada/saída no mês
 * até a referência.
 */
export function serieDoMesPorDia(
  movimentos: MovimentoCaixa[],
  referencia: Date,
  custoDaOrdem: CustoDaOrdem,
  cartao: CartaoMetrica,
): number[] | null {
  // "Contas a pagar vencendo" olha pra frente, não acumula no mês.
  if (cartao === "contas_pagar_vencendo") return null;

  const diaDeHoje = referencia.getDate();
  if (diaDeHoje < DIAS_MINIMOS_PARA_O_FIO) return null;

  // O mês da referência como "AAAA-MM", pelo mesmo relógio do `diaLocal`
  // (o fuso de quem usa), nunca pelo UTC.
  const mesDaReferencia = diaLocal(referencia).slice(0, 7);

  // Cada lançamento do mês, com o dia de calendário dele. A ordem original é
  // mantida: a soma sai na mesma ordem da conta do cartão, e o último ponto
  // dá igual mesmo nos centavos quebrados da conta com vírgula.
  const doMes: { movimento: MovimentoCaixa; dia: number }[] = [];
  for (const movimento of movimentos) {
    const chave = diaLocal(movimento.data);
    if (chave.slice(0, 7) !== mesDaReferencia) continue;
    const dia = Number(chave.slice(8, 10));
    if (dia > diaDeHoje) continue;
    doMes.push({ movimento, dia });
  }
  if (doMes.length === 0) return null;

  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const serie: number[] = [];
  for (let dia = 1; dia <= diaDeHoje; dia++) {
    const ateEsteDia = doMes.filter((item) => item.dia <= dia).map((item) => item.movimento);
    // A mesma conta do cartão, como se hoje fosse `dia`. A janela aqui só
    // confirma o filtro de cima; quem decide o dia é o `diaLocal`.
    const metricas = metricasDoPeriodo(
      ateEsteDia,
      janelaDoMesAteODia(new Date(ano, mes, dia)),
      custoDaOrdem,
    );
    serie.push(valoresPorCartao(metricas, 0)[cartao]);
  }
  return serie;
}

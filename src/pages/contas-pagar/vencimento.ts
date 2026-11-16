import { diaBrasileiro } from "@/lib/datas";

/**
 * Como uma conta ainda não paga (ou não recebida) está em relação a hoje.
 * Vale pras duas telas de contas (a Pagar e a Receber).
 *
 * Os dois dias são "AAAA-MM-DD" (o `vencimento` é uma coluna `date`, e o
 * `hoje` vem do `hojeLocal()`): comparar o texto basta, sem passar por
 * `Date` e sem fuso nenhum. É a mesma comparação que a tela já fazia antes
 * do visual novo (`vencimento < hoje` = vencida); o que é novo é separar o
 * "vence hoje" do "a vencer", só na palavra do selo.
 */
export type SituacaoDoVencimento = "atrasada" | "vence_hoje" | "a_vencer";

export function situacaoDoVencimento(vencimento: string, hoje: string): SituacaoDoVencimento {
  if (vencimento < hoje) return "atrasada";
  if (vencimento === hoje) return "vence_hoje";
  return "a_vencer";
}

/**
 * A frase da janela de pagar: "venceu em 12/11/2026", "vence hoje" ou "vence
 * em 20/11/2026". Antes era sempre "venceu em", até pra conta do mês que vem.
 */
export function fraseDoVencimento(vencimento: string, hoje: string): string {
  switch (situacaoDoVencimento(vencimento, hoje)) {
    case "atrasada":
      return `venceu em ${diaBrasileiro(vencimento)}`;
    case "vence_hoje":
      return "vence hoje";
    default:
      return `vence em ${diaBrasileiro(vencimento)}`;
  }
}

/**
 * A mesma ideia pra janela de receber: "previsto para 20/11/2026", "previsto
 * para hoje" ou "previsto para 12/11/2026 (atrasada)".
 */
export function fraseDaPrevisao(vencimento: string, hoje: string): string {
  switch (situacaoDoVencimento(vencimento, hoje)) {
    case "atrasada":
      return `previsto para ${diaBrasileiro(vencimento)} (atrasada)`;
    case "vence_hoje":
      return "previsto para hoje";
    default:
      return `previsto para ${diaBrasileiro(vencimento)}`;
  }
}

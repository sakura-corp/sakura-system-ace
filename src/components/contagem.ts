import { createContext } from "react";

/** Quanto dura a contagem do número grande do Início (regras, seção 8: 0,75 s). */
export const DURACAO_DA_CONTAGEM_MS = 750;

/**
 * Liga a contagem "de zero até o valor" nos `Valor` de dentro (tarefa 5, #990).
 * O `CartaoNumero` liga; o resto do programa (tabelas, listas) não conta.
 */
export const ContarAoAparecer = createContext(false);

/**
 * O que aparece na tela no instante `progresso` (0 a 1) da contagem, em
 * **valor absoluto** (o sinal fica fora, no `Valor`). **Só aparência**: nenhuma
 * conta de dinheiro nova — é o mesmo valor, escalado pela curva de freio, em
 * centavos inteiros. Em `progresso >= 1` devolve o próprio valor, sem passar
 * por nenhuma conta, então o número final é exatamente o de sempre.
 */
export function valorDaContagem(valorAbsoluto: number, progresso: number): number {
  if (progresso >= 1) return valorAbsoluto;
  if (progresso <= 0) return 0;
  const freio = 1 - Math.pow(1 - progresso, 3);
  return Math.round(valorAbsoluto * 100 * freio) / 100;
}

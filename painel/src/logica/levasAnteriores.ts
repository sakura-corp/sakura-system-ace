// Como a página "Levas anteriores" (#548) ordena e escreve cada leva. Só conta e texto, sem tela.
import type { ResumoDeLeva } from "../tipos";

/** O /api/levas/resumo traz no máximo estas levas (as mais novas); com tantas, a página avisa. */
export const MAXIMO_DE_LEVAS = 20;

/** Da mais nova pra mais velha (não mexe na lista de fora). */
export function levasDaMaisNovaPraMaisVelha(levas: ResumoDeLeva[]): ResumoDeLeva[] {
  return [...levas].sort((a, b) => b.numero - a.numero);
}

/** 12 → "12 h estimadas"; 2.5 → "2,5 h estimadas" (uma casa, vírgula; nunca ".0"). */
export function textoDasHoras(horas: number): string {
  const arredondado = Math.round(horas * 10) / 10;
  return `${String(arredondado).replace(".", ",")} h estimadas`;
}

/**
 * O dia de um instante ISO, em português: "17/10/2026". Sem `timeZone`, o fuso do computador de quem olha; os
 * testes passam o fuso (ex.: "America/Sao_Paulo") pra conferir a virada do dia. ISO inválido → null.
 */
export function textoDoDia(iso: string, timeZone?: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", timeZone ? { timeZone } : undefined);
}

/** "terminou em 17/10/2026"; sem data: "em andamento", ou "sem tarefas ainda" na leva vazia. */
export function textoDoFim(leva: Pick<ResumoDeLeva, "terminouEm" | "total">, timeZone?: string): string {
  if (leva.total === 0) return "sem tarefas ainda";
  const dia = leva.terminouEm === null ? null : textoDoDia(leva.terminouEm, timeZone);
  return dia === null ? "em andamento" : `terminou em ${dia}`;
}

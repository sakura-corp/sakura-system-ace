// Como a página "Levas anteriores" (#548) ordena e escreve cada leva. Só conta e texto, sem tela.
import type { Leva } from "../tipos";

/** Da mais nova pra mais velha (não mexe na lista de fora). */
export function levasDaMaisNovaPraMaisVelha(levas: Leva[]): Leva[] {
  return [...levas].sort((a, b) => b.numero - a.numero);
}

/** 12 → "12 h"; 2.5 → "2,5 h" (uma casa, vírgula; nunca ".0"). */
export function textoDasHoras(horas: number): string {
  const arredondado = Math.round(horas * 10) / 10;
  return `${String(arredondado).replace(".", ",")} h`;
}

/** O dia LOCAL de um instante ISO, em português: "17/10/2026". ISO inválido → null. */
export function textoDoDia(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

/** "terminou em 17/10/2026" ou "em andamento" (sem data, ou data que não dá pra ler). */
export function textoDoFim(terminouEm: string | null): string {
  const dia = terminouEm === null ? null : textoDoDia(terminouEm);
  return dia === null ? "em andamento" : `terminou em ${dia}`;
}

/**
 * Data como "YYYY-MM-DD" **no fuso de quem está usando o sistema**.
 *
 * Existe porque o jeito óbvio de fazer isso — `new Date().toISOString()` e
 * cortar os 10 primeiros caracteres — devolve o dia em **UTC**, não o dia
 * local. No Brasil (UTC-3), das 21h em diante o UTC já virou amanhã: uma
 * nota emitida às 22h do dia 31 era arquivada no mês seguinte, e uma OS
 * faturada nesse horário sumia da lista de Ordens de Serviço (esse último
 * já aconteceu de verdade — PROJETO_STATUS.md, seção 6, item 34).
 *
 * O "sv-SE" não tem nada a ver com a Suécia além de um detalhe útil: é o
 * formato de data desse idioma que sai exatamente como "YYYY-MM-DD".
 */
export function diaLocal(dataIso: string | Date): string {
  const data = typeof dataIso === "string" ? new Date(dataIso) : dataIso;
  return data.toLocaleDateString("sv-SE");
}

/** O dia de hoje, no fuso local, como "YYYY-MM-DD". */
export function hojeLocal(): string {
  return diaLocal(new Date());
}

/**
 * O primeiro dia do mês corrente, no fuso local, como "YYYY-MM-DD".
 *
 * É o formato que a coluna `notas_fiscais_arquivos.competencia` espera (mês
 * de competência, sempre no dia 1º) — o upload manual de XML já gravava
 * assim, mas a emissão automática gravava o dia da emissão, deixando os dois
 * caminhos com formatos diferentes na mesma coluna.
 */
export function primeiroDiaDoMesLocal(): string {
  const hoje = new Date();
  return diaLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
}

/**
 * "YYYY-MM-DD" de uma coluna `date` → "DD/MM/YYYY", sem passar por `Date`.
 *
 * Só pra dia de calendário (vencimento, período, data de pagamento). Passar
 * por `new Date("2026-09-01")` leria a string como meia-noite em UTC, e no
 * Brasil isso vira 31/08 — o mesmo erro de fuso dos itens 34 e 42 da seção 6.
 */
export function diaBrasileiro(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

/**
 * Quantos dias de calendário vão de `inicio` até `fim`, os dois como
 * "YYYY-MM-DD" (negativo se `fim` vier antes).
 *
 * Monta meia-noite LOCAL de cada dia, em vez de `new Date("2026-09-01")` —
 * que leria a string como UTC e, no Brasil, cairia no dia anterior. O
 * `Math.round` absorve o dia de 23 ou 25 horas do horário de verão.
 */
export function diasEntre(inicio: string, fim: string): number {
  const [a1, m1, d1] = inicio.split("-").map(Number);
  const [a2, m2, d2] = fim.split("-").map(Number);
  return Math.round(
    (new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86_400_000,
  );
}

/**
 * A data de um instante do banco, curta: "03/10" quando é do mesmo ano que
 * `hoje`, "15/12/2025" quando não é. Usada na coluna "Abertura" da lista de
 * OS, que precisava caber numa janela de 1366 (#425): o ano repetido em
 * toda linha ocupava espaço sem dizer nada.
 *
 * Passa pelo `diaLocal`, então o dia é o do fuso de quem usa (uma OS aberta
 * às 23h do dia 31/12 continua sendo de 31/12, não de 1º/1 em UTC).
 */
export function dataCurta(dataIso: string, hoje: string = hojeLocal()): string {
  const [ano, mes, dia] = diaLocal(dataIso).split("-");
  return ano === hoje.slice(0, 4) ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
}

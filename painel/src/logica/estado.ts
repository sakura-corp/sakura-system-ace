// As regras das tarefas de verdade (#354): o estado de uma issue, a estimativa escrita no texto
// e qual é a leva atual. Funções puras: o worker usa pra montar as tarefas, e os testes conferem.
import type { EstadoTarefa } from "../tipos";

/** O que importa de uma issue pra saber o estado dela. */
export type SinaisDaIssue = {
  fechada: boolean;
  temResponsavel: boolean;
  /** Tem um PR aberto que fecha a issue (`Closes #N`). */
  temPrAberto: boolean;
};

/** Fechada → feita; aberta com PR aberto → revisão; aberta com responsável → andamento; senão → livre. */
export function estadoDaTarefa({ fechada, temResponsavel, temPrAberto }: SinaisDaIssue): EstadoTarefa {
  if (fechada) return "feita";
  if (temPrAberto) return "revisao";
  if (temResponsavel) return "andamento";
  return "livre";
}

/**
 * A linha `Estimativa: N h` do texto da issue, em horas. Aceita `2h`, `2 h`, `1,5 h` e `1.5 h`,
 * com ou sem negrito (`**Estimativa**: 2 h`). Sem a linha, ou com um número estranho, não tem estimativa.
 */
export function lerEstimativa(texto: string | null | undefined): number | undefined {
  if (!texto) return undefined;
  const achou = /^[ \t>*_-]*estimativa[*_]*[ \t]*:[ \t]*[*_]*[ \t]*(\d{1,3}(?:[.,]\d{1,2})?)[ \t]*h(?![a-z])/im.exec(texto);
  if (!achou) return undefined;
  const horas = Number(achou[1].replace(",", "."));
  return Number.isFinite(horas) && horas > 0 ? horas : undefined;
}

/** `leva-3` → 3. Outro nome de etiqueta (ex.: `leva-x`, `leva-03a`) → null. */
export function numeroDaLeva(etiqueta: string): number | null {
  const achou = /^leva-(\d{1,4})$/.exec(etiqueta);
  return achou ? Number(achou[1]) : null;
}

export type ResumoDaLeva = { numero: number; abertas: number };

/** A leva atual: a de maior número com pelo menos uma tarefa aberta; se todas estão fechadas, a de maior número. */
export function levaAtual(levas: ResumoDaLeva[]): number | null {
  if (levas.length === 0) return null;
  const comAbertas = levas.filter((l) => l.abertas > 0);
  const candidatas = comAbertas.length > 0 ? comAbertas : levas;
  return Math.max(...candidatas.map((l) => l.numero));
}

/**
 * Dá pra pegar tarefa desta leva? A atual sempre; uma anterior, enquanto ainda tiver tarefa aberta (Sofia,
 * 19/10: quando a leva 2 entrou, as tarefas abertas da leva 1 ficaram sem ninguém poder pegar).
 */
export function levaAceitaPegar(numero: number, levas: ResumoDaLeva[], atual: number | null): boolean {
  if (numero === atual) return true;
  return levas.some((l) => l.numero === numero && l.abertas > 0);
}

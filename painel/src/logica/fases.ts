// A fase de cada leva (#644), lida do GitHub, sem botão. Função pura: o worker junta os sinais e os testes conferem.
// As cinco fases e a regra foram decididas pela Sofia na entrevista de 19/10/2026 (docs/painel.md).
import type { FaseDaLeva } from "../tipos";

/** O que se sabe de uma leva pra saber a fase dela. */
export type SinaisDaLeva = {
  numero: number;
  abertas: number;
  fechadas: number;
  /** Tem um PR aberto que muda `docs/relatorios/leva-N.md`. */
  relatorioEmPr: boolean;
  /** `docs/relatorios/leva-N.md` já está na `main` (a Sofia mesclou = aprovou). */
  relatorioNaMain: boolean;
  /** Alguma leva de número menor ainda não foi aprovada: esta espera, em Montando. */
  anteriorPendente: boolean;
};

/** A leva 0 é de antes das fases: aparece como Aprovada, sem relatório. */
export const antesDasFases = (numero: number): boolean => numero === 0;

/**
 * Aprovada (relatório na main, ou a leva 0) → Montando (uma anterior não foi aprovada, ou ainda sem tarefa) →
 * Trabalhando (tem tarefa aberta, mesmo com o relatório no PR: um defeito que entrou faz voltar) →
 * Relatório (PR aberto com o relatório) → Testando (todas fechadas).
 */
export function faseDaLeva(s: SinaisDaLeva): FaseDaLeva {
  if (antesDasFases(s.numero) || s.relatorioNaMain) return "aprovada";
  if (s.anteriorPendente || s.abertas + s.fechadas === 0) return "montando";
  if (s.abertas > 0) return "trabalhando";
  if (s.relatorioEmPr) return "relatorio";
  return "testando";
}

/** `docs/relatorios/leva-3.md` (um arquivo de PR) → 3. O `leva-3-testes.md` e outros caminhos → null. */
export function levaDoRelatorioNoPr(caminho: string): number | null {
  const achou = /^docs\/relatorios\/leva-(\d{1,4})\.md$/.exec(caminho);
  return achou ? Number(achou[1]) : null;
}

/** `leva-3.md` (um nome da pasta `docs/relatorios` na main) → 3. Outro nome → null. */
export function levaDoRelatorioNaMain(nome: string): number | null {
  const achou = /^leva-(\d{1,4})\.md$/.exec(nome);
  return achou ? Number(achou[1]) : null;
}

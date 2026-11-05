import type { PecaJanela } from "@/types/peca";

/**
 * As escolhas da janela da aprovação com peça sem cadastro (#655). Moram em
 * quem abre a janela (`OrdemServicoForm`), não nela, pra não se perder no
 * "Voltar" (#720).
 */
export type ModoAvulsa = "existente" | "cadastrar" | "sem_cadastro";

/** As escolhas da janela, por id do item avulso. */
export interface EscolhasDaJanela {
  modos: Record<string, ModoAvulsa>;
  /** "É uma peça que já tenho": a peça escolhida. */
  escolhidas: Record<string, string>;
  /** "Cadastrar agora": a peça criada. */
  cadastradas: Record<string, PecaJanela>;
}

export const ESCOLHAS_VAZIAS: EscolhasDaJanela = { modos: {}, escolhidas: {}, cadastradas: {} };

/**
 * Esquece o que foi escolhido pra um item: ele foi corrigido (nome, preço,
 * quantidade) e a peça escolhida antes pode não ser mais a dele (#720).
 */
export function esquecerEscolha(escolhas: EscolhasDaJanela, itemId: string): EscolhasDaJanela {
  const sem = <T>(mapa: Record<string, T>) =>
    Object.fromEntries(Object.entries(mapa).filter(([id]) => id !== itemId));
  return {
    modos: sem(escolhas.modos),
    escolhidas: sem(escolhas.escolhidas),
    cadastradas: sem(escolhas.cadastradas),
  };
}

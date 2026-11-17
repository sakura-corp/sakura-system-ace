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

/**
 * O item já não era avulso quando a peça cadastrada ia ser ligada a ele
 * (ligado ou apagado em outro computador): a peça nova ficou no cadastro sem
 * item nenhum. Quem decide se ela sobrou é a pessoa (#720), então a tela só
 * avisa, nunca apaga sozinha.
 */
export const AVISO_PECA_SOBROU =
  "Este item já tinha sido ligado a uma peça do cadastro, ou foi apagado (talvez em outro " +
  "computador). A peça que você cadastrou ficou no cadastro: se ela sobrou, inative em Estoque.";

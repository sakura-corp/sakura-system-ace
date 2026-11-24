import type { TipoCategoriaCaixa } from "@/types/categoriaCaixa";

/**
 * Os grupos do DRE (resumo do dinheiro do mês), #386. A lista é FIXA e igual
 * pra toda loja: o dono escolhe o grupo de cada categoria do Caixa, não cria
 * grupo. As chaves são exatamente as que o banco aceita
 * (`ck_categorias_caixa_grupo`); mexer aqui pede migration junto.
 */
export const GRUPOS_DRE = [
  { chave: "deducoes_venda", rotulo: "Deduções da venda", tipos: ["saida"] },
  { chave: "custos", rotulo: "Custos", tipos: ["saida"] },
  { chave: "despesas_pessoal", rotulo: "Despesas com pessoal", tipos: ["saida"] },
  { chave: "despesas_administrativas", rotulo: "Despesas administrativas", tipos: ["saida"] },
  { chave: "despesas_comerciais", rotulo: "Despesas comerciais", tipos: ["saida"] },
  { chave: "despesas_financeiras", rotulo: "Despesas financeiras", tipos: ["saida"] },
  { chave: "outras_despesas", rotulo: "Outras despesas", tipos: ["saida"] },
  { chave: "outras_receitas", rotulo: "Outras receitas", tipos: ["entrada"] },
  { chave: "receitas_financeiras", rotulo: "Receitas financeiras", tipos: ["entrada"] },
  { chave: "fora_do_resultado", rotulo: "Fora do resultado", tipos: ["entrada", "saida"] },
  { chave: "a_classificar", rotulo: "A classificar", tipos: ["entrada", "saida"] },
] as const satisfies readonly {
  chave: string;
  rotulo: string;
  tipos: readonly TipoCategoriaCaixa[];
}[];

export type GrupoDre = (typeof GRUPOS_DRE)[number]["chave"];

/** Categoria nova (ou sem escolha) começa aqui. É aviso, nunca tranca. */
export const GRUPO_PADRAO: GrupoDre = "a_classificar";

/** Frase pra tela: pra que serve o grupo. */
export const FRASE_DO_GRUPO =
  "O grupo diz onde a categoria entra no resumo do dinheiro do mês (o DRE). Enquanto estiver em “A classificar” ela continua valendo pra lançar no Caixa e nas Contas a pagar, só não entra no resumo direito.";

export function gruposParaTipo(tipo: TipoCategoriaCaixa) {
  return GRUPOS_DRE.filter((g) => (g.tipos as readonly string[]).includes(tipo));
}

export function grupoServePraTipo(grupo: string, tipo: TipoCategoriaCaixa): boolean {
  return gruposParaTipo(tipo).some((g) => g.chave === grupo);
}

export function rotuloDoGrupo(grupo: string): string {
  return GRUPOS_DRE.find((g) => g.chave === grupo)?.rotulo ?? grupo;
}

export function contarSemGrupo(categorias: readonly { grupo: string }[]): number {
  return categorias.filter((c) => c.grupo === GRUPO_PADRAO).length;
}

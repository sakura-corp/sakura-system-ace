import type { GrupoDre } from "@/schemas/gruposDre";

export type TipoCategoriaCaixa = "entrada" | "saida";

export interface CategoriaCaixa {
  id: string;
  nome: string;
  tipo: TipoCategoriaCaixa;
  /** Grupo do DRE (#386). "a_classificar" é o padrão. */
  grupo: GrupoDre;
  criado_em: string;
}

/** `grupo` é opcional na criação: sem ele o banco põe "a_classificar". */
export type NovaCategoriaCaixa = Omit<CategoriaCaixa, "id" | "criado_em" | "grupo"> & {
  grupo?: GrupoDre;
};

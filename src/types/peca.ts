export interface Peca {
  id: string;
  codigo_interno: string | null;
  codigo_barras: string | null;
  descricao: string;
  marca: string | null;
  modelo: string | null;
  aplicacao: string | null;
  unidade: string | null;
  preco_custo: number | null;
  preco_venda: number | null;
  ncm: string | null;
  cest: string | null;
  cfop_padrao: string | null;
  origem: string | null;
  cst_ou_csosn: string | null;
  aliquota_icms: number | null;
  categoria_id: string | null;
  prazo_garantia_dias: number | null;
  // Quantidade a partir da qual a peça precisa ser recomprada (migration
  // 0051). `null` quer dizer "sem mínimo definido" e nunca vira aviso —
  // diferente de zero, que é um mínimo de verdade. A regra de leitura fica
  // em `schemas/estoque.ts`, não espalhada pelas telas.
  estoque_minimo: number | null;
  // Bloco de pneu (migration 0051): só aparece no formulário quando a
  // categoria da peça é a de Pneus. Ex: "175/70 R14", "84T", "3823".
  medida: string | null;
  indice_carga_velocidade: string | null;
  dot: string | null;
  ativo: boolean;
  criado_em: string;
}

export type NovaPeca = Omit<Peca, "id" | "criado_em">;

// O que a "janela" de peças (view `pecas_janela`, migration 0073) devolve a
// quem não tem o módulo Estoque: nunca o custo nem os dados de cadastro de
// estoque. Telas que só vendem/orçam trabalham com este tipo.
export type PecaJanela = Pick<
  Peca,
  | "id"
  | "codigo_interno"
  | "codigo_barras"
  | "descricao"
  | "unidade"
  | "preco_venda"
  | "prazo_garantia_dias"
  | "ativo"
  | "marca"
  | "modelo"
  | "medida"
> & {
  /** Falta o custo (em branco ou zero)? Só sim/não: o valor nunca sai da janela. */
  sem_custo: boolean;
};

// O que a função `dados_fiscais_das_pecas` devolve (nunca o custo).
export type PecaDadosFiscais = Pick<
  Peca,
  | "id"
  | "codigo_interno"
  | "codigo_barras"
  | "descricao"
  | "unidade"
  | "ncm"
  | "cest"
  | "cfop_padrao"
  | "origem"
  | "cst_ou_csosn"
  | "aliquota_icms"
>;

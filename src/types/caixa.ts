import type { ItemParaVenda, StatusOS, TipoOrdem } from "@/types/os";

export type TipoCaixa = "entrada" | "saida";

export interface MovimentoCaixa {
  id: string;
  loja_id: string;
  data: string;
  ordem_servico_id: string | null;
  tipo: TipoCaixa;
  forma_pagamento: string | null;
  valor: number;
  descricao: string | null;
  categoria_id: string | null;
  ordem_servico?: {
    id: string;
    numero: number;
    /** Ausente em banco anterior à migration 0064 (aí é sempre OS). */
    tipo?: TipoOrdem;
    status?: StatusOS;
    cliente: { nome: string } | null;
    /** Só quantidade, preço e desconto: é o que a janela do Caixa entrega (#367). */
    itens: ItemParaVenda[];
  } | null;
  categoria?: { nome: string } | null;
}

export type NovoMovimentoCaixa = Omit<
  MovimentoCaixa,
  "id" | "loja_id" | "data" | "categoria"
>;

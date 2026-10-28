import type { ItemParaVenda, StatusOS, TipoOrdem } from "@/types/os";

export type TipoCaixa = "entrada" | "saida";

/**
 * Lançamento de Caixa. `I` é o formato dos itens da OS ligada: no programa é
 * sempre `ItemParaVenda` (o que a janela do Caixa entrega, #367); os testes
 * que calculam custo pelos mapas usam o item inteiro.
 */
export interface MovimentoCaixa<I extends ItemParaVenda = ItemParaVenda> {
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
    itens: I[];
  } | null;
  categoria?: { nome: string } | null;
}

export type NovoMovimentoCaixa = Omit<
  MovimentoCaixa,
  "id" | "loja_id" | "data" | "categoria"
>;

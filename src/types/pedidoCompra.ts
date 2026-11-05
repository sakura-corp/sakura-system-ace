import { totalDoPedidoCompra } from "@/schemas/valorItem";

export type StatusPedidoCompra = "pendente" | "parcial" | "recebido" | "cancelado";

export interface ItemPedidoCompra {
  id: string;
  pedido_compra_id: string;
  peca_id: string;
  quantidade_pedida: number;
  preco_unitario: number | null;
  quantidade_recebida: number;
  peca?: { descricao: string; unidade: string | null } | null;
}

export type NovoItemPedidoCompra = Omit<
  ItemPedidoCompra,
  "id" | "pedido_compra_id" | "quantidade_recebida" | "peca"
>;

export interface PedidoCompra {
  id: string;
  numero: number;
  loja_id: string;
  fornecedor_id: string;
  status: StatusPedidoCompra;
  data_pedido: string;
  observacao: string | null;
  operador_id: string | null;
  criado_em: string;
  fornecedor?: { nome: string } | null;
  itens?: ItemPedidoCompra[];
}

export type NovoPedidoCompra = Pick<
  PedidoCompra,
  "fornecedor_id" | "data_pedido" | "observacao"
>;

export const STATUS_PEDIDO_LABEL: Record<StatusPedidoCompra, string> = {
  pendente: "Pendente",
  parcial: "Recebido parcialmente",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

// Mesmo espírito das cores de status de OS: "parcial" chama atenção porque
// ainda exige uma ação (conferir o resto), "pendente" também.
export const STATUS_PEDIDO_COR: Record<StatusPedidoCompra, string> = {
  pendente: "bg-amber-50 text-amber-800",
  parcial: "bg-orange-100 text-orange-800",
  recebido: "bg-emerald-50 text-emerald-700",
  cancelado: "bg-sakura-gray/20 text-sakura-muted",
};

export function nomePedido(numero: number): string {
  return `Pedido ${numero}`;
}

export function totalPedido(itens: ItemPedidoCompra[]): number {
  return totalDoPedidoCompra(itens);
}

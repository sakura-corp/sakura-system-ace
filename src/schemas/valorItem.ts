/**
 * O valor de um item (quantidade × preço − desconto), num lugar só (#875).
 *
 * Essa linha estava escrita em oito lugares: o total da OS e o total por tipo
 * (`types/os.ts`), o formulário da OS e da venda de balcão, as comissões, a
 * lucratividade, a nota fiscal e duas telas da OS. É o padrão que já custou o
 * desconto sumindo da nota em três contas separadas (`arquitetura.test.ts`
 * conta a história): cada cópia é um lugar a mais pra divergir.
 *
 * **Não arredonda**, de propósito: é a mesma aritmética que estava espalhada,
 * e mudar isso mudaria número na tela. Quem grava ou manda pra fora arredonda
 * por cima (a nota fiscal faz `arredondarCentavo(valorLiquidoDoItem(...))`).
 */

export interface ItemComValor {
  quantidade: number;
  preco_unitario: number;
  desconto: number;
}

/** Quanto a linha vale: quantidade × preço, menos o desconto da linha. */
export function valorLiquidoDoItem(item: ItemComValor): number {
  return item.quantidade * item.preco_unitario - item.desconto;
}

/**
 * A soma das linhas, sem arredondar.
 *
 * Mantém a ordem das operações da conta antiga, `(total + q×p) − d`, e não
 * `total + (q×p − d)`: no ponto flutuante as duas podem diferir na última casa,
 * e esta tarefa é só mudança de lugar. O teste confere bit a bit.
 */
export function somarValoresLiquidos(itens: readonly ItemComValor[]): number {
  return itens.reduce(
    (total, item) => total + item.quantidade * item.preco_unitario - item.desconto,
    0,
  );
}

/** Total de um pedido de compra: quantidade pedida × preço (sem preço conta zero). */
export function totalDoPedidoCompra(
  itens: readonly { quantidade_pedida: number; preco_unitario: number | null }[],
): number {
  return itens.reduce(
    (total, item) => total + item.quantidade_pedida * (item.preco_unitario ?? 0),
    0,
  );
}

/** Quanto vale o saldo de uma peça a preço de custo (sem custo conta zero). */
export function valorDaPecaEmEstoque(saldo: number, precoCusto: number | null): number {
  return saldo * (precoCusto ?? 0);
}

/**
 * O valor do estoque a preço de custo (Estoque → Relatórios): saldo × custo de
 * cada peça. Sem custo cadastrado ou sem saldo conta zero; saldo negativo
 * entra negativo, como a tela sempre mostrou.
 */
export function valorDoEstoque(
  pecas: readonly { id: string; preco_custo: number | null }[],
  saldos: ReadonlyMap<string, number>,
): number {
  return pecas.reduce((total, peca) => {
    const saldo = saldos.get(peca.id) ?? 0;
    return total + valorDaPecaEmEstoque(saldo, peca.preco_custo);
  }, 0);
}

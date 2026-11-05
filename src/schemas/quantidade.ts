/**
 * Quantidade de estoque como a pessoa lê: "4", "4,5", "1.234,25" (no máximo
 * 2 casas, como a coluna `numeric(12,2)`). Um lugar só pra lista de Produtos
 * e o "Juntar peças repetidas" escreverem o mesmo número do mesmo jeito (#721).
 */
export function formatarQuantidade(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

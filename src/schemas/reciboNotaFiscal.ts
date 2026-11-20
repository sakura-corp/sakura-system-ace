/**
 * As contas do recibo da nota fiscal (#1031). O recibo só MOSTRA o que o XML
 * traz; a única conta é a da NFS-e da Giap (Araraquara), cujo XML não tem os
 * itens: o recibo lista os itens da OS só quando o total dos serviços da OS é
 * o mesmo valor da nota (decidido em 14/11: nunca mostrar ao cliente números
 * que não batem com a nota).
 */
import { arredondarCentavo, paraCentavos } from "./dinheiro";
import { somarValoresLiquidos, valorLiquidoDoItem } from "./valorItem";

export interface ItemDaOsComValor {
  tipo: "peca" | "servico";
  quantidade: number;
  precoUnitario: number;
  desconto: number;
}

function comoItem(item: ItemDaOsComValor) {
  return { quantidade: item.quantidade, preco_unitario: item.precoUnitario, desconto: item.desconto };
}

/** Quanto vale uma linha da OS (quantidade × preço − desconto), no centavo. */
export function valorDoItemDaOs(item: ItemDaOsComValor): number {
  return arredondarCentavo(valorLiquidoDoItem(comoItem(item)));
}

/** O total dos serviços da OS: é o valor que vai na NFS-e. */
export function totalDosServicosDaOs(itens: readonly ItemDaOsComValor[]): number {
  return arredondarCentavo(
    somarValoresLiquidos(itens.filter((i) => i.tipo === "servico").map(comoItem)),
  );
}

/** Dois valores em reais são o mesmo, comparados em centavos. */
export function mesmoValor(a: number, b: number): boolean {
  return paraCentavos(a) === paraCentavos(b);
}

/** O valor de uma linha da nota já com o desconto da linha (`vProd − vDesc`), no centavo. */
export function valorDaLinhaComDesconto(valorBruto: number, desconto: number | null): number {
  return arredondarCentavo(valorBruto - (desconto ?? 0));
}

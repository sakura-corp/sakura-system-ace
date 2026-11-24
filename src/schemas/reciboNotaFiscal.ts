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

/**
 * O valor e os serviços de uma NFS-e, guardados NA HORA DA EMISSÃO (#1142,
 * sem migration): a Giap (Araraquara) não devolve nem o valor nem os itens,
 * e a OS ainda pode ganhar serviço depois da nota. Este retrato é o que foi
 * mandado pra prefeitura, então o recibo pode mostrá-lo sem medo de divergir.
 */
export interface ValoresGuardadosDaNota {
  versao: 1;
  /** O `valor_servicos` que foi na nota, no centavo. */
  valorServicos: number;
  itens: { descricao: string; quantidade: number; precoUnitario: number; desconto: number }[];
}

interface ServicoDaOs {
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
}

/** O retrato dos serviços que vão na NFS-e; o valor é a mesma conta do envio. */
export function valoresParaGuardar(servicos: readonly ServicoDaOs[]): ValoresGuardadosDaNota {
  const itens = servicos.map((s) => ({
    descricao: s.descricao,
    quantidade: s.quantidade,
    precoUnitario: s.preco_unitario,
    desconto: s.desconto ?? 0,
  }));
  return {
    versao: 1,
    valorServicos: totalDosServicosDaOs(itens.map((i) => ({ ...i, tipo: "servico" as const }))),
    itens,
  };
}

function ehNumero(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Lê o retrato guardado. Qualquer coisa estranha (arquivo mexido, formato
 * novo, itens que não somam o valor) vira `null`: o recibo volta a mostrar só
 * "Itens na OS nº X", nunca um número que não bate com a nota.
 */
export function lerValoresGuardados(json: unknown): ValoresGuardadosDaNota | null {
  if (!json || typeof json !== "object") return null;
  const v = json as Record<string, unknown>;
  if (v.versao !== 1 || !ehNumero(v.valorServicos) || !Array.isArray(v.itens) || v.itens.length === 0) {
    return null;
  }
  const itens: ValoresGuardadosDaNota["itens"] = [];
  for (const bruto of v.itens as unknown[]) {
    if (!bruto || typeof bruto !== "object") return null;
    const i = bruto as Record<string, unknown>;
    if (typeof i.descricao !== "string" || !ehNumero(i.quantidade) || !ehNumero(i.precoUnitario) || !ehNumero(i.desconto)) {
      return null;
    }
    itens.push({ descricao: i.descricao, quantidade: i.quantidade, precoUnitario: i.precoUnitario, desconto: i.desconto });
  }
  const soma = totalDosServicosDaOs(itens.map((i) => ({ ...i, tipo: "servico" as const })));
  if (!mesmoValor(soma, v.valorServicos)) return null;
  return { versao: 1, valorServicos: arredondarCentavo(v.valorServicos), itens };
}

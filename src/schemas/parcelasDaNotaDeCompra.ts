import { arredondarCentavo, somar } from "./dinheiro";
import type { NovaContaPagar } from "@/types/contaPagar";
import type { NotaFiscalXmlExtraida } from "@/types/notaFiscalXmlFornecedor";

/**
 * As parcelas da nota de compra importada pelo XML, que viram contas a pagar
 * (#1020). O sistema sugere (das duplicatas da nota), a pessoa confere e edita
 * na janela, e só então grava.
 */
export interface ParcelaDaNota {
  numero: string | null;
  /** Dia de calendário "AAAA-MM-DD"; "" enquanto a pessoa não preencher. */
  vencimento: string;
  valor: number;
}

type NotaParaParcelas = Pick<NotaFiscalXmlExtraida, "valor_total" | "duplicatas"> & {
  itens: readonly { quantidade: number; preco_unitario: number }[];
};

/** O total da nota: o vNF do XML; sem ele, quantidade × preço dos itens. */
export function totalDaNota(nota: Pick<NotaParaParcelas, "valor_total" | "itens">): number {
  if (nota.valor_total !== null) return arredondarCentavo(nota.valor_total);
  return somar(nota.itens.map((item) => arredondarCentavo(item.quantidade * item.preco_unitario)));
}

/**
 * Uma parcela por duplicata da nota. Nota sem duplicata: uma parcela só, com
 * o total e o vencimento em branco pra pessoa preencher.
 */
export function sugerirParcelas(nota: NotaParaParcelas): ParcelaDaNota[] {
  if (nota.duplicatas.length === 0) {
    return [{ numero: null, vencimento: "", valor: totalDaNota(nota) }];
  }
  return nota.duplicatas.map((dup) => ({
    numero: dup.numero,
    vencimento: dup.vencimento ?? "",
    valor: arredondarCentavo(dup.valor),
  }));
}

export interface ConferenciaParcelas {
  soma: number;
  total: number;
  /** soma − total: negativo quando as parcelas somam menos que a nota. */
  diferenca: number;
  bate: boolean;
}

/** A soma das parcelas contra o total da nota. Diferença é aviso, não tranca. */
export function conferirParcelas(
  parcelas: readonly ParcelaDaNota[],
  total: number,
): ConferenciaParcelas {
  const soma = somar(parcelas.map((p) => p.valor));
  const totalArredondado = arredondarCentavo(total);
  const diferenca = arredondarCentavo(soma - totalArredondado);
  return { soma, total: totalArredondado, diferenca, bate: diferenca === 0 };
}

function ehDiaDeVerdade(dia: string): boolean {
  const casou = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!casou) return false;
  const [ano, mes, d] = [Number(casou[1]), Number(casou[2]), Number(casou[3])];
  // Conta feita só com números (sem fuso): o dia existe naquele mês?
  const diasNoMes = new Date(ano, mes, 0).getDate();
  return mes >= 1 && mes <= 12 && d >= 1 && d <= diasNoMes;
}

/**
 * Por que as parcelas não podem ser lançadas ainda (null = podem). Sem
 * vencimento a conta a pagar não existe (a coluna é obrigatória): não lança
 * e diz por quê, sem travar o resto da importação.
 */
export function motivoParaNaoLancarParcelas(parcelas: readonly ParcelaDaNota[]): string | null {
  if (parcelas.length === 0) return "Não há nenhuma parcela pra lançar.";
  for (const [indice, parcela] of parcelas.entries()) {
    if (!ehDiaDeVerdade(parcela.vencimento)) return `Falta o vencimento da parcela ${indice + 1}.`;
    if (!(arredondarCentavo(parcela.valor) > 0)) {
      return `A parcela ${indice + 1} precisa de um valor maior que zero.`;
    }
  }
  return null;
}

/** "NF 1234 — Fornecedor (1/3)": o fornecedor fica na descrição da conta. */
export function descricaoDaParcela(
  numeroNota: string | null,
  fornecedorNome: string,
  indice: number,
  quantidade: number,
): string {
  return `NF ${numeroNota ?? "sem número"} — ${fornecedorNome} (${indice + 1}/${quantidade})`;
}

/** As contas a pagar que a importação grava, uma por parcela. */
export function contasPagarDaNota(
  parcelas: readonly ParcelaDaNota[],
  dados: { numeroNota: string | null; fornecedorNome: string; categoriaId: string },
): NovaContaPagar[] {
  return parcelas.map((parcela, indice) => ({
    descricao: descricaoDaParcela(dados.numeroNota, dados.fornecedorNome, indice, parcelas.length),
    valor: arredondarCentavo(parcela.valor),
    vencimento: parcela.vencimento,
    categoria_id: dados.categoriaId || null,
    recorrente: false,
    recorrente_ate: null,
  }));
}

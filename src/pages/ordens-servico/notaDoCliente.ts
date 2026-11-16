import type { NotaFiscalArquivo } from "@/types/notaFiscal";

/**
 * As notas que dá pra abrir pelo programa: as que ele mesmo emitiu e não
 * foram canceladas (a mesma regra do Fechamento, que mostra o "Ver PDF").
 */
export function notasDoCliente(notas: NotaFiscalArquivo[]): NotaFiscalArquivo[] {
  return notas.filter((nota) => nota.origem === "automatica" && nota.status !== "cancelado");
}

/** O nome de cada nota pra quem está no balcão, sem sigla sozinha. */
export function nomeDaNota(nota: NotaFiscalArquivo): string {
  return nota.tipo === "nfe" ? "Nota das peças (NFC-e)" : "Nota do serviço (NFS-e)";
}

const POR_EXTENSO = ["", "uma", "duas", "três", "quatro", "cinco"];

/**
 * A frase da janelinha de escolha, certa pra cada caso (achado da revisão,
 * 16/11): OS ou venda, e quantas notas de cada tipo.
 * "Esta OS tem duas notas: a das peças (NFC-e) e a do serviço (NFS-e)."
 * "Esta venda tem duas notas das peças (NFC-e)."
 */
export function fraseDaEscolha(venda: boolean, notas: NotaFiscalArquivo[]): string {
  const quem = venda ? "Esta venda" : "Esta OS";
  const quantas = (n: number) => POR_EXTENSO[n] ?? String(n);
  const pecas = notas.filter((nota) => nota.tipo === "nfe").length;
  const servico = notas.length - pecas;
  let tem: string;
  if (pecas > 0 && servico > 0) {
    const parte = (n: number, um: string, varias: string) => (n === 1 ? um : `${quantas(n)} ${varias}`);
    tem = `${quantas(notas.length)} notas: ${parte(pecas, "a das peças (NFC-e)", "das peças (NFC-e)")} e ${parte(servico, "a do serviço (NFS-e)", "do serviço (NFS-e)")}`;
  } else if (pecas > 0) {
    tem = `${quantas(pecas)} notas das peças (NFC-e)`;
  } else {
    tem = `${quantas(servico)} notas do serviço (NFS-e)`;
  }
  return `${quem} tem ${tem}. Qual você quer ver, imprimir ou mandar?`;
}

/**
 * O nome do botão de cada nota. Com mais de uma do mesmo tipo, leva o número,
 * senão sairiam dois botões iguais.
 */
export function rotuloDaNota(nota: NotaFiscalArquivo, notas: NotaFiscalArquivo[]): string {
  const repetida = notas.filter((outra) => outra.tipo === nota.tipo).length > 1;
  return repetida && nota.numero ? `${nomeDaNota(nota)} nº ${nota.numero}` : nomeDaNota(nota);
}

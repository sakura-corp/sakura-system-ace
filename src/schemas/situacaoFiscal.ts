import type { NotaFiscalArquivo, TipoNotaFiscal } from "@/types/notaFiscal";
import type { ItemOS, OrdemServico } from "@/types/os";

// Qual nota cada OS precisa é decidido pelo que ela tem dentro: peça vende
// mercadoria (NFC-e), serviço vende mão de obra (NFS-e), e uma OS com os
// dois precisa das duas. Nada disso fica gravado no banco — é derivado dos
// itens na hora, mesma ideia do módulo de Garantias (que também não tem
// tabela própria, deriva dos itens da OS).
export interface NotasNecessarias {
  nfce: boolean;
  nfse: boolean;
}

export function notasNecessarias(itens: ItemOS[]): NotasNecessarias {
  return {
    nfce: itens.some((item) => item.tipo === "peca"),
    nfse: itens.some((item) => item.tipo === "servico"),
  };
}

// Uma nota cancelada volta a contar como pendente — foi emitida, mas não
// vale mais. Nota enviada à mão (upload de XML vinculado à OS) conta igual
// a uma emitida pelo sistema: o que importa é a OS ter a nota dela.
function notaValida(nota: NotaFiscalArquivo, tipo: TipoNotaFiscal): boolean {
  return nota.tipo === tipo && nota.status !== "cancelado";
}

// Se a OS tem alguma nota que ainda vale (cancelada não conta). Usado pra
// travar a correção de item já lançado: mexer no valor depois da nota
// emitida deixaria a nota discordando da OS, e isso não se conserta sozinho
// — precisa cancelar a nota antes.
export function temAlgumaNotaValida(notasDaOrdem: NotaFiscalArquivo[]): boolean {
  return notasDaOrdem.some((nota) => nota.status !== "cancelado");
}

export const NOTA_LABEL: Record<TipoNotaFiscal, string> = {
  nfe: "NFC-e",
  nfse: "NFS-e",
};

export interface SituacaoFiscalOrdem {
  precisaNfce: boolean;
  precisaNfse: boolean;
  temNfce: boolean;
  temNfse: boolean;
  /** Notas que essa OS ainda deve, já com o nome que aparece na tela. */
  pendentes: string[];
  /** Toda nota que essa OS precisava já saiu (e nenhuma foi cancelada). */
  completa: boolean;
}

export function situacaoFiscalOrdem(
  itens: ItemOS[],
  notasDaOrdem: NotaFiscalArquivo[],
): SituacaoFiscalOrdem {
  const precisa = notasNecessarias(itens);
  const temNfce = notasDaOrdem.some((nota) => notaValida(nota, "nfe"));
  const temNfse = notasDaOrdem.some((nota) => notaValida(nota, "nfse"));

  const pendentes: string[] = [];
  if (precisa.nfce && !temNfce) pendentes.push(NOTA_LABEL.nfe);
  if (precisa.nfse && !temNfse) pendentes.push(NOTA_LABEL.nfse);

  return {
    precisaNfce: precisa.nfce,
    precisaNfse: precisa.nfse,
    temNfce,
    temNfse,
    pendentes,
    // Uma OS sem item nenhum não "precisa" de nota, mas também não é um caso
    // real de venda fechada — tratada como incompleta pra não aparecer
    // finalizada por engano.
    completa: itens.length > 0 && pendentes.length === 0,
  };
}

// "Finalizada" não é um status gravado no banco (`ordens_servico.status`
// continua em_andamento/concluida/faturada) — é o retrato de uma OS que já
// foi faturada E já teve todas as notas dela emitidas, ou seja, não sobrou
// nada pra fazer. Derivar em vez de gravar evita uma migration e evita o
// status no banco ficar mentindo se uma nota for cancelada depois.
export function ordemEstaFinalizada(
  ordem: Pick<OrdemServico, "status">,
  situacao: SituacaoFiscalOrdem,
): boolean {
  return ordem.status === "faturada" && situacao.completa;
}

// Agrupa as notas por OS de uma vez só, pra lista de OS não precisar de uma
// consulta por linha.
export function agruparNotasPorOrdem(
  notas: NotaFiscalArquivo[],
): Map<string, NotaFiscalArquivo[]> {
  const porOrdem = new Map<string, NotaFiscalArquivo[]>();
  for (const nota of notas) {
    if (!nota.ordem_servico_id) continue;
    const atuais = porOrdem.get(nota.ordem_servico_id) ?? [];
    atuais.push(nota);
    porOrdem.set(nota.ordem_servico_id, atuais);
  }
  return porOrdem;
}

// A etiqueta que cada nota ganha na lista de Notas Fiscais. O tom diz a cor
// (quem escolhe a classe é a tela); o rótulo é o texto que aparece.
export type TomSituacaoNota = "autorizada" | "cancelada" | "manual" | "outra";

export interface SituacaoNota {
  tom: TomSituacaoNota;
  rotulo: string;
}

// A ordem das perguntas importa. "Cancelada" vem antes de tudo porque é o
// que mais precisa aparecer: uma nota cancelada não vale mais, venha de onde
// vier. Depois, o XML que alguém subiu à mão não tem status nenhum da
// SEFAZ/prefeitura guardado (o sistema só recebeu o arquivo), então não dá
// pra chamar de "Autorizada" — é só "Enviada à mão". Qualquer outro status
// que a Focus NFe devolver (ex.: "processando_autorizacao") aparece como
// veio, só sem o sublinhado, em vez de sumir.
export function situacaoDaNota(
  nota: Pick<NotaFiscalArquivo, "origem" | "status">,
): SituacaoNota {
  if (nota.status === "cancelado") return { tom: "cancelada", rotulo: "Cancelada" };
  if (nota.origem === "manual") return { tom: "manual", rotulo: "Enviada à mão" };
  if (nota.status === "autorizado") return { tom: "autorizada", rotulo: "Autorizada" };
  const texto = nota.status?.trim().replace(/_/g, " ");
  if (!texto) return { tom: "outra", rotulo: "Sem situação" };
  return { tom: "outra", rotulo: texto.charAt(0).toUpperCase() + texto.slice(1) };
}

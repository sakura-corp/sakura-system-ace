import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import { situacaoFiscalOrdem } from "./situacaoFiscal";

/**
 * Em que passo do fechamento a OS está (#1088): conferir peças e serviços →
 * receber → nota fiscal → garantia e avisar → pronto.
 *
 * Sai SÓ do que já está gravado, sem coluna nova no banco (decisão da tarefa):
 * - o status da OS (`em_andamento` → conferir; `concluida` → receber);
 * - as notas ligadas a ela (faturada que ainda deve nota → nota fiscal; a
 *   conta de qual nota falta é a mesma do selo da lista, `situacaoFiscalOrdem`,
 *   e nota cancelada volta a faltar);
 * - se o "carro pronto" já foi aberto no WhatsApp pra esta OS
 *   (`whatsapp_mensagens`, a mesma tabela que o programa já grava): sem isso a
 *   OS fica em "garantia e avisar"; com isso, pronto.
 *
 * Os passos andam só pra frente na ordem do balcão: um aviso aberto antes da
 * nota não pula a nota, e nota emitida não pula o receber.
 *
 * Orçamento e recusado não têm trilha (ainda não são OS): `null`.
 */
export type PassoDaOs = "conferir" | "receber" | "nota" | "garantia" | "pronto";

/** Os 4 passos da trilha, na ordem da conversa do balcão. "Pronto" é o fim, depois do último. */
export const PASSOS_DA_OS: ReadonlyArray<{ passo: Exclude<PassoDaOs, "pronto">; nome: string }> = [
  { passo: "conferir", nome: "Conferir peças e serviços" },
  { passo: "receber", nome: "Receber" },
  { passo: "nota", nome: "Nota fiscal" },
  { passo: "garantia", nome: "Garantia e avisar" },
];

export function passoDaOrdem(
  ordem: Pick<OrdemServico, "status" | "itens">,
  notas: NotaFiscalArquivo[],
  /** Quando o "carro pronto" desta OS foi aberto no WhatsApp (ou `null`). */
  avisadoEm: string | null,
): PassoDaOs | null {
  switch (ordem.status) {
    case "orcamento":
    case "recusado":
      return null;
    case "em_andamento":
      return "conferir";
    case "concluida":
      return "receber";
    case "faturada": {
      const situacao = situacaoFiscalOrdem(ordem.itens ?? [], notas);
      if (situacao.pendentes.length > 0) return "nota";
      return avisadoEm ? "pronto" : "garantia";
    }
    default:
      // Status que este programa não conhece (banco mais novo): sem trilha,
      // em vez de inventar um passo.
      return null;
  }
}

/** A posição do passo na trilha (do 0); "pronto" é 4, depois do último (todos feitos). */
export function indiceDoPasso(passo: PassoDaOs): number {
  if (passo === "pronto") return PASSOS_DA_OS.length;
  return PASSOS_DA_OS.findIndex((p) => p.passo === passo);
}

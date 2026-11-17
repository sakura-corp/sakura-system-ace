import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { NOTA_LABEL } from "./situacaoFiscal";

// O PDF da nota (DANFE, no caso da NFC-e) NÃO fica guardado no Sakura
// System: o que é salvo aqui é o XML, que é o documento que a lei manda
// guardar. O PDF é gerado e hospedado pela Focus NFe, e a `focus_nfe_ref`
// gravada na emissão (migration 0046) é o que permite pedir ele de novo
// depois — sem essa referência, não há como achar a nota lá.
//
// Daí as duas situações em que "Ver DANFE" não tem o que mostrar. As duas
// são normais, nenhuma é defeito, e por isso viram texto explicando o que
// fazer em vez de erro cru na tela.
export function motivoDanfeIndisponivel(arquivo: NotaFiscalArquivo): string | null {
  if (arquivo.origem !== "automatica") {
    return (
      "Essa nota foi enviada à mão (upload do XML), então o PDF dela nunca passou pelo " +
      'sistema. Dá pra ver os dados dela em "Versão para o cliente", ou baixar o XML original.'
    );
  }

  if (!arquivo.focus_nfe_ref) {
    return (
      "Essa nota foi emitida por uma versão do sistema anterior à que passou a guardar a " +
      "referência da nota, então não dá pra pedir o PDF de novo por aqui. Ela continua no " +
      'painel da Focus NFe, e os dados dela aparecem em "Versão para o cliente".'
    );
  }

  return null;
}

export function podeVerDanfe(arquivo: NotaFiscalArquivo): boolean {
  return motivoDanfeIndisponivel(arquivo) === null;
}

// A nota que a Focus NFe devolve nem sempre é PDF: a da NFC-e costuma vir em
// HTML (src/lib/focusNfe.ts, tipoDoArquivo). O arquivo salvo leva a extensão
// do que ele é: um HTML com nome ".pdf" abre em branco no PC e no celular do
// cliente (defeito de 17/11, #1113). Sem tipo conhecido, fica ".pdf" como antes.
export function extensaoDaNota(tipoConteudo?: string | null): "html" | "pdf" {
  return tipoConteudo?.toLowerCase().includes("html") ? "html" : "pdf";
}

// Nome do arquivo na hora de salvar a nota. Usa o número da nota (que é o que
// o cliente e a contabilidade reconhecem); sem número, cai na referência
// interna, que pelo menos é única.
export function nomeArquivoDanfe(arquivo: NotaFiscalArquivo, tipoConteudo?: string | null): string {
  const identificador = arquivo.numero ?? arquivo.focus_nfe_ref ?? "nota";
  return `${NOTA_LABEL[arquivo.tipo]}-${identificador}.${extensaoDaNota(tipoConteudo)}`;
}

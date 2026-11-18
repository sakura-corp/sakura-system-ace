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

// O PDF que o programa gera pro cliente (#1115) sai sempre ".pdf", com o
// número da nota: é o arquivo que abre no celular e no WhatsApp.
export function nomeArquivoPdfDaNota(arquivo: NotaFiscalArquivo): string {
  return nomeArquivoDanfe(arquivo, "application/pdf");
}

// O canal do Electron que gera o PDF ("gerar-pdf-da-nota", electron/main.ts)
// recebe só o HTML já montado, como texto. O recibo de uma nota tem poucas
// dezenas de KB; 1 MB de folga cobre nota com muitos itens e recusa o resto.
// Conta BYTES (acento ocupa 2): vira um endereço `data:` em base64 (+33%), e
// o Chromium não abre endereço acima de 2 MB.
export const LIMITE_HTML_DO_PDF = 1_000_000;

export function motivoHtmlRecusadoParaPdf(html: unknown): string | null {
  if (typeof html !== "string") return "O PDF só é gerado a partir de um HTML em texto.";
  if (!html.trim()) return "O HTML da nota veio vazio.";
  if (html.length > LIMITE_HTML_DO_PDF || new TextEncoder().encode(html).length > LIMITE_HTML_DO_PDF)
    return "O HTML da nota é grande demais pra virar PDF.";
  return null;
}

// A imagem quebrada no topo da prévia da NFC-e (#1113, #1115): o HTML da
// Focus aponta pra imagens de fora (o logo), e a regra de segurança da janela
// não carrega imagem de fora (e não deve: afrouxar a regra vale pro app
// inteiro). Tirar a imagem é o que sobra: ela já não aparecia. A que vem
// dentro do próprio arquivo (`data:`, como um QR code embutido) fica.
export function semImagensDeFora(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const deFora = Array.from(doc.querySelectorAll("img")).filter(
    (img) => !/^\s*(data|blob):/i.test(img.getAttribute("src") ?? ""),
  );
  if (deFora.length === 0) return html;
  for (const img of deFora) img.remove();
  // O mesmo cabeçalho (doctype) de antes, ou nenhum: trocar muda o jeito de o
  // navegador desenhar a página (tamanho de fonte em tabela, quebra na
  // impressão).
  const tipo = doc.doctype;
  const cabecalho = tipo
    ? `<!DOCTYPE ${tipo.name}${tipo.publicId ? ` PUBLIC "${tipo.publicId}"` : ""}${
        tipo.systemId ? `${tipo.publicId ? "" : " SYSTEM"} "${tipo.systemId}"` : ""
      }>\n`
    : "";
  return `${cabecalho}${doc.documentElement.outerHTML}`;
}

// Lê o HTML da Focus com a codificação dele: a do tipo do arquivo
// ("charset=..."), senão a do `<meta charset>`, senão UTF-8. Ler um HTML em
// ISO-8859-1 como UTF-8 estraga os acentos da prévia e do "Imprimir".
export function textoDoHtml(bytes: Uint8Array, tipoConteudo?: string | null): string {
  const doTipo = /charset\s*=\s*["']?([\w.:-]+)/i.exec(tipoConteudo ?? "")?.[1];
  const inicio = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  const doMeta = /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(inicio)?.[1];
  for (const codificacao of [doTipo, doMeta]) {
    if (!codificacao) continue;
    try {
      return new TextDecoder(codificacao).decode(bytes);
    } catch {
      // codificação que o navegador não conhece: tenta a próxima
    }
  }
  return new TextDecoder("utf-8").decode(bytes);
}

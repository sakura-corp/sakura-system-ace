import { Download, FileCode, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { Selo } from "@/components/Selo";
import { mensagemDeErro } from "@/lib/errors";
import { interpretarXmlNotaFiscal, montarHtmlVisualNotaFiscal } from "@/lib/notaFiscalXml";
import { salvarComoDownload } from "@/lib/download";
import { buscarConteudoArquivo, buscarDanfeEmitida } from "@/lib/notasFiscais";
import { buscarLojaDoRecibo, buscarOsDoRecibo } from "@/lib/reciboNotaFiscal";
import {
  extensaoDaNota,
  nomeArquivoDanfe,
  nomeArquivoPdfDaNota,
  semImagensDeFora,
  textoDoHtml,
} from "@/schemas/danfe";
import { NOTA_LABEL } from "@/schemas/situacaoFiscal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";
import { useBaixarXml } from "./useBaixarXml";
import { NotaFiscalVisualModal } from "./NotaFiscalVisualModal";

interface VerDanfeModalProps {
  arquivo: NotaFiscalArquivo;
  onFechar: () => void;
}

// Reabre o PDF de uma nota que o sistema já emitiu — o pedido de balcão mais
// comum que existe (o cliente volta e pede a nota de novo). Antes disso, o
// PDF só existia dentro da janela de emissão: fechou, acabou, e a única
// saída era entrar no painel da Focus NFe.
//
// Visual novo (tarefa 12, #990): é a "Nota do cliente" (o nome que a pessoa
// procura, no lugar de "DANFE"), aberta pela linha de Notas Fiscais e pela
// lista de OS (tarefa 7) e pelo Fechamento da OS. Cada botão de baixar diz o
// que baixa e pra quem (pedido da Sofia, 15/11): a nota é pra ler, imprimir e
// mandar ao cliente; o XML é o arquivo que o contador pede.
//
// #1115: o cliente abre PDF no celular e no WhatsApp, e a NFC-e da Focus vem
// em HTML. Então "Baixar o PDF da nota (pro cliente)" gera um PDF do recibo do
// sistema (o mesmo da "Versão para o cliente", montado do XML guardado, sem
// imagem de fora) pelo Electron (`gerar-pdf-da-nota`, electron/main.ts). A
// NFS-e já vem em PDF da Focus e baixa esse mesmo. Se não der pra gerar,
// avisa e baixa o arquivo de antes (aviso, nunca tranca: docs/licoes.md, 33).
async function gerarPdfDoRecibo(arquivo: NotaFiscalArquivo): Promise<Blob> {
  const gerar = window.sakuraApp?.gerarPdfDaNota;
  if (!gerar) throw new Error("o PDF só é gerado no programa instalado");
  // Os mesmos dados extras da "Versão para o cliente" (#1118): a OS ligada
  // (veículo, placa, garantia) e a loja. Sem acesso, o recibo sai sem eles.
  const [conteudo, os, loja] = await Promise.all([
    buscarConteudoArquivo(arquivo),
    arquivo.ordem_servico_id
      ? buscarOsDoRecibo(arquivo.ordem_servico_id).catch(() => null)
      : Promise.resolve(null),
    buscarLojaDoRecibo(arquivo.loja_id).catch(() => null),
  ]);
  const dados = interpretarXmlNotaFiscal(conteudo, arquivo.tipo);
  if (!dados.reconhecido) throw new Error("o programa não conseguiu ler o XML desta nota");
  const bytes = await gerar(montarHtmlVisualNotaFiscal(dados, { os, loja, valorDaNota: null }));
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function VerDanfeModal({ arquivo, onFechar }: VerDanfeModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // O arquivo como a Focus mandou: PDF (NFS-e) ou HTML (NFC-e, #1113). É o que
  // baixa quando o PDF do recibo não sai, e pelo "arquivo original".
  const [original, setOriginal] = useState<Blob | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [avisoPdf, setAvisoPdf] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const { baixarXml, baixandoXml, erroXml } = useBaixarXml(arquivo);
  const [mostrarResumo, setMostrarResumo] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let ativo = true;
    let urlCriada: string | null = null;

    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        // Quem confere o token, a loja e a permissão é o porteiro (TR-04.2):
        // se faltar alguma coisa, a mensagem dele já diz o quê.
        const pdf = await buscarDanfeEmitida(arquivo);
        if (!ativo) return;
        setOriginal(pdf);
        // A prévia da NFC-e sem as imagens de fora (o logo quebrado do topo):
        // a regra de segurança da janela não carrega imagem de fora (#1115).
        // Lido com a codificação dele e regravado em UTF-8 (o tipo diz isso,
        // e vale mais que o <meta charset> que veio dentro).
        const previa =
          extensaoDaNota(pdf.type) === "html"
            ? new Blob(
                [semImagensDeFora(textoDoHtml(new Uint8Array(await pdf.arrayBuffer()), pdf.type))],
                { type: "text/html;charset=utf-8" },
              )
            : pdf;
        if (!ativo) return;
        urlCriada = URL.createObjectURL(previa);
        setPdfUrl(urlCriada);
      } catch (err) {
        console.error("Erro ao buscar o PDF da nota fiscal:", err);
        if (ativo) setErro(mensagemDeErro(err));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      ativo = false;
      if (urlCriada) URL.revokeObjectURL(urlCriada);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivo.id]);

  function handleImprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  function baixarOriginal() {
    if (original) salvarComoDownload(original, nomeArquivoDanfe(arquivo, original.type));
  }

  async function handleBaixarPdf() {
    if (!original || gerandoPdf) return;
    setAvisoPdf("");
    if (extensaoDaNota(original.type) === "pdf") {
      salvarComoDownload(original, nomeArquivoPdfDaNota(arquivo));
      return;
    }
    setGerandoPdf(true);
    try {
      salvarComoDownload(await gerarPdfDoRecibo(arquivo), nomeArquivoPdfDaNota(arquivo));
    } catch (err) {
      console.error("Erro ao gerar o PDF da nota:", err);
      // O Electron embrulha o erro do processo principal ("Error invoking
      // remote method ..."): pra pessoa, só o motivo, já traduzido.
      const texto = mensagemDeErro(err)
        .replace(/^Error invoking remote method '[^']*': (Error: )?/, "")
        .replace(/\.$/, "");
      const motivo = texto ? ` (${texto})` : "";
      setAvisoPdf(
        `Não deu pra gerar o PDF${motivo}. Baixamos a nota como a Focus NFe mandou (HTML), ` +
          'que abre no navegador do computador. Pra mandar em PDF, use "Imprimir" e escolha a ' +
          'impressora "Microsoft Print to PDF".',
      );
      baixarOriginal();
    } finally {
      setGerandoPdf(false);
    }
  }

  // Sem PDF (nota de prefeitura que não tem, ou emitida antes de o programa
  // guardar a referência), a mensagem de erro manda pra "Versão para o
  // cliente": o botão leva direto pra lá, sem fechar e procurar no menu.
  if (mostrarResumo) return <NotaFiscalVisualModal arquivo={arquivo} onFechar={onFechar} />;

  const cancelada = arquivo.status === "cancelado";
  const nome = arquivo.numero
    ? `${NOTA_LABEL[arquivo.tipo]} nº ${arquivo.numero}`
    : arquivo.nome_arquivo;

  return (
    <Modal
      titulo="Nota do cliente"
      descricao={
        cancelada
          ? `${nome}. Cancelada: não vale mais como nota.`
          : `${nome}. A nota pra ver, imprimir e mandar ao cliente.`
      }
      // 4xl: os quatro botões cabem numa linha só com o "Baixar o PDF da
      // nota (pro cliente)" (#1115); em 3xl o "Imprimir" caía pra baixo.
      largura="4xl"
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Fechar
          </Botao>
          <Botao icone={<FileCode />} onClick={baixarXml} ocupado={baixandoXml}>
            Baixar o XML (pro contador)
          </Botao>
          {pdfUrl && (
            <>
              {/* Nota cancelada não vale mais: o PDF sairia limpo, sem marca,
                  e não vai pro cliente (Sofia, 20/11, revisão do #1126). */}
              {!cancelada && (
                <Botao icone={<Download />} onClick={handleBaixarPdf} ocupado={gerandoPdf}>
                  {gerandoPdf ? "Gerando…" : "Baixar o PDF da nota (pro cliente)"}
                </Botao>
              )}
              <Botao variante="principal" icone={<Printer />} onClick={handleImprimir}>
                Imprimir
              </Botao>
            </>
          )}
        </>
      }
    >
      <div className="space-y-3 text-corpo">
        {cancelada && (
          <p className="flex flex-wrap items-center gap-2 text-texto-2">
            <Selo tipo="perigo" palavra="Cancelada" />
            Esta nota foi cancelada. O registro dela é o XML.
          </p>
        )}

        {carregando && <p className="text-texto-2">Buscando o PDF da nota...</p>}

        {!carregando && erro && (
          <div className="space-y-2">
            <AvisoDeAtencao role="status">{erro}</AvisoDeAtencao>
            {!cancelada && (
              <Botao tamanho="pequeno" onClick={() => setMostrarResumo(true)}>
                Abrir a Versão para o cliente
              </Botao>
            )}
          </div>
        )}

        {erroXml && <AvisoDeErro>{erroXml}</AvisoDeErro>}

        {avisoPdf && <AvisoDeAtencao role="status">{avisoPdf}</AvisoDeAtencao>}

        {pdfUrl && (
          <>
            <iframe
              ref={iframeRef}
              title={`Nota do cliente: ${nome}`}
              src={pdfUrl}
              className="h-[60vh] min-h-80 w-full rounded-xl border border-linha bg-white"
            />
            {!cancelada && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-rotulo text-texto-2">
                <p className="min-w-0">
                  {original && extensaoDaNota(original.type) === "html"
                    ? "O PDF pro cliente é o recibo da nota (com o QR code), montado pelo programa a partir do XML. "
                    : "O PDF pro cliente é este, como a Focus NFe mandou. "}
                  O documento oficial é o XML.
                </p>
                {original && extensaoDaNota(original.type) === "html" && (
                  <Botao variante="fantasma" tamanho="pequeno" onClick={baixarOriginal}>
                    Baixar o arquivo original da Focus (HTML)
                  </Botao>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

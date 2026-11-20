import { Download, FileCode, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { montarHtmlVisualNotaFiscal, interpretarXmlNotaFiscal } from "@/lib/notaFiscalXml";
import { buscarConteudoArquivo } from "@/lib/notasFiscais";
import { buscarLojaDoRecibo, buscarOsDoRecibo } from "@/lib/reciboNotaFiscal";
import { salvarComoDownload } from "@/lib/download";
import { nomeArquivoPdfDaNota } from "@/schemas/danfe";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";
import { useBaixarXml } from "./useBaixarXml";

interface NotaFiscalVisualModalProps {
  arquivo: NotaFiscalArquivo;
  onFechar: () => void;
}

// A "Versão para o cliente": o recibo da nota (modelo novo, #1031) que o
// programa monta a partir do XML, da OS ligada e dos dados da loja. É o que existe pra nota feita fora do programa (que não tem PDF
// guardado). Visual novo (tarefa 12, #990): diz o que é, e cada botão de
// baixar diz o que baixa e pra quem (pedido da Sofia, 15/11).
//
// #1147: a NFS-e da Giap (Araraquara) não tem PDF na Focus NFe, e o resumo
// baixava em HTML, que abre mal no celular e no WhatsApp (o mesmo problema do
// #1113). Agora "Baixar o PDF (pro cliente)" gera o PDF deste mesmo recibo
// pelo Electron (`gerar-pdf-da-nota`, #1126). Se não der, avisa e baixa o
// HTML de antes (aviso, nunca tranca: docs/licoes.md, item 33).
export function NotaFiscalVisualModal({ arquivo, onFechar }: NotaFiscalVisualModalProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [reconhecido, setReconhecido] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [avisoPdf, setAvisoPdf] = useState("");
  const { baixarXml, baixandoXml, erroXml } = useBaixarXml(arquivo);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        // O XML manda; a OS (veículo, placa, garantia) e a loja (pra
        // completar o emitente da Giap) só completam, e sem acesso a elas o
        // recibo sai sem aquelas seções (#1031).
        const [conteudo, os, loja] = await Promise.all([
          buscarConteudoArquivo(arquivo),
          arquivo.ordem_servico_id
            ? buscarOsDoRecibo(arquivo.ordem_servico_id).catch(() => null)
            : Promise.resolve(null),
          buscarLojaDoRecibo(arquivo.loja_id).catch(() => null),
        ]);
        const dados = interpretarXmlNotaFiscal(conteudo, arquivo.tipo);
        setReconhecido(dados.reconhecido);
        // O valor da nota da Giap não está guardado no sistema: sem ele, o
        // recibo não lista os itens da OS (mostra "Itens na OS nº X").
        setHtml(montarHtmlVisualNotaFiscal(dados, { os, loja, valorDaNota: null }));
      } catch (err) {
        console.error("Erro ao gerar versão visual da nota fiscal:", err);
        setErro(mensagemDeErro(err));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [arquivo]);

  function handleImprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  function baixarHtml() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    salvarComoDownload(blob, `${arquivo.nome_arquivo.replace(/\.xml$/i, "")}.html`);
  }

  async function handleBaixarPdf() {
    if (!html || gerandoPdf) return;
    setAvisoPdf("");
    setGerandoPdf(true);
    try {
      const gerar = window.sakuraApp?.gerarPdfDaNota;
      if (!gerar) throw new Error("o PDF só é gerado no programa instalado");
      const bytes = await gerar(html);
      salvarComoDownload(
        new Blob([bytes as BlobPart], { type: "application/pdf" }),
        nomeArquivoPdfDaNota(arquivo),
      );
    } catch (err) {
      console.error("Erro ao gerar o PDF da versão para o cliente:", err);
      // O Electron embrulha o erro do processo principal ("Error invoking
      // remote method ..."): pra pessoa, só o motivo.
      const texto = mensagemDeErro(err)
        .replace(/^Error invoking remote method '[^']*': (Error: )?/, "")
        .replace(/\.$/, "");
      const motivo = texto ? ` (${texto})` : "";
      setAvisoPdf(
        `Não deu pra gerar o PDF${motivo}. Baixamos o resumo em HTML, que abre no navegador do ` +
          'computador. Pra mandar em PDF, use "Imprimir" e escolha a impressora "Microsoft Print to PDF".',
      );
      baixarHtml();
    } finally {
      setGerandoPdf(false);
    }
  }

  const pronto = !carregando && !erro && html;

  return (
    <Modal
      titulo="Versão para o cliente"
      descricao={`${arquivo.nome_arquivo}. Um resumo da nota, montado pelo programa a partir do XML.`}
      largura="3xl"
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Fechar
          </Botao>
          <Botao icone={<FileCode />} onClick={baixarXml} ocupado={baixandoXml}>
            Baixar o XML (pro contador)
          </Botao>
          {pronto && (
            <>
              <Botao icone={<Download />} onClick={handleBaixarPdf} ocupado={gerandoPdf}>
                {gerandoPdf ? "Gerando…" : "Baixar o PDF (pro cliente)"}
              </Botao>
              <Botao variante="principal" icone={<Printer />} onClick={handleImprimir}>
                Imprimir
              </Botao>
            </>
          )}
        </>
      }
    >
      <div className="space-y-3">
        {carregando && <p className="text-corpo text-texto-2">Gerando pré-visualização...</p>}

        {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

        {!carregando && !erro && !reconhecido && (
          <AvisoDeAtencao role="status">
            Não foi possível interpretar automaticamente todos os dados deste XML — o layout deste
            arquivo pode ser diferente do esperado. Confira baixando o XML original.
          </AvisoDeAtencao>
        )}

        {erroXml && <AvisoDeErro>{erroXml}</AvisoDeErro>}

        {avisoPdf && <AvisoDeAtencao role="status">{avisoPdf}</AvisoDeAtencao>}

        {pronto && (
          <iframe
            ref={iframeRef}
            title="Pré-visualização da nota fiscal"
            srcDoc={html}
            className="h-[75vh] min-h-96 w-full rounded-xl border border-linha bg-white"
          />
        )}
      </div>
    </Modal>
  );
}

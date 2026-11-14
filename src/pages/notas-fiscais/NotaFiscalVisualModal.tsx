import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { montarHtmlVisualNotaFiscal, interpretarXmlNotaFiscal } from "@/lib/notaFiscalXml";
import { buscarConteudoArquivo } from "@/lib/notasFiscais";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

interface NotaFiscalVisualModalProps {
  arquivo: NotaFiscalArquivo;
  onFechar: () => void;
}

export function NotaFiscalVisualModal({ arquivo, onFechar }: NotaFiscalVisualModalProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [reconhecido, setReconhecido] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const conteudo = await buscarConteudoArquivo(arquivo);
        const dados = interpretarXmlNotaFiscal(conteudo, arquivo.tipo);
        setReconhecido(dados.reconhecido);
        setHtml(montarHtmlVisualNotaFiscal(dados));
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

  function handleBaixarHtml() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${arquivo.nome_arquivo.replace(/\.xml$/i, "")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal titulo="Versão para o cliente" onFechar={onFechar}>
      {carregando && <p className="text-corpo text-sakura-muted">Gerando pré-visualização...</p>}

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-corpo text-red-700">{erro}</p>}

      {!carregando && !erro && !reconhecido && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-corpo text-amber-800">
          Não foi possível interpretar automaticamente todos os dados deste XML — o layout deste
          arquivo pode ser diferente do esperado. Confira baixando o XML original.
        </p>
      )}

      {!carregando && !erro && html && (
        <>
          <iframe
            ref={iframeRef}
            title="Pré-visualização da nota fiscal"
            srcDoc={html}
            className="h-96 w-full rounded-lg border border-sakura-gray/30 bg-white"
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleBaixarHtml}
              className="rounded-xl border border-sakura-gray/40 px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
            >
              Baixar HTML
            </button>
            <button
              type="button"
              onClick={handleImprimir}
              className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90"
            >
              Imprimir
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { buscarDanfeEmitida } from "@/lib/notasFiscais";
import { nomeArquivoDanfe } from "@/schemas/danfe";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

interface VerDanfeModalProps {
  arquivo: NotaFiscalArquivo;
  onFechar: () => void;
}

// Reabre o PDF de uma nota que o sistema já emitiu — o pedido de balcão mais
// comum que existe (o cliente volta e pede a nota de novo). Antes disso, o
// PDF só existia dentro da janela de emissão: fechou, acabou, e a única
// saída era entrar no painel da Focus NFe.
export function VerDanfeModal({ arquivo, onFechar }: VerDanfeModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
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
        urlCriada = URL.createObjectURL(pdf);
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

  function handleBaixarPdf() {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = nomeArquivoDanfe(arquivo);
    link.click();
  }

  return (
    <Modal titulo="Nota fiscal" onFechar={onFechar}>
      <div className="space-y-3 text-corpo">
        <p className="text-sakura-purple-dark/90">
          {arquivo.numero ? `Número ${arquivo.numero}` : arquivo.nome_arquivo}
          {arquivo.status === "cancelado" && (
            <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-rotulo font-semibold text-red-400">
              cancelada
            </span>
          )}
        </p>

        {carregando && <p className="text-sakura-muted">Buscando o PDF da nota...</p>}

        {!carregando && erro && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-rotulo text-amber-800">{erro}</p>
        )}

        {pdfUrl && (
          <iframe
            ref={iframeRef}
            title="Nota fiscal"
            src={pdfUrl}
            className="h-96 w-full rounded-lg border border-sakura-gray/30 bg-white"
          />
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Fechar
          </button>
          {pdfUrl && (
            <>
              <button
                type="button"
                onClick={handleBaixarPdf}
                className="rounded-xl border border-sakura-gray/40 px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
              >
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={handleImprimir}
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90"
              >
                Imprimir
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

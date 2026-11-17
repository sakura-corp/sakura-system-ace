import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { listarMovimentosCaixaPorOrdem } from "@/lib/caixa";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { montarHtmlGarantiaOS } from "@/lib/garantiaDocumento";
import { buscarClienteEVeiculoDaOrdem } from "@/lib/clientes";
import type { OrdemServico } from "@/types/os";
import { nomeDocumento } from "@/types/os";
import { somar } from "@/schemas/dinheiro";
import { AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";

interface GarantiaVisualModalProps {
  ordem: OrdemServico;
  textoGarantia: string;
  onFechar: () => void;
}

export function GarantiaVisualModal({ ordem, textoGarantia, onFechar }: GarantiaVisualModalProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const [{ cliente, veiculo }, loja, movimentos] = await Promise.all([
          buscarClienteEVeiculoDaOrdem(ordem.id).catch(() => ({ cliente: null, veiculo: null })),
          buscarConfiguracaoFiscal(ordem.loja_id).catch(() => null),
          ordem.status === "faturada"
            ? listarMovimentosCaixaPorOrdem(ordem.id).catch(() => [])
            : [],
        ]);
        const valorCobrado =
          movimentos.length > 0 ? somar(movimentos.map((m) => m.valor)) : null;
        setHtml(
          montarHtmlGarantiaOS({
            ordem,
            cliente,
            veiculo,
            loja,
            valorCobrado,
            textoGarantia,
          }),
        );
      } catch (err) {
        console.error("Erro ao gerar documento de garantia:", err);
        setErro(mensagemDeErro(err));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [ordem, textoGarantia]);

  function handleImprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  function handleBaixarHtml() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `garantia-${nomeDocumento(ordem).replace(" ", "-")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal titulo="Garantia da OS" onFechar={onFechar}>
      {!textoGarantia ? (
        <AvisoDeAtencao className="text-corpo">
          Configure o texto de garantia em Configurações (seção "Texto de garantia") antes de
          imprimir ou baixar.
        </AvisoDeAtencao>
      ) : (
        <>
          {carregando && <p className="text-corpo text-texto-2">Gerando pré-visualização...</p>}
          {erro && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}

          {!carregando && !erro && html && (
            <>
              <iframe
                ref={iframeRef}
                title="Pré-visualização da garantia"
                srcDoc={html}
                className="h-96 w-full rounded-lg border border-linha bg-white"
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onFechar}
                  className="rounded-xl px-4 py-2 text-corpo font-medium text-texto/90 hover:bg-passar"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleBaixarHtml}
                  className="rounded-xl border border-linha-forte px-4 py-2 text-corpo font-medium text-texto hover:bg-passar"
                >
                  Baixar HTML
                </button>
                <button
                  type="button"
                  onClick={handleImprimir}
                  className="rounded-xl bg-acao px-4 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90"
                >
                  Imprimir
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}

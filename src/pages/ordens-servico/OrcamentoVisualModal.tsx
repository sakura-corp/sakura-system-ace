import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { montarHtmlOrcamento } from "@/lib/orcamentoDocumento";
import type { OrdemServico } from "@/types/os";
import { nomeDocumento } from "@/types/os";

interface OrcamentoVisualModalProps {
  ordem: OrdemServico;
  /** O telefone do cliente, se a tela tiver (sem o módulo Clientes não chega). */
  telefoneCliente?: string | null;
  onFechar: () => void;
}

// A folha do orçamento pra entregar na mão do cliente (#1019). Imprime do
// mesmo jeito que a garantia: o HTML num iframe, e o Imprimir chama o print()
// dele (abre a impressão do Windows; dá pra salvar em PDF por lá).
export function OrcamentoVisualModal({ ordem, telefoneCliente, onFechar }: OrcamentoVisualModalProps) {
  const [html, setHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelado = false;
    setHtml(null);
    // Sem os dados da loja (erro ou loja sem cadastro fiscal) o documento sai
    // assim mesmo, com "—" no nome: o orçamento não pode travar por isso.
    buscarConfiguracaoFiscal(ordem.loja_id)
      .catch(() => null)
      .then((loja) => {
        if (cancelado) return;
        setHtml(montarHtmlOrcamento({ ordem, loja, telefoneCliente }));
      });
    return () => {
      cancelado = true;
    };
  }, [ordem, telefoneCliente]);

  function handleImprimir() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <Modal
      titulo={`Imprimir ${nomeDocumento(ordem)}`}
      // Imprime o que está gravado: mudança no formulário ainda não salva não
      // entra (o mesmo vale pro "Enviar" do WhatsApp).
      descricao="A folha do orçamento pra entregar ao cliente, com o que está salvo. Mudou algo? Salve antes de imprimir."
      largura="3xl"
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Fechar
          </Botao>
          {html && (
            <Botao variante="principal" icone={<Printer />} onClick={handleImprimir}>
              Imprimir
            </Botao>
          )}
        </>
      }
    >
      {html ? (
        <iframe
          ref={iframeRef}
          title="Pré-visualização do orçamento"
          srcDoc={html}
          className="h-[60vh] min-h-80 w-full rounded-xl border border-linha bg-white"
        />
      ) : (
        <p className="text-corpo text-texto-2">Montando o orçamento...</p>
      )}
    </Modal>
  );
}

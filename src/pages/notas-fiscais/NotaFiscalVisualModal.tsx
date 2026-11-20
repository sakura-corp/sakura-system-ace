import { Download, FileCode, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { montarHtmlVisualNotaFiscal, interpretarXmlNotaFiscal } from "@/lib/notaFiscalXml";
import { buscarConteudoArquivo } from "@/lib/notasFiscais";
import { buscarLojaDoRecibo, buscarOsDoRecibo } from "@/lib/reciboNotaFiscal";
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
export function NotaFiscalVisualModal({ arquivo, onFechar }: NotaFiscalVisualModalProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [reconhecido, setReconhecido] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
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
              <Botao icone={<Download />} onClick={handleBaixarHtml}>
                Baixar o resumo (pro cliente)
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

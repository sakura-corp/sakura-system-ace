import { Download, FileCode, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { Selo } from "@/components/Selo";
import { mensagemDeErro } from "@/lib/errors";
import { buscarDanfeEmitida } from "@/lib/notasFiscais";
import { nomeArquivoDanfe } from "@/schemas/danfe";
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
export function VerDanfeModal({ arquivo, onFechar }: VerDanfeModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  // PDF ou HTML (a NFC-e da Focus vem em HTML): decide a extensão ao baixar (#1113).
  const [pdfTipo, setPdfTipo] = useState("");
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
        setPdfTipo(pdf.type);
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
    link.download = nomeArquivoDanfe(arquivo, pdfTipo);
    link.click();
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
          {pdfUrl && (
            <>
              <Botao icone={<Download />} onClick={handleBaixarPdf}>
                {/* "a nota", e não "o PDF": a da NFC-e a Focus pode mandar
                    em HTML (src/lib/focusNfe.ts, tipoDoArquivo). */}
                Baixar a nota (pro cliente)
              </Botao>
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
            Esta nota foi cancelada.
          </p>
        )}

        {carregando && <p className="text-texto-2">Buscando o PDF da nota...</p>}

        {!carregando && erro && (
          <div className="space-y-2">
            <AvisoDeAtencao role="status">{erro}</AvisoDeAtencao>
            <Botao tamanho="pequeno" onClick={() => setMostrarResumo(true)}>
              Abrir a Versão para o cliente
            </Botao>
          </div>
        )}

        {erroXml && <AvisoDeErro>{erroXml}</AvisoDeErro>}

        {pdfUrl && (
          <iframe
            ref={iframeRef}
            title={`Nota do cliente: ${nome}`}
            src={pdfUrl}
            className="h-[60vh] min-h-80 w-full rounded-xl border border-linha bg-white"
          />
        )}
      </div>
    </Modal>
  );
}

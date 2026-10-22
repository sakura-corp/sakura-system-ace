import { useEffect, useMemo, useState } from "react";
import { buscarTextoGarantia } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { montarTextoGarantia } from "@/lib/garantiaTexto";
import { listarArquivosDasOrdens } from "@/lib/notasFiscais";
import { situacaoFiscalOrdem } from "@/schemas/situacaoFiscal";
import { VerDanfeModal } from "@/pages/notas-fiscais/VerDanfeModal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import { ehVendaBalcao, totalOrdem } from "@/types/os";
import { EmitirNotaFiscalModal } from "./EmitirNotaFiscalModal";
import { GarantiaVisualModal } from "./GarantiaVisualModal";

interface FechamentoTabProps {
  ordem: OrdemServico;
  /** Uma peça avulsa ganhou cadastro na janela da nota (#655): recarrega a OS. */
  onItensMudaram?: () => void | Promise<void>;
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Só aparece o botão da nota que a OS realmente precisa: uma OS só de
// serviço não tem o que mandar numa NFC-e (e o contrário também). Quando a
// nota já saiu, o botão continua ali (dá pra emitir de novo se a primeira
// foi cancelada), mas já avisa que está emitida.
function BotaoEmitir({
  rotulo,
  emitida,
  onClick,
}: {
  rotulo: string;
  emitida: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        emitida
          ? "flex-1 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2.5 text-rotulo font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20"
          : "flex-1 rounded-xl bg-sakura-purple px-3 py-2.5 text-rotulo font-semibold text-white shadow-[0_0_15px_rgba(182,36,255,0.35)] transition-all hover:bg-sakura-purple/90 hover:shadow-[0_0_22px_rgba(182,36,255,0.6)]"
      }
    >
      {emitida ? `${rotulo} emitida ✓` : `Emitir ${rotulo}`}
    </button>
  );
}

export function FechamentoTab({ ordem, onItensMudaram }: FechamentoTabProps) {
  const itens = ordem.itens ?? [];
  // Venda de balcão (migration 0064) usa esta mesma aba: muda só a palavra,
  // e no lugar do veículo (que ela não tem) aparece quem vendeu.
  const ehVenda = ehVendaBalcao(ordem);
  const estaOrdem = ehVenda ? "Esta venda" : "Esta OS";
  const desta = ehVenda ? "desta venda" : "desta OS";
  const [templateGarantia, setTemplateGarantia] = useState("");
  const [notaParaEmitir, setNotaParaEmitir] = useState<"NFC-e" | "NFS-e" | null>(null);
  const [previewGarantiaAberta, setPreviewGarantiaAberta] = useState(false);
  const [notaParaVerDanfe, setNotaParaVerDanfe] = useState<NotaFiscalArquivo | null>(null);
  const [notas, setNotas] = useState<NotaFiscalArquivo[]>([]);
  const [erro, setErro] = useState("");

  // Quais notas essa OS precisa sai do que ela tem dentro (peça → NFC-e,
  // serviço → NFS-e); o que já saiu vem das notas ligadas a ela.
  const situacao = situacaoFiscalOrdem(itens, notas);
  const notasComPdf = notas.filter(
    (nota) => nota.origem === "automatica" && nota.status !== "cancelado",
  );

  async function recarregarNotas() {
    try {
      setNotas(await listarArquivosDasOrdens([ordem.id]));
    } catch (err) {
      console.error("Erro ao carregar as notas fiscais da OS:", err);
    }
  }

  useEffect(() => {
    let ativo = true;
    listarArquivosDasOrdens([ordem.id])
      .then((lista) => {
        if (ativo) setNotas(lista);
      })
      .catch((err) => console.error("Erro ao carregar as notas fiscais da OS:", err));
    return () => {
      ativo = false;
    };
  }, [ordem.id]);

  useEffect(() => {
    async function carregar() {
      try {
        setTemplateGarantia(await buscarTextoGarantia(ordem.loja_id));
      } catch (err) {
        console.error("Erro ao carregar texto de garantia:", err);
        setErro(mensagemDeErro(err));
      }
    }
    carregar();
  }, [ordem.loja_id]);

  const textoGarantia = useMemo(
    () => (templateGarantia ? montarTextoGarantia(templateGarantia, ordem) : ""),
    [templateGarantia, ordem],
  );

  return (
    <div className="space-y-6">
      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      <section className="grid grid-cols-2 gap-4 sakura-card p-4 text-corpo">
        <div>
          <p className="text-sakura-purple-dark/80">Cliente</p>
          <p className="font-medium text-sakura-purple-dark">{ordem.cliente?.nome ?? "—"}</p>
        </div>
        {ehVenda ? (
          <div>
            <p className="text-sakura-purple-dark/80">Vendedor</p>
            <p className="font-medium text-sakura-purple-dark">{ordem.vendedor?.nome ?? "—"}</p>
          </div>
        ) : (
          <div>
            <p className="text-sakura-purple-dark/80">Veículo</p>
            <p className="font-medium text-sakura-purple-dark">{ordem.veiculo?.placa ?? "—"}</p>
          </div>
        )}
        <div>
          <p className="text-sakura-purple-dark/80">{ehVenda ? "Registrada em" : "Aberta em"}</p>
          <p className="font-medium text-sakura-purple-dark">
            {formatarData(ordem.data_abertura)}
          </p>
        </div>
        <div>
          <p className="text-sakura-purple-dark/80">Fechada em</p>
          <p className="font-medium text-sakura-purple-dark">
            {formatarData(ordem.data_fechamento)}
          </p>
        </div>
      </section>

      <section className="sakura-card p-4">
        <h3 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
          Peças e serviços
        </h3>
        <div className="space-y-1.5">
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-corpo text-sakura-purple-dark/80"
            >
              <span>
                {item.tipo === "peca" ? "Peça" : "Serviço"} — {item.descricao} (
                {item.quantidade}x){item.tecnico?.nome ? ` · técnico: ${item.tecnico.nome}` : ""}
              </span>
              <span>{formatarMoeda(item.quantidade * item.preco_unitario - item.desconto)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-right text-corpo font-semibold text-sakura-purple-dark">
          Total geral: {formatarMoeda(totalOrdem(itens))}
        </p>
      </section>

      <section className="space-y-4 sakura-card p-4">
        <div className="space-y-2">
          <p className="text-rotulo font-medium text-sakura-purple-dark/85">Nota fiscal</p>
          <p className="text-rotulo text-sakura-muted">
            {situacao.pendentes.length === 0
              ? situacao.completa
                ? `Todas as notas ${desta} já foram emitidas.`
                : `${estaOrdem} não tem peça nem serviço lançado.`
              : `${estaOrdem} precisa de ${situacao.pendentes.join(" e ")}.`}
          </p>
          <div className="flex gap-2">
            {situacao.precisaNfce && (
              <BotaoEmitir
                rotulo="NFC-e"
                emitida={situacao.temNfce}
                onClick={() => setNotaParaEmitir("NFC-e")}
              />
            )}
            {situacao.precisaNfse && (
              <BotaoEmitir
                rotulo="NFS-e"
                emitida={situacao.temNfse}
                onClick={() => setNotaParaEmitir("NFS-e")}
              />
            )}
          </div>

          {notasComPdf.length > 0 && (
            <div className="flex gap-2">
              {notasComPdf.map((nota) => (
                <button
                  key={nota.id}
                  type="button"
                  onClick={() => setNotaParaVerDanfe(nota)}
                  className="flex-1 rounded-xl border border-sakura-gray/40 px-3 py-2 text-rotulo font-medium text-sakura-purple-dark transition-colors hover:bg-sakura-gray/10"
                >
                  {nota.tipo === "nfe" ? "Ver DANFE" : "Ver PDF da NFS-e"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-rotulo font-medium text-sakura-purple-dark/85">Garantia</p>
          <button
            type="button"
            onClick={() => setPreviewGarantiaAberta(true)}
            className="w-full rounded-xl bg-sakura-pink px-3 py-2.5 text-rotulo font-semibold text-sakura-bg shadow-[0_0_15px_rgba(255,77,206,0.35)] transition-all hover:bg-sakura-pink/90 hover:shadow-[0_0_22px_rgba(255,77,206,0.6)]"
          >
            Ver garantia
          </button>
        </div>
      </section>

      {notaParaEmitir && (
        <EmitirNotaFiscalModal
          ordem={ordem}
          tipoNota={notaParaEmitir}
          onFechar={() => setNotaParaEmitir(null)}
          onEmitido={() => {
            void recarregarNotas();
          }}
          onItensMudaram={onItensMudaram}
        />
      )}

      {notaParaVerDanfe && (
        <VerDanfeModal
          arquivo={notaParaVerDanfe}
          onFechar={() => setNotaParaVerDanfe(null)}
        />
      )}

      {previewGarantiaAberta && (
        <GarantiaVisualModal
          ordem={ordem}
          textoGarantia={textoGarantia}
          onFechar={() => setPreviewGarantiaAberta(false)}
        />
      )}
    </div>
  );
}

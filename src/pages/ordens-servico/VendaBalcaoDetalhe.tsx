import { BotaoVoltar } from "@/components/BotaoVoltar";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import { nomeDocumento } from "@/types/os";
import { FechamentoTab } from "./FechamentoTab";
import { StatusOrdem } from "./StatusOrdemBadge";

/**
 * Uma venda de balcão já registrada, aberta pela lista (item FN-09).
 *
 * Não reaproveita o formulário da OS de propósito: lá o que se faz é editar
 * cliente, veículo, KM e itens — e numa venda nada disso muda depois de
 * registrada. O que sobra pra fazer numa venda é o que está no fechamento:
 * emitir (ou reemitir) a NFC-e, ver o DANFE e imprimir a garantia. E, se o
 * pagamento não chegou a entrar, faturar.
 */
export function VendaBalcaoDetalhe({
  ordem,
  notas,
  onFaturar,
  onVoltar,
}: {
  ordem: OrdemServico;
  notas: NotaFiscalArquivo[];
  onFaturar: () => void;
  onVoltar: () => void;
}) {
  return (
    <div className="space-y-6 sakura-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-sakura-gray/20 pb-4">
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onVoltar} />
          <div>
            <p className="text-rotulo text-sakura-muted">
              {nomeDocumento(ordem)} · venda de balcão · registrada em{" "}
              {new Date(ordem.data_abertura).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
              {ordem.cliente?.nome ?? "Cliente"}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusOrdem ordem={ordem} notas={notas} />
          {ordem.status !== "faturada" && (
            <button
              type="button"
              onClick={onFaturar}
              className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90"
            >
              Faturar
            </button>
          )}
        </div>
      </div>

      {ordem.status !== "faturada" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O pagamento desta venda não chegou a entrar — as peças já saíram do estoque. Fature
          aqui; não registre a venda de novo.
        </p>
      )}

      <FechamentoTab ordem={ordem} />
    </div>
  );
}

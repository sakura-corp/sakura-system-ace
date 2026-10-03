// As peças da tela de Comissões que tratam de comissão JÁ PAGA (item TL-46.1):
// registrar o pagamento, o recibo pra imprimir e o histórico. As contas
// (retrato, comparação, "já pago em outro período") estão em
// schemas/comissoesPagas.ts — aqui é só tela.
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/Modal";
import { diaBrasileiro as dataBr, hojeLocal } from "@/lib/datas";
import { desfazerComissaoPaga, registrarComissaoPaga } from "@/lib/comissoesFechamentos";
import { mensagemDeErro } from "@/lib/errors";
import { montarHtmlReciboComissao } from "@/lib/reciboComissao";
import type { ComissaoFuncionario } from "@/schemas/comissoes";
import { retratoDaLinha, type JaPagoEmOutroPeriodo } from "@/schemas/comissoesPagas";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { ComissaoFechamento } from "@/types/comissaoFechamento";

const campo = "rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple";

const pagamentoSchema = z.object({
  valorPago: z.string().refine((v) => v.trim() !== "" && Number(v) >= 0, "Informe o valor pago (pode ser zero)."),
  dataPagamento: z.string().min(1, "Informe a data do pagamento."),
  observacao: z.string(),
});
type PagamentoValues = z.infer<typeof pagamentoSchema>;

export function RegistrarPagamentoModal({
  lojaId,
  linha,
  de,
  ate,
  jaPago,
  onRegistrado,
  onFechar,
}: {
  lojaId: string;
  linha: ComissaoFuncionario;
  de: string;
  ate: string;
  jaPago: JaPagoEmOutroPeriodo;
  onRegistrado: () => Promise<void>;
  onFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PagamentoValues>({
    resolver: zodResolver(pagamentoSchema),
    defaultValues: {
      valorPago: String(Math.max(0, linha.comissaoTotal)),
      dataPagamento: hojeLocal(),
      observacao: "",
    },
  });

  async function aoRegistrar(valores: PagamentoValues) {
    setErro(null);
    try {
      await registrarComissaoPaga({
        loja_id: lojaId,
        funcionario_id: linha.funcionarioId,
        funcionario_nome: linha.nome,
        periodo_inicio: de,
        periodo_fim: ate,
        percentual: linha.percentual,
        valor_calculado: linha.comissaoTotal,
        valor_pago: Number(valores.valorPago),
        data_pagamento: valores.dataPagamento,
        observacao: valores.observacao.trim() || null,
        snapshot: retratoDaLinha(linha),
      });
      await onRegistrado();
    } catch (err) {
      console.error("Erro ao registrar pagamento de comissão:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <Modal titulo="Registrar pagamento de comissão" onFechar={onFechar}>
      <form onSubmit={handleSubmit(aoRegistrar)} className="space-y-3 text-corpo">
        <p className="text-sakura-purple-dark/85">
          <strong className="text-sakura-purple-dark">{linha.nome}</strong> — de {dataBr(de)} a {dataBr(ate)}.
          Calculado: <strong className="text-sakura-purple-dark">{formatarMoeda(linha.comissaoTotal)}</strong>.
        </p>
        <p className="text-rotulo text-sakura-muted">
          O sistema guarda um retrato das OS que formaram esse valor. Se alguma delas for editada
          depois, esta tela avisa — o valor pago não muda sozinho.
        </p>

        {jaPago.valor !== 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
            Cuidado: {formatarMoeda(jaPago.valor)} desse valor vem de OS que já entraram num pagamento
            anterior (OS {jaPago.numeros.join(", ")}). Confira pra não pagar duas vezes.
          </p>
        )}

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>}

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sakura-purple-dark/85">Valor pago</span>
            <input type="number" min="0" step="0.01" {...register("valorPago")} className={campo} />
            {errors.valorPago && <span className="text-rotulo text-red-400">{errors.valorPago.message}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sakura-purple-dark/85">Data do pagamento</span>
            <input type="date" {...register("dataPagamento")} className={campo} />
            {errors.dataPagamento && (
              <span className="text-rotulo text-red-400">{errors.dataPagamento.message}</span>
            )}
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-sakura-purple-dark/85">Observação (opcional — vale, adiantamento…)</span>
            <input type="text" {...register("observacao")} className={campo} />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Registrando..." : "Registrar pagamento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ReciboComissaoModal({
  nomeLoja,
  pagamento,
  onFechar,
}: {
  nomeLoja: string;
  pagamento: ComissaoFechamento;
  onFechar: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = montarHtmlReciboComissao({ nomeLoja, pagamento });
  return (
    <Modal titulo={`Recibo de comissão — ${pagamento.funcionario_nome}`} onFechar={onFechar}>
      <iframe
        ref={iframeRef}
        title="Pré-visualização do recibo de comissão"
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
          onClick={() => iframeRef.current?.contentWindow?.print()}
          className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90"
        >
          Imprimir
        </button>
      </div>
    </Modal>
  );
}

export function HistoricoPagamentos({
  pagamentos,
  podeDesfazer,
  onRecibo,
  onDesfeito,
}: {
  pagamentos: ComissaoFechamento[];
  podeDesfazer: boolean;
  onRecibo: (p: ComissaoFechamento) => void;
  onDesfeito: () => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  if (pagamentos.length === 0) return null;

  async function desfazer(p: ComissaoFechamento) {
    if (
      !confirm(
        `Desfazer o registro do pagamento de ${p.funcionario_nome} (${dataBr(p.periodo_inicio)} a ${dataBr(p.periodo_fim)}, ${formatarMoeda(p.valor_pago)})?\n\n` +
          "Isso só apaga o REGISTRO — não mexe no dinheiro. Fica gravado na Auditoria quem desfez.",
      )
    ) {
      return;
    }
    setErro(null);
    try {
      await desfazerComissaoPaga(p.id);
      await onDesfeito();
    } catch (err) {
      console.error("Erro ao desfazer pagamento de comissão:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Pagamentos já registrados</h2>
      {erro && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}
      <div className="overflow-x-auto sakura-card">
        <table className="w-full text-left text-corpo">
          <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
            <tr>
              <th className="px-4 py-3 font-medium">Funcionário</th>
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Pago</th>
              <th className="px-4 py-3 font-medium">Em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pagamentos.map((p) => (
              <tr key={p.id} className="border-t border-sakura-gray/20">
                <td className="px-4 py-3">{p.funcionario_nome}</td>
                <td className="px-4 py-3">
                  {dataBr(p.periodo_inicio)} a {dataBr(p.periodo_fim)}
                </td>
                <td className="px-4 py-3">{formatarMoeda(p.valor_pago)}</td>
                <td className="px-4 py-3">{dataBr(p.data_pagamento)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRecibo(p)}
                      className="min-h-8 rounded-lg px-3 text-rotulo font-medium text-sakura-purple-dark hover:bg-sakura-gray/10"
                    >
                      Recibo
                    </button>
                    {podeDesfazer && (
                      <button
                        type="button"
                        onClick={() => desfazer(p)}
                        className="min-h-8 rounded-lg px-3 text-rotulo font-medium text-sakura-purple-dark/85 hover:bg-sakura-gray/10"
                      >
                        Desfazer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

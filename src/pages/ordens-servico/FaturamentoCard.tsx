import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { mensagemDeErro } from "@/lib/errors";
import type { PagamentoOrdem } from "@/lib/ordensServico";
import {
  calcularJurosPercentual,
  calcularLinhasPagamento,
  calcularListaParcelas,
  calcularValorCobrado,
  faturamentoFormSchema,
  faturamentoFormVazio,
  jurosDasLinhas,
  formaPermiteParcelar,
  paraPagamentos,
  parcelasDaOrdem,
  somarLinhasCobradas,
  somarLinhasPagamento,
  type FaturamentoFormValues,
} from "@/schemas/faturamento";
import { ehConsumidor } from "@/types/cliente";
import type { JurosParcela } from "@/types/configuracao";
import { FORMA_PAGAMENTO_LABEL, ehVendaBalcao, nomeOrdem, totalOrdem } from "@/types/os";
import type { OrdemServico } from "@/types/os";

// Só o que o pagamento precisa saber da ordem — é o que deixa a venda de
// balcão (item FN-09) usar este mesmo cartão ANTES de a venda existir no
// banco, sem inventar uma OS inteira de mentira.
export type OrdemParaFaturar = Pick<
  OrdemServico,
  "numero" | "tipo" | "cliente_id" | "cliente" | "itens"
>;

interface FaturamentoCardProps {
  ordem: OrdemParaFaturar;
  jurosParcelas: JurosParcela[];
  /** Troca o "Faturar OS 12 de Fulano" do topo (a venda nova ainda não tem número). */
  titulo?: string;
  /** Texto do botão de confirmar. */
  rotuloConfirmar?: string;
  onConfirmar: (
    pagamentos: PagamentoOrdem[],
    parcelas: number,
    previsaoRecebimento: string | null,
  ) => Promise<void>;
  onCancelar: () => void;
}

const FORMAS_PAGAMENTO = Object.entries(FORMA_PAGAMENTO_LABEL).map(([valor, label]) => ({
  valor,
  label,
}));

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FaturamentoCard({
  ordem,
  jurosParcelas,
  titulo,
  rotuloConfirmar = "Confirmar faturamento",
  onConfirmar,
  onCancelar,
}: FaturamentoCardProps) {
  const total = totalOrdem(ordem.itens ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const ehVenda = ehVendaBalcao(ordem);
  // Venda no Consumidor não fica "a receber": não há de quem cobrar, e a
  // conta nasceria no nome de "ninguém" (migration 0064).
  const permiteAReceber = !ehConsumidor(ordem.cliente_id);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FaturamentoFormValues>({
    resolver: zodResolver(faturamentoFormSchema),
    defaultValues: faturamentoFormVazio(total),
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "linhasPagamento",
  });

  const recebidoAgora = watch("recebidoAgora");
  const dividirPagamento = watch("dividirPagamento");
  const formaPagamento = watch("formaPagamento");
  const parcelas = Number(watch("parcelas")) || 1;
  const linhasPagamento = watch("linhasPagamento");

  const permiteParcelar = !dividirPagamento && formaPagamento === "cartao_credito";
  const jurosPercentual =
    !dividirPagamento && parcelas > 1 ? calcularJurosPercentual(jurosParcelas, parcelas) : 0;
  const valorCobrado = calcularValorCobrado(total, jurosPercentual);
  const listaParcelas = calcularListaParcelas(valorCobrado, parcelas);

  // No pagamento dividido, o que precisa fechar com o total dos itens é a
  // soma dos valores *base* (o que o cliente combinou em cada forma) — os
  // juros do cartão entram depois, por linha, e engordam só o total cobrado.
  const somaLinhasPagamento = somarLinhasPagamento(linhasPagamento);
  const diferencaLinhasPagamento = total - somaLinhasPagamento;
  const linhasBatem = Math.abs(diferencaLinhasPagamento) < 0.01;
  const linhasCalculadas = calcularLinhasPagamento(linhasPagamento, jurosParcelas);
  const totalCobradoDividido = somarLinhasCobradas(linhasPagamento, jurosParcelas);
  const jurosDividido = jurosDasLinhas(linhasPagamento, jurosParcelas);

  const formaPagamentoField = register("formaPagamento");

  function aoMudarDividirPagamento(dividir: boolean) {
    setValue("dividirPagamento", dividir);
    if (dividir) {
      setValue("parcelas", "1");
      replace([
        { formaPagamento: "pix", valor: String(total), parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "0", parcelas: "1" },
      ]);
    }
  }

  async function aoSubmeter(valores: FaturamentoFormValues) {
    setErro(null);

    if (valores.recebidoAgora && valores.dividirPagamento && !linhasBatem) {
      setErro("A soma das formas de pagamento precisa bater com o total dos itens.");
      return;
    }

    if (
      !confirm(
        ehVenda
          ? "Confirmar a venda? Ela baixa o estoque e lança o pagamento — depois disso as " +
              "peças dela não mudam mais."
          : "Confirmar o faturamento? Depois disso não dá mais pra acrescentar peça ou serviço " +
              "nessa OS — se esquecer algo, só numa OS nova.",
      )
    ) {
      return;
    }

    const recebidoAgora = valores.recebidoAgora || !permiteAReceber;
    try {
      await onConfirmar(
        paraPagamentos({ ...valores, recebidoAgora }, valorCobrado, jurosParcelas),
        parcelasDaOrdem({ ...valores, recebidoAgora }),
        recebidoAgora ? null : valores.previsaoRecebimento,
      );
    } catch (err) {
      console.error("Erro ao faturar ordem de serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-5 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <div>
          <h3 className="text-corpo font-semibold text-sakura-purple-dark">
            {titulo ??
              `Faturar ${nomeOrdem(ordem.numero, ordem.tipo)} de ${ordem.cliente?.nome ?? "cliente"}`}
          </h3>
          <p className="text-rotulo text-sakura-muted">Total dos itens: {formatarMoeda(total)}</p>
        </div>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      {!permiteAReceber ? (
        <p className="text-rotulo text-sakura-muted">
          Venda no Consumidor é recebida na hora. Pra deixar a receber depois, escolha quem está
          comprando.
        </p>
      ) : (
        <div className="rounded-xl border border-sakura-gray/30 p-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-corpo">
              <input
                type="radio"
                name="recebimento"
                checked={recebidoAgora}
                onChange={() => setValue("recebidoAgora", true)}
                className="h-4 w-4 text-sakura-purple focus:ring-sakura-purple"
              />
              <span className="text-sakura-purple-dark/80">Recebido agora</span>
            </label>
            <label className="flex items-center gap-2 text-corpo">
              <input
                type="radio"
                name="recebimento"
                checked={!recebidoAgora}
                onChange={() => setValue("recebidoAgora", false)}
                className="h-4 w-4 text-sakura-purple focus:ring-sakura-purple"
              />
              <span className="text-sakura-purple-dark/80">A receber depois</span>
            </label>
          </div>

          {recebidoAgora ? (
            <p className="mt-2 text-rotulo text-sakura-muted">
              Lança o valor como Entrada no Caixa agora mesmo.
            </p>
          ) : (
            <>
              <p className="mt-2 text-rotulo text-sakura-muted">
                Não lança nada no Caixa ainda — cria uma pendência em "Contas a Receber", que só vira
                Entrada quando você marcar como recebido de verdade.
              </p>
              <label className="mt-2 flex items-center gap-2 text-corpo">
                <span className="text-sakura-purple-dark/80">Previsão de recebimento</span>
                <input
                  type="date"
                  {...register("previsaoRecebimento")}
                  className="rounded-lg border border-sakura-borda-campo px-3 py-1.5 focus:border-sakura-purple"
                />
              </label>
            </>
          )}
        </div>
      )}

      {recebidoAgora && (
        <label className="flex items-center gap-2 text-corpo">
          <input
            type="checkbox"
            checked={dividirPagamento}
            onChange={(e) => aoMudarDividirPagamento(e.target.checked)}
            className="h-4 w-4 text-sakura-purple focus:ring-sakura-purple"
          />
          <span className="text-sakura-purple-dark/80">
            Dividir em mais de uma forma de pagamento
          </span>
        </label>
      )}

      {recebidoAgora && dividirPagamento ? (
        <div className="space-y-2">
          {fields.map((campo, index) => {
            const linha = linhasCalculadas[index];
            const podeParcelarLinha = formaPermiteParcelar(
              linhasPagamento[index]?.formaPagamento ?? "",
            );
            const formaLinhaField = register(`linhasPagamento.${index}.formaPagamento`);

            return (
              <div key={campo.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <select
                    {...formaLinhaField}
                    onChange={(e) => {
                      formaLinhaField.onChange(e);
                      // Trocou pra uma forma que não parcela (Pix, dinheiro,
                      // débito): volta pra 1x, senão ficaria um parcelamento
                      // invisível sobrando de uma escolha anterior.
                      if (!formaPermiteParcelar(e.target.value)) {
                        setValue(`linhasPagamento.${index}.parcelas`, "1");
                      }
                    }}
                    className="flex-1 rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
                  >
                    {FORMAS_PAGAMENTO.map((forma) => (
                      <option key={forma.valor} value={forma.valor}>
                        {forma.label}
                      </option>
                    ))}
                  </select>
                  <select
                    {...register(`linhasPagamento.${index}.parcelas`)}
                    disabled={!podeParcelarLinha}
                    title={
                      podeParcelarLinha
                        ? "Em quantas vezes o cliente passou no cartão"
                        : "Só o cartão de crédito parcela"
                    }
                    className="w-40 rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple disabled:opacity-50"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                      const percentual = calcularJurosPercentual(jurosParcelas, n);
                      return (
                        <option key={n} value={n}>
                          {n}x
                          {n === 1
                            ? " à vista"
                            : percentual > 0
                              ? ` (${percentual}% juros)`
                              : " sem juros"}
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`linhasPagamento.${index}.valor`)}
                    className="w-32 rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
                  />
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-rotulo font-medium text-red-300 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {linha && linha.parcelas > 1 && linha.valorBase > 0 && (
                  <p className="pr-2 text-right text-rotulo text-sakura-muted">
                    {linha.jurosPercentual > 0
                      ? `${linha.parcelas}x de ${formatarMoeda(
                          linha.valorCobrado / linha.parcelas,
                        )} — com ${linha.jurosPercentual}% de juros, essa forma fecha em ${formatarMoeda(
                          linha.valorCobrado,
                        )}`
                      : `${linha.parcelas}x de ${formatarMoeda(
                          linha.valorCobrado / linha.parcelas,
                        )} — sem juros`}
                  </p>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => append({ formaPagamento: "dinheiro", valor: "0", parcelas: "1" })}
            className="text-rotulo font-medium text-sakura-purple hover:underline"
          >
            + Adicionar forma de pagamento
          </button>
          <p
            className={`text-right text-corpo font-medium ${
              linhasBatem ? "text-sakura-purple-dark" : "text-red-300"
            }`}
          >
            {linhasBatem
              ? `Total: ${formatarMoeda(somaLinhasPagamento)}`
              : diferencaLinhasPagamento > 0
                ? `Falta ${formatarMoeda(diferencaLinhasPagamento)} de ${formatarMoeda(total)}`
                : `Passou ${formatarMoeda(-diferencaLinhasPagamento)} de ${formatarMoeda(total)}`}
          </p>
          {linhasBatem && jurosDividido > 0 && (
            <p className="text-right text-corpo font-semibold text-sakura-purple-dark">
              Com os juros do cartão: {formatarMoeda(totalCobradoDividido)} (
              {formatarMoeda(jurosDividido)} de juros)
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Forma de pagamento</span>
            <select
              {...formaPagamentoField}
              onChange={(e) => {
                formaPagamentoField.onChange(e);
                if (e.target.value !== "cartao_credito") setValue("parcelas", "1");
              }}
              className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
            >
              {FORMAS_PAGAMENTO.map((forma) => (
                <option key={forma.valor} value={forma.valor}>
                  {forma.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Parcelas</span>
            <select
              {...register("parcelas")}
              disabled={!permiteParcelar}
              className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple disabled:opacity-50"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                const percentual = calcularJurosPercentual(jurosParcelas, n);
                return (
                  <option key={n} value={n}>
                    {n}x{n === 1 ? " à vista" : percentual > 0 ? ` (${percentual}% de juros)` : " sem juros"}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      )}

      {!(recebidoAgora && dividirPagamento) &&
        (parcelas === 1 ? (
          <p className="text-right text-subtitulo font-semibold text-sakura-purple-dark">
            {formatarMoeda(valorCobrado)}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-sakura-gray/30">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-2 font-medium">Parcela</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {listaParcelas.map((p) => (
                  <tr key={p.numero} className="border-t border-sakura-gray/20">
                    <td className="px-4 py-2 text-sakura-purple-dark">{p.numero}x</td>
                    <td className="px-4 py-2 text-sakura-purple-dark">
                      {p.vencimento.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 text-sakura-purple-dark">{formatarMoeda(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-sakura-gray/20 px-4 py-2 text-right text-corpo font-semibold text-sakura-purple-dark">
              Total {jurosPercentual > 0 ? "com juros" : ""}: {formatarMoeda(valorCobrado)}
            </p>
          </div>
        ))}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (recebidoAgora && dividirPagamento && !linhasBatem)}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Faturando..." : rotuloConfirmar}
        </button>
      </div>
    </form>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, TriangleAlert, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useFieldArray, useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { Dica } from "@/components/Dica";
import { Modal } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { buscarConfiguracaoPix } from "@/lib/configuracoes";
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
import { montarPixCopiaECola, valorDoQrPix } from "@/schemas/pix";
import { ehConsumidor } from "@/types/cliente";
import type { ConfiguracaoPix, JurosParcela } from "@/types/configuracao";
import { FORMA_PAGAMENTO_LABEL, ehVendaBalcao, nomeDocumento, totalOrdem } from "@/types/os";
import type { OrdemServico } from "@/types/os";

// Só o que o pagamento precisa saber da ordem — é o que deixa a venda de
// balcão (item FN-09) usar este mesmo cartão ANTES de a venda existir no
// banco, sem inventar uma OS inteira de mentira.
export type OrdemParaFaturar = Pick<
  OrdemServico,
  "numero" | "tipo" | "cliente_id" | "cliente" | "itens"
> &
  // A placa vai na linha de baixo do título ("Ricardo · RTA-4B71"); a venda
  // não tem veículo.
  Partial<Pick<OrdemServico, "veiculo">>;

interface FaturamentoCardProps {
  ordem: OrdemParaFaturar;
  jurosParcelas: JurosParcela[];
  /** Troca o "Faturar OS 12" do topo (a venda nova ainda não tem número). */
  titulo?: string;
  /** Troca a linha de baixo do título (sem dizer: o cliente e a placa). */
  descricao?: string;
  /** Texto do botão de confirmar. */
  rotuloConfirmar?: string;
  /** Texto do botão de desistir (a venda nova volta pras peças: "Mudar as peças"). */
  rotuloCancelar?: string;
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

// "Recebido agora" e "A receber depois" como dois cartões que se escolhe
// clicando em qualquer lugar deles (o conceito, `6-faturar.jpg`). O escolhido
// ganha a borda laranja e o fundo laranja bem fraco; a bolinha marcada
// continua lá, porque cor sozinha não avisa (regra 4).
const CLASSE_OPCAO =
  "flex cursor-pointer items-start gap-3 rounded-[14px] border border-linha-forte p-4 text-corpo transition-colors hover:bg-passar";
const CLASSE_OPCAO_ESCOLHIDA = "border-[color:var(--foco-campo-borda)] bg-acao/[0.08] hover:bg-acao/[0.12]";

// O QR do Pix da loja (#456). O fundo é sempre branco, com margem: o leitor do
// banco precisa de fundo claro mesmo quando o programa está no tema escuro.
function PixQrCode({ codigo, valor }: { codigo: string; valor: number }) {
  const [copiado, setCopiado] = useState(false);
  const [naoCopiou, setNaoCopiou] = useState(false);

  async function copiar() {
    setNaoCopiou(false);
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      // Sem aviso, a pessoa colaria o que já estava copiado antes.
      console.error("Não deu pra copiar o código Pix:", err);
      setNaoCopiou(true);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-[14px] border border-linha p-4">
      <div className="rounded-lg bg-white p-3" data-testid="qr-pix">
        <QRCodeSVG value={codigo} size={180} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-corpo font-semibold text-texto">
          Pix de {formatarMoeda(valor)}
        </p>
        <p className="text-rotulo text-texto-2">
          O cliente lê o QR no app do banco, ou você manda o código abaixo. O sistema não fica
          sabendo que foi pago: confira no seu banco antes de confirmar.
        </p>
        <p
          className="break-all rounded-lg bg-poco px-3 py-2 font-mono text-rotulo text-texto select-all"
          data-testid="codigo-pix"
        >
          {codigo}
        </p>
        <div className="flex items-center gap-3">
          <Botao tamanho="pequeno" onClick={copiar}>
            Copiar código
          </Botao>
          {copiado && (
            <span role="status" className="text-rotulo text-ok">
              Copiado
            </span>
          )}
          {naoCopiou && (
            <span role="status" className="text-rotulo text-perigo">
              Não deu pra copiar: selecione o código acima e copie à mão.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function FaturamentoCard({
  ordem,
  jurosParcelas,
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar faturamento",
  rotuloCancelar = "Cancelar",
  onConfirmar,
  onCancelar,
}: FaturamentoCardProps) {
  const idDoFormulario = useId();
  const total = totalOrdem(ordem.itens ?? []);
  const { lojaAtual } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  // O Pix da loja, lido uma vez. Sem ele (ou se não deu pra ler) nada aparece.
  const [configuracaoPix, setConfiguracaoPix] = useState<ConfiguracaoPix | null>(null);
  const lojaId = lojaAtual?.id;
  useEffect(() => {
    let cancelado = false;
    // Trocou de loja: some o Pix da anterior até chegar o da nova.
    setConfiguracaoPix(null);
    if (!lojaId) return;
    buscarConfiguracaoPix(lojaId)
      .then((pix) => {
        if (!cancelado) setConfiguracaoPix(pix);
      })
      .catch((err) => console.error("Não deu pra ler o Pix da loja:", err));
    return () => {
      cancelado = true;
    };
  }, [lojaId]);
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

  // O QR só vale pra dinheiro recebido agora; "a receber depois" não é cobrança no balcão.
  const valorQrPix =
    configuracaoPix && (recebidoAgora || !permiteAReceber)
      ? valorDoQrPix({
          dividir: dividirPagamento && recebidoAgora,
          linhasBatem,
          formaPagamento,
          valorCobrado,
          linhas: linhasCalculadas,
        })
      : null;
  const codigoPix =
    configuracaoPix && valorQrPix !== null
      ? montarPixCopiaECola({
          chave: configuracaoPix.chave,
          nomeRecebedor: configuracaoPix.nome_recebedor,
          cidadeRecebedor: configuracaoPix.cidade_recebedor,
          valor: valorQrPix,
        })
      : null;

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

  // A conta que fecha a janela, embaixo à esquerda (o conceito, `6-faturar.jpg`):
  // o total e, se houver, o total com os juros. Os números vêm prontos das
  // funções de `schemas/faturamento.ts`: aqui só se escolhe a frase.
  const notaDoRodape =
    recebidoAgora && dividirPagamento ? (
      <div className="space-y-0.5">
        <p
          className={`flex items-center gap-1.5 font-medium ${linhasBatem ? "text-texto" : "text-perigo"}`}
        >
          {!linhasBatem && <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />}
          {linhasBatem
            ? `Total: ${formatarMoeda(somaLinhasPagamento)}`
            : diferencaLinhasPagamento > 0
              ? `Falta ${formatarMoeda(diferencaLinhasPagamento)} de ${formatarMoeda(total)}`
              : `Passou ${formatarMoeda(-diferencaLinhasPagamento)} de ${formatarMoeda(total)}`}
        </p>
        {linhasBatem && jurosDividido > 0 && (
          <p className="font-semibold text-texto">
            Com os juros do cartão: {formatarMoeda(totalCobradoDividido)} (
            {formatarMoeda(jurosDividido)} de juros)
          </p>
        )}
      </div>
    ) : parcelas === 1 ? (
      <p className="font-semibold text-texto">{`Total: ${formatarMoeda(valorCobrado)}`}</p>
    ) : (
      <p className="font-semibold text-texto">
        {`${jurosPercentual > 0 ? "Total com juros" : "Total"}: ${formatarMoeda(valorCobrado)}`}
      </p>
    );

  const bloqueado = isSubmitting || (recebidoAgora && dividirPagamento && !linhasBatem);

  return (
    <Modal
      titulo={titulo ?? `Faturar ${nomeDocumento(ordem)}`}
      descricao={
        descricao ??
        ([ordem.cliente?.nome, ordem.veiculo?.placa].filter(Boolean).join(" · ") || undefined)
      }
      largura="3xl"
      total={{ rotulo: "Total dos itens", valor: formatarMoeda(total) }}
      notaDoRodape={notaDoRodape}
      // Faturando, a janela não fecha: o pedido já foi pro banco, e o erro (se
      // vier) precisa de onde aparecer.
      onFechar={() => {
        if (!isSubmitting) onCancelar();
      }}
      rodape={
        <>
          {/* O erro fica do lado do botão que falhou, e não some sozinho. */}
          {erro && (
            <p
              role="alert"
              className="flex w-full items-start justify-end gap-1.5 text-right text-corpo font-medium text-perigo"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">{erro}</span>
            </p>
          )}
          <Botao variante="fantasma" onClick={onCancelar} disabled={isSubmitting}>
            {rotuloCancelar}
          </Botao>
          <Botao
            variante="principal"
            type="submit"
            form={idDoFormulario}
            disabled={bloqueado}
            ocupado={isSubmitting}
          >
            {isSubmitting ? "Faturando..." : rotuloConfirmar}
          </Botao>
        </>
      }
    >
      <form id={idDoFormulario} onSubmit={handleSubmit(aoSubmeter)} className="space-y-5">
        {!permiteAReceber ? (
          <p className="text-rotulo text-texto-2">
            Venda no Consumidor é recebida na hora. Pra deixar a receber depois, escolha quem está
            comprando.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`${CLASSE_OPCAO} ${recebidoAgora ? CLASSE_OPCAO_ESCOLHIDA : ""}`}
              >
                <input
                  type="radio"
                  name="recebimento"
                  checked={recebidoAgora}
                  onChange={() => setValue("recebidoAgora", true)}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-texto">Recebido agora</span>
                  <span className="mt-0.5 block text-rotulo text-texto-2">
                    Lança o valor como Entrada no Caixa agora mesmo.
                  </span>
                </span>
              </label>
              <label
                className={`${CLASSE_OPCAO} ${!recebidoAgora ? CLASSE_OPCAO_ESCOLHIDA : ""}`}
              >
                <input
                  type="radio"
                  name="recebimento"
                  checked={!recebidoAgora}
                  onChange={() => setValue("recebidoAgora", false)}
                  className="mt-0.5 size-4 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-texto">A receber depois</span>
                  <span className="mt-0.5 block text-rotulo text-texto-2">
                    Vira uma conta a receber, com vencimento.
                  </span>
                </span>
              </label>
            </div>

            {!recebidoAgora && (
              <div className="space-y-2">
                <p className="text-rotulo text-texto-2">
                  Não lança nada no Caixa ainda: cria uma pendência em "Contas a Receber", que só
                  vira Entrada quando você marcar como recebido de verdade.
                </p>
                <label className="sakura-rotulo w-56">
                  Previsão de recebimento
                  <input type="date" {...register("previsaoRecebimento")} className="sakura-campo" />
                </label>
              </div>
            )}
          </div>
        )}

        {recebidoAgora && (
          <label className="flex w-fit items-center gap-2.5 text-corpo font-medium text-texto">
            <input
              type="checkbox"
              checked={dividirPagamento}
              onChange={(e) => aoMudarDividirPagamento(e.target.checked)}
              className="size-[18px]"
            />
            Dividir em mais de uma forma de pagamento
          </label>
        )}

        {recebidoAgora && dividirPagamento ? (
          <div className="space-y-3">
            {fields.map((campo, index) => {
              const linha = linhasCalculadas[index];
              const podeParcelarLinha = formaPermiteParcelar(
                linhasPagamento[index]?.formaPagamento ?? "",
              );
              const formaLinhaField = register(`linhasPagamento.${index}.formaPagamento`);
              const numero = index + 1;

              return (
                <div key={campo.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <select
                      {...formaLinhaField}
                      aria-label={`Forma de pagamento ${numero}`}
                      onChange={(e) => {
                        formaLinhaField.onChange(e);
                        // Trocou pra uma forma que não parcela (Pix, dinheiro,
                        // débito): volta pra 1x, senão ficaria um parcelamento
                        // invisível sobrando de uma escolha anterior.
                        if (!formaPermiteParcelar(e.target.value)) {
                          setValue(`linhasPagamento.${index}.parcelas`, "1");
                        }
                      }}
                      className="sakura-campo min-w-0 flex-1"
                    >
                      {FORMAS_PAGAMENTO.map((forma) => (
                        <option key={forma.valor} value={forma.valor}>
                          {forma.label}
                        </option>
                      ))}
                    </select>
                    <select
                      {...register(`linhasPagamento.${index}.parcelas`)}
                      aria-label={`Parcelas da forma ${numero}`}
                      disabled={!podeParcelarLinha}
                      title={
                        podeParcelarLinha
                          ? "Em quantas vezes o cliente passou no cartão"
                          : "Só o cartão de crédito parcela"
                      }
                      className="sakura-campo w-48 shrink-0"
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
                      aria-label={`Valor da forma ${numero}`}
                      {...register(`linhasPagamento.${index}.valor`)}
                      className="sakura-campo w-32 shrink-0 text-right tabular-nums"
                    />
                    {fields.length > 1 && (
                      <Dica texto="Remover esta forma">
                        <Botao
                          variante="fantasma"
                          soIcone
                          icone={<X />}
                          aria-label={`Remover a forma de pagamento ${numero}`}
                          onClick={() => remove(index)}
                        />
                      </Dica>
                    )}
                  </div>
                  {linha && linha.parcelas > 1 && linha.valorBase > 0 && (
                    <p className="text-right text-rotulo text-texto-2">
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
            <Botao
              variante="fantasma"
              icone={<Plus />}
              onClick={() => append({ formaPagamento: "dinheiro", valor: "0", parcelas: "1" })}
            >
              Adicionar forma de pagamento
            </Botao>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <label className="sakura-rotulo">
              Forma de pagamento
              <select
                {...formaPagamentoField}
                onChange={(e) => {
                  formaPagamentoField.onChange(e);
                  if (e.target.value !== "cartao_credito") setValue("parcelas", "1");
                }}
                className="sakura-campo"
              >
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma.valor} value={forma.valor}>
                    {forma.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="sakura-rotulo">
              Parcelas
              <select {...register("parcelas")} disabled={!permiteParcelar} className="sakura-campo">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
                  const percentual = calcularJurosPercentual(jurosParcelas, n);
                  return (
                    <option key={n} value={n}>
                      {n}x
                      {n === 1 ? " à vista" : percentual > 0 ? ` (${percentual}% de juros)` : " sem juros"}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        )}

        {!(recebidoAgora && dividirPagamento) && parcelas > 1 && (
          // Tabela secundária: 12 parcelas no máximo, então ela tem fim e não
          // precisa rolar por dentro ("O que pode crescer", regras, seção 6).
          <div className="overflow-hidden rounded-xl border border-linha">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {listaParcelas.map((p) => (
                  <tr key={p.numero}>
                    <td>{p.numero}x</td>
                    <td>{p.vencimento.toLocaleDateString("pt-BR")}</td>
                    <td className="text-right">{formatarMoeda(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {codigoPix && valorQrPix !== null && <PixQrCode codigo={codigoPix} valor={valorQrPix} />}
      </form>
    </Modal>
  );
}

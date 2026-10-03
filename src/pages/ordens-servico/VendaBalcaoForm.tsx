import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import type { DadosVendaBalcao, PagamentoDaVenda } from "@/lib/ordensServico";
import { avisoPecaSemCusto, avisoSaldoInsuficiente } from "@/schemas/avisosOrdemServico";
import {
  buscarPecasDaVenda,
  comoItensDaOrdem,
  incluirPeca,
  paraItensDaVenda,
  pecaDoEnter,
  totalDaVenda,
  totalDoItem,
  vendaBalcaoFormSchema,
  vendaVazia,
  type VendaBalcaoFormValues,
} from "@/schemas/vendaBalcao";
import { CLIENTE_CONSUMIDOR_ID, ehConsumidor } from "@/types/cliente";
import type { Cliente, NovoCliente } from "@/types/cliente";
import type { JurosParcela } from "@/types/configuracao";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { NovoItemOS } from "@/types/os";
import type { Peca } from "@/types/peca";
import { NovoClienteVendaModal } from "./CadastroRapidoModais";
import { FaturamentoCard } from "./FaturamentoCard";
import { Campo, inputClasse } from "./campos/FormCompartilhado";

/**
 * Venda de balcão (item FN-09 do guia, migration 0064): vender uma peça pra
 * quem não vai deixar o carro, numa tela só — passa o leitor, confere, recebe.
 *
 * Por baixo é uma ordem de serviço marcada como venda, então tudo que vem
 * depois (baixa de estoque, caixa, NFC-e, garantia) é o que já funciona na
 * OS. A tela é que é outra: sem veículo, sem KM, sem "em andamento".
 *
 * Duas etapas na mesma tela: as peças, e depois o pagamento (o mesmo
 * `FaturamentoCard` da OS). Enquanto o pagamento está aberto, as peças ficam
 * travadas — o total do pagamento é calculado quando ele abre, e uma peça a
 * mais depois disso deixaria os dois discordando (a mesma razão da trava de
 * OS faturada, PROJETO_STATUS.md §6 item 31). "Mudar as peças" destrava.
 */

interface VendaBalcaoFormProps {
  clientes: Cliente[];
  pecas: Peca[];
  funcionarios: FuncionarioPublico[];
  funcionarioAtualId: string;
  saldoPorPeca: Map<string, number>;
  saldoCarregado: boolean;
  jurosParcelas: JurosParcela[];
  onRegistrar: (
    venda: DadosVendaBalcao,
    itens: NovoItemOS[],
    pagamento: PagamentoDaVenda,
  ) => Promise<void>;
  /** Cadastra o cliente e devolve o id dele, já pra ficar escolhido. */
  onCadastrarCliente: (cliente: NovoCliente) => Promise<string>;
  onCancelar: () => void;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ROTULO_CONSUMIDOR = "Consumidor (não se identificou)";

export function VendaBalcaoForm({
  clientes,
  pecas,
  funcionarios,
  funcionarioAtualId,
  saldoPorPeca,
  saldoCarregado,
  jurosParcelas,
  onRegistrar,
  onCadastrarCliente,
  onCancelar,
}: VendaBalcaoFormProps) {
  const pecasAtivas = useMemo(() => pecas.filter((peca) => peca.ativo), [pecas]);
  const [busca, setBusca] = useState("");
  const [avisoBusca, setAvisoBusca] = useState<string | null>(null);
  const [itensDoPagamento, setItensDoPagamento] = useState<NovoItemOS[] | null>(null);
  const [cadastrandoCliente, setCadastrandoCliente] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);
  const pagamentoRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<VendaBalcaoFormValues>({
    resolver: zodResolver(vendaBalcaoFormSchema),
    defaultValues: vendaVazia(funcionarioAtualId),
  });
  const { fields, remove, replace } = useFieldArray({ control, name: "itens" });

  const clienteId = watch("cliente_id");
  const vendedorId = watch("vendedor_id");
  const itens = watch("itens");
  const total = totalDaVenda(itens);
  const noPagamento = itensDoPagamento !== null;
  const sugestoes = buscarPecasDaVenda(pecasAtivas, busca);
  const clienteEscolhido = clientes.find((c) => c.id === clienteId);
  const nomeDoCliente = ehConsumidor(clienteId) ? "Consumidor" : (clienteEscolhido?.nome ?? "");
  const erroDosItens = errors.itens?.message ?? errors.itens?.root?.message;

  useEffect(() => {
    buscaRef.current?.focus();
  }, []);

  useEffect(() => {
    // `?.` de propósito: o ambiente de teste (jsdom) não tem scrollIntoView.
    if (noPagamento) pagamentoRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [noPagamento]);

  function adicionar(peca: Peca) {
    replace(incluirPeca(watch("itens"), peca));
    setBusca("");
    setAvisoBusca(null);
    buscaRef.current?.focus();
  }

  // O leitor de código de barras se comporta como um teclado que digita o
  // código e aperta Enter. Aqui o Enter põe a peça na venda — e por isso ele
  // PARA de subir: senão o atalho global do app (Enter pula pro próximo
  // campo, `useEnterParaProximoCampo`) tiraria o foco da busca a cada peça, e
  // passar a segunda peça no leitor cairia no campo errado.
  function aoTeclarNaBusca(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      setBusca("");
      setAvisoBusca(null);
      return;
    }
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    evento.stopPropagation();
    if (busca.trim() === "") return;

    const peca = pecaDoEnter(pecasAtivas, busca);
    if (peca) {
      adicionar(peca);
      return;
    }
    setAvisoBusca(
      sugestoes.length === 0
        ? `Nenhuma peça com "${busca.trim()}". Confira o código ou procure pelo nome.`
        : "Mais de uma peça parecida — escolha na lista.",
    );
  }

  function irParaPagamento(valores: VendaBalcaoFormValues) {
    setItensDoPagamento(paraItensDaVenda(valores.itens));
  }

  async function cadastrarCliente(cliente: NovoCliente) {
    const id = await onCadastrarCliente(cliente);
    setValue("cliente_id", id, { shouldValidate: true });
    setCadastrandoCliente(false);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(irParaPagamento)}
        className="space-y-6 sakura-card p-6 shadow-sm"
        aria-label="Venda de balcão"
      >
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onCancelar} />
          <div>
            <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
              Venda de balcão
            </h2>
            <p className="text-rotulo text-sakura-muted">
              Peça pra quem não vai deixar o carro. Baixa o estoque, lança no caixa e emite a
              NFC-e.
            </p>
          </div>
        </div>

        <fieldset disabled={noPagamento} className="space-y-6 disabled:opacity-70">
          <section className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Campo label="Cliente" erro={errors.cliente_id?.message}>
                <Combobox
                  opcoes={[
                    { valor: CLIENTE_CONSUMIDOR_ID, rotulo: ROTULO_CONSUMIDOR },
                    ...clientes.map((cliente) => ({ valor: cliente.id, rotulo: cliente.nome })),
                  ]}
                  valor={clienteId}
                  onMudar={(valor) =>
                    setValue("cliente_id", valor || CLIENTE_CONSUMIDOR_ID, { shouldValidate: true })
                  }
                  placeholder="Consumidor ou um cliente"
                  desabilitado={noPagamento}
                  acaoExtra={{
                    rotulo: "+ Cadastrar cliente (CPF na nota)",
                    onAcionar: () => setCadastrandoCliente(true),
                  }}
                />
              </Campo>
              <p className="text-rotulo text-sakura-muted">
                {ehConsumidor(clienteId)
                  ? "A nota sai sem identificação. Se pedir CPF na nota, escolha ou cadastre o cliente."
                  : clienteEscolhido?.cpf_cnpj
                    ? `A nota sai no ${clienteEscolhido.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"} dele.`
                    : "Este cliente está sem CPF/CNPJ no cadastro — a nota sai sem identificação."}
              </p>
            </div>

            <Campo label="Vendedor">
              <Combobox
                opcoes={funcionarios.map((funcionario) => ({
                  valor: funcionario.id,
                  rotulo: funcionario.nome,
                }))}
                valor={vendedorId}
                onMudar={(valor) => setValue("vendedor_id", valor)}
                opcaoVazia="Sem vendedor"
                placeholder="Selecione o vendedor"
                desabilitado={noPagamento}
              />
            </Campo>
          </section>

          <section className="space-y-2">
            <label className="flex flex-col gap-1 text-corpo">
              <span className="text-sakura-purple-dark/80">
                Passe o leitor ou procure a peça
              </span>
              <input
                ref={buscaRef}
                type="text"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setAvisoBusca(null);
                }}
                onKeyDown={aoTeclarNaBusca}
                placeholder="Código de barras, referência, nome ou medida"
                className={`${inputClasse} w-full`}
                autoComplete="off"
              />
            </label>
            {avisoBusca && <p className="text-rotulo text-amber-300">{avisoBusca}</p>}

            {sugestoes.length > 0 && (
              <ul className="divide-y divide-sakura-gray/20 overflow-hidden rounded-xl border border-sakura-gray/25">
                {sugestoes.map((peca) => {
                  const saldo = saldoPorPeca.get(peca.id) ?? 0;
                  return (
                    <li key={peca.id}>
                      <button
                        type="button"
                        onClick={() => adicionar(peca)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-corpo hover:bg-sakura-pink-soft/40"
                      >
                        <span className="text-sakura-purple-dark">
                          {peca.descricao}
                          {peca.codigo_interno && (
                            <span className="text-sakura-muted"> · {peca.codigo_interno}</span>
                          )}
                        </span>
                        <span className="whitespace-nowrap text-rotulo text-sakura-muted">
                          {saldoCarregado ? `saldo ${saldo.toLocaleString("pt-BR")} · ` : ""}
                          {peca.preco_venda != null ? formatarMoeda(peca.preco_venda) : "sem preço"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            {fields.length === 0 ? (
              <p className="rounded-xl border border-dashed border-sakura-gray/30 px-4 py-6 text-center text-corpo text-sakura-muted">
                Nenhuma peça ainda.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-sakura-gray/25">
                <table className="w-full text-left text-corpo">
                  <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                    <tr>
                      <th className="px-3 py-2 font-medium">Peça</th>
                      <th className="w-24 px-3 py-2 font-medium">Qtd.</th>
                      <th className="w-32 px-3 py-2 font-medium">Preço un.</th>
                      <th className="w-28 px-3 py-2 font-medium">Desconto</th>
                      <th className="w-32 px-3 py-2 text-right font-medium">Total</th>
                      <th className="w-12 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((campo, indice) => {
                      const item = itens[indice];
                      const peca = pecasAtivas.find((p) => p.id === item?.peca_id);
                      const avisos = [
                        saldoCarregado && item
                          ? avisoSaldoInsuficiente(item.quantidade, saldoPorPeca.get(item.peca_id))
                          : null,
                        avisoPecaSemCusto(peca),
                      ].filter((aviso): aviso is string => aviso !== null);
                      const erroItem =
                        errors.itens?.[indice]?.quantidade?.message ??
                        errors.itens?.[indice]?.desconto?.message;
                      return (
                        <tr key={campo.id} className="border-t border-sakura-gray/20 align-top">
                          <td className="px-3 py-2">
                            <p className="text-sakura-purple-dark">{item?.descricao}</p>
                            {avisos.map((aviso) => (
                              <p key={aviso} className="text-rotulo text-amber-300">
                                {aviso}
                              </p>
                            ))}
                            {erroItem && <p className="text-rotulo text-red-300">{erroItem}</p>}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              aria-label={`Quantidade de ${item?.descricao ?? "peça"}`}
                              {...register(`itens.${indice}.quantidade`)}
                              className={`${inputClasse} w-full`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              aria-label={`Preço de ${item?.descricao ?? "peça"}`}
                              {...register(`itens.${indice}.preco_unitario`)}
                              className={`${inputClasse} w-full`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              aria-label={`Desconto de ${item?.descricao ?? "peça"}`}
                              {...register(`itens.${indice}.desconto`)}
                              className={`${inputClasse} w-full`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-sakura-purple-dark">
                            {item ? formatarMoeda(totalDoItem(item)) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => remove(indice)}
                              aria-label={`Tirar ${item?.descricao ?? "peça"} da venda`}
                              title="Tirar da venda"
                              className="h-8 w-8 rounded-lg text-corpo text-red-300 hover:bg-red-500/10"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {erroDosItens && <p className="text-rotulo text-red-300">{erroDosItens}</p>}
          </section>
        </fieldset>

        {/* Mesma barra grudada no rodapé da OS (e pelo mesmo motivo: com a
            venda cheia, o total não pode sair de vista). `sticky`, nunca
            `fixed` — ver o comentário em OrdemServicoForm. */}
        <div className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sakura-gray/25 bg-[#160f16] px-4 py-3">
          <span className="text-subtitulo font-semibold text-sakura-purple-dark">
            Total {formatarMoeda(total)}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
            >
              Cancelar
            </button>
            {noPagamento ? (
              <button
                type="button"
                onClick={() => setItensDoPagamento(null)}
                className="rounded-xl border border-sakura-purple px-5 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-pink-soft/40"
              >
                Mudar as peças
              </button>
            ) : (
              <button
                type="submit"
                className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90"
              >
                Ir para o pagamento
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Fora do <form> das peças: o pagamento é outro <form>, e um dentro
          do outro é HTML inválido. */}
      {itensDoPagamento && (
        <div ref={pagamentoRef}>
          <FaturamentoCard
            ordem={{
              numero: 0,
              tipo: "venda_balcao",
              cliente_id: clienteId,
              cliente: { nome: nomeDoCliente },
              itens: comoItensDaOrdem(itensDoPagamento),
            }}
            titulo={`Pagamento da venda — ${nomeDoCliente}`}
            rotuloConfirmar="Confirmar venda"
            jurosParcelas={jurosParcelas}
            onConfirmar={(pagamentos, parcelas, previsaoRecebimento) =>
              onRegistrar(
                { cliente_id: clienteId, vendedor_id: vendedorId || null },
                itensDoPagamento,
                { pagamentos, parcelas, previsaoRecebimento },
              )
            }
            onCancelar={() => setItensDoPagamento(null)}
          />
        </div>
      )}

      {cadastrandoCliente && (
        <NovoClienteVendaModal
          onFechar={() => setCadastrandoCliente(false)}
          onCadastrar={cadastrarCliente}
        />
      )}
    </>
  );
}

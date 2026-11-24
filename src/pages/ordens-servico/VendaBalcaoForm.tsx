import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { Dica } from "@/components/Dica";
import type { DadosVendaBalcao, PagamentoDaVenda } from "@/lib/ordensServico";
import { avisoPecaSemCusto, avisoSaldoInsuficiente } from "@/schemas/avisosOrdemServico";
import type { ResultadoDaBusca } from "@/schemas/buscaDeItens";
import {
  comoItensDaOrdem,
  incluirPeca,
  lucroPrevistoDaVenda,
  paraItensDaVenda,
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
import type { PecaJanela } from "@/types/peca";
import { Botao } from "@/components/Botao";
import { NovoClienteVendaModal } from "./CadastroRapidoModais";
import { FaturamentoCard } from "./FaturamentoCard";
import { BuscaDeItens } from "./campos/BuscaDeItens";
import { Campo } from "./campos/FormCompartilhado";
import {
  AvisoDaLinha,
  CLASSE_CAMPO_DA_LINHA,
  LinhaDeItem,
  TabelaDeItens,
} from "./campos/TabelaDeItens";
import { ApoioDoTotal, TotalGrande } from "./campos/TotalELucro";
import { useCustosDoLucro } from "./useCustosDoLucro";

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
  /**
   * Se quem usa tem o módulo Clientes. Sem ele, a lista vem pela janela
   * estreita (migration 0068), só com o nome — o CPF não chega aqui, mas a
   * nota o busca na hora de emitir. Padrão `true` (o comportamento de antes).
   */
  podeVerCadastro?: boolean;
  pecas: PecaJanela[];
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

const ROTULO_CONSUMIDOR = "Consumidor (não se identificou)";

export function VendaBalcaoForm({
  clientes,
  podeVerCadastro = true,
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
  const [itensDoPagamento, setItensDoPagamento] = useState<NovoItemOS[] | null>(null);
  const [cadastrandoCliente, setCadastrandoCliente] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

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
  // O lucro previsto do rodapé (#1087): o mesmo hook da OS, sem OS aberta.
  const { custoPeca } = useCustosDoLucro();
  const lucro = lucroPrevistoDaVenda(itens, custoPeca);
  const clienteEscolhido = clientes.find((c) => c.id === clienteId);
  const nomeDoCliente = ehConsumidor(clienteId) ? "Consumidor" : (clienteEscolhido?.nome ?? "");
  const erroDosItens = errors.itens?.message ?? errors.itens?.root?.message;

  useEffect(() => {
    buscaRef.current?.focus();
  }, []);

  // A busca única entrega o resultado já escolhido (clique, Enter ou o
  // leitor de código de barras: o Enter dela PARA de subir, pelo motivo
  // explicado em `BuscaDeItens`). Aqui só vira linha da venda: repetida soma 1.
  function adicionar(escolha: ResultadoDaBusca) {
    const peca = pecasAtivas.find((p) => p.id === escolha.id);
    if (!peca) return;
    replace(incluirPeca(watch("itens"), peca));
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
            <h2 className="text-subtitulo font-semibold text-texto">
              Venda de balcão
            </h2>
            <p className="text-rotulo text-texto-2">
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
                  tamanho="filtro"
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
              <p className="text-rotulo text-texto-2">
                {ehConsumidor(clienteId)
                  ? "A nota sai sem identificação. Se pedir CPF na nota, escolha ou cadastre o cliente."
                  : !podeVerCadastro
                    ? "A nota sai no CPF/CNPJ do cadastro dele, se tiver."
                    : clienteEscolhido?.cpf_cnpj
                      ? `A nota sai no ${clienteEscolhido.tipo_pessoa === "juridica" ? "CNPJ" : "CPF"} dele.`
                      : "Este cliente está sem CPF/CNPJ no cadastro — a nota sai sem identificação."}
              </p>
            </div>

            <Campo label="Vendedor">
              <Combobox
                tamanho="filtro"
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

          <section className="space-y-4">
            <BuscaDeItens
              pecas={pecasAtivas}
              saldoPorPeca={saldoPorPeca}
              saldoCarregado={saldoCarregado}
              desabilitado={noPagamento}
              onEscolher={adicionar}
              inputRef={buscaRef}
            />

            <TabelaDeItens
              comTecnico={false}
              vazio={fields.length === 0}
              textoVazio="Nenhuma peça ainda: passe o leitor ou procure a peça acima."
            >
              {fields.map((campo, indice) => {
                const item = itens[indice];
                const peca = pecasAtivas.find((p) => p.id === item?.peca_id);
                const nome = item?.descricao ?? "peça";
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
                  <LinhaDeItem
                    key={campo.id}
                    comTecnico={false}
                    tipo="peca"
                    descricaoParaLeitor={nome}
                    descricao={item?.descricao}
                    avisos={
                      <>
                        {avisos.map((aviso) => (
                          <AvisoDaLinha key={aviso}>{aviso}</AvisoDaLinha>
                        ))}
                        {erroItem && <p className="text-rotulo text-perigo">{erroItem}</p>}
                      </>
                    }
                    quantidade={
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={`Quantidade de ${nome}`}
                        {...register(`itens.${indice}.quantidade`)}
                        className={CLASSE_CAMPO_DA_LINHA}
                      />
                    }
                    preco={
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={`Preço de ${nome}`}
                        {...register(`itens.${indice}.preco_unitario`)}
                        className={CLASSE_CAMPO_DA_LINHA}
                      />
                    }
                    desconto={
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={`Desconto de ${nome}`}
                        {...register(`itens.${indice}.desconto`)}
                        className={CLASSE_CAMPO_DA_LINHA}
                      />
                    }
                    total={item ? totalDoItem(item) : null}
                    acao={
                      <Dica texto="Tirar da venda">
                        <Botao
                          soIcone
                          variante="fantasma"
                          icone={<Trash2 />}
                          aria-label={`Tirar ${nome} da venda`}
                          onClick={() => remove(indice)}
                        />
                      </Dica>
                    }
                  />
                );
              })}
            </TabelaDeItens>
            {erroDosItens && <p className="text-rotulo text-perigo">{erroDosItens}</p>}
          </section>
        </fieldset>

        {/* Mesma barra grudada no rodapé da OS (e pelo mesmo motivo: com a
            venda cheia, o total não pode sair de vista). `sticky`, nunca
            `fixed` — ver o comentário em OrdemServicoForm. */}
        <div className="sticky bottom-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linha bg-janela px-4 py-3">
          <ApoioDoTotal pecas={total} lucro={lucro} />
          {/* Com o pagamento aberto (na janela, por cima), estes botões ficam
              atrás dela, sem clique (a janela trava o fundo). Continuam na
              tela de propósito: ao fechar a janela, o foco volta pro "Ir para
              o pagamento" que a abriu. "Mudar as peças" é o botão de desistir
              da própria janela. */}
          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
            <TotalGrande rotulo="Total" valor={total} />
            <div className="flex gap-3">
              <Botao variante="fantasma" tamanho="grande" onClick={onCancelar}>
                Cancelar
              </Botao>
              <Botao variante="principal" tamanho="grande" type="submit">
                Ir para o pagamento
              </Botao>
            </div>
          </div>
        </div>
      </form>

      {/* Fora do <form> das peças: o pagamento é outro <form>, e um dentro
          do outro é HTML inválido. Abre numa janela (visual novo, tarefa 7):
          as peças ficam travadas atrás dela, e "Mudar as peças" volta pra
          elas. */}
      {itensDoPagamento && (
        <FaturamentoCard
          ordem={{
            numero: 0,
            tipo: "venda_balcao",
            cliente_id: clienteId,
            cliente: { nome: nomeDoCliente },
            itens: comoItensDaOrdem(itensDoPagamento),
          }}
          titulo="Pagamento da venda"
          descricao={nomeDoCliente}
          rotuloConfirmar="Confirmar venda"
          rotuloCancelar="Mudar as peças"
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

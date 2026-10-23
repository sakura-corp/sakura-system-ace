import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import type { OrdemParaKmDoVeiculo } from "@/lib/ordensServico";
import { useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { mensagemDeErro } from "@/lib/errors";
import {
  MOTIVOS_RECUSA,
  MOTIVO_RECUSA_LABEL,
  orcamentoVencido,
  pecasAvulsas,
  podeAprovar,
  podeRecusar,
  validadePadrao,
  type MotivoRecusa,
} from "@/schemas/orcamento";
import {
  ordemServicoFormSchema,
  paraCamposComuns,
  paraItensValidos,
  problemaDoItem,
  paraValoresFormulario,
  totaisDaOrdem,
  type OrdemServicoFormValues,
} from "@/schemas/ordemServico";
import type { Cliente, NovoCliente, VeiculoFormulario } from "@/types/cliente";
import type { FuncionarioPublico } from "@/types/funcionario";
import type {
  ItemOS,
  NovaOrdemServico,
  NovoItemOS,
  OrdemServico,
  PatchItemOS,
  PatchOrdemServico,
} from "@/types/os";
import { STATUS_COM_FECHAMENTO, STATUS_LABEL, nomeDocumento } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { NovoClienteRapidoModal, NovoVeiculoRapidoModal } from "./CadastroRapidoModais";
import { DetalhesFields } from "./campos/DetalhesFields";
import { ItensFields } from "./campos/ItensFields";
import { Campo, inputClasse } from "./campos/FormCompartilhado";
import { FechamentoTab } from "./FechamentoTab";
import { PecasAvulsasAprovacaoModal } from "./PecasAvulsasAprovacaoModal";

interface OrdemServicoFormProps {
  clientes: Cliente[];
  pecas: Peca[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  funcionarioAtualId: string;
  /** OS já existentes da loja — usadas só pra saber o KM da última passagem do carro. */
  ordens: OrdemParaKmDoVeiculo[];
  /**
   * Alternativa a `ordens` pra quem não tem a loja inteira na mão (Orçamentos):
   * busca só as passagens do veículo quando ele é escolhido.
   */
  buscarOrdensDoVeiculo?: (veiculoId: string) => Promise<OrdemParaKmDoVeiculo[]>;
  /** Saldo em estoque por peça, pro aviso de estoque ao lançar um item. */
  saldoPorPeca: Map<string, number>;
  saldoCarregado: boolean;
  ordemExistente?: OrdemServico;
  /** Se a OS já tem nota fiscal válida (não cancelada) ligada a ela. */
  temNotaEmitida?: boolean;
  abaInicial?: "detalhes" | "fechamento";
  /** `validade` só vem em modo orçamento. */
  onSalvarNova: (ordem: NovaOrdemServico, itens: NovoItemOS[], validade?: string) => Promise<void>;
  onSalvarEdicao: (
    id: string,
    patch: PatchOrdemServico,
    novosItens: NovoItemOS[],
  ) => Promise<void>;
  onEditarItem: (item: ItemOS, patch: PatchItemOS) => Promise<void>;
  onEncerrar: (ordem: OrdemServico) => Promise<void>;
  /**
   * Cadastro rápido feito de dentro da OS. As duas devolvem o id do registro
   * criado pra que o formulário já deixe ele escolhido — sair da OS pra
   * cadastrar e voltar do zero é exatamente o que o item TL-08 veio matar.
   */
  onCadastrarCliente: (
    cliente: NovoCliente,
    veiculos: VeiculoFormulario[],
  ) => Promise<{ clienteId: string; veiculoId: string | null }>;
  onCadastrarVeiculo: (clienteId: string, veiculo: VeiculoFormulario) => Promise<string>;
  onCancelar: () => void;
  /**
   * Modo orçamento (#379): o mesmo formulário da OS, com Validade, sem
   * "Encerrar OS" e com Aprovar/Recusar. Orçamento não baixa estoque nem
   * entra em conta nenhuma, então não há saldo a avisar.
   */
  modoOrcamento?: boolean;
  /**
   * `vinculos` (#655): as peças avulsas que ganharam cadastro na janela da
   * aprovação. Só vai quando o orçamento tinha peça avulsa.
   */
  onAprovar?: (
    orcamento: OrdemServico,
    aprovadoPor: string,
    vinculos?: { itemId: string; pecaId: string }[],
  ) => Promise<void>;
  onRecusar?: (orcamento: OrdemServico, motivo: MotivoRecusa | null) => Promise<void>;
  /** Botões a mais no cabeçalho do orçamento aberto (WhatsApp). */
  acoesExtras?: ReactNode;
  /** A aba Fechamento cadastrou uma peça avulsa (#655): recarregar a OS aberta. */
  onItensMudaram?: () => void | Promise<void>;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

/** A primeira caixa em volta do elemento que rola de verdade (no app é a área
 *  do conteúdo, não a janela); sem nenhuma, a própria página. */
function areaRolavelEmVolta(elemento: HTMLElement): Element {
  for (let pai = elemento.parentElement; pai; pai = pai.parentElement) {
    const { overflowY } = getComputedStyle(pai);
    if ((overflowY === "auto" || overflowY === "scroll") && pai.scrollHeight > pai.clientHeight) {
      return pai;
    }
  }
  return document.scrollingElement ?? document.documentElement;
}

export function OrdemServicoForm({
  clientes,
  pecas,
  servicos,
  funcionarios,
  funcionarioAtualId,
  ordens,
  buscarOrdensDoVeiculo,
  saldoPorPeca,
  saldoCarregado,
  ordemExistente,
  temNotaEmitida = false,
  abaInicial = "detalhes",
  onSalvarNova,
  onSalvarEdicao,
  onEditarItem,
  onEncerrar,
  onCadastrarCliente,
  onCadastrarVeiculo,
  onCancelar,
  modoOrcamento = false,
  onAprovar,
  onRecusar,
  acoesExtras,
  onItensMudaram,
}: OrdemServicoFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const [janelaAvulsas, setJanelaAvulsas] = useState(false);
  const [aprovadoPor, setAprovadoPor] = useState("");
  const [motivoRecusa, setMotivoRecusa] = useState<MotivoRecusa | "">("");
  const [enviando, setEnviando] = useState(false);
  const [cadastroRapido, setCadastroRapido] = useState<"cliente" | "veiculo" | null>(null);
  const temFechamento =
    !!ordemExistente && STATUS_COM_FECHAMENTO.includes(ordemExistente.status);
  const [aba, setAba] = useState<"detalhes" | "fechamento">(
    temFechamento ? abaInicial : "detalhes",
  );

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: {
      ...paraValoresFormulario(ordemExistente, funcionarioAtualId),
      ...(modoOrcamento && !ordemExistente?.validade ? { validade: validadePadrao() } : {}),
    },
  });

  const rascunho = useRascunho(
    `rascunho-${modoOrcamento ? "orcamento" : "os"}-${ordemExistente?.id ?? "nova"}`,
    watch,
    reset,
  );

  const itensExistentes = ordemExistente?.itens ?? [];

  // Passagens do veículo escolhido, só quando o pai não passou a lista pronta.
  const veiculoEscolhido = watch("veiculo_id");
  const [ordensDoVeiculo, setOrdensDoVeiculo] = useState<OrdemParaKmDoVeiculo[]>([]);
  useEffect(() => {
    if (!buscarOrdensDoVeiculo || !veiculoEscolhido) {
      setOrdensDoVeiculo([]);
      return;
    }
    let cancelado = false;
    buscarOrdensDoVeiculo(veiculoEscolhido)
      .then((lista) => {
        if (!cancelado) setOrdensDoVeiculo(lista);
      })
      // Aviso de KM é só conveniência: se não carregar, o formulário segue sem ele.
      .catch((err) => console.error("Erro ao buscar as passagens do veículo:", err));
    return () => {
      cancelado = true;
    };
  }, [buscarOrdensDoVeiculo, veiculoEscolhido]);

  // Depois de faturada, o pagamento já entrou no Caixa com o total daquele
  // momento — mexer nos itens deixaria os dois discordando (ver
  // PROJETO_STATUS.md, seção 6, item 31). Corrigir um item já lançado tem
  // ainda uma trava a mais: se a nota fiscal já saiu, o que está na nota
  // deixaria de bater com a OS, e isso não se conserta sozinho.
  const ehRecusado = ordemExistente?.status === "recusado";
  const ehFaturada = ordemExistente?.status === "faturada";
  const podeAdicionarItem = !ehFaturada && !ehRecusado;
  const podeEditarItem = !!ordemExistente && !ehFaturada && !ehRecusado && !temNotaEmitida;
  const vencido = modoOrcamento && orcamentoVencido(ordemExistente?.validade);
  const avisoItens = ehRecusado
    ? "Orçamento recusado: fica só como histórico, não dá pra mexer nos itens."
    : ehFaturada
      ? "Esta OS já foi faturada — o pagamento já foi lançado no Caixa com o total de então, " +
      "então não dá pra acrescentar nem corrigir item. Pra qualquer mudança, abra uma OS nova."
    : temNotaEmitida
      ? "Esta OS já tem nota fiscal emitida — corrigir um item aqui deixaria a nota diferente " +
        "da OS. Cancele a nota em Notas Fiscais antes de mexer."
      : null;

  async function aoSubmeter(valores: OrdemServicoFormValues) {
    setErro(null);
    const camposComuns = paraCamposComuns(valores);
    const itensValidos = paraItensValidos(valores.itens);
    // Antes de gravar, e não depois: o banco recusaria o item (travas da
    // migration 0060), mas aí a OS nova já teria sido criada sem ele.
    const itemRuim = itensValidos.find((item) => problemaDoItem(item));
    if (itemRuim) {
      setErro(`Item "${itemRuim.descricao}": ${problemaDoItem(itemRuim)}`);
      return;
    }
    try {
      if (modoOrcamento && !valores.validade) {
        setErro("Informe até quando o orçamento vale.");
        return;
      }
      if (ordemExistente) {
        await onSalvarEdicao(
          ordemExistente.id,
          modoOrcamento ? { ...camposComuns, validade: valores.validade } : camposComuns,
          itensValidos,
        );
      } else if (modoOrcamento) {
        await onSalvarNova(camposComuns, itensValidos, valores.validade);
      } else {
        await onSalvarNova(camposComuns, itensValidos);
      }
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao salvar ordem de serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function handleEncerrar() {
    if (!ordemExistente) return;
    setErro(null);
    setEncerrando(true);
    try {
      await onEncerrar(ordemExistente);
    } catch (err) {
      console.error("Erro ao encerrar ordem de serviço:", err);
      setErro(mensagemDeErro(err));
      setEncerrando(false);
    }
  }

  // Orçamento com peça sem cadastro (#655) passa antes pela janela, que diz o
  // que fazer com cada uma; sem peça avulsa, aprova direto, como sempre.
  const avulsasDoOrcamento = pecasAvulsas(itensExistentes);

  function aoConfirmarAprovacao() {
    if (avulsasDoOrcamento.length > 0) {
      if (!aprovadoPor.trim()) {
        setErro("Diga quem aprovou (ex.: pelo telefone) antes de confirmar.");
        return;
      }
      setErro(null);
      setJanelaAvulsas(true);
      return;
    }
    handleAprovar();
  }

  async function handleAprovar(vinculos?: { itemId: string; pecaId: string }[]) {
    if (!ordemExistente || !onAprovar) return;
    if (!aprovadoPor.trim()) {
      setErro("Diga quem aprovou (ex.: pelo telefone) antes de confirmar.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      if (vinculos) await onAprovar(ordemExistente, aprovadoPor.trim(), vinculos);
      else await onAprovar(ordemExistente, aprovadoPor.trim());
      // Depois de aprovado a tela passa a usar o rascunho de OS: o do orçamento
      // não volta mais, então não pode ficar guardado.
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao aprovar orçamento:", err);
      setErro(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  async function handleRecusar() {
    if (!ordemExistente || !onRecusar) return;
    setErro(null);
    setEnviando(true);
    try {
      await onRecusar(ordemExistente, motivoRecusa || null);
    } catch (err) {
      console.error("Erro ao recusar orçamento:", err);
      setErro(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  // Cadastrar de dentro da OS só vale a pena se o registro novo já entrar
  // escolhido — senão o operador ainda teria que procurá-lo na lista.
  async function cadastrarClienteRapido(
    cliente: NovoCliente,
    veiculos: VeiculoFormulario[],
  ) {
    const { clienteId, veiculoId } = await onCadastrarCliente(cliente, veiculos);
    setValue("cliente_id", clienteId, { shouldValidate: true });
    setValue("veiculo_id", veiculoId ?? "");
    setCadastroRapido(null);
  }

  async function cadastrarVeiculoRapido(veiculo: VeiculoFormulario) {
    const veiculoId = await onCadastrarVeiculo(watch("cliente_id"), veiculo);
    setValue("veiculo_id", veiculoId);
    setCadastroRapido(null);
  }

  // A barra fixa do rodapé gruda no pé da janela, e o que estiver ali fica
  // atrás dela (#781). Não dá pra evitar na primeira tela sem soltar a barra
  // (e aí o total some com a OS cheia), mas o campo em que se está digitando
  // nunca pode ficar escondido: se ele está atrás da barra, a área rolável em
  // volta sobe o que falta pra ele ficar acima dela. O item novo entra por
  // aqui também: o `append` do react-hook-form põe o cursor no primeiro campo
  // dele. (O `scrollIntoView` não serve: ele mede até o fim da área rolável,
  // que acaba uns pixels abaixo da barra, e o campo ficava meio coberto.)
  const barraRef = useRef<HTMLDivElement>(null);
  function manterAcimaDaBarra(alvo: Element | null) {
    const barra = barraRef.current;
    // Só campo de digitar: botão (e o <select>) recebe o foco já no "apertar"
    // do mouse, e rolar ali fazia o "soltar" cair em outro lugar, perdendo o
    // clique. O Combobox é um <input>, então entra.
    const ehCampoDeDigitar = alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement;
    if (aba !== "detalhes" || !barra || !ehCampoDeDigitar || barra.contains(alvo)) return;
    const falta = alvo.getBoundingClientRect().bottom - barra.getBoundingClientRect().top + 12;
    if (falta <= 12) return;
    areaRolavelEmVolta(alvo).scrollBy?.({ top: falta });
  }

  const totais = totaisDaOrdem(itensExistentes, watch("itens"));
  const nomeDoClienteEscolhido =
    clientes.find((c) => c.id === watch("cliente_id"))?.nome ?? "este cliente";

  return (
    <>
    <form
      onSubmit={handleSubmit(aoSubmeter)}
      onFocus={(e: FocusEvent<HTMLFormElement>) => manterAcimaDaBarra(e.target)}
      className="space-y-6 sakura-card p-6 shadow-sm"
    >
      {ordemExistente ? (
        <div className="flex items-center justify-between border-b border-sakura-gray/20 pb-4">
          <div className="flex items-center gap-3">
            <BotaoVoltar onClick={onCancelar} />
            <div>
              <p className="text-rotulo text-sakura-muted">
                {nomeDocumento(ordemExistente)} · aberta em{" "}
                {formatarData(ordemExistente.data_abertura)} · criado por{" "}
                {ordemExistente.criado_por?.nome ?? "—"}
              </p>
              <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
                {ordemExistente.cliente?.nome ?? "Cliente"}
                {ordemExistente.veiculo?.placa ? ` — ${ordemExistente.veiculo.placa}` : ""}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-sakura-pink-soft px-3 py-1 text-rotulo font-medium text-sakura-purple-dark">
              {STATUS_LABEL[ordemExistente.status]}
            </span>
            {vencido && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-rotulo font-medium text-slate-700">
                vencido
              </span>
            )}
            {modoOrcamento && acoesExtras}
            {ordemExistente.status === "em_andamento" && (
              <button
                type="button"
                onClick={handleEncerrar}
                disabled={encerrando}
                className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {encerrando ? "Encerrando..." : "Encerrar OS"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onCancelar} />
          <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
            {modoOrcamento ? "Novo orçamento" : "Nova ordem de serviço"}
          </h2>
        </div>
      )}

      {erro && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>
      )}

      {ehRecusado && ordemExistente && (
        <p className="rounded-lg bg-slate-100 px-4 py-2 text-corpo text-slate-700">
          Orçamento recusado
          {ordemExistente.motivo_recusa
            ? ` — motivo: ${MOTIVO_RECUSA_LABEL[ordemExistente.motivo_recusa]}`
            : " — sem motivo informado"}
          .
        </p>
      )}

      {modoOrcamento && ordemExistente && podeAprovar(ordemExistente) && (
        <div className="space-y-3 rounded-xl border border-sakura-gray/25 px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={() => setAprovando((aberto) => !aberto)}
              disabled={enviando}
              className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Aprovar
            </button>
            {podeRecusar(ordemExistente) && (
              <>
                <label className="flex flex-col gap-1 text-rotulo text-sakura-purple-dark/80">
                  Motivo da recusa (opcional)
                  <select
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value as MotivoRecusa | "")}
                    className={inputClasse}
                  >
                    <option value="">Sem motivo</option>
                    {MOTIVOS_RECUSA.map((motivo) => (
                      <option key={motivo} value={motivo}>
                        {MOTIVO_RECUSA_LABEL[motivo]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleRecusar}
                  disabled={enviando}
                  className="rounded-xl border border-sakura-purple px-4 py-2 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-pink-soft/40 disabled:opacity-50"
                >
                  Recusar
                </button>
              </>
            )}
          </div>
          {aprovando && (
            <div className="space-y-2">
              {vencido && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-corpo text-amber-800">
                  Este orçamento passou da validade: o preço pode ter mudado. Confira os valores
                  antes de aprovar. Dá pra aprovar mesmo assim.
                </p>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-corpo">
                  Quem aprovou?
                  <input
                    type="text"
                    value={aprovadoPor}
                    onChange={(e) => setAprovadoPor(e.target.value)}
                    placeholder="Ex.: o cliente, pelo telefone"
                    className={`${inputClasse} w-72`}
                  />
                </label>
                <button
                  type="button"
                  onClick={aoConfirmarAprovacao}
                  disabled={enviando || isDirty}
                  className="rounded-xl bg-sakura-purple px-4 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Confirmar aprovação
                </button>
              </div>
              <p className="text-rotulo text-sakura-muted">
                Ao aprovar, vira uma OS em andamento e as peças saem do estoque.
              </p>
              {isDirty && (
                <p className="text-rotulo text-amber-300">
                  Salve as alterações antes de aprovar
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao="desta ordem de serviço"
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      {temFechamento && (
        <div className="flex gap-2 border-b border-sakura-gray/20">
          <button
            type="button"
            onClick={() => setAba("detalhes")}
            className={`px-4 py-2 text-corpo font-medium ${
              aba === "detalhes"
                ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
                : "text-sakura-purple-dark/75 hover:text-sakura-purple-dark"
            }`}
          >
            Detalhes
          </button>
          <button
            type="button"
            onClick={() => setAba("fechamento")}
            className={`px-4 py-2 text-corpo font-medium ${
              aba === "fechamento"
                ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
                : "text-sakura-purple-dark/75 hover:text-sakura-purple-dark"
            }`}
          >
            Fechamento
          </button>
        </div>
      )}

      {aba === "fechamento" && ordemExistente && <FechamentoTab ordem={ordemExistente} onItensMudaram={onItensMudaram} />}

      {aba === "detalhes" && (
        <div className="space-y-6">
          <DetalhesFields
            register={register}
            watch={watch}
            setValue={setValue}
            errors={errors}
            clientes={clientes}
            funcionarios={funcionarios}
            ordens={buscarOrdensDoVeiculo ? ordensDoVeiculo : ordens}
            ordemAtualId={ordemExistente?.id}
            onCadastrarCliente={() => setCadastroRapido("cliente")}
            onCadastrarVeiculo={() => setCadastroRapido("veiculo")}
          />

          {modoOrcamento && (
            <section className="grid grid-cols-2 gap-4">
              <Campo label="Validade">
                <input
                  type="date"
                  {...register("validade")}
                  disabled={ehRecusado}
                  className={inputClasse}
                />
              </Campo>
            </section>
          )}

          <ItensFields
            control={control}
            register={register}
            watch={watch}
            setValue={setValue}
            itensExistentes={itensExistentes}
            podeAdicionarItem={podeAdicionarItem}
            podeEditarItem={podeEditarItem}
            avisoItens={avisoItens}
            onEditarItem={onEditarItem}
            pecas={pecas}
            servicos={servicos}
            funcionarios={funcionarios}
            saldoPorPeca={saldoPorPeca}
            saldoCarregado={saldoCarregado}
            permitePecaAvulsa={modoOrcamento}
          />
        </div>
      )}

      {/* Barra fixa do rodapé: o total ficava no meio da tela, logo abaixo
          da lista de itens — então com a OS cheia de peça ele saía de vista,
          que é justamente quando importa. Grudada aqui embaixo, ele (e o
          botão de salvar) acompanham a rolagem.

          `sticky` e não `fixed` de propósito: elemento `fixed` dentro de um
          `sakura-card` se prende ao card por causa do `backdrop-filter`
          (PROJETO_STATUS.md, seção 6, item 51), e o resultado seria uma
          barra flutuando no lugar errado. O fundo precisa ser opaco porque a
          lista de itens passa POR TRÁS dela ao rolar; a sombra em cima mostra
          que tem mais coisa embaixo.

          No Fechamento ela NÃO gruda (#781): lá não há total nem salvar, só o
          "Voltar", e grudada ela cobria os botões de DANFE. */}
      <div
        ref={barraRef}
        data-rodape-da-os
        className={`${
          aba === "detalhes" ? "sticky bottom-0 z-10 shadow-[0_-14px_18px_-6px_rgba(0,0,0,0.65)]" : ""
        } -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sakura-gray/25 bg-[#160f16] px-4 py-3`}
      >
        {aba === "detalhes" ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-rotulo text-sakura-muted">
              Peças {formatarMoeda(totais.pecas)}
            </span>
            <span className="text-rotulo text-sakura-muted">
              Serviços {formatarMoeda(totais.servicos)}
            </span>
            <span className="text-corpo font-semibold text-sakura-purple-dark">
              Total {ordemExistente ? "geral" : "previsto"} {formatarMoeda(totais.total)}
            </span>
          </div>
        ) : (
          <span />
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            {/* O Fechamento só mostra dados: "Cancelar" ali parecia desfazer
                alguma coisa (#781). */}
            {aba === "detalhes" ? "Cancelar" : "Voltar"}
          </button>
          {aba === "detalhes" && !ehRecusado && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting
                ? "Salvando..."
                : ordemExistente
                  ? "Salvar alterações"
                  : modoOrcamento
                    ? "Salvar orçamento"
                    : "Abrir ordem de serviço"}
            </button>
          )}
        </div>
      </div>
    </form>

    {/* Os modais ficam FORA do <form> da OS: um <form> dentro de outro é
        HTML inválido, e é isso que deixa cada modal ter o próprio botão de
        enviar — o que faz o Enter avançar de campo aqui dentro igual ao
        resto do app, sem tratamento especial. */}
    {janelaAvulsas && ordemExistente && (
      <PecasAvulsasAprovacaoModal
        itens={avulsasDoOrcamento}
        pecas={pecas}
        lojaId={ordemExistente.loja_id}
        enviando={enviando}
        erro={erro}
        onConfirmar={handleAprovar}
        onFechar={() => setJanelaAvulsas(false)}
      />
    )}
    {cadastroRapido === "cliente" && (
      <NovoClienteRapidoModal
        onFechar={() => setCadastroRapido(null)}
        onCadastrar={cadastrarClienteRapido}
      />
    )}
    {cadastroRapido === "veiculo" && (
      <NovoVeiculoRapidoModal
        nomeDoCliente={nomeDoClienteEscolhido}
        onFechar={() => setCadastroRapido(null)}
        onCadastrar={cadastrarVeiculoRapido}
      />
    )}
    </>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState, type FocusEvent, type ReactNode } from "react";
import type { OrdemParaKmDoVeiculo } from "@/lib/ordensServico";
import { useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { LinkCliente } from "@/components/LinkCliente";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { ehErroDeRede, mensagemDeErro } from "@/lib/errors";
import {
  MOTIVOS_RECUSA,
  MOTIVO_RECUSA_LABEL,
  orcamentoVencido,
  pecasAvulsas,
  podeAprovar,
  podeReabrir,
  podeRecusar,
  validadePadrao,
  type MotivoRecusa,
} from "@/schemas/orcamento";
import { mapaCustoServicos } from "@/schemas/metricasCaixa";
import {
  lucroPrevistoDaOrdem,
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
import { STATUS_LABEL, nomeDocumento, totalOrdem } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { NovoClienteRapidoModal, NovoVeiculoRapidoModal } from "./CadastroRapidoModais";
import { DetalhesFields } from "./campos/DetalhesFields";
import { ItensFields } from "./campos/ItensFields";
import { ApoioDoTotal, TotalGrande } from "./campos/TotalELucro";
import { useCustosDoLucro } from "./useCustosDoLucro";
import { Campo, inputClasse } from "./campos/FormCompartilhado";
import { FechamentoTab } from "./FechamentoTab";
import { TrilhaDaOrdem } from "./TrilhaDaOrdem";
import { useFechamentoDaOrdem } from "./useFechamentoDaOrdem";
import { podeVerPasso, type PassoDaOs } from "@/schemas/passoDaOrdem";
import { formatarMoeda } from "@/schemas/dinheiro";
import { abrirConversaWhatsapp } from "@/lib/whatsapp";
import { PecasAvulsasAprovacaoModal } from "./PecasAvulsasAprovacaoModal";
import { ESCOLHAS_VAZIAS, esquecerEscolha, type EscolhasDaJanela } from "./escolhasAvulsas";
import { Aviso, AvisoDeAtencao, AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { motivoParaNaoTrocar, resumoDaTroca } from "@/schemas/trocaFaturada";
import type { SituacaoDaCorrecao } from "@/lib/ordensServico";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { TrocaDeOsFaturada } from "@/types/os";
import { CancelarNotaModal } from "@/pages/notas-fiscais/CancelarNotaModal";
import { TrocarItensFaturadaModal, type ConfirmacaoDaCorrecao } from "./TrocarItensFaturadaModal";

/** As duas janelas do orçamento aberto (#1091): aprovar e recusar. */
export type JanelaDoOrcamento = "aprovar" | "recusar";

interface OrdemServicoFormProps {
  clientes: Cliente[];
  pecas: PecaJanela[];
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
  /**
   * "Reabrir orçamento" na faixa do recusado (#1181). A janela é da página,
   * que é a mesma da ação da linha na aba "Recusados".
   */
  onReabrir?: (orcamento: OrdemServico) => void;
  /**
   * O orçamento abre já com esta janela por cima (#1091): o "Aprovar" da
   * linha da lista e o "Recusar" do "⋯".
   */
  janelaInicial?: JanelaDoOrcamento | null;
  /** Botões a mais no cabeçalho do orçamento aberto (WhatsApp). */
  acoesExtras?: ReactNode;
  /**
   * Uma peça avulsa ganhou cadastro e foi ligada ao item: pela aba Fechamento
   * (#655) ou pela janela da aprovação do orçamento (#720). Recarregar a
   * ordem aberta.
   */
  onItensMudaram?: () => void | Promise<void>;
  /**
   * Corrigir peça, serviço e valor de OS JÁ FATURADA (#1145, #1182). Só
   * aparece com `gerente` (admin da loja) e sem nota fiscal; quem decide de
   * verdade é o banco.
   */
  gerente?: boolean;
  onTrocarItensFaturada?: (ordem: OrdemServico, correcao: ConfirmacaoDaCorrecao) => Promise<void>;
  /** A situação da OS pra janela (conta em aberto, caixa de hoje, comissão). */
  buscarSituacaoDaCorrecao?: (ordem: OrdemServico) => Promise<SituacaoDaCorrecao>;
  /** A nota emitida da OS, pra a janela levar ao "Cancelar nota". */
  notaParaCancelar?: NotaFiscalArquivo;
  /** Depois de cancelar a nota pela faixa: a página recarrega as notas da OS (#1182). */
  onNotaCancelada?: () => void;
  /**
   * O histórico da OS (trocas depois de faturada, reaberturas de orçamento,
   * correções de valor), da mais nova pra mais velha.
   */
  trocas?: TrocaDeOsFaturada[];
  /**
   * O passo "receber" da trilha (#1088): abre a janela "Faturar" por cima da
   * OS. Sem isto, o passo não tem botão (o faturar é da página).
   */
  onReceber?: (ordem: OrdemServico) => void;
  /**
   * O "Avisar o cliente" do passo "garantia e avisar" (#1088): o WhatsApp com a
   * mensagem de carro pronto, montado pela página (como o "Avisar" da lista).
   * Ausente (sem o módulo Clientes): o passo termina no "Concluir".
   */
  avisoCarroPronto?: { telefone: string | null | undefined; texto: string; aoAbrir: () => void };
}

/** O nome de cada tipo de linha do "Histórico da OS" (#1181). */
const ROTULO_DO_HISTORICO: Record<TrocaDeOsFaturada["tipo"], string> = {
  troca: "Troca",
  reabertura: "Reabertura",
  correcao_valor: "Correção de valor",
};

/** Como a diferença da correção de valor foi acertada (#1182). */
const ACERTO_NO_HISTORICO = {
  conta_aberta: "a conta a receber mudou de valor",
  pago_agora: "cliente pagou a diferença",
  a_receber: "diferença ficou a receber",
  devolvido: "diferença devolvida ao cliente",
} as const;

/** O texto de uma linha do histórico, sem a data. Linha antiga, sem tipo, é troca. */
function textoDoHistorico(linha: TrocaDeOsFaturada): string {
  const tipo = linha.tipo ?? "troca";
  const quem = linha.operador_nome ?? "—";
  if (tipo === "troca" || tipo === "correcao_valor") {
    const { saem, entram } = resumoDaTroca(linha.itens_antes, linha.itens_depois);
    const total =
      tipo === "correcao_valor" && linha.total_antes != null && linha.total_depois != null
        ? ` · total ${formatarMoeda(linha.total_antes)} → ${formatarMoeda(linha.total_depois)}` +
          (linha.acerto ? ` · ${ACERTO_NO_HISTORICO[linha.acerto]}` : "")
        : "";
    return (
      `${ROTULO_DO_HISTORICO[tipo]} · ${quem} · saiu ${saem.map((i) => i.descricao).join(", ") || "nada"}, ` +
      `entrou ${entram.map((i) => i.descricao).join(", ") || "nada"}${total} · motivo: ${linha.motivo}`
    );
  }
  return `${ROTULO_DO_HISTORICO[tipo]} · ${quem} · motivo: ${linha.motivo}`;
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
  onReabrir,
  janelaInicial = null,
  acoesExtras,
  onItensMudaram,
  gerente = false,
  onTrocarItensFaturada,
  buscarSituacaoDaCorrecao,
  notaParaCancelar,
  onNotaCancelada,
  trocas = [],
  onReceber,
  avisoCarroPronto,
}: OrdemServicoFormProps) {
  const [janelaTroca, setJanelaTroca] = useState(false);
  const [cancelandoNota, setCancelandoNota] = useState(false);
  const [canceladasAqui, setCanceladasAqui] = useState<ReadonlySet<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  // A janela de aprovar ou de recusar o orçamento (#1091). Só abre sozinha
  // quando o orçamento ainda pode ser aprovado (ou recusado).
  const [janelaOrcamento, setJanelaOrcamento] = useState<JanelaDoOrcamento | null>(() => {
    if (!modoOrcamento || !ordemExistente) return null;
    if (janelaInicial === "aprovar" && podeAprovar(ordemExistente)) return "aprovar";
    if (janelaInicial === "recusar" && podeRecusar(ordemExistente)) return "recusar";
    return null;
  });
  const [janelaAvulsas, setJanelaAvulsas] = useState(false);
  // O que foi escolhido na janela da aprovação (#720): fica aqui pra não se
  // perder quando a janela fecha no "Voltar".
  const [escolhasAvulsas, setEscolhasAvulsas] = useState<EscolhasDaJanela>(ESCOLHAS_VAZIAS);
  // Itens que a janela da aprovação já ligou no banco (#720). Saem da janela
  // na hora, sem esperar o orçamento recarregar: se o recarregar falhar, a
  // janela não oferece cadastrar a mesma peça de novo.
  const [ligadosNaJanela, setLigadosNaJanela] = useState<ReadonlySet<string>>(new Set());
  const [aprovadoPor, setAprovadoPor] = useState("");
  const [motivoRecusa, setMotivoRecusa] = useState<MotivoRecusa | "">("");
  const [enviando, setEnviando] = useState(false);
  const [cadastroRapido, setCadastroRapido] = useState<"cliente" | "veiculo" | null>(null);
  // A trilha do fechamento (#1088): o passo em que a OS está sai do que já
  // está gravado (status, notas, aviso). A OS mostra o passo atual, ou um passo
  // já feito que a pessoa clicou na trilha; "conferir" são os Detalhes (os
  // itens), os outros são o painel do fechamento. Era a aba "Detalhes" /
  // "Fechamento"; o `abaInicial` continua dizendo onde a OS abre.
  const fechamento = useFechamentoDaOrdem(modoOrcamento ? undefined : ordemExistente);
  const passoAtual = ordemExistente && !modoOrcamento ? fechamento.passo : null;
  const [passoEscolhido, setPassoEscolhido] = useState<PassoDaOs | null>(
    abaInicial === "detalhes" ? "conferir" : null,
  );
  // O passo andou (faturou, emitiu a nota, avisou): a OS vai pro passo novo,
  // em vez de ficar parada no que a pessoa tinha aberto. Só conta o passo já
  // assentado: enquanto as notas chegam do banco, ele ainda pode pular.
  const [passoAssentado, setPassoAssentado] = useState<PassoDaOs | null>(null);
  // Outra OS aberta na mesma tela (a busca do Ctrl+K reaproveita o
  // formulário): a garantia adiantada com a nota pendente (#1203) era da
  // anterior e não vale pra esta.
  const [idDoPassoEscolhido, setIdDoPassoEscolhido] = useState(ordemExistente?.id);
  if (ordemExistente?.id !== idDoPassoEscolhido) {
    setIdDoPassoEscolhido(ordemExistente?.id);
    if (passoEscolhido === "garantia") setPassoEscolhido(null);
  }
  if (passoAtual && !fechamento.carregando && passoAtual !== passoAssentado) {
    if (passoAssentado !== null) setPassoEscolhido(null);
    setPassoAssentado(passoAtual);
  }
  // Só um passo já feito (ou o atual) pode ser visto: nunca um de depois. A
  // exceção é a garantia e o aviso com a nota pendente (#1203).
  const passoVisto: PassoDaOs | null =
    passoAtual === null
      ? null
      : passoEscolhido && podeVerPasso(passoEscolhido, passoAtual)
        ? passoEscolhido
        : passoAtual;
  // A garantia e o aviso adiantados, com a nota ainda faltando (#1203): o
  // passo de verdade continua sendo a nota.
  const garantiaSemANota = passoAtual === "nota" && passoVisto === "garantia";
  const aba: "detalhes" | "fechamento" =
    passoVisto === null || passoVisto === "conferir" ? "detalhes" : "fechamento";
  const [erroAviso, setErroAviso] = useState<string | null>(null);

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

  // O lucro previsto do rodapé (#1087): o custo dos itens já gravados vem do
  // banco, o das peças só pra quem tem o módulo Estoque.
  const { custoDosExistentes, custoPeca, calculando } = useCustosDoLucro(ordemExistente);
  const custoServico = useMemo(() => mapaCustoServicos(servicos), [servicos]);

  // O foco ao abrir (#1087, "a busca única em cima, com o foco ao abrir"):
  // nova ou existente, a OS abre na busca, pronta pro leitor de código.
  const buscaRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    buscaRef.current?.focus();
    // Só ao abrir: depois o foco é de quem está digitando.
  }, []);

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
  // Se a OS já tem nota: o que a página sabe, ou o que a trilha acabou de
  // buscar (#1204). A página só busca as notas de novo quando a OS fecha; a
  // trilha busca logo depois de emitir. Sem isto, a faixa seguia oferecendo
  // "Corrigir a OS" (que é só pra OS sem nota) com a nota já emitida.
  // A nota cancelada aqui não conta mais, mesmo se a busca das notas que vem
  // depois falhar: a lista da trilha ficaria com ela ainda valendo.
  const notaVigenteDaTrilha = fechamento.notas.find(
    (nota) => nota.status !== "cancelado" && !canceladasAqui.has(nota.id),
  );
  const temNota = temNotaEmitida || !!notaVigenteDaTrilha;
  const notaDaFaixa = notaParaCancelar ?? notaVigenteDaTrilha;
  const podeAdicionarItem = !ehFaturada && !ehRecusado;
  const podeEditarItem = !!ordemExistente && !ehFaturada && !ehRecusado && !temNota;
  const porQueNaoTroca =
    ehFaturada && onTrocarItensFaturada
      ? motivoParaNaoTrocar({ faturada: true, gerente, temNota })
      : null;
  const podeTrocarFaturada = ehFaturada && !!onTrocarItensFaturada && porQueNaoTroca === null;
  const vencido = modoOrcamento && orcamentoVencido(ordemExistente?.validade);
  const avisoItens = ehRecusado
    ? "Orçamento recusado: fica só como histórico, não dá pra mexer nos itens."
    : ehFaturada
      ? "Esta OS já foi faturada — o pagamento já foi lançado no Caixa com o total de então. " +
        "Dá pra corrigir peça, serviço ou valor (só gerente, sem nota fiscal)."
    : temNota
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
      // Sem rede: o que foi digitado vai pro rascunho na hora, não só aos 30 s.
      if (ehErroDeRede(err)) rascunho.salvarAgora();
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
  const avulsasDoOrcamento = pecasAvulsas(itensExistentes).filter(
    (item) => !ligadosNaJanela.has(item.id),
  );

  // A janela ligou a peça cadastrada ao item (#720): a escolha dele já não
  // serve, e o orçamento recarrega pra mostrar o item com a peça do cadastro.
  // A peça cadastrada fica guardada (`cadastradas`): até o orçamento
  // recarregar (ou se o recarregar falhar), é por ela que a peça nova aparece
  // no "já tenho" das outras linhas, em vez de a pessoa cadastrar outra igual.
  async function aoLigarNaJanela(itemId: string) {
    setLigadosNaJanela((ligados) => new Set(ligados).add(itemId));
    setEscolhasAvulsas((e) => ({
      ...esquecerEscolha(e, itemId),
      cadastradas: e.cadastradas,
    }));
    try {
      await onItensMudaram?.();
    } catch (err) {
      console.error("Erro ao recarregar o orçamento depois de ligar a peça:", err);
      setErro(
        `A peça foi cadastrada e ligada ao item, mas o orçamento não recarregou: ` +
          `${mensagemDeErro(err)}. Feche e abra o orçamento de novo pra ver.`,
      );
    }
  }

  function aoConfirmarAprovacao() {
    if (avulsasDoOrcamento.length > 0) {
      if (!aprovadoPor.trim()) {
        setErro("Diga quem aprovou (ex.: pelo telefone) antes de confirmar.");
        return;
      }
      setErro(null);
      // A de aprovar fecha antes (#1091): duas janelas abertas brigavam pelo
      // Esc e pelo Tab. O "Voltar" da de avulsas reabre a de aprovar.
      setJanelaOrcamento(null);
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
  const lucro = lucroPrevistoDaOrdem({
    itensExistentes,
    custoDosExistentes,
    itensFormulario: watch("itens"),
    custoPeca,
    custoServico,
  });
  // O "Avisar o cliente" do passo "garantia e avisar": abre o WhatsApp com a
  // mensagem de carro pronto e registra (como o "Avisar" da lista). O erro (o
  // mais comum: telefone sem DDD) aparece no próprio passo.
  async function avisarCliente() {
    if (!avisoCarroPronto) return;
    setErroAviso(null);
    try {
      await abrirConversaWhatsapp(avisoCarroPronto.telefone, avisoCarroPronto.texto);
      avisoCarroPronto.aoAbrir();
      fechamento.marcarAvisado();
    } catch (err) {
      console.error("Erro ao abrir o WhatsApp:", err);
      setErroAviso(mensagemDeErro(err));
    }
  }

  // O botão do próximo passo (#1088): um só, laranja, embaixo à direita, e só
  // quando a pessoa está vendo o passo atual. Diz o que faz ("Receber R$ 250,00",
  // "Emitir NFC-e"), nunca "OK".
  const acaoDoPasso: { rotulo: string; aoClicar: () => void; ocupado?: boolean } | null = (() => {
    if (!ordemExistente || !passoAtual || !passoVisto || fechamento.carregando) return null;
    if (garantiaSemANota) {
      // Já avisou (ou concluiu sem avisar) com a nota faltando: nada a
      // oferecer aqui; o que falta é a nota, no passo atual da trilha.
      if (fechamento.avisadoEm || fechamento.concluidoSemAviso) return null;
    } else if (passoVisto !== passoAtual) {
      return null;
    }
    switch (passoVisto) {
      case "conferir":
        return {
          rotulo: encerrando ? "Encerrando..." : "Encerrar e receber",
          aoClicar: () => void handleEncerrar(),
          ocupado: encerrando,
        };
      case "receber":
        return onReceber
          ? {
              rotulo: `Receber ${formatarMoeda(totalOrdem(ordemExistente.itens ?? []))}`,
              aoClicar: () => onReceber(ordemExistente),
            }
          : null;
      case "nota": {
        const nota = fechamento.proximaNota;
        return nota ? { rotulo: `Emitir ${nota}`, aoClicar: () => fechamento.setNotaParaEmitir(nota) } : null;
      }
      case "garantia":
        return avisoCarroPronto
          ? { rotulo: "Avisar o cliente", aoClicar: () => void avisarCliente() }
          : { rotulo: "Concluir", aoClicar: fechamento.concluirSemAvisar };
      case "pronto":
        return { rotulo: "Pronto", aoClicar: onCancelar };
    }
  })();
  // No "conferir", com alteração sem salvar, o laranja é o "Salvar" e o
  // "Encerrar" espera (encerrar sem salvar perderia o que foi mudado).
  const encerrarEspera = passoVisto === "conferir" && isDirty;

  const nomeDoClienteEscolhido =
    clientes.find((c) => c.id === watch("cliente_id"))?.nome ?? "este cliente";

  // A barra do rodapé: dentro do <form> nos Detalhes (o "Salvar" é dela) e
  // fora dele no Fechamento, junto da aba (#1128).
  /* Barra fixa do rodapé: o total ficava no meio da tela, logo abaixo
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
      "Voltar", e grudada ela cobria os botões de DANFE. */
  const rodape = (
    <div
      ref={barraRef}
      data-rodape-da-os
      className={`${
        // No Fechamento ela também gruda quando traz o botão do próximo passo
        // (#1088): em 1366 × 768 ele ficava abaixo da dobra. Sem o botão (um
        // passo feito, só com o "Voltar"), continua solta, como na #781.
        aba === "detalhes" || acaoDoPasso
          ? "sticky bottom-0 z-10 shadow-[0_-14px_18px_-6px_var(--sombra-forte)]"
          : ""
      } -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-linha bg-janela px-4 py-3`}
    >
      {aba === "detalhes" ? (
        <ApoioDoTotal
          pecas={totais.pecas}
          servicos={totais.servicos}
          lucro={lucro}
          calculando={calculando}
        />
      ) : (
        <span />
      )}

      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
        {aba === "detalhes" && (
          <TotalGrande rotulo={`Total ${ordemExistente ? "geral" : "previsto"}`} valor={totais.total} />
        )}
        <div className="flex gap-3">
          {/* O Fechamento só mostra dados: "Cancelar" ali parecia desfazer
              alguma coisa (#781). */}
          <Botao variante="fantasma" tamanho="grande" onClick={onCancelar}>
            {aba === "detalhes" ? "Cancelar" : "Voltar"}
          </Botao>
          {passoVisto === "garantia" && acaoDoPasso && avisoCarroPronto && (
            // Cliente sem WhatsApp, ou avisado no balcão: dá pra fechar sem o aviso.
            <Botao variante="fantasma" tamanho="grande" onClick={fechamento.concluirSemAvisar}>
              Concluir sem avisar
            </Botao>
          )}
          {aba === "detalhes" && !ehRecusado && (
            <Botao
              variante={acaoDoPasso && !encerrarEspera ? "secundario" : "principal"}
              tamanho="grande"
              type="submit"
              ocupado={isSubmitting}
            >
              {isSubmitting
                ? "Salvando..."
                : ordemExistente
                  ? "Salvar alterações"
                  : modoOrcamento
                    ? "Salvar orçamento"
                    : "Abrir ordem de serviço"}
            </Botao>
          )}
          {acaoDoPasso && (
            <Botao
              variante={encerrarEspera ? "secundario" : "principal"}
              tamanho="grande"
              onClick={acaoDoPasso.aoClicar}
              ocupado={acaoDoPasso.ocupado}
              disabled={encerrarEspera}
              title={encerrarEspera ? "Salve as alterações antes de encerrar." : undefined}
            >
              {acaoDoPasso.rotulo}
            </Botao>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="space-y-6 sakura-card p-6 shadow-sm">
    <form
      onSubmit={handleSubmit(aoSubmeter)}
      onFocus={(e: FocusEvent<HTMLFormElement>) => manterAcimaDaBarra(e.target)}
      className="space-y-6"
    >
      {ordemExistente ? (
        <div className="flex items-center justify-between gap-4 border-b border-linha pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <BotaoVoltar onClick={onCancelar} />
            <div className="min-w-0">
              <p className="text-rotulo text-texto-2">
                {nomeDocumento(ordemExistente)} · aberta em{" "}
                {formatarData(ordemExistente.data_abertura)} · criado por{" "}
                {ordemExistente.criado_por?.nome ?? "—"}
              </p>
              <h2 className="text-subtitulo font-semibold text-texto">
                {ordemExistente.cliente?.nome ? (
                  <LinkCliente
                    clienteId={ordemExistente.cliente_id}
                    nome={ordemExistente.cliente.nome}
                    podeAbrir
                    desligado={isDirty}
                    motivoDesligado="Salve as alterações da OS antes de abrir a ficha do cliente."
                  />
                ) : (
                  "Cliente"
                )}
                {ordemExistente.veiculo?.placa ? ` — ${ordemExistente.veiculo.placa}` : ""}
              </h2>
            </div>
          </div>
          {/* `shrink-0` e `whitespace-nowrap`: em 1024 o "Em andamento" quebrava
              em duas linhas (#1087). */}
          <div className="flex shrink-0 items-center gap-3">
            <span className="whitespace-nowrap rounded-full bg-cartao px-3 py-1 text-rotulo font-medium text-texto">
              {STATUS_LABEL[ordemExistente.status]}
            </span>
            {vencido && (
              <span className="rounded-full bg-texto/[0.08] px-3 py-1 text-rotulo font-medium text-texto-2">
                vencido
              </span>
            )}
            {modoOrcamento && acoesExtras}
            {/* O "Encerrar OS" de antes virou o botão do passo "conferir",
                embaixo à direita: "Encerrar e receber" (#1088). */}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <BotaoVoltar onClick={onCancelar} />
          <h2 className="text-subtitulo font-semibold text-texto">
            {modoOrcamento ? "Novo orçamento" : "Nova ordem de serviço"}
          </h2>
        </div>
      )}

      {/* Com a janela do orçamento aberta, o erro aparece dentro dela (#1091),
          e não repetido aqui atrás. */}
      {erro && !janelaOrcamento && !janelaAvulsas && (
        <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>
      )}

      {ehRecusado && ordemExistente && (
        // #1191: a faixa é o aviso de perigo (vermelho e ícone), não mais cinza.
        // `[&>div]:flex-1`: o miolo do aviso ocupa a largura, e o botão fica
        // na direita, como antes.
        <Aviso tipo="perigo" className="[&>div]:flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0">
              Orçamento recusado
              {ordemExistente.motivo_recusa
                ? ` — motivo: ${MOTIVO_RECUSA_LABEL[ordemExistente.motivo_recusa]}`
                : " — sem motivo informado"}
              .
            </p>
            {/* #1181: o cliente voltou? Reabre com o mesmo número (sem laranja:
                o laranja da tela é o "Novo orçamento"). */}
            {modoOrcamento && onReabrir && podeReabrir(ordemExistente) && (
              <Botao tamanho="pequeno" onClick={() => onReabrir(ordemExistente)}>
                Reabrir orçamento
              </Botao>
            )}
          </div>
        </Aviso>
      )}

      {modoOrcamento && ordemExistente && podeAprovar(ordemExistente) && (
        // Aprovar e recusar em janela (#1091): na faixa ficam só os dois
        // botões, longe um do outro (Fitts). "Aprovar" é o laranja, à direita;
        // "Recusar" é discreto, à esquerda. O motivo só aparece na janela do
        // "Recusar" (antes ele vinha ANTES do "Aprovar", na mesma faixa).
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-linha px-4 py-3">
          {podeRecusar(ordemExistente) ? (
            <Botao
              variante="fantasma"
              onClick={() => {
                setErro(null);
                setJanelaOrcamento("recusar");
              }}
              disabled={enviando}
            >
              Recusar
            </Botao>
          ) : (
            <span />
          )}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-4">
            <p className="min-w-0 text-rotulo text-texto-2">
              Ao aprovar, vira uma OS em andamento e as peças saem do estoque.
            </p>
            <Botao
              variante="principal"
              onClick={() => {
                setErro(null);
                setJanelaOrcamento("aprovar");
              }}
              disabled={enviando}
            >
              Aprovar
            </Botao>
          </div>
        </div>
      )}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao={modoOrcamento ? "deste orçamento" : "desta ordem de serviço"}
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      {passoAtual && passoVisto && (
        <TrilhaDaOrdem
          passo={passoAtual}
          carregando={fechamento.carregando}
          passoVisto={passoVisto}
          aoVer={setPassoEscolhido}
        />
      )}

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

          {ehFaturada && onTrocarItensFaturada && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-linha p-3">
              <p className="text-rotulo text-texto-2">
                {podeTrocarFaturada
                  ? "Precisa corrigir? Peça, serviço ou valor"
                  : porQueNaoTroca}
              </p>
              {podeTrocarFaturada && (
                <Botao tamanho="pequeno" onClick={() => setJanelaTroca(true)}>
                  Corrigir a OS
                </Botao>
              )}
              {temNota && gerente && notaDaFaixa && (
                <Botao tamanho="pequeno" onClick={() => setCancelandoNota(true)}>
                  Cancelar a nota
                </Botao>
              )}
            </div>
          )}

          {trocas.length > 0 && (
            <section className="rounded-lg bg-poco p-3">
              <p className="mb-1 text-rotulo font-medium text-texto/85">Histórico da OS</p>
              <ul className="space-y-1 text-rotulo text-texto/90">
                {trocas.map((linha) => (
                  <li key={linha.id}>
                    {formatarData(linha.criado_em)} · {textoDoHistorico(linha)}
                  </li>
                ))}
              </ul>
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
            onEditarItem={async (item, patch) => {
              await onEditarItem(item, patch);
              // Item corrigido: a escolha da aprovação pode não valer mais (#720).
              setEscolhasAvulsas((e) => esquecerEscolha(e, item.id));
            }}
            pecas={pecas}
            servicos={servicos}
            funcionarios={funcionarios}
            saldoPorPeca={saldoPorPeca}
            saldoCarregado={saldoCarregado}
            permitePecaAvulsa={modoOrcamento}
            buscaRef={buscaRef}
          />
        </div>
      )}

      {aba === "detalhes" && rodape}
    </form>

    {/* A aba Fechamento fica FORA do <form> da OS (#1128): o "Cadastrar
        agora" da janela "Emitir NFC-e" abre o formulário da peça, que tem o
        próprio <form>. Dentro do da OS era um formulário dentro de outro
        (HTML inválido): o "Salvar peça" enviava também o formulário da OS
        (o teste OrdemServicoForm.fechamento.test.tsx viu isso). */}
    {aba === "fechamento" && ordemExistente && passoVisto && passoVisto !== "conferir" && (
      fechamento.carregando ? (
        // As notas ainda chegando: o lugar do passo fica guardado, sem pular.
        <div aria-hidden="true" className="h-48 animate-pulse rounded-2xl bg-poco motion-reduce:animate-none" />
      ) : (
        <FechamentoTab
          ordem={ordemExistente}
          passo={passoVisto}
          fechamento={fechamento}
          erroAviso={erroAviso}
          onItensMudaram={onItensMudaram}
          aoAdiantarGarantia={() => setPassoEscolhido("garantia")}
        />
      )
    )}
    {aba === "fechamento" && rodape}
    </div>

    {/* Os modais ficam FORA do <form> da OS: um <form> dentro de outro é
        HTML inválido, e é isso que deixa cada modal ter o próprio botão de
        enviar — o que faz o Enter avançar de campo aqui dentro igual ao
        resto do app, sem tratamento especial. */}
    {/* As janelas do orçamento (#1091). A das peças sem cadastro (logo
        abaixo) abre POR CIMA da de aprovar, e o "Voltar" dela volta pra cá. */}
    {janelaOrcamento === "aprovar" && ordemExistente && (
      <Modal
        titulo={`Aprovar o ${nomeDocumento(ordemExistente)}`}
        descricao="Ao aprovar, vira uma OS em andamento e as peças saem do estoque."
        // Esc, ✕ e clique fora não fecham no meio do envio (como a de avulsas).
        onFechar={() => {
          if (!enviando) setJanelaOrcamento(null);
        }}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setJanelaOrcamento(null)} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao
              variante="principal"
              onClick={aoConfirmarAprovacao}
              disabled={isDirty}
              ocupado={enviando}
            >
              Confirmar aprovação
            </Botao>
          </>
        }
      >
        <div className="space-y-4">
          {erro && !janelaAvulsas && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}
          {vencido && (
            <AvisoDeAtencao className="text-corpo">
              Este orçamento passou da validade: o preço pode ter mudado. Confira os valores
              antes de aprovar. Dá pra aprovar mesmo assim.
            </AvisoDeAtencao>
          )}
          {isDirty && (
            <AvisoDeAtencao className="text-corpo">
              Salve as alterações antes de aprovar: feche esta janela e clique em "Salvar alterações".
            </AvisoDeAtencao>
          )}
          <label className="flex flex-col gap-2 text-corpo">
            Quem aprovou?
            <input
              type="text"
              value={aprovadoPor}
              onChange={(e) => setAprovadoPor(e.target.value)}
              onKeyDown={(e) => {
                // Enter confirma, como o botão (a janela não tem <form>).
                if (e.key === "Enter" && !isDirty && !enviando) {
                  e.preventDefault();
                  aoConfirmarAprovacao();
                }
              }}
              placeholder="Ex.: o cliente, pelo telefone"
              className={inputClasse}
            />
          </label>
        </div>
      </Modal>
    )}
    {janelaOrcamento === "recusar" && ordemExistente && (
      <Modal
        titulo={`Recusar o ${nomeDocumento(ordemExistente)}?`}
        descricao="O orçamento vai pra aba Recusados e fica só como histórico."
        // Esc, ✕ e clique fora não fecham no meio do envio (como a de avulsas).
        onFechar={() => {
          if (!enviando) setJanelaOrcamento(null);
        }}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setJanelaOrcamento(null)} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao variante="perigo" onClick={handleRecusar} ocupado={enviando}>
              Recusar orçamento
            </Botao>
          </>
        }
      >
        <div className="space-y-4">
          {erro && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}
          <label className="flex flex-col gap-2 text-corpo">
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
        </div>
      </Modal>
    )}
    {cancelandoNota && notaDaFaixa && (
      <CancelarNotaModal
        arquivo={notaDaFaixa}
        onFechar={() => setCancelandoNota(false)}
        onCancelado={() => {
          setCanceladasAqui((ids) => new Set(ids).add(notaDaFaixa.id));
          // A página recarrega as notas dela (a faixa); a trilha (#1088), as
          // suas: a nota cancelada volta a faltar e o passo volta pra nota.
          onNotaCancelada?.();
          void fechamento.recarregarNotas();
        }}
      />
    )}
    {janelaTroca && ordemExistente && onTrocarItensFaturada && (
      <TrocarItensFaturadaModal
        ordem={ordemExistente}
        pecas={pecas}
        servicos={servicos}
        funcionarios={funcionarios}
        saldoPorPeca={saldoPorPeca}
        saldoCarregado={saldoCarregado}
        buscarSituacao={() =>
          buscarSituacaoDaCorrecao
            ? buscarSituacaoDaCorrecao(ordemExistente)
            : Promise.resolve({ contaDoFaturamentoEmAberto: null, caixaDeHojeFechado: false, comissaoDoPeriodoPaga: false, aReceberDeCorrecoes: 0 })
        }
        notaParaCancelar={notaDaFaixa}
        onConfirmar={async (correcao) => {
          await onTrocarItensFaturada(ordemExistente, correcao);
          setJanelaTroca(false);
        }}
        onFechar={() => setJanelaTroca(false)}
      />
    )}
    {janelaAvulsas && ordemExistente && (
      <PecasAvulsasAprovacaoModal
        itens={avulsasDoOrcamento}
        pecas={pecas}
        lojaId={ordemExistente.loja_id}
        escolhas={escolhasAvulsas}
        onMudarEscolhas={setEscolhasAvulsas}
        enviando={enviando}
        erro={erro}
        onConfirmar={handleAprovar}
        onItemLigado={aoLigarNaJanela}
        onFechar={() => {
          setJanelaAvulsas(false);
          setJanelaOrcamento("aprovar");
        }}
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

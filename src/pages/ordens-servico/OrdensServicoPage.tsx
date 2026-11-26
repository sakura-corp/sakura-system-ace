import {
  CarFront,
  FolderOpen,
  MessageCircle,
  Plus,
  Receipt,
  Star,
  TriangleAlert,
} from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Abas } from "@/components/Abas";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Chips } from "@/components/Chips";
import { LinhaDeLista, type AcaoDaLinhaDoMolde, type ItemDoMais } from "@/components/molde/LinhaDeLista";
import { MoldeLista } from "@/components/molde/MoldeLista";
import { Valor } from "@/components/Valor";
import { avisar } from "@/lib/avisoQueSome";
import { abrirConversaWhatsapp } from "@/lib/whatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { buscarLinkAvaliacao, listarJurosParcelas } from "@/lib/configuracoes";
import { dataCurta, diaLocal, hojeLocal, primeiroDiaDoMesLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { useRecarregarQuandoVoltar } from "@/hooks/useRecarregarQuandoVoltar";
import type { CustoDoBanco } from "@/schemas/metricasCaixa";
import { buscarCustoDasOrdens } from "@/lib/caixa";
import {
  cadastrarClienteRapido,
  cadastrarVeiculoRapido,
  listarClientesParaEscolha,
} from "@/lib/clientes";
import { temPermissao } from "@/types/operador";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
} from "@/lib/modelosWhatsapp";
import { montarTextoAvaliacao, preencherModelo } from "@/schemas/whatsapp";
import { listarSaldos } from "@/lib/estoque";
import { listarFuncionariosPublico } from "@/lib/funcionarios";
import {
  adicionarItensOrdem,
  atualizarOrdem,
  concluirOrdem,
  criarOrdem,
  editarItemOrdem,
  faturarOrdem,
  buscarSituacaoDaCorrecao,
  corrigirOrdemFaturada,
  OrdemMudouError,
  listarOrdens,
  listarTrocasDaOrdem,
  registrarVendaBalcao,
  VendaSemFaturamentoError,
} from "@/lib/ordensServico";
import type {
  DadosVendaBalcao,
  PagamentoDaVenda,
  PagamentoOrdem,
} from "@/lib/ordensServico";
import { listarArquivosDasOrdens } from "@/lib/notasFiscais";
import { listarPecasJanela } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import { ehConsumidor } from "@/types/cliente";
import type { Cliente, NovoCliente, VeiculoFormulario } from "@/types/cliente";
import type { JurosParcela } from "@/types/configuracao";
import type { FuncionarioPublico } from "@/types/funcionario";
import type {
  ItemOS,
  NovaOrdemServico,
  NovoItemOS,
  OrdemServico,
  PatchItemOS,
  PatchOrdemServico,
  TrocaDeOsFaturada,
} from "@/types/os";
import {
  STATUS_COM_FECHAMENTO,
  ehVendaBalcao,
  nomeDocumento,
  totalOrdem,
  totalPorTipo,
} from "@/types/os";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { ConfirmacaoDaCorrecao } from "./TrocarItensFaturadaModal";
import {
  agruparNotasPorOrdem,
  ordemEstaFinalizada,
  situacaoFiscalOrdem,
  temAlgumaNotaValida,
} from "@/schemas/situacaoFiscal";
import { contaNosNumeros, lucroDaOrdemPeloBanco, TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { EmitirNotaFiscalModal } from "./EmitirNotaFiscalModal";
import { FaturamentoCard } from "./FaturamentoCard";
import { NotaDoClienteModal } from "./NotaDoClienteModal";
import { notasDoCliente } from "./notaDoCliente";
import { SeloDaOrdem } from "./SeloDaOrdem";
import {
  devolverRolagem,
  posicaoDaRolagem,
  rolarParaOTopo,
  type PosicaoDeRolagem,
} from "./rolagemDaLista";
import { OrdemServicoForm } from "./OrdemServicoForm";
import { VendaBalcaoDetalhe } from "./VendaBalcaoDetalhe";
import { VendaBalcaoForm } from "./VendaBalcaoForm";

/**
 * Como a linha da OS cabe numa janela de 1024 com o menu aberto (#1091; #1079,
 * item 24). As duas opções estão prontas, e a Sofia escolhe pela foto no PR:
 *
 * - `"esconder-lucro"` (opção 1): abaixo de 1280 de janela, a linha mostra só
 *   o total; o lucro aparece de 1280 em diante (e "Peças · Serviços", embaixo
 *   do total, de 1600 em diante, como era a tabela).
 * - `"pecas-no-total"` (opção 2): o lucro fica sempre, e "Peças · Serviços"
 *   vai embaixo do total, em letra pequena, em qualquer largura.
 *
 * Nenhum número some de vez: dentro da OS estão todos.
 */
type ComoCabeEm1024 = "esconder-lucro" | "pecas-no-total";
const COMO_CABE_EM_1024: ComoCabeEm1024 = "esconder-lucro";

// O período da lista: em botões (o molde de lista, #1135). "Escolher datas"
// mostra os dois campos de data de antes; nenhum filtro sumiu.
type Periodo = "mes" | "tudo" | "datas";
const OPCOES_DE_PERIODO = [
  { valor: "mes" as const, nome: "Este mês" },
  { valor: "tudo" as const, nome: "Todo o histórico" },
  { valor: "datas" as const, nome: "Escolher datas" },
];

/** O detalhe da linha: cada pedaço no seu lugar, separados por " · ". */
// Ver o comentário em volta da lista. A caixa das ações também tem largura
// fixa (o botão + o "⋯"): linha sem botão (o recusado, a OS já sem próximo
// passo) não desalinha o selo e o valor. (Escrita por extenso: o Tailwind só
// gera a classe que acha inteira.)
const CLASSE_DA_LISTA =
  "min-w-0 [&_li>div:last-child]:min-w-48 [&_li>div:last-child]:justify-end [&_li>div:last-child>button]:min-w-36 [&_li>div:last-child>button]:justify-center";

function DetalheDaLinha({ partes }: { partes: ReactNode[] }) {
  const comAlgo = partes.filter((parte) => parte !== null && parte !== undefined && parte !== false && parte !== "");
  return (
    <>
      {comAlgo.map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && " · "}
          <span>{parte}</span>
        </Fragment>
      ))}
    </>
  );
}

// O que o aviso de sucesso diz que foi lançado (#1182).
function avisoDaCorrecao(c: ConfirmacaoDaCorrecao): string {
  switch (c.acerto) {
    case "pago_agora":
      return "corrigida; a diferença entrou no Caixa de hoje.";
    case "devolvido":
      return "corrigida; a devolução saiu do Caixa de hoje.";
    case "a_receber":
      return "corrigida; a diferença ficou como conta a receber.";
    case "conta_aberta":
      return "corrigida; a conta a receber mudou de valor.";
    default:
      return "corrigida, com o mesmo total.";
  }
}

// A nota que ainda vale (não cancelada): a janela de corrigir leva a cancelá-la.
function notaVigenteDaOrdem(notas: NotaFiscalArquivo[]): NotaFiscalArquivo | undefined {
  return notas.find((n) => temAlgumaNotaValida([n]));
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrdensServicoPage() {
  const { operador, lojaAtual } = useAuth();
  // Sem o módulo Clientes a lista vem pela janela estreita (migration 0068).
  const podeVerCadastro = temPermissao(operador, "clientes");
  const location = useLocation();
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  // Link de avaliação no Google (#459): null = a loja não configurou, e o botão não aparece.
  const [linkAvaliacao, setLinkAvaliacao] = useState<string | null>(null);
  const [pecas, setPecas] = useState<PecaJanela[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioPublico[]>([]);
  const [jurosParcelas, setJurosParcelas] = useState<JurosParcela[]>([]);
  const [notasPorOrdem, setNotasPorOrdem] = useState<Map<string, NotaFiscalArquivo[]>>(
    () => new Map(),
  );
  // Saldo de estoque: só é buscado quando o formulário da OS abre, e não
  // junto com a lista. É a mesma ideia já usada na aba Comissões — quem veio
  // só olhar a lista de OS não paga por uma consulta que ela não usa. `null`
  // significa "ainda não veio", e nesse estado os avisos de estoque ficam
  // calados em vez de anunciar "saldo zero" pra tudo.
  const [saldoPorPeca, setSaldoPorPeca] = useState<Map<string, number> | null>(null);
  // O histórico das trocas depois de faturada da OS aberta (#1145).
  const [trocasDaOrdem, setTrocasDaOrdem] = useState<TrocaDeOsFaturada[]>([]);
  const [versaoDasTrocas, setVersaoDasTrocas] = useState(0);
  // Custo de cada OS da lista, calculado pelo banco (`custo_das_ordens`): a
  // coluna Lucro não depende de ler o cadastro de peças (#366).
  const [custoDasOrdens, setCustoDasOrdens] = useState<CustoDoBanco>(() => new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // A ÚLTIMA carga da tela falhou (sem internet, por exemplo; #1017). À parte
  // do `erro`, que também guarda o erro de uma ação (faturar, WhatsApp): só a
  // carga que falhou busca de novo quando a internet volta.
  const [cargaFalhou, setCargaFalhou] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [ordemEmEdicao, setOrdemEmEdicao] = useState<OrdemServico | null>(null);
  const [abaInicialEdicao, setAbaInicialEdicao] = useState<"detalhes" | "fechamento">("detalhes");
  const [ordemFaturando, setOrdemFaturando] = useState<OrdemServico | null>(null);
  // Venda de balcão (item FN-09): o formulário de uma venda nova, uma venda
  // já registrada aberta pela lista, e a venda que acabou de sair e está
  // esperando a NFC-e. As três são estados à parte da OS de propósito — a
  // venda não abre no formulário da OS (não tem veículo, KM nem "em
  // andamento", e os itens dela não mudam depois de registrada).
  const [mostrarVenda, setMostrarVenda] = useState(false);
  const [vendaAberta, setVendaAberta] = useState<OrdemServico | null>(null);
  const [vendaParaNota, setVendaParaNota] = useState<OrdemServico | null>(null);
  // "Nota do cliente" aberta pela linha de uma OS finalizada.
  const [notaDoCliente, setNotaDoCliente] = useState<{
    documento: string;
    venda: boolean;
    notas: NotaFiscalArquivo[];
  } | null>(null);
  // A OS (ou venda) foi aberta por uma ficha (do cliente ou do veículo) que
  // pediu `voltarAoFechar` (#393): o Voltar leva de volta pra ficha, em vez de
  // ficar na lista. Quem abre pela lista, pelo Início ou pela busca não pede,
  // e o Voltar continua fechando a OS aqui mesmo.
  const [voltarAoFechar, setVoltarAoFechar] = useState(false);
  const [lista, setLista] = useState<"os" | "vendas">("os");
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMesLocal());
  const [dataFim, setDataFim] = useState(hojeLocal());
  const [busca, setBusca] = useState("");
  const funcionarioAtualId =
    funcionarios.find((f) => f.operador_id === operador?.id)?.id ?? "";

  const saldosParaForm = useMemo(() => saldoPorPeca ?? new Map<string, number>(), [saldoPorPeca]);

  // O custo vem pronto do banco, pela mesma conta item a item de
  // `custoUnitarioDoItem` (schemas/orcamento.ts), em vez de refazer a soma
  // aqui: cada tela que recalculava lucro por conta própria acabou
  // divergindo das outras — ver PROJETO_STATUS.md, seção 6, item 40.
  //
  // Peça digitada sem cadastro e sem custo (#655) não tem lucro: devolve
  // `null` e a coluna mostra o texto, em vez de um número inventado.
  function textoLucro(ordem: OrdemServico) {
    const { lucro } = lucroDaOrdemPeloBanco(ordem.itens ?? [], custoDasOrdens.get(ordem.id));
    if (lucro === null) {
      return <span className="text-meta text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>;
    }
    // Verde quando ganhou; o prejuízo o `Valor` já mostra em vermelho, com
    // seta e "−" (a cor nunca avisa sozinha).
    return (
      <span className="whitespace-nowrap text-meta text-texto-2">
        lucro <Valor valor={lucro} classeDeCor="text-ok" className="font-medium" />
      </span>
    );
  }

  // O lado direito da linha: o selo (sempre da mesma largura, pra coluna
  // bater) e o valor, que é o número em destaque, alinhado à direita.
  function ladoDaLinha(ordem: OrdemServico) {
    const itens = ordem.itens ?? [];
    const opcao1 = COMO_CABE_EM_1024 === "esconder-lucro";
    return (
      <div className="flex items-center gap-4">
        <div className="w-36">
          <SeloDaOrdem ordem={ordem} notas={notasPorOrdem.get(ordem.id) ?? []} />
        </div>
        {/* Na opção 1, em 1600 a coluna cresce pra "peças · serv." caber numa
            linha só; na 2, cada um vai numa linha, pra coluna continuar
            estreita em 1024. A coluna do valor bate em toda linha. */}
        <div
          className={`${opcao1 ? "w-32 min-[1600px]:w-52" : "w-36"} flex flex-col items-end gap-0.5 text-right`}
        >
          <span className="whitespace-nowrap text-corpo font-semibold text-texto tabular-nums">
            {formatarMoeda(totalOrdem(itens))}
          </span>
          {!ehVendaBalcao(ordem) && (
            <span
              className={`${opcao1 ? "hidden min-[1600px]:block" : "flex flex-col items-end"} whitespace-nowrap text-meta text-texto-2 tabular-nums`}
            >
              <span>peças {formatarMoeda(totalPorTipo(itens, "peca"))}</span>
              {opcao1 ? " · " : null}
              <span>serv. {formatarMoeda(totalPorTipo(itens, "servico"))}</span>
            </span>
          )}
          <span className={opcao1 ? "hidden min-[1280px]:block" : ""}>{textoLucro(ordem)}</span>
        </div>
      </div>
    );
  }

  // Ordens em aberto (ainda não faturadas) sempre aparecem, não importa a
  // data — senão uma OS esquecida do mês passado sumiria da lista sem
  // ninguém perceber. O filtro de período só afasta o histórico já faturado,
  // que é o que realmente cresce sem parar. Buscando por cliente/placa, o
  // período é ignorado (a busca vale pra qualquer época).
  //
  // Orçamento (#379) não aparece aqui: a lista de OS mostra só OS e venda;
  // orçamento tem a lista dele. A regra é a mesma de todo número da loja
  // (`contaNosNumeros`).
  const ordensFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();
    return ordens.filter((ordem) => {
      if (!contaNosNumeros(ordem)) return false;
      if (buscaNormalizada) {
        const nomeCliente = ordem.cliente?.nome?.toLowerCase() ?? "";
        const placa = ordem.veiculo?.placa?.toLowerCase() ?? "";
        return nomeCliente.includes(buscaNormalizada) || placa.includes(buscaNormalizada);
      }
      if (ordem.status !== "faturada" || periodo === "tudo") return true;
      // `data_abertura` vem do banco em UTC: o dia tem de ser o do fuso local
      // (`diaLocal`), senão uma OS aberta depois das ~21h vira "amanhã" e
      // some do filtro "Até: hoje".
      const dia = diaLocal(ordem.data_abertura);
      const [de, ate] =
        periodo === "mes" ? [primeiroDiaDoMesLocal(), hojeLocal()] : [dataInicio, dataFim];
      return dia >= de && dia <= ate;
    });
  }, [ordens, busca, periodo, dataInicio, dataFim]);

  // Loja que só tem orçamento ainda não tem OS nenhuma: abas, filtro e o
  // "nenhuma OS" olham isto, não o total que veio do banco.
  const temOrdens = useMemo(() => ordens.some(contaNosNumeros), [ordens]);

  // As duas abas da lista (item FN-09): a venda de balcão fica separada das
  // OS, senão a lista de "carros atendidos" se enche de venda de palheta.
  const quantasVendas = ordensFiltradas.filter(ehVendaBalcao).length;
  const quantasOs = ordensFiltradas.length - quantasVendas;
  const ordensDaLista = ordensFiltradas.filter(
    (ordem) => ehVendaBalcao(ordem) === (lista === "vendas"),
  );
  // A aba tem alguma coisa, em qualquer época? Lista vazia com o período
  // ligado diz "nada nesse período" e oferece limpar, e não "comece aqui".
  const abaTemAlgo = ordens.some(
    (ordem) => contaNosNumeros(ordem) && ehVendaBalcao(ordem) === (lista === "vendas"),
  );
  const nadaAberto =
    !mostrarFormulario && !ordemEmEdicao && !mostrarVenda && !vendaAberta && !ordemFaturando;
  // OS ou venda aberta ocupa a tela inteira, sem a lista (visual novo, #1087).
  // A lista só deixa de ser desenhada: busca, período e aba continuam no state
  // da página, e o Voltar devolve a rolagem de onde ela estava.
  const paginaPropria = mostrarFormulario || !!ordemEmEdicao || mostrarVenda || !!vendaAberta;
  const raizRef = useRef<HTMLDivElement>(null);
  const rolagemDaListaRef = useRef<PosicaoDeRolagem | null>(null);
  const paginaPropriaRef = useRef(paginaPropria);
  paginaPropriaRef.current = paginaPropria;
  const estavaEmPaginaPropria = useRef(false);

  useEffect(() => {
    // Rolagem não borbulha: escuta na captura, no documento, e guarda a
    // posição de quem rolou (a área do conteúdo no app) enquanto a lista
    // está na tela.
    function aoRolar(evento: Event) {
      if (paginaPropriaRef.current || !raizRef.current) return;
      const posicao = posicaoDaRolagem(evento.target, raizRef.current);
      if (posicao) rolagemDaListaRef.current = posicao;
    }
    document.addEventListener("scroll", aoRolar, true);
    return () => document.removeEventListener("scroll", aoRolar, true);
  }, []);

  useLayoutEffect(() => {
    const raiz = raizRef.current;
    if (paginaPropria) {
      if (raiz) rolarParaOTopo(raiz, rolagemDaListaRef.current);
    } else if (estavaEmPaginaPropria.current) {
      devolverRolagem(rolagemDaListaRef.current);
      // Depois da pintura, caso o layout ainda tenha mexido na altura.
      requestAnimationFrame(() => devolverRolagem(rolagemDaListaRef.current));
    }
    estavaEmPaginaPropria.current = paginaPropria;
  }, [paginaPropria]);

  // A lista nem chegou: o erro fica dentro dela, com o "Tentar de novo". Com
  // a lista na tela, o erro (de faturar, do WhatsApp) fica no aviso de cima.
  const listaComErro = !!erro && ordens.length === 0;
  // O erro de uma ação da linha (o WhatsApp, por exemplo) aparece no aviso lá
  // em cima: com a lista rolada até a OS 40, ninguém o veria. A tela rola até
  // ele (#1091, revisão).
  const avisoDeErroRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!erro) return;
    const reduzir =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    avisoDeErroRef.current?.scrollIntoView?.({ block: "nearest", behavior: reduzir ? "auto" : "smooth" });
  }, [erro]);

  // Devolve as ordens recarregadas (ou null se nem chegou a consultar): quem
  // corrige um item precisa da versão nova da OS que está aberta na tela, e
  // `setOrdens` sozinho não serve — `ordemEmEdicao` é um estado à parte.
  //
  // Só a carga mais nova grava (#903): trocar de loja ou salvar uma OS enquanto
  // a carga anterior ainda busca dispara outra, e a velha pode terminar depois
  // — com a lista, o custo e as notas de antes. A que perdeu a vez não grava
  // nada; devolve a lista que buscou só se ainda é a mesma loja (quem salvou
  // precisa dela pra seguir pra nota ou atualizar a OS aberta), senão null.
  // Um `carregar` guardado de antes da troca de loja (um salvar lento) não
  // começa: senão ele viraria a carga mais nova e gravaria a loja antiga.
  const cargaAtual = useRef(0);
  const lojaNaTela = useRef(lojaAtual?.id);
  useEffect(() => {
    lojaNaTela.current = lojaAtual?.id;
  }, [lojaAtual?.id]);
  async function carregar(): Promise<OrdemServico[] | null> {
    if (!lojaAtual) {
      setCarregando(false);
      return null;
    }
    const lojaId = lojaAtual.id;
    if (lojaId !== lojaNaTela.current) return null;
    const minhaCarga = ++cargaAtual.current;
    const aindaEhAtual = () => minhaCarga === cargaAtual.current;
    const descartada = (ordens: OrdemServico[]) =>
      lojaId === lojaNaTela.current ? ordens : null;
    setCarregando(true);
    setErro(null);
    try {
      const [
        ordensCarregadas,
        clientesCarregados,
        pecasCarregadas,
        servicosCarregados,
        funcionariosCarregados,
        jurosCarregados,
        modelosWhatsappCarregados,
      ] = await Promise.all([
        listarOrdens(lojaId),
        listarClientesParaEscolha(podeVerCadastro),
        listarPecasJanela(),
        listarServicos(),
        listarFuncionariosPublico(lojaId),
        listarJurosParcelas(lojaId),
        listarModelosWhatsapp(lojaId),
      ]);

      // Custo e notas de todas as OS de uma vez só (uma consulta, não uma por
      // linha), as duas juntas. Falhar numa delas não derruba a lista: sem
      // custo, a coluna Lucro mostra "custo não informado"; sem notas, a OS só
      // aparece como "Faturada", que é o comportamento de antes.
      const ids = ordensCarregadas.map((o) => o.id);
      const [custo, notas, link] = await Promise.allSettled([
        buscarCustoDasOrdens(ids),
        listarArquivosDasOrdens(ids),
        // async: um erro ao CHAMAR (e não só ao esperar) também cai no allSettled.
        (async () => buscarLinkAvaliacao(lojaId))(),
      ]);
      if (!aindaEhAtual()) return descartada(ordensCarregadas);

      setOrdens(ordensCarregadas);
      setClientes(clientesCarregados);
      setPecas(pecasCarregadas);
      setServicos(servicosCarregados);
      setFuncionarios(funcionariosCarregados);
      setJurosParcelas(jurosCarregados);
      setModelosWhatsapp(modelosWhatsappCarregados);
      // Falhou (banco sem a migration 0082, por exemplo): trata como sem link.
      if (link.status === "fulfilled") {
        setLinkAvaliacao(link.value);
      } else {
        console.error("Erro ao carregar o link de avaliação:", link.reason);
        setLinkAvaliacao(null);
      }
      if (custo.status === "fulfilled") {
        setCustoDasOrdens(custo.value);
      } else {
        console.error("Erro ao carregar o custo das ordens:", custo.reason);
        // O custo guardado é da carga anterior: com ele a coluna mostraria
        // lucro de itens novos com custo velho. Melhor "custo não informado".
        setCustoDasOrdens(new Map());
      }
      if (notas.status === "fulfilled") {
        setNotasPorOrdem(agruparNotasPorOrdem(notas.value));
      } else {
        console.error("Erro ao carregar as notas fiscais das ordens:", notas.reason);
      }

      setCargaFalhou(false);
      abrirOrdemPedida(ordensCarregadas);

      return ordensCarregadas;
    } catch (err) {
      if (!aindaEhAtual()) return null;
      console.error("Erro ao carregar ordens de serviço:", err);
      setErro(mensagemDeErro(err));
      setCargaFalhou(true);
      return null;
    } finally {
      if (aindaEhAtual()) setCarregando(false);
    }
  }

  // Quem chega aqui com "abra esta OS" (Início, ficha do carro, a busca do
  // Ctrl+K...) manda o id no `state` da navegação. Abre e limpa o pedido, pra
  // ele não abrir de novo a cada carga.
  function abrirOrdemPedida(lista: OrdemServico[]) {
    const pedido = location.state as { abrirOrdemId?: string; voltarAoFechar?: boolean } | null;
    const abrirOrdemId = pedido?.abrirOrdemId;
    if (!abrirOrdemId) return;
    const ordemParaAbrir = lista.find((o) => o.id === abrirOrdemId);
    // Só vale se a OS abriu de verdade. A troca de `state` abaixo usa
    // `replace`, então a entrada anterior do histórico continua sendo a ficha.
    setVoltarAoFechar(!!ordemParaAbrir && pedido?.voltarAoFechar === true);
    if (ordemParaAbrir && ehVendaBalcao(ordemParaAbrir)) {
      setLista("vendas");
      setVendaAberta(ordemParaAbrir);
    } else if (ordemParaAbrir) {
      setOrdemEmEdicao(ordemParaAbrir);
    }
    navigate(location.pathname, { replace: true, state: null });
  }

  // A carga que falhou busca de novo sozinha quando a internet volta; a lista
  // que está funcionando não recarrega (#1017).
  useRecarregarQuandoVoltar(cargaFalhou, () => void carregar());

  useEffect(() => {
    // Loja nova começa na aba das OS: sem isto, a loja anterior em "Vendas"
    // deixava a nova falando de venda de balcão (#1091, revisão).
    setLista("os");
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  // O pedido chegou com a tela JÁ aberta (a busca do Ctrl+K usada de dentro
  // da tela de OS, PR #857): a carga não roda de novo, então abre pela lista
  // que já está na tela. Durante a carga, quem abre é a própria carga.
  useEffect(() => {
    if (carregando) return;
    abrirOrdemPedida(ordens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // O histórico só existe em OS faturada. Se não carregar (banco ainda sem a
  // migration 0087), a OS segue sem ele: é só um registro.
  const idDaFaturadaAberta = ordemEmEdicao?.status === "faturada" ? ordemEmEdicao.id : null;
  useEffect(() => {
    setTrocasDaOrdem([]);
    if (!idDaFaturadaAberta) return;
    let cancelado = false;
    listarTrocasDaOrdem(idDaFaturadaAberta)
      .then((lista) => {
        if (!cancelado) setTrocasDaOrdem(lista);
      })
      .catch((err) => console.error("Erro ao carregar o histórico de trocas da OS:", err));
    return () => {
      cancelado = true;
    };
  }, [idDaFaturadaAberta, versaoDasTrocas]);

  // Recarrega a cada abertura do formulário (em vez de guardar pra sempre):
  // lançar peça numa OS mexe no estoque, então um saldo guardado da vez
  // anterior mostraria número velho na próxima abertura.
  const formularioAberto = mostrarFormulario || !!ordemEmEdicao || mostrarVenda;
  useEffect(() => {
    if (!formularioAberto || !lojaAtual) {
      setSaldoPorPeca(null);
      return;
    }
    let cancelado = false;
    listarSaldos(lojaAtual.id)
      .then((saldos) => {
        if (!cancelado) setSaldoPorPeca(saldos);
      })
      .catch((err) => {
        // Falhar aqui não pode derrubar o formulário: sem o saldo, a OS
        // continua funcionando exatamente como funcionava antes deste aviso
        // existir.
        console.error("Erro ao carregar o saldo de estoque:", err);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formularioAberto, lojaAtual?.id]);

  async function handleSalvarNova(ordem: NovaOrdemServico, itens: NovoItemOS[]) {
    if (!operador || !lojaAtual) return;
    await criarOrdem(ordem, itens, operador.id, lojaAtual.id);
    setMostrarFormulario(false);
    await carregar();
  }

  async function handleSalvarEdicao(
    id: string,
    patch: PatchOrdemServico,
    novosItens: NovoItemOS[],
  ) {
    if (!operador || !lojaAtual) return;
    if (novosItens.length > 0 && ordemEmEdicao?.status === "faturada") {
      throw new Error(
        "Esta OS já foi faturada — não dá mais pra acrescentar peça ou serviço nela.",
      );
    }
    await atualizarOrdem(id, patch, operador.id);
    if (novosItens.length > 0 && ordemEmEdicao) {
      await adicionarItensOrdem(id, novosItens, operador.id);
    }
    setOrdemEmEdicao(null);
    await carregar();
  }

  // Corrigir um item já lançado é salvo na hora, item por item — não espera o
  // "Salvar alterações" da OS, que cuida só dos campos de cima e dos itens
  // novos. A trava de OS faturada é repetida aqui de propósito: a tela já
  // esconde o botão, mas quem grava não pode depender disso (mesmo cuidado de
  // `handleSalvarEdicao`).
  async function handleEditarItem(item: ItemOS, patch: PatchItemOS) {
    if (!operador || !lojaAtual || !ordemEmEdicao) return;
    if (ordemEmEdicao.status === "faturada") {
      throw new Error(
        "Esta OS já foi faturada — não dá mais pra corrigir peça ou serviço nela.",
      );
    }
    await editarItemOrdem(item, patch, operador.id);
    await recarregarOrdemEmEdicao();
  }

  // Corrigir peça, serviço e valor de OS ou venda já faturada (#1145, #1182).
  // O banco confere tudo de novo (gerente, nota, caixa de hoje, total, estoque).
  // Depois: a OS, o histórico e o saldo recarregam (a correção mexeu no estoque).
  function situacaoDaCorrecao(ordem: OrdemServico) {
    return buscarSituacaoDaCorrecao(ordem, hojeLocal());
  }

  async function handleTrocarItensFaturada(ordem: OrdemServico, correcao: ConfirmacaoDaCorrecao) {
    if (!operador || !lojaAtual) throw new Error("Entre de novo no programa e tente outra vez.");
    await corrigirOrdemFaturada({ ordem, ...correcao, hoje: hojeLocal(), operadorId: operador.id });
    // Daqui pra baixo a troca já está gravada: recarregar é só mostrar. Se
    // falhar, a janela fecha do mesmo jeito (tentar de novo seria trocar de
    // novo uma lista que já mudou).
    avisar(`${nomeDocumento(ordem)}: ${avisoDaCorrecao(correcao)}`);
    setVersaoDasTrocas((v) => v + 1);
    listarSaldos(lojaAtual.id)
      .then(setSaldoPorPeca)
      .catch((err) => console.error("Erro ao recarregar o saldo depois da troca:", err));
    try {
      const atualizadas = await carregar();
      const atualizada = atualizadas?.find((o) => o.id === ordem.id);
      if (atualizada) {
        if (ordemEmEdicao?.id === ordem.id) setOrdemEmEdicao(atualizada);
        if (vendaAberta?.id === ordem.id) setVendaAberta(atualizada);
      }
    } catch (err) {
      console.error("A correção foi feita, mas a OS não recarregou:", err);
      avisar("A correção foi feita, mas a OS não recarregou. Feche e abra a OS de novo pra ver.");
    }
  }

  // Traz a OS aberta de novo depois de mexer num item: a corrigida acima, ou
  // a peça avulsa que ganhou cadastro na janela da nota (#655), senão a aba
  // Fechamento continuaria mostrando a peça como avulsa.
  // Depois de cancelar a nota pela faixa "Corrigir a OS" (#1182): só as notas,
  // pra faixa voltar a mostrar "Corrigir a OS". Falhar não derruba nada.
  async function recarregarNotas() {
    try {
      const notas = await listarArquivosDasOrdens(ordens.map((o) => o.id));
      setNotasPorOrdem(agruparNotasPorOrdem(notas));
    } catch (err) {
      console.error("Erro ao recarregar as notas fiscais das ordens:", err);
    }
  }

  async function recarregarOrdemEmEdicao() {
    const ordensAtualizadas = await carregar();
    const ordemAtualizada = ordensAtualizadas?.find((o) => o.id === ordemEmEdicao?.id);
    if (ordemAtualizada) setOrdemEmEdicao(ordemAtualizada);
  }

  // "Seu carro está pronto" (item FN-03). O total sai da MESMA função que a
  // coluna Total da lista usa — se um dia a conta mudar, a mensagem muda
  // junto, em vez de virar a quinta versão divergente do mesmo número
  // (PROJETO_STATUS.md, seção 6, item 40).
  function textoCarroPronto(ordem: OrdemServico): string {
    const veiculo = [ordem.veiculo?.marca, ordem.veiculo?.modelo].filter(Boolean).join(" ");
    return preencherModelo(textoDoModelo(modelosWhatsapp, "carro_pronto"), {
      cliente: ordem.cliente?.nome,
      veiculo: veiculo || "veículo",
      placa: ordem.veiculo?.placa,
      valor: formatarMoeda(totalOrdem(ordem.itens ?? [])),
      os: nomeDocumento(ordem),
      loja: lojaAtual?.nome,
    });
  }

  // "Avisar" (o carro está pronto): o carro só fica pronto pra retirar quando a
  // OS é concluída ou faturada — antes disso o aviso seria mentira. Sem o
  // módulo Clientes o telefone não chega (a janela da migration 0068 só tem o
  // nome), e o botão diria "cadastro sem telefone" — então some. Venda de
  // balcão não tem carro.
  function avisoCarroPronto(ordem: OrdemServico) {
    if (!podeVerCadastro || !STATUS_COM_FECHAMENTO.includes(ordem.status)) return undefined;
    if (ehVendaBalcao(ordem)) return undefined;
    const telefone = clientes.find((c) => c.id === ordem.cliente_id)?.telefone ?? null;
    return {
      telefone,
      texto: textoCarroPronto(ordem),
      aoAbrir: () => {
        if (!lojaAtual) return;
        registrarMensagemAberta(lojaAtual.id, "carro_pronto", ordem.id, telefone, operador?.id ?? null);
      },
    };
  }

  // "Avaliação" (#459): só na OS/venda faturada, com o link da loja e com o
  // módulo Clientes (sem ele o telefone não chega). Ausente = sem botão.
  // A venda do Consumidor também fica sem: não tem cadastro nem telefone, e o
  // botão só serviria pra dar erro.
  function pedidoDeAvaliacao(ordem: OrdemServico) {
    if (!podeVerCadastro || ordem.status !== "faturada" || !linkAvaliacao) return undefined;
    if (ehConsumidor(ordem.cliente_id)) return undefined;
    const telefone = clientes.find((c) => c.id === ordem.cliente_id)?.telefone ?? null;
    return {
      telefone,
      texto: montarTextoAvaliacao({
        cliente: ordem.cliente?.nome,
        loja: lojaAtual?.nome,
        link: linkAvaliacao,
        modelo: textoDoModelo(modelosWhatsapp, "avaliacao"),
      }),
      aoAbrir: () => {
        if (!lojaAtual) return;
        registrarMensagemAberta(
          lojaAtual.id,
          "avaliacao",
          ordem.id,
          telefone,
          operador?.id ?? null,
        );
      },
    };
  }

  // Cadastro rápido de dentro da OS (item TL-08). Os dois recarregam a lista
  // de clientes antes de devolver o id: é o que faz o registro novo já
  // aparecer escolhido no campo, em vez de o operador ter que procurá-lo.
  async function handleCadastrarCliente(cliente: NovoCliente, veiculos: VeiculoFormulario[]) {
    // Vai por função do banco (migration 0068): quem tem OS pode não ter Clientes.
    const { clienteId, veiculoId } = await cadastrarClienteRapido(cliente, veiculos[0] ?? null);
    setClientes(await listarClientesParaEscolha(podeVerCadastro));
    return { clienteId, veiculoId };
  }

  async function handleCadastrarVeiculo(clienteId: string, veiculo: VeiculoFormulario) {
    const veiculoId = await cadastrarVeiculoRapido(clienteId, veiculo);
    setClientes(await listarClientesParaEscolha(podeVerCadastro));
    return veiculoId;
  }

  // A venda de balcão grava e fatura num passo só. Duas saídas de erro, e
  // elas pedem reações opostas (ver `registrarVendaBalcao`):
  //   • qualquer erro comum volta pra tela de pagamento, que o mostra — a
  //     venda foi desfeita e tentar de novo é seguro;
  //   • `VendaSemFaturamentoError` NÃO volta: a venda existe e já baixou o
  //     estoque, e um segundo "Confirmar venda" registraria outra. Então o
  //     formulário fecha, a venda aparece na lista, e o erro fica no topo da
  //     página dizendo pra faturar a que já existe.
  async function handleRegistrarVenda(
    venda: DadosVendaBalcao,
    itens: NovoItemOS[],
    pagamento: PagamentoDaVenda,
  ) {
    if (!operador || !lojaAtual) return;
    try {
      const { ordem: criada, avisoTaxa } = await registrarVendaBalcao(
        venda,
        itens,
        pagamento,
        operador.id,
        lojaAtual.id,
      );
      setMostrarVenda(false);
      setLista("vendas");
      const recarregadas = await carregar();
      avisar(`${nomeDocumento(criada)} registrada`);
      // A venda saiu; só a taxa da maquininha não foi guardada (#387). Depois
      // do `carregar`, que limpa o aviso do topo.
      if (avisoTaxa) setErro(avisoTaxa);
      const completa = recarregadas?.find((o) => o.id === criada.id);
      if (completa) setVendaParaNota(completa);
    } catch (err) {
      if (!(err instanceof VendaSemFaturamentoError)) throw err;
      setMostrarVenda(false);
      setLista("vendas");
      await carregar();
      setErro(err.message);
    }
  }

  async function handleCadastrarClienteDaVenda(cliente: NovoCliente) {
    const { clienteId } = await cadastrarClienteRapido(cliente, null);
    setClientes(await listarClientesParaEscolha(podeVerCadastro));
    return clienteId;
  }

  // Fecha tudo que estiver aberto antes de abrir outra coisa: a página só
  // mostra um formulário por vez.
  function fecharPaineis() {
    setVoltarAoFechar(false);
    setMostrarFormulario(false);
    setOrdemEmEdicao(null);
    setOrdemFaturando(null);
    setMostrarVenda(false);
    setVendaAberta(null);
  }

  async function handleEncerrar(ordem: OrdemServico) {
    if (!operador) return;
    await concluirOrdem(ordem.id, operador.id);
    // A OS continua aberta, agora no passo "receber" da trilha (#1088), e o
    // Faturar abre por cima dela: faturou, ela já mostra o passo da nota.
    const concluida: OrdemServico = { ...ordem, status: "concluida" };
    setOrdemEmEdicao(concluida);
    setOrdemFaturando(concluida);
    await carregar();
  }

  async function confirmarFaturamento(
    pagamentos: PagamentoOrdem[],
    parcelas: number,
    previsaoRecebimento: string | null,
  ) {
    if (!ordemFaturando || !operador) return;
    let avisoTaxa: string | null;
    try {
      ({ avisoTaxa } = await faturarOrdem(
        ordemFaturando,
        pagamentos,
        parcelas,
        previsaoRecebimento,
        operador.id,
        totalOrdem(ordemFaturando.itens ?? []),
      ));
    } catch (err) {
      if (err instanceof OrdemMudouError) {
        // O banco recusou e nada foi lançado (a lib garante). Recarrega a OS
        // pra pessoa ver o total novo e conferir antes de faturar de novo.
        const id = ordemFaturando.id;
        const recarregadas = await carregar();
        const atual = recarregadas?.find((o) => o.id === id);
        if (!atual || atual.status === "faturada") {
          // Sumiu ou alguém já faturou: não há mais o que faturar aqui. O
          // `carregar` limpa o aviso, então ele é posto depois. A OS aberta
          // (o passo "receber" da trilha, #1088) ganha o status novo.
          if (atual) setOrdemEmEdicao((aberta) => (aberta?.id === atual.id ? atual : aberta));
          setOrdemFaturando(null);
          setErro(err.message);
          return;
        }
        setOrdemFaturando(atual);
      }
      // O cartão mostra a mensagem (e não cobra nada).
      throw err;
    }
    const faturada = ordemFaturando;
    // Deu certo: a janela fecha e sai a confirmação que some sozinha ("OS 148
    // faturada"). Se `faturarOrdem` falhou, nada disto roda: o erro volta pro
    // `FaturamentoCard`, que o mostra dentro da janela, do lado do botão.
    setOrdemFaturando(null);
    setVendaAberta(null);
    avisar(`${nomeDocumento(faturada)} faturada`);
    // A OS aberta (o passo "receber" da trilha, #1088) anda na hora, sem
    // esperar a lista: o "Receber" não fica na tela pra um segundo clique.
    setOrdemEmEdicao((atual) => (atual?.id === faturada.id ? { ...atual, status: "faturada" } : atual));
    const recarregadas = await carregar();
    // Faturada de dentro da OS aberta (o passo "receber" da trilha, #1088): a
    // OS aberta ganha o status novo e a trilha anda pra nota fiscal.
    // Com a lista nova, a OS aberta ganha o resto (a data de fechamento).
    const aberta = recarregadas?.find((o) => o.id === faturada.id);
    if (aberta) setOrdemEmEdicao((atual) => (atual?.id === aberta.id ? aberta : atual));
    // Faturada; só a taxa da maquininha não foi guardada (#387).
    if (avisoTaxa) setErro(avisoTaxa);
    // Venda de balcão faturada pela lista (a que ficou sem pagamento) segue
    // pro mesmo lugar que uma venda nova: a NFC-e.
    if (ehVendaBalcao(faturada)) {
      const completa = recarregadas?.find((o) => o.id === faturada.id);
      if (completa) setVendaParaNota(completa);
    }
  }

  // As ações de WhatsApp da linha (Avisar e Avaliação). O botão da linha (e o
  // menu, que fecha no clique) não têm onde guardar o erro (o mais comum:
  // telefone sem DDD), então ele vai pro aviso de erro da tela, com o nome da
  // OS na frente, e não some sozinho.
  async function abrirWhatsappDaLinha(
    ordem: OrdemServico,
    pedido: { telefone: string | null | undefined; texto: string; aoAbrir: () => void },
  ) {
    setErro(null);
    try {
      await abrirConversaWhatsapp(pedido.telefone, pedido.texto);
      pedido.aoAbrir();
    } catch (err) {
      console.error("Erro ao abrir o WhatsApp:", err);
      setErro(`${nomeDocumento(ordem)}: ${mensagemDeErro(err)}`);
    }
  }

  function abrirOrdem(ordem: OrdemServico, aba: "detalhes" | "fechamento" = "detalhes") {
    fecharPaineis();
    if (ehVendaBalcao(ordem)) {
      setVendaAberta(ordem);
      return;
    }
    setAbaInicialEdicao(aba);
    setOrdemEmEdicao(ordem);
  }

  // As ações de uma linha (molde de lista, #1091): na linha fica UMA ação, o
  // próximo passo; o resto vai pro "⋯". Nenhuma ação sumiu, e cada uma
  // aparece nas mesmas condições de antes:
  //   • não faturada → "Faturar"; "Avisar o cliente" (se concluída) e
  //     "Fechamento" (se concluída) vão pro menu;
  //   • faturada que ainda falta nota → "Emitir nota" (abre o Fechamento,
  //     onde a nota é emitida); "Avisar o cliente" vai pro menu;
  //   • finalizada (todas as notas saíram) → "Nota do cliente" (o pedido da
  //     Sofia de 15/11: a nota à mão depois de faturar), e o "Avisar o
  //     cliente" vai pro menu (antes os dois ficavam lado a lado; o molde
  //     deixa um só na linha). Sem nota pra mostrar, o "Avisar" volta pra linha;
  //   • "Fechamento", "Avaliação", a ficha do veículo (antes, a placa na
  //     tabela) e "Abrir a OS" ficam no menu.
  function acoesDaLinha(ordem: OrdemServico): { acao?: AcaoDaLinhaDoMolde; mais: ItemDoMais[] } {
    const venda = ehVendaBalcao(ordem);
    const aviso = avisoCarroPronto(ordem);
    const avaliacao = pedidoDeAvaliacao(ordem);
    const notas = notasPorOrdem.get(ordem.id) ?? [];
    const situacao = situacaoFiscalOrdem(ordem.itens ?? [], notas);
    const faltaNota = ordem.status === "faturada" && situacao.pendentes.length > 0;
    const notasParaVer = ordemEstaFinalizada(ordem, situacao) ? notasDoCliente(notas) : [];
    const proximo: "faturar" | "emitir" | "nota" | "avisar" | null =
      ordem.status !== "faturada"
        ? "faturar"
        : faltaNota
          ? "emitir"
          : notasParaVer.length > 0
            ? "nota"
            : aviso
              ? "avisar"
              : null;

    let acao: AcaoDaLinhaDoMolde | undefined;
    if (proximo === "faturar") {
      acao = {
        rotulo: "Faturar",
        aoClicar: () => {
          fecharPaineis();
          setOrdemFaturando(ordem);
        },
      };
    } else if (proximo === "emitir") {
      acao = { rotulo: "Emitir nota", aoClicar: () => abrirOrdem(ordem, "fechamento") };
    } else if (proximo === "nota") {
      acao = {
        rotulo: "Nota do cliente",
        aoClicar: () => {
          setErro(null);
          setNotaDoCliente({ documento: nomeDocumento(ordem), venda, notas: notasParaVer });
        },
      };
    } else if (proximo === "avisar" && aviso) {
      acao = { rotulo: "Avisar", aoClicar: () => void abrirWhatsappDaLinha(ordem, aviso) };
    }

    const mais: ItemDoMais[] = [];
    if (aviso && proximo !== "avisar") {
      mais.push({
        rotulo: "Avisar o cliente",
        icone: <MessageCircle />,
        aoClicar: () => void abrirWhatsappDaLinha(ordem, aviso),
      });
    }
    if (STATUS_COM_FECHAMENTO.includes(ordem.status)) {
      mais.push({
        rotulo: "Fechamento",
        icone: <Receipt />,
        aoClicar: () => abrirOrdem(ordem, "fechamento"),
      });
    }
    if (avaliacao) {
      mais.push({
        rotulo: "Avaliação",
        icone: <Star />,
        aoClicar: () => void abrirWhatsappDaLinha(ordem, avaliacao),
      });
    }
    if (!venda && ordem.veiculo_id) {
      const veiculoId = ordem.veiculo_id;
      mais.push({
        rotulo: "Ficha do veículo",
        icone: <CarFront />,
        aoClicar: () => navigate(`/veiculos/${veiculoId}`),
      });
    }
    mais.push({
      rotulo: venda ? "Abrir a venda" : "Abrir a OS",
      icone: <FolderOpen />,
      aoClicar: () => abrirOrdem(ordem),
    });
    return { acao, mais };
  }

  // Uma linha do molde: o cliente e o carro em cima; embaixo, o número, a
  // placa e o dia. Clicar no nome abre a OS (ou a venda).
  function linhaDaOrdem(ordem: OrdemServico) {
    const venda = ehVendaBalcao(ordem);
    const carro = [ordem.veiculo?.marca, ordem.veiculo?.modelo].filter(Boolean).join(" ");
    const { acao, mais } = acoesDaLinha(ordem);
    const detalhe = (
      <DetalheDaLinha
        partes={[
          nomeDocumento(ordem),
          !venda ? ordem.veiculo?.placa : null,
          `${venda ? "" : "aberta "}${dataCurta(ordem.data_abertura)}`,
        ]}
      />
    );
    return (
      <LinhaDeLista
        nome={
          <>
            <span>{ordem.cliente?.nome ?? "—"}</span>
            {carro && <span className="font-normal text-texto-2"> · {carro}</span>}
          </>
        }
        descricao={nomeDocumento(ordem)}
        detalhe={detalhe}
        aoAbrir={() => abrirOrdem(ordem)}
        lado={ladoDaLinha(ordem)}
        acao={acao}
        mais={mais}
      />
    );
  }

  return (
    <div ref={raizRef} className="space-y-6">
      {!paginaPropria && (
      <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="text-titulo font-semibold text-texto">Ordens de Serviço</h1>
            <p className="text-corpo text-texto-2">
              Cliente + veículo + peças usadas + serviço realizado
            </p>
          </div>
        </div>
        {nadaAberto && operador && lojaAtual && (
          <div className="flex gap-3">
            <Botao
              icone={<Plus />}
              onClick={() => {
                fecharPaineis();
                setMostrarVenda(true);
              }}
            >
              Venda de balcão
            </Botao>
            {clientes.length > 0 && (
              <Botao
                variante="principal"
                icone={<Plus />}
                onClick={() => {
                  fecharPaineis();
                  setMostrarFormulario(true);
                }}
              >
                Nova ordem de serviço
              </Botao>
            )}
          </div>
        )}
      </header>

      {!carregando && !lojaAtual && (
        <p className="flex items-start gap-2 rounded-xl bg-atencao/[0.12] px-4 py-3 text-corpo text-atencao">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Seu usuário não tem loja atribuída. Fale com o administrador.
        </p>
      )}

      {/* Sem a carga (sem internet), a lista de clientes também não veio: o
          aviso diria que não há cliente cadastrado (#1017). */}
      {!carregando && lojaAtual && !cargaFalhou && clientes.length === 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-atencao/[0.12] px-4 py-3 text-corpo text-atencao">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Cadastre ao menos um cliente antes de abrir uma ordem de serviço.
        </p>
      )}
      </>
      )}

      {mostrarFormulario && operador && (
        <OrdemServicoForm
          clientes={clientes}
          pecas={pecas}
          servicos={servicos}
          funcionarios={funcionarios}
          funcionarioAtualId={funcionarioAtualId}
          ordens={ordens}
          saldoPorPeca={saldosParaForm}
          saldoCarregado={saldoPorPeca !== null}
          onSalvarNova={handleSalvarNova}
          onSalvarEdicao={handleSalvarEdicao}
          onEditarItem={handleEditarItem}
          onEncerrar={handleEncerrar}
          onCadastrarCliente={handleCadastrarCliente}
          onCadastrarVeiculo={handleCadastrarVeiculo}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {ordemEmEdicao && operador && (
        <OrdemServicoForm
          clientes={clientes}
          pecas={pecas}
          servicos={servicos}
          funcionarios={funcionarios}
          funcionarioAtualId={funcionarioAtualId}
          ordens={ordens}
          saldoPorPeca={saldosParaForm}
          saldoCarregado={saldoPorPeca !== null}
          ordemExistente={ordemEmEdicao}
          temNotaEmitida={temAlgumaNotaValida(notasPorOrdem.get(ordemEmEdicao.id) ?? [])}
          abaInicial={abaInicialEdicao}
          onItensMudaram={recarregarOrdemEmEdicao}
          gerente={operador.admin}
          onReceber={(ordem) => setOrdemFaturando(ordem)}
          avisoCarroPronto={avisoCarroPronto(ordemEmEdicao)}
          onTrocarItensFaturada={handleTrocarItensFaturada}
          buscarSituacaoDaCorrecao={situacaoDaCorrecao}
          notaParaCancelar={notaVigenteDaOrdem(notasPorOrdem.get(ordemEmEdicao.id) ?? [])}
          onNotaCancelada={recarregarNotas}
          trocas={trocasDaOrdem}
          onSalvarNova={handleSalvarNova}
          onSalvarEdicao={handleSalvarEdicao}
          onEditarItem={handleEditarItem}
          onEncerrar={handleEncerrar}
          onCadastrarCliente={handleCadastrarCliente}
          onCadastrarVeiculo={handleCadastrarVeiculo}
          onCancelar={() => {
            if (voltarAoFechar) {
              navigate(-1);
              return;
            }
            setOrdemEmEdicao(null);
          }}
        />
      )}

      {mostrarVenda && operador && (
        <VendaBalcaoForm
          clientes={clientes}
          pecas={pecas}
          funcionarios={funcionarios}
          funcionarioAtualId={funcionarioAtualId}
          saldoPorPeca={saldosParaForm}
          saldoCarregado={saldoPorPeca !== null}
          jurosParcelas={jurosParcelas}
          onRegistrar={handleRegistrarVenda}
          onCadastrarCliente={handleCadastrarClienteDaVenda}
          podeVerCadastro={podeVerCadastro}
          onCancelar={() => setMostrarVenda(false)}
        />
      )}

      {vendaAberta && (
        <VendaBalcaoDetalhe
          ordem={vendaAberta}
          notas={notasPorOrdem.get(vendaAberta.id) ?? []}
          onFaturar={() => setOrdemFaturando(vendaAberta)}
          pedirAvaliacao={pedidoDeAvaliacao(vendaAberta)}
          correcao={{
            gerente: operador?.admin ?? false,
            pecas,
            servicos,
            funcionarios,
            saldoPorPeca: saldosParaForm,
            saldoCarregado: saldoPorPeca !== null,
            buscarSituacao: () => situacaoDaCorrecao(vendaAberta),
            onConfirmar: (c) => handleTrocarItensFaturada(vendaAberta, c),
            onNotaCancelada: recarregarNotas,
          }}
          onVoltar={() => {
            if (voltarAoFechar) {
              navigate(-1);
              return;
            }
            setVendaAberta(null);
            setOrdemFaturando(null);
          }}
        />
      )}

      {/* O Faturar abre numa janela (visual novo, tarefa 7), por cima da
          lista: ela não é mais empurrada pra baixo. */}
      {ordemFaturando && (
        <FaturamentoCard
          ordem={ordemFaturando}
          jurosParcelas={jurosParcelas}
          onConfirmar={confirmarFaturamento}
          onCancelar={() => setOrdemFaturando(null)}
        />
      )}

      {/* Venda registrada: a NFC-e abre sozinha, porque é o passo seguinte
          no balcão. Nada é emitido sem o "Confirmar emissão" dela — fechar
          aqui deixa a nota pra depois (na lista, "Fechamento"). */}
      {vendaParaNota && (
        <EmitirNotaFiscalModal
          ordem={vendaParaNota}
          tipoNota="NFC-e"
          onFechar={() => {
            setVendaParaNota(null);
            void carregar();
          }}
          onEmitido={() => undefined}
        />
      )}

      {notaDoCliente && (
        <NotaDoClienteModal
          documento={notaDoCliente.documento}
          venda={notaDoCliente.venda}
          notas={notaDoCliente.notas}
          onFechar={() => setNotaDoCliente(null)}
        />
      )}

      {erro && !listaComErro && (
        <p
          ref={avisoDeErroRef}
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-perigo/[0.12] px-4 py-3 text-corpo text-perigo"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{erro}</span>
        </p>
      )}

      {!paginaPropria && temOrdens && (
        <Abas
          rotulo="O que mostrar na lista"
          ativa={lista}
          aoEscolher={setLista}
          abas={[
            { valor: "os", nome: "Ordens de serviço", conta: quantasOs },
            { valor: "vendas", nome: "Vendas de balcão", conta: quantasVendas },
          ]}
        />
      )}

      {/* O molde de lista (#1135): busca e período em cima, uma linha por OS
          com o nome em cima e o detalhe embaixo, uma ação na linha. Cabe numa
          janela de 1024 com o menu aberto, sem rolar de lado (#1091). */}
      {!paginaPropria && lojaAtual && (
        // O botão da linha tem sempre a mesma largura ("Faturar" e "Nota do
        // cliente"), nas listas de OS e de Orçamentos: o selo e o valor batem
        // em coluna, linha a linha e de uma lista pra outra (#1091).
        <div className={CLASSE_DA_LISTA}>
          <MoldeLista
            rotulo={lista === "vendas" ? "Vendas de balcão" : "Ordens de serviço"}
            estado={carregando ? "carregando" : listaComErro ? "erro" : "pronto"}
            itens={ordensDaLista}
            chave={(ordem) => ordem.id}
            linha={linhaDaOrdem}
            // Lista ainda sem nada (loja nova, ou só com orçamento): sem busca
            // nem período, como antes; só a frase e o botão pra começar.
            busca={
              temOrdens
                ? {
                    valor: busca,
                    aoMudar: setBusca,
                    rotulo: "Buscar por cliente ou placa",
                    dica: "Ex: João ou ABC1D23",
                  }
                : undefined
            }
            filtros={
              temOrdens && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <Chips
                  rotulo="Período"
                  opcoes={OPCOES_DE_PERIODO.map((opcao) => ({ ...opcao, desligada: !!busca.trim() }))}
                  valor={periodo}
                  aoEscolher={setPeriodo}
                />
                {periodo === "datas" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      aria-label="De"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      disabled={!!busca.trim()}
                      className="sakura-campo sakura-campo-filtro !w-44"
                    />
                    <span className="text-rotulo text-texto-2">até</span>
                    <input
                      type="date"
                      aria-label="Até"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      disabled={!!busca.trim()}
                      className="sakura-campo sakura-campo-filtro !w-44"
                    />
                  </div>
                )}
              </div>
              )
            }
            filtroAtivo={abaTemAlgo && periodo !== "tudo" && !busca.trim()}
            aoLimparFiltros={() => setPeriodo("tudo")}
            vazio={
              lista === "vendas"
                ? {
                    frase: "Nenhuma venda de balcão ainda. A venda de uma peça sem carro aparece aqui.",
                    acao:
                      nadaAberto && operador
                        ? { rotulo: "Venda de balcão", aoClicar: () => setMostrarVenda(true) }
                        : undefined,
                  }
                : {
                    frase: "Nenhuma ordem de serviço ainda. Cada carro atendido aparece aqui.",
                    acao:
                      nadaAberto && operador && clientes.length > 0
                        ? { rotulo: "Nova OS", aoClicar: () => setMostrarFormulario(true) }
                        : undefined,
                  }
            }
            erro={erro ? { mensagem: erro, tentarDeNovo: () => void carregar() } : undefined}
          />
        </div>
      )}
      {!paginaPropria && temOrdens && !carregando && (
        <p className="text-rotulo text-texto-2">
          {busca.trim()
            ? "Buscando em todo o histórico, sem limite de data."
            : lista === "vendas"
              ? "Venda sem pagamento sempre aparece, não importa a data. O período filtra só as já faturadas."
              : "OS em aberto sempre aparecem, não importa a data. O período filtra só o histórico já faturado."}
        </p>
      )}
    </div>
  );
}

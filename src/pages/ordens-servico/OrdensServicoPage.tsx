import {
  FileText,
  FolderOpen,
  MessageCircle,
  Plus,
  Receipt,
  Star,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AcoesDaLinha, type AcaoDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { Dica } from "@/components/Dica";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { avisar } from "@/lib/avisoQueSome";
import { abrirConversaWhatsapp } from "@/lib/whatsapp";
import { useAuth } from "@/contexts/AuthContext";
import { buscarLinkAvaliacao, listarJurosParcelas } from "@/lib/configuracoes";
import { dataCurta, diaLocal, hojeLocal, primeiroDiaDoMesLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import type { CustoDoBanco } from "@/schemas/metricasCaixa";
import { buscarCustoDasOrdens } from "@/lib/caixa";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { LinkPlaca } from "@/components/LinkPlaca";
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
  listarOrdens,
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
} from "@/types/os";
import {
  STATUS_COM_FECHAMENTO,
  ehVendaBalcao,
  nomeDocumento,
  totalOrdem,
  totalPorTipo,
} from "@/types/os";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
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
import { NotaDoClienteModal, notasDoCliente } from "./NotaDoClienteModal";
import { SeloDaOrdem } from "./SeloDaOrdem";
import { OrdemServicoForm } from "./OrdemServicoForm";
import { VendaBalcaoDetalhe } from "./VendaBalcaoDetalhe";
import { VendaBalcaoForm } from "./VendaBalcaoForm";

// Coluna que só aparece em janela de 1600px ou mais. Ver o comentário em
// cima da tabela. Não é o `2xl` (1536) do Tailwind de propósito: em 1536 a
// tabela com as duas colunas precisa de 1202px e a caixa tem 1198, então a
// lista voltava a rolar de lado — e 1536 é a largura de um notebook Full HD
// com o zoom de 125% do Windows.
const SO_EM_TELA_GRANDE = "hidden min-[1600px]:table-cell";

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
  // Custo de cada OS da lista, calculado pelo banco (`custo_das_ordens`): a
  // coluna Lucro não depende de ler o cadastro de peças (#366).
  const [custoDasOrdens, setCustoDasOrdens] = useState<CustoDoBanco>(() => new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
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
  // O erro de uma ação de WhatsApp escolhida no "Mais ações" (ver
  // `abrirWhatsappDaLinha`): fica embaixo das ações da linha dela.
  // "Nota do cliente" aberta pela linha de uma OS finalizada.
  const [notaDoCliente, setNotaDoCliente] = useState<{
    documento: string;
    notas: NotaFiscalArquivo[];
  } | null>(null);
  const [erroDaLinha, setErroDaLinha] = useState<{ ordemId: string; texto: string } | null>(
    null,
  );
  // A OS (ou venda) foi aberta por uma ficha (do cliente ou do veículo) que
  // pediu `voltarAoFechar` (#393): o Voltar leva de volta pra ficha, em vez de
  // ficar na lista. Quem abre pela lista, pelo Início ou pela busca não pede,
  // e o Voltar continua fechando a OS aqui mesmo.
  const [voltarAoFechar, setVoltarAoFechar] = useState(false);
  const [lista, setLista] = useState<"os" | "vendas">("os");
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
      return <span className="text-rotulo text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>;
    }
    return <span className="whitespace-nowrap">{formatarMoeda(lucro)}</span>;
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
      if (ordem.status !== "faturada") return true;
      // `data_abertura` vem do banco em UTC: o dia tem de ser o do fuso local
      // (`diaLocal`), senão uma OS aberta depois das ~21h vira "amanhã" e
      // some do filtro "Até: hoje".
      const dia = diaLocal(ordem.data_abertura);
      return dia >= dataInicio && dia <= dataFim;
    });
  }, [ordens, busca, dataInicio, dataFim]);

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
  const nadaAberto =
    !mostrarFormulario && !ordemEmEdicao && !mostrarVenda && !vendaAberta && !ordemFaturando;

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

      abrirOrdemPedida(ordensCarregadas);

      return ordensCarregadas;
    } catch (err) {
      if (!aindaEhAtual()) return null;
      console.error("Erro ao carregar ordens de serviço:", err);
      setErro(mensagemDeErro(err));
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

  useEffect(() => {
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

  // Traz a OS aberta de novo depois de mexer num item: a corrigida acima, ou
  // a peça avulsa que ganhou cadastro na janela da nota (#655), senão a aba
  // Fechamento continuaria mostrando a peça como avulsa.
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
      const criada = await registrarVendaBalcao(venda, itens, pagamento, operador.id, lojaAtual.id);
      setMostrarVenda(false);
      setLista("vendas");
      const recarregadas = await carregar();
      avisar(`${nomeDocumento(criada)} registrada`);
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
    setErroDaLinha(null);
  }

  async function handleEncerrar(ordem: OrdemServico) {
    if (!operador) return;
    await concluirOrdem(ordem.id, operador.id);
    setOrdemEmEdicao(null);
    setOrdemFaturando({ ...ordem, status: "concluida" });
    await carregar();
  }

  async function confirmarFaturamento(
    pagamentos: PagamentoOrdem[],
    parcelas: number,
    previsaoRecebimento: string | null,
  ) {
    if (!ordemFaturando) return;
    await faturarOrdem(ordemFaturando, pagamentos, parcelas, previsaoRecebimento);
    const faturada = ordemFaturando;
    // Deu certo: a janela fecha e sai a confirmação que some sozinha ("OS 148
    // faturada"). Se `faturarOrdem` falhou, nada disto roda: o erro volta pro
    // `FaturamentoCard`, que o mostra dentro da janela, do lado do botão.
    setOrdemFaturando(null);
    setVendaAberta(null);
    avisar(`${nomeDocumento(faturada)} faturada`);
    const recarregadas = await carregar();
    // Venda de balcão faturada pela lista (a que ficou sem pagamento) segue
    // pro mesmo lugar que uma venda nova: a NFC-e.
    if (ehVendaBalcao(faturada)) {
      const completa = recarregadas?.find((o) => o.id === faturada.id);
      if (completa) setVendaParaNota(completa);
    }
  }

  // As ações de WhatsApp que moram no "Mais ações" (Avisar, quando não é o
  // próximo passo, e Avaliação). O menu fecha no clique, então o erro (o mais
  // comum: telefone sem DDD) não pode ficar no botão como no `BotaoWhatsapp`:
  // fica embaixo das ações da linha dela, e não some sozinho.
  async function abrirWhatsappDaLinha(
    ordem: OrdemServico,
    pedido: { telefone: string | null | undefined; texto: string; aoAbrir: () => void },
  ) {
    setErroDaLinha(null);
    try {
      await abrirConversaWhatsapp(pedido.telefone, pedido.texto);
      pedido.aoAbrir();
    } catch (err) {
      console.error("Erro ao abrir o WhatsApp:", err);
      setErroDaLinha({ ordemId: ordem.id, texto: mensagemDeErro(err) });
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

  // As ações de uma linha (visual novo, tarefa 7): na linha fica SÓ o próximo
  // passo; o resto vai pro "Mais ações". Nenhuma ação sumiu, e cada uma
  // aparece nas mesmas condições de antes (ver a tabela no PR):
  //   • não faturada → "Faturar" (laranja); "Avisar o cliente" (se concluída)
  //     e "Fechamento" (se concluída) vão pro menu;
  //   • faturada que ainda falta nota → "Emitir nota" (abre o Fechamento,
  //     onde a nota é emitida); "Avisar o cliente" vai pro menu;
  //   • finalizada (todas as notas saíram) → "Avisar" (WhatsApp, só OS) e
  //     "Nota do cliente" (ver, imprimir ou mandar a nota), lado a lado;
  //   • "Fechamento" e "Avaliação" ficam no menu.
  // As três do meio são decisão da Sofia (16/11) pro pedido dela de 15/11: a
  // nota do cliente à mão depois de faturar.
  // "Abrir a OS" é novo no menu: até aqui só o clique do mouse na linha abria,
  // e quem usa só o teclado não tinha como.
  function acoesDaLinha(ordem: OrdemServico) {
    const venda = ehVendaBalcao(ordem);
    const aviso = avisoCarroPronto(ordem);
    const avaliacao = pedidoDeAvaliacao(ordem);
    const notas = notasPorOrdem.get(ordem.id) ?? [];
    const situacao = situacaoFiscalOrdem(ordem.itens ?? [], notas);
    const faltaNota = ordem.status === "faturada" && situacao.pendentes.length > 0;
    const notasParaVer = ordemEstaFinalizada(ordem, situacao) ? notasDoCliente(notas) : [];
    const proximo: "faturar" | "emitir" | "avisar" | null =
      ordem.status !== "faturada"
        ? "faturar"
        : faltaNota
          ? "emitir"
          : aviso
            ? "avisar"
            : null;

    const menu: AcaoDaLinha[] = [];
    if (aviso && proximo !== "avisar") {
      menu.push({
        tipo: "menu",
        rotulo: "Avisar o cliente",
        icone: <MessageCircle />,
        aoClicar: () => void abrirWhatsappDaLinha(ordem, aviso),
      });
    }
    if (STATUS_COM_FECHAMENTO.includes(ordem.status)) {
      menu.push({
        tipo: "menu",
        rotulo: "Fechamento",
        icone: <Receipt />,
        aoClicar: () => abrirOrdem(ordem, "fechamento"),
      });
    }
    if (avaliacao) {
      menu.push({
        tipo: "menu",
        rotulo: "Avaliação",
        icone: <Star />,
        aoClicar: () => void abrirWhatsappDaLinha(ordem, avaliacao),
      });
    }
    menu.push({
      tipo: "menu",
      rotulo: venda ? "Abrir a venda" : "Abrir a OS",
      icone: <FolderOpen />,
      aoClicar: () => abrirOrdem(ordem),
    });

    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center justify-end gap-1.5">
          {proximo === "faturar" && (
            <Botao
              variante="principal"
              tamanho="pequeno"
              onClick={() => {
                fecharPaineis();
                setOrdemFaturando(ordem);
              }}
            >
              Faturar
            </Botao>
          )}
          {proximo === "emitir" && (
            <Dica texto={`Falta ${situacao.pendentes.join(" e ")}. Abre o Fechamento, onde a nota é emitida`}>
              <Botao
                variante="principal"
                tamanho="pequeno"
                onClick={() => abrirOrdem(ordem, "fechamento")}
              >
                Emitir nota
              </Botao>
            </Dica>
          )}
          {proximo === "avisar" && aviso && (
            <BotaoWhatsapp
              telefone={aviso.telefone}
              texto={aviso.texto}
              rotulo="Avisar"
              titulo="Avisar o cliente pelo WhatsApp que o carro está pronto"
              aoAbrir={aviso.aoAbrir}
            />
          )}
          {notasParaVer.length > 0 && (
            // Abaixo de 1366 só o ícone (o nome continua pro leitor de tela e
            // na dica): é o que faz a linha da finalizada caber em 1024 com o
            // menu encolhido (pedido da Sofia, 16/11). O `relative` segura o
            // nome escondido (`sr-only` é absoluto) dentro do botão: sem ele,
            // o nome "vazava" e cortava a tela em 1024 (achado pelo
            // largura:telas).
            <Dica texto="Ver, imprimir ou mandar a nota do cliente">
              <Botao
                tamanho="pequeno"
                icone={<FileText />}
                className="relative max-[1365px]:w-8 max-[1365px]:justify-center max-[1365px]:px-0"
                onClick={() => {
                  setErroDaLinha(null);
                  setNotaDoCliente({ documento: nomeDocumento(ordem), notas: notasParaVer });
                }}
              >
                <span className="max-[1365px]:sr-only">Nota do cliente</span>
              </Botao>
            </Dica>
          )}
          <AcoesDaLinha descricao={nomeDocumento(ordem)} acoes={menu} />
        </div>
        {erroDaLinha?.ordemId === ordem.id && (
          <p role="alert" className="flex max-w-64 items-start gap-1 text-left text-rotulo text-perigo">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0">{erroDaLinha.texto}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {!carregando && lojaAtual && clientes.length === 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-atencao/[0.12] px-4 py-3 text-corpo text-atencao">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Cadastre ao menos um cliente antes de abrir uma ordem de serviço.
        </p>
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
          notas={notaDoCliente.notas}
          onFechar={() => setNotaDoCliente(null)}
        />
      )}

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-perigo/[0.12] px-4 py-3 text-corpo text-perigo"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{erro}</span>
        </p>
      )}

      {!carregando && temOrdens && (
        <div role="tablist" aria-label="O que mostrar na lista" className="sakura-abas">
          {(
            [
              ["os", "Ordens de serviço", quantasOs],
              ["vendas", "Vendas de balcão", quantasVendas],
            ] as const
          ).map(([valor, rotulo, quantas]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={lista === valor}
              onClick={() => {
                setLista(valor);
                setErroDaLinha(null);
              }}
              className="sakura-aba"
            >
              {rotulo}{" "}
              <span className="sakura-aba-conta">{quantas}</span>
            </button>
          ))}
        </div>
      )}

      {!carregando && temOrdens && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="sakura-rotulo w-64">
            Buscar por cliente ou placa
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: João ou ABC1D23"
              className="sakura-campo sakura-campo-filtro"
            />
          </label>
          <label className="sakura-rotulo w-44">
            De
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              disabled={!!busca.trim()}
              className="sakura-campo sakura-campo-filtro"
            />
          </label>
          <label className="sakura-rotulo w-44">
            Até
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              disabled={!!busca.trim()}
              className="sakura-campo sakura-campo-filtro"
            />
          </label>
          <p className="min-w-0 flex-1 basis-64 pb-1 text-rotulo text-texto-2">
            {busca.trim()
              ? "Buscando em todo o histórico, sem limite de data."
              : lista === "vendas"
                ? "Venda sem pagamento sempre aparece, não importa a data. O período filtra só as já faturadas."
                : "OS em aberto sempre aparecem, não importa a data. O período filtra só o histórico já faturado."}
          </p>
        </div>
      )}

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : !temOrdens ? (
        <p className="text-corpo text-texto-2">Nenhuma ordem de serviço aberta ainda.</p>
      ) : ordensDaLista.length === 0 ? (
        <p className="text-corpo text-texto-2">
          {lista === "vendas"
            ? "Nenhuma venda de balcão neste período."
            : "Nenhuma ordem de serviço encontrada com esse filtro."}
        </p>
      ) : (
        <div className="overflow-x-auto sakura-card">
          {/* A lista precisa caber numa janela de 1366, a do Balcão (#425, versão
              "B", escolhida por ela pela imagem em 03/10/2026): abaixo de
              1600, Peças e Serviços somem (o Total e o Lucro ficam, e o
              detalhe está dentro da OS); a data perde o ano quando é do ano
              corrente; nome de cliente comprido quebra até no meio da palavra
              se precisar. Coluna nova aqui precisa caber na folga —
              `npm run largura:telas` confere em 1366, 1536 e 1600.
              A tabela principal rola com a página, sem altura fixa ("O que
              pode crescer", regras, seção 6). */}
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                {lista === "os" && <th>Veículo</th>}
                <th>{lista === "os" ? "Abertura" : "Data"}</th>
                <th>Status</th>
                {lista === "os" && <th className={`${SO_EM_TELA_GRANDE} text-right`}>Peças</th>}
                {lista === "os" && <th className={`${SO_EM_TELA_GRANDE} text-right`}>Serviços</th>}
                <th className="text-right">Total</th>
                <th className="text-right">Lucro</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordensDaLista.map((ordem) => (
                <tr key={ordem.id} onClick={() => abrirOrdem(ordem)} className="cursor-pointer">
                  <td className="whitespace-nowrap text-texto-2">{nomeDocumento(ordem)}</td>
                  <td className="font-medium text-texto [overflow-wrap:anywhere]">
                    {ordem.cliente?.nome ?? "—"}
                  </td>
                  {lista === "os" && (
                    <td className="whitespace-nowrap">
                      {ordem.veiculo_id && ordem.veiculo?.placa ? (
                        <LinkPlaca veiculoId={ordem.veiculo_id} placa={ordem.veiculo.placa} />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap text-texto-2">{dataCurta(ordem.data_abertura)}</td>
                  <td>
                    <SeloDaOrdem ordem={ordem} notas={notasPorOrdem.get(ordem.id) ?? []} />
                  </td>
                  {lista === "os" && (
                    <td className={`${SO_EM_TELA_GRANDE} whitespace-nowrap text-right`}>
                      {formatarMoeda(totalPorTipo(ordem.itens ?? [], "peca"))}
                    </td>
                  )}
                  {lista === "os" && (
                    <td className={`${SO_EM_TELA_GRANDE} whitespace-nowrap text-right`}>
                      {formatarMoeda(totalPorTipo(ordem.itens ?? [], "servico"))}
                    </td>
                  )}
                  <td className="whitespace-nowrap text-right font-semibold text-texto">
                    {formatarMoeda(totalOrdem(ordem.itens ?? []))}
                  </td>
                  <td className="text-right">{textoLucro(ordem)}</td>
                  {/* O clique nas ações não abre a OS junto. */}
                  <td onClick={(e) => e.stopPropagation()}>{acoesDaLinha(ordem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CarFront,
  CircleCheck,
  CircleX,
  FolderOpen,
  MessageCircle,
  Plus,
  Printer,
  TriangleAlert,
} from "lucide-react";
import { Abas } from "@/components/Abas";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { LinhaDeLista, type ItemDoMais } from "@/components/molde/LinhaDeLista";
import { MoldeLista } from "@/components/molde/MoldeLista";
import { useAuth } from "@/contexts/AuthContext";
import { abrirConversaWhatsapp } from "@/lib/whatsapp";
import {
  cadastrarClienteRapido,
  cadastrarVeiculoRapido,
  listarClientesParaEscolha,
} from "@/lib/clientes";
import { temPermissao } from "@/types/operador";
import { diaBrasileiro, dataCurta } from "@/lib/datas";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { mensagemDeErro } from "@/lib/errors";
import { listarSaldos } from "@/lib/estoque";
import { listarFuncionariosPublico } from "@/lib/funcionarios";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
} from "@/lib/modelosWhatsapp";
import {
  adicionarItensOrdem,
  aprovarOrcamento,
  atualizarOrdem,
  AprovadoSemEstoqueError,
  criarOrcamento,
  editarItemOrdem,
  listarOrcamentos,
  listarOrdensDoVeiculo,
  listarTrocasDaOrdem,
  reabrirOrcamento,
  recusarOrcamento,
} from "@/lib/ordensServico";
import { listarPecasJanela } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import { avisarOrcamentosMudaram } from "@/hooks/useNumerosDoMenu";
import {
  contarOrcamentosAbertos,
  ehOrcamento,
  podeReabrir,
  valoresMensagemOrcamento,
  type MotivoRecusa,
} from "@/schemas/orcamento";
import { formatarMoeda } from "@/schemas/dinheiro";
import { preencherModelo } from "@/schemas/whatsapp";
import type { Cliente, NovoCliente, VeiculoFormulario } from "@/types/cliente";
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
import { nomeDocumento, totalOrdem } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { OrcamentoVisualModal } from "./OrcamentoVisualModal";
import { OrdemServicoForm, type JanelaDoOrcamento } from "./OrdemServicoForm";
import { ReabrirOrcamentoModal } from "./ReabrirOrcamentoModal";
import { SeloDaOrdem } from "./SeloDaOrdem";

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

const SEM_ORDENS: OrdemServico[] = [];
const SEM_FUNCIONARIOS: FuncionarioPublico[] = [];
const SEM_MODELOS: Record<string, string> = {};

/**
 * Lista de orçamentos (#379). Mesmo módulo e mesma permissão das OS
 * (`ordens_servico`). Orçamento não é venda: não aparece na lista de OS, não
 * baixa estoque e não entra em número nenhum até ser aprovado.
 */
export function OrcamentosPage() {
  const { operador, lojaAtual } = useAuth();
  // Sem o módulo Clientes a lista vem pela janela estreita (migration 0068).
  const podeVerCadastro = temPermissao(operador, "clientes");
  const navigate = useNavigate();
  // #927: só a carga mais nova mexe na tela; e se a da loja nova der erro, os
  // dados da loja anterior (guardados no estado) não aparecem.
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
  const [ordensGuardadas, setOrdens] = useState<OrdemServico[]>([]);
  const ordens = dadosSaoDaLoja ? ordensGuardadas : SEM_ORDENS;
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pecas, setPecas] = useState<PecaJanela[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [funcionariosGuardados, setFuncionarios] = useState<FuncionarioPublico[]>([]);
  const funcionarios = dadosSaoDaLoja ? funcionariosGuardados : SEM_FUNCIONARIOS;
  const [modelosGuardados, setModelosWhatsapp] = useState<Record<string, string>>({});
  const modelosWhatsapp = dadosSaoDaLoja ? modelosGuardados : SEM_MODELOS;
  const [saldos, setSaldos] = useState<Map<string, number> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [aberto, setAberto] = useState<OrdemServico | null>(null);
  // A janela que o orçamento abre já mostrando (o "Aprovar" da linha, o
  // "Recusar" do "⋯"). Abrindo pelo nome, nenhuma.
  const [janelaInicial, setJanelaInicial] = useState<JanelaDoOrcamento | null>(null);
  const [lista, setLista] = useState<"abertos" | "recusados">("abertos");
  const [busca, setBusca] = useState("");
  const [imprimindo, setImprimindo] = useState<OrdemServico | null>(null);
  // A janela "Reabrir o Orçamento N?" (#1181): da linha da aba Recusados ou
  // da faixa do recusado aberto.
  const [reabrindo, setReabrindo] = useState<OrdemServico | null>(null);
  // O "Histórico da OS" do orçamento aberto (reaberturas, #1181).
  const [historico, setHistorico] = useState<TrocaDeOsFaturada[]>([]);

  const funcionarioAtualId = funcionarios.find((f) => f.operador_id === operador?.id)?.id ?? "";
  const saldoPorPeca = useMemo(() => saldos ?? new Map<string, number>(), [saldos]);

  const orcamentos = useMemo(() => ordens.filter(ehOrcamento), [ordens]);
  const quantosAbertos = contarOrcamentosAbertos(orcamentos);
  const quantosRecusados = orcamentos.length - quantosAbertos;
  const daLista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return orcamentos
      .filter((o) => (o.status === "orcamento") === (lista === "abertos"))
      .filter(
        (o) =>
          !termo ||
          (o.cliente?.nome?.toLowerCase() ?? "").includes(termo) ||
          (o.veiculo?.placa?.toLowerCase() ?? "").includes(termo),
      );
  }, [orcamentos, lista, busca]);

  const nadaAberto = !mostrarFormulario && !aberto;
  // A lista nem chegou: o erro fica dentro dela, com o "Tentar de novo".
  const listaComErro = !!erro && nadaAberto && ordens.length === 0;
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

  async function carregar(): Promise<OrdemServico[] | null> {
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return null;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [ordensCarregadas, clientesC, pecasC, servicosC, funcionariosC, modelosC] =
        await Promise.all([
          listarOrcamentos(carga.lojaId),
          listarClientesParaEscolha(podeVerCadastro),
          listarPecasJanela(),
          listarServicos(),
          listarFuncionariosPublico(carga.lojaId),
          listarModelosWhatsapp(carga.lojaId),
        ]);
      if (!carga.aindaEhAtual()) return null;
      setOrdens(ordensCarregadas);
      setClientes(clientesC);
      setPecas(pecasC);
      setServicos(servicosC);
      setFuncionarios(funcionariosC);
      setModelosWhatsapp(modelosC);
      carga.gravou();
      avisarOrcamentosMudaram();
      return ordensCarregadas;
    } catch (err) {
      if (!carga.aindaEhAtual()) return null;
      console.error("Erro ao carregar orçamentos:", err);
      setErro(mensagemDeErro(err));
      return null;
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  // O saldo só serve pro formulário aberto (mesma ideia da lista de OS).
  const formularioAberto = mostrarFormulario || !!aberto;
  useEffect(() => {
    if (!formularioAberto || !lojaAtual) {
      setSaldos(null);
      return;
    }
    let cancelado = false;
    listarSaldos(lojaAtual.id)
      .then((m) => {
        if (!cancelado) setSaldos(m);
      })
      .catch((err) => console.error("Erro ao carregar o saldo de estoque:", err));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formularioAberto, lojaAtual?.id]);

  // O histórico do orçamento aberto. Se não carregar (banco ainda sem a
  // migration 0091), o orçamento segue sem ele: é só um registro.
  const idAberto = aberto?.id ?? null;
  useEffect(() => {
    setHistorico([]);
    if (!idAberto) return;
    let cancelado = false;
    listarTrocasDaOrdem(idAberto)
      .then((lista) => {
        if (!cancelado) setHistorico(lista);
      })
      .catch((err) => console.error("Erro ao carregar o histórico do orçamento:", err));
    return () => {
      cancelado = true;
    };
  }, [idAberto]);

  async function handleSalvarNova(
    dados: NovaOrdemServico,
    itens: NovoItemOS[],
    validade?: string,
  ) {
    if (!operador || !lojaAtual || !validade) return;
    await criarOrcamento(dados, itens, validade, operador.id, lojaAtual.id);
    setMostrarFormulario(false);
    setLista("abertos");
    await carregar();
  }

  async function handleSalvarEdicao(
    id: string,
    patch: PatchOrdemServico,
    novosItens: NovoItemOS[],
  ) {
    if (!operador || !lojaAtual) return;
    await atualizarOrdem(id, patch, operador.id);
    if (novosItens.length > 0) {
      await adicionarItensOrdem(id, novosItens, operador.id);
    }
    setAberto(null);
    await carregar();
  }

  async function handleEditarItem(item: ItemOS, patch: PatchItemOS) {
    if (!operador || !lojaAtual || !aberto) return;
    await editarItemOrdem(item, patch, operador.id);
    await recarregarAberto();
  }

  // Traz o orçamento aberto de novo: depois de corrigir um item, ou de a
  // janela da aprovação ligar a peça cadastrada ao item (#720), senão ele
  // continuaria aparecendo como "sem cadastro". Devolve se conseguiu buscar.
  async function recarregarAberto(): Promise<boolean> {
    const idAberto = aberto?.id;
    const atualizadas = await carregar();
    const atualizada = atualizadas?.find((o) => o.id === idAberto);
    // Só troca se o MESMO orçamento continua aberto: a pessoa pode ter
    // fechado ele (ou aberto outro) enquanto o banco respondia, e ele não
    // pode reabrir sozinho.
    if (atualizada) setAberto((atual) => (atual?.id === atualizada.id ? atualizada : atual));
    return atualizadas !== null;
  }

  // A janela da aprovação ligou uma peça (#720). O `carregar()` não lança
  // (mostra o erro na página, atrás da janela): aqui vira erro pra o
  // formulário mostrar dentro da janela.
  async function aposLigarPeca() {
    if (!(await recarregarAberto())) {
      throw new Error("não deu pra buscar o orçamento de novo");
    }
  }

  // Aprovou: vira OS e a gente leva pra ela, que passa a ser "OS N" na lista de
  // OS. Se a baixa falha, a aprovação também não entra (uma transação só no
  // banco, #706): o erro diz que o orçamento continua orçamento e o formulário
  // mostra, pra tentar de novo. O ramo abaixo é só da peça avulsa que não ligou
  // ao cadastro: aí a OS JÁ nasceu, e a tela fecha o orçamento em vez de
  // tentar de novo.
  async function handleAprovar(
    orcamento: OrdemServico,
    aprovadoPor: string,
    vinculos: { itemId: string; pecaId: string }[] = [],
  ) {
    if (!operador) return;
    try {
      const aprovada = await aprovarOrcamento(orcamento, aprovadoPor, operador.id, vinculos);
      avisarOrcamentosMudaram();
      navigate("/ordens-servico", { state: { abrirOrdemId: aprovada.id } });
    } catch (err) {
      if (err instanceof AprovadoSemEstoqueError) {
        setAberto(null);
        await carregar();
        setErro(err.message);
        return;
      }
      throw err;
    }
  }

  async function handleRecusar(orcamento: OrdemServico, motivo: MotivoRecusa | null) {
    if (!operador) return;
    await recusarOrcamento(orcamento.id, motivo, operador.id);
    setAberto(null);
    setLista("recusados");
    setAviso(`${nomeDocumento(orcamento)} recusado.`);
    await carregar();
  }

  // Reabrir (#1181). Erro da reabertura sobe pra janela, que continua aberta.
  // Com "Já aprovar agora": aprovou → leva pra OS, como o Aprovar; a
  // aprovação falhou → o orçamento fica reaberto (nada se perde) e a tela diz
  // o erro.
  async function handleReabrir(
    orcamento: OrdemServico,
    motivo: string,
    validade: string,
    aprovarAgora: { aprovadoPor: string } | null,
  ) {
    // Sem operador a janela ficaria "enviando" pra sempre: vira erro nela.
    if (!operador) throw new Error("Sua sessão não foi encontrada. Saia e entre de novo.");
    const resultado = await reabrirOrcamento(orcamento, motivo, validade, operador.id, aprovarAgora ?? undefined);
    avisarOrcamentosMudaram();
    setReabrindo(null);
    if (resultado.aprovada && !resultado.erroDaAprovacao) {
      navigate("/ordens-servico", { state: { abrirOrdemId: resultado.aprovada.id } });
      return;
    }
    setAberto(null);
    setLista("abertos");
    await carregar();
    if (resultado.erroDaAprovacao) {
      // Peça que não ligou ao cadastro já nasceu OS: a mensagem diz isso. A
      // frase da aprovação diz se não aprovou ou se não dá pra saber (rede).
      setErro(
        resultado.aprovada
          ? resultado.erroDaAprovacao
          : `${nomeDocumento(orcamento)} foi reaberto. ${resultado.erroDaAprovacao}`,
      );
      return;
    }
    setAviso(`${nomeDocumento(orcamento)} reaberto.`);
  }

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

  function textoOrcamento(ordem: OrdemServico): string {
    return preencherModelo(
      textoDoModelo(modelosWhatsapp, "orcamento"),
      valoresMensagemOrcamento(ordem, lojaAtual?.nome ?? ""),
    );
  }

  function botaoWhatsapp(ordem: OrdemServico) {
    if (ordem.status !== "orcamento") return null;
    // Sem o módulo Clientes o telefone não chega (a janela da migration 0068
    // só tem o nome): o botão diria "cadastro sem telefone", que é mentira.
    if (!podeVerCadastro) return null;
    const telefone = clientes.find((c) => c.id === ordem.cliente_id)?.telefone;
    return (
      <BotaoWhatsapp
        telefone={telefone}
        texto={textoOrcamento(ordem)}
        rotulo="Enviar"
        titulo="Mandar o orçamento pelo WhatsApp"
        aoAbrir={() => {
          if (!lojaAtual) return;
          registrarMensagemAberta(
            lojaAtual.id,
            "orcamento",
            ordem.id,
            telefone ?? null,
            operador?.id ?? null,
          );
        }}
      />
    );
  }

  function abrirNovo() {
    setAviso(null);
    setMostrarFormulario(true);
  }

  // Abre o orçamento; com `janela`, já com a janela de aprovar ou de recusar
  // aberta por cima (a ação da linha e o "⋯").
  function abrir(ordem: OrdemServico, janela: JanelaDoOrcamento | null = null) {
    setAviso(null);
    setErro(null);
    setJanelaInicial(janela);
    setAberto(ordem);
  }

  function pedirReabertura(ordem: OrdemServico) {
    setAviso(null);
    setErro(null);
    setReabrindo(ordem);
  }

  // O "Enviar" do "⋯": o menu fecha no clique, então o erro do WhatsApp (o
  // mais comum: telefone sem DDD) vai pro aviso de erro da tela, com o nome
  // do orçamento na frente, e não some sozinho.
  async function enviarPeloWhatsapp(ordem: OrdemServico) {
    const telefone = clientes.find((c) => c.id === ordem.cliente_id)?.telefone ?? null;
    setErro(null);
    try {
      await abrirConversaWhatsapp(telefone, textoOrcamento(ordem));
      if (lojaAtual) {
        registrarMensagemAberta(lojaAtual.id, "orcamento", ordem.id, telefone, operador?.id ?? null);
      }
    } catch (err) {
      console.error("Erro ao abrir o WhatsApp:", err);
      setErro(`${nomeDocumento(ordem)}: ${mensagemDeErro(err)}`);
    }
  }

  // Uma linha do molde (#1091). No aberto, a ação da linha é o próximo passo,
  // "Aprovar" (abre o orçamento já com a janela de aprovar); "Enviar",
  // "Imprimir", "Abrir" e "Recusar" (no fim, longe do dedo) ficam no "⋯".
  // Nenhuma ação sumiu: o "Enviar" e o "Imprimir" saíram da linha pro menu.
  function linhaDoOrcamento(ordem: OrdemServico) {
    const carro = [ordem.veiculo?.marca, ordem.veiculo?.modelo].filter(Boolean).join(" ");
    const aberto = ordem.status === "orcamento";
    const detalhe = (
      <DetalheDaLinha
        partes={[
          nomeDocumento(ordem),
          ordem.veiculo?.placa,
          `feito ${dataCurta(ordem.data_abertura)}`,
          ordem.validade ? (
            <>
              vale até <span>{diaBrasileiro(ordem.validade)}</span>
            </>
          ) : null,
        ]}
      />
    );
    const mais: ItemDoMais[] = [];
    // Sem o módulo Clientes o telefone não chega (a janela da migration 0068
    // só tem o nome): o "Enviar" diria "cadastro sem telefone", que é mentira.
    if (aberto && podeVerCadastro) {
      mais.push({
        rotulo: "Enviar pelo WhatsApp",
        icone: <MessageCircle />,
        aoClicar: () => void enviarPeloWhatsapp(ordem),
      });
    }
    if (aberto) {
      mais.push({ rotulo: "Imprimir", icone: <Printer />, aoClicar: () => setImprimindo(ordem) });
    }
    if (ordem.veiculo_id) {
      const veiculoId = ordem.veiculo_id;
      mais.push({
        rotulo: "Ficha do veículo",
        icone: <CarFront />,
        aoClicar: () => navigate(`/veiculos/${veiculoId}`),
      });
    }
    mais.push({ rotulo: "Abrir o orçamento", icone: <FolderOpen />, aoClicar: () => abrir(ordem) });
    if (aberto) {
      mais.push({
        rotulo: "Recusar",
        icone: <CircleX />,
        perigosa: true,
        aoClicar: () => abrir(ordem, "recusar"),
      });
    }
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
        aoAbrir={() => abrir(ordem)}
        lado={
          <div className="flex items-center gap-4">
            <div className="w-36">
              <SeloDaOrdem ordem={ordem} notas={[]} />
            </div>
            <span className="w-32 whitespace-nowrap text-right text-corpo font-semibold text-texto tabular-nums">
              {formatarMoeda(totalOrdem(ordem.itens ?? []))}
            </span>
          </div>
        }
        // No recusado, a ação é "Reabrir" (#1181), secundária: o laranja da
        // tela continua sendo o "Novo orçamento".
        acao={
          aberto
            ? { rotulo: "Aprovar", aoClicar: () => abrir(ordem, "aprovar") }
            : podeReabrir(ordem)
              ? { rotulo: "Reabrir", aoClicar: () => pedirReabertura(ordem) }
              : undefined
        }
        mais={mais}
      />
    );
  }

  // Imprimir (#1019) fica ao lado do "Enviar": os dois jeitos de entregar o
  // orçamento ao cliente. Só no orçamento aberto (o recusado já acabou).
  function acoesDoOrcamento(ordem: OrdemServico) {
    if (ordem.status !== "orcamento") return null;
    return (
      <>
        <Botao
          tamanho="pequeno"
          icone={<Printer />}
          title="Imprimir o orçamento pra entregar ao cliente"
          // Cada linha tem o seu: o leitor de tela diz de qual orçamento é.
          aria-label={`Imprimir ${nomeDocumento(ordem)}`}
          onClick={() => setImprimindo(ordem)}
        >
          Imprimir
        </Botao>
        {botaoWhatsapp(ordem)}
      </>
    );
  }

  const formProps = {
    clientes,
    pecas,
    servicos,
    funcionarios,
    funcionarioAtualId,
    ordens: [],
    buscarOrdensDoVeiculo: listarOrdensDoVeiculo,
    saldoPorPeca,
    saldoCarregado: saldos !== null,
    modoOrcamento: true,
    onSalvarNova: handleSalvarNova,
    onSalvarEdicao: handleSalvarEdicao,
    onEditarItem: handleEditarItem,
    onItensMudaram: aposLigarPeca,
    onEncerrar: async () => undefined,
    onAprovar: handleAprovar,
    onRecusar: handleRecusar,
    onReabrir: pedirReabertura,
    onCadastrarCliente: handleCadastrarCliente,
    onCadastrarVeiculo: handleCadastrarVeiculo,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="text-titulo font-semibold text-texto">Orçamentos</h1>
            <p className="text-corpo text-texto-2">
              Preço combinado antes de virar ordem de serviço. Não baixa estoque até ser aprovado.
            </p>
          </div>
        </div>
        {nadaAberto && operador && lojaAtual && clientes.length > 0 && (
          <Botao
            variante="principal"
            icone={<Plus />}
            onClick={abrirNovo}
          >
            Novo orçamento
          </Botao>
        )}
      </header>

      {mostrarFormulario && operador && (
        <OrdemServicoForm {...formProps} onCancelar={() => setMostrarFormulario(false)} />
      )}

      {aberto && operador && (
        <OrdemServicoForm
          key={aberto.id}
          {...formProps}
          ordemExistente={aberto}
          janelaInicial={janelaInicial}
          acoesExtras={acoesDoOrcamento(aberto)}
          trocas={historico}
          onCancelar={() => setAberto(null)}
        />
      )}

      {reabrindo && (
        <ReabrirOrcamentoModal
          ordem={reabrindo}
          onConfirmar={(motivo, validade, aprovarAgora) =>
            handleReabrir(reabrindo, motivo, validade, aprovarAgora)
          }
          onFechar={() => setReabrindo(null)}
        />
      )}

      {imprimindo && (
        <OrcamentoVisualModal
          ordem={imprimindo}
          telefoneCliente={
            podeVerCadastro ? clientes.find((c) => c.id === imprimindo.cliente_id)?.telefone : null
          }
          onFechar={() => setImprimindo(null)}
        />
      )}

      {aviso && (
        <p className="flex items-start gap-2 rounded-xl bg-ok/[0.12] px-4 py-3 text-corpo text-ok">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{aviso}</span>
        </p>
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

      {nadaAberto && orcamentos.length > 0 && (
        <Abas
          rotulo="O que mostrar na lista"
          ativa={lista}
          aoEscolher={setLista}
          abas={[
            { valor: "abertos", nome: "Abertos", conta: quantosAbertos },
            { valor: "recusados", nome: "Recusados", conta: quantosRecusados },
          ]}
        />
      )}

      {/* O molde de lista (#1135), igual ao das OS (#1091): o cliente e o
          carro em cima, o número e as datas embaixo, o selo e o total à
          direita, nas mesmas larguras da lista de OS. */}
      {nadaAberto && lojaAtual && (
        // O botão da linha tem sempre a mesma largura ("Faturar" e "Nota do
        // cliente"), nas listas de OS e de Orçamentos: o selo e o valor batem
        // em coluna, linha a linha e de uma lista pra outra (#1091).
        <div className={CLASSE_DA_LISTA}>
          <MoldeLista
            rotulo={lista === "abertos" ? "Orçamentos abertos" : "Orçamentos recusados"}
            estado={carregando ? "carregando" : erro && ordens.length === 0 ? "erro" : "pronto"}
            itens={daLista}
            chave={(ordem) => ordem.id}
            linha={linhaDoOrcamento}
            // Sem orçamento nenhum ainda, sem busca: só a frase e o botão.
            busca={
              orcamentos.length > 0
                ? {
                    valor: busca,
                    aoMudar: setBusca,
                    rotulo: "Buscar por cliente ou placa",
                    dica: "Ex: João ou ABC1D23",
                  }
                : undefined
            }
            vazio={
              lista === "abertos"
                ? {
                    frase: "Nenhum orçamento aberto. O preço combinado antes de virar OS aparece aqui.",
                    acao:
                      operador && clientes.length > 0
                        ? { rotulo: "Novo orçamento", aoClicar: abrirNovo }
                        : undefined,
                  }
                : { frase: "Nenhum orçamento recusado. O que o cliente não quis fica guardado aqui." }
            }
            erro={erro ? { mensagem: erro, tentarDeNovo: () => void carregar() } : undefined}
          />
        </div>
      )}
    </div>
  );
}

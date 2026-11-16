import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, FolderOpen, Plus, TriangleAlert } from "lucide-react";
import { AcoesDaLinha } from "@/components/AcoesDaLinha";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { LinkPlaca } from "@/components/LinkPlaca";
import { useAuth } from "@/contexts/AuthContext";
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
  recusarOrcamento,
} from "@/lib/ordensServico";
import { listarPecasJanela } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import { avisarOrcamentosMudaram } from "@/hooks/useOrcamentosAbertos";
import {
  contarOrcamentosAbertos,
  ehOrcamento,
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
} from "@/types/os";
import { nomeDocumento, totalOrdem } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { OrdemServicoForm } from "./OrdemServicoForm";
import { SeloDaOrdem } from "./SeloDaOrdem";

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
  const [lista, setLista] = useState<"abertos" | "recusados">("abertos");
  const [busca, setBusca] = useState("");

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
            onClick={() => {
              setAviso(null);
              setMostrarFormulario(true);
            }}
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
          acoesExtras={botaoWhatsapp(aberto)}
          onCancelar={() => setAberto(null)}
        />
      )}

      {aviso && (
        <p className="flex items-start gap-2 rounded-xl bg-ok/[0.12] px-4 py-3 text-corpo text-ok">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0">{aviso}</span>
        </p>
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

      {nadaAberto && !carregando && orcamentos.length > 0 && (
        <>
          <div role="tablist" aria-label="O que mostrar na lista" className="sakura-abas">
            {(
              [
                ["abertos", "Abertos", quantosAbertos],
                ["recusados", "Recusados", quantosRecusados],
              ] as const
            ).map(([valor, rotulo, quantos]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={lista === valor}
                onClick={() => setLista(valor)}
                className="sakura-aba"
              >
                {rotulo}{" "}
                <span className="sakura-aba-conta">{quantos}</span>
              </button>
            ))}
          </div>
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
        </>
      )}

      {nadaAberto &&
        (carregando ? (
          <p className="text-corpo text-texto-2">Carregando...</p>
        ) : orcamentos.length === 0 ? (
          <p className="text-corpo text-texto-2">Nenhum orçamento ainda.</p>
        ) : daLista.length === 0 ? (
          <p className="text-corpo text-texto-2">
            {lista === "abertos"
              ? "Nenhum orçamento aberto com esse filtro."
              : "Nenhum orçamento recusado com esse filtro."}
          </p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Veículo</th>
                  <th>Feito em</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {daLista.map((ordem) => (
                  <tr
                    key={ordem.id}
                    onClick={() => {
                      setAviso(null);
                      setAberto(ordem);
                    }}
                    className="cursor-pointer"
                  >
                    <td className="whitespace-nowrap text-texto-2">{nomeDocumento(ordem)}</td>
                    <td className="font-medium text-texto [overflow-wrap:anywhere]">
                      {ordem.cliente?.nome ?? "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      {ordem.veiculo_id && ordem.veiculo?.placa ? (
                        <LinkPlaca veiculoId={ordem.veiculo_id} placa={ordem.veiculo.placa} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap text-texto-2">
                      {dataCurta(ordem.data_abertura)}
                    </td>
                    <td className="whitespace-nowrap text-texto-2">
                      {ordem.validade ? diaBrasileiro(ordem.validade) : "—"}
                    </td>
                    <td>
                      <SeloDaOrdem ordem={ordem} notas={[]} />
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold text-texto">
                      {formatarMoeda(totalOrdem(ordem.itens ?? []))}
                    </td>
                    {/* Na linha, o próximo passo (mandar pelo WhatsApp); no
                        "Mais ações", abrir o orçamento, pra quem usa só o
                        teclado (até aqui só o clique do mouse na linha abria). */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {botaoWhatsapp(ordem)}
                        <AcoesDaLinha
                          descricao={nomeDocumento(ordem)}
                          acoes={[
                            {
                              tipo: "menu",
                              rotulo: "Abrir o orçamento",
                              icone: <FolderOpen />,
                              aoClicar: () => {
                                setAviso(null);
                                setAberto(ordem);
                              },
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

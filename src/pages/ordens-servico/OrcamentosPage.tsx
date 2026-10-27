import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { mensagemDeErro } from "@/lib/errors";
import { calcularSaldoPorPeca, listarMovimentos } from "@/lib/estoque";
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
import { listarPecas } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import { isSupabaseConfigured } from "@/lib/supabase";
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
import type { MovimentoEstoque } from "@/types/estoque";
import type {
  ItemOS,
  NovaOrdemServico,
  NovoItemOS,
  OrdemServico,
  PatchItemOS,
  PatchOrdemServico,
} from "@/types/os";
import { nomeDocumento, totalOrdem } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { OrdemServicoForm } from "./OrdemServicoForm";
import { StatusOrdem } from "./StatusOrdemBadge";

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
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioPublico[]>([]);
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [aberto, setAberto] = useState<OrdemServico | null>(null);
  const [lista, setLista] = useState<"abertos" | "recusados">("abertos");
  const [busca, setBusca] = useState("");

  const funcionarioAtualId = funcionarios.find((f) => f.operador_id === operador?.id)?.id ?? "";
  const saldoPorPeca = useMemo(() => calcularSaldoPorPeca(movimentos ?? []), [movimentos]);

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
    if (!isSupabaseConfigured || !lojaAtual) {
      setCarregando(false);
      return null;
    }
    setCarregando(true);
    setErro(null);
    try {
      const [ordensCarregadas, clientesC, pecasC, servicosC, funcionariosC, modelosC] =
        await Promise.all([
          listarOrcamentos(lojaAtual.id),
          listarClientesParaEscolha(podeVerCadastro),
          listarPecas(),
          listarServicos(),
          listarFuncionariosPublico(lojaAtual.id),
          listarModelosWhatsapp(lojaAtual.id),
        ]);
      setOrdens(ordensCarregadas);
      setClientes(clientesC);
      setPecas(pecasC);
      setServicos(servicosC);
      setFuncionarios(funcionariosC);
      setModelosWhatsapp(modelosC);
      avisarOrcamentosMudaram();
      return ordensCarregadas;
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err);
      setErro(mensagemDeErro(err));
      return null;
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  // O saldo só serve pro formulário aberto (mesma ideia da lista de OS).
  const formularioAberto = mostrarFormulario || !!aberto;
  useEffect(() => {
    if (!formularioAberto || !isSupabaseConfigured || !lojaAtual) {
      setMovimentos(null);
      return;
    }
    let cancelado = false;
    listarMovimentos(lojaAtual.id)
      .then((m) => {
        if (!cancelado) setMovimentos(m);
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
    const atualizadas = await carregar();
    const atualizada = atualizadas?.find((o) => o.id === aberto.id);
    if (atualizada) setAberto(atualizada);
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
    saldoCarregado: movimentos !== null,
    modoOrcamento: true,
    onSalvarNova: handleSalvarNova,
    onSalvarEdicao: handleSalvarEdicao,
    onEditarItem: handleEditarItem,
    onEncerrar: async () => undefined,
    onAprovar: handleAprovar,
    onRecusar: handleRecusar,
    onCadastrarCliente: handleCadastrarCliente,
    onCadastrarVeiculo: handleCadastrarVeiculo,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="text-titulo font-semibold text-sakura-purple-dark">Orçamentos</h1>
            <p className="text-corpo text-sakura-muted">
              Preço combinado antes de virar ordem de serviço. Não baixa estoque até ser aprovado.
            </p>
          </div>
        </div>
        {nadaAberto && operador && lojaAtual && clientes.length > 0 && (
          <button
            onClick={() => {
              setAviso(null);
              setMostrarFormulario(true);
            }}
            className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
          >
            + Novo orçamento
          </button>
        )}
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado.
        </p>
      )}

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
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-corpo text-emerald-700">{aviso}</p>
      )}
      {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

      {nadaAberto && !carregando && orcamentos.length > 0 && (
        <>
          <div
            role="tablist"
            aria-label="O que mostrar na lista"
            className="flex gap-2 border-b border-sakura-gray/20"
          >
            {(
              [
                ["abertos", `Abertos (${quantosAbertos})`],
                ["recusados", `Recusados (${quantosRecusados})`],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={lista === valor}
                onClick={() => setLista(valor)}
                className={`px-4 py-2 text-corpo font-medium ${
                  lista === valor
                    ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
                    : "text-sakura-purple-dark/75 hover:text-sakura-purple-dark"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <label className="flex w-56 flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Buscar por cliente ou placa</span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: João ou ABC1D23"
              className="rounded-lg border border-sakura-borda-campo px-3 py-1.5 text-corpo focus:border-sakura-purple"
            />
          </label>
        </>
      )}

      {nadaAberto &&
        (carregando ? (
          <p className="text-corpo text-sakura-muted">Carregando...</p>
        ) : orcamentos.length === 0 ? (
          <p className="text-corpo text-sakura-muted">Nenhum orçamento ainda.</p>
        ) : daLista.length === 0 ? (
          <p className="text-corpo text-sakura-muted">
            {lista === "abertos"
              ? "Nenhum orçamento aberto com esse filtro."
              : "Nenhum orçamento recusado com esse filtro."}
          </p>
        ) : (
          <div className="overflow-x-auto sakura-card">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-2.5 py-3 font-medium">Nº</th>
                  <th className="px-2.5 py-3 font-medium">Cliente</th>
                  <th className="px-2.5 py-3 font-medium">Veículo</th>
                  <th className="px-2.5 py-3 font-medium">Feito em</th>
                  <th className="px-2.5 py-3 font-medium">Validade</th>
                  <th className="px-2.5 py-3 font-medium">Status</th>
                  <th className="px-2.5 py-3 font-medium">Total</th>
                  <th className="px-2.5 py-3" />
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
                    className="cursor-pointer border-t border-sakura-gray/20 hover:bg-sakura-pink-soft/30"
                  >
                    <td className="whitespace-nowrap px-2.5 py-3 text-sakura-muted">
                      {nomeDocumento(ordem)}
                    </td>
                    <td className="px-2.5 py-3 [overflow-wrap:anywhere]">
                      {ordem.cliente?.nome ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-3">
                      {ordem.veiculo_id && ordem.veiculo?.placa ? (
                        <LinkPlaca veiculoId={ordem.veiculo_id} placa={ordem.veiculo.placa} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-3">
                      {dataCurta(ordem.data_abertura)}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-3">
                      {ordem.validade ? diaBrasileiro(ordem.validade) : "—"}
                    </td>
                    <td className="px-2.5 py-3">
                      <StatusOrdem ordem={ordem} notas={[]} />
                    </td>
                    <td className="px-2.5 py-3">{formatarMoeda(totalOrdem(ordem.itens ?? []))}</td>
                    <td className="px-2.5 py-3 text-right">
                      <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                        {botaoWhatsapp(ordem)}
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

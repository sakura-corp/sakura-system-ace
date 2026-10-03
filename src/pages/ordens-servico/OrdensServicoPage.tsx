import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { listarJurosParcelas } from "@/lib/configuracoes";
import { dataCurta, diaLocal, hojeLocal, primeiroDiaDoMesLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import {
  custoDosItens,
  mapaCustoPecas,
  mapaCustoServicos,
} from "@/schemas/metricasCaixa";
import { BotaoWhatsapp } from "@/components/BotaoWhatsapp";
import { LinkPlaca } from "@/components/LinkPlaca";
import { criarCliente, criarVeiculo, listarClientes } from "@/lib/clientes";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
} from "@/lib/modelosWhatsapp";
import { preencherModelo } from "@/schemas/whatsapp";
import { calcularSaldoPorPeca, listarMovimentos } from "@/lib/estoque";
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
import { listarPecas } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Cliente, NovoCliente, VeiculoFormulario } from "@/types/cliente";
import type { JurosParcela } from "@/types/configuracao";
import type { MovimentoEstoque } from "@/types/estoque";
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
  nomeOrdem,
  totalOrdem,
  totalPorTipo,
} from "@/types/os";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { agruparNotasPorOrdem, temAlgumaNotaValida } from "@/schemas/situacaoFiscal";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { EmitirNotaFiscalModal } from "./EmitirNotaFiscalModal";
import { FaturamentoCard } from "./FaturamentoCard";
import { StatusOrdem } from "./StatusOrdemBadge";
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
  const location = useLocation();
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  const [pecas, setPecas] = useState<Peca[]>([]);
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
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[] | null>(null);
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
  const [aviso, setAviso] = useState<string | null>(null);
  const [lista, setLista] = useState<"os" | "vendas">("os");
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMesLocal());
  const [dataFim, setDataFim] = useState(hojeLocal());
  const [busca, setBusca] = useState("");
  const funcionarioAtualId =
    funcionarios.find((f) => f.operador_id === operador?.id)?.id ?? "";

  const saldoPorPeca = useMemo(() => calcularSaldoPorPeca(movimentos ?? []), [movimentos]);

  const custoPorPeca = useMemo(() => mapaCustoPecas(pecas), [pecas]);
  const custoPorServico = useMemo(() => mapaCustoServicos(servicos), [servicos]);

  // Usa a mesma conta de custo do Caixa, do Início e de Relações
  // (schemas/metricasCaixa.ts) em vez de refazer a soma aqui: cada tela que
  // recalculava lucro por conta própria acabou divergindo das outras — ver
  // PROJETO_STATUS.md, seção 6, item 40.
  function lucroOrdem(ordem: OrdemServico): number {
    const itens = ordem.itens ?? [];
    return totalOrdem(itens) - custoDosItens(itens, custoPorPeca, custoPorServico);
  }

  // Ordens em aberto (ainda não faturadas) sempre aparecem, não importa a
  // data — senão uma OS esquecida do mês passado sumiria da lista sem
  // ninguém perceber. O filtro de período só afasta o histórico já faturado,
  // que é o que realmente cresce sem parar. Buscando por cliente/placa, o
  // período é ignorado (a busca vale pra qualquer época).
  const ordensFiltradas = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase();
    return ordens.filter((ordem) => {
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
  async function carregar(): Promise<OrdemServico[] | null> {
    if (!isSupabaseConfigured || !lojaAtual) {
      setCarregando(false);
      return null;
    }
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
        listarOrdens(lojaAtual.id),
        listarClientes(),
        listarPecas(),
        listarServicos(),
        listarFuncionariosPublico(lojaAtual.id),
        listarJurosParcelas(lojaAtual.id),
        listarModelosWhatsapp(lojaAtual.id),
      ]);
      setOrdens(ordensCarregadas);
      setClientes(clientesCarregados);
      setPecas(pecasCarregadas);
      setServicos(servicosCarregados);
      setFuncionarios(funcionariosCarregados);
      setJurosParcelas(jurosCarregados);
      setModelosWhatsapp(modelosWhatsappCarregados);

      // Notas de todas as OS de uma vez só (uma consulta, não uma por linha)
      // — é o que diz quais notas cada OS já tem. Falhar aqui não pode
      // derrubar a lista inteira: sem essa informação a OS só aparece como
      // "Faturada", que é o comportamento de antes.
      try {
        const notas = await listarArquivosDasOrdens(ordensCarregadas.map((o) => o.id));
        setNotasPorOrdem(agruparNotasPorOrdem(notas));
      } catch (err) {
        console.error("Erro ao carregar as notas fiscais das ordens:", err);
      }

      const abrirOrdemId = (location.state as { abrirOrdemId?: string } | null)?.abrirOrdemId;
      if (abrirOrdemId) {
        const ordemParaAbrir = ordensCarregadas.find((o) => o.id === abrirOrdemId);
        if (ordemParaAbrir && ehVendaBalcao(ordemParaAbrir)) {
          setLista("vendas");
          setVendaAberta(ordemParaAbrir);
        } else if (ordemParaAbrir) {
          setOrdemEmEdicao(ordemParaAbrir);
        }
        navigate(location.pathname, { replace: true, state: null });
      }

      return ordensCarregadas;
    } catch (err) {
      console.error("Erro ao carregar ordens de serviço:", err);
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

  // Recarrega a cada abertura do formulário (em vez de guardar pra sempre):
  // lançar peça numa OS mexe no estoque, então um saldo guardado da vez
  // anterior mostraria número velho na próxima abertura.
  const formularioAberto = mostrarFormulario || !!ordemEmEdicao || mostrarVenda;
  useEffect(() => {
    if (!formularioAberto || !isSupabaseConfigured || !lojaAtual) {
      setMovimentos(null);
      return;
    }
    let cancelado = false;
    listarMovimentos(lojaAtual.id)
      .then((lista) => {
        if (!cancelado) setMovimentos(lista);
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
      await adicionarItensOrdem(id, ordemEmEdicao.numero, novosItens, operador.id, lojaAtual.id);
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
    await editarItemOrdem(item, patch, ordemEmEdicao.numero, operador.id, lojaAtual.id);
    const ordensAtualizadas = await carregar();
    const ordemAtualizada = ordensAtualizadas?.find((o) => o.id === ordemEmEdicao.id);
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
      os: nomeOrdem(ordem.numero),
      loja: lojaAtual?.nome,
    });
  }

  // Cadastro rápido de dentro da OS (item TL-08). Os dois recarregam a lista
  // de clientes antes de devolver o id: é o que faz o registro novo já
  // aparecer escolhido no campo, em vez de o operador ter que procurá-lo.
  async function handleCadastrarCliente(cliente: NovoCliente, veiculos: VeiculoFormulario[]) {
    const criado = await criarCliente(cliente, veiculos);
    const lista = await listarClientes();
    setClientes(lista);
    const veiculoId = lista.find((c) => c.id === criado.id)?.veiculos?.[0]?.id ?? null;
    return { clienteId: criado.id, veiculoId };
  }

  async function handleCadastrarVeiculo(clienteId: string, veiculo: VeiculoFormulario) {
    const criado = await criarVeiculo(clienteId, veiculo);
    setClientes(await listarClientes());
    return criado.id;
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
      setAviso(`${nomeOrdem(criada.numero, criada.tipo)} registrada.`);
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
    const criado = await criarCliente(cliente, []);
    setClientes(await listarClientes());
    return criado.id;
  }

  // Fecha tudo que estiver aberto antes de abrir outra coisa: a página só
  // mostra um formulário por vez.
  function fecharPaineis() {
    setMostrarFormulario(false);
    setOrdemEmEdicao(null);
    setOrdemFaturando(null);
    setMostrarVenda(false);
    setVendaAberta(null);
    setAviso(null);
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
    setOrdemFaturando(null);
    setVendaAberta(null);
    const recarregadas = await carregar();
    // Venda de balcão faturada pela lista (a que ficou sem pagamento) segue
    // pro mesmo lugar que uma venda nova: a NFC-e.
    if (ehVendaBalcao(faturada)) {
      const completa = recarregadas?.find((o) => o.id === faturada.id);
      if (completa) setVendaParaNota(completa);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BotaoVoltar />
          <div>
            <h1 className="text-titulo font-semibold text-sakura-purple-dark">
              Ordens de Serviço
            </h1>
            <p className="text-corpo text-sakura-muted">
              Cliente + veículo + peças usadas + serviço realizado
            </p>
          </div>
        </div>
        {nadaAberto && operador && lojaAtual && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                fecharPaineis();
                setMostrarVenda(true);
              }}
              className="rounded-xl border border-sakura-purple px-5 py-2.5 text-corpo font-medium text-sakura-purple-dark hover:bg-sakura-pink-soft/40"
            >
              + Venda de balcão
            </button>
            {clientes.length > 0 && (
              <button
                onClick={() => {
                  fecharPaineis();
                  setMostrarFormulario(true);
                }}
                className="rounded-xl bg-sakura-purple px-5 py-2.5 text-corpo font-medium text-white hover:opacity-90"
              >
                + Nova ordem de serviço
              </button>
            )}
          </div>
        )}
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para começar a abrir ordens de serviço de verdade.
        </p>
      )}

      {isSupabaseConfigured && !carregando && !lojaAtual && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          Seu usuário não tem loja atribuída. Fale com o administrador.
        </p>
      )}

      {isSupabaseConfigured && !carregando && lojaAtual && clientes.length === 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
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
          saldoPorPeca={saldoPorPeca}
          saldoCarregado={movimentos !== null}
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
          saldoPorPeca={saldoPorPeca}
          saldoCarregado={movimentos !== null}
          ordemExistente={ordemEmEdicao}
          temNotaEmitida={temAlgumaNotaValida(notasPorOrdem.get(ordemEmEdicao.id) ?? [])}
          abaInicial={abaInicialEdicao}
          onSalvarNova={handleSalvarNova}
          onSalvarEdicao={handleSalvarEdicao}
          onEditarItem={handleEditarItem}
          onEncerrar={handleEncerrar}
          onCadastrarCliente={handleCadastrarCliente}
          onCadastrarVeiculo={handleCadastrarVeiculo}
          onCancelar={() => setOrdemEmEdicao(null)}
        />
      )}

      {mostrarVenda && operador && (
        <VendaBalcaoForm
          clientes={clientes}
          pecas={pecas}
          funcionarios={funcionarios}
          funcionarioAtualId={funcionarioAtualId}
          saldoPorPeca={saldoPorPeca}
          saldoCarregado={movimentos !== null}
          jurosParcelas={jurosParcelas}
          onRegistrar={handleRegistrarVenda}
          onCadastrarCliente={handleCadastrarClienteDaVenda}
          onCancelar={() => setMostrarVenda(false)}
        />
      )}

      {vendaAberta && (
        <VendaBalcaoDetalhe
          ordem={vendaAberta}
          notas={notasPorOrdem.get(vendaAberta.id) ?? []}
          onFaturar={() => setOrdemFaturando(vendaAberta)}
          onVoltar={() => {
            setVendaAberta(null);
            setOrdemFaturando(null);
          }}
        />
      )}

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

      {aviso && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-corpo text-emerald-700">{aviso}</p>
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">
          {erro}
        </p>
      )}

      {!carregando && ordens.length > 0 && (
        <div
          role="tablist"
          aria-label="O que mostrar na lista"
          className="flex gap-2 border-b border-sakura-gray/20"
        >
          {(
            [
              ["os", `Ordens de serviço (${quantasOs})`],
              ["vendas", `Vendas de balcão (${quantasVendas})`],
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
      )}

      {!carregando && ordens.length > 0 && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Buscar por cliente ou placa</span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: João ou ABC1D23"
              className="w-56 rounded-lg border border-sakura-borda-campo px-3 py-1.5 text-corpo focus:border-sakura-purple"
            />
          </label>
          <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
            De:
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              disabled={!!busca.trim()}
              className="rounded-lg border border-sakura-borda-campo px-3 py-1.5 disabled:opacity-40"
            />
          </label>
          <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
            Até:
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              disabled={!!busca.trim()}
              className="rounded-lg border border-sakura-borda-campo px-3 py-1.5 disabled:opacity-40"
            />
          </label>
          <p className="text-rotulo text-sakura-muted">
            {busca.trim()
              ? "Buscando em todo o histórico, sem limite de data."
              : lista === "vendas"
                ? "Venda sem pagamento sempre aparece, não importa a data — o período filtra só as já faturadas."
                : "OS em aberto sempre aparecem, não importa a data — o período filtra só o histórico já faturado."}
          </p>
        </div>
      )}

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : ordens.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhuma ordem de serviço aberta ainda.
        </p>
      ) : ordensDaLista.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
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
              se precisar; e as células têm um respiro menor que o das outras
              listas. Coluna nova aqui precisa caber na folga —
              `npm run largura:telas` confere em 1366, 1536 e 1600. */}
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-2.5 py-3 font-medium">Nº</th>
                <th className="px-2.5 py-3 font-medium">Cliente</th>
                {lista === "os" && <th className="px-2.5 py-3 font-medium">Veículo</th>}
                <th className="px-2.5 py-3 font-medium">{lista === "os" ? "Abertura" : "Data"}</th>
                <th className="px-2.5 py-3 font-medium">Status</th>
                {lista === "os" && (
                  <th className={`${SO_EM_TELA_GRANDE} px-2.5 py-3 font-medium`}>Peças</th>
                )}
                {lista === "os" && (
                  <th className={`${SO_EM_TELA_GRANDE} px-2.5 py-3 font-medium`}>Serviços</th>
                )}
                <th className="px-2.5 py-3 font-medium">Total</th>
                <th className="px-2.5 py-3 font-medium">Lucro</th>
                <th className="px-2.5 py-3" />
              </tr>
            </thead>
            <tbody>
              {ordensDaLista.map((ordem) => (
                <tr
                  key={ordem.id}
                  onClick={() => {
                    fecharPaineis();
                    if (ehVendaBalcao(ordem)) {
                      setVendaAberta(ordem);
                      return;
                    }
                    setAbaInicialEdicao("detalhes");
                    setOrdemEmEdicao(ordem);
                  }}
                  className="cursor-pointer border-t border-sakura-gray/20 hover:bg-sakura-pink-soft/30"
                >
                  <td className="whitespace-nowrap px-2.5 py-3 text-sakura-muted">
                    {nomeOrdem(ordem.numero, ordem.tipo)}
                  </td>
                  <td className="px-2.5 py-3 [overflow-wrap:anywhere]">
                    {ordem.cliente?.nome ?? "—"}
                  </td>
                  {lista === "os" && (
                    <td className="whitespace-nowrap px-2.5 py-3">
                      {ordem.veiculo_id && ordem.veiculo?.placa ? (
                        <LinkPlaca veiculoId={ordem.veiculo_id} placa={ordem.veiculo.placa} />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-2.5 py-3">{dataCurta(ordem.data_abertura)}</td>
                  <td className="px-2.5 py-3">
                    <StatusOrdem ordem={ordem} notas={notasPorOrdem.get(ordem.id) ?? []} />
                  </td>
                  {lista === "os" && (
                    <td className={`${SO_EM_TELA_GRANDE} px-2.5 py-3`}>
                      {formatarMoeda(totalPorTipo(ordem.itens ?? [], "peca"))}
                    </td>
                  )}
                  {lista === "os" && (
                    <td className={`${SO_EM_TELA_GRANDE} px-2.5 py-3`}>
                      {formatarMoeda(totalPorTipo(ordem.itens ?? [], "servico"))}
                    </td>
                  )}
                  <td className="px-2.5 py-3">{formatarMoeda(totalOrdem(ordem.itens ?? []))}</td>
                  <td className="px-2.5 py-3">{formatarMoeda(lucroOrdem(ordem))}</td>
                  <td className="px-2.5 py-3 text-right">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-end gap-2"
                    >
                      {/* O carro só fica pronto pra retirar quando a OS é
                          concluída ou faturada — antes disso o aviso seria
                          mentira. */}
                      {STATUS_COM_FECHAMENTO.includes(ordem.status) && !ehVendaBalcao(ordem) && (
                        <BotaoWhatsapp
                          telefone={
                            clientes.find((c) => c.id === ordem.cliente_id)?.telefone
                          }
                          texto={textoCarroPronto(ordem)}
                          rotulo="Avisar"
                          titulo="Avisar o cliente pelo WhatsApp que o carro está pronto"
                          aoAbrir={() => {
                            if (!lojaAtual) return;
                            registrarMensagemAberta(
                              lojaAtual.id,
                              "carro_pronto",
                              ordem.id,
                              clientes.find((c) => c.id === ordem.cliente_id)?.telefone ?? null,
                              operador?.id ?? null,
                            );
                          }}
                        />
                      )}
                      {STATUS_COM_FECHAMENTO.includes(ordem.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fecharPaineis();
                            if (ehVendaBalcao(ordem)) {
                              setVendaAberta(ordem);
                              return;
                            }
                            setAbaInicialEdicao("fechamento");
                            setOrdemEmEdicao(ordem);
                          }}
                          className="rounded-full border border-sakura-purple px-3 py-1.5 text-rotulo font-medium text-sakura-purple-dark hover:bg-sakura-pink-soft/40"
                        >
                          Fechamento
                        </button>
                      )}
                      {ordem.status !== "faturada" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fecharPaineis();
                            setOrdemFaturando(ordem);
                          }}
                          className="rounded-full bg-sakura-purple px-3 py-1.5 text-rotulo font-medium text-white hover:opacity-90"
                        >
                          Faturar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Chips } from "@/components/Chips";
import { Dica } from "@/components/Dica";
import { LinhaDeLista, type ItemDoMais } from "@/components/molde/LinhaDeLista";
import { MoldeLista } from "@/components/molde/MoldeLista";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { avisar } from "@/lib/avisoQueSome";
import { listarClientesParaEscolha } from "@/lib/clientes";
import { buscarConfiguracaoPix } from "@/lib/configuracoes";
import { criarContaReceber, listarContasReceber, receberConta } from "@/lib/contasReceber";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import {
  listarModelosWhatsapp,
  registrarMensagemAberta,
  textoDoModelo,
  ultimasMensagensPorReferencia,
} from "@/lib/modelosWhatsapp";
import { abrirConversaWhatsapp } from "@/lib/whatsapp";
import {
  casaComABusca,
  contasDoMes,
  mesDoDia,
  mesesParaEscolher,
  ordenarParaALista,
  resumoDasAtrasadas,
  resumoDoMes,
  TODOS_OS_MESES,
  type MesDoFiltro,
} from "@/schemas/contas";
import { formatarMoeda } from "@/schemas/dinheiro";
import { montarPixCopiaECola } from "@/schemas/pix";
import { blocoPix, preencherModelo } from "@/schemas/whatsapp";
import { ehConsumidor, type Cliente } from "@/types/cliente";
import type { ConfiguracaoPix } from "@/types/configuracao";
import type { ContaReceber, NovaContaReceber } from "@/types/contaReceber";
import { temPermissao } from "@/types/operador";
import {
  CartoesDasContas,
  DiaDaQuitacao,
  DiaNaLinhaDeBaixo,
  FiltroDoMes,
  LadoDaConta,
  SeloDeQuitada,
  SeloDoVencimento,
} from "@/pages/contas-pagar/SeloDoVencimento";
import { situacaoDoVencimento } from "@/pages/contas-pagar/vencimento";
import { ContaReceberForm } from "./ContaReceberForm";
import { ReceberContaModal } from "./ReceberContaModal";

type Situacao = "todas" | "atrasadas" | "pendentes" | "recebidas";

/**
 * Contas a Receber no molde de lista da leva 8 (#1094), igual a Contas a
 * Pagar: o número que decide (a soma das atrasadas) contra o total do mês, a
 * busca e o filtro de mês juntos, o atrasado primeiro, uma ação na linha
 * ("Receber") e o resto no "⋯" (cobrar no WhatsApp, abrir a OS, a ficha do
 * cliente). A "Nova conta" abre em janela.
 */
export function ContasReceberPage() {
  const { operador, lojaAtual } = useAuth();
  // Sem o módulo Clientes a lista vem pela janela estreita (migration 0068).
  const podeVerCadastro = temPermissao(operador, "clientes");
  // A ficha do cliente (#393) pede Clientes ou Ordens de Serviço.
  const podeAbrirFichaDoCliente = podeVerCadastro || temPermissao(operador, "ordens_servico");
  const navigate = useNavigate();
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroDaCarga, setErroDaCarga] = useState<string | null>(null);
  const [erroDaAcao, setErroDaAcao] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contaRecebendo, setContaRecebendo] = useState<ContaReceber | null>(null);
  const [modelosWhatsapp, setModelosWhatsapp] = useState<Record<string, string>>({});
  // O Pix da loja (#456). Sem ele (ou se não deu pra ler) a cobrança sai como sempre.
  const [configuracaoPix, setConfiguracaoPix] = useState<ConfiguracaoPix | null>(null);
  // Quando cada conta teve a última cobrança ABERTA no WhatsApp (migration 0052):
  // responde o "já falei com essa pessoa?".
  const [ultimasCobrancas, setUltimasCobrancas] = useState<Map<string, string>>(new Map());
  const [busca, setBusca] = useState("");
  const [mes, setMes] = useState<MesDoFiltro>(() => mesDoDia(hojeLocal()));
  const [situacao, setSituacao] = useState<Situacao>("todas");
  // Só a carga mais nova mexe na tela (#927).
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);

  async function carregar() {
    const carga = comecar(lojaAtual?.id);
    if (!carga) {
      if (!lojaAtual) setCarregando(false);
      return;
    }
    setCarregando(true);
    setErroDaCarga(null);
    try {
      const [listaContas, listaClientes, modelos, cobrancas, pix] = await Promise.all([
        listarContasReceber(carga.lojaId),
        listarClientesParaEscolha(podeVerCadastro),
        listarModelosWhatsapp(carga.lojaId),
        ultimasMensagensPorReferencia(carga.lojaId, "cobranca"),
        buscarConfiguracaoPix(carga.lojaId),
      ]);
      if (!carga.aindaEhAtual()) return;
      setContas(listaContas);
      setClientes(listaClientes);
      setModelosWhatsapp(modelos);
      setConfiguracaoPix(pix);
      setUltimasCobrancas(cobrancas);
      carga.gravou();
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar contas a receber:", err);
      setErroDaCarga(mensagemDeErro(err));
    } finally {
      if (carga.aindaEhAtual()) setCarregando(false);
    }
  }

  useEffect(() => {
    // O erro de uma ação da loja de antes não fica em cima da lista da loja nova.
    setErroDaAcao(null);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaAtual?.id]);

  async function handleCadastrar(conta: NovaContaReceber) {
    if (!lojaAtual) return;
    await criarContaReceber(conta, lojaAtual.id);
    setMostrarFormulario(false);
    avisar(`Conta a receber cadastrada: ${conta.descricao}`);
    await carregar();
  }

  async function handleConfirmarRecebimento(valorRecebido: number, formaPagamento: string) {
    if (!contaRecebendo || !operador) return;
    await receberConta({
      conta: contaRecebendo,
      valorRecebido,
      formaPagamento,
      operadorId: operador.id,
    });
    avisar(`Conta recebida: ${contaRecebendo.descricao}`);
    setContaRecebendo(null);
    await carregar();
  }

  function abrirOrdem(conta: ContaReceber) {
    if (!conta.ordem_servico_id) return;
    navigate("/ordens-servico", { state: { abrirOrdemId: conta.ordem_servico_id } });
  }

  function textoDaCobranca(conta: ContaReceber): string {
    return preencherModelo(textoDoModelo(modelosWhatsapp, "cobranca"), {
      cliente: conta.cliente?.nome,
      valor: formatarMoeda(conta.valor),
      // O `vencimento` é uma coluna `date`: `new Date` leria meia-noite em UTC
      // e a mensagem iria pro cliente com o dia anterior (#1005).
      vencimento: diaBrasileiro(conta.vencimento),
      descricao: conta.descricao,
      loja: lojaAtual?.nome,
      pix: blocoPix(
        configuracaoPix
          ? montarPixCopiaECola({
              chave: configuracaoPix.chave,
              nomeRecebedor: configuracaoPix.nome_recebedor,
              cidadeRecebedor: configuracaoPix.cidade_recebedor,
              valor: conta.valor,
            })
          : null,
      ),
    });
  }

  // Cobrar mora no "⋯" (1 ação na linha: "Receber"). O erro (telefone sem
  // DDD, o mais comum) aparece em cima da lista, e não some calado.
  async function cobrar(conta: ContaReceber) {
    const telefone = clientes.find((c) => c.id === conta.cliente_id)?.telefone;
    setErroDaAcao(null);
    try {
      await abrirConversaWhatsapp(telefone, textoDaCobranca(conta));
      if (!lojaAtual) return;
      registrarMensagemAberta(lojaAtual.id, "cobranca", conta.id, telefone ?? null, operador?.id ?? null).then(
        carregar,
      );
    } catch (err) {
      console.error("Erro ao abrir o WhatsApp:", err);
      setErroDaAcao(mensagemDeErro(err));
    }
  }

  const hoje = hojeLocal();
  const atrasadas = useMemo(() => resumoDasAtrasadas(contas, hoje), [contas, hoje]);
  const doMes = useMemo(() => resumoDoMes(contas, mes), [contas, mes]);
  const meses = useMemo(() => mesesParaEscolher(contas, hoje, mes), [contas, hoje, mes]);
  const quantasAtrasadasNoMes = useMemo(() => resumoDasAtrasadas(contasDoMes(contas, mes), hoje).quantas, [contas, mes, hoje]);
  const atrasadasDeOutrosMeses = atrasadas.quantas - quantasAtrasadasNoMes;
  // Com texto na busca, ela procura em TODOS os meses (o cliente com conta em
  // dezembro, buscado em novembro, não pode dar "nada encontrado").
  const buscando = busca.trim() !== "";

  const visiveis = useMemo(() => {
    const filtradas = contasDoMes(contas, buscando ? TODOS_OS_MESES : mes).filter((conta) => {
      if (situacao === "recebidas" && conta.status !== "recebido") return false;
      if (situacao === "pendentes" && conta.status !== "pendente") return false;
      if (
        situacao === "atrasadas" &&
        (conta.status !== "pendente" || situacaoDoVencimento(conta.vencimento, hoje) !== "atrasada")
      )
        return false;
      return casaComABusca([conta.cliente?.nome, conta.descricao], busca);
    });
    return ordenarParaALista(filtradas, hoje);
  }, [contas, mes, situacao, busca, buscando, hoje]);

  // Vindo de um botão que some depois do clique, o foco vai pro filtro de mês.
  const idDoFiltroDoMes = useId();
  function verAtrasadas(devolverFoco = false) {
    setMes(TODOS_OS_MESES);
    setSituacao("atrasadas");
    if (devolverFoco) requestAnimationFrame(() => document.getElementById(idDoFiltroDoMes)?.focus());
  }

  function linhaDaConta(conta: ContaReceber) {
    const recebida = conta.status === "recebido";
    const ultimaCobranca = ultimasCobrancas.get(conta.id);
    const nomeDoCliente = conta.cliente?.nome ?? "Sem cliente";

    const mais: ItemDoMais[] = [];
    // Sem o módulo Clientes o telefone não chega (a janela da migration 0068
    // só tem o nome): o "Cobrar" diria "cadastro sem telefone", que é mentira.
    if (!recebida && podeVerCadastro) {
      mais.push({ rotulo: "Cobrar no WhatsApp", aoClicar: () => cobrar(conta) });
    }
    if (conta.ordem_servico_id) {
      mais.push({ rotulo: "Abrir a OS", aoClicar: () => abrirOrdem(conta) });
    }
    if (podeAbrirFichaDoCliente && conta.cliente_id && !ehConsumidor(conta.cliente_id)) {
      mais.push({ rotulo: "Abrir a ficha do cliente", aoClicar: () => navigate(`/clientes/${conta.cliente_id}`) });
    }

    const detalhe = (
      <>
        <DiaNaLinhaDeBaixo vencimento={conta.vencimento} rotulo="previsto" />
        {recebida && <DiaDaQuitacao rotulo="recebida" quando={conta.data_recebimento} hoje={hoje} />}
        {conta.descricao}
        {!recebida && ultimaCobranca && (
          <>
            {" · "}
            <Dica texto="O sistema só sabe que a conversa foi aberta — se a mensagem foi mesmo enviada, só você sabe.">
              <span className="cursor-default">
                {/* Data COM hora (timestamptz): o `new Date` está certo aqui (#1005). */}
                cobrado em {new Date(ultimaCobranca).toLocaleDateString("pt-BR")}
              </span>
            </Dica>
          </>
        )}
      </>
    );

    return (
      <LinhaDeLista
        nome={nomeDoCliente}
        descricao={`a conta ${conta.descricao}`}
        detalhe={detalhe}
        lado={
          <LadoDaConta
            vencimento={conta.vencimento}
            valor={conta.valor}
            semMais={mais.length === 0}
            selo={
              recebida ? (
                <SeloDeQuitada palavra="Recebida" />
              ) : (
                <SeloDoVencimento vencimento={conta.vencimento} hoje={hoje} />
              )
            }
            acao={
              !recebida && (
                <Botao
                  variante="secundario"
                  tamanho="medio"
                  onClick={() => setContaRecebendo(conta)}
                  aria-label={`Receber — a conta ${conta.descricao}`}
                >
                  Receber
                </Botao>
              )
            }
          />
        }
        mais={mais}
      />
    );
  }

  // Recarregar (depois de receber, cobrar…) não apaga a lista nem os números:
  // as linhas ficam onde estão, só marcadas como ocupadas (o jeito do molde).
  const prontos = !carregando && dadosSaoDaLoja;
  const estado = erroDaCarga ? "erro" : !prontos ? "carregando" : "pronto";
  const temContas = dadosSaoDaLoja && contas.length > 0;

  return (
    <div className="space-y-6">
      {/* O título encolhe (a frase quebra a linha) e o "Nova conta" fica sempre à direita. */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="text-titulo font-semibold text-texto">Contas a Receber</h1>
            <p className="text-corpo text-texto-2">
              Criadas sozinhas ao faturar uma OS “a receber”, ou lançadas à mão pra cobrança fora de OS.
            </p>
          </div>
        </div>
        <Botao variante="principal" tamanho="grande" icone={<Plus />} onClick={() => setMostrarFormulario(true)} className="shrink-0">
          Nova conta
        </Botao>
      </header>

      {erroDaAcao && <AvisoDeErro>{erroDaAcao}</AvisoDeErro>}

      {!erroDaCarga && (
        <CartoesDasContas
          carregando={!dadosSaoDaLoja}
          atrasadas={atrasadas}
          mes={mes}
          doMes={doMes}
          rotuloDoQueFalta="Falta receber"
          explicacaoDasAtrasadas="A soma do que os clientes deviam ter pago e ainda não pagaram, de qualquer mês. O que vence hoje ainda não entra."
          aoVerAtrasadas={() => verAtrasadas()}
        />
      )}

      {temContas && !buscando && mes !== TODOS_OS_MESES && situacao !== "atrasadas" && atrasadasDeOutrosMeses > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 text-corpo text-texto-2">
          {atrasadasDeOutrosMeses === 1
            ? "Tem 1 conta atrasada de outro mês, fora desta lista."
            : `Tem ${atrasadasDeOutrosMeses} contas atrasadas de outros meses, fora desta lista.`}
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => verAtrasadas(true)}>
            Ver as atrasadas
          </Botao>
        </p>
      )}

      <div className="@container min-w-0">
        <MoldeLista
          rotulo="Contas a receber"
          estado={estado}
          itens={dadosSaoDaLoja ? visiveis : []}
          chave={(conta) => conta.id}
          linha={linhaDaConta}
          limite={50}
          busca={
            temContas
              ? {
                  valor: busca,
                  aoMudar: setBusca,
                  rotulo: "Buscar conta, em todos os meses",
                  dica: "Cliente ou descrição (todos os meses)",
                }
              : undefined
          }
          filtros={
            temContas && (
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                <FiltroDoMes id={idDoFiltroDoMes} meses={meses} valor={mes} aoMudar={setMes} />
                <Chips
                  rotulo="Situação"
                  valor={situacao}
                  aoEscolher={(nova) => (nova === "atrasadas" ? verAtrasadas() : setSituacao(nova))}
                  opcoes={[
                    { valor: "todas", nome: "Todas" },
                    { valor: "atrasadas", nome: `Atrasadas (${atrasadas.quantas})` },
                    { valor: "pendentes", nome: "A receber" },
                    { valor: "recebidas", nome: "Recebidas" },
                  ]}
                />
              </div>
            )
          }
          // Sem contas, os filtros nem aparecem: a situação esquecida ligada não
          // pode trocar o "Nenhuma conta" por "Limpar os filtros".
          filtroAtivo={temContas && situacao !== "todas"}
          aoLimparFiltros={() => setSituacao("todas")}
          vazio={{
            frase: contas.length === 0 ? "Nenhuma conta a receber ainda." : "Nenhuma conta neste mês.",
            acao: { rotulo: "Cadastrar conta", aoClicar: () => setMostrarFormulario(true) },
          }}
          erro={erroDaCarga ? { mensagem: erroDaCarga, tentarDeNovo: carregar } : undefined}
        />
      </div>

      {mostrarFormulario && (
        <ContaReceberForm
          clientes={clientes}
          onSalvar={handleCadastrar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {contaRecebendo && (
        <ReceberContaModal
          conta={contaRecebendo}
          hoje={hoje}
          onConfirmar={handleConfirmarRecebimento}
          onFechar={() => setContaRecebendo(null)}
        />
      )}
    </div>
  );
}

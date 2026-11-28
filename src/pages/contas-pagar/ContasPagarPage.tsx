import { useEffect, useId, useMemo, useState } from "react";
import { Plus, Repeat } from "lucide-react";
import { AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Chips } from "@/components/Chips";
import { useConfirmar } from "@/components/JanelaDeConfirmar";
import { LinhaDeLista } from "@/components/molde/LinhaDeLista";
import { MoldeLista } from "@/components/molde/MoldeLista";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { avisar } from "@/lib/avisoQueSome";
import { listarCategoriasCaixa } from "@/lib/categoriasCaixa";
import {
  criarContaPagar,
  desfazerPagamento,
  excluirContaPagar,
  listarContasPagar,
  pagarConta,
} from "@/lib/contasPagar";
import { hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
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
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { ContaPagar, NovaContaPagar } from "@/types/contaPagar";
import { ContaPagarForm } from "./ContaPagarForm";
import { PagarContaModal } from "./PagarContaModal";
import {
  CartoesDasContas,
  DiaDaQuitacao,
  DiaNaLinhaDeBaixo,
  FiltroDoMes,
  LadoDaConta,
  SeloDeQuitada,
  SeloDoVencimento,
} from "./SeloDoVencimento";
import { situacaoDoVencimento } from "./vencimento";

type Situacao = "todas" | "atrasadas" | "pendentes" | "pagas";

/**
 * Contas a Pagar no molde de lista da leva 8 (#1094): em cima, o número que
 * decide (a soma das atrasadas) contra o total do mês; a busca e o filtro de
 * mês juntos em cima da lista; o atrasado primeiro; uma ação na linha
 * ("Pagar") e o resto no "⋯"; a "Nova conta" em janela.
 */
export function ContasPagarPage() {
  const { operador, lojaAtual } = useAuth();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [categorias, setCategorias] = useState<CategoriaCaixa[]>([]);
  const [carregando, setCarregando] = useState(true);
  // O erro de CARREGAR (vai no lugar da lista, com "Tentar de novo") e o de
  // uma ação (excluir, desfazer), que fica em cima com a lista na tela.
  const [erroDaCarga, setErroDaCarga] = useState<string | null>(null);
  const [erroDaAcao, setErroDaAcao] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [contaPagando, setContaPagando] = useState<ContaPagar | null>(null);
  const [busca, setBusca] = useState("");
  const [mes, setMes] = useState<MesDoFiltro>(() => mesDoDia(hojeLocal()));
  const [situacao, setSituacao] = useState<Situacao>("todas");
  const { confirmar, janela: janelaDeConfirmar } = useConfirmar();
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
      const [listaContas, listaCategorias] = await Promise.all([
        listarContasPagar(carga.lojaId),
        listarCategoriasCaixa(),
      ]);
      if (!carga.aindaEhAtual()) return;
      setContas(listaContas);
      setCategorias(listaCategorias);
      carga.gravou();
    } catch (err) {
      if (!carga.aindaEhAtual()) return;
      console.error("Erro ao carregar contas a pagar:", err);
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

  async function handleCadastrar(conta: NovaContaPagar) {
    if (!lojaAtual) return;
    await criarContaPagar(conta, lojaAtual.id);
    setMostrarFormulario(false);
    avisar(`Conta cadastrada: ${conta.descricao}`);
    await carregar();
  }

  async function handleConfirmarPagamento(valorPago: number, formaPagamento: string) {
    if (!contaPagando || !operador) return;
    await pagarConta({
      conta: contaPagando,
      valorPago,
      formaPagamento,
      operadorId: operador.id,
    });
    avisar(`Conta paga: ${contaPagando.descricao}`);
    setContaPagando(null);
    await carregar();
  }

  async function handleExcluir(conta: ContaPagar) {
    const sim = await confirmar({
      acao: "Excluir a conta",
      item: conta.descricao,
      botao: "Excluir conta",
    });
    if (!sim) return;
    setErroDaAcao(null);
    try {
      await excluirContaPagar(conta.id);
      avisar(`Conta excluída: ${conta.descricao}`);
      await carregar();
    } catch (err) {
      console.error("Erro ao excluir conta a pagar:", err);
      setErroDaAcao(mensagemDeErro(err));
    }
  }

  async function handleDesfazerPagamento(conta: ContaPagar) {
    const sim = await confirmar({
      acao: "Desfazer o pagamento de",
      item: conta.descricao,
      explicacao: "A conta volta a ficar pendente, e a Saída lançada no Caixa é removida.",
      botao: "Desfazer pagamento",
    });
    if (!sim) return;
    setErroDaAcao(null);
    try {
      await desfazerPagamento(conta);
      avisar(`Pagamento desfeito: ${conta.descricao}`);
      await carregar();
    } catch (err) {
      console.error("Erro ao desfazer pagamento:", err);
      setErroDaAcao(mensagemDeErro(err));
    }
  }

  const hoje = hojeLocal();
  const atrasadas = useMemo(() => resumoDasAtrasadas(contas, hoje), [contas, hoje]);
  const doMes = useMemo(() => resumoDoMes(contas, mes), [contas, mes]);
  const meses = useMemo(() => mesesParaEscolher(contas, hoje, mes), [contas, hoje, mes]);
  const quantasAtrasadasNoMes = useMemo(() => resumoDasAtrasadas(contasDoMes(contas, mes), hoje).quantas, [contas, mes, hoje]);
  const atrasadasDeOutrosMeses = atrasadas.quantas - quantasAtrasadasNoMes;
  // Com texto na busca, ela procura em TODOS os meses: a conta de dezembro
  // buscada em novembro não pode dar "nada encontrado" (achado da revisão).
  const buscando = busca.trim() !== "";

  const visiveis = useMemo(() => {
    const filtradas = contasDoMes(contas, buscando ? TODOS_OS_MESES : mes).filter((conta) => {
      if (situacao === "pagas" && conta.status !== "paga") return false;
      if (situacao === "pendentes" && conta.status !== "pendente") return false;
      if (
        situacao === "atrasadas" &&
        (conta.status !== "pendente" || situacaoDoVencimento(conta.vencimento, hoje) !== "atrasada")
      )
        return false;
      return casaComABusca([conta.descricao, conta.categoria?.nome], busca);
    });
    return ordenarParaALista(filtradas, hoje);
  }, [contas, mes, situacao, busca, buscando, hoje]);

  // "Ver as atrasadas": todas, de qualquer mês. Vindo de um botão que some
  // depois do clique (a faixa de outros meses), o foco vai pro filtro de mês,
  // e não pro começo da tela.
  const idDoFiltroDoMes = useId();
  function verAtrasadas(devolverFoco = false) {
    setMes(TODOS_OS_MESES);
    setSituacao("atrasadas");
    if (devolverFoco) requestAnimationFrame(() => document.getElementById(idDoFiltroDoMes)?.focus());
  }

  function linhaDaConta(conta: ContaPagar) {
    const paga = conta.status === "paga";
    const detalhe = (
      <>
        <DiaNaLinhaDeBaixo vencimento={conta.vencimento} rotulo={paga ? "venceu" : "vence"} />
        {paga && <DiaDaQuitacao rotulo="paga" quando={conta.data_pagamento} hoje={hoje} />}
        {conta.categoria?.nome ?? "Sem categoria"}
        {conta.recorrente && (
          <span className="ml-2 inline-flex items-center gap-1">
            <Repeat aria-hidden="true" className="size-3.5" />
            Mensal
          </span>
        )}
      </>
    );
    return (
      <LinhaDeLista
        nome={conta.descricao}
        descricao={`a conta ${conta.descricao}`}
        detalhe={detalhe}
        lado={
          <LadoDaConta
            vencimento={conta.vencimento}
            valor={conta.valor}
            selo={
              paga ? (
                <SeloDeQuitada palavra="Paga" />
              ) : (
                <SeloDoVencimento vencimento={conta.vencimento} hoje={hoje} />
              )
            }
            acao={
              !paga && (
                <Botao
                  variante="secundario"
                  tamanho="medio"
                  onClick={() => setContaPagando(conta)}
                  aria-label={`Pagar — a conta ${conta.descricao}`}
                >
                  Pagar
                </Botao>
              )
            }
          />
        }
        mais={
          paga
            ? [{ rotulo: "Desfazer pagamento", aoClicar: () => handleDesfazerPagamento(conta) }]
            : [{ rotulo: "Excluir conta", perigosa: true, aoClicar: () => handleExcluir(conta) }]
        }
      />
    );
  }

  // Recarregar (depois de pagar, excluir…) não apaga a lista nem os números:
  // as linhas ficam onde estão, só marcadas como ocupadas (o jeito do molde),
  // e a rolagem e o foco não se perdem. Só a primeira carga (ou a troca de
  // loja) mostra o esqueleto e o "—".
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
            <h1 className="text-titulo font-semibold text-texto">Contas a Pagar</h1>
            <p className="text-corpo text-texto-2">
              Contas com vencimento (aluguel, luz, fornecedor). Ao pagar, a Saída vai pro Caixa sozinha.
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
          rotuloDoQueFalta="Falta pagar"
          explicacaoDasAtrasadas="A soma das contas que já venceram e ainda não foram pagas, de qualquer mês. A que vence hoje ainda não entra."
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

      {/* `@container`: a coluna do vencimento só aparece quando a lista é larga. */}
      <div className="@container min-w-0">
        <MoldeLista
          rotulo="Contas a pagar"
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
                  dica: "Descrição ou categoria (todos os meses)",
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
                    { valor: "pendentes", nome: "A pagar" },
                    { valor: "pagas", nome: "Pagas" },
                  ]}
                />
              </div>
            )
          }
          // Sem contas, os filtros nem aparecem: a situação esquecida ligada não
          // pode trocar o "Nenhuma conta cadastrada" por "Limpar os filtros".
          filtroAtivo={temContas && situacao !== "todas"}
          aoLimparFiltros={() => setSituacao("todas")}
          vazio={{
            frase: contas.length === 0 ? "Nenhuma conta cadastrada ainda." : "Nenhuma conta neste mês.",
            acao: { rotulo: "Cadastrar conta", aoClicar: () => setMostrarFormulario(true) },
          }}
          erro={erroDaCarga ? { mensagem: erroDaCarga, tentarDeNovo: carregar } : undefined}
        />
      </div>

      {mostrarFormulario && (
        <ContaPagarForm
          categorias={categorias}
          onSalvar={handleCadastrar}
          onCancelar={() => setMostrarFormulario(false)}
        />
      )}

      {contaPagando && (
        <PagarContaModal
          conta={contaPagando}
          hoje={hoje}
          onConfirmar={handleConfirmarPagamento}
          onFechar={() => setContaPagando(null)}
        />
      )}

      {janelaDeConfirmar}
    </div>
  );
}

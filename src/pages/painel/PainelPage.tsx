import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MiniCalendario, type EventoCalendario } from "@/components/MiniCalendario";
import { VeiculoIcone } from "@/components/VeiculoIcone";
import { Valor, Variacao } from "@/components/Valor";
import { Explicacao } from "@/components/Explicacao";
import { useAuth } from "@/contexts/AuthContext";
import { feriadosNacionais } from "@/lib/feriados";
import { mensagemDeErro } from "@/lib/errors";
import { listarMovimentosCaixa } from "@/lib/caixa";
import { listarClientes } from "@/lib/clientes";
import { listarPecas } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import { formatarMoeda } from "@/schemas/dinheiro";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import {
  DIAS_PARA_ALERTAR_OS,
  contasVencendoAte,
  diasDesde,
  janelaDoMesAteODia,
  mesmaJanelaNoMesAnterior,
  metricasDoPeriodo,
  MODULOS_QUE_LEEM_O_CAIXA,
  moduloQueFaltaAoCartao,
  rotuloDeIdade,
  valoresPorCartao,
  variacoesPorCartao,
  SUBIR_E_BOM,
} from "@/schemas/painelInicio";
import { chaveData, diasDoCalendario } from "@/lib/calendario";
import { listarContasPagar } from "@/lib/contasPagar";
import {
  buscarConfiguracaoFiscal,
  buscarConfiguracaoPainelInicio,
  confirmarAliquotaCompetencia,
} from "@/lib/configuracoes";
import { AvisoAliquotaCompetencia } from "@/components/AvisoAliquotaCompetencia";
import { avisoAliquotaCompetencia } from "@/schemas/aliquotaCompetencia";
import { listarOrdens } from "@/lib/ordensServico";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  CARTAO_METRICA_DESCRICAO,
  CARTOES_INICIO_PADRAO,
} from "@/types/configuracao";
import type { CartaoMetrica, ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { Cliente } from "@/types/cliente";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import type { ContaPagar } from "@/types/contaPagar";
import type { MovimentoCaixa } from "@/types/caixa";
import { nomeOrdem } from "@/types/os";
import { MODULOS, temPermissao, type ModuloChave } from "@/types/operador";
import type { OrdemServico } from "@/types/os";

const TITULO_CARTAO: Record<CartaoMetrica, string> = {
  vendas_mes: "Vendas mês",
  custos_mes: "Custos mês",
  lucro_mes: "Lucros mês",
  ticket_medio_mes: "Ticket médio",
  contas_pagar_vencendo: "Contas a pagar vencendo",
};

const COR_CARTAO: Record<CartaoMetrica, string> = {
  vendas_mes: "#B38DAC",
  custos_mes: "#C7C7C7",
  lucro_mes: "#6E4D68",
  ticket_medio_mes: "#7A9CC6",
  contas_pagar_vencendo: "#D99A4E",
};

/** Reconstrói a data a partir de "YYYY-MM-DD", sem fuso no meio do caminho. */
function dataDaChave(chave: string): Date {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function PainelPage() {
  const { lojaAtual, operador } = useAuth();
  const navigate = useNavigate();
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [cartoesConfig, setCartoesConfig] = useState<CartaoMetrica[]>(CARTOES_INICIO_PADRAO);
  const [configFiscal, setConfigFiscal] = useState<ConfiguracaoFiscalLoja | null>(null);
  const [confirmandoAliquota, setConfirmandoAliquota] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const hoje = new Date();
  // Data como texto ("2026-09-11") pra usar de dependência dos useMemo: um
  // `new Date()` é um objeto novo a cada render e faria tudo recalcular
  // sempre.
  const chaveDeHoje = chaveData(hoje);

  // Qual mês o calendário está mostrando — só ele anda com as setas ‹ ›. Os
  // cartões continuam sempre no mês corrente: "Vendas mês" mudando junto com
  // a navegação do calendário seria uma armadilha.
  // Quem não tem Contas a Pagar não recebe conta nenhuma do banco (migration
  // 0061) — então nem pergunta, e o cartão diz "sem acesso" em vez de R$ 0,00.
  const podeVerContas = temPermissao(operador, "contas_pagar");
  // Mesma coisa pro Caixa (migration 0062) — e aqui com um cuidado a mais:
  // quem tem só OS recebe do banco um PEDAÇO do Caixa (os lançamentos de OS).
  // Pedir e somar esse pedaço daria "Vendas mês" errada com cara de certa.
  const podeVerCaixa = MODULOS_QUE_LEEM_O_CAIXA.some((m) => temPermissao(operador, m));

  const [mesVisivel, setMesVisivel] = useState(() => ({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
  }));

  useEffect(() => {
    async function carregar() {
      if (!isSupabaseConfigured || !lojaAtual) {
        setCarregando(false);
        return;
      }
      try {
        const [
          movimentosCarregados,
          ordensCarregadas,
          clientesCarregados,
          contasCarregadas,
          cartoesCarregados,
          pecasCarregadas,
          servicosCarregados,
          fiscalCarregada,
        ] = await Promise.all([
          podeVerCaixa ? listarMovimentosCaixa(lojaAtual.id) : Promise.resolve([]),
          listarOrdens(lojaAtual.id),
          listarClientes(),
          podeVerContas ? listarContasPagar(lojaAtual.id) : Promise.resolve([]),
          buscarConfiguracaoPainelInicio(lojaAtual.id),
          listarPecas(),
          listarServicos(),
          buscarConfiguracaoFiscal(lojaAtual.id),
        ]);
        setMovimentos(movimentosCarregados);
        setOrdens(ordensCarregadas);
        setClientes(clientesCarregados);
        setContas(contasCarregadas);
        setCartoesConfig(cartoesCarregados);
        setPecas(pecasCarregadas);
        setServicos(servicosCarregados);
        setConfigFiscal(fiscalCarregada);
      } catch (err) {
        console.error("Erro ao carregar painel:", err);
        setErro(mensagemDeErro(err));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [lojaAtual, podeVerContas, podeVerCaixa]);

  const avisoAliquota = avisoAliquotaCompetencia(configFiscal, hoje);

  async function handleConfirmarAliquota() {
    if (!lojaAtual) return;
    setConfirmandoAliquota(true);
    try {
      await confirmarAliquotaCompetencia(lojaAtual.id, avisoAliquota.competencia);
      setConfigFiscal(await buscarConfiguracaoFiscal(lojaAtual.id));
    } catch (err) {
      console.error("Erro ao confirmar a alíquota da competência:", err);
      setErro(mensagemDeErro(err));
    } finally {
      setConfirmandoAliquota(false);
    }
  }

  // Toda conta de dinheiro desta tela vive em `schemas/painelInicio.ts` e
  // `schemas/metricasCaixa.ts`, como função pura testada. Aqui é só ligar os
  // fios — é o Início que já mostrou faturamento no lugar de lucro uma vez
  // (PROJETO_STATUS.md, seção 6, item 40).
  const { valores, variacoes } = useMemo(() => {
    const referencia = dataDaChave(chaveDeHoje);
    const custoPeca = mapaCustoPecas(pecas);
    const custoServico = mapaCustoServicos(servicos);

    const atual = metricasDoPeriodo(
      movimentos,
      janelaDoMesAteODia(referencia),
      custoPeca,
      custoServico,
    );
    const anterior = metricasDoPeriodo(
      movimentos,
      mesmaJanelaNoMesAnterior(referencia),
      custoPeca,
      custoServico,
    );

    return {
      valores: valoresPorCartao(atual, contasVencendoAte(contas, referencia)),
      variacoes: variacoesPorCartao(atual, anterior),
    };
  }, [movimentos, pecas, servicos, contas, chaveDeHoje]);

  const filaDeAtendimento = ordens
    .filter((o) => o.status === "em_andamento")
    .sort((a, b) => (a.data_abertura < b.data_abertura ? -1 : 1));

  const veiculosNoPatio = filaDeAtendimento.filter((o) => o.veiculo);

  // Os eventos cobrem TODA a grade visível (42 dias), não só o mês corrente:
  // é isso que faz uma conta que vence dia 1º já aparecer no dia 31, no
  // pedaço apagadinho do mês que vem.
  const eventosDoCalendario = useMemo(() => {
    const dias = diasDoCalendario(mesVisivel.ano, mesVisivel.mes);
    const chavesVisiveis = new Set(dias.map(chaveData));

    const feriadosPorData = new Map<string, string>();
    for (const anoVisivel of new Set(dias.map((d) => d.getFullYear()))) {
      for (const feriado of feriadosNacionais(anoVisivel)) {
        feriadosPorData.set(feriado.data, feriado.nome);
      }
    }

    const eventos: EventoCalendario[] = [];

    for (const dia of dias) {
      const chave = chaveData(dia);
      const feriado = feriadosPorData.get(chave);
      if (feriado) {
        eventos.push({ data: chave, tipo: "feriado", nome: feriado });
      }
      for (const cliente of clientes) {
        if (!cliente.data_nascimento) continue;
        const [, mesNascimento, diaNascimento] = cliente.data_nascimento
          .split("-")
          .map(Number);
        if (mesNascimento - 1 === dia.getMonth() && diaNascimento === dia.getDate()) {
          eventos.push({
            data: chave,
            tipo: "aniversario",
            nome: `Aniversário de ${cliente.nome}`,
          });
        }
      }
    }

    for (const conta of contas) {
      if (conta.status !== "pendente") continue;
      if (!chavesVisiveis.has(conta.vencimento)) continue;
      const vencida = conta.vencimento < chaveDeHoje;
      eventos.push({
        data: conta.vencimento,
        tipo: vencida ? "conta_vencida" : "conta_a_vencer",
        nome: `${vencida ? "Venceu" : "Vence"}: ${conta.descricao} (${formatarMoeda(conta.valor)})`,
      });
    }

    return eventos;
  }, [mesVisivel, clientes, contas, chaveDeHoje]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-titulo font-semibold text-sakura-purple-dark">Início</h1>
        <p className="text-corpo text-sakura-muted">Visão geral da loja, em tempo real</p>
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para ver o painel de verdade.
        </p>
      )}

      {erro && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>
      )}

      {!carregando && (
        <AvisoAliquotaCompetencia
          aviso={avisoAliquota}
          confirmando={confirmandoAliquota}
          onConfirmar={handleConfirmarAliquota}
        />
      )}

      {carregando ? (
        <p className="text-corpo text-sakura-muted">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {cartoesConfig.map((chave) => (
              <CartaoValor
                key={chave}
                titulo={TITULO_CARTAO[chave]}
                explicacao={CARTAO_METRICA_DESCRICAO[chave]}
                valor={valores[chave]}
                variacao={variacoes[chave]}
                semAcessoA={moduloQueFaltaAoCartao(chave, (m) => temPermissao(operador, m))}
                subirEBom={SUBIR_E_BOM[chave]}
                cor={COR_CARTAO[chave]}
              />
            ))}
          </div>

          {/* Só pra quem pode abrir Relações — pros outros, o link levava a
              uma tela que a permissão não deixa abrir. */}
          {temPermissao(operador, "relatorios") && (
            <div className="flex justify-center">
              <Link
                to="/relatorios"
                className="rounded-full bg-white/10 px-5 py-2 text-rotulo font-medium text-sakura-pink hover:bg-white/20"
              >
                Ver relações completas →
              </Link>
            </div>
          )}

          <div className="grid grid-cols-[2fr_1fr] gap-4">
            <section className="sakura-card p-4">
              <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
                OS abertas
              </h2>
              {filaDeAtendimento.length === 0 ? (
                <p className="text-corpo text-sakura-purple-dark/85">
                  Nenhuma ordem de serviço em aberto no momento.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/50">
                  <table className="w-full text-left text-corpo">
                    <thead className="bg-white/10 text-sakura-pink">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nº</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
                        <th className="px-4 py-3 font-medium">Veículo</th>
                        <th className="px-4 py-3 font-medium">Aberta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filaDeAtendimento.map((ordem) => (
                        <tr
                          key={ordem.id}
                          onClick={() =>
                            navigate("/ordens-servico", { state: { abrirOrdemId: ordem.id } })
                          }
                          className="cursor-pointer border-t border-white/10 hover:bg-white/5"
                        >
                          <td className="px-4 py-3 text-sakura-purple-dark/85">
                            {nomeOrdem(ordem.numero)}
                          </td>
                          <td className="px-4 py-3">{ordem.cliente?.nome ?? "—"}</td>
                          <td className="px-4 py-3">{ordem.veiculo?.placa ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Idade desde={ordem.data_abertura} hoje={hoje} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <MiniCalendario
              ano={mesVisivel.ano}
              mes={mesVisivel.mes}
              eventos={eventosDoCalendario}
              aoMudarMes={(ano, mes) => setMesVisivel({ ano, mes })}
            />
          </div>

          <section className="sakura-card p-4">
            <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
              Veículos no pátio
            </h2>
            {veiculosNoPatio.length === 0 ? (
              <p className="text-corpo text-sakura-purple-dark/85">
                Nenhum veículo no pátio no momento.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {veiculosNoPatio.map((ordem) => (
                  <div
                    key={ordem.id}
                    className="sakura-card flex items-center gap-3 p-3"
                  >
                    <VeiculoIcone
                      tipo={ordem.veiculo?.tipo ?? null}
                      cor={ordem.veiculo?.cor}
                      className="h-14 w-24 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-corpo font-medium text-sakura-purple-dark">
                        {ordem.cliente?.nome ?? "—"}
                      </p>
                      <p className="truncate text-rotulo text-sakura-muted">
                        {ordem.veiculo?.placa ?? "—"}
                        {(ordem.veiculo?.marca || ordem.veiculo?.modelo) &&
                          ` · ${[ordem.veiculo?.marca, ordem.veiculo?.modelo]
                            .filter(Boolean)
                            .join(" ")}`}
                      </p>
                      <p className="mt-0.5 text-rotulo">
                        <Idade desde={ordem.data_abertura} hoje={hoje} prefixo="No pátio" />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/**
 * "há 3 dias" em vez de "09/09" — a data crua obriga a contar nos dedos, e um
 * carro parado no pátio é dinheiro parado. A partir de
 * `DIAS_PARA_ALERTAR_OS` a cor muda, que é o que faz alguém agir.
 */
function Idade({
  desde,
  hoje,
  prefixo,
}: {
  desde: string;
  hoje: Date;
  prefixo?: string;
}) {
  const dias = diasDesde(desde, hoje);
  const alerta = dias >= DIAS_PARA_ALERTAR_OS;
  return (
    <span
      className={alerta ? "font-medium text-amber-400" : "text-sakura-muted"}
      title={`Desde ${new Date(desde).toLocaleDateString("pt-BR")}`}
    >
      {prefixo ? `${prefixo} ` : ""}
      {rotuloDeIdade(dias)}
    </span>
  );
}

function CartaoValor({
  titulo,
  explicacao,
  valor,
  variacao,
  subirEBom,
  cor,
  semAcessoA,
}: {
  titulo: string;
  explicacao: string;
  valor: number;
  variacao: number | null;
  subirEBom: boolean;
  cor: string;
  /** O módulo que o operador não tem — aí o cartão mostra "—", não R$ 0,00. */
  semAcessoA: ModuloChave | null;
}) {
  return (
    <div
      className="sakura-card p-5"
      style={{
        boxShadow:
          "0 14px 34px -10px rgba(110, 77, 104, 0.4), " +
          "0 2px 8px -2px rgba(110, 77, 104, 0.2), " +
          "inset 0 1px 0 rgba(255, 255, 255, 0.75), " +
          `inset -12px 2px 26px -6px ${cor}66`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-rotulo text-sakura-muted">{titulo}</p>
        <Explicacao titulo={titulo} texto={explicacao} />
      </div>
      {semAcessoA ? (
        <div className="mt-2">
          <p className="text-metrica font-semibold text-sakura-muted">—</p>
          <p className="mt-1 text-rotulo text-sakura-muted">
            Sem acesso a {MODULOS.find((m) => m.chave === semAcessoA)?.label ?? semAcessoA}
          </p>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Valor valor={valor} className="text-metrica font-semibold" />
          <Variacao
            percentual={variacao}
            subirEBom={subirEBom}
            comparadoCom="o mesmo período do mês passado"
          />
        </div>
      )}
    </div>
  );
}

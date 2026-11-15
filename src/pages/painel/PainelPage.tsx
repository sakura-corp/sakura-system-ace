import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaRolavel } from "@/components/AreaRolavel";
import { LinkBotao } from "@/components/Botao";
import { LinkPlaca } from "@/components/LinkPlaca";
import { MiniCalendario, type EventoCalendario } from "@/components/MiniCalendario";
import { VeiculoIcone } from "@/components/VeiculoIcone";
import { Valor, Variacao } from "@/components/Valor";
import { CartaoNumero } from "@/components/CartaoNumero";
import { useAuth } from "@/contexts/AuthContext";
import { feriadosNacionais } from "@/lib/feriados";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { mensagemDeErro } from "@/lib/errors";
import { buscarCustoDasOrdens, listarMovimentosCaixa } from "@/lib/caixa";
import { listarClientes } from "@/lib/clientes";
import { formatarMoeda } from "@/schemas/dinheiro";
import { custoDaOrdemPeloBanco, type CustoDoBanco } from "@/schemas/metricasCaixa";
import {
  DIAS_PARA_ALERTAR_OS,
  contasVencendoAte,
  diasDesde,
  ehOsAberta,
  janelaDoMesAteODia,
  mesmaJanelaNoMesAnterior,
  metricasDoPeriodo,
  MODULOS_QUE_LEEM_O_CAIXA,
  mostraBlocosDeOS,
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
import { BotaoResumoDono, type EscolhaResumoDono } from "@/components/BotaoResumoDono";
import {
  numerosDoResumoDono,
  periodoDoResumo,
  textoResumoDono,
  type PeriodoResumoDono,
} from "@/schemas/whatsapp";
import { CentralDoDia } from "@/components/CentralDoDia";
import { nomeDoMesAnterior } from "@/schemas/centralDoDia";
import { serieDoMesPorDia } from "@/schemas/serieDoMes";
import { avisoAliquotaCompetencia } from "@/schemas/aliquotaCompetencia";
import { listarOrdens } from "@/lib/ordensServico";
import {
  CARTAO_METRICA_DESCRICAO,
  CARTOES_INICIO_PADRAO,
} from "@/types/configuracao";
import type { CartaoMetrica, ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { Cliente } from "@/types/cliente";
import type { ContaPagar } from "@/types/contaPagar";
import type { MovimentoCaixa } from "@/types/caixa";
import { nomeDocumento } from "@/types/os";
import { MODULOS, temPermissao, type ModuloChave } from "@/types/operador";
import type { OrdemServico } from "@/types/os";

const TITULO_CARTAO: Record<CartaoMetrica, string> = {
  vendas_mes: "Recebido no mês",
  custos_mes: "Custos do mês",
  lucro_mes: "Lucro do mês",
  ticket_medio_mes: "Ticket médio",
  contas_pagar_vencendo: "Contas a pagar vencendo",
};

/** Reconstrói a data a partir de "YYYY-MM-DD", sem fuso no meio do caminho. */
function dataDaChave(chave: string): Date {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

const SEM_MOVIMENTOS: MovimentoCaixa[] = [];
const SEM_ORDENS: OrdemServico[] = [];
const SEM_CLIENTES: Cliente[] = [];
const SEM_CONTAS: ContaPagar[] = [];
const SEM_CUSTOS: CustoDoBanco = new Map();

export function PainelPage() {
  const { lojaAtual, operador } = useAuth();
  // #927: só a carga mais nova mexe na tela; e se a da loja nova der erro, os
  // dados guardados (da loja anterior) não aparecem.
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
  const [movimentosGuardados, setMovimentos] = useState<MovimentoCaixa[]>([]);
  const [ordensGuardadas, setOrdens] = useState<OrdemServico[]>([]);
  const [clientesGuardados, setClientes] = useState<Cliente[]>([]);
  // Custo de cada OS dos lançamentos, calculado pelo banco (`custo_das_ordens`):
  // o Início não lê o cadastro de peças (#366).
  const [custoGuardado, setCustoDasOrdens] = useState<CustoDoBanco>(() => new Map());
  const [contasGuardadas, setContas] = useState<ContaPagar[]>([]);
  const [cartoesGuardados, setCartoesConfig] = useState<CartaoMetrica[]>(CARTOES_INICIO_PADRAO);
  const [fiscalGuardada, setConfigFiscal] = useState<ConfiguracaoFiscalLoja | null>(null);
  const movimentos = dadosSaoDaLoja ? movimentosGuardados : SEM_MOVIMENTOS;
  const ordens = dadosSaoDaLoja ? ordensGuardadas : SEM_ORDENS;
  const clientes = dadosSaoDaLoja ? clientesGuardados : SEM_CLIENTES;
  const custoDasOrdens = dadosSaoDaLoja ? custoGuardado : SEM_CUSTOS;
  const contas = dadosSaoDaLoja ? contasGuardadas : SEM_CONTAS;
  const cartoesConfig = dadosSaoDaLoja ? cartoesGuardados : CARTOES_INICIO_PADRAO;
  const configFiscal = dadosSaoDaLoja ? fiscalGuardada : null;
  const [confirmandoAliquota, setConfirmandoAliquota] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  // Só o carregamento (não o erro da alíquota): é o que deixa a Central do
  // dia sem as OS, as contas e o Caixa.
  const [falhouCarregar, setFalhouCarregar] = useState(false);

  const hoje = new Date();
  // Data como texto ("2026-09-11") pra usar de dependência dos useMemo: um
  // `new Date()` é um objeto novo a cada render e faria tudo recalcular
  // sempre.
  const chaveDeHoje = chaveData(hoje);

  // Qual mês o calendário está mostrando — só ele anda com as setas ‹ ›. Os
  // cartões continuam sempre no mês corrente: "Recebido no mês" mudando junto com
  // a navegação do calendário seria uma armadilha.
  // Quem não tem Contas a Pagar não recebe conta nenhuma do banco (migration
  // 0061) — então nem pergunta, e o cartão diz "sem acesso" em vez de R$ 0,00.
  const podeVerContas = temPermissao(operador, "contas_pagar");
  // Mesma coisa pro Caixa (migration 0062) — e aqui com um cuidado a mais:
  // quem tem só OS recebe do banco um PEDAÇO do Caixa (os lançamentos de OS).
  // Pedir e somar esse pedaço daria "Recebido no mês" errado com cara de certo.
  const podeVerCaixa = MODULOS_QUE_LEEM_O_CAIXA.some((m) => temPermissao(operador, m));

  // Os aniversários do calendário vêm do cadastro de clientes, que desde a
  // migration 0069 só responde a quem tem o módulo Clientes. Sem ele, o
  // calendário simplesmente não mostra aniversários.
  const podeVerClientes = temPermissao(operador, "clientes");

  // "OS abertas" e "Veículos no pátio" só existem pra quem tem o módulo OS
  // (#367): sem ele, o banco não devolve OS, e os dois blocos somem.
  const podeVerOS = mostraBlocosDeOS((m) => temPermissao(operador, m));

  const [mesVisivel, setMesVisivel] = useState(() => ({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
  }));

  useEffect(() => {
    async function carregar() {
      const carga = comecar(lojaAtual?.id);
      if (!carga) {
        if (!lojaAtual) setCarregando(false);
        return;
      }
      setErro(null);
      setFalhouCarregar(false);
      try {
        const [
          movimentosCarregados,
          ordensCarregadas,
          clientesCarregados,
          contasCarregadas,
          cartoesCarregados,
          fiscalCarregada,
        ] = await Promise.all([
          podeVerCaixa ? listarMovimentosCaixa(carga.lojaId) : Promise.resolve([]),
          podeVerOS ? listarOrdens(carga.lojaId) : Promise.resolve([]),
          podeVerClientes ? listarClientes() : Promise.resolve([]),
          podeVerContas ? listarContasPagar(carga.lojaId) : Promise.resolve([]),
          buscarConfiguracaoPainelInicio(carga.lojaId),
          buscarConfiguracaoFiscal(carga.lojaId),
        ]);
        // Sem o custo o lucro sairia inflado: se falhar, a tela mostra o erro.
        const custos = podeVerCaixa
          ? await buscarCustoDasOrdens(
              movimentosCarregados.flatMap((m) => (m.ordem_servico_id ? [m.ordem_servico_id] : [])),
            )
          : new Map();
        if (!carga.aindaEhAtual()) return;
        setMovimentos(movimentosCarregados);
        setCustoDasOrdens(custos);
        setOrdens(ordensCarregadas);
        setClientes(clientesCarregados);
        setContas(contasCarregadas);
        setCartoesConfig(cartoesCarregados);
        setConfigFiscal(fiscalCarregada);
        carga.gravou();
      } catch (err) {
        if (!carga.aindaEhAtual()) return;
        console.error("Erro ao carregar painel:", err);
        setErro(mensagemDeErro(err));
        setFalhouCarregar(true);
      } finally {
        if (carga.aindaEhAtual()) setCarregando(false);
      }
    }
    carregar();
  }, [lojaAtual, comecar, podeVerContas, podeVerCaixa, podeVerClientes, podeVerOS]);

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
  const { valores, variacoes, series } = useMemo(() => {
    const referencia = dataDaChave(chaveDeHoje);
    const custoDaOrdem = custoDaOrdemPeloBanco(custoDasOrdens);

    const atual = metricasDoPeriodo(
      movimentos,
      janelaDoMesAteODia(referencia),
      custoDaOrdem,
    );
    const anterior = metricasDoPeriodo(
      movimentos,
      mesmaJanelaNoMesAnterior(referencia),
      custoDaOrdem,
    );

    // O fio de cada cartão: o acumulado do mês, dia a dia (`schemas/serieDoMes.ts`).
    // Sem dados pra um fio honesto, vem `null` e o cartão fica sem ele.
    const series = Object.fromEntries(
      cartoesConfig.map((chave) => [chave, serieDoMesPorDia(movimentos, referencia, custoDaOrdem, chave)]),
    ) as Partial<Record<CartaoMetrica, number[] | null>>;

    return {
      valores: valoresPorCartao(atual, contasVencendoAte(contas, referencia)),
      variacoes: variacoesPorCartao(atual, anterior),
      series,
    };
  }, [movimentos, custoDasOrdens, contas, chaveDeHoje, cartoesConfig]);

  // Resumo pro dono (#397). Os dados são buscados DE NOVO na hora do clique,
  // e o "hoje" também é o do clique: o Início não recarrega sozinho, e um PC
  // parado nesta tela desde cedo mandaria pro dono os números de horas atrás
  // (ou de ontem). As contas são as mesmas dos cartões (`numerosDoResumoDono`).
  const escolhaDoResumo = (periodo: PeriodoResumoDono, rotulo: string): EscolhaResumoDono => ({
    rotulo,
    montarTexto: async ({ modelo, loja, podeVer }) => {
      if (!lojaAtual) throw new Error("Nenhuma loja selecionada.");
      const referencia = dataDaChave(chaveData(new Date()));
      const [modeloDaLoja, movimentosAgora, ordensAgora, contasAgora] = await Promise.all([
        modelo,
        listarMovimentosCaixa(lojaAtual.id),
        mostraBlocosDeOS(podeVer) ? listarOrdens(lojaAtual.id) : Promise.resolve([]),
        podeVer("contas_pagar") ? listarContasPagar(lojaAtual.id) : Promise.resolve([]),
      ]);
      // Sem o custo o lucro sairia inflado: se falhar, o botão mostra o erro.
      const custos = await buscarCustoDasOrdens(
        movimentosAgora.flatMap((m) => (m.ordem_servico_id ? [m.ordem_servico_id] : [])),
      );
      return textoResumoDono({
        loja,
        periodo: periodoDoResumo(periodo, referencia, referencia),
        modelo: modeloDaLoja,
        numeros: numerosDoResumoDono({
          periodo,
          referencia,
          hoje: referencia,
          movimentos: movimentosAgora,
          custoDaOrdem: custoDaOrdemPeloBanco(custos),
          ordens: ordensAgora,
          contas: contasAgora,
          podeVer,
        }),
      });
    },
  });

  const filaDeAtendimento = ordens
    .filter(ehOsAberta)
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-titulo text-titulo font-bold text-texto">Início</h1>
          <p className="text-corpo text-texto-2">Visão geral da loja, em tempo real</p>
        </div>
        {/* Some se o carregamento falhou: com os dados pela metade, o resumo
            sairia com números errados com cara de certos. */}
        {!carregando && !falhouCarregar && (
          <BotaoResumoDono
            escolhas={[escolhaDoResumo("dia", "Hoje"), escolhaDoResumo("mes", "Este mês")]}
          />
        )}
      </header>

      {erro && (
        <p className="rounded-xl bg-perigo/[0.13] px-4 py-3 text-corpo text-perigo">{erro}</p>
      )}

      {!carregando && (
        <AvisoAliquotaCompetencia
          aviso={avisoAliquota}
          confirmando={confirmandoAliquota}
          onConfirmar={handleConfirmarAliquota}
        />
      )}

      {carregando ? (
        <p className="text-corpo text-texto-2">Carregando...</p>
      ) : (
        <>
          {/* O que precisa de atenção hoje (#454). Os cartões abaixo não mudam. */}
          <CentralDoDia
            ordens={ordens}
            contasPagar={contas}
            movimentos={movimentos}
            clientes={clientes}
            dadosIncompletos={falhouCarregar}
          />

          <div className="grid grid-cols-3 gap-4">
            {cartoesConfig.map((chave) => (
              <CartaoValor
                key={chave}
                titulo={TITULO_CARTAO[chave]}
                explicacao={CARTAO_METRICA_DESCRICAO[chave]}
                valor={valores[chave]}
                variacao={variacoes[chave]}
                fio={series[chave] ?? null}
                semAcessoA={moduloQueFaltaAoCartao(chave, (m) => temPermissao(operador, m))}
                subirEBom={SUBIR_E_BOM[chave]}
                mesAnterior={nomeDoMesAnterior(chaveDeHoje)}
              />
            ))}
          </div>

          {/* Só pra quem pode abrir Relações — pros outros, o link levava a
              uma tela que a permissão não deixa abrir. Fica junto dos números
              de que ele fala (e não dentro de "OS abertas", como no conceito). */}
          {temPermissao(operador, "relatorios") && (
            <div className="-mt-3 flex justify-end">
              <LinkBotao
                to="/relatorios"
                variante="fantasma"
                tamanho="pequeno"
                icone={<ArrowRight aria-hidden="true" />}
                className="flex-row-reverse"
              >
                Ver relações completas
              </LinkBotao>
            </div>
          )}

          <div className={podeVerOS ? "grid grid-cols-[2fr_1fr] gap-4" : "grid grid-cols-1 gap-4"}>
            {podeVerOS && (
              <section className="sakura-card min-w-0 overflow-hidden" aria-labelledby="os-abertas-titulo">
                <div className="flex items-center gap-2 px-[18px] pb-2 pt-4">
                  <h2 id="os-abertas-titulo" className="font-titulo text-subtitulo font-semibold text-texto">
                    OS abertas
                  </h2>
                  <span
                    data-total-os
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-passar px-2 text-rotulo font-semibold text-texto"
                  >
                    {filaDeAtendimento.length}
                  </span>
                </div>
                {filaDeAtendimento.length === 0 ? (
                  <p className="px-[18px] pb-4 text-corpo text-texto-2">
                    Nenhuma ordem de serviço em aberto no momento.
                  </p>
                ) : (
                  <OsAbertas ordens={filaDeAtendimento} hoje={hoje} />
                )}
              </section>
            )}

            <MiniCalendario
              ano={mesVisivel.ano}
              mes={mesVisivel.mes}
              eventos={eventosDoCalendario}
              aoMudarMes={(ano, mes) => setMesVisivel({ ano, mes })}
            />
          </div>

          {podeVerOS && (
            <section className="sakura-card p-4">
              <h2 className="mb-3 font-titulo text-subtitulo font-semibold text-texto">
                Veículos no pátio
              </h2>
              {veiculosNoPatio.length === 0 ? (
                <p className="text-corpo text-texto-2">
                  Nenhum veículo no pátio no momento.
                </p>
              ) : (
                <AreaPatio rola={veiculosNoPatio.length > VEICULOS_A_VISTA}>
                  {veiculosNoPatio.map((ordem) => (
                    <div
                      key={ordem.id}
                      className="flex items-center gap-3 rounded-2xl border border-linha bg-fundo/40 p-3"
                    >
                      <VeiculoIcone
                        tipo={ordem.veiculo?.tipo ?? null}
                        cor={ordem.veiculo?.cor}
                        className="h-14 w-24 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-corpo font-semibold text-texto">
                          {ordem.cliente?.nome ?? "—"}
                        </p>
                        <p className="truncate text-rotulo text-texto-2">
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
                </AreaPatio>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Quantas linhas da tabela de OS cabem à vista; com mais, ela rola por dentro. */
const OS_A_VISTA = 5;
const ALTURA_DA_LINHA_DE_OS_PX = 52;
/** Quantos carros do pátio cabem à vista (duas fileiras de três); com mais, rola por dentro. */
const VEICULOS_A_VISTA = 6;
const ALTURA_DO_PATIO_PX = 192;

/**
 * "OS abertas": a tabela do Início. Fica de tamanho fixo quando a lista passa de
 * `OS_A_VISTA` linhas (rola por dentro, o resto da tela não se mexe). O selo
 * "Em andamento" do conceito ficou de fora: a lista só tem OS aberta, e ele
 * repetiria a mesma palavra em toda linha (ponto pra Sofia decidir).
 */
function OsAbertas({ ordens, hoje }: { ordens: OrdemServico[]; hoje: Date }) {
  const navigate = useNavigate();
  const tabela = (
    <table className="sakura-tabela">
      <thead>
        <tr>
          <th className="sticky top-0 z-[1] bg-cartao">Nº</th>
          <th className="sticky top-0 z-[1] bg-cartao">Cliente</th>
          <th className="sticky top-0 z-[1] bg-cartao">Veículo</th>
          <th className="sticky top-0 z-[1] bg-cartao">Aberta</th>
        </tr>
      </thead>
      <tbody>
        {ordens.map((ordem) => (
          <tr
            key={ordem.id}
            onClick={() => navigate("/ordens-servico", { state: { abrirOrdemId: ordem.id } })}
            className="cursor-pointer"
          >
            <td className="whitespace-nowrap text-texto-2">{nomeDocumento(ordem)}</td>
            <td className="font-semibold">{ordem.cliente?.nome ?? "—"}</td>
            <td>
              {ordem.veiculo && ordem.veiculo_id ? (
                <LinkPlaca veiculoId={ordem.veiculo_id} placa={ordem.veiculo.placa} />
              ) : (
                (ordem.veiculo?.placa ?? "—")
              )}
            </td>
            <td>
              <Idade desde={ordem.data_abertura} hoje={hoje} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  if (ordens.length <= OS_A_VISTA) return <div className="overflow-x-auto">{tabela}</div>;
  return (
    // O cabeçalho + 5 linhas à vista; a sexta aparece cortada, o que mostra que tem mais.
    <div style={{ height: ALTURA_DA_LINHA_DE_OS_PX * OS_A_VISTA + 80 }}>
      <AreaRolavel>{tabela}</AreaRolavel>
    </div>
  );
}

/** Os carros do pátio: três por fileira; passando de duas fileiras, o bloco rola por dentro. */
function AreaPatio({ rola, children }: { rola: boolean; children: React.ReactNode }) {
  const grade = <div className="grid grid-cols-3 gap-3">{children}</div>;
  if (!rola) return grade;
  return (
    <div style={{ height: ALTURA_DO_PATIO_PX }}>
      <AreaRolavel className="pr-3">{grade}</AreaRolavel>
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
      className={alerta ? "font-medium text-atencao" : "text-texto-2"}
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
  mesAnterior,
  semAcessoA,
  fio,
}: {
  titulo: string;
  /** O fio de gráfico: o acumulado do mês, dia a dia. `null` = sem dados pra desenhar. */
  fio: number[] | null;
  explicacao: string;
  valor: number;
  variacao: number | null;
  subirEBom: boolean;
  /** "outubro": o nome do mês com que a variação compara, escrito no cartão. */
  mesAnterior: string;
  /** O módulo que o operador não tem — aí o cartão mostra "—", não R$ 0,00. */
  semAcessoA: ModuloChave | null;
}) {
  return (
    <CartaoNumero
      titulo={titulo}
      explicacao={explicacao}
      fio={fio}
      semAcesso={
        semAcessoA
          ? `Sem acesso a ${MODULOS.find((m) => m.chave === semAcessoA)?.label ?? semAcessoA}`
          : undefined
      }
      variacao={
        // Sem com o que comparar, o cartão fica sem a linha da variação (e não
        // com uma faixa vazia embaixo do número).
        variacao === null ? undefined : (
          <Variacao
            percentual={variacao}
            subirEBom={subirEBom}
            comparadoCom="o mesmo período do mês passado"
            contra={mesAnterior}
          />
        )
      }
    >
      <Valor valor={valor} />
    </CartaoNumero>
  );
}

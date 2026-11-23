import { useEffect, useMemo, useState } from "react";
import { AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { BotaoResumoDono } from "@/components/BotaoResumoDono";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useAuth } from "@/contexts/AuthContext";
import { useCargaMaisNova } from "@/hooks/useCargaMaisNova";
import { listarMovimentosCaixa } from "@/lib/caixa";
import { listarContasPagar } from "@/lib/contasPagar";
import { listarContasReceber } from "@/lib/contasReceber";
import { hojeLocal } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/errors";
import { listarOrdens } from "@/lib/ordensServico";
import { listarPecas } from "@/lib/pecas";
import { listarServicos } from "@/lib/servicos";
import { lucratividadePorItem } from "@/schemas/lucratividade";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import {
  nomeDoMes,
  periodoComparavelNoMesAnterior,
  periodoDoAtalho,
  mesDoPeriodo,
  resumoDoPeriodo,
  type AtalhoDoPeriodo,
  type PeriodoRelacoes,
} from "@/schemas/relacoes";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import { temPermissao } from "@/types/operador";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { BlocoCurvaABC } from "./BlocoCurvaABC";
import { BlocoPorItem } from "./BlocoPorItem";
import { BlocoProximos } from "./BlocoProximos";
import { BlocoResumo } from "./BlocoResumo";
import { BlocoDiaADia, BlocoMes, BlocoPonte } from "./BlocosDoTempo";
import { EsqueletoDeRelacoes } from "./EsqueletoDeRelacoes";
import { PeriodoEIrPara, type DestinoDoIrPara } from "./PeriodoEIrPara";
import { useResumoDoDono } from "./useResumoDoDono";

const SEM_MOVIMENTOS: MovimentoCaixa[] = [];
const SEM_ORDENS: OrdemServico[] = [];
const SEM_PECAS: Peca[] = [];
const SEM_SERVICOS: Servico[] = [];

const DESTINOS: DestinoDoIrPara[] = [
  { id: "resumo", nome: "Resumo" },
  { id: "por-item", nome: "Por item" },
  { id: "curva-abc", nome: "Curva ABC" },
  { id: "proximos-30-dias", nome: "Próximos 30 dias" },
];

/** Os dois campos De e Até só valem como período quando são um dia de verdade (o campo manda "" no meio da digitação). */
function diaValido(dia: string): boolean {
  const [ano, mes, d] = dia.split("-").map(Number);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || ano < 2000 || ano > 2100) return false;
  const data = new Date(ano, mes - 1, d);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === d;
}

export function RelatoriosPage() {
  const { lojaAtual, operador } = useAuth();
  const podeVerPagar = temPermissao(operador, "contas_pagar");
  const podeVerReceber = temPermissao(operador, "contas_receber");
  const escolhasDoResumo = useResumoDoDono();
  const hoje = hojeLocal();

  // O período único (#1086): vale pra todos os blocos. Os campos guardam o
  // que a pessoa digita; o período só muda quando os dois são um dia de verdade.
  const [periodo, setPeriodo] = useState<PeriodoRelacoes>(() => periodoDoAtalho("mes", hojeLocal()));
  const [campos, setCampos] = useState<PeriodoRelacoes>(periodo);

  // #927: só a carga mais nova mexe na tela; e se a da loja nova der erro, os
  // dados guardados (da loja anterior) não aparecem.
  const { comecar, dadosSaoDaLoja } = useCargaMaisNova(lojaAtual?.id);
  const [movimentosGuardados, setMovimentos] = useState<MovimentoCaixa[]>([]);
  const [ordensGuardadas, setOrdens] = useState<OrdemServico[]>([]);
  const [pecasGuardadas, setPecas] = useState<Peca[]>([]);
  const [servicosGuardados, setServicos] = useState<Servico[]>([]);
  const movimentos = dadosSaoDaLoja ? movimentosGuardados : SEM_MOVIMENTOS;
  const ordens = dadosSaoDaLoja ? ordensGuardadas : SEM_ORDENS;
  const pecas = dadosSaoDaLoja ? pecasGuardadas : SEM_PECAS;
  const servicos = dadosSaoDaLoja ? servicosGuardados : SEM_SERVICOS;
  const [contasPagar, setContasPagar] = useState<ContaPagar[] | null>(null);
  const [contasReceber, setContasReceber] = useState<ContaReceber[] | null>(null);
  const [erroContas, setErroContas] = useState<string | null>(null);
  const [carregandoContas, setCarregandoContas] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    async function carregar() {
      const carga = comecar(lojaAtual?.id);
      if (!carga) {
        if (!lojaAtual) setCarregando(false);
        return;
      }
      setErro(null);
      try {
        const [movimentosCarregados, ordensCarregadas, pecasCarregadas, servicosCarregados] =
          await Promise.all([
            listarMovimentosCaixa(carga.lojaId),
            listarOrdens(carga.lojaId),
            listarPecas(),
            listarServicos(),
          ]);
        if (!carga.aindaEhAtual()) return;
        setMovimentos(movimentosCarregados);
        setOrdens(ordensCarregadas);
        setPecas(pecasCarregadas);
        setServicos(servicosCarregados);
        carga.gravou();
      } catch (err) {
        if (!carga.aindaEhAtual()) return;
        console.error("Erro ao carregar relações:", err);
        setErro(mensagemDeErro(err));
      } finally {
        if (carga.aindaEhAtual()) setCarregando(false);
      }
    }
    carregar();
  }, [lojaAtual, comecar, tentativa]);

  // As contas dos Próximos dias vêm à parte (#389): um erro nelas não pode
  // apagar o resto da página, nem virar "Sem acesso" pra quem tem o acesso; e
  // o resto não espera por elas. `ativo` descarta a resposta que chega depois
  // de trocar de loja (senão a da loja antiga podia ganhar).
  useEffect(() => {
    if (!lojaAtual) {
      setCarregandoContas(false);
      return;
    }
    let ativo = true;
    setCarregandoContas(true);
    setErroContas(null);
    Promise.all([
      podeVerPagar ? listarContasPagar(lojaAtual.id) : Promise.resolve(null),
      podeVerReceber ? listarContasReceber(lojaAtual.id) : Promise.resolve(null),
    ])
      .then(([pagarCarregadas, receberCarregadas]) => {
        if (!ativo) return;
        setContasPagar(pagarCarregadas);
        setContasReceber(receberCarregadas);
      })
      .catch((err) => {
        if (!ativo) return;
        console.error("Erro ao carregar as contas do fluxo de caixa:", err);
        setErroContas(mensagemDeErro(err));
      })
      .finally(() => {
        if (ativo) setCarregandoContas(false);
      });
    return () => {
      ativo = false;
    };
  }, [lojaAtual, podeVerPagar, podeVerReceber]);

  function escolherPeriodo(novo: PeriodoRelacoes) {
    setPeriodo(novo);
    setCampos(novo);
  }

  function mudarDe(valor: string) {
    setCampos((atual) => ({ ...atual, de: valor }));
    if (diaValido(valor) && diaValido(campos.ate) && valor <= campos.ate) setPeriodo({ de: valor, ate: campos.ate });
  }

  function mudarAte(valor: string) {
    setCampos((atual) => ({ ...atual, ate: valor }));
    if (diaValido(valor) && diaValido(campos.de) && campos.de <= valor) setPeriodo({ de: campos.de, ate: valor });
  }

  // As contas de cada bloco, todas em `src/schemas/`. O resumo precisa de TODOS
  // os movimentos do caixa (o Falta receber olha o que entrou de cada OS).
  const custoPeca = useMemo(() => mapaCustoPecas(pecas), [pecas]);
  const custoServico = useMemo(() => mapaCustoServicos(servicos), [servicos]);
  const nomePeca = useMemo(() => new Map(pecas.map((p) => [p.id, p.descricao])), [pecas]);
  const nomeServico = useMemo(() => new Map(servicos.map((s) => [s.id, s.descricao])), [servicos]);

  const lucro = useMemo(
    () =>
      lucratividadePorItem({
        ordens,
        custoPeca,
        custoServico,
        nomePeca,
        nomeServico,
        de: periodo.de,
        ate: periodo.ate,
      }),
    [ordens, custoPeca, custoServico, nomePeca, nomeServico, periodo],
  );
  const resumo = useMemo(
    () => resumoDoPeriodo({ ordens, movimentos, custoPeca, custoServico, nomePeca, nomeServico, periodo }),
    [ordens, movimentos, custoPeca, custoServico, nomePeca, nomeServico, periodo],
  );
  // Só um período que é um mês compara com o mês anterior.
  const mesAnterior = useMemo(() => periodoComparavelNoMesAnterior(periodo, hoje), [periodo, hoje]);
  const resumoAnterior = useMemo(
    () =>
      mesAnterior
        ? resumoDoPeriodo({ ordens, movimentos, custoPeca, custoServico, nomePeca, nomeServico, periodo: mesAnterior })
        : null,
    [ordens, movimentos, custoPeca, custoServico, nomePeca, nomeServico, mesAnterior],
  );
  const mesDoResumo = mesDoPeriodo(periodo, hoje);
  const nomeDoMesAnterior = mesDoResumo ? nomeDoMes(mesDoResumo.mes - 1) : null;

  const semNada =
    lucro.linhas.length === 0 &&
    resumo.vendido === 0 &&
    resumo.recebido === 0 &&
    resumo.despesas === 0;
  // Pra onde o botão do período vazio leva: o mês, ou o mês passado se já está nele.
  const voltarPara: AtalhoDoPeriodo =
    periodo.de === periodoDoAtalho("mes", hoje).de && periodo.ate === periodoDoAtalho("mes", hoje).ate
      ? "mes_passado"
      : "mes";

  const pronto = !carregando && !erro;
  const destinos = semNada || !pronto ? DESTINOS.filter((d) => d.id === "resumo" || d.id === "proximos-30-dias") : DESTINOS;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <BotaoVoltar />
          <div className="min-w-0">
            <h1 className="font-titulo text-titulo font-bold text-texto">Relações</h1>
            <p className="text-corpo text-texto-2">
              Vendido, recebido, o que sobra das OS e o que vem pela frente
            </p>
          </div>
        </div>
        {/* Só com os dados bons: o resumo mandado ao dono não pode sair com número errado. */}
        {pronto && <BotaoResumoDono escolhas={escolhasDoResumo} />}
      </header>

      <PeriodoEIrPara
        periodo={periodo}
        hoje={hoje}
        de={campos.de}
        ate={campos.ate}
        aoEscolherAtalho={(atalho) => escolherPeriodo(periodoDoAtalho(atalho, hoje))}
        aoMudarDe={mudarDe}
        aoMudarAte={mudarAte}
        destinos={destinos}
      />

      {erro ? (
        <div className="space-y-4">
          <AvisoDeErro>
            Não deu pra carregar as relações: {erro}. Confira a internet e tente de novo.
          </AvisoDeErro>
          <Botao
            variante="secundario"
            onClick={() => {
              setCarregando(true);
              setTentativa((n) => n + 1);
            }}
          >
            Tentar de novo
          </Botao>
        </div>
      ) : carregando ? (
        <EsqueletoDeRelacoes />
      ) : (
        <>
          <BlocoResumo resumo={resumo} anterior={resumoAnterior} contra={nomeDoMesAnterior} />

          {semNada ? (
            <section className="sakura-card flex flex-col items-start gap-4 p-6">
              <h2 className="font-titulo text-subtitulo font-semibold text-texto">Nenhuma venda neste período</h2>
              <p className="text-corpo text-texto-2">
                Não houve OS aberta nem dinheiro no caixa entre estas datas. Escolha outro período pra ver os
                gráficos.
              </p>
              <Botao variante="secundario" onClick={() => escolherPeriodo(periodoDoAtalho(voltarPara, hoje))}>
                {voltarPara === "mes" ? "Ver este mês" : "Ver o mês passado"}
              </Botao>
            </section>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-6">
                <BlocoMes ordens={ordens} periodo={periodo} hoje={hoje} className="col-span-12 xl:col-span-6" />
                <BlocoPonte
                  resumo={resumo}
                  movimentos={movimentos}
                  periodo={periodo}
                  className="col-span-12 xl:col-span-6"
                />
              </div>
              <BlocoDiaADia ordens={ordens} periodo={periodo} hoje={hoje} />
              <BlocoPorItem linhas={lucro.linhas} />
              <BlocoCurvaABC
                ordens={ordens}
                pecas={pecas}
                servicos={servicos}
                linhasPorItem={lucro.linhas}
                periodo={periodo}
              />
            </>
          )}

          <BlocoProximos
            contasPagar={contasPagar}
            contasReceber={contasReceber}
            carregando={carregandoContas}
            erro={erroContas}
          />
        </>
      )}
    </div>
  );
}

import { useMemo } from "react";
import {
  CartaoDeGrafico,
  GraficoColunasPorDia,
  GraficoMesAcumulado,
  GraficoPonte,
  TabelaDoGrafico,
} from "@/components/graficos";
import { Valor } from "@/components/Valor";
import { diaBrasileiro, diasEntre } from "@/lib/datas";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  LIMITE_DE_DIAS_NO_DIA_A_DIA,
  colunasPorDia,
  colunasPorMes,
  despesasPorTipo,
  diferencaEscrita,
  formatarMoedaCurta,
  fraseDaPonte,
  fraseDoDiaADia,
  fraseDoMes,
  mediaDoDiaAberto,
  nomeDoMes,
  oMesAteHoje,
  ponteDoVendido,
  vendidoPorDia,
  vendidoPorMes,
  type MovimentoDasRelacoes,
  type OrdemDasRelacoes,
  type PeriodoRelacoes,
  type ResumoDoPeriodo,
} from "@/schemas/relacoes";

function comMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "O mês até hoje": o vendido somando dia a dia, contra o mês anterior inteiro. */
export function BlocoMes({
  ordens,
  periodo,
  hoje,
  className,
}: {
  ordens: readonly OrdemDasRelacoes[];
  periodo: PeriodoRelacoes;
  hoje: string;
  className?: string;
}) {
  const mes = useMemo(() => oMesAteHoje({ ordens, periodo, hoje }), [ordens, periodo, hoje]);
  const nomeAtual = comMaiuscula(nomeDoMes(mes.mes));
  const nomeAnterior = comMaiuscula(nomeDoMes(mes.mes - 1));
  const dias = Math.max(mes.atual.length, mes.anterior?.length ?? 0);

  return (
    <CartaoDeGrafico
      id="o-mes-ate-hoje"
      nome="O mês até hoje"
      titulo={fraseDoMes(mes)}
      className={className}
      tabela={
        <TabelaDoGrafico
          legenda="O vendido do mês somando dia a dia"
          colunas={[
            { chave: "dia", titulo: "Dia" },
            { chave: "atual", titulo: `${nomeAtual} (somado)`, numero: true },
            ...(mes.anterior ? [{ chave: "anterior", titulo: `${nomeAnterior} (somado)`, numero: true }] : []),
          ]}
          linhas={Array.from({ length: dias }, (_, i) => ({
            chave: String(i + 1),
            celulas: {
              dia: String(i + 1),
              atual: i < mes.atual.length ? formatarMoeda(mes.atual[i]) : "—",
              anterior: mes.anterior && i < mes.anterior.length ? formatarMoeda(mes.anterior[i]) : "—",
            },
          }))}
        />
      }
    >
      <GraficoMesAcumulado
        atual={mes.atual}
        anterior={mes.anterior}
        diasNoMes={mes.diasNoMes}
        nomeAtual={nomeAtual}
        nomeAnterior={nomeAnterior}
        diferenca={diferencaEscrita(mes.diferencaNoMesmoDia)}
        formatarCurto={formatarMoedaCurta}
      />
    </CartaoDeGrafico>
  );
}

/** "Do vendido ao que sobrou": a ponte Vendido, custo, Sobra das OS, despesas, Sobrou. */
export function BlocoPonte({
  resumo,
  movimentos,
  periodo,
  className,
}: {
  resumo: ResumoDoPeriodo;
  movimentos: readonly MovimentoDasRelacoes[];
  periodo: PeriodoRelacoes;
  className?: string;
}) {
  const despesas = useMemo(() => despesasPorTipo(movimentos, periodo), [movimentos, periodo]);
  const todasAsDespesas = useMemo(() => despesasPorTipo(movimentos, periodo, Infinity), [movimentos, periodo]);
  const ponte = useMemo(
    () => ponteDoVendido({ vendido: resumo.vendido, custo: resumo.custo, despesasPorTipo: despesas }),
    [resumo.vendido, resumo.custo, despesas],
  );

  const tabelaDaPonte = (
    <TabelaDoGrafico
      legenda="Do vendido ao que sobrou"
      colunas={[
        { chave: "etapa", titulo: "Etapa" },
        { chave: "valor", titulo: "Valor", numero: true },
      ]}
      linhas={ponte.degraus.map((d) => ({
        chave: d.chave,
        celulas: {
          etapa: d.rotulo,
          valor: d.tipo === "menos" ? `− ${formatarMoeda(d.valor)}` : <Valor valor={d.ate} />,
        },
      }))}
    />
  );

  return (
    <CartaoDeGrafico
      id="do-vendido-ao-que-sobrou"
      nome="Do vendido ao que sobrou"
      titulo={fraseDaPonte(resumo.vendido, ponte.sobrou)}
      className={className}
      tabela={tabelaDaPonte}
      verTodos={
        todasAsDespesas.length > despesas.length
          ? {
              rotulo: `Ver as ${todasAsDespesas.length} despesas`,
              conteudo: (
                <TabelaDoGrafico
                  legenda="Despesas do período, por tipo"
                  colunas={[
                    { chave: "tipo", titulo: "Tipo da despesa" },
                    { chave: "valor", titulo: "Despesas", numero: true },
                  ]}
                  linhas={todasAsDespesas.map((d) => ({
                    chave: d.tipo,
                    celulas: { tipo: d.tipo, valor: formatarMoeda(d.valor) },
                  }))}
                />
              ),
            }
          : undefined
      }
    >
      <GraficoPonte degraus={ponte.degraus} formatarCurto={formatarMoedaCurta} />
    </CartaoDeGrafico>
  );
}

/** "Dia a dia": colunas por dia (mês a mês, no período longo), com a média do dia aberto tracejada. */
export function BlocoDiaADia({
  ordens,
  periodo,
  hoje,
  className,
}: {
  ordens: readonly OrdemDasRelacoes[];
  periodo: PeriodoRelacoes;
  hoje: string;
  className?: string;
}) {
  const porDia = useMemo(() => vendidoPorDia(ordens, periodo), [ordens, periodo]);
  const porMes = diasEntre(periodo.de, periodo.ate) + 1 > LIMITE_DE_DIAS_NO_DIA_A_DIA;
  const colunas = useMemo(
    () => (porMes ? colunasPorMes(vendidoPorMes(ordens, periodo)) : colunasPorDia(porDia, hoje)),
    [porMes, ordens, periodo, porDia, hoje],
  );
  const media = useMemo(() => mediaDoDiaAberto(porDia), [porDia]);
  // Hoje (ou o mês de hoje) em laranja; fora do período, nenhuma coluna.
  const indiceDeHoje = colunas.findIndex((c) => (porMes ? c.chave === hoje.slice(0, 7) : c.chave === hoje));

  return (
    <CartaoDeGrafico
      id="dia-a-dia"
      nome="Dia a dia"
      titulo={fraseDoDiaADia({ porDia, hoje })}
      className={className}
      tabela={
        <TabelaDoGrafico
          legenda={porMes ? "Vendido mês a mês" : "Vendas por dia"}
          colunas={[
            { chave: "quando", titulo: porMes ? "Mês" : "Dia" },
            { chave: "valor", titulo: "Vendido", numero: true },
          ]}
          linhas={colunas.map((c, i) => ({
            chave: c.chave,
            celulas: {
              quando: (
                <span className={i === indiceDeHoje ? "font-semibold" : undefined}>
                  {i === indiceDeHoje && "Hoje, "}
                  {porMes ? c.nomeCompleto : `${c.rotulo}, ${diaBrasileiro(c.chave)}`}
                </span>
              ),
              valor: c.valor > 0 ? formatarMoeda(c.valor) : "—",
            },
          }))}
        />
      }
    >
      <GraficoColunasPorDia
        colunas={colunas}
        destacar={indiceDeHoje >= 0 ? indiceDeHoje : undefined}
        media={media !== null && !porMes ? { valor: media, rotulo: "média" } : null}
        formatarCurto={formatarMoedaCurta}
      />
    </CartaoDeGrafico>
  );
}

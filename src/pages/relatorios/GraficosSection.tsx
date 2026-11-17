import { useMemo, useState } from "react";
import { hojeLocal } from "@/lib/datas";
import { AreaRolavel } from "@/components/AreaRolavel";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Explicacao } from "@/components/Explicacao";
import { Valor, Variacao } from "@/components/Valor";
import {
  custoDosItens,
  mapaCustoPecas,
  mapaCustoServicos,
} from "@/schemas/metricasCaixa";
import {
  seriesVendasCustosLucro,
  totaisDoGrafico,
  totaisRecebidos,
  totaisRecebidosPorDia,
  type Periodo,
} from "@/schemas/graficosVendas";
import { variacaoPercentual } from "@/schemas/painelInicio";
import type { MovimentoCaixa } from "@/types/caixa";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { GraficoEmLinhas } from "./GraficoEmLinhas";
import { Segmentos } from "./Segmentos";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PERIODOS: { chave: Periodo; texto: string }[] = [
  { chave: "diario", texto: "Diário" },
  { chave: "semanal", texto: "Semanal" },
  { chave: "mensal", texto: "Mensal" },
  { chave: "anual", texto: "Anual" },
];

/** Com o que o período atual é comparado, pro "+16% contra o dia anterior". */
const CONTRA: Record<Periodo, string> = {
  diario: "dia anterior",
  semanal: "semana anterior",
  mensal: "mês anterior",
  anual: "ano anterior",
};

/** O que está à vista no gráfico, pro "Vendas · 14 dias". */
const A_VISTA: Record<Periodo, string> = {
  diario: "14 dias",
  semanal: "8 semanas",
  mensal: "6 meses",
  anual: "5 anos",
};

/** Como o gráfico chama o ponto de agora, no eixo. */
const AGORA: Record<Periodo, string> = {
  diario: "Hoje",
  semanal: "Esta semana",
  mensal: "Este mês",
  anual: "Este ano",
};

function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Quantos dias de "Vendas por dia" cabem à vista; com mais, a lista rola por dentro. */
const DIAS_A_VISTA = 7;
const ALTURA_DA_LINHA_PX = 52;

interface GraficosSectionProps {
  movimentos: MovimentoCaixa[];
  ordens: OrdemServico[];
  pecas: Peca[];
  servicos: Servico[];
}

export function GraficosSection({ movimentos, ordens, pecas, servicos }: GraficosSectionProps) {
  const [periodo, setPeriodo] = useState<Periodo>("diario");

  // Custo de aquisição de cada OS (peça/serviço) — o que "Custos" precisa somar além das
  // saídas manuais do Caixa, senão o gráfico mostra Lucro igual a Vendas sempre que não há
  // despesa manual lançada no período (ver PROJETO_STATUS.md).
  const custoPorOrdem = useMemo(() => {
    const custoPeca = mapaCustoPecas(pecas);
    const custoServico = mapaCustoServicos(servicos);
    return new Map(
      ordens.map((ordem) => [ordem.id, custoDosItens(ordem.itens ?? [], custoPeca, custoServico)]),
    );
  }, [ordens, pecas, servicos]);

  const entradas = useMemo(() => movimentos.filter((m) => m.tipo === "entrada"), [movimentos]);

  const totaisPorDia = useMemo(() => totaisRecebidosPorDia(entradas), [entradas]);

  const hoje = new Date();
  const {
    hoje: totalHoje,
    semana: totalSemana,
    mes: totalMes,
    ano: totalAno,
  } = totaisRecebidos(entradas, hoje);

  const { categorias, vendas, custos, lucro } = useMemo(
    () => seriesVendasCustosLucro(movimentos, periodo, hoje, custoPorOrdem),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movimentos, periodo, custoPorOrdem],
  );

  const ultimoIndice = vendas.length - 1;
  const penultimoIndice = vendas.length - 2;
  const totais = totaisDoGrafico({ vendas, custos, lucro });
  const diaDeHoje = hojeLocal();

  const tabelaDosDias = (
    <table className="sakura-tabela">
      <thead>
        <tr>
          <th className="sticky top-0 z-[1] bg-cartao">Dia</th>
          <th className="sticky top-0 z-[1] bg-cartao text-right">Total vendido</th>
        </tr>
      </thead>
      <tbody>
        {totaisPorDia.map(([dia, total]) => {
          const ehHoje = dia === diaDeHoje;
          return (
            <tr key={dia} className={ehHoje ? "font-semibold" : undefined}>
              {/* Hoje marcado com o traço laranja E a palavra (a cor sozinha não avisa). */}
              <td className={ehHoje ? "shadow-[inset_2px_0_0_var(--color-acao)]" : undefined}>
                {ehHoje && "Hoje, "}
                {new Date(dia).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </td>
              <td className="text-right">{formatarMoeda(total)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  /** O que fica à esquerda de cada linha do gráfico: o nome, o período e o total. */
  const resumo = (nome: string, total: number, extra?: string) => (
    <>
      <p className="text-rotulo text-texto-2">
        {nome} · {A_VISTA[periodo]}
      </p>
      <p className="mt-1 whitespace-nowrap font-titulo text-destaque font-bold tabular-nums">
        <Valor valor={total} />
      </p>
      {extra && <p className="mt-0.5 text-meta text-texto-2">{extra}</p>}
    </>
  );

  const comparativo = [
    {
      nome: "Vendas",
      explicacao: "O que entrou no caixa no período, comparado com o período de antes.",
      serie: vendas,
      subirEBom: true,
    },
    {
      nome: "Custos",
      explicacao:
        "O que as peças e os serviços das ordens recebidas no período custaram, mais as saídas lançadas no caixa, comparado com o período de antes. Aqui subir não é bom.",
      serie: custos,
      subirEBom: false,
    },
    {
      nome: "Lucro",
      explicacao: "Vendas menos custos no período, comparado com o período de antes.",
      serie: lucro,
      subirEBom: true,
    },
  ];

  return (
    <>
      {/* 1 número grande + 3 de apoio: o mês é o que mais importa (#990, 17/11). */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="col-span-2 xl:col-span-1 [&_[data-cartao-numero]]:h-full [&_[data-cartao-numero]_p.font-titulo]:text-[2.5rem]">
          <CartaoNumero
            titulo="Recebido no mês"
            explicacao="O que entrou no caixa do dia 1º até hoje. OS aberta e ainda não recebida não entra."
          >
            <Valor valor={totalMes} />
          </CartaoNumero>
        </div>
        <CartaoNumero
          titulo="Recebido hoje"
          explicacao="Tudo que entrou no caixa hoje: ordens de serviço, contas recebidas e entradas lançadas à mão."
        >
          <Valor valor={totalHoje} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Recebido esta semana"
          explicacao="O que entrou no caixa desde a segunda-feira, contando hoje."
        >
          <Valor valor={totalSemana} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Recebido este ano"
          explicacao="O que entrou no caixa de 1º de janeiro até hoje."
        >
          <Valor valor={totalAno} />
        </CartaoNumero>
      </div>

      <section className="sakura-card p-6" aria-labelledby="grafico-vcl-titulo">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 id="grafico-vcl-titulo" className="font-titulo text-subtitulo font-semibold text-texto">
              Vendas x Custos x Lucro
            </h2>
            <Explicacao
              titulo="Vendas x Custos x Lucro"
              texto="Vendas é o que entrou no caixa. Custos é o que as peças e os serviços das ordens recebidas no período custaram, mais as saídas lançadas no caixa. Lucro é vendas menos custos. As três linhas usam a mesma escala; o ponto laranja é o período de agora."
            />
          </div>
          <Segmentos
            rotulo="Período do gráfico"
            opcoes={PERIODOS}
            valor={periodo}
            aoEscolher={setPeriodo}
          />
        </div>
        <GraficoEmLinhas
          descricao={`Vendas, custos e lucro, ${PERIODOS.find((p) => p.chave === periodo)?.texto.toLowerCase()}`}
          categorias={categorias}
          rotuloDoAtual={AGORA[periodo]}
          formatarValor={formatarMoeda}
          linhas={[
            { chave: "vendas", nome: "Vendas", valores: vendas, resumo: resumo("Vendas", totais.vendas) },
            { chave: "custos", nome: "Custos", valores: custos, resumo: resumo("Custos", totais.custos) },
            {
              chave: "lucro",
              nome: "Lucro",
              valores: lucro,
              resumo: resumo(
                "Lucro",
                totais.lucro,
                totais.margem === null ? undefined : `margem de ${formatarPercentual(totais.margem)}`,
              ),
            },
          ]}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {penultimoIndice >= 0 && (
          <section className="sakura-card p-6" aria-labelledby="grafico-comparativo-titulo">
            <h2
              id="grafico-comparativo-titulo"
              className="font-titulo text-subtitulo font-semibold text-texto"
            >
              Comparativo do período
            </h2>
            <p className="mb-4 text-rotulo text-texto-2">
              {AGORA[periodo]} contra {periodo === "semanal" ? "a" : "o"} {CONTRA[periodo]}
            </p>
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th></th>
                  <th className="text-right">Agora</th>
                  <th className="text-right">Anterior</th>
                  <th className="text-right">Mudou</th>
                </tr>
              </thead>
              <tbody>
                {comparativo.map((c) => {
                  const atual = c.serie[ultimoIndice];
                  const anterior = c.serie[penultimoIndice];
                  return (
                    <tr key={c.nome} data-comparativo={c.nome}>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          {c.nome}
                          <Explicacao titulo={c.nome} texto={c.explicacao} />
                        </span>
                      </td>
                      <td className="text-right font-semibold">
                        <Valor valor={atual} />
                      </td>
                      <td className="text-right text-texto-2">
                        {anterior === 0 ? "sem movimento" : <Valor valor={anterior} classeDeCor="text-texto-2" />}
                      </td>
                      <td className="text-right">
                        {anterior === 0 ? (
                          <span className="text-rotulo text-texto-2">—</span>
                        ) : (
                          <Variacao
                            percentual={variacaoPercentual(atual, anterior)}
                            subirEBom={c.subirEBom}
                            comparadoCom={CONTRA[periodo]}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {totaisPorDia.length === 0 ? (
          <p className="text-corpo text-texto-2">
            Nenhuma venda registrada ainda (faturamentos de OS aparecem aqui automaticamente).
          </p>
        ) : (
          <section className="sakura-card overflow-hidden" aria-labelledby="vendas-por-dia-titulo">
            <h2
              id="vendas-por-dia-titulo"
              className="px-6 pb-1 pt-6 font-titulo text-subtitulo font-semibold text-texto"
            >
              Vendas por dia
            </h2>
            {totaisPorDia.length > DIAS_A_VISTA ? (
              // Passando de uma semana, a lista tem tamanho fixo e rola por
              // dentro (regra "o que pode crescer"): ela só cresce, um dia por
              // vez, e empurrava o resto da tela pra baixo. A última linha
              // à vista aparece cortada, pra mostrar que tem mais.
              <div style={{ height: ALTURA_DA_LINHA_PX * (DIAS_A_VISTA + 0.5) + 40 }}>
                <AreaRolavel>{tabelaDosDias}</AreaRolavel>
              </div>
            ) : (
              tabelaDosDias
            )}
          </section>
        )}
      </div>
    </>
  );
}

import { useMemo, useState } from "react";
import { AreaRolavel } from "@/components/AreaRolavel";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Explicacao } from "@/components/Explicacao";
import { Valor } from "@/components/Valor";
import {
  custoDosItens,
  mapaCustoPecas,
  mapaCustoServicos,
} from "@/schemas/metricasCaixa";
import {
  seriesVendasCustosLucro,
  totaisRecebidos,
  totaisRecebidosPorDia,
  type Periodo,
} from "@/schemas/graficosVendas";
import type { MovimentoCaixa } from "@/types/caixa";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { GraficoDeBarras } from "./GraficoDeBarras";
import { GraficoDeRadar } from "./GraficoDeRadar";
import { Segmentos } from "./Segmentos";

// As cores do gráfico (#990, tarefa 13): as de aviso do tema e o laranja da
// marca, em vez do verde, laranja e roxo de antes. Azul, amarelo e laranja
// se separam bem até pra quem confunde verde com vermelho, e o verde fica de
// fora de propósito. No claro o amarelo vira o âmbar escuro e o azul o azul
// forte (tabela de cores, seção 13), então nenhuma troca à mão.
const CORES = {
  vendas: "var(--color-info)",
  custos: "var(--color-atencao)",
  lucro: "var(--color-acao)",
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PERIODOS: { chave: Periodo; texto: string }[] = [
  { chave: "diario", texto: "Diário" },
  { chave: "semanal", texto: "Semanal" },
  { chave: "mensal", texto: "Mensal" },
  { chave: "anual", texto: "Anual" },
];

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

  const nomeDoPeriodo = PERIODOS.find((p) => p.chave === periodo)?.texto;
  // O radar não desenha lucro abaixo de zero (ele fica no centro); o valor
  // certo está na tabela ao lado, e o aviso diz isso.
  const lucroNegativo = lucro[ultimoIndice] < 0 || lucro[penultimoIndice] < 0;

  const tabelaDosDias = (
    <table className="sakura-tabela">
      <thead>
        <tr>
          <th className="sticky top-0 z-[1] bg-cartao">Dia</th>
          <th className="sticky top-0 z-[1] bg-cartao text-right">Total vendido</th>
        </tr>
      </thead>
      <tbody>
        {totaisPorDia.map(([dia, total]) => (
          <tr key={dia}>
            <td>{new Date(dia).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
            <td className="text-right">{formatarMoeda(total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <CartaoNumero
          titulo="Recebido hoje"
          explicacao="Tudo que entrou no caixa hoje: ordens de serviço faturadas mais as entradas lançadas à mão."
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
          titulo="Recebido no mês"
          explicacao="O que entrou no caixa do dia 1º até hoje. OS aberta e ainda não recebida não entra."
        >
          <Valor valor={totalMes} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Recebido este ano"
          explicacao="O que entrou no caixa de 1º de janeiro até hoje."
        >
          <Valor valor={totalAno} />
        </CartaoNumero>
      </div>

      <section className="sakura-card p-5" aria-labelledby="grafico-vcl-titulo">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 id="grafico-vcl-titulo" className="font-titulo text-subtitulo font-semibold text-texto">
              Vendas x Custos x Lucro
            </h2>
            <Explicacao
              titulo="Vendas x Custos x Lucro"
              texto="Vendas é o que entrou no caixa. Custos é o que as peças e os serviços vendidos custaram, mais as saídas lançadas no caixa. Lucro é vendas menos custos."
            />
          </div>
          <Segmentos
            rotulo="Período do gráfico"
            opcoes={PERIODOS}
            valor={periodo}
            aoEscolher={setPeriodo}
          />
        </div>
        <GraficoDeBarras
          descricao={`Gráfico de barras com vendas, custos e lucro, ${nomeDoPeriodo?.toLowerCase()}`}
          series={[
            { chave: "vendas", nome: "Vendas", cor: CORES.vendas },
            { chave: "custos", nome: "Custos", cor: CORES.custos },
            { chave: "lucro", nome: "Lucro", cor: CORES.lucro },
          ]}
          categorias={categorias}
          valores={{ vendas, custos, lucro }}
          formatarValor={formatarMoeda}
        />
      </section>

      {penultimoIndice >= 0 && (
        <section className="sakura-card p-5" aria-labelledby="grafico-comparativo-titulo">
          <h2
            id="grafico-comparativo-titulo"
            className="mb-1 font-titulo text-subtitulo font-semibold text-texto"
          >
            Comparativo do período
          </h2>
          <p className="mb-4 text-rotulo text-texto-2">
            {nomeDoPeriodo} atual comparado com o anterior.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            <GraficoDeRadar
              descricao={`Radar comparando vendas, custos e lucro: ${nomeDoPeriodo?.toLowerCase()} atual e o anterior`}
              eixos={[
                {
                  chave: "vendas",
                  nome: "Vendas",
                  atual: vendas[ultimoIndice],
                  anterior: vendas[penultimoIndice],
                },
                {
                  chave: "custos",
                  nome: "Custos",
                  atual: custos[ultimoIndice],
                  anterior: custos[penultimoIndice],
                },
                {
                  chave: "lucro",
                  nome: "Lucro",
                  atual: Math.max(lucro[ultimoIndice], 0),
                  anterior: Math.max(lucro[penultimoIndice], 0),
                },
              ]}
              formatarValor={formatarMoeda}
            />
            {/* Os mesmos números do radar, escritos: quem lê o gráfico de relance
                confere o valor sem passar o mouse em cada ponta. */}
            <div className="min-w-72 max-w-md flex-1">
              <table className="sakura-tabela" aria-label="Valores do comparativo">
                <thead>
                  <tr>
                    <th>&nbsp;</th>
                    <th className="text-right">Este período</th>
                    <th className="text-right">Anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { nome: "Vendas", atual: vendas[ultimoIndice], anterior: vendas[penultimoIndice] },
                    { nome: "Custos", atual: custos[ultimoIndice], anterior: custos[penultimoIndice] },
                    { nome: "Lucro", atual: lucro[ultimoIndice], anterior: lucro[penultimoIndice] },
                  ].map((linha) => (
                    <tr key={linha.nome}>
                      <td className="font-medium">{linha.nome}</td>
                      <td className="text-right">
                        <Valor valor={linha.atual} />
                      </td>
                      <td className="text-right">
                        <Valor valor={linha.anterior} classeDeCor="text-texto-2" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lucroNegativo && (
                <p className="mt-2 text-rotulo text-texto-2">
                  O radar não desenha lucro negativo: o ponto fica no centro. O valor certo está
                  na tabela.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {totaisPorDia.length === 0 ? (
        <p className="text-corpo text-texto-2">
          Nenhuma venda registrada ainda (faturamentos de OS aparecem aqui automaticamente).
        </p>
      ) : (
        <section aria-labelledby="vendas-por-dia-titulo">
          <h2
            id="vendas-por-dia-titulo"
            className="mb-3 font-titulo text-subtitulo font-semibold text-texto"
          >
            Vendas por dia
          </h2>
          <div className="sakura-card overflow-hidden">
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
          </div>
        </section>
      )}
    </>
  );
}

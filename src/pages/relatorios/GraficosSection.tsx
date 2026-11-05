import { useMemo, useState } from "react";
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
import { GraficoBarras } from "@/components/GraficoBarras";
import { GraficoRadar } from "@/components/GraficoRadar";
import type { MovimentoCaixa } from "@/types/caixa";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

const CORES = { vendas: "#1baf7a", custos: "#eb6834", lucro: "#4a3aa7" };

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PERIODOS: { chave: Periodo; label: string }[] = [
  { chave: "diario", label: "Diário" },
  { chave: "semanal", label: "Semanal" },
  { chave: "mensal", label: "Mensal" },
  { chave: "anual", label: "Anual" },
];

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

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Recebido hoje</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalHoje)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Recebido esta semana</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalSemana)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Recebido no mês</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalMes)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Recebido este ano</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalAno)}
          </p>
        </div>
      </div>

      <section className="sakura-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-corpo font-semibold text-sakura-purple-dark">
            Vendas x Custos x Lucro
          </h2>
          <div className="flex gap-1 rounded-full bg-white/10 p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.chave}
                onClick={() => setPeriodo(p.chave)}
                className={`rounded-full px-3 py-1 text-rotulo font-medium transition ${
                  periodo === p.chave
                    ? "bg-sakura-purple text-white"
                    : "text-sakura-purple-dark/85 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <GraficoBarras
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
        <section className="sakura-card p-5">
          <h2 className="mb-1 text-corpo font-semibold text-sakura-purple-dark">
            Comparativo do período
          </h2>
          <p className="mb-4 text-rotulo text-sakura-muted">
            {PERIODOS.find((p) => p.chave === periodo)?.label} atual comparado com o anterior.
          </p>
          <GraficoRadar
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
        </section>
      )}

      {totaisPorDia.length === 0 ? (
        <p className="text-corpo text-sakura-muted">
          Nenhuma venda registrada ainda (faturamentos de OS aparecem aqui automaticamente).
        </p>
      ) : (
        <section>
          <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Vendas por dia</h2>
          <div className="overflow-x-auto sakura-card">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-3 font-medium">Dia</th>
                  <th className="px-4 py-3 font-medium">Total vendido</th>
                </tr>
              </thead>
              <tbody>
                {totaisPorDia.map(([dia, total]) => (
                  <tr key={dia} className="border-t border-sakura-gray/20">
                    <td className="px-4 py-3">
                      {new Date(dia).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </td>
                    <td className="px-4 py-3">{formatarMoeda(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

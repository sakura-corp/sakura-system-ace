import { useMemo, useState } from "react";
import {
  custoDosItens,
  mapaCustoPecas,
  mapaCustoServicos,
} from "@/schemas/metricasCaixa";
import { GraficoBarras } from "@/components/GraficoBarras";
import { GraficoRadar } from "@/components/GraficoRadar";
import type { MovimentoCaixa } from "@/types/caixa";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

type Periodo = "diario" | "semanal" | "mensal" | "anual";

// Quantas colunas o gráfico mostra em cada modo. No anual são 5 anos: menos
// que isso não deixa comparar nada, e mais só vai mostrar coluna zerada de
// antes da loja usar o sistema.
const QTD_BUCKETS: Record<Periodo, number> = { diario: 14, semanal: 8, mensal: 6, anual: 5 };

const CORES = { vendas: "#1baf7a", custos: "#eb6834", lucro: "#4a3aa7" };

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paraDataLocal(dataIso: string): string {
  return new Date(dataIso).toLocaleDateString("sv-SE");
}

function inicioDaSemana(data: Date): Date {
  const dia = data.getDay();
  const diff = (dia + 6) % 7; // segunda-feira como início da semana
  const inicio = new Date(data);
  inicio.setDate(data.getDate() - diff);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function chaveDoMovimento(dataIso: string, periodo: Periodo): string {
  const d = new Date(dataIso);
  if (periodo === "anual") {
    return String(d.getFullYear());
  }
  if (periodo === "mensal") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (periodo === "semanal") {
    return paraDataLocal(inicioDaSemana(d).toISOString());
  }
  return paraDataLocal(dataIso);
}

function gerarChavesBuckets(periodo: Periodo, hoje: Date): string[] {
  const qtd = QTD_BUCKETS[periodo];
  const chaves: string[] = [];
  for (let i = qtd - 1; i >= 0; i--) {
    if (periodo === "anual") {
      chaves.push(String(hoje.getFullYear() - i));
    } else if (periodo === "diario") {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      chaves.push(paraDataLocal(d.toISOString()));
    } else if (periodo === "semanal") {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i * 7);
      chaves.push(paraDataLocal(inicioDaSemana(d).toISOString()));
    } else {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
  }
  return chaves;
}

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function rotuloBucket(chave: string, periodo: Periodo): string {
  if (periodo === "anual") {
    return chave;
  }
  if (periodo === "mensal") {
    const [ano, mes] = chave.split("-").map(Number);
    return `${MESES_ABREV[mes - 1]}/${String(ano).slice(2)}`;
  }
  return new Date(`${chave}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
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

  const totaisPorDia = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of entradas) {
      const dia = paraDataLocal(m.data);
      mapa.set(dia, (mapa.get(dia) ?? 0) + m.valor);
    }
    return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entradas]);

  const hoje = new Date();
  const hojeStr = paraDataLocal(hoje.toISOString());
  const inicioSemana = inicioDaSemana(hoje);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);

  const totalHoje = totaisPorDia.find(([dia]) => dia === hojeStr)?.[1] ?? 0;
  const totalSemana = entradas
    .filter((m) => new Date(m.data) >= inicioSemana)
    .reduce((total, m) => total + m.valor, 0);
  const totalMes = entradas
    .filter((m) => new Date(m.data) >= inicioMes)
    .reduce((total, m) => total + m.valor, 0);
  const totalAno = entradas
    .filter((m) => new Date(m.data) >= inicioAno)
    .reduce((total, m) => total + m.valor, 0);

  const { categorias, vendas, custos, lucro } = useMemo(() => {
    const chaves = gerarChavesBuckets(periodo, hoje);
    const vendasMap = new Map<string, number>();
    const custosMap = new Map<string, number>();
    // Uma OS faturada com pagamento dividido em mais de uma forma gera vários
    // caixa_movimentos — soma o custo dela uma vez só por período, não uma vez por lançamento.
    const ordensJaContadas = new Set<string>();
    for (const m of movimentos) {
      const chave = chaveDoMovimento(m.data, periodo);
      if (m.tipo === "entrada") {
        vendasMap.set(chave, (vendasMap.get(chave) ?? 0) + m.valor);
        if (m.ordem_servico_id) {
          const marcador = `${chave}|${m.ordem_servico_id}`;
          if (!ordensJaContadas.has(marcador)) {
            ordensJaContadas.add(marcador);
            const custoOrdem = custoPorOrdem.get(m.ordem_servico_id) ?? 0;
            custosMap.set(chave, (custosMap.get(chave) ?? 0) + custoOrdem);
          }
        }
      } else {
        custosMap.set(chave, (custosMap.get(chave) ?? 0) + m.valor);
      }
    }
    const vendasArr = chaves.map((c) => vendasMap.get(c) ?? 0);
    const custosArr = chaves.map((c) => custosMap.get(c) ?? 0);
    return {
      categorias: chaves.map((c) => rotuloBucket(c, periodo)),
      vendas: vendasArr,
      custos: custosArr,
      lucro: vendasArr.map((v, i) => v - custosArr[i]),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimentos, periodo, custoPorOrdem]);

  const ultimoIndice = vendas.length - 1;
  const penultimoIndice = vendas.length - 2;

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Vendas hoje</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalHoje)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Vendas esta semana</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalSemana)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Vendas este mês</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            {formatarMoeda(totalMes)}
          </p>
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Vendas este ano</p>
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

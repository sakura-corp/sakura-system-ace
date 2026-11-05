/**
 * As contas do Relações → Gráficos (#875): quanto entrou hoje, na semana, no
 * mês e no ano, e as colunas de Vendas × Custos × Lucro por período.
 *
 * Moravam dentro da `GraficosSection`. Saíram de lá sem mudar nada da conta
 * (é a regra de "conta de dinheiro mora em src/schemas/", PROJETO_STATUS.md,
 * seção 3): as somas continuam diretas, sem arredondar no meio, porque a tela
 * formata no centavo e mudar a ordem das contas mudaria a última casa.
 */
import { diaLocal } from "@/lib/datas";
import type { TipoCaixa } from "@/types/caixa";

export type Periodo = "diario" | "semanal" | "mensal" | "anual";

/** O pedaço do lançamento do caixa que estas contas usam. */
export interface MovimentoDoGrafico {
  data: string;
  tipo: TipoCaixa;
  valor: number;
  ordem_servico_id: string | null;
}

// Quantas colunas o gráfico mostra em cada modo. No anual são 5 anos: menos
// que isso não deixa comparar nada, e mais só vai mostrar coluna zerada de
// antes da loja usar o sistema.
const QTD_BUCKETS: Record<Periodo, number> = { diario: 14, semanal: 8, mensal: 6, anual: 5 };

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
    return diaLocal(inicioDaSemana(d));
  }
  return diaLocal(dataIso);
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
      chaves.push(diaLocal(d));
    } else if (periodo === "semanal") {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i * 7);
      chaves.push(diaLocal(inicioDaSemana(d)));
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

/** Total que entrou em cada dia (local), do dia mais novo pro mais velho. */
export function totaisRecebidosPorDia(
  entradas: readonly Pick<MovimentoDoGrafico, "data" | "valor">[],
): [string, number][] {
  const mapa = new Map<string, number>();
  for (const m of entradas) {
    const dia = diaLocal(m.data);
    mapa.set(dia, (mapa.get(dia) ?? 0) + m.valor);
  }
  return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

export interface TotaisRecebidos {
  hoje: number;
  semana: number;
  mes: number;
  ano: number;
}

/** Os quatro cartões do topo: recebido hoje, na semana (desde segunda), no mês e no ano. */
export function totaisRecebidos(
  entradas: readonly Pick<MovimentoDoGrafico, "data" | "valor">[],
  hoje: Date,
): TotaisRecebidos {
  const hojeStr = diaLocal(hoje);
  const inicioSemana = inicioDaSemana(hoje);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioAno = new Date(hoje.getFullYear(), 0, 1);

  // Mesma soma, na mesma ordem, que a linha de hoje em totaisRecebidosPorDia.
  const totalHoje = entradas
    .filter((m) => diaLocal(m.data) === hojeStr)
    .reduce((total, m) => total + m.valor, 0);
  const totalSemana = entradas
    .filter((m) => new Date(m.data) >= inicioSemana)
    .reduce((total, m) => total + m.valor, 0);
  const totalMes = entradas
    .filter((m) => new Date(m.data) >= inicioMes)
    .reduce((total, m) => total + m.valor, 0);
  const totalAno = entradas
    .filter((m) => new Date(m.data) >= inicioAno)
    .reduce((total, m) => total + m.valor, 0);

  return { hoje: totalHoje, semana: totalSemana, mes: totalMes, ano: totalAno };
}

export interface SeriesVendasCustosLucro {
  categorias: string[];
  vendas: number[];
  custos: number[];
  lucro: number[];
}

/**
 * As colunas do gráfico Vendas × Custos × Lucro.
 *
 * Custos = saídas do caixa + o custo de aquisição de cada OS faturada no
 * período (senão o gráfico mostra Lucro igual a Vendas sempre que não há
 * despesa manual lançada). Uma OS paga em mais de uma forma gera vários
 * lançamentos: o custo dela entra uma vez só por período.
 */
export function seriesVendasCustosLucro(
  movimentos: readonly MovimentoDoGrafico[],
  periodo: Periodo,
  hoje: Date,
  custoPorOrdem: ReadonlyMap<string, number>,
): SeriesVendasCustosLucro {
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
}

// As contas do "Meu progresso" (#734): horas por semana, sequência, conquistas, estimado × real e onde já trabalhou.
// Funções puras, sempre de UMA pessoa (a resposta do worker já vem só com ela). O dia e a semana são os de São Paulo,
// o fuso da Sakura, seja qual for o fuso do computador (nunca toISOString().slice, que é UTC).
import type { RespostaDoMeuProgresso, TarefaEntregue } from "../tipos";

export const FUSO = "America/Sao_Paulo";
/** O SSACE: no gráfico ele vem sempre primeiro, com o nome curto. */
export const SSACE = "sakura-system-ace";
/** Quantas semanas o gráfico mostra (a atual e as anteriores). */
export const SEMANAS_NO_GRAFICO = 12;
/** Quantas tarefas aparecem no estimado × real (as mais recentes). */
export const MAXIMO_DO_ESTIMADO_REAL = 10;

const HORA_MS = 3_600_000;
const DIA_MS = 24 * HORA_MS;

const formatoDoDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** O dia de calendário (AAAA-MM-DD) em São Paulo; null se a data não vale. */
export function diaLocal(instante: string | Date): string | null {
  const d = typeof instante === "string" ? new Date(instante) : instante;
  if (Number.isNaN(d.getTime())) return null;
  return formatoDoDia.format(d);
}

/** Hoje, em São Paulo. */
export function hojeLocal(agora: Date): string {
  return diaLocal(agora) ?? "1970-01-01";
}

/** AAAA-MM-DD → dias desde 1970 (conta de calendário, sem fuso). */
const numeroDoDia = (dia: string) => {
  const [a, m, d] = dia.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / DIA_MS;
};
const diaDoNumero = (n: number) => {
  const d = new Date(n * DIA_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

/** A segunda-feira da semana do dia (a semana vai de segunda a domingo). */
export function semanaDoDia(dia: string): string {
  const n = numeroDoDia(dia);
  // 01/01/1970 foi quinta: (n + 3) % 7 = 0 na segunda.
  return diaDoNumero(n - ((((n + 3) % 7) + 7) % 7));
}

const semanaDe = (instante: string) => {
  const dia = diaLocal(instante);
  return dia === null ? null : semanaDoDia(dia);
};

/** O nome curto do projeto: o SSACE pelo apelido; os outros, pelo nome do repositório. */
export function nomeDoProjeto(repositorio: string): string {
  return repositorio === SSACE ? "SSACE" : repositorio;
}

/** Um tempo corrido em texto: "menos de 1 h", "5 h", "2 dias". */
export function textoDoTempo(ms: number): string {
  if (ms < HORA_MS) return "menos de 1 h";
  if (ms < 48 * HORA_MS) return `${Math.round(ms / HORA_MS)} h`;
  return `${Math.round(ms / DIA_MS)} dias`;
}

const arredondar = (h: number) => Math.round(h * 10) / 10;

export type SemanaDoProgresso = {
  /** A segunda-feira (AAAA-MM-DD). */
  inicio: string;
  horas: number;
  horasPorProjeto: Record<string, number>;
  tarefas: number;
  prs: number;
};

export type Conquista = { id: string; titulo: string; dia: string };

export type EstimadoReal = { repositorio: string; numero: number; titulo: string; url: string; estimativaHoras?: number; realMs: number };

export type Proporcao = { nome: string; tarefas: number; proporcao: number };

export type Progresso = {
  totalHoras: number;
  totalTarefas: number;
  totalPrs: number;
  /** Tarefas feitas sem a linha Estimativa: não entram nas horas. */
  semEstimativa: number;
  horasDaSemana: number;
  /** Semanas seguidas com alguma entrega (a atual, ainda sem entrega, não quebra). */
  sequencia: number;
  /** Da mais velha pra atual, sem buraco. */
  semanas: SemanaDoProgresso[];
  /** Os projetos com alguma tarefa: o SSACE primeiro, os outros por nome. A cor segue esta ordem. */
  projetos: string[];
  /** Da mais velha pra mais nova. */
  conquistas: Conquista[];
  /** As mais recentes primeiro. */
  estimadoReal: EstimadoReal[];
  areas: Proporcao[];
  ondeTrabalhou: Proporcao[];
};

const ordemDosProjetos = (a: string, b: string) => (a === SSACE ? -1 : b === SSACE ? 1 : a.localeCompare(b));

function proporcoes(nomes: string[]): Proporcao[] {
  const contagem = new Map<string, number>();
  for (const n of nomes) contagem.set(n, (contagem.get(n) ?? 0) + 1);
  return [...contagem]
    .map(([nome, tarefas]) => ({ nome, tarefas, proporcao: nomes.length > 0 ? tarefas / nomes.length : 0 }))
    .sort((a, b) => b.tarefas - a.tarefas);
}

function conquistasDas(tarefas: TarefaEntregue[]): Conquista[] {
  const conquistas: Conquista[] = [];
  let horas = 0;
  const areas = new Set<string>();
  let secundario = false;
  tarefas.forEach((t, i) => {
    const dia = diaLocal(t.feitaEm);
    if (dia === null) return;
    if (i === 0) conquistas.push({ id: "primeira-tarefa", titulo: "Primeira tarefa feita", dia });
    if (i === 9) conquistas.push({ id: "10-tarefas", titulo: "10 tarefas feitas", dia });
    const antes = horas;
    horas += t.estimativaHoras ?? 0;
    if (antes < 50 && horas >= 50) conquistas.push({ id: "50-horas", titulo: "50 h entregues", dia });
    if (!secundario && t.repositorio !== SSACE) {
      secundario = true;
      conquistas.push({ id: "primeira-secundario", titulo: "Primeira tarefa num projeto secundário", dia });
    }
    if (t.chefe && !areas.has(t.chefe)) {
      areas.add(t.chefe);
      conquistas.push({ id: `area-${t.chefe}`, titulo: `Primeira tarefa de ${t.chefe}`, dia });
    }
  });
  return conquistas.map((c, i) => ({ c, i })).sort((a, b) => a.c.dia.localeCompare(b.c.dia) || a.i - b.i).map(({ c }) => c);
}

/** Todas as contas da página, a partir da resposta do worker e do "agora". */
export function montarProgresso(resposta: RespostaDoMeuProgresso, agora: Date, semanasNoGrafico = SEMANAS_NO_GRAFICO): Progresso {
  const tarefas = resposta.tarefas
    .filter((t) => diaLocal(t.feitaEm) !== null)
    .sort((a, b) => Date.parse(a.feitaEm) - Date.parse(b.feitaEm) || a.numero - b.numero);
  const prs = resposta.prs.filter((p) => diaLocal(p.mescladoEm) !== null);

  const semanaAtual = semanaDoDia(hojeLocal(agora));
  const n0 = numeroDoDia(semanaAtual);
  const semanas: SemanaDoProgresso[] = [];
  for (let i = semanasNoGrafico - 1; i >= 0; i--) semanas.push({ inicio: diaDoNumero(n0 - 7 * i), horas: 0, horasPorProjeto: {}, tarefas: 0, prs: 0 });
  const porInicio = new Map(semanas.map((s) => [s.inicio, s]));

  const comEntrega = new Set<string>();
  for (const t of tarefas) {
    const s = semanaDe(t.feitaEm)!;
    comEntrega.add(s);
    const semana = porInicio.get(s);
    if (!semana) continue;
    semana.tarefas++;
    if (t.estimativaHoras !== undefined) {
      semana.horasPorProjeto[t.repositorio] = arredondar((semana.horasPorProjeto[t.repositorio] ?? 0) + t.estimativaHoras);
      semana.horas = arredondar(semana.horas + t.estimativaHoras);
    }
  }
  for (const p of prs) {
    const s = semanaDe(p.mescladoEm)!;
    comEntrega.add(s);
    const semana = porInicio.get(s);
    if (semana) semana.prs++;
  }

  // A sequência: da semana atual pra trás; se a atual ainda não tem entrega, começa da anterior.
  let sequencia = 0;
  let n = comEntrega.has(semanaAtual) ? n0 : n0 - 7;
  while (comEntrega.has(diaDoNumero(n))) {
    sequencia++;
    n -= 7;
  }

  const estimadoReal: EstimadoReal[] = [];
  for (const t of [...tarefas].reverse()) {
    if (!t.pegouEm || !t.prAbertoEm) continue;
    const realMs = Date.parse(t.prAbertoEm) - Date.parse(t.pegouEm);
    if (!Number.isFinite(realMs) || realMs < 0) continue;
    const item: EstimadoReal = { repositorio: t.repositorio, numero: t.numero, titulo: t.titulo, url: t.url, realMs };
    if (t.estimativaHoras !== undefined) item.estimativaHoras = t.estimativaHoras;
    estimadoReal.push(item);
    if (estimadoReal.length >= MAXIMO_DO_ESTIMADO_REAL) break;
  }

  return {
    totalHoras: arredondar(tarefas.reduce((h, t) => h + (t.estimativaHoras ?? 0), 0)),
    totalTarefas: tarefas.length,
    totalPrs: prs.length,
    semEstimativa: tarefas.filter((t) => t.estimativaHoras === undefined).length,
    horasDaSemana: semanas[semanas.length - 1]?.horas ?? 0,
    sequencia,
    semanas,
    projetos: [...new Set(tarefas.map((t) => t.repositorio))].sort(ordemDosProjetos),
    conquistas: conquistasDas(tarefas),
    estimadoReal,
    areas: proporcoes(tarefas.map((t) => t.chefe ?? "sem área")),
    ondeTrabalhou: proporcoes(tarefas.map((t) => t.repositorio)),
  };
}

import type { EstadoTarefa, Tarefa } from "../tipos";

export const ESTADOS: EstadoTarefa[] = ["livre", "andamento", "revisao", "feita"];

export function contarPorEstado(tarefas: Tarefa[]): Record<EstadoTarefa, number> {
  const contagem: Record<EstadoTarefa, number> = { livre: 0, andamento: 0, revisao: 0, feita: 0 };
  for (const t of tarefas) contagem[t.estado] += 1;
  return contagem;
}

export function total(tarefas: Tarefa[]): number {
  return tarefas.length;
}

/** Horas das tarefas feitas e de todas. Tarefa sem estimativa não conta pra nenhum lado. */
export function horas(tarefas: Tarefa[]): { feitas: number; todas: number } {
  let feitas = 0;
  let todas = 0;
  for (const t of tarefas) {
    const h = t.estimativaHoras ?? 0;
    todas += h;
    if (t.estado === "feita") feitas += h;
  }
  return { feitas, todas };
}

/** Quem está com mais de uma tarefa em andamento (regra "uma por vez"). */
export function pessoasComVariasEmAndamento(tarefas: Tarefa[]): { login: string; quantas: number }[] {
  const porLogin = new Map<string, number>();
  for (const t of tarefas) {
    if (t.estado === "andamento" && t.dono) {
      porLogin.set(t.dono.login, (porLogin.get(t.dono.login) ?? 0) + 1);
    }
  }
  return [...porLogin].filter(([, quantas]) => quantas > 1).map(([login, quantas]) => ({ login, quantas }));
}

/** Ordem dos grupos na lista. */
export const ORDEM_DOS_GRUPOS: EstadoTarefa[] = ["andamento", "revisao", "livre", "feita"];

export function agruparPorEstado(tarefas: Tarefa[]): { estado: EstadoTarefa; tarefas: Tarefa[] }[] {
  return ORDEM_DOS_GRUPOS.map((estado) => ({
    estado,
    tarefas: tarefas.filter((t) => t.estado === estado),
  }));
}

export type HorasDeUmaPessoa = {
  login: string;
  avatar: string;
  /** Horas das tarefas feitas. */
  entregues: number;
  /** Horas das tarefas em andamento ou em revisão. */
  segurando: number;
  /** Quantas tarefas (feitas, em andamento ou em revisão) estão sem estimativa. Não entram nas horas. */
  semEstimativa: number;
};

/** Arredonda a 2 casas pra a soma de 0,1 + 0,2 não virar 0,30000000000000004. */
const arredondar = (n: number) => Math.round(n * 100) / 100;

/**
 * Horas de cada pessoa na leva, pela estimativa das tarefas. Entregue = feita; segurando = em andamento ou
 * em revisão. Tarefa livre ou sem dono não entra. Tarefa sem estimativa vai em `semEstimativa` (nunca vira 0 h).
 * Ordem: mais horas entregues, depois mais horas segurando, depois o login em ordem alfabética.
 */
export function horasPorPessoa(tarefas: Tarefa[]): HorasDeUmaPessoa[] {
  const porLogin = new Map<string, HorasDeUmaPessoa>();
  for (const t of tarefas) {
    if (!t.dono) continue;
    if (t.estado !== "feita" && t.estado !== "andamento" && t.estado !== "revisao") continue;
    let p = porLogin.get(t.dono.login);
    if (!p) {
      p = { login: t.dono.login, avatar: t.dono.avatar, entregues: 0, segurando: 0, semEstimativa: 0 };
      porLogin.set(t.dono.login, p);
    } else if (!p.avatar && t.dono.avatar) {
      p.avatar = t.dono.avatar;
    }
    const h = t.estimativaHoras;
    if (h === undefined || !Number.isFinite(h)) {
      p.semEstimativa += 1;
    } else if (t.estado === "feita") {
      p.entregues += h;
    } else {
      p.segurando += h;
    }
  }
  return [...porLogin.values()]
    .map((p) => ({ ...p, entregues: arredondar(p.entregues), segurando: arredondar(p.segurando) }))
    .sort((a, b) => b.entregues - a.entregues || b.segurando - a.segurando || (a.login < b.login ? -1 : a.login > b.login ? 1 : 0));
}

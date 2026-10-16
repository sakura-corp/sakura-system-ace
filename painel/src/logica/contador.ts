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

import type { Agente, EstadoBonequinho, Modelo, TarefaDoEscritorio } from "../tipos";

import { decorrido, DORMINDO_A_PARTIR_MS, TRABALHANDO_ATE_MS } from "./tempo";

export { haQuantoTempo } from "./tempo";
export { linkSeguro } from "./link";

/** Ordem de importância: o que espera quem está olhando vem primeiro. */
export const ORDEM_DOS_ESTADOS: EstadoBonequinho[] = ["precisa", "erro", "trabalhando", "dormindo", "livre"];

export const ROTULO_DO_ESTADO: Record<EstadoBonequinho, string> = {
  trabalhando: "trabalhando",
  precisa: "precisa de você",
  erro: "com erro",
  dormindo: "dormindo",
  livre: "livre",
};

/** O balão diz o estado sem depender de cor nem de animação. */
export const BALAO_DO_ESTADO: Record<EstadoBonequinho, string> = {
  trabalhando: "digitando…",
  precisa: "!",
  erro: "×",
  dormindo: "zZ",
  livre: "",
};

export const NOME_DO_MODELO: Record<Modelo, string> = { opus: "Opus", sonnet: "Sonnet", haiku: "Haiku" };

/**
 * O estado de um agente, do ponto de vista de quem está olhando.
 * Precisa de você > com erro > trabalhando > dormindo > livre.
 */
export function estadoDoAgente(agente: Agente, agora: Date, quemEstaOlhando: string): EstadoBonequinho {
  if (agente.esperandoPor !== undefined && agente.esperandoPor === quemEstaOlhando) return "precisa";
  if (agente.falhou) return "erro";
  const ms = decorrido(agente.ultimaAtividade, agora);
  if (agente.rodando && ms < TRABALHANDO_ATE_MS) return "trabalhando";
  if (ms >= DORMINDO_A_PARTIR_MS) return "dormindo";
  return "livre";
}

export type AgenteComEstado = Agente & { estado: EstadoBonequinho };

export function comEstado(agentes: Agente[], agora: Date, quemEstaOlhando: string): AgenteComEstado[] {
  return agentes.map((a) => ({ ...a, estado: estadoDoAgente(a, agora, quemEstaOlhando) }));
}

/** Ordem dentro de uma sala e na lista: pelo estado (ORDEM_DOS_ESTADOS), depois pelo nome. Não muda a lista recebida. */
export function ordenarAgentes(agentes: AgenteComEstado[]): AgenteComEstado[] {
  return [...agentes].sort(
    (a, b) =>
      ORDEM_DOS_ESTADOS.indexOf(a.estado) - ORDEM_DOS_ESTADOS.indexOf(b.estado) || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

/** "N agentes · M rodando": rodando = trabalhando agora. */
export function contarAgentes(agentes: AgenteComEstado[]): { total: number; rodando: number; precisam: number } {
  return {
    total: agentes.length,
    rodando: agentes.filter((a) => a.estado === "trabalhando").length,
    precisam: agentes.filter((a) => a.estado === "precisa").length,
  };
}

export function textoDaContagem({ total, rodando }: { total: number; rodando: number }): string {
  return `${total} ${total === 1 ? "agente" : "agentes"} · ${rodando} rodando`;
}

export function agentesDaEquipe(agentes: AgenteComEstado[], equipe: string): AgenteComEstado[] {
  return ordenarAgentes(agentes.filter((a) => a.equipe === equipe));
}

/** Quantos agentes rodam em cada modelo, na ordem Opus, Sonnet, Haiku. */
export function contarPorModelo(agentes: Agente[]): { modelo: Modelo; quantos: number }[] {
  return (["opus", "sonnet", "haiku"] as Modelo[]).map((modelo) => ({
    modelo,
    quantos: agentes.filter((a) => a.modelo === modelo).length,
  }));
}

/** Mesmo dia do calendário, no fuso do computador (é o "hoje" de quem está olhando). */
export function mesmoDiaLocal(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * O quadro do dia: rodando (mais adiantada primeiro), esperando você, e feitas hoje (a mais recente primeiro).
 * Feita em outro dia não aparece.
 */
export function quadroDoDia(tarefas: TarefaDoEscritorio[], agora: Date) {
  const rodando = tarefas
    .filter((t) => t.situacao === "rodando")
    .sort((a, b) => (b.progresso ?? 0) - (a.progresso ?? 0));
  const esperando = tarefas.filter((t) => t.situacao === "esperando");
  const feitasHoje = tarefas
    .filter((t) => t.situacao === "feita" && t.feitaEm !== undefined && mesmoDiaLocal(new Date(t.feitaEm), agora))
    .sort((a, b) => new Date(b.feitaEm!).getTime() - new Date(a.feitaEm!).getTime());
  return { rodando, esperando, feitasHoje, total: rodando.length + esperando.length + feitasHoje.length };
}

/** Progresso sempre entre 0 e 100, inteiro. */
export function limitarProgresso(p: number | undefined): number {
  if (p === undefined || Number.isNaN(p)) return 0;
  return Math.round(Math.min(100, Math.max(0, p)));
}

/**
 * Pontos de um mini-gráfico de linha (SVG polyline), de 0..largura e 0..altura.
 * Série vazia não desenha nada; série reta fica no meio.
 */
export function pontosDoMiniGrafico(serie: number[], largura: number, altura: number): string {
  if (serie.length === 0) return "";
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const passo = serie.length === 1 ? 0 : largura / (serie.length - 1);
  return serie
    .map((v, i) => {
      const y = max === min ? altura / 2 : altura - ((v - min) / (max - min)) * altura;
      return `${round(i * passo)},${round(y)}`;
    })
    .join(" ");
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Posição de cada sala numa roda (elipse) em volta do centro, começando no alto e indo no sentido do relógio. */
export function posicoesEmRoda(quantas: number, cx: number, cy: number, rx: number, ry: number): { x: number; y: number }[] {
  return Array.from({ length: quantas }, (_, i) => {
    const angulo = -Math.PI / 2 + (2 * Math.PI * i) / quantas;
    return { x: round(cx + rx * Math.cos(angulo)), y: round(cy + ry * Math.sin(angulo)) };
  });
}

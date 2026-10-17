import { describe, expect, it } from "vitest";
import type { EntradaDaSala, RespostaDaLeva, RespostaDaSala, Tarefa } from "../tipos";
import { montarInicio } from "./inicio";
import { montarSala } from "./sala";

const agora = new Date("2026-10-17T15:00:00-03:00");
const entrada = (extra: Partial<EntradaDaSala>): EntradaDaSala => ({ id: "x", tipo: "claude", nome: "X", sinais: {}, ...extra });
const sala = (entradas: EntradaDaSala[]): RespostaDaSala => ({ entradas, falhas: [], leva: 1 });
const tarefa = (numero: number, estado: Tarefa["estado"], dono?: string, extra: Partial<Tarefa> = {}): Tarefa => ({
  numero, titulo: `T${numero}`, url: `https://x/${numero}`, estado, ...(dono ? { dono: { login: dono, avatar: "" } } : {}), ...extra,
});
const leva = (tarefas: Tarefa[], cortada = false): RespostaDaLeva => ({ numero: 1, tarefas, cortada });

describe("precisa de você", () => {
  const entradas = [
    entrada({ id: "rev-eu", nome: "Revisão minha", sinais: { revisaoPedidaA: ["ana"] } }),
    entrada({ id: "rev-outra", nome: "Revisão da Bia", sinais: { revisaoPedidaA: ["bia"] } }),
    entrada({ id: "aprova", tipo: "casa", nome: "Liberar", sinais: { aprovacaoEsperadaDe: ["ana"] } }),
    entrada({ id: "vermelha", nome: "PR vermelho", sinais: { conferenciaVermelhaNoPrDe: "ana" } }),
    entrada({ id: "erro", tipo: "casa", nome: "Conferência", sinais: { ultimaRodada: "falhou" } }),
    entrada({ id: "livre", tipo: "pessoa", nome: "bia" }),
  ];

  it("o do Início é igual ao da Sala: mesmos ids, mesma ordem, sem o caso de outra pessoa nem o robô com erro", () => {
    const esperado = montarSala(entradas, agora, "ana").filter((b) => b.estado === "precisa").map((b) => b.id);
    const ids = montarInicio(sala(entradas), null, "ana", agora).precisaDeVoce.map((b) => b.id);
    expect(esperado.length).toBe(3);
    expect(ids).toEqual(esperado);
    expect(ids).not.toContain("rev-outra");
    expect(ids).not.toContain("erro");
    expect(montarInicio(sala(entradas), null, "bia", agora).precisaDeVoce.map((b) => b.id)).toEqual(["rev-outra"]);
  });
});

describe("sua tarefa", () => {
  const tarefas = [
    tarefa(1, "revisao", "ana"),
    tarefa(2, "andamento", "bia"),
    tarefa(3, "andamento", "ana"),
    tarefa(4, "livre"),
    tarefa(5, "feita", "ana"),
    tarefa(6, "revisao", "bia"),
    tarefa(7, "andamento", "ana"),
  ];

  it("tarefa de outra pessoa nunca é sua: só as do próprio em andamento/revisão, andamento primeiro", () => {
    const r = montarInicio(null, leva(tarefas), "ana", agora).suaTarefa.map((t) => t.numero);
    expect(r).toEqual([3, 7, 1]);
  });
  it("login com maiúsculas diferentes conta como o mesmo (mesmoLogin); login vazio não pega nada", () => {
    expect(montarInicio(null, leva(tarefas), "ANA", agora).suaTarefa.map((t) => t.numero)).toEqual([3, 7, 1]);
    expect(montarInicio(null, leva(tarefas), "", agora).suaTarefa).toEqual([]);
    expect(montarInicio(null, leva([tarefa(8, "andamento")]), "", agora).suaTarefa).toEqual([]);
  });
});

describe("resumo da leva", () => {
  it("a leva cortada chega no resumo, com contagem, feitas, total e horas certos", () => {
    const tarefas = [
      tarefa(1, "feita", "ana", { estimativaHoras: 2 }),
      tarefa(2, "feita", "bia", { estimativaHoras: 1.5 }),
      tarefa(3, "andamento", "ana", { estimativaHoras: 3 }),
      tarefa(4, "livre"),
      tarefa(5, "revisao", "bia", { estimativaHoras: 4 }),
    ];
    const r = montarInicio(null, leva(tarefas, true), "ana", agora).resumoDaLeva;
    expect(r).toEqual({
      numero: 1, total: 5, feitas: 2, cortada: true,
      contagem: { livre: 1, andamento: 1, revisao: 1, feita: 2 },
      horas: { feitas: 3.5, todas: 10.5 },
    });
    expect(montarInicio(null, leva(tarefas, false), "ana", agora).resumoDaLeva?.cortada).toBe(false);
  });
});

describe("sem dados", () => {
  it("sala e leva nulas dão tudo vazio e resumo null", () => {
    expect(montarInicio(null, null, "ana", agora)).toEqual({ precisaDeVoce: [], suaTarefa: [], resumoDaLeva: null });
  });
  it("só a sala, ou só a leva, funcionam separados", () => {
    const s = sala([entrada({ id: "a", sinais: { revisaoPedidaA: ["ana"] } })]);
    const i = montarInicio(s, null, "ana", agora);
    expect(i.precisaDeVoce).toHaveLength(1);
    expect(i.resumoDaLeva).toBeNull();
    const j = montarInicio(null, leva([]), "ana", agora);
    expect(j.precisaDeVoce).toEqual([]);
    expect(j.resumoDaLeva).toMatchObject({ total: 0, feitas: 0 });
  });
});

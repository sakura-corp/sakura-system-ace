import { describe, expect, it } from "vitest";
import { agentesDeExemplo, equipesDeExemplo, QUEM_ESTA_OLHANDO_NO_EXEMPLO, tarefasDoEscritorioDeExemplo } from "../dados/exemplo-escritorio";
import type { Agente, TarefaDoEscritorio } from "../tipos";
import {
  agentesDaEquipe, comEstado, contarAgentes, contarPorModelo, estadoDoAgente, haQuantoTempo, limitarProgresso,
  linkSeguro, ordenarAgentes, pontosDoMiniGrafico, posicoesEmRoda, quadroDoDia, textoDaContagem,
} from "./escritorio";

const agora = new Date("2026-10-16T15:00:00-03:00");
const ha = (min: number, de = agora) => new Date(de.getTime() - min * 60_000).toISOString();
const ag = (extra: Partial<Agente> = {}): Agente => ({
  id: "x", nome: "X", equipe: "painel", modelo: "sonnet", fazendo: "", ultimaAtividade: ha(10), ...extra,
});

describe("estadoDoAgente", () => {
  it("rodando com atividade há menos de 2 h = trabalhando; com 2 h ou mais = livre", () => {
    expect(estadoDoAgente(ag({ rodando: true, ultimaAtividade: ha(119) }), agora, "eu")).toBe("trabalhando");
    expect(estadoDoAgente(ag({ rodando: true, ultimaAtividade: ha(120) }), agora, "eu")).toBe("livre");
  });
  it("sem atividade há 3 dias ou mais = dormindo, mesmo marcado como rodando", () => {
    expect(estadoDoAgente(ag({ ultimaAtividade: ha(3 * 24 * 60 - 1) }), agora, "eu")).toBe("livre");
    expect(estadoDoAgente(ag({ ultimaAtividade: ha(3 * 24 * 60) }), agora, "eu")).toBe("dormindo");
    expect(estadoDoAgente(ag({ rodando: true, ultimaAtividade: ha(4 * 24 * 60) }), agora, "eu")).toBe("dormindo");
  });
  it("precisa de você só quando espera quem está olhando", () => {
    expect(estadoDoAgente(ag({ esperandoPor: "eu" }), agora, "eu")).toBe("precisa");
    expect(estadoDoAgente(ag({ esperandoPor: "outra" }), agora, "eu")).toBe("livre");
  });
  it("ordem: precisa de você vence erro, e erro vence trabalhando", () => {
    expect(estadoDoAgente(ag({ esperandoPor: "eu", falhou: true, rodando: true }), agora, "eu")).toBe("precisa");
    expect(estadoDoAgente(ag({ falhou: true, rodando: true }), agora, "eu")).toBe("erro");
  });
  it("conta tempo corrido, não dia de calendário: na virada do horário de verão (EUA), 2 dias e 22,5 h ainda não é dormindo", () => {
    const depois = new Date("2026-03-10T11:30:00-04:00"); // depois da troca de horário
    const antes = "2026-03-07T12:00:00-05:00"; // antes: 3 datas de calendário, mas só 70,5 h corridas
    expect(estadoDoAgente(ag({ ultimaAtividade: antes }), depois, "eu")).toBe("livre");
    expect(estadoDoAgente(ag({ ultimaAtividade: "2026-03-07T10:30:00-05:00" }), depois, "eu")).toBe("dormindo"); // 72 h
  });
});

describe("haQuantoTempo", () => {
  it("minutos, horas e dias corridos", () => {
    expect(haQuantoTempo(ha(0), agora)).toBe("agora há pouco");
    expect(haQuantoTempo(ha(5), agora)).toBe("há 5 min");
    expect(haQuantoTempo(ha(59), agora)).toBe("há 59 min");
    expect(haQuantoTempo(ha(60), agora)).toBe("há 1 h");
    expect(haQuantoTempo(ha(24 * 60), agora)).toBe("há 1 dia");
    expect(haQuantoTempo(ha(3 * 24 * 60 + 5), agora)).toBe("há 3 dias");
  });
  it("na virada do dia: 23:50 de ontem até 00:10 de hoje é 20 min, não 1 dia", () => {
    expect(haQuantoTempo("2026-10-15T23:50:00-03:00", new Date("2026-10-16T00:10:00-03:00"))).toBe("há 20 min");
  });
  it("data no futuro (relógio adiantado) não vira tempo negativo", () => {
    expect(haQuantoTempo(ha(-10), agora)).toBe("agora há pouco");
  });
});

describe("contagens e ordem", () => {
  const todos = comEstado(agentesDeExemplo(agora), agora, QUEM_ESTA_OLHANDO_NO_EXEMPLO);
  it("o exemplo tem 15 agentes, 5 rodando e 2 que precisam de você", () => {
    expect(contarAgentes(todos)).toEqual({ total: 15, rodando: 5, precisam: 2 });
    expect(textoDaContagem(contarAgentes(todos))).toBe("15 agentes · 5 rodando");
    expect(textoDaContagem({ total: 1, rodando: 0 })).toBe("1 agente · 0 rodando");
  });
  it("'rodando' conta só quem está trabalhando agora: marcado como rodando mas parado há 3 h, ou com erro, não conta", () => {
    const lista = comEstado(
      [ag({ rodando: true }), ag({ rodando: true, ultimaAtividade: ha(180) }), ag({ rodando: true, falhou: true })],
      agora, "eu",
    );
    expect(contarAgentes(lista)).toEqual({ total: 3, rodando: 1, precisam: 0 });
  });
  it("o exemplo cobre os 5 estados", () => {
    expect(new Set(todos.map((a) => a.estado))).toEqual(new Set(["trabalhando", "precisa", "erro", "dormindo", "livre"]));
  });
  it("ordena por estado (precisa, erro, trabalhando, dormindo, livre) e depois pelo nome, sem mexer na lista original", () => {
    const lista = comEstado(
      [
        ag({ id: "1", nome: "Zeca" }), ag({ id: "2", nome: "Bia", rodando: true }), ag({ id: "3", nome: "Ana", rodando: true }),
        ag({ id: "4", nome: "Duda", falhou: true }), ag({ id: "5", nome: "Caio", esperandoPor: "eu" }),
        ag({ id: "6", nome: "Eva", ultimaAtividade: ha(5 * 24 * 60) }),
      ],
      agora, "eu",
    );
    expect(ordenarAgentes(lista).map((a) => a.nome)).toEqual(["Caio", "Duda", "Ana", "Bia", "Eva", "Zeca"]);
    expect(lista[0].nome).toBe("Zeca");
  });
  it("agentes de uma sala: só os dela, já ordenados", () => {
    expect(agentesDaEquipe(todos, "painel").map((a) => a.nome)).toEqual(["Escritório", "Tela da leva", "Sala"]);
  });
  it("conta por modelo, na ordem Opus, Sonnet, Haiku", () => {
    expect(contarPorModelo(agentesDeExemplo(agora))).toEqual([
      { modelo: "opus", quantos: 3 }, { modelo: "sonnet", quantos: 7 }, { modelo: "haiku", quantos: 5 },
    ]);
  });
  it("toda equipe do exemplo tem pelo menos um agente, e todo agente é de uma equipe que existe", () => {
    const ids = new Set(equipesDeExemplo.map((e) => e.id));
    expect(equipesDeExemplo).toHaveLength(6);
    for (const a of todos) expect(ids.has(a.equipe)).toBe(true);
    for (const e of equipesDeExemplo) expect(todos.some((a) => a.equipe === e.id)).toBe(true);
  });
});

describe("quadroDoDia", () => {
  const t = (id: string, extra: Partial<TarefaDoEscritorio>): TarefaDoEscritorio => ({ id, titulo: id, equipe: "painel", situacao: "rodando", ...extra });
  it("separa rodando (mais adiantada primeiro), esperando e feitas hoje (a mais recente primeiro)", () => {
    const q = quadroDoDia(
      [
        t("r1", { progresso: 20 }), t("r2", { progresso: 90 }), t("e1", { situacao: "esperando" }),
        t("f1", { situacao: "feita", feitaEm: ha(120) }), t("f2", { situacao: "feita", feitaEm: ha(5) }),
      ],
      agora,
    );
    expect(q.rodando.map((x) => x.id)).toEqual(["r2", "r1"]);
    expect(q.esperando.map((x) => x.id)).toEqual(["e1"]);
    expect(q.feitasHoje.map((x) => x.id)).toEqual(["f2", "f1"]);
    expect(q.total).toBe(5);
  });
  it("feita ontem não entra em 'feitas hoje', mesmo que tenha sido há 20 min (virada do dia, no fuso do computador)", () => {
    const meiaNoiteE10 = new Date(2026, 9, 16, 0, 10);
    const ontem2350 = new Date(2026, 9, 15, 23, 50).toISOString();
    const hoje0005 = new Date(2026, 9, 16, 0, 5).toISOString();
    const q = quadroDoDia([t("ontem", { situacao: "feita", feitaEm: ontem2350 }), t("hoje", { situacao: "feita", feitaEm: hoje0005 })], meiaNoiteE10);
    expect(q.feitasHoje.map((x) => x.id)).toEqual(["hoje"]);
  });
  it("no exemplo: 5 rodando, 2 esperando, 3 feitas hoje (a de ontem fica de fora)", () => {
    const q = quadroDoDia(tarefasDoEscritorioDeExemplo(agora), agora);
    expect([q.rodando.length, q.esperando.length, q.feitasHoje.length]).toEqual([5, 2, 3]);
  });
});

describe("linkSeguro", () => {
  it("aceita só https://github.com/sakura-corp/", () => {
    expect(linkSeguro("https://github.com/sakura-corp/sakura-system-ace/pulls")).toBe("https://github.com/sakura-corp/sakura-system-ace/pulls");
    expect(linkSeguro("https://github.com/outra-org/x")).toBeUndefined();
    expect(linkSeguro("https://github.com/sakura-corp.evil.com/x")).toBeUndefined();
    expect(linkSeguro("http://github.com/sakura-corp/x")).toBeUndefined();
    expect(linkSeguro("javascript:alert(1)")).toBeUndefined();
    expect(linkSeguro(undefined)).toBeUndefined();
  });
});

describe("números pequenos do desenho", () => {
  it("progresso fica entre 0 e 100, inteiro", () => {
    expect([limitarProgresso(-5), limitarProgresso(41.6), limitarProgresso(130), limitarProgresso(undefined), limitarProgresso(NaN)]).toEqual([0, 42, 100, 0, 0]);
  });
  it("mini-gráfico: menor valor embaixo, maior em cima; série reta no meio; vazia não desenha", () => {
    expect(pontosDoMiniGrafico([1, 3, 2], 100, 20)).toBe("0,20 50,0 100,10");
    expect(pontosDoMiniGrafico([4, 4], 100, 20)).toBe("0,10 100,10");
    expect(pontosDoMiniGrafico([], 100, 20)).toBe("");
  });
  it("salas em roda: a primeira no alto, as outras no sentido do relógio", () => {
    const p = posicoesEmRoda(4, 500, 350, 300, 200);
    expect(p).toEqual([{ x: 500, y: 150 }, { x: 800, y: 350 }, { x: 500, y: 550 }, { x: 200, y: 350 }]);
  });
});

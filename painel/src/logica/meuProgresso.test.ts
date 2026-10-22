import { describe, expect, it } from "vitest";
import type { RespostaDoMeuProgresso, TarefaEntregue } from "../tipos";
import { diaLocal, hojeLocal, montarProgresso, nomeDoProjeto, SEMANAS_NO_GRAFICO, semanaDoDia, textoDoTempo } from "./meuProgresso";

const SSACE = "sakura-system-ace";
let numero = 1;
const tarefa = (feitaEm: string, extra: Partial<TarefaEntregue> = {}): TarefaEntregue => ({
  repositorio: SSACE,
  numero: numero++,
  titulo: "Tarefa",
  url: "https://github.com/sakura-corp/sakura-system-ace/issues/1",
  feitaEm,
  estimativaHoras: 2,
  ...extra,
});
const resposta = (tarefas: TarefaEntregue[], prs: RespostaDoMeuProgresso["prs"] = []): RespostaDoMeuProgresso => ({ login: "fulana", tarefas, prs });

// Quarta, 22/10/2026, 15h em São Paulo (18h UTC).
const AGORA = new Date("2026-10-22T18:00:00Z");

describe("o dia e a semana no fuso de São Paulo (#734)", () => {
  it("o dia é o de São Paulo, não o do UTC", () => {
    // 23h30 de domingo em São Paulo já é segunda 02h30 em UTC.
    expect(diaLocal("2026-10-26T02:30:00Z")).toBe("2026-10-25");
    expect(diaLocal("2026-10-26T03:00:00Z")).toBe("2026-10-26");
    expect(hojeLocal(AGORA)).toBe("2026-10-22");
    expect(diaLocal("lixo")).toBeNull();
  });

  it("a semana começa na segunda", () => {
    expect(semanaDoDia("2026-10-25")).toBe("2026-10-19"); // domingo
    expect(semanaDoDia("2026-10-26")).toBe("2026-10-26"); // segunda
    expect(semanaDoDia("2026-10-22")).toBe("2026-10-19");
    expect(semanaDoDia("2026-01-01")).toBe("2025-12-29"); // atravessa o ano
  });

  it("domingo 23h30 em São Paulo conta na semana que acaba; segunda 00h30, na que começa", () => {
    const agora = new Date("2026-10-27T15:00:00Z"); // terça, 27/10
    const p = montarProgresso(resposta([tarefa("2026-10-26T02:30:00Z"), tarefa("2026-10-26T03:30:00Z")]), agora);
    const ultima = p.semanas[p.semanas.length - 1];
    const penultima = p.semanas[p.semanas.length - 2];
    expect(ultima.inicio).toBe("2026-10-26");
    expect(ultima.tarefas).toBe(1);
    expect(penultima.inicio).toBe("2026-10-19");
    expect(penultima.tarefas).toBe(1);
  });
});

describe("as horas", () => {
  it("somam todos os projetos e todas as levas; sem estimativa não conta e é contada à parte", () => {
    const p = montarProgresso(
      resposta([
        tarefa("2026-10-20T15:00:00Z", { estimativaHoras: 3 }),
        tarefa("2026-10-21T15:00:00Z", { repositorio: "ar", estimativaHoras: 1.5 }),
        tarefa("2026-10-21T16:00:00Z", { estimativaHoras: undefined }),
        tarefa("2026-09-01T15:00:00Z", { estimativaHoras: 10 }),
      ]),
      AGORA,
    );
    expect(p.totalHoras).toBe(14.5);
    expect(p.semEstimativa).toBe(1);
    expect(p.totalTarefas).toBe(4);
    expect(p.horasDaSemana).toBe(4.5);
    const semana = p.semanas[p.semanas.length - 1];
    expect(semana.horasPorProjeto).toEqual({ [SSACE]: 3, ar: 1.5 });
    expect(semana.horas).toBe(4.5);
    expect(p.projetos).toEqual([SSACE, "ar"]);
  });

  it("o gráfico tem as últimas semanas, da mais velha pra atual, sem buraco", () => {
    const p = montarProgresso(resposta([]), AGORA);
    expect(p.semanas).toHaveLength(SEMANAS_NO_GRAFICO);
    expect(p.semanas[p.semanas.length - 1].inicio).toBe("2026-10-19");
    expect(p.semanas[p.semanas.length - 2].inicio).toBe("2026-10-12");
    expect(p.semanas[0].inicio).toBe(semanaDoDia("2026-08-03"));
  });

  it("o SSACE vem primeiro; os outros projetos em ordem de nome", () => {
    const p = montarProgresso(resposta([tarefa("2026-10-20T15:00:00Z", { repositorio: "zeta" }), tarefa("2026-10-20T15:00:00Z", { repositorio: "ar" }), tarefa("2026-10-20T15:00:00Z")]), AGORA);
    expect(p.projetos).toEqual([SSACE, "ar", "zeta"]);
    expect(nomeDoProjeto(SSACE)).toBe("SSACE");
    expect(nomeDoProjeto("ar")).toBe("ar");
  });
});

describe("tarefas e PRs por semana", () => {
  it("conta os PRs mesclados no total e na semana", () => {
    const p = montarProgresso(
      resposta([], [
        { repositorio: SSACE, numero: 1, mescladoEm: "2026-10-20T15:00:00Z" },
        { repositorio: SSACE, numero: 2, mescladoEm: "2026-10-01T15:00:00Z" },
      ]),
      AGORA,
    );
    expect(p.totalPrs).toBe(2);
    expect(p.semanas[p.semanas.length - 1].prs).toBe(1);
  });
});

describe("a sequência", () => {
  it("semanas seguidas com alguma entrega, terminando nesta", () => {
    const p = montarProgresso(resposta([tarefa("2026-10-20T15:00:00Z"), tarefa("2026-10-13T15:00:00Z"), tarefa("2026-09-29T15:00:00Z")]), AGORA);
    expect(p.sequencia).toBe(2);
  });

  it("a semana atual ainda sem entrega não quebra a sequência", () => {
    const p = montarProgresso(resposta([tarefa("2026-10-13T15:00:00Z"), tarefa("2026-10-06T15:00:00Z")]), AGORA);
    expect(p.sequencia).toBe(2);
  });

  it("PR mesclado também conta como entrega", () => {
    const p = montarProgresso(resposta([tarefa("2026-10-13T15:00:00Z")], [{ repositorio: SSACE, numero: 9, mescladoEm: "2026-10-20T15:00:00Z" }]), AGORA);
    expect(p.sequencia).toBe(2);
  });

  it("sem entrega há duas semanas, zera", () => {
    expect(montarProgresso(resposta([tarefa("2026-10-06T15:00:00Z")]), AGORA).sequencia).toBe(0);
  });

  it("vira na segunda 00h em São Paulo, não no UTC", () => {
    // Entrega no domingo 25/10 às 23h30 (São Paulo). Na segunda 26/10 às 00h30 (São Paulo) = 03h30 UTC,
    // a semana nova começou sem entrega, mas a anterior tem: sequência 1.
    const entregas = resposta([tarefa("2026-10-26T02:30:00Z")]);
    expect(montarProgresso(entregas, new Date("2026-10-26T03:30:00Z")).sequencia).toBe(1);
    // Uma semana depois (segunda 02/11, 00h30), a semana 19–25/10 já não é a anterior: zera.
    expect(montarProgresso(entregas, new Date("2026-11-02T03:30:00Z")).sequencia).toBe(0);
    // Domingo 01/11 às 23h (São Paulo) = segunda 02h UTC: ainda é a semana 26/10–01/11, e a anterior tem entrega.
    expect(montarProgresso(entregas, new Date("2026-11-02T02:00:00Z")).sequencia).toBe(1);
  });
});

describe("as conquistas", () => {
  it("primeira tarefa, 10 tarefas, 50 h, primeira num secundário e a primeira de cada área, com o dia", () => {
    const lista: TarefaEntregue[] = [];
    for (let i = 0; i < 10; i++) lista.push(tarefa(`2026-09-${String(i + 1).padStart(2, "0")}T15:00:00Z`, { estimativaHoras: 6, chefe: i === 0 ? "frontend" : i === 4 ? "backend" : undefined }));
    lista.push(tarefa("2026-09-20T15:00:00Z", { repositorio: "ar", estimativaHoras: 1 }));
    const p = montarProgresso(resposta(lista.reverse()), AGORA);
    const dias = Object.fromEntries(p.conquistas.map((c) => [c.id, c.dia]));
    expect(dias["primeira-tarefa"]).toBe("2026-09-01");
    expect(dias["10-tarefas"]).toBe("2026-09-10");
    expect(dias["50-horas"]).toBe("2026-09-09"); // 9 × 6 h = 54 h
    expect(dias["primeira-secundario"]).toBe("2026-09-20");
    expect(dias["area-frontend"]).toBe("2026-09-01");
    expect(dias["area-backend"]).toBe("2026-09-05");
    expect(dias["area-tester"]).toBeUndefined();
    // Da mais velha pra mais nova: a última é a mais recente.
    expect(p.conquistas[p.conquistas.length - 1].id).toBe("primeira-secundario");
  });

  it("sem tarefa, nenhuma conquista", () => {
    expect(montarProgresso(resposta([]), AGORA).conquistas).toEqual([]);
  });
});

describe("estimado × real", () => {
  it("de pegar a tarefa até abrir o PR, ao lado da estimativa; as mais recentes primeiro", () => {
    const p = montarProgresso(
      resposta([
        tarefa("2026-10-10T15:00:00Z", { numero: 1, estimativaHoras: 4, pegouEm: "2026-10-08T12:00:00Z", prAbertoEm: "2026-10-08T17:00:00Z" }),
        tarefa("2026-10-20T15:00:00Z", { numero: 2, estimativaHoras: undefined, pegouEm: "2026-10-18T12:00:00Z", prAbertoEm: "2026-10-20T12:00:00Z" }),
        tarefa("2026-10-21T15:00:00Z", { numero: 3, pegouEm: "2026-10-21T12:00:00Z" }),
        tarefa("2026-10-21T15:00:00Z", { numero: 4, pegouEm: "2026-10-21T12:00:00Z", prAbertoEm: "2026-10-20T12:00:00Z" }),
      ]),
      AGORA,
    );
    expect(p.estimadoReal.map((e) => [e.numero, e.estimativaHoras, e.realMs])).toEqual([
      [2, undefined, 48 * 3_600_000],
      [1, 4, 5 * 3_600_000],
    ]);
  });

  it("o tempo em texto", () => {
    expect(textoDoTempo(20 * 60_000)).toBe("menos de 1 h");
    expect(textoDoTempo(5 * 3_600_000)).toBe("5 h");
    expect(textoDoTempo(47 * 3_600_000)).toBe("47 h");
    expect(textoDoTempo(50 * 3_600_000)).toBe("2 dias");
  });
});

describe("onde já trabalhou", () => {
  it("as áreas e os projetos, em proporção das tarefas", () => {
    const p = montarProgresso(
      resposta([tarefa("2026-10-20T15:00:00Z", { chefe: "frontend" }), tarefa("2026-10-20T15:00:00Z", { chefe: "frontend" }), tarefa("2026-10-20T15:00:00Z", { chefe: "backend", repositorio: "ar" }), tarefa("2026-10-20T15:00:00Z")]),
      AGORA,
    );
    expect(p.areas).toEqual([
      { nome: "frontend", tarefas: 2, proporcao: 0.5 },
      { nome: "backend", tarefas: 1, proporcao: 0.25 },
      { nome: "sem área", tarefas: 1, proporcao: 0.25 },
    ]);
    expect(p.ondeTrabalhou).toEqual([
      { nome: SSACE, tarefas: 3, proporcao: 0.75 },
      { nome: "ar", tarefas: 1, proporcao: 0.25 },
    ]);
  });
});

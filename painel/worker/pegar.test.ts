import { describe, expect, it } from "vitest";
import { CONSULTA_DA_TAREFA, largarTarefa, pegarTarefa, type Escrever, type Perguntar } from "./pegar";
import { CONSULTA_DA_LEVA, CONSULTA_DAS_LEVAS, type IssueDoGitHub } from "./tarefas";

const corpo = (depende = "nada", chefe = "backend") =>
  `Chefe: ${chefe}\nAjudantes: tester\nEstimativa: 2 h\nDepende de: ${depende}\nSessões filhas: não\n\n## Pra que serve\nx`;

type Extra = { dono?: string; fechada?: boolean; prAberto?: boolean; depende?: string; chefe?: string; leva?: string };
function issue(numero: number, e: Extra = {}): IssueDoGitHub {
  return {
    number: numero,
    title: `Tarefa ${numero}`,
    url: `https://github.com/sakura-corp/sakura-system-ace/issues/${numero}`,
    state: e.fechada ? "CLOSED" : "OPEN",
    stateReason: e.fechada ? "COMPLETED" : null,
    body: corpo(e.depende, e.chefe),
    labels: { nodes: [{ name: e.leva ?? "leva-1" }, { name: "chefe:backend" }] },
    assignees: { nodes: e.dono ? [{ login: e.dono, avatarUrl: "" }] : [] },
    closedByPullRequestsReferences: { nodes: e.prAberto ? [{ url: "https://github.com/sakura-corp/sakura-system-ace/pull/9", state: "OPEN" }] : [] },
  };
}

/**
 * Finge o GitHub. `leva()` é lida A CADA pergunta (dá pra mudar entre a página e o clique), e as escritas
 * são anotadas. `depois` diz quem fica na issue depois do POST (padrão: só quem pediu).
 */
function fingirGitHub(opcoes: {
  leva: () => IssueDoGitHub[];
  dependencias?: Record<string, { state: string; stateReason?: string } | null>;
  depois?: (login: string) => string[];
  escrita?: "ok" | "erro" | "sem-acesso";
  levas?: { nome: string; abertas: number }[];
}) {
  const escritas: { metodo: string; caminho: string; corpo: unknown }[] = [];
  const consultas: string[] = [];
  const perguntar: Perguntar = async <T,>(consulta: string, variaveis: Record<string, unknown>) => {
    consultas.push(consulta);
    if (consulta === CONSULTA_DAS_LEVAS) {
      const levas = opcoes.levas ?? [{ nome: "leva-0", abertas: 0 }, { nome: "leva-1", abertas: 3 }];
      return { tipo: "ok", dados: { repository: { labels: { nodes: levas.map((l) => ({ name: l.nome, issues: { totalCount: l.abertas } })) } } } as T };
    }
    if (consulta === CONSULTA_DA_LEVA) {
      const nodes = opcoes.leva().filter((i) => i.labels?.nodes.some((l) => l?.name === variaveis.etiqueta));
      return { tipo: "ok", dados: { repository: { issues: { totalCount: nodes.length, nodes } } } as T };
    }
    if (consulta === CONSULTA_DA_TAREFA) {
      return { tipo: "ok", dados: { repository: { issue: opcoes.leva().find((i) => i.number === variaveis.numero) ?? null } } as T };
    }
    return { tipo: "ok", dados: { repository: opcoes.dependencias ?? {} } as T };
  };
  const escrever: Escrever = async (metodo, caminho, corpo) => {
    escritas.push({ metodo, caminho, corpo });
    if (opcoes.escrita && opcoes.escrita !== "ok") return { tipo: opcoes.escrita };
    const login = (corpo as { assignees: string[] }).assignees[0];
    return { tipo: "ok", dados: { assignees: (opcoes.depois?.(login) ?? (metodo === "POST" ? [login] : [])).map((l) => ({ login: l })) } };
  };
  return { perguntar, escrever, escritas, consultas };
}

const CAMINHO = (n: number) => `/repos/sakura-corp/sakura-system-ace/issues/${n}/assignees`;

describe("pegarTarefa (#538)", () => {
  it("tarefa livre e completa: põe só o login de quem pediu", async () => {
    const g = fingirGitHub({ leva: () => [issue(10), issue(11)] });
    expect(await pegarTarefa(10, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "ok" });
    expect(g.escritas).toEqual([{ metodo: "POST", caminho: CAMINHO(10), corpo: { assignees: ["fulana"] } }]);
  });

  it.each([
    ["com dono", () => [issue(10, { dono: "beltrano" })], "alguém pegou antes: a #10 é de beltrano"],
    ["já sua", () => [issue(10, { dono: "Fulana" })], "a #10 já é sua"],
    ["feita", () => [issue(10, { fechada: true })], "a #10 já está feita"],
    ["com PR aberto e sem dono", () => [issue(10, { prAberto: true })], "a #10 já tem um PR aberto"],
    ["incompleta", () => [issue(10, { chefe: "cozinha" })], "a #10 está incompleta: falta coisa no cabeçalho"],
    ["dependência aberta na leva", () => [issue(10, { depende: "#11" }), issue(11)], "espera a #11"],
    ["já com outra em andamento", () => [issue(10), issue(11, { dono: "fulana" })], "você já está com a #11"],
    ["de outra leva", () => [issue(10, { leva: "leva-0" }), issue(11)], "esta tarefa não está na leva atual"],
    ["que não existe", () => [issue(11)], "esta tarefa não está na leva atual"],
  ])("recusa tarefa %s, sem escrever nada", async (_nome, leva, motivo) => {
    const g = fingirGitHub({ leva });
    expect(await pegarTarefa(10, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "recusado", motivo });
    expect(g.escritas).toEqual([]);
  });

  it("dependência de fora da leva: pergunta ao GitHub; aberta recusa, concluída libera", async () => {
    const aberta = fingirGitHub({ leva: () => [issue(10, { depende: "#500" })], dependencias: { d500: { state: "OPEN" } } });
    expect(await pegarTarefa(10, "fulana", aberta.perguntar, aberta.escrever)).toEqual({ tipo: "recusado", motivo: "espera a #500" });
    const fechada = fingirGitHub({ leva: () => [issue(10, { depende: "#500" })], dependencias: { d500: { state: "CLOSED", stateReason: "COMPLETED" } } });
    expect(await pegarTarefa(10, "fulana", fechada.perguntar, fechada.escrever)).toEqual({ tipo: "ok" });
  });

  it("outra em revisão (PR aberto) não impede: só a em andamento conta", async () => {
    const g = fingirGitHub({ leva: () => [issue(10), issue(11, { dono: "fulana", prAberto: true })] });
    expect(await pegarTarefa(10, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "ok" });
  });

  it("confere no GitHub na hora: a página viu livre, mas alguém pegou antes do clique", async () => {
    let dono: string | undefined;
    const g = fingirGitHub({ leva: () => [issue(10, { dono })] });
    // A página carregou com a #10 livre; entre a página e o clique, o GitHub mudou.
    dono = "beltrano";
    expect(await pegarTarefa(10, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "recusado", motivo: "alguém pegou antes: a #10 é de beltrano" });
    expect(g.escritas).toEqual([]);
    expect(g.consultas[0]).toBe(CONSULTA_DAS_LEVAS);
  });

  it("dois cliques ao mesmo tempo: quem chegou depois sai e é avisado", async () => {
    const g = fingirGitHub({ leva: () => [issue(10)], depois: (login) => ["beltrano", login] });
    expect(await pegarTarefa(10, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "recusado", motivo: "alguém pegou antes: a #10 é de beltrano" });
    expect(g.escritas.map((e) => e.metodo)).toEqual(["POST", "DELETE"]);
    expect(g.escritas[1].corpo).toEqual({ assignees: ["fulana"] });
  });

  it("o GitHub ignorou calado (sem acesso de escrita): avisa em vez de dizer que deu certo", async () => {
    const g = fingirGitHub({ leva: () => [issue(10)], depois: () => [] });
    const r = await pegarTarefa(10, "fulana", g.perguntar, g.escrever);
    expect(r).toMatchObject({ tipo: "recusado" });
    expect((r as { motivo: string }).motivo).toContain("acesso de escrita");
  });

  it("número inválido nem pergunta ao GitHub", async () => {
    for (const n of [0, -1, 1.5, Number.NaN, 10_000_000]) {
      const g = fingirGitHub({ leva: () => [issue(10)] });
      expect(await pegarTarefa(n, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "recusado", motivo: "número de tarefa inválido" });
      expect(g.consultas).toEqual([]);
    }
  });

  it("a leva cortada (mais de 100 tarefas): não pega, na dúvida", async () => {
    const g = fingirGitHub({ leva: () => [issue(10)] });
    const perguntar: Perguntar = async <T,>(c: string, v: Record<string, unknown>) => {
      const r = await g.perguntar<{ repository: { issues: { totalCount: number } } }>(c, v);
      if (c === CONSULTA_DA_LEVA && r.tipo === "ok") r.dados.repository.issues.totalCount = 101;
      return r as Awaited<ReturnType<typeof g.perguntar<T>>>;
    };
    expect(await pegarTarefa(10, "fulana", perguntar, g.escrever)).toMatchObject({ tipo: "recusado" });
    expect(g.escritas).toEqual([]);
  });

  it("o GitHub falha ou recusa o token: repassa, sem escrever", async () => {
    for (const tipo of ["erro", "sem-acesso"] as const) {
      const perguntar: Perguntar = async () => ({ tipo });
      const g = fingirGitHub({ leva: () => [issue(10)] });
      expect(await pegarTarefa(10, "fulana", perguntar, g.escrever)).toEqual({ tipo });
      expect(g.escritas).toEqual([]);
    }
    const g = fingirGitHub({ leva: () => [issue(10)], escrita: "erro" });
    expect(await pegarTarefa(10, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "erro" });
  });
});

describe("largarTarefa (#538)", () => {
  it("o dono, em andamento: tira só o próprio login", async () => {
    const g = fingirGitHub({ leva: () => [issue(10, { dono: "fulana" })] });
    expect(await largarTarefa(10, "FULANA", g.perguntar, g.escrever)).toEqual({ tipo: "ok" });
    expect(g.escritas).toEqual([{ metodo: "DELETE", caminho: CAMINHO(10), corpo: { assignees: ["FULANA"] } }]);
  });

  it.each([
    ["de outra pessoa", () => [issue(10, { dono: "beltrano" })], "só quem pegou a #10 pode largar"],
    ["sem dono", () => [issue(10)], "só quem pegou a #10 pode largar"],
    ["em revisão", () => [issue(10, { dono: "fulana", prAberto: true })], "a #10 já tem um PR aberto: não dá pra largar"],
    ["feita", () => [issue(10, { dono: "fulana", fechada: true })], "a #10 já está feita"],
    ["que não existe", () => [], "não achei esta tarefa"],
  ])("recusa largar tarefa %s, sem escrever nada", async (_nome, leva, motivo) => {
    const g = fingirGitHub({ leva });
    expect(await largarTarefa(10, "fulana", g.perguntar, g.escrever)).toEqual({ tipo: "recusado", motivo });
    expect(g.escritas).toEqual([]);
  });

  it("a consulta da tarefa leva o número como variável, nunca no texto", async () => {
    const g = fingirGitHub({ leva: () => [issue(10, { dono: "fulana" })] });
    await largarTarefa(10, "fulana", g.perguntar, g.escrever);
    expect(g.consultas).toEqual([CONSULTA_DA_TAREFA]);
    expect(CONSULTA_DA_TAREFA).toContain("issue(number: $numero)");
  });
});

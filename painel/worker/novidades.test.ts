import { describe, expect, it } from "vitest";
import { novidadeDaRodada, novidadeDoEvento } from "./novidades";

const quando = "2026-10-20T12:00:00Z";
const ator = { login: "fulana" };
const issue = (extra: Record<string, unknown> = {}) => ({ number: 510, title: "Uma tarefa", html_url: "https://github.com/sakura-corp/sakura-system-ace/issues/510", ...extra });

describe("novidadeDoEvento (#549)", () => {
  it("issue: pegou (com quem entrou), fechou; PR: entregou, mesclou, fechou sem mesclar", () => {
    expect(novidadeDoEvento({ id: "1", type: "IssuesEvent", created_at: quando, actor: ator, payload: { action: "assigned", issue: issue(), assignee: { login: "fulana" } } })).toEqual({
      id: "e1", quando, tipo: "tarefa", acao: "pegou", quem: "fulana", numero: 510, alvo: "fulana", titulo: "Uma tarefa", url: "https://github.com/sakura-corp/sakura-system-ace/issues/510",
    });
    expect(novidadeDoEvento({ id: "2", type: "IssuesEvent", created_at: quando, actor: ator, payload: { action: "closed", issue: issue() } })).toMatchObject({ acao: "fechou" });
    const pr = (action: string, extra: Record<string, unknown> = {}) =>
      novidadeDoEvento({ id: "3", type: "PullRequestEvent", created_at: quando, actor: ator, payload: { action, number: 663, pull_request: { title: "PR", ...extra } } });
    expect(pr("opened")).toMatchObject({ tipo: "pr", acao: "abriu", numero: 663 });
    expect(pr("closed", { merged: true })).toMatchObject({ acao: "mesclou" });
    expect(pr("closed", { merged: false })).toMatchObject({ acao: "fechou-sem-mesclar" });
    // PR enxuto (sem `merged`): não adivinha.
    expect(pr("closed")).toMatchObject({ acao: "fechou" });
  });

  it("o formato de hoje da lista do GitHub: PR enxuto com action merged, e unassigned com assignee null", () => {
    const enxuto = { base: {}, head: {}, id: 1, number: 664, url: "https://api.github.com/repos/sakura-corp/sakura-system-ace/pulls/664" };
    expect(novidadeDoEvento({ id: "10", type: "PullRequestEvent", created_at: quando, actor: ator, payload: { action: "merged", number: 664, pull_request: enxuto } })).toEqual({
      id: "e10", quando, tipo: "pr", acao: "mesclou", quem: "fulana", numero: 664, url: "https://github.com/sakura-corp/sakura-system-ace/pull/664",
    });
    expect(novidadeDoEvento({ id: "11", type: "IssuesEvent", created_at: quando, actor: ator, payload: { action: "unassigned", issue: issue(), assignee: null } })).toMatchObject({
      tipo: "tarefa", acao: "largou", numero: 510,
    });
  });

  it("ignora o que não é issue, PR nem ação conhecida", () => {
    expect(novidadeDoEvento({ id: "4", type: "PushEvent", created_at: quando, actor: ator, payload: {} })).toBeNull();
    expect(novidadeDoEvento({ id: "5", type: "IssuesEvent", created_at: quando, actor: ator, payload: { action: "labeled", issue: issue() } })).toBeNull();
    expect(novidadeDoEvento({ id: "6", type: "PullRequestEvent", created_at: quando, actor: ator, payload: { action: "synchronize", number: 1 } })).toBeNull();
    expect(novidadeDoEvento({ id: "7", type: "IssuesEvent", created_at: "ontem", actor: ator, payload: { action: "closed", issue: issue() } })).toBeNull();
  });

  it("link de fora da sakura-corp não passa", () => {
    const n = novidadeDoEvento({ id: "8", type: "IssuesEvent", created_at: quando, actor: ator, payload: { action: "opened", issue: issue({ html_url: "https://mal.exemplo/sakura-corp/1" }) } });
    // Vira o endereço montado do número, sempre da sakura-corp.
    expect(n).toMatchObject({ url: "https://github.com/sakura-corp/sakura-system-ace/issues/510" });
  });
});

describe("novidadeDaRodada (#549)", () => {
  const rodada = (extra: Record<string, unknown> = {}) => ({ id: 9, name: "CI", status: "completed", conclusion: "success", updated_at: quando, html_url: "https://github.com/sakura-corp/sakura-system-ace/actions/runs/9", pull_requests: [{ number: 663 }], ...extra });
  it("passou e falhou viram novidade; em andamento, cancelada e pulada não", () => {
    expect(novidadeDaRodada(rodada())).toMatchObject({ id: "r9", tipo: "rodada", passou: true, nome: "CI", numero: 663 });
    expect(novidadeDaRodada(rodada({ conclusion: "failure" }))).toMatchObject({ passou: false });
    expect(novidadeDaRodada(rodada({ status: "in_progress", conclusion: null }))).toBeNull();
    expect(novidadeDaRodada(rodada({ conclusion: "cancelled" }))).toBeNull();
    expect(novidadeDaRodada(rodada({ conclusion: "skipped" }))).toBeNull();
  });
});

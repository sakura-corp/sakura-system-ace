import { describe, expect, it } from "vitest";
import { levaDosDados, levasDosDados, tarefaDaIssue, type IssueDoGitHub } from "./tarefas";

const issue = (extra: Partial<IssueDoGitHub> = {}): IssueDoGitHub => ({
  number: 354,
  title: "Painel 6/8: As tarefas de verdade do GitHub",
  url: "https://github.com/sakura-corp/sakura-system-ace/issues/354",
  state: "OPEN",
  body: "Estimativa: 5 h\n\nTexto com ghp_coisa que não pode ir pra página",
  assignees: { nodes: [] },
  closedByPullRequestsReferences: { nodes: [] },
  ...extra,
});
const pr = (n: number, state: "OPEN" | "CLOSED" | "MERGED") => ({ url: `https://github.com/sakura-corp/sakura-system-ace/pull/${n}`, state });
const fulana = { login: "fulana", avatarUrl: "https://avatars.githubusercontent.com/u/1?s=40" };

describe("tarefaDaIssue", () => {
  it("livre: aberta, sem responsável, sem PR; lê a estimativa e não leva o texto", () => {
    const t = tarefaDaIssue(issue());
    expect(t).toEqual({ numero: 354, titulo: "Painel 6/8: As tarefas de verdade do GitHub", url: "https://github.com/sakura-corp/sakura-system-ace/issues/354", estado: "livre", estimativaHoras: 5 });
    expect(JSON.stringify(t)).not.toContain("ghp_");
  });

  it("andamento: com responsável (login e foto); PR fechado sem mesclar não conta", () => {
    const t = tarefaDaIssue(issue({ assignees: { nodes: [fulana] }, closedByPullRequestsReferences: { nodes: [pr(1, "CLOSED")] } }));
    expect(t.estado).toBe("andamento");
    expect(t.dono).toEqual({ login: "fulana", avatar: fulana.avatarUrl });
    expect(t.prUrl).toBeUndefined();
  });

  it("revisão: com PR aberto que a fecha; o link é o do PR aberto", () => {
    const t = tarefaDaIssue(issue({ assignees: { nodes: [fulana] }, closedByPullRequestsReferences: { nodes: [pr(1, "CLOSED"), pr(2, "OPEN")] } }));
    expect(t.estado).toBe("revisao");
    expect(t.prUrl).toBe("https://github.com/sakura-corp/sakura-system-ace/pull/2");
  });

  it("feita: fechada; o link é o do PR mesclado", () => {
    const t = tarefaDaIssue(issue({ state: "CLOSED", assignees: { nodes: [fulana] }, closedByPullRequestsReferences: { nodes: [pr(3, "MERGED")] } }));
    expect(t.estado).toBe("feita");
    expect(t.prUrl).toBe("https://github.com/sakura-corp/sakura-system-ace/pull/3");
  });

  it("link de fora do GitHub da Sakura não passa: a issue vira o link pelo número, a foto some", () => {
    const t = tarefaDaIssue(issue({
      url: "https://mal.exemplo/354",
      assignees: { nodes: [{ login: "x", avatarUrl: "javascript:alert(1)" }] },
      closedByPullRequestsReferences: { nodes: [{ url: "https://mal.exemplo/pr", state: "OPEN" }] },
    }));
    expect(t.url).toBe("https://github.com/sakura-corp/sakura-system-ace/issues/354");
    expect(t.dono?.avatar).toBe("");
    expect(t.prUrl).toBeUndefined();
    expect(t.estado).toBe("revisao");
  });

  it("sem texto e sem a lista de PRs: livre, sem estimativa", () => {
    const t = tarefaDaIssue(issue({ body: null, closedByPullRequestsReferences: null }));
    expect(t.estado).toBe("livre");
    expect("estimativaHoras" in t).toBe(false);
  });
});

describe("etiqueta chefe:* (botão Começar com o Claude)", () => {
  const com = (...nomes: (string | null)[]) => issue({ labels: { nodes: nomes.map((name) => (name === null ? null : { name })) } });
  it("devolve só a função conhecida, ignorando as outras etiquetas", () => {
    expect(tarefaDaIssue(com("leva-0", null, "chefe:tester")).chefe).toBe("tester");
  });
  it("etiqueta desconhecida ou sem etiqueta: não tem chefe", () => {
    expect(tarefaDaIssue(com("chefe:gerente")).chefe).toBeUndefined();
    expect("chefe" in tarefaDaIssue(issue())).toBe(false);
    expect("chefe" in tarefaDaIssue(issue({ labels: null }))).toBe(false);
  });
});

describe("levasDosDados", () => {
  it("só as etiquetas leva-N, em ordem, e a atual", () => {
    const dados = {
      repository: {
        labels: {
          nodes: [
            { name: "leva-1", issues: { totalCount: 0 } },
            { name: "leva-x", issues: { totalCount: 9 } },
            null,
            { name: "leva-0", issues: { totalCount: 4 } },
            { name: "sem-leva", issues: { totalCount: 9 } },
          ],
        },
      },
    };
    expect(levasDosDados(dados)).toEqual({
      levas: [{ numero: 0, nome: "Leva 0", abertas: 4 }, { numero: 1, nome: "Leva 1", abertas: 0 }],
      atual: 0,
    });
  });
  it("sem repositório: nenhuma leva", () => {
    expect(levasDosDados({ repository: null })).toEqual({ levas: [], atual: null });
  });
});

describe("levaDosDados", () => {
  it("monta as tarefas e diz se a leva passou de 100", () => {
    expect(levaDosDados(0, { repository: { issues: { totalCount: 1, nodes: [issue()] } } })).toMatchObject({ numero: 0, cortada: false, tarefas: [{ numero: 354 }] });
    expect(levaDosDados(0, { repository: { issues: { totalCount: 150, nodes: [issue(), null] } } })?.cortada).toBe(true);
    expect(levaDosDados(0, { repository: null })).toBeNull();
  });
});

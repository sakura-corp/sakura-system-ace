import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, type Sessao } from "./sessao";
import { LIMITE_DE_PAGINAS, loginValido, prsDosDados, quemVer, tarefasDosDados, type IssueFeita } from "./meuProgresso";

const CHAVE = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres-0123456789";
const ambiente: Ambiente = {
  ASSETS: { fetch: async () => new Response("página", { status: 200 }) },
  GITHUB_APP_CLIENT_ID: "Iv-teste",
  GITHUB_APP_CLIENT_SECRET: "segredo-de-teste",
  CHAVE_DA_SESSAO: CHAVE,
  DONA_DO_FINANCEIRO: "Sofia",
};
const sessao = (login: string): Sessao => ({ token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login, avatar: "", entrouEm: Date.now() - 60_000 });
const cookieDe = async (login: string) => `sessao=${await cifrarSessao(sessao(login), CHAVE)}`;
const pedir = async (caminho: string, login?: string, { method = "GET", env = ambiente }: { method?: string; env?: Ambiente } = {}) => {
  const headers = login ? { cookie: await cookieDe(login) } : undefined;
  return worker.fetch(new Request(`https://painel.exemplo${caminho}`, { method, headers }), env);
};

const SSACE = "sakura-system-ace";
const CORPO = "Chefe: frontend\nEstimativa: 3 h\nMARCADOR_DO_CORPO_734";
const issue = (numero: number, extra: Partial<IssueFeita> = {}): IssueFeita => ({
  number: numero,
  title: `Tarefa ${numero}`,
  url: `https://github.com/sakura-corp/${SSACE}/issues/${numero}`,
  closedAt: "2026-10-20T15:00:00Z",
  stateReason: "COMPLETED",
  body: CORPO,
  repository: { name: SSACE },
  labels: { nodes: [{ name: "leva-3" }, { name: "chefe:frontend" }] },
  assignees: { nodes: [{ login: "fulana" }] },
  timelineItems: { nodes: [{ createdAt: "2026-10-18T12:00:00Z", assignee: { login: "fulana" } }] },
  closedByPullRequestsReferences: { nodes: [{ createdAt: "2026-10-19T12:00:00Z", author: { login: "fulana" } }] },
  ...extra,
});

/** Finge o GitHub GraphQL: os projetos, a busca de issues e de PRs e as pessoas. */
function fingir({ issues = [issue(1)], paginas = 1, pessoasFalha = false }: { issues?: IssueFeita[]; paginas?: number; pessoasFalha?: boolean } = {}) {
  const consultas: { nome: string; variaveis: Record<string, unknown> }[] = [];
  vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
    if (String(entrada) !== "https://api.github.com/graphql") return new Response("inesperado", { status: 500 });
    const { query, variables } = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
    const nome = /query (\w+)/.exec(query)?.[1] ?? "?";
    consultas.push({ nome, variaveis: variables });
    if (nome === "Projetos") {
      const repo = (name: string, topico: boolean) => ({ name, description: null, url: `https://github.com/sakura-corp/${name}`, isArchived: false, repositoryTopics: { nodes: topico ? [{ topic: { name: "projeto-secundario" } }] : [] } });
      return Response.json({ data: { organization: { repositories: { totalCount: 3, nodes: [repo("ar", true), repo("financeiro", false), repo(SSACE, false)] } } } });
    }
    if (nome === "TarefasFeitas") {
      const vez = consultas.filter((c) => c.nome === "TarefasFeitas").length;
      return Response.json({ data: { search: { pageInfo: { hasNextPage: vez < paginas, endCursor: `c${vez}` }, nodes: vez === 1 ? issues : [] } } });
    }
    if (nome === "PrsMesclados") {
      return Response.json({ data: { search: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [{ number: 50, mergedAt: "2026-10-19T15:00:00Z", repository: { name: SSACE } }, { number: 7, mergedAt: "2026-10-19T15:00:00Z", repository: { name: "financeiro" } }] } } });
    }
    if (nome === "Pessoas") {
      if (pessoasFalha) return new Response("fora", { status: 502 });
      return Response.json({ data: { organization: { membersWithRole: { nodes: [{ login: "Sofia" }, { login: "tiago" }, { login: "fulana" }] } } } });
    }
    return new Response("inesperado", { status: 500 });
  });
  return consultas;
}

afterEach(() => vi.unstubAllGlobals());

describe("/api/meu-progresso: quem vê o quê (#734)", () => {
  it("sem sessão: 401", async () => {
    fingir();
    expect((await pedir("/api/meu-progresso")).status).toBe(401);
  });

  it("uma pessoa pedindo os números de outra recebe recusa, sem nenhuma consulta ao GitHub", async () => {
    const consultas = fingir();
    const r = await pedir("/api/meu-progresso?pessoa=tiago", "fulana");
    expect(r.status).toBe(403);
    const corpo = await r.json();
    expect(corpo).toEqual({ ok: false, erro: "cada pessoa vê só o próprio progresso" });
    expect(consultas).toEqual([]);
  });

  it("a pessoa vê o seu (sem `pessoa`, ou com o próprio login), e nunca a lista de pessoas", async () => {
    for (const caminho of ["/api/meu-progresso", "/api/meu-progresso?pessoa=FULANA"]) {
      const consultas = fingir();
      const r = await pedir(caminho, "fulana");
      expect(r.status).toBe(200);
      const corpo = await r.json();
      expect(corpo.login).toBe("fulana");
      expect(corpo.pessoas).toBeUndefined();
      expect(consultas.map((c) => c.nome)).not.toContain("Pessoas");
      expect(consultas.find((c) => c.nome === "TarefasFeitas")?.variaveis.busca).toBe("org:sakura-corp is:issue is:closed assignee:fulana");
      expect(consultas.find((c) => c.nome === "PrsMesclados")?.variaveis.busca).toBe("org:sakura-corp is:pr is:merged author:fulana");
    }
  });

  it("a Sofia vê o de qualquer pessoa, escolhendo, e recebe a lista de pessoas", async () => {
    const consultas = fingir();
    const r = await pedir("/api/meu-progresso?pessoa=tiago", "sofia");
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.login).toBe("tiago");
    expect(corpo.pessoas).toEqual(["fulana", "Sofia", "tiago"]);
    expect(consultas.find((c) => c.nome === "TarefasFeitas")?.variaveis.busca).toContain("assignee:tiago");
  });

  it("se a lista de pessoas falhar, a Sofia ainda vê os números (com a lista vazia)", async () => {
    fingir({ pessoasFalha: true });
    const corpo = await (await pedir("/api/meu-progresso", "sofia")).json();
    expect(corpo.login).toBe("sofia");
    expect(corpo.pessoas).toEqual([]);
  });

  it("sem a dona configurada, ninguém vê o de outra pessoa (falha fechada)", async () => {
    const consultas = fingir();
    const env = { ...ambiente, DONA_DO_FINANCEIRO: "" };
    expect((await pedir("/api/meu-progresso?pessoa=tiago", "sofia", { env })).status).toBe(403);
    expect(consultas).toEqual([]);
  });

  it("login inválido: 400, e nada vai pra busca", async () => {
    const consultas = fingir();
    for (const p of ["a%20b", "x%22y", "-tiago", "a".repeat(40)]) {
      expect((await pedir(`/api/meu-progresso?pessoa=${p}`, "sofia")).status).toBe(400);
    }
    expect(consultas).toEqual([]);
  });

  it("só GET", async () => {
    fingir();
    expect((await pedir("/api/meu-progresso", "fulana", { method: "POST" })).status).toBe(405);
  });

  it("o texto da issue nunca sai do worker", async () => {
    fingir();
    const texto = await (await pedir("/api/meu-progresso", "fulana")).text();
    expect(texto).not.toContain("MARCADOR_DO_CORPO_734");
    expect(texto).not.toContain("ghu_");
  });

  it("os PRs só dos projetos (o SSACE e os com o tópico)", async () => {
    fingir();
    const corpo = await (await pedir("/api/meu-progresso", "fulana")).json();
    expect(corpo.prs).toEqual([{ repositorio: SSACE, numero: 50, mescladoEm: "2026-10-19T15:00:00Z" }]);
  });

  it("mais páginas do que o limite: cortada", async () => {
    const consultas = fingir({ paginas: 99 });
    const corpo = await (await pedir("/api/meu-progresso", "fulana")).json();
    expect(corpo.cortada).toBe(true);
    expect(consultas.filter((c) => c.nome === "TarefasFeitas")).toHaveLength(LIMITE_DE_PAGINAS);
  });
});

describe("quemVer e loginValido", () => {
  it("regras", () => {
    expect(quemVer("fulana", null, "sofia")).toEqual({ tipo: "ok", login: "fulana", dona: false });
    expect(quemVer("fulana", "", "sofia")).toEqual({ tipo: "ok", login: "fulana", dona: false });
    expect(quemVer("fulana", "tiago", "sofia")).toEqual({ tipo: "recusado" });
    expect(quemVer("fulana", "tiago", undefined)).toEqual({ tipo: "recusado" });
    expect(quemVer("SOFIA", "tiago", "sofia")).toEqual({ tipo: "ok", login: "tiago", dona: true });
    expect(quemVer("sofia", "a b", "sofia")).toEqual({ tipo: "invalido" });
    expect(loginValido("caranovavidanova")).toBe(true);
    expect(loginValido("a-b")).toBe(true);
    expect(loginValido("a--b")).toBe(false);
    expect(loginValido("a-")).toBe(false);
  });
});

describe("tarefasDosDados", () => {
  const projetos = new Set([SSACE, "ar"]);
  it("só feita (concluída), com leva, no nome da pessoa, de um projeto; com estimativa, chefe, pegou e PR", () => {
    const tarefas = tarefasDosDados(
      [
        issue(1),
        issue(2, { stateReason: "NOT_PLANNED" }),
        issue(3, { labels: { nodes: [{ name: "chefe:frontend" }] } }),
        issue(4, { repository: { name: "financeiro" } }),
        issue(5, { assignees: { nodes: [{ login: "tiago" }] } }),
        issue(6, { repository: { name: "ar" }, body: null, url: "https://evil.example/x" }),
        null,
      ],
      "Fulana",
      projetos,
    );
    expect(tarefas).toEqual([
      { repositorio: SSACE, numero: 1, titulo: "Tarefa 1", url: `https://github.com/sakura-corp/${SSACE}/issues/1`, feitaEm: "2026-10-20T15:00:00Z", estimativaHoras: 3, chefe: "frontend", pegouEm: "2026-10-18T12:00:00Z", prAbertoEm: "2026-10-19T12:00:00Z" },
      { repositorio: "ar", numero: 6, titulo: "Tarefa 6", url: "https://github.com/sakura-corp/ar/issues/6", feitaEm: "2026-10-20T15:00:00Z", chefe: "frontend", pegouEm: "2026-10-18T12:00:00Z", prAbertoEm: "2026-10-19T12:00:00Z" },
    ]);
  });

  it("o pegou é a última atribuição a ela antes do primeiro PR; o PR é o primeiro aberto", () => {
    const [t] = tarefasDosDados(
      [
        issue(1, {
          timelineItems: {
            nodes: [
              { createdAt: "2026-10-10T12:00:00Z", assignee: { login: "fulana" } },
              { createdAt: "2026-10-12T12:00:00Z", assignee: { login: "tiago" } },
              { createdAt: "2026-10-15T12:00:00Z", assignee: { login: "fulana" } },
              { createdAt: "2026-10-30T12:00:00Z", assignee: { login: "fulana" } },
              {},
            ],
          },
          closedByPullRequestsReferences: { nodes: [{ createdAt: "2026-10-19T12:00:00Z", author: { login: "fulana" } }, { createdAt: "2026-10-17T12:00:00Z", author: { login: "Fulana" } }, null] },
        }),
      ],
      "fulana",
      projetos,
    );
    expect(t.pegouEm).toBe("2026-10-15T12:00:00Z");
    expect(t.prAbertoEm).toBe("2026-10-17T12:00:00Z");
  });

  it("o PR de outra pessoa (ex.: aberto e largado antes) não conta no estimado × real", () => {
    const [t] = tarefasDosDados(
      [
        issue(1, {
          timelineItems: { nodes: [{ createdAt: "2026-10-05T12:00:00Z", assignee: { login: "tiago" } }, { createdAt: "2026-10-15T12:00:00Z", assignee: { login: "fulana" } }] },
          closedByPullRequestsReferences: { nodes: [{ createdAt: "2026-10-06T12:00:00Z", author: { login: "tiago" } }, { createdAt: "2026-10-17T12:00:00Z", author: { login: "fulana" } }] },
        }),
      ],
      "fulana",
      projetos,
    );
    expect(t.pegouEm).toBe("2026-10-15T12:00:00Z");
    expect(t.prAbertoEm).toBe("2026-10-17T12:00:00Z");
  });

  it("a mesma tarefa vinda duas vezes da busca conta uma vez só", () => {
    expect(tarefasDosDados([issue(1), issue(1)], "fulana", projetos)).toHaveLength(1);
  });

  it("sem PR, o pegou é a última atribuição a ela", () => {
    const [t] = tarefasDosDados([issue(1, { closedByPullRequestsReferences: { nodes: [] } })], "fulana", projetos);
    expect(t.pegouEm).toBe("2026-10-18T12:00:00Z");
    expect(t.prAbertoEm).toBeUndefined();
  });

  it("prsDosDados: só os projetos, sem repetir", () => {
    const n = { number: 1, mergedAt: "2026-10-19T15:00:00Z", repository: { name: SSACE } };
    expect(prsDosDados([n, n, { ...n, repository: { name: "x" } }, null, { ...n, number: 2, mergedAt: null }], projetos)).toEqual([{ repositorio: SSACE, numero: 1, mescladoEm: n.mergedAt }]);
  });
});

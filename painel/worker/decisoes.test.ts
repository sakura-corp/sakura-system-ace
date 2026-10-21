import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, type Sessao } from "./sessao";
import { CONSULTA_DAS_DECISOES, MAXIMO_DE_DECISOES, decisoesDosDados, type DadosDasDecisoes } from "./decisoes";

type No = NonNullable<NonNullable<NonNullable<DadosDasDecisoes["repository"]>["issues"]>["nodes"]>[number];

const issue = (number: number, createdAt: string, title = `Decisão ${number}`): No => ({
  number,
  title,
  url: `https://github.com/sakura-corp/sakura-system-ace/issues/${number}`,
  createdAt,
});
const dados = (nodes: (No | null)[], totalCount = nodes.length): DadosDasDecisoes => ({ repository: { issues: { totalCount, nodes } } });

describe("a consulta das decisões (#648)", () => {
  it("pede as abertas com a etiqueta sofia, no máximo 100, da mais antiga pra mais nova", () => {
    expect(MAXIMO_DE_DECISOES).toBe(100);
    expect(CONSULTA_DAS_DECISOES).toContain("states: OPEN");
    expect(CONSULTA_DAS_DECISOES).toContain('labels: ["sofia"]');
    expect(CONSULTA_DAS_DECISOES).toContain("first: 100");
    expect(CONSULTA_DAS_DECISOES).toContain("direction: ASC");
    expect(CONSULTA_DAS_DECISOES).toContain("totalCount");
  });
});

describe("decisoesDosDados (#648)", () => {
  it("a mais antiga em cima, mesmo com os dados fora de ordem; empate: o número menor primeiro", () => {
    const r = decisoesDosDados(
      dados([issue(30, "2026-10-15T10:00:00Z"), issue(10, "2026-09-01T10:00:00Z"), issue(21, "2026-10-01T10:00:00Z"), issue(20, "2026-10-01T10:00:00Z")]),
    );
    expect(r.decisoes.map((d) => d.numero)).toEqual([10, 20, 21, 30]);
    expect(r.total).toBe(4);
  });

  it("devolve número, título, link e a data de abertura", () => {
    const r = decisoesDosDados(dados([issue(7, "2026-10-01T10:00:00Z", "Até 26/10 decidir")]));
    expect(r.decisoes).toEqual([{ numero: 7, titulo: "Até 26/10 decidir", url: "https://github.com/sakura-corp/sakura-system-ace/issues/7", abertaEm: "2026-10-01T10:00:00Z" }]);
    expect(r.maisDoQueCabe).toBeUndefined();
  });

  it("nó nulo ou sem número, título ou data válidos é ignorado", () => {
    const ruins = [
      null,
      { number: 1, title: "sem data", url: "x" },
      { number: 2, title: "data ruim", createdAt: "ontem" },
      { number: 3, createdAt: "2026-10-01T10:00:00Z" },
      { number: 4, title: "   ", createdAt: "2026-10-01T10:00:00Z" },
      { title: "sem número", createdAt: "2026-10-01T10:00:00Z" },
      { number: "5", title: "número texto", createdAt: "2026-10-01T10:00:00Z" },
    ] as unknown as No[];
    const r = decisoesDosDados(dados([...ruins, issue(9, "2026-10-02T10:00:00Z")]));
    expect(r.decisoes.map((d) => d.numero)).toEqual([9]);
  });

  it("link fora da sakura-corp some, e a decisão continua na lista", () => {
    const r = decisoesDosDados(dados([{ ...issue(5, "2026-10-01T10:00:00Z"), url: "https://exemplo.com/issues/5" }]));
    expect(r.decisoes).toHaveLength(1);
    expect(r.decisoes[0].url).toBeUndefined();
    expect("url" in r.decisoes[0]).toBe(false);
  });

  it("maisDoQueCabe só quando o total passa do que veio", () => {
    expect(decisoesDosDados(dados([issue(1, "2026-10-01T10:00:00Z")], 150))).toMatchObject({ total: 150, maisDoQueCabe: true });
    expect(decisoesDosDados(dados([issue(1, "2026-10-01T10:00:00Z")], 1)).maisDoQueCabe).toBeUndefined();
    // Um nó estragado descartado não acende o aviso: nada ficou de fora da consulta.
    expect(decisoesDosDados(dados([issue(1, "2026-10-01T10:00:00Z"), null, issue(2, "2026-10-02T10:00:00Z")], 3)).maisDoQueCabe).toBeUndefined();
  });

  it("tudo null do GitHub: lista vazia, sem quebrar", () => {
    expect(decisoesDosDados({ repository: null })).toEqual({ decisoes: [], total: 0 });
    expect(decisoesDosDados({ repository: { issues: null } })).toEqual({ decisoes: [], total: 0 });
    expect(decisoesDosDados({ repository: { issues: { totalCount: 0, nodes: null } } })).toEqual({ decisoes: [], total: 0 });
  });
});

// ---- A rota /api/decisoes ----
const CHAVE = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres-0123456789";
const ambiente: Ambiente = {
  ASSETS: { fetch: async () => new Response("página", { status: 200 }) },
  GITHUB_APP_CLIENT_ID: "Iv-teste",
  GITHUB_APP_CLIENT_SECRET: "segredo-de-teste",
  CHAVE_DA_SESSAO: CHAVE,
};
const sessao: Sessao = { token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login: "fulana", avatar: "", entrouEm: Date.now() - 60_000 };
const pedir = async (caminho: string, { method = "GET", logado = true } = {}) =>
  worker.fetch(
    new Request(`https://painel.exemplo${caminho}`, { method, headers: logado ? { cookie: `sessao=${await cifrarSessao(sessao, CHAVE)}` } : undefined }),
    ambiente,
  );

function fingirGraphQL(resposta: () => Response) {
  const consultas: { texto: string; variaveis: Record<string, unknown>; autorizacao: string | null }[] = [];
  vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
    if (String(entrada) !== "https://api.github.com/graphql") return new Response("inesperado", { status: 500 });
    const corpo = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
    consultas.push({ texto: corpo.query, variaveis: corpo.variables, autorizacao: new Headers(init?.headers).get("authorization") });
    return resposta();
  });
  return consultas;
}

afterEach(() => vi.unstubAllGlobals());

describe("/api/decisoes (#648)", () => {
  it("sem sessão: 401, sem perguntar ao GitHub; outro método: 405", async () => {
    const consultas = fingirGraphQL(() => Response.json({}));
    expect((await pedir("/api/decisoes", { logado: false })).status).toBe(401);
    expect((await pedir("/api/decisoes", { method: "POST" })).status).toBe(405);
    expect(consultas).toEqual([]);
  });

  it("só esse caminho: /api/decisoes/ e /api/decisoes/1 não existem", async () => {
    const consultas = fingirGraphQL(() => Response.json({}));
    expect((await pedir("/api/decisoes/")).status).toBe(404);
    expect((await pedir("/api/decisoes/1")).status).toBe(404);
    expect(consultas).toEqual([]);
  });

  it("pede a consulta com o token da sessão e devolve a lista ordenada, sem cache", async () => {
    const consultas = fingirGraphQL(() => Response.json({ data: dados([issue(20, "2026-10-10T10:00:00Z"), issue(10, "2026-09-01T10:00:00Z")]) }));
    const r = await pedir("/api/decisoes");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const texto = await r.text();
    expect(texto).not.toContain("ghu_");
    const corpo = JSON.parse(texto) as ReturnType<typeof decisoesDosDados>;
    expect(corpo.decisoes.map((d) => d.numero)).toEqual([10, 20]);
    expect(corpo.total).toBe(2);
    expect(consultas).toHaveLength(1);
    expect(consultas[0].texto).toBe(CONSULTA_DAS_DECISOES);
    expect(consultas[0].autorizacao).toBe("Bearer ghu_a");
    expect(consultas[0].variaveis).toEqual({ dono: "sakura-corp", nome: "sakura-system-ace" });
  });

  it("cada variável declarada na consulta é usada nela", () => {
    const declaradas = [...CONSULTA_DAS_DECISOES.matchAll(/\$(\w+): String!/g)].map((m) => m[1]).sort();
    for (const v of declaradas) expect(CONSULTA_DAS_DECISOES.split(`$${v}`).length - 1, v).toBeGreaterThanOrEqual(2);
    expect(declaradas).toEqual(["dono", "nome"]);
  });

  it("o GitHub fora do ar: 502; token recusado: 401", async () => {
    fingirGraphQL(() => new Response("fora", { status: 503 }));
    expect((await pedir("/api/decisoes")).status).toBe(502);
    fingirGraphQL(() => new Response("", { status: 401 }));
    expect((await pedir("/api/decisoes")).status).toBe(401);
  });
});

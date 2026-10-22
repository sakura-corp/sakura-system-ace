import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, type Sessao } from "./sessao";
import { CONSULTA_DAS_DECISOES, MAXIMO_DE_DECISOES, REPOSITORIO_DAS_PROPOSTAS, decisoesDosDados, type DadosDasDecisoes } from "./decisoes";

type No = NonNullable<NonNullable<NonNullable<DadosDasDecisoes["repository"]>["issues"]>["nodes"]>[number];

const issue = (number: number, createdAt: string, title = `Decisão ${number}`): No => ({
  number,
  title,
  url: `https://github.com/sakura-corp/sakura-system-ace/issues/${number}`,
  createdAt,
});
const dados = (nodes: (No | null)[], totalCount = nodes.length, propostas: (No | null)[] = [], totalDePropostas = propostas.length): DadosDasDecisoes => ({
  repository: { issues: { totalCount, nodes } },
  propostas: { issues: { totalCount: totalDePropostas, nodes: propostas } },
});
const proposta = (number: number, createdAt: string, title = `Proposta ${number}`): No => ({
  number,
  title,
  url: `https://github.com/sakura-corp/${REPOSITORIO_DAS_PROPOSTAS}/issues/${number}`,
  createdAt,
});

describe("a consulta das decisões (#648)", () => {
  it("pede as abertas com a etiqueta sofia, no máximo 100, da mais antiga pra mais nova", () => {
    expect(MAXIMO_DE_DECISOES).toBe(100);
    expect(CONSULTA_DAS_DECISOES).toContain("states: OPEN");
    expect(CONSULTA_DAS_DECISOES).toContain('labels: ["sofia"]');
    expect(CONSULTA_DAS_DECISOES).toContain("first: 100");
    expect(CONSULTA_DAS_DECISOES).toContain("direction: ASC");
    expect(CONSULTA_DAS_DECISOES).toContain("totalCount");
  });

  it("no mesmo pedido, as propostas abertas do secundarios com a etiqueta proposta:esperando-sofia (#732)", () => {
    expect(REPOSITORIO_DAS_PROPOSTAS).toBe("secundarios");
    expect(CONSULTA_DAS_DECISOES).toContain('propostas: repository(owner: $dono, name: "secundarios")');
    expect(CONSULTA_DAS_DECISOES).toContain('labels: ["proposta:esperando-sofia"]');
    // As duas listas: abertas, no máximo 100 cada, da mais antiga pra mais nova.
    expect(CONSULTA_DAS_DECISOES.match(/issues\(states: OPEN, labels: \[[^\]]+\], first: 100, orderBy: \{ field: CREATED_AT, direction: ASC \}\)/g)).toHaveLength(2);
  });
});

describe("as propostas esperando a Sofia (#732)", () => {
  it("entram na lista com a marca de proposta, na ordem por data junto das decisões", () => {
    const r = decisoesDosDados(
      dados([issue(30, "2026-10-15T10:00:00Z"), issue(10, "2026-09-01T10:00:00Z")], 2, [proposta(3, "2026-10-20T10:00:00Z"), proposta(1, "2026-10-01T10:00:00Z")]),
    );
    expect(r.decisoes.map((d) => [d.proposta === true ? "p" : "d", d.numero])).toEqual([["d", 10], ["p", 1], ["d", 30], ["p", 3]]);
    expect(r.decisoes[1]).toEqual({ numero: 1, titulo: "Proposta 1", url: "https://github.com/sakura-corp/secundarios/issues/1", abertaEm: "2026-10-01T10:00:00Z", proposta: true });
    expect("proposta" in r.decisoes[0]).toBe(false);
    expect(r.total).toBe(4);
    expect(r.propostasFora).toBeUndefined();
  });

  it("empate na data: a decisão antes da proposta, depois o número", () => {
    const r = decisoesDosDados(dados([issue(9, "2026-10-01T10:00:00Z")], 1, [proposta(2, "2026-10-01T10:00:00Z")]));
    expect(r.decisoes.map((d) => d.proposta === true)).toEqual([false, true]);
  });

  it("o mesmo número nos dois repositórios: as duas aparecem", () => {
    const r = decisoesDosDados(dados([issue(5, "2026-10-01T10:00:00Z")], 1, [proposta(5, "2026-10-02T10:00:00Z")]));
    expect(r.decisoes).toHaveLength(2);
  });

  it("proposta estragada é ignorada; link fora da sakura-corp some", () => {
    const r = decisoesDosDados(dados([], 0, [null, { number: 1, title: " ", createdAt: "2026-10-01T10:00:00Z" }, { ...proposta(2, "2026-10-01T10:00:00Z"), url: "https://exemplo.com/2" }], 3));
    expect(r.decisoes).toEqual([{ numero: 2, titulo: "Proposta 2", abertaEm: "2026-10-01T10:00:00Z", proposta: true }]);
  });

  it("sem o repositório (ou o login não lê): as decisões de hoje continuam, e o aviso acende", () => {
    const sem: DadosDasDecisoes = { repository: { issues: { totalCount: 1, nodes: [issue(7, "2026-10-01T10:00:00Z")] } }, propostas: null };
    const r = decisoesDosDados(sem);
    expect(r.decisoes.map((d) => d.numero)).toEqual([7]);
    expect(r.total).toBe(1);
    expect(r.propostasFora).toBe(true);
    // A chave nem veio: também é aviso (não dá pra dizer que não tem proposta).
    expect(decisoesDosDados({ repository: { issues: { totalCount: 0, nodes: [] } } }).propostasFora).toBe(true);
  });

  it("maisDoQueCabe também quando as propostas passam do que coube", () => {
    expect(decisoesDosDados(dados([], 0, [proposta(1, "2026-10-01T10:00:00Z")], 120))).toMatchObject({ total: 120, maisDoQueCabe: true });
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
    const vazias = { issues: { totalCount: 0, nodes: [] } };
    expect(decisoesDosDados({ repository: null, propostas: vazias })).toEqual({ decisoes: [], total: 0 });
    expect(decisoesDosDados({ repository: { issues: null }, propostas: vazias })).toEqual({ decisoes: [], total: 0 });
    expect(decisoesDosDados({ repository: { issues: { totalCount: 0, nodes: null } }, propostas: { issues: null } })).toEqual({ decisoes: [], total: 0 });
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

  it("o secundarios não existe: o GitHub manda só essa parte nula (com erro), e a rota devolve as decisões e o aviso (#732)", async () => {
    fingirGraphQL(() =>
      Response.json({
        data: { repository: { issues: { totalCount: 1, nodes: [issue(7, "2026-10-01T10:00:00Z")] } }, propostas: null },
        errors: [{ type: "NOT_FOUND", path: ["propostas"], message: "Could not resolve to a Repository with the name 'sakura-corp/secundarios'." }],
      }),
    );
    const r = await pedir("/api/decisoes");
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(texto).not.toContain("Could not resolve");
    const corpo = JSON.parse(texto) as ReturnType<typeof decisoesDosDados>;
    expect(corpo.decisoes.map((d) => d.numero)).toEqual([7]);
    expect(corpo.propostasFora).toBe(true);
  });

  it("o GitHub fora do ar: 502; token recusado: 401", async () => {
    fingirGraphQL(() => new Response("fora", { status: 503 }));
    expect((await pedir("/api/decisoes")).status).toBe(502);
    fingirGraphQL(() => new Response("", { status: 401 }));
    expect((await pedir("/api/decisoes")).status).toBe(401);
  });
});

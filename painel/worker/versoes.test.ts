import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, type Sessao } from "./sessao";
import { CONSULTA_DAS_VERSOES, QUANTAS_VERSOES, variaveisDasVersoes, versoesDosDados, type DadosDasVersoes } from "./versoes";

type No = NonNullable<NonNullable<NonNullable<DadosDasVersoes["repository"]>["releases"]>["nodes"]>[number];

const release = (tagName: string, publishedAt: string, { isPrerelease = true, isLatest = false, isDraft = false } = {}): No => ({
  tagName,
  url: `https://github.com/sakura-corp/ssace-versoes/releases/tag/${tagName}`,
  isPrerelease,
  isDraft,
  isLatest,
  publishedAt,
  createdAt: publishedAt,
});
const dados = (nodes: (No | null)[] | null, latestRelease: No | null = null): DadosDasVersoes => ({ repository: { releases: { nodes }, latestRelease } });

describe("a consulta das versões (#649)", () => {
  it("lê as releases do ssace-versoes da sakura-corp, a mais nova primeiro, com as marcas de teste e de liberada", () => {
    expect(variaveisDasVersoes).toEqual({ dono: "sakura-corp", nome: "ssace-versoes" });
    expect(QUANTAS_VERSOES).toBe(20);
    expect(CONSULTA_DAS_VERSOES).toContain("releases(");
    expect(CONSULTA_DAS_VERSOES).toContain("direction: DESC");
    expect(CONSULTA_DAS_VERSOES).toContain("latestRelease");
    for (const campo of ["tagName", "url", "isPrerelease", "isDraft", "isLatest", "publishedAt"]) expect(CONSULTA_DAS_VERSOES).toContain(campo);
  });

  it("cada variável declarada na consulta é usada nela", () => {
    const declaradas = [...CONSULTA_DAS_VERSOES.matchAll(/\$(\w+): String!/g)].map((m) => m[1]).sort();
    for (const v of declaradas) expect(CONSULTA_DAS_VERSOES.split(`$${v}`).length - 1, v).toBeGreaterThanOrEqual(2);
    expect(declaradas).toEqual(["dono", "nome"]);
  });
});

describe("versoesDosDados (#649)", () => {
  it("canal de teste = pré-lançamento; liberada = sem a marca; a que o GitHub dá como a mais recente é a das lojas", () => {
    const r = versoesDosDados(
      dados([
        release("v0.9.60", "2026-10-20T10:00:00Z"),
        release("v0.9.59", "2026-10-15T10:00:00Z", { isPrerelease: false, isLatest: true }),
        release("v0.9.58", "2026-10-10T10:00:00Z", { isPrerelease: false }),
      ]),
    );
    expect(r).toEqual({
      versoes: [
        { versao: "v0.9.60", canal: "teste", publicadaEm: "2026-10-20T10:00:00Z", url: "https://github.com/sakura-corp/ssace-versoes/releases/tag/v0.9.60" },
        { versao: "v0.9.59", canal: "liberada", nasLojas: true, publicadaEm: "2026-10-15T10:00:00Z", url: "https://github.com/sakura-corp/ssace-versoes/releases/tag/v0.9.59" },
        { versao: "v0.9.58", canal: "liberada", publicadaEm: "2026-10-10T10:00:00Z", url: "https://github.com/sakura-corp/ssace-versoes/releases/tag/v0.9.58" },
      ],
    });
  });

  it("a mais nova em cima pelo número da versão (0.9.100 depois de 0.9.99), mesmo com o GitHub fora de ordem", () => {
    const r = versoesDosDados(
      dados([
        release("v0.9.99", "2026-10-20T10:00:00Z"),
        release("v0.9.100", "2026-10-19T10:00:00Z"),
        release("v0.10.0", "2026-10-01T10:00:00Z"),
        release("v1.0.0", "2026-09-01T10:00:00Z"),
      ]),
    );
    expect(r.versoes.map((v) => v.versao)).toEqual(["v1.0.0", "v0.10.0", "v0.9.100", "v0.9.99"]);
  });

  it("tag fora do formato vai pra baixo das numeradas, a mais nova primeiro pela data", () => {
    const r = versoesDosDados(
      dados([release("teste-velho", "2026-09-01T10:00:00Z"), release("v0.9.1", "2026-01-01T10:00:00Z"), release("teste-novo", "2026-10-01T10:00:00Z")]),
    );
    expect(r.versoes.map((v) => v.versao)).toEqual(["v0.9.1", "teste-novo", "teste-velho"]);
  });

  it("no máximo 20, as mais novas", () => {
    const nos = Array.from({ length: 25 }, (_, i) => release(`v0.9.${i + 1}`, `2026-09-${String(i + 1).padStart(2, "0")}T10:00:00Z`));
    const r = versoesDosDados(dados(nos));
    expect(r.versoes).toHaveLength(20);
    expect(r.versoes[0].versao).toBe("v0.9.25");
    expect(r.versoes[19].versao).toBe("v0.9.6");
  });

  it("rascunho nunca aparece (ainda não é versão)", () => {
    const r = versoesDosDados(dados([release("v0.9.61", "2026-10-21T10:00:00Z", { isDraft: true }), release("v0.9.60", "2026-10-20T10:00:00Z")]));
    expect(r.versoes.map((v) => v.versao)).toEqual(["v0.9.60"]);
  });

  it("pré-lançamento nunca é 'nas lojas', mesmo se o GitHub disser que é a mais recente", () => {
    const r = versoesDosDados(dados([release("v0.9.60", "2026-10-20T10:00:00Z", { isLatest: true })]));
    expect(r.versoes[0]).toMatchObject({ canal: "teste" });
    expect("nasLojas" in r.versoes[0]).toBe(false);
  });

  it("só uma é 'nas lojas': se vierem duas, fica a de número maior", () => {
    const r = versoesDosDados(
      dados([
        release("v0.9.58", "2026-10-10T10:00:00Z", { isPrerelease: false, isLatest: true }),
        release("v0.9.59", "2026-10-15T10:00:00Z", { isPrerelease: false, isLatest: true }),
      ]),
    );
    expect(r.versoes.filter((v) => v.nasLojas).map((v) => v.versao)).toEqual(["v0.9.59"]);
  });

  it("sem publishedAt usa a data de criação; nó nulo, sem tag ou sem data válida é ignorado", () => {
    const ruins = [
      null,
      { ...release("", "2026-10-01T10:00:00Z") },
      { ...release("v0.9.2", "ontem"), createdAt: "ontem" },
      { tagName: "v0.9.3", isPrerelease: true },
      { ...release("v0.9.4", "2026-10-01T10:00:00Z"), isPrerelease: "sim" },
    ] as unknown as No[];
    const semPublicacao = { ...release("v0.9.5", "2026-10-02T10:00:00Z"), publishedAt: null };
    const r = versoesDosDados(dados([...ruins, semPublicacao]));
    expect(r.versoes.map((v) => [v.versao, v.publicadaEm])).toEqual([["v0.9.5", "2026-10-02T10:00:00Z"]]);
  });

  it("link fora da sakura-corp some, e a versão continua na lista", () => {
    const r = versoesDosDados(dados([{ ...release("v0.9.60", "2026-10-20T10:00:00Z"), url: "https://exemplo.com/v0.9.60" }]));
    expect(r.versoes).toHaveLength(1);
    expect("url" in r.versoes[0]).toBe(false);
  });

  it("a que está nas lojas ficou fora das 20 (muita versão de teste depois, ou voltou pra uma antiga): vem à parte, nunca some", () => {
    const nos = Array.from({ length: 25 }, (_, i) => release(`v0.9.${i + 31}`, `2026-09-${String(i + 1).padStart(2, "0")}T10:00:00Z`));
    const antiga = release("v0.9.30", "2026-08-01T10:00:00Z", { isPrerelease: false, isLatest: true });
    const r = versoesDosDados(dados(nos, antiga));
    expect(r.versoes).toHaveLength(20);
    expect(r.versoes.some((v) => v.nasLojas)).toBe(false);
    expect(r.nasLojasForaDaLista).toEqual({
      versao: "v0.9.30",
      canal: "liberada",
      nasLojas: true,
      publicadaEm: "2026-08-01T10:00:00Z",
      url: "https://github.com/sakura-corp/ssace-versoes/releases/tag/v0.9.30",
    });
  });

  it("a das lojas dentro da lista não vem repetida à parte; latestRelease em teste ou estragada não vira 'nas lojas'", () => {
    const liberada = release("v0.9.59", "2026-10-15T10:00:00Z", { isPrerelease: false, isLatest: true });
    expect(versoesDosDados(dados([liberada], liberada)).nasLojasForaDaLista).toBeUndefined();
    // O GitHub não marcou isLatest no nó, mas latestRelease aponta pra ela: vale o latestRelease, sem repetir.
    const semMarca = release("v0.9.59", "2026-10-15T10:00:00Z", { isPrerelease: false });
    const r = versoesDosDados(dados([semMarca], semMarca));
    expect(r.versoes[0].nasLojas).toBe(true);
    expect(r.nasLojasForaDaLista).toBeUndefined();
    expect(versoesDosDados(dados([], release("v0.9.61", "2026-10-21T10:00:00Z"))).nasLojasForaDaLista).toBeUndefined();
    expect(versoesDosDados(dados([], { tagName: "" } as No)).nasLojasForaDaLista).toBeUndefined();
  });

  it("sem releases: lista vazia, sem quebrar", () => {
    expect(versoesDosDados(dados(null))).toEqual({ versoes: [] });
    expect(versoesDosDados({ repository: { releases: null } })).toEqual({ versoes: [] });
  });
});

// ---- A rota /api/versoes ----
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

describe("/api/versoes (#649)", () => {
  it("sem sessão: 401, sem perguntar ao GitHub; outro método: 405 (o painel só lê)", async () => {
    const consultas = fingirGraphQL(() => Response.json({}));
    expect((await pedir("/api/versoes", { logado: false })).status).toBe(401);
    expect((await pedir("/api/versoes", { method: "POST" })).status).toBe(405);
    expect(consultas).toEqual([]);
  });

  it("só esse caminho: /api/versoes/ e /api/versoes/v0.9.60 não existem", async () => {
    const consultas = fingirGraphQL(() => Response.json({}));
    expect((await pedir("/api/versoes/")).status).toBe(404);
    expect((await pedir("/api/versoes/v0.9.60")).status).toBe(404);
    expect(consultas).toEqual([]);
  });

  it("pede a consulta no ssace-versoes com o token da sessão e devolve a lista, sem cache", async () => {
    const consultas = fingirGraphQL(() =>
      Response.json({ data: dados([release("v0.9.58", "2026-10-10T10:00:00Z", { isPrerelease: false, isLatest: true }), release("v0.9.60", "2026-10-20T10:00:00Z")]) }),
    );
    const r = await pedir("/api/versoes");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const texto = await r.text();
    expect(texto).not.toContain("ghu_");
    const corpo = JSON.parse(texto) as ReturnType<typeof versoesDosDados>;
    expect(corpo.versoes.map((v) => [v.versao, v.canal])).toEqual([["v0.9.60", "teste"], ["v0.9.58", "liberada"]]);
    expect(consultas).toHaveLength(1);
    expect(consultas[0].texto).toBe(CONSULTA_DAS_VERSOES);
    expect(consultas[0].autorizacao).toBe("Bearer ghu_a");
    expect(consultas[0].variaveis).toEqual({ dono: "sakura-corp", nome: "ssace-versoes" });
  });

  it("o login não alcança o ssace-versoes (o GitHub responde o repositório como null): 502 com o motivo próprio", async () => {
    fingirGraphQL(() => Response.json({ data: { repository: null }, errors: [{ type: "NOT_FOUND", message: "Could not resolve" }] }));
    const r = await pedir("/api/versoes");
    expect(r.status).toBe(502);
    const corpo = (await r.json()) as { ok: boolean; erro: string };
    expect(corpo).toEqual({ ok: false, erro: "sem acesso às versões" });
    expect(JSON.stringify(corpo)).not.toContain("Could not resolve");
  });

  it("o GitHub fora do ar: 502 comum; token recusado: 401", async () => {
    fingirGraphQL(() => new Response("fora", { status: 503 }));
    const fora = await pedir("/api/versoes");
    expect(fora.status).toBe(502);
    expect(((await fora.json()) as { erro: string }).erro).toBe("o GitHub não respondeu");
    fingirGraphQL(() => new Response("", { status: 401 }));
    expect((await pedir("/api/versoes")).status).toBe(401);
  });
});

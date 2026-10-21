import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, type Sessao } from "./sessao";
import { CONSULTA_DO_RELATORIO, MAXIMO_DO_RELATORIO, relatorioDoCaminho, relatorioDosDados, type DadosDoRelatorio, type PrAberto } from "./relatorio";

type Repo = NonNullable<DadosDoRelatorio["repository"]>;
type No = PrAberto;

const dados = (r: Partial<Repo> = {}): DadosDoRelatorio => ({ repository: { naMain: null, prsAbertos: { nodes: [] }, ...r } });
/** Um PR aberto que mexe nos arquivos dados; `texto` é o arquivo do relatório no último commit. */
const pr = (numero: number, arquivos: [string, string][], texto: string | null = "texto do PR", url = `https://github.com/sakura-corp/sakura-system-ace/pull/${numero}`): No => ({
  number: numero,
  url,
  files: { nodes: arquivos.map(([path, changeType]) => ({ path, changeType })) },
  commits: { nodes: [{ commit: { file: texto === null ? null : { object: { text: texto, isBinary: false } } } }] },
});
const relatorio = (n: number, tipo = "ADDED"): [string, string] => [`docs/relatorios/leva-${n}.md`, tipo];

describe("relatorioDoCaminho (#647)", () => {
  it("/api/leva/3/relatorio → 3; outros caminhos → null", () => {
    expect(relatorioDoCaminho("/api/leva/3/relatorio")).toBe(3);
    expect(relatorioDoCaminho("/api/leva/12/relatorio")).toBe(12);
    for (const c of ["/api/leva/3", "/api/leva/3/testes", "/api/leva/x/relatorio", "/api/leva/3/relatorio/", "/api/leva/12345/relatorio"]) {
      expect(relatorioDoCaminho(c)).toBeNull();
    }
  });
});

describe("relatorioDosDados (#647)", () => {
  it("PR aberto com o arquivo: esperando a aprovação, com o texto do PR e o link", () => {
    const r = relatorioDosDados(2, dados({ prsAbertos: { nodes: [pr(700, [["src/a.ts", "MODIFIED"], relatorio(2)], "# Relatório 2")] } }));
    expect(r).toEqual({ numero: 2, situacao: "esperando", texto: "# Relatório 2", pr: { numero: 700, url: "https://github.com/sakura-corp/sakura-system-ace/pull/700" } });
  });

  it("arquivo na main: aprovado, com o texto da main", () => {
    const r = relatorioDosDados(2, dados({ naMain: { text: "# Aprovado", isBinary: false } }));
    expect(r).toEqual({ numero: 2, situacao: "aprovado", texto: "# Aprovado" });
  });

  it("a main ganha do PR aberto que ainda mexe no arquivo", () => {
    const r = relatorioDosDados(2, dados({ naMain: { text: "da main", isBinary: false }, prsAbertos: { nodes: [pr(701, [relatorio(2, "MODIFIED")], "do PR")] } }));
    expect(r.situacao).toBe("aprovado");
    expect(r.texto).toBe("da main");
    expect(r.pr).toBeUndefined();
  });

  it("a leva 0 é de antes das fases: sem texto, mesmo com arquivo ou PR", () => {
    expect(relatorioDosDados(0, dados())).toEqual({ numero: 0, situacao: "antes-das-fases", texto: null });
    expect(relatorioDosDados(0, dados({ naMain: { text: "x", isBinary: false }, prsAbertos: { nodes: [pr(1, [relatorio(0)])] } })).situacao).toBe("antes-das-fases");
  });

  it("sem arquivo na main e sem PR: sem relatório", () => {
    expect(relatorioDosDados(2, dados())).toEqual({ numero: 2, situacao: "sem-relatorio", texto: null });
  });

  it("PR que só apaga o arquivo não conta; PR de outra leva ou de leva-N-testes.md também não", () => {
    const nodes = [pr(1, [relatorio(2, "DELETED")]), pr(2, [relatorio(3)]), pr(3, [["docs/relatorios/leva-2-testes.md", "ADDED"]])];
    expect(relatorioDosDados(2, dados({ prsAbertos: { nodes } })).situacao).toBe("sem-relatorio");
  });

  it("vários PRs mexendo no mesmo arquivo: mostra o mais recente (o primeiro) e conta os outros", () => {
    const nodes = [pr(10, [relatorio(2)], "novo"), pr(9, [relatorio(2)], "velho"), pr(8, [relatorio(2, "DELETED")], "apagando"), pr(7, [relatorio(2, "MODIFIED")], "outro")];
    const r = relatorioDosDados(2, dados({ prsAbertos: { nodes } }));
    expect(r.pr?.numero).toBe(10);
    expect(r.texto).toBe("novo");
    expect(r.outrosPrs).toBe(2);
    expect(relatorioDosDados(2, dados({ prsAbertos: { nodes: [nodes[0]] } })).outrosPrs).toBeUndefined();
  });

  it("texto grande é cortado em 50 mil caracteres, com o aviso (na main e no PR)", () => {
    const grande = "a".repeat(MAXIMO_DO_RELATORIO + 5);
    const daMain = relatorioDosDados(2, dados({ naMain: { text: grande, isBinary: false } }));
    expect(daMain.texto).toHaveLength(MAXIMO_DO_RELATORIO);
    expect(daMain.textoCortado).toBe(true);
    const doPr = relatorioDosDados(2, dados({ prsAbertos: { nodes: [pr(5, [relatorio(2)], grande)] } }));
    expect(doPr.texto).toHaveLength(MAXIMO_DO_RELATORIO);
    expect(doPr.textoCortado).toBe(true);
    expect(relatorioDosDados(2, dados({ naMain: { text: "curto", isBinary: false } })).textoCortado).toBeUndefined();
  });

  it("link do PR fora da sakura-corp some, e o PR continua esperando", () => {
    const r = relatorioDosDados(2, dados({ prsAbertos: { nodes: [pr(5, [relatorio(2)], "x", "https://exemplo.com/pull/5")] } }));
    expect(r.situacao).toBe("esperando");
    expect(r.pr).toEqual({ numero: 5 });
  });

  it("texto do PR indisponível (binário ou sem commit): ainda está esperando, sem texto", () => {
    expect(relatorioDosDados(2, dados({ prsAbertos: { nodes: [pr(5, [relatorio(2)], null)] } })).texto).toBeNull();
    const binario: No = { ...pr(5, [relatorio(2)]), commits: { nodes: [{ commit: { file: { object: { text: null, isBinary: true } } } }] } };
    const r = relatorioDosDados(2, dados({ prsAbertos: { nodes: [binario] } }));
    expect(r).toMatchObject({ situacao: "esperando", texto: null });
    // arquivo binário na main não vira texto nem aprova
    expect(relatorioDosDados(2, dados({ naMain: { text: null, isBinary: true } })).situacao).toBe("sem-relatorio");
  });

  it("tudo null do GitHub: sem relatório, sem quebrar", () => {
    expect(relatorioDosDados(2, { repository: null }).situacao).toBe("sem-relatorio");
    expect(relatorioDosDados(2, { repository: { naMain: null, prsAbertos: null } }).situacao).toBe("sem-relatorio");
    const nulos = [null, { number: 1, url: "x", files: null, commits: null }, { number: 2, url: "x", files: { nodes: [null, { path: "docs/relatorios/leva-2.md", changeType: "ADDED" }] }, commits: { nodes: [null] } }] as No[];
    expect(relatorioDosDados(2, dados({ prsAbertos: { nodes: nulos } }))).toMatchObject({ situacao: "esperando", pr: { numero: 2 }, texto: null });
  });
});

// ---- A rota /api/leva/<n>/relatorio ----
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

describe("/api/leva/<n>/relatorio (#647)", () => {
  it("sem sessão: 401, sem perguntar ao GitHub; outro método: 405", async () => {
    const consultas = fingirGraphQL(() => Response.json({}));
    expect((await pedir("/api/leva/2/relatorio", { logado: false })).status).toBe(401);
    expect((await pedir("/api/leva/2/relatorio", { method: "POST" })).status).toBe(405);
    expect(consultas).toEqual([]);
  });

  it("pede o arquivo da main e os PRs abertos numa consulta só, com o token da sessão", async () => {
    const consultas = fingirGraphQL(() => Response.json({ data: dados({ prsAbertos: { nodes: [pr(700, [relatorio(2)], "# Relatório")] } }) }));
    const r = await pedir("/api/leva/2/relatorio");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const texto = await r.text();
    expect(texto).not.toContain("ghu_");
    expect(JSON.parse(texto)).toEqual({ numero: 2, situacao: "esperando", texto: "# Relatório", pr: { numero: 700, url: "https://github.com/sakura-corp/sakura-system-ace/pull/700" } });
    expect(consultas).toHaveLength(1);
    expect(consultas[0].texto).toBe(CONSULTA_DO_RELATORIO);
    expect(consultas[0].autorizacao).toBe("Bearer ghu_a");
    expect(consultas[0].variaveis).toEqual({ dono: "sakura-corp", nome: "sakura-system-ace", arquivo: "main:docs/relatorios/leva-2.md", caminho: "docs/relatorios/leva-2.md" });
  });

  it("a leva 0 responde sem perguntar ao GitHub", async () => {
    const consultas = fingirGraphQL(() => Response.json({}));
    const r = await pedir("/api/leva/0/relatorio");
    expect(await r.json()).toEqual({ numero: 0, situacao: "antes-das-fases", texto: null });
    expect(consultas).toEqual([]);
  });

  it("o GitHub fora do ar: 502; token recusado: 401", async () => {
    fingirGraphQL(() => new Response("fora", { status: 503 }));
    expect((await pedir("/api/leva/2/relatorio")).status).toBe(502);
    fingirGraphQL(() => new Response("", { status: 401 }));
    expect((await pedir("/api/leva/2/relatorio")).status).toBe(401);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, type Sessao } from "./sessao";
import { CONSULTA_DOS_TESTES, MAXIMO_DO_TEXTO, pessoasDaRodada, testesDoCaminho, testesDosDados, variaveisDosTestes, type DadosDosTestes } from "./testes";

const dados = (r: Partial<NonNullable<DadosDosTestes["repository"]>>): DadosDosTestes => ({
  repository: { arquivo: null, tarefas: { nodes: [] }, defeitos: { totalCount: 0, nodes: [] }, ...r },
});
const defeito = (numero: number, criadaEm: string, url = `https://github.com/sakura-corp/sakura-system-ace/issues/${numero}`) => ({
  number: numero,
  title: `Defeito ${numero}`,
  url,
  createdAt: criadaEm,
});

describe("a rodada de testes (quem já terminou)", () => {
  const corpo = [
    "Texto antes, com - [x] Ninguém (fora da seção)",
    "## Quem já terminou",
    "- [x] Gustavo (@GustavoSakuras): T1 a T16, T21 e T22",
    "- [ ] Tiago (@tigasss1): T1 a T16",
    "- [ ] Lázaro (@1oraza): T1 a T16, quando tiver acesso ao `ssace-teste`",
    "- [X] **Sofia**: T17 a T20",
    "",
    "## Quando você terminar",
    "- [ ] Marca a sua caixinha",
  ].join("\n");

  it("lê só as caixinhas da seção \"Quem já terminou\", com o nome antes do parêntese ou dos dois-pontos", () => {
    expect(pessoasDaRodada(corpo)).toEqual([
      { nome: "Gustavo", terminou: true },
      { nome: "Tiago", terminou: false },
      { nome: "Lázaro", terminou: false, semAcesso: true },
      { nome: "Sofia", terminou: true },
    ]);
  });

  it("quem ainda não entrou no banco de teste (o Send) fica \"sem acesso\"; caixinha marcada passa na frente", () => {
    const pessoas = pessoasDaRodada("## Quem já terminou\n- [ ] A: sem acesso ao banco\n- [ ] B (esperando acesso)\n- [x] C, quando tiver acesso");
    expect(pessoas).toEqual([
      { nome: "A", terminou: false, semAcesso: true },
      { nome: "B", terminou: false, semAcesso: true },
      { nome: "C, quando tiver acesso", terminou: true },
    ]);
  });

  it("acha a issue pelo título exato da leva (a busca do GitHub é aproximada)", () => {
    const issue = (n: number, title: string) => ({ number: n, title, url: `https://github.com/sakura-corp/sakura-system-ace/issues/${n}`, body: corpo });
    const r = testesDosDados(3, { ...dados({}), rodada: { nodes: [issue(1, "Leva 30: rodada de testes"), issue(728, "Leva 3: rodada de testes (quem já terminou)")] } });
    expect(r.rodada?.numero).toBe(728);
    expect(r.rodada?.url).toBe("https://github.com/sakura-corp/sakura-system-ace/issues/728");
    expect(r.rodada?.pessoas).toHaveLength(4);
    expect(testesDosDados(3, { ...dados({}), rodada: { nodes: [issue(1, "Leva 30: rodada de testes")] } }).rodada).toBeUndefined();
    expect(testesDosDados(3, dados({})).rodada).toBeUndefined();
  });

  it("a busca vai só no repositório e pelo título da leva", () => {
    expect(variaveisDosTestes(3).busca).toBe('repo:sakura-corp/sakura-system-ace is:issue in:title "Leva 3: rodada de testes"');
  });
});

describe("testesDoCaminho (#646)", () => {
  it("/api/leva/3/testes → 3; outros caminhos → null", () => {
    expect(testesDoCaminho("/api/leva/3/testes")).toBe(3);
    expect(testesDoCaminho("/api/leva/12/testes")).toBe(12);
    for (const c of ["/api/leva/3", "/api/leva/x/testes", "/api/leva/3/testes/", "/api/leva/12345/testes", "/api/leva//testes"]) {
      expect(testesDoCaminho(c)).toBeNull();
    }
  });
});

describe("testesDosDados (#646)", () => {
  it("o texto do arquivo vem como veio (a tela mostra como texto); sem arquivo: null", () => {
    const texto = "# Testes da leva 2\n\n- abrir a leva\n<script>alert(1)</script>";
    expect(testesDosDados(2, dados({ arquivo: { text: texto, isBinary: false } })).texto).toBe(texto);
    expect(testesDosDados(2, dados({ arquivo: null })).texto).toBeNull();
    // Um arquivo binário (ou o GitHub sem o texto) não vira texto.
    expect(testesDosDados(2, dados({ arquivo: { text: null, isBinary: true } })).texto).toBeNull();
  });

  it("texto grande demais é cortado, com o aviso", () => {
    const r = testesDosDados(2, dados({ arquivo: { text: "a".repeat(MAXIMO_DO_TEXTO + 10), isBinary: false } }));
    expect(r.texto).toHaveLength(MAXIMO_DO_TEXTO);
    expect(r.textoCortado).toBe(true);
    expect(testesDosDados(2, dados({ arquivo: { text: "curto", isBinary: false } })).textoCortado).toBeUndefined();
  });

  it("os defeitos: só os criados desde que a última tarefa da leva fechou (a entrada em Testando)", () => {
    const r = testesDosDados(
      2,
      dados({
        tarefas: { nodes: [{ closedAt: "2026-10-18T10:00:00Z" }, { closedAt: "2026-10-20T12:00:00Z" }, null, { closedAt: null }] },
        defeitos: { totalCount: 3, nodes: [defeito(700, "2026-10-21T09:00:00Z"), defeito(699, "2026-10-20T12:00:00Z"), defeito(650, "2026-10-19T08:00:00Z")] },
      }),
    );
    expect(r.desde).toBe("2026-10-20T12:00:00Z");
    expect(r.defeitos).toEqual([
      { numero: 700, titulo: "Defeito 700", url: "https://github.com/sakura-corp/sakura-system-ace/issues/700", criadaEm: "2026-10-21T09:00:00Z" },
      { numero: 699, titulo: "Defeito 699", url: "https://github.com/sakura-corp/sakura-system-ace/issues/699", criadaEm: "2026-10-20T12:00:00Z" },
    ]);
  });

  it("um defeito que entrou na leva e fechou não move o 'desde': os outros defeitos abertos continuam", () => {
    const r = testesDosDados(
      2,
      dados({
        tarefas: { nodes: [{ closedAt: "2026-10-22T10:00:00Z", labels: { nodes: [{ name: "leva-2" }, { name: "defeito" }] } }, { closedAt: "2026-10-20T12:00:00Z", labels: { nodes: [{ name: "leva-2" }] } }] },
        defeitos: { totalCount: 1, nodes: [defeito(702, "2026-10-21T09:00:00Z")] },
      }),
    );
    expect(r.desde).toBe("2026-10-20T12:00:00Z");
    expect(r.defeitos.map((d) => d.numero)).toEqual([702]);
  });

  it("sem tarefa fechada (não entrou em Testando): nenhum defeito", () => {
    const r = testesDosDados(2, dados({ defeitos: { totalCount: 1, nodes: [defeito(700, "2026-10-21T09:00:00Z")] } }));
    expect(r.desde).toBeNull();
    expect(r.defeitos).toEqual([]);
  });

  it("link de fora da sakura-corp não passa: o defeito aparece sem link", () => {
    const r = testesDosDados(
      2,
      dados({
        tarefas: { nodes: [{ closedAt: "2026-10-20T12:00:00Z" }] },
        defeitos: { totalCount: 1, nodes: [defeito(701, "2026-10-21T09:00:00Z", "https://exemplo.com/701")] },
      }),
    );
    expect(r.defeitos).toEqual([{ numero: 701, titulo: "Defeito 701", criadaEm: "2026-10-21T09:00:00Z" }]);
  });

  it("mais defeitos abertos do que vieram: avisa só se o mais velho que veio ainda é da leva", () => {
    const tarefas = { nodes: [{ closedAt: "2026-10-20T12:00:00Z" }] };
    expect(testesDosDados(2, dados({ tarefas, defeitos: { totalCount: 80, nodes: [defeito(700, "2026-10-21T09:00:00Z")] } })).defeitosCortados).toBe(true);
    // O mais velho que veio é de antes da leva congelar: os que ficaram de fora também são, nada da leva foi cortado.
    const antigos = { totalCount: 80, nodes: [defeito(700, "2026-10-21T09:00:00Z"), defeito(600, "2026-10-01T09:00:00Z")] };
    expect(testesDosDados(2, dados({ tarefas, defeitos: antigos })).defeitosCortados).toBeUndefined();
  });
});

// ---- A rota /api/leva/<n>/testes ----
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

describe("/api/leva/<n>/testes (#646)", () => {
  it("sem sessão: 401, sem perguntar ao GitHub; outro método: 405", async () => {
    const consultas = fingirGraphQL(() => Response.json({}));
    expect((await pedir("/api/leva/2/testes", { logado: false })).status).toBe(401);
    expect((await pedir("/api/leva/2/testes", { method: "POST" })).status).toBe(405);
    expect(consultas).toEqual([]);
  });

  it("pede o arquivo da main e os defeitos com o token da sessão, e devolve o texto e a lista", async () => {
    const consultas = fingirGraphQL(() =>
      Response.json({
        data: dados({
          arquivo: { text: "- testar o login", isBinary: false },
          tarefas: { nodes: [{ closedAt: "2026-10-20T12:00:00Z" }] },
          defeitos: { totalCount: 1, nodes: [defeito(700, "2026-10-21T09:00:00Z")] },
        }),
      }),
    );
    const r = await pedir("/api/leva/2/testes");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const texto = await r.text();
    expect(texto).not.toContain("ghu_");
    expect(JSON.parse(texto)).toEqual({
      numero: 2,
      texto: "- testar o login",
      desde: "2026-10-20T12:00:00Z",
      defeitos: [{ numero: 700, titulo: "Defeito 700", url: "https://github.com/sakura-corp/sakura-system-ace/issues/700", criadaEm: "2026-10-21T09:00:00Z" }],
    });
    expect(consultas).toHaveLength(1);
    expect(consultas[0].texto).toBe(CONSULTA_DOS_TESTES);
    expect(consultas[0].autorizacao).toBe("Bearer ghu_a");
    expect(consultas[0].variaveis).toEqual({ dono: "sakura-corp", nome: "sakura-system-ace", arquivo: "main:docs/relatorios/leva-2-testes.md", etiqueta: "leva-2", busca: variaveisDosTestes(2).busca });
  });

  it("o GitHub fora do ar: 502; token recusado: 401", async () => {
    fingirGraphQL(() => new Response("fora", { status: 503 }));
    expect((await pedir("/api/leva/2/testes")).status).toBe(502);
    fingirGraphQL(() => new Response("", { status: 401 }));
    expect((await pedir("/api/leva/2/testes")).status).toBe(401);
  });

  it("a rota /api/leva/<n> continua igual (não confunde com /testes)", async () => {
    const consultas = fingirGraphQL(() => Response.json({ data: { repository: { issues: { totalCount: 0, nodes: [] } } } }));
    const r = await pedir("/api/leva/2");
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ numero: 2, tarefas: [], cortada: false });
    expect(consultas[0].texto).not.toBe(CONSULTA_DOS_TESTES);
  });
});

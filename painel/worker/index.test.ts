import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, decifrarSessao, type Sessao } from "./sessao";

const CHAVE = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres-0123456789";
const ambiente: Ambiente = {
  ASSETS: { fetch: async () => new Response("página", { status: 200 }) },
  GITHUB_APP_CLIENT_ID: "Iv-teste",
  GITHUB_APP_CLIENT_SECRET: "segredo-de-teste",
  CHAVE_DA_SESSAO: CHAVE,
};

function pedir(caminho: string, { method = "GET", cookie, env = ambiente }: { method?: string; cookie?: string; env?: Ambiente } = {}) {
  const headers = cookie ? { cookie } : undefined;
  return worker.fetch(new Request(`https://painel.exemplo${caminho}`, { method, headers, redirect: "manual" }), env);
}

const cookies = (r: Response) => r.headers.getSetCookie();
const valorDoCookie = (r: Response, nome: string) =>
  cookies(r).find((c) => c.startsWith(`${nome}=`))?.split(";")[0].slice(nome.length + 1);

/** Finge o GitHub. `membro` decide a resposta de /orgs/sakura-corp/members/<login>. */
function fingirGitHub({ membro = "sim" as "sim" | "nao" | "erro", token = true, renova = true } = {}) {
  const chamadas: string[] = [];
  vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada);
    chamadas.push(url);
    if (url === "https://github.com/login/oauth/access_token") {
      const corpo = new URLSearchParams(String(init?.body));
      expect(corpo.get("client_secret")).toBe("segredo-de-teste");
      if (corpo.get("grant_type") === "refresh_token") {
        return Response.json(renova ? { access_token: "ghu_novo", refresh_token: "ghr_novo", expires_in: 28800 } : { error: "bad_refresh_token" });
      }
      return Response.json(token ? { access_token: "ghu_a", refresh_token: "ghr_a", expires_in: 28800 } : { error: "bad_verification_code" });
    }
    if (url === "https://api.github.com/user") return Response.json({ login: "fulana", avatar_url: "https://avatars.exemplo/f" });
    if (url === "https://api.github.com/orgs/sakura-corp/members/fulana") return new Response(null, { status: { sim: 204, nao: 404, erro: 403 }[membro] });
    return new Response("inesperado", { status: 500 });
  });
  return chamadas;
}

afterEach(() => vi.unstubAllGlobals());

describe("worker do painel", () => {
  it("/api/saude responde { ok: true }", async () => {
    const resposta = await pedir("/api/saude");
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toContain("application/json");
    expect(await resposta.json()).toEqual({ ok: true });
  });

  it("/api/saude recusa POST", async () => {
    expect((await pedir("/api/saude", { method: "POST" })).status).toBe(405);
  });

  it("outro /api/ dá 404 em JSON, e não a página", async () => {
    const resposta = await pedir("/api/nada");
    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toMatchObject({ ok: false });
  });

  it("o resto vai pra página", async () => {
    for (const caminho of ["/", "/sala", "/sala?tv", "/escritorio", "/apis"]) {
      expect(await (await pedir(caminho)).text()).toBe("página");
    }
  });
});

describe("login", () => {
  it("sem os segredos, as rotas de login dizem 503 sem detalhe", async () => {
    const env = { ASSETS: ambiente.ASSETS };
    for (const caminho of ["/api/login", "/api/eu"]) {
      const r = await pedir(caminho, { env });
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ ok: false, erro: "login não configurado" });
    }
  });

  it("/api/login manda pro GitHub com client_id, volta e state, e guarda o state num cookie curto", async () => {
    const r = await pedir("/api/login");
    expect(r.status).toBe(302);
    const destino = new URL(r.headers.get("location")!);
    expect(destino.origin + destino.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(destino.searchParams.get("client_id")).toBe("Iv-teste");
    expect(destino.searchParams.get("redirect_uri")).toBe("https://painel.exemplo/api/login/volta");
    const estado = destino.searchParams.get("state");
    expect(valorDoCookie(r, "estado_login")).toBe(estado);
    const cookie = cookies(r).find((c) => c.startsWith("estado_login="))!;
    expect(cookie).toContain("Max-Age=600");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });

  async function voltar(opcoes: Parameters<typeof fingirGitHub>[0] = {}, mexerNoState = false) {
    const chamadas = fingirGitHub(opcoes);
    const ida = await pedir("/api/login");
    const estado = valorDoCookie(ida, "estado_login")!;
    const stateNaUrl = mexerNoState ? estado.slice(0, -1) + (estado.endsWith("A") ? "B" : "A") : estado;
    const volta = await pedir(`/api/login/volta?code=c&state=${stateNaUrl}`, { cookie: `estado_login=${estado}` });
    return { volta, chamadas };
  }

  it("membro da sakura-corp: grava a sessão cifrada e volta pra /", async () => {
    const { volta } = await voltar();
    expect(volta.status).toBe(302);
    expect(volta.headers.get("location")).toBe("/");
    const valor = valorDoCookie(volta, "sessao")!;
    expect(valor).not.toContain("ghu_");
    const sessao = await decifrarSessao(valor, CHAVE);
    expect(sessao).toMatchObject({ token: "ghu_a", refresh: "ghr_a", login: "fulana", avatar: "https://avatars.exemplo/f" });
    expect(cookies(volta).some((c) => c.startsWith("estado_login=;") && c.includes("Max-Age=0"))).toBe(true);
  });

  it("GitHub sem dizer se é membro (403, limite): falha-login, e não 'não é da Sakura Corp'", async () => {
    const { volta } = await voltar({ membro: "erro" });
    expect(volta.headers.get("location")).toBe("/?erro=falha-login");
    expect(valorDoCookie(volta, "sessao")).toBeUndefined();
  });

  it("volta pra página de onde saiu (ex.: /sala?tv), e nunca pra outro site", async () => {
    fingirGitHub();
    for (const [pedido, esperado] of [["/sala?tv", "/sala?tv"], ["//mal.exemplo", "/"]]) {
      const ida = await pedir(`/api/login?volta=${encodeURIComponent(pedido)}`);
      const estado = valorDoCookie(ida, "estado_login")!;
      const volta = await pedir(`/api/login/volta?code=c&state=${estado}`, {
        cookie: `estado_login=${estado}; volta_login=${valorDoCookie(ida, "volta_login")}`,
      });
      expect(volta.headers.get("location")).toBe(esperado);
    }
  });

  it("no http://localhost os cookies saem sem Secure (o Safari recusa); no https, com", async () => {
    const local = await worker.fetch(new Request("http://localhost:8787/api/login", { redirect: "manual" }), ambiente);
    expect(local.headers.getSetCookie().every((c) => !c.includes("Secure"))).toBe(true);
    expect(cookies(await pedir("/api/login")).every((c) => c.includes("Secure"))).toBe(true);
  });

  it("quem não é membro volta com ?erro=nao-membro e sem sessão", async () => {
    const { volta } = await voltar({ membro: "nao" });
    expect(volta.headers.get("location")).toBe("/?erro=nao-membro");
    expect(valorDoCookie(volta, "sessao")).toBe("");
  });

  it("state errado: não fala com o GitHub e volta com ?erro=falha-login", async () => {
    const { volta, chamadas } = await voltar({}, true);
    expect(volta.headers.get("location")).toBe("/?erro=falha-login");
    expect(chamadas.filter((u) => u.includes("access_token"))).toEqual([]);
    expect(valorDoCookie(volta, "sessao")).toBeUndefined();
  });

  it("sem cookie de state: falha", async () => {
    fingirGitHub();
    const volta = await pedir("/api/login/volta?code=c&state=" + "a".repeat(43));
    expect(volta.headers.get("location")).toBe("/?erro=falha-login");
  });

  it("código recusado pelo GitHub: falha, sem sessão", async () => {
    const { volta } = await voltar({ token: false });
    expect(volta.headers.get("location")).toBe("/?erro=falha-login");
    expect(valorDoCookie(volta, "sessao")).toBeUndefined();
  });
});

describe("/api/eu e /api/sair", () => {
  const base: Sessao = { token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login: "fulana", avatar: "https://avatars.exemplo/f", entrouEm: Date.now() - 60_000 };
  const comSessao = async (s: Sessao) => `sessao=${await cifrarSessao(s, CHAVE)}`;

  it("sem sessão: 401", async () => {
    expect((await pedir("/api/eu")).status).toBe(401);
  });

  it("com sessão: login e foto, nunca o token", async () => {
    const r = await pedir("/api/eu", { cookie: await comSessao(base) });
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ login: "fulana", avatar: "https://avatars.exemplo/f" });
    expect(texto).not.toContain("ghu_");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("sessão adulterada: 401 e o cookie é apagado", async () => {
    const valor = (await comSessao(base)).slice(0, -3) + "AAA";
    const r = await pedir("/api/eu", { cookie: valor });
    expect(r.status).toBe(401);
    expect(valorDoCookie(r, "sessao")).toBe("");
  });

  it("token vencido: renova, confere de novo se é membro e grava o cookie novo", async () => {
    const chamadas = fingirGitHub();
    const r = await pedir("/api/eu", { cookie: await comSessao({ ...base, expiraEm: Date.now() - 1000 }) });
    expect(r.status).toBe(200);
    expect(chamadas).toContain("https://api.github.com/orgs/sakura-corp/members/fulana");
    const nova = await decifrarSessao(valorDoCookie(r, "sessao")!, CHAVE);
    expect(nova).toMatchObject({ token: "ghu_novo", refresh: "ghr_novo", login: "fulana" });
  });

  it("token vencido e o GitHub não renova (outra aba já renovou, ou fora do ar): 401, mas não apaga o cookie", async () => {
    fingirGitHub({ renova: false });
    const r = await pedir("/api/eu", { cookie: await comSessao({ ...base, expiraEm: Date.now() - 1000 }) });
    expect(r.status).toBe(401);
    expect(cookies(r)).toEqual([]);
  });

  it("renovou mas o GitHub não disse se é membro: guarda os tokens novos (o refresh antigo já foi gasto)", async () => {
    fingirGitHub({ membro: "erro" });
    const r = await pedir("/api/eu", { cookie: await comSessao({ ...base, expiraEm: Date.now() - 1000 }) });
    expect(r.status).toBe(200);
    expect(await decifrarSessao(valorDoCookie(r, "sessao")!, CHAVE)).toMatchObject({ refresh: "ghr_novo" });
  });

  it("sessão de mais de 30 dias: 401 e sessão apagada", async () => {
    const r = await pedir("/api/eu", { cookie: await comSessao({ ...base, entrouEm: Date.now() - 31 * 24 * 3_600_000 }) });
    expect(r.status).toBe(401);
    expect(valorDoCookie(r, "sessao")).toBe("");
  });

  it("token vencido de quem saiu da sakura-corp: 401 e sessão apagada", async () => {
    fingirGitHub({ membro: "nao" });
    const r = await pedir("/api/eu", { cookie: await comSessao({ ...base, expiraEm: Date.now() - 1000 }) });
    expect(r.status).toBe(401);
    expect(valorDoCookie(r, "sessao")).toBe("");
  });

  it("/api/sair apaga a sessão, e só por POST", async () => {
    expect((await pedir("/api/sair")).status).toBe(405);
    const r = await pedir("/api/sair", { method: "POST", cookie: await comSessao(base) });
    expect(r.status).toBe(200);
    expect(cookies(r).find((c) => c.startsWith("sessao="))).toContain("Max-Age=0");
  });
});

describe("/api/levas e /api/leva/<n> (#354)", () => {
  const base: Sessao = { token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login: "fulana", avatar: "", entrouEm: Date.now() - 60_000 };
  const comSessao = async (s: Sessao = base) => `sessao=${await cifrarSessao(s, CHAVE)}`;
  const issue = {
    number: 354, title: "Painel 6/8", url: "https://github.com/sakura-corp/sakura-system-ace/issues/354", state: "OPEN",
    body: "Estimativa: 5 h", assignees: { nodes: [] }, closedByPullRequestsReferences: { nodes: [] },
  };

  /** Finge o GitHub GraphQL (e a renovação do token). `resposta` decide o que o /graphql devolve. */
  function fingirGraphQL(resposta: () => Response) {
    const consultas: { autorizacao: string | null; variaveis: Record<string, unknown> }[] = [];
    let renovacoes = 0;
    vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entrada);
      if (url === "https://api.github.com/graphql") {
        const corpo = JSON.parse(String(init?.body)) as { variables: Record<string, unknown> };
        consultas.push({ autorizacao: new Headers(init?.headers).get("authorization"), variaveis: corpo.variables });
        return resposta();
      }
      if (url === "https://github.com/login/oauth/access_token") {
        renovacoes += 1;
        return Response.json({ access_token: "ghu_novo", refresh_token: "ghr_novo", expires_in: 28800 });
      }
      if (url === "https://api.github.com/orgs/sakura-corp/members/fulana") return new Response(null, { status: 204 });
      return new Response("inesperado", { status: 500 });
    });
    return { consultas, renovacoes: () => renovacoes };
  }

  it("sem sessão: 401, e não pergunta nada ao GitHub", async () => {
    const g = fingirGraphQL(() => Response.json({}));
    for (const caminho of ["/api/levas", "/api/leva/0"]) expect((await pedir(caminho)).status).toBe(401);
    expect(g.consultas).toEqual([]);
  });

  it("sem os segredos: 503; outro método: 405; leva que não é número: 404", async () => {
    expect((await pedir("/api/levas", { env: { ASSETS: ambiente.ASSETS } })).status).toBe(503);
    expect((await pedir("/api/levas", { method: "POST", cookie: await comSessao() })).status).toBe(405);
    for (const caminho of ["/api/leva/x", "/api/leva/", "/api/leva/1/2", "/api/leva/12345"]) {
      expect((await pedir(caminho, { cookie: await comSessao() })).status).toBe(404);
    }
  });

  it("/api/levas: consulta com o token da sessão e devolve as levas e a atual, sem o token", async () => {
    const g = fingirGraphQL(() => Response.json({ data: { repository: { labels: { nodes: [{ name: "leva-0", issues: { totalCount: 3 } }, { name: "bug", issues: { totalCount: 1 } }] } } } }));
    const r = await pedir("/api/levas", { cookie: await comSessao() });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ levas: [{ numero: 0, nome: "Leva 0", abertas: 3 }], atual: 0 });
    expect(texto).not.toContain("ghu_");
    expect(g.consultas[0]).toEqual({ autorizacao: "Bearer ghu_a", variaveis: { dono: "sakura-corp", nome: "sakura-system-ace" } });
  });

  it("/api/leva/0: pede a etiqueta leva-0 e devolve as tarefas no formato da página", async () => {
    const g = fingirGraphQL(() => Response.json({ data: { repository: { issues: { totalCount: 1, nodes: [issue] } } } }));
    const r = await pedir("/api/leva/0", { cookie: await comSessao() });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      numero: 0,
      cortada: false,
      // Sem o cabeçalho de 5 linhas: vem incompleta (#536), e o texto da issue não vai.
      tarefas: [{
        numero: 354, titulo: "Painel 6/8", url: issue.url, estado: "livre", estimativaHoras: 5,
        incompleta: ["falta a linha Chefe", "falta a linha Ajudantes", "falta a linha Depende de", "falta a linha Sessões filhas"],
      }],
    });
    expect(g.consultas[0].variaveis).toMatchObject({ etiqueta: "leva-0" });
  });

  it("resposta parcial (`data` com `errors`, ex.: um PR que o app não lê): mostra o que veio", async () => {
    fingirGraphQL(() => Response.json({
      data: { repository: { issues: { totalCount: 1, nodes: [{ ...issue, closedByPullRequestsReferences: { nodes: [null] } }] } } },
      errors: [{ message: "Resource not accessible by integration" }],
    }));
    const r = await pedir("/api/leva/0", { cookie: await comSessao() });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ tarefas: [{ numero: 354, estado: "livre" }] });
  });

  it("o GitHub responde só com `errors`, 500 ou fora do ar: 502 sem detalhe do GitHub", async () => {
    for (const resposta of [
      () => Response.json({ data: null, errors: [{ message: "segredo ghu_a vazou" }] }),
      () => Response.json({ errors: [{ message: "segredo ghu_a vazou" }] }),
      () => new Response("ghu_a", { status: 500 }),
      () => {
        throw new TypeError("fetch failed");
      },
    ]) {
      fingirGraphQL(resposta);
      const r = await pedir("/api/leva/0", { cookie: await comSessao() });
      expect(r.status).toBe(502);
      const texto = await r.text();
      expect(JSON.parse(texto)).toEqual({ ok: false, erro: "o GitHub não respondeu" });
      expect(texto).not.toContain("ghu_");
    }
  });

  it("o GitHub recusa o token (401): 401 e a sessão é apagada, pra entrar de novo", async () => {
    fingirGraphQL(() => new Response(null, { status: 401 }));
    const r = await pedir("/api/levas", { cookie: await comSessao() });
    expect(r.status).toBe(401);
    expect(valorDoCookie(r, "sessao")).toBe("");
  });

  it("token vencido: renova uma vez, consulta com o novo e grava o cookie novo", async () => {
    const g = fingirGraphQL(() => Response.json({ data: { repository: { labels: { nodes: [] } } } }));
    const r = await pedir("/api/levas", { cookie: await comSessao({ ...base, expiraEm: Date.now() - 1000 }) });
    expect(r.status).toBe(200);
    expect(g.renovacoes()).toBe(1);
    expect(g.consultas[0].autorizacao).toBe("Bearer ghu_novo");
    expect(await decifrarSessao(valorDoCookie(r, "sessao")!, CHAVE)).toMatchObject({ token: "ghu_novo" });
  });
});

describe("/api/leva/<n>: o cabeçalho e o Depende de (#536)", () => {
  const base: Sessao = { token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login: "fulana", avatar: "", entrouEm: Date.now() - 60_000 };
  const comSessao = async () => `sessao=${await cifrarSessao(base, CHAVE)}`;
  const MARCADOR = "MARCADOR_DO_CORPO_536_ghp_nao_vai";
  const corpo = (depende: string) =>
    `Chefe: backend\nAjudantes: tester (conferir)\nEstimativa: 4 h\nDepende de: ${depende}\nSessões filhas: não\n\n## Pra que serve\n${MARCADOR}`;
  const issue = (number: number, depende: string, state = "OPEN") => ({
    number, title: `Tarefa ${number}`, url: `https://github.com/sakura-corp/sakura-system-ace/issues/${number}`, state,
    stateReason: state === "CLOSED" ? "COMPLETED" : null,
    body: corpo(depende), labels: { nodes: [{ name: "leva-1" }, { name: "chefe:backend" }] },
    assignees: { nodes: [] }, closedByPullRequestsReferences: { nodes: [] },
  });
  const LEVA = { data: { repository: { issues: { totalCount: 3, nodes: [issue(1, "nada", "CLOSED"), issue(2, "#1, #500, #501"), issue(3, "#2")] } } } };

  /** Finge o GraphQL: a consulta da leva e a das dependências respondem coisas diferentes. */
  function fingir(dependencias: () => Response) {
    const consultas: { query: string; autorizacao: string | null }[] = [];
    vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
      if (String(entrada) !== "https://api.github.com/graphql") return new Response("inesperado", { status: 500 });
      const { query } = JSON.parse(String(init?.body)) as { query: string };
      consultas.push({ query, autorizacao: new Headers(init?.headers).get("authorization") });
      return query.includes("query Leva(") ? Response.json(LEVA) : dependencias();
    });
    return consultas;
  }

  it("chefe, ajudantes, estimativa e as dependências abertas chegam; o texto da issue não aparece na resposta", async () => {
    const consultas = fingir(() => Response.json({ data: { repository: { d500: { state: "CLOSED", stateReason: "COMPLETED" }, d501: { state: "OPEN" } } } }));
    const r = await pedir("/api/leva/1", { cookie: await comSessao() });
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(texto).not.toContain("MARCADOR_DO_CORPO_536");
    expect(texto).not.toContain("ghp_");
    expect(texto).not.toContain("Pra que serve");
    const { tarefas } = JSON.parse(texto) as { tarefas: Record<string, unknown>[] };
    expect(tarefas[0]).toEqual({ numero: 1, titulo: "Tarefa 1", url: issue(1, "").url, estado: "feita", chefe: "backend", ajudantes: "tester (conferir)", estimativaHoras: 4 });
    expect(tarefas[1]).toMatchObject({ numero: 2, chefe: "backend", ajudantes: "tester (conferir)", estimativaHoras: 4, dependeDeAbertas: [501] });
    expect(tarefas[2]).toMatchObject({ numero: 3, dependeDeAbertas: [2] });
    // Duas consultas, as duas com o token da sessão; a segunda só com os números de fora da leva.
    expect(consultas.map((c) => c.autorizacao)).toEqual(["Bearer ghu_a", "Bearer ghu_a"]);
    expect(consultas[1].query.match(/issue\(number: \d+\)/g)).toEqual(["issue(number: 500)", "issue(number: 501)"]);
  });

  it("a consulta das dependências falha (500, só errors, 401, fora do ar): a leva sai 200 e os de fora contam como abertos", async () => {
    for (const falha of [
      () => new Response("x", { status: 500 }),
      () => Response.json({ errors: [{ type: "NOT_FOUND" }] }),
      () => new Response(null, { status: 401 }),
      () => {
        throw new TypeError("fetch failed");
      },
    ]) {
      fingir(falha);
      const r = await pedir("/api/leva/1", { cookie: await comSessao() });
      expect(r.status).toBe(200);
      expect(cookies(r)).toEqual([]);
      const { tarefas } = (await r.json()) as { tarefas: { numero: number; dependeDeAbertas?: number[] }[] };
      expect(tarefas.map((t) => t.dependeDeAbertas)).toEqual([undefined, [500, 501], [2]]);
      vi.unstubAllGlobals();
    }
  });

  it("número que não existe (null com errors NOT_FOUND) conta como aberto", async () => {
    fingir(() => Response.json({ data: { repository: { d500: { state: "CLOSED", stateReason: "COMPLETED" }, d501: null } }, errors: [{ type: "NOT_FOUND", path: ["repository", "d501"] }] }));
    const r = await pedir("/api/leva/1", { cookie: await comSessao() });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { tarefas: { dependeDeAbertas?: number[] }[] }).tarefas[1].dependeDeAbertas).toEqual([501]);
  });

  it("continua exigindo sessão: sem cookie ou com cookie adulterado, 401 e nenhuma consulta", async () => {
    const consultas = fingir(() => Response.json({}));
    expect((await pedir("/api/leva/1")).status).toBe(401);
    const adulterado = (await comSessao()).slice(0, -3) + "AAA";
    expect((await pedir("/api/leva/1", { cookie: adulterado })).status).toBe(401);
    expect(consultas).toEqual([]);
  });
});

describe("/api/sala (#468)", () => {
  const base: Sessao = { token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login: "fulana", avatar: "", entrouEm: Date.now() - 60_000 };
  const comSessao = async () => `sessao=${await cifrarSessao(base, CHAVE)}`;

  /** `falha`: qual pedaço do GitHub responde 500. */
  function fingirSala(falha: "nenhum" | "casa" | "tudo" | "401" = "nenhum") {
    const autorizacoes: (string | null)[] = [];
    vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const url = String(entrada);
      autorizacoes.push(new Headers(init?.headers).get("authorization"));
      if (url === "https://api.github.com/graphql") {
        if (falha === "tudo") return new Response("x", { status: 500 });
        if (falha === "401") return new Response("x", { status: 401 });
        const { query } = JSON.parse(String(init?.body)) as { query: string };
        if (query.includes("query Robos")) return Response.json({ data: { repository: { refs: { nodes: [] } } } });
        if (query.includes("query Levas")) return Response.json({ data: { repository: { labels: { nodes: [] } } } });
      }
      if (url.includes("/actions/")) return falha === "casa" || falha === "tudo" ? new Response("x", { status: 500 }) : Response.json({ workflow_runs: [] });
      return new Response("inesperado", { status: 500 });
    });
    return autorizacoes;
  }

  it("sem sessão: 401 e não pergunta nada ao GitHub; sem segredos: 503; POST: 405", async () => {
    const a = fingirSala();
    expect((await pedir("/api/sala")).status).toBe(401);
    expect(a).toEqual([]);
    expect((await pedir("/api/sala", { env: { ASSETS: ambiente.ASSETS } })).status).toBe(503);
    expect((await pedir("/api/sala", { method: "POST", cookie: await comSessao() })).status).toBe(405);
  });

  it("com sessão: pergunta ao GitHub com o token da pessoa e devolve entradas, falhas e leva, sem o token", async () => {
    const a = fingirSala();
    const r = await pedir("/api/sala", { cookie: await comSessao() });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const texto = await r.text();
    const corpo = JSON.parse(texto) as { entradas: { tipo: string }[]; falhas: string[]; leva: number | null };
    expect(corpo.falhas).toEqual([]);
    expect(corpo.leva).toBeNull();
    expect(corpo.entradas.filter((e) => e.tipo === "casa")).toHaveLength(6);
    expect(texto).not.toContain("ghu_");
    expect(new Set(a)).toEqual(new Set(["Bearer ghu_a"]));
  });

  it("uma busca falha: 200, e a resposta diz qual", async () => {
    fingirSala("casa");
    const r = await pedir("/api/sala", { cookie: await comSessao() });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { falhas: string[] }).falhas).toEqual(["casa"]);
  });

  it("as três falham: 502; o GitHub recusa o token: 401 e apaga a sessão", async () => {
    fingirSala("tudo");
    expect((await pedir("/api/sala", { cookie: await comSessao() })).status).toBe(502);
    vi.unstubAllGlobals();
    fingirSala("401");
    const r = await pedir("/api/sala", { cookie: await comSessao() });
    expect(r.status).toBe(401);
    expect(cookies(r).find((c) => c.startsWith("sessao="))).toContain("Max-Age=0");
  });
});


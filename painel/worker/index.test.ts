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

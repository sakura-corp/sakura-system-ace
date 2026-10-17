import { describe, expect, it } from "vitest";
import worker, { type Ambiente, type LigacaoDaSala } from "./index";
import { SalaDoPainel } from "./sala";
import { cifrarSessao, type Sessao } from "./sessao";

const CHAVE = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres-0123456789";
const SEGREDO = "segredo-do-webhook-de-teste";
const enc = new TextEncoder();

async function assinar(corpo: string, segredo = SEGREDO) {
  const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", chave, enc.encode(corpo)));
  return "sha256=" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Uma sala de mentira que anota o que o worker mandou. */
function salaFalsa() {
  const pedidos: { url: string; metodo?: string; corpo?: string; upgrade?: string | null }[] = [];
  let falha = false;
  const ligacao: LigacaoDaSala = {
    idFromName: (nome) => nome,
    get: (id) => ({
      fetch: async (entrada, init) => {
        if (falha) throw new Error("sala fora do ar");
        const req = typeof entrada === "string" ? undefined : entrada;
        pedidos.push({ url: String(req?.url ?? entrada), metodo: init?.method ?? req?.method, corpo: init?.body as string | undefined, upgrade: req?.headers.get("upgrade") });
        return new Response(null, { status: 204, headers: { "x-sala": String(id) } });
      },
    }),
  };
  return { ligacao, pedidos, quebrar: () => (falha = true) };
}

const ambiente = (sala = salaFalsa()): { env: Ambiente; sala: ReturnType<typeof salaFalsa> } => ({
  sala,
  env: {
    ASSETS: { fetch: async () => new Response("página") },
    GITHUB_APP_CLIENT_ID: "Iv-teste",
    GITHUB_APP_CLIENT_SECRET: "segredo-de-teste",
    CHAVE_DA_SESSAO: CHAVE,
    GITHUB_WEBHOOK_SECRET: SEGREDO,
    SALA: sala.ligacao,
  },
});

const REPO = { full_name: "sakura-corp/sakura-system-ace" };

async function enviar(env: Ambiente, evento: string, payload: unknown, { assinatura, metodo = "POST" }: { assinatura?: string | null; metodo?: string } = {}) {
  const corpo = typeof payload === "string" ? payload : JSON.stringify(payload);
  const headers: Record<string, string> = { "x-github-event": evento };
  const sig = assinatura === undefined ? await assinar(corpo) : assinatura;
  if (sig !== null) headers["x-hub-signature-256"] = sig;
  return worker.fetch(new Request("https://painel.exemplo/api/webhook", { method: metodo, headers, body: metodo === "POST" ? corpo : undefined }), env);
}

describe("POST /api/webhook", () => {
  it("assinatura errada: 401, e nada chega à sala", async () => {
    const { env, sala } = ambiente();
    const r = await enviar(env, "issues", { repository: REPO, issue: { number: 355 } }, { assinatura: await assinar("outro corpo") });
    expect(r.status).toBe(401);
    expect(sala.pedidos).toEqual([]);
  });

  it("sem assinatura, ou assinada com outro segredo: 401", async () => {
    const { env, sala } = ambiente();
    const corpo = JSON.stringify({ repository: REPO, issue: { number: 1 } });
    expect((await enviar(env, "issues", corpo, { assinatura: null })).status).toBe(401);
    expect((await enviar(env, "issues", corpo, { assinatura: await assinar(corpo, "segredo-errado") })).status).toBe(401);
    expect(sala.pedidos).toEqual([]);
  });

  it("assinatura certa: repassa à sala só { evento, numero }", async () => {
    const { env, sala } = ambiente();
    const r = await enviar(env, "issues", { repository: REPO, action: "assigned", issue: { number: 355, title: "Tempo real" }, assignee: { login: "fulana" } });
    expect(r.status).toBe(200);
    expect(sala.pedidos).toHaveLength(1);
    expect(sala.pedidos[0]).toMatchObject({ url: "https://sala/aviso", metodo: "POST" });
    expect(JSON.parse(sala.pedidos[0].corpo!)).toEqual({ evento: "issues", numero: 355 });
  });

  it("push vai sem número; outro repositório, outro evento e ping são ignorados com 200", async () => {
    const { env, sala } = ambiente();
    await enviar(env, "push", { repository: REPO, ref: "refs/heads/x" });
    expect(JSON.parse(sala.pedidos[0].corpo!)).toEqual({ evento: "push" });
    for (const [evento, payload] of [
      ["issues", { repository: { full_name: "outra/coisa" }, issue: { number: 1 } }],
      ["star", { repository: REPO }],
      ["ping", { repository: REPO, zen: "x" }],
    ] as const) {
      const r = await enviar(env, evento, payload);
      expect(r.status).toBe(200);
      expect(await r.json()).toMatchObject({ ignorado: true });
    }
    expect(sala.pedidos).toHaveLength(1);
  });

  it("corpo que não é JSON (mas bem assinado): 400", async () => {
    const { env } = ambiente();
    expect((await enviar(env, "issues", "isso não é json")).status).toBe(400);
  });

  it("só aceita POST", async () => {
    const { env } = ambiente();
    expect((await enviar(env, "issues", {}, { metodo: "GET" })).status).toBe(405);
  });

  it("sem o segredo configurado: 503, nunca aceita sem conferir", async () => {
    const { env } = ambiente();
    delete env.GITHUB_WEBHOOK_SECRET;
    expect((await enviar(env, "issues", { repository: REPO, issue: { number: 1 } })).status).toBe(503);
  });

  it("a sala fora do ar: 502", async () => {
    const { env, sala } = ambiente();
    sala.quebrar();
    expect((await enviar(env, "issues", { repository: REPO, issue: { number: 1 } })).status).toBe(502);
  });
});

const sessaoValida: Sessao = { token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login: "fulana", avatar: "x", entrouEm: Date.now() };

async function abrirTempoReal(env: Ambiente, { cookie, origem, upgrade = "websocket", metodo = "GET" }: { cookie?: string; origem?: string; upgrade?: string | null; metodo?: string } = {}) {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = cookie;
  if (origem) headers.origin = origem;
  if (upgrade) headers.upgrade = upgrade;
  return worker.fetch(new Request("https://painel.exemplo/api/tempo-real", { method: metodo, headers }), env);
}

describe("GET /api/tempo-real", () => {
  it("sem sessão: 401, e a sala nem é chamada", async () => {
    const { env, sala } = ambiente();
    expect((await abrirTempoReal(env)).status).toBe(401);
    expect((await abrirTempoReal(env, { cookie: "sessao=lixo" })).status).toBe(401);
    expect(sala.pedidos).toEqual([]);
  });

  it("sessão vencida (30 dias): 401", async () => {
    const { env } = ambiente();
    const velha = await cifrarSessao({ ...sessaoValida, entrouEm: Date.now() - 31 * 24 * 3_600_000 }, CHAVE);
    expect((await abrirTempoReal(env, { cookie: `sessao=${velha}` })).status).toBe(401);
  });

  it("com sessão válida: entrega o pedido à sala, sem renovar o token (nenhuma chamada ao GitHub)", async () => {
    const { env, sala } = ambiente();
    const cookie = `sessao=${await cifrarSessao({ ...sessaoValida, expiraEm: Date.now() - 1000 }, CHAVE)}`;
    const r = await abrirTempoReal(env, { cookie, origem: "https://painel.exemplo" });
    expect(r.status).toBe(204);
    expect(r.headers.get("x-sala")).toBe("painel");
    expect(sala.pedidos[0].upgrade).toBe("websocket");
  });

  it("de outra origem: 403", async () => {
    const { env, sala } = ambiente();
    const cookie = `sessao=${await cifrarSessao(sessaoValida, CHAVE)}`;
    expect((await abrirTempoReal(env, { cookie, origem: "https://site-ruim.exemplo" })).status).toBe(403);
    expect(sala.pedidos).toEqual([]);
  });

  it("sem pedir WebSocket: 426; método que não é GET: 405", async () => {
    const { env } = ambiente();
    const cookie = `sessao=${await cifrarSessao(sessaoValida, CHAVE)}`;
    expect((await abrirTempoReal(env, { cookie, upgrade: null })).status).toBe(426);
    expect((await abrirTempoReal(env, { cookie, metodo: "POST" })).status).toBe(405);
  });
});

describe("SalaDoPainel", () => {
  function sala(conexoes: { send(m: string): void }[]) {
    return new SalaDoPainel({ acceptWebSocket: () => {}, getWebSockets: () => conexoes }, {});
  }

  it("repassa o aviso a todas as conexões", async () => {
    const recebido: string[][] = [[], [], []];
    const s = sala(recebido.map((r) => ({ send: (m: string) => void r.push(m) })));
    const r = await s.fetch(new Request("https://sala/aviso", { method: "POST", body: '{"evento":"issues","numero":3}' }));
    expect(r.status).toBe(204);
    expect(recebido).toEqual([['{"evento":"issues","numero":3}'], ['{"evento":"issues","numero":3}'], ['{"evento":"issues","numero":3}']]);
  });

  it("uma conexão morta não impede as outras de receber", () => {
    const recebido: string[] = [];
    const s = sala([
      { send: () => { throw new Error("fechada"); } },
      { send: (m) => void recebido.push(m) },
    ]);
    expect(s.avisar("x")).toBe(1);
    expect(recebido).toEqual(["x"]);
  });

  it("/aviso só aceita POST; fora disso, sem pedir WebSocket, dá 426", async () => {
    const s = sala([]);
    expect((await s.fetch(new Request("https://sala/aviso"))).status).toBe(405);
    expect((await s.fetch(new Request("https://sala/qualquer"))).status).toBe(426);
  });
});

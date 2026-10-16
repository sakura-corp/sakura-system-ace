// O worker do painel (tarefa #352). Só responde /api/*; o resto é a página, servida pela
// Cloudflare a partir de ./dist (ver wrangler.jsonc). O login (#353) e o webhook (#355)
// entram aqui depois.

interface Ambiente {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Ambiente): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/saude") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ ok: false, erro: "método não permitido" }, 405);
      }
      return json({ ok: true });
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return json({ ok: false, erro: "não encontrado" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

// As conversas do worker com o GitHub no login (tarefa #353). Os erros daqui nunca levam
// token, código nem resposta do GitHub: só um motivo curto.

export const ORGANIZACAO = "sakura-corp";

const AGENTE = "sakura-painel";

export type Tokens = {
  token: string;
  refresh: string;
  /** 0 = o token não vence. */
  expiraEm: number;
};

type RespostaDeToken = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

function tokensDaResposta(corpo: RespostaDeToken, agora: number): Tokens | null {
  if (!corpo.access_token || corpo.error) return null;
  return {
    token: corpo.access_token,
    refresh: corpo.refresh_token ?? "",
    expiraEm: typeof corpo.expires_in === "number" && corpo.expires_in > 0 ? agora + corpo.expires_in * 1000 : 0,
  };
}

async function pedirToken(parametros: Record<string, string>, agora: number): Promise<Tokens | null> {
  const resposta = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded", "user-agent": AGENTE },
    body: new URLSearchParams(parametros).toString(),
  });
  if (!resposta.ok) return null;
  // O GitHub responde 200 até quando dá erro; o erro vem no campo `error`.
  return tokensDaResposta((await resposta.json()) as RespostaDeToken, agora);
}

export function trocarCodigo(
  clientId: string,
  clientSecret: string,
  codigo: string,
  redirectUri: string,
  agora = Date.now(),
): Promise<Tokens | null> {
  return pedirToken({ client_id: clientId, client_secret: clientSecret, code: codigo, redirect_uri: redirectUri }, agora);
}

export function renovarToken(clientId: string, clientSecret: string, refresh: string, agora = Date.now()): Promise<Tokens | null> {
  return pedirToken(
    { client_id: clientId, client_secret: clientSecret, grant_type: "refresh_token", refresh_token: refresh },
    agora,
  );
}

function api(caminho: string, token: string): Promise<Response> {
  return fetch(`https://api.github.com${caminho}`, {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "user-agent": AGENTE,
      "x-github-api-version": "2022-11-28",
    },
    // Quem não é membro recebe 302 (pro "membro público"); não seguir, pra não confundir.
    redirect: "manual",
  });
}

export async function buscarUsuario(token: string): Promise<{ login: string; avatar: string } | null> {
  const resposta = await api("/user", token);
  if (!resposta.ok) return null;
  const corpo = (await resposta.json()) as { login?: unknown; avatar_url?: unknown };
  if (typeof corpo.login !== "string" || !corpo.login) return null;
  return { login: corpo.login, avatar: typeof corpo.avatar_url === "string" ? corpo.avatar_url : "" };
}

/**
 * Membro da sakura-corp? 204 = sim; 404 ou 302 (o GitHub manda quem não é membro pro
 * "membro público") = não; qualquer outra coisa (403, limite, GitHub fora) = não deu pra saber.
 */
export async function ehMembro(token: string, login: string): Promise<"sim" | "nao" | "erro"> {
  const resposta = await api(`/orgs/${ORGANIZACAO}/members/${encodeURIComponent(login)}`, token);
  if (resposta.status === 204) return "sim";
  if (resposta.status === 404 || resposta.status === 302) return "nao";
  return "erro";
}

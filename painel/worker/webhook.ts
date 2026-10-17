// O aviso automático do GitHub (webhook, tarefa #355). Aqui só as regras puras: conferir a
// assinatura e escolher o que repassar. O aviso que sai daqui não leva dado nenhum da tarefa.

/** Só avisos deste repositório entram. */
export const REPOSITORIO = "sakura-corp/sakura-system-ace";

/** O que vai pra sala: o tipo do evento e, quando existe, o número da tarefa. Nada mais. */
export type Aviso = { evento: string; numero?: number };

const EVENTOS_COM_NUMERO = ["issues", "pull_request", "label"] as const;
const EVENTOS_SEM_NUMERO = ["workflow_run", "push", "create", "delete"] as const;

const encoder = new TextEncoder();

function hexParaBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/**
 * Confere o `X-Hub-Signature-256` ("sha256=<hex>"): HMAC-SHA256 do corpo, com o segredo do
 * webhook. A comparação é feita pelo `crypto.subtle.verify`, que é em tempo constante.
 */
export async function assinaturaConfere(corpo: string, cabecalho: string | null, segredo: string): Promise<boolean> {
  if (!cabecalho || !segredo) return false;
  const achou = /^sha256=([0-9a-f]{64})$/i.exec(cabecalho);
  const assinatura = achou ? hexParaBytes(achou[1]) : null;
  if (!assinatura) return false;
  const chave = await crypto.subtle.importKey("raw", encoder.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", chave, assinatura, encoder.encode(corpo));
}

const inteiroPositivo = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/**
 * Escolhe o que repassar à sala, ou `null` pra ignorar.
 * - `issues`, `pull_request`, `label`: `{ evento, numero }` (o `label` não tem número de tarefa,
 *   então vai só `{ evento }`; a página busca a leva de novo do mesmo jeito);
 * - `workflow_run`, `push`, `create`, `delete`: `{ evento }` (a sala da #468 usa);
 * - qualquer outro evento, ou de outro repositório: ignorado.
 */
export function avisoDoEvento(evento: string | null, payload: unknown): Aviso | null {
  if (!evento || typeof payload !== "object" || payload === null) return null;
  const p = payload as { repository?: { full_name?: unknown }; issue?: { number?: unknown }; pull_request?: { number?: unknown }; number?: unknown };
  const repositorio = p.repository?.full_name;
  if (typeof repositorio !== "string" || repositorio.toLowerCase() !== REPOSITORIO) return null;

  if ((EVENTOS_SEM_NUMERO as readonly string[]).includes(evento)) return { evento };
  if (!(EVENTOS_COM_NUMERO as readonly string[]).includes(evento)) return null;

  const numero = evento === "issues" ? p.issue?.number : evento === "pull_request" ? (p.pull_request?.number ?? p.number) : undefined;
  return inteiroPositivo(numero) ? { evento, numero } : { evento };
}

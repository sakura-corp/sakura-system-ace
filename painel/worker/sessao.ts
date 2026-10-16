// A sessão do login (tarefa #353). O token do GitHub de quem entrou mora num cookie cifrado
// (AES-GCM) que o JavaScript da página não lê (HttpOnly). Só o worker abre o cookie.
// Nada daqui pode ir pra log, erro ou tela: nem o token, nem o cookie, nem a chave.

export type Sessao = {
  token: string;
  /** Token de renovar; vazio quando o GitHub não manda (token que não vence). */
  refresh: string;
  /** Quando o token vence, em milissegundos desde 1970; 0 = não vence. */
  expiraEm: number;
  login: string;
  avatar: string;
  /** Quando a pessoa entrou. A sessão acaba 30 dias depois, mesmo com o cookie copiado. */
  entrouEm: number;
};

export const COOKIE_SESSAO = "sessao";
export const COOKIE_ESTADO = "estado_login";
/** Pra onde voltar depois do login (ex.: /sala?tv). */
export const COOKIE_VOLTA = "volta_login";
/** 30 dias, contados de quando a pessoa entrou (ver `entrouEm`). */
export const DURACAO_DA_SESSAO_S = 30 * 24 * 60 * 60;
/** O `state` do login vale 10 minutos. */
export const DURACAO_DO_ESTADO_S = 10 * 60;

const codificador = new TextEncoder();
const decodificador = new TextDecoder();

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(texto)) return null;
  try {
    const binario = atob(texto.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binario, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * A chave AES vem da CHAVE_DA_SESSAO (uma senha comprida gerada no Bitwarden) passada por
 * SHA-256, pra dar sempre 256 bits, qualquer que seja o tamanho da senha.
 */
const chaves = new Map<string, Promise<CryptoKey>>();
function chaveAes(segredo: string): Promise<CryptoKey> {
  let chave = chaves.get(segredo);
  if (!chave) {
    chave = crypto.subtle
      .digest("SHA-256", codificador.encode(segredo))
      .then((bruto) => crypto.subtle.importKey("raw", bruto, "AES-GCM", false, ["encrypt", "decrypt"]));
    chaves.set(segredo, chave);
  }
  return chave;
}

export async function cifrarSessao(sessao: Sessao, segredo: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chaveAes(segredo), codificador.encode(JSON.stringify(sessao))),
  );
  const tudo = new Uint8Array(iv.length + cifrado.length);
  tudo.set(iv);
  tudo.set(cifrado, iv.length);
  return paraBase64Url(tudo);
}

function ehSessao(valor: unknown): valor is Sessao {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.token === "string" &&
    v.token !== "" &&
    typeof v.refresh === "string" &&
    typeof v.expiraEm === "number" &&
    typeof v.login === "string" &&
    v.login !== "" &&
    typeof v.avatar === "string" &&
    typeof v.entrouEm === "number"
  );
}

/** Abre o cookie. Qualquer coisa errada (adulterado, outra chave, lixo) dá `null`. */
export async function decifrarSessao(valor: string, segredo: string): Promise<Sessao | null> {
  const tudo = deBase64Url(valor);
  // 12 do IV + 16 da etiqueta do AES-GCM, no mínimo.
  if (!tudo || tudo.length < 12 + 16 + 1) return null;
  try {
    const aberto = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: tudo.slice(0, 12) },
      await chaveAes(segredo),
      tudo.slice(12),
    );
    const sessao: unknown = JSON.parse(decodificador.decode(aberto));
    return ehSessao(sessao) ? sessao : null;
  } catch {
    return null;
  }
}

/** O `state` do login: 32 bytes aleatórios. */
export function novoEstado(): string {
  return paraBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Confere o `state` que voltou do GitHub com o do cookie, sem atalho no tempo da comparação. */
export function estadoConfere(doCookie: string | undefined, daVolta: string | null): boolean {
  if (!doCookie || !daVolta || doCookie.length < 32 || doCookie.length !== daVolta.length) return false;
  let diferenca = 0;
  for (let i = 0; i < doCookie.length; i++) diferenca |= doCookie.charCodeAt(i) ^ daVolta.charCodeAt(i);
  return diferenca === 0;
}

/** A sessão passou dos 30 dias desde que a pessoa entrou. */
export function sessaoVencida(sessao: Sessao, agora: number): boolean {
  return agora - sessao.entrouEm > DURACAO_DA_SESSAO_S * 1000;
}

/** Token vencido, ou a menos de um minuto de vencer. */
export function precisaRenovar(sessao: Sessao, agora: number): boolean {
  return sessao.expiraEm > 0 && sessao.expiraEm - 60_000 <= agora;
}

export function lerCookie(request: Request, nome: string): string | undefined {
  const cabecalho = request.headers.get("cookie");
  if (!cabecalho) return undefined;
  for (const parte of cabecalho.split(";")) {
    const igual = parte.indexOf("=");
    if (igual === -1) continue;
    if (parte.slice(0, igual).trim() === nome) return parte.slice(igual + 1).trim();
  }
  return undefined;
}

/**
 * `Secure` sempre, menos no `http://localhost` do PC: o Safari não guarda cookie `Secure`
 * sem https, e aí o login no Mac não funcionaria no `npm run dev:worker`.
 */
export function montarCookie(nome: string, valor: string, maxAgeS: number, caminho = "/", seguro = true): string {
  return `${nome}=${valor}; Path=${caminho}; Max-Age=${maxAgeS}; HttpOnly;${seguro ? " Secure;" : ""} SameSite=Lax`;
}

export function apagarCookie(nome: string, caminho = "/", seguro = true): string {
  return montarCookie(nome, "", 0, caminho, seguro);
}

/** Só caminho do próprio painel ("/sala?tv"), nunca outro site ("//x", "/\\x", "https://"). */
export function caminhoDeVolta(valor: string | null | undefined): string {
  if (!valor) return "/";
  let caminho: string;
  try {
    caminho = decodeURIComponent(valor);
  } catch {
    return "/";
  }
  if (!caminho.startsWith("/") || caminho.startsWith("//") || caminho.includes("\\") || caminho.startsWith("/api")) return "/";
  if (caminho.length > 200 || /[\u0000-\u001f]/.test(caminho)) return "/";
  return caminho;
}

// O worker do painel (tarefas #352, #353, #354, #355 e #468). Só responde /api/*; o resto é a página, servida
// pela Cloudflare a partir de ./dist (ver wrangler.jsonc).
//
// Login (#353): GitHub App "Sakura Painel" da sakura-corp. Só entra quem é membro da
// organização. O token da pessoa fica no cookie `sessao`, cifrado; a página nunca vê ele.
// Nunca escrever token, cookie ou segredo em log, erro ou resposta.

import { buscarUsuario, consultar, ehMembro, renovarToken, trocarCodigo } from "./github";
import {
  COOKIE_ESTADO,
  COOKIE_SESSAO,
  COOKIE_VOLTA,
  DURACAO_DA_SESSAO_S,
  DURACAO_DO_ESTADO_S,
  apagarCookie,
  caminhoDeVolta,
  cifrarSessao,
  decifrarSessao,
  estadoConfere,
  lerCookie,
  montarCookie,
  novoEstado,
  precisaRenovar,
  sessaoVencida,
  type Sessao,
} from "./sessao";
import {
  CONSULTA_DA_LEVA,
  CONSULTA_DAS_LEVAS,
  CONSULTA_DO_RESUMO_DAS_LEVAS,
  levaDosDados,
  levasDosDados,
  marcarDependenciasAbertas,
  resumoDasLevasDosDados,
  variaveisDoRepositorio,
  type DadosDaLeva,
  type DadosDasLevas,
  type DadosDoResumoDasLevas,
} from "./tarefas";
import { buscarSala } from "./dadosDaSala";
import { escreverNoGitHub, largarTarefa, pegarTarefa } from "./pegar";
import { numeroValido } from "../src/logica/comecarComClaude";
import { SalaDoPainel } from "./sala";
import { assinaturaConfere, avisoDoEvento } from "./webhook";

export { SalaDoPainel };

/** O binding do Durable Object `SalaDoPainel` (wrangler.jsonc). */
export interface LigacaoDaSala {
  idFromName(nome: string): unknown;
  get(id: unknown): { fetch(entrada: string | Request, init?: RequestInit): Promise<Response> };
}

export interface Ambiente {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Não é segredo: vem do wrangler.jsonc (ou do .dev.vars, com o app de teste). */
  GITHUB_APP_CLIENT_ID?: string;
  /** Segredos da Cloudflare (ou do .dev.vars no PC). */
  GITHUB_APP_CLIENT_SECRET?: string;
  CHAVE_DA_SESSAO?: string;
  /** O segredo do webhook do app "Sakura Painel" (#355): o mesmo no GitHub e na Cloudflare. */
  GITHUB_WEBHOOK_SECRET?: string;
  SALA?: LigacaoDaSala;
}

const CAMINHO_DO_LOGIN = "/api/login";

function comCookies(headers: Headers, cookies: string[]): Headers {
  for (const c of cookies) headers.append("set-cookie", c);
  return headers;
}

function json(corpo: unknown, status = 200, cookies: string[] = []): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  return new Response(JSON.stringify(corpo), { status, headers: comCookies(headers, cookies) });
}

function redirecionar(destino: string, cookies: string[] = []): Response {
  const headers = new Headers({ location: destino, "cache-control": "no-store" });
  return new Response(null, { status: 302, headers: comCookies(headers, cookies) });
}

type Configuracao = { clientId: string; clientSecret: string; chave: string };

function configuracao(env: Ambiente): Configuracao | null {
  const clientId = env.GITHUB_APP_CLIENT_ID ?? "";
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET ?? "";
  const chave = env.CHAVE_DA_SESSAO ?? "";
  if (!clientId || !clientSecret || chave.length < 32) return null;
  return { clientId, clientSecret, chave };
}

/** Os cookies desta resposta: `Secure`, menos no http://localhost do PC (ver `montarCookie`). */
function cookiesDe(url: URL) {
  const seguro = url.protocol === "https:";
  return {
    gravar: (nome: string, valor: string, maxAgeS: number, caminho = "/") => montarCookie(nome, valor, maxAgeS, caminho, seguro),
    apagar: (nome: string, caminho = "/") => apagarCookie(nome, caminho, seguro),
  };
}

const enderecoDeVolta = (url: URL) => `${url.origin}/api/login/volta`;

function login(url: URL, config: Configuracao): Response {
  const cookie = cookiesDe(url);
  const estado = novoEstado();
  const destino = new URL("https://github.com/login/oauth/authorize");
  destino.searchParams.set("client_id", config.clientId);
  destino.searchParams.set("redirect_uri", enderecoDeVolta(url));
  destino.searchParams.set("state", estado);
  destino.searchParams.set("allow_signup", "false");
  return redirecionar(destino.toString(), [
    cookie.gravar(COOKIE_ESTADO, estado, DURACAO_DO_ESTADO_S, CAMINHO_DO_LOGIN),
    cookie.gravar(COOKIE_VOLTA, encodeURIComponent(caminhoDeVolta(url.searchParams.get("volta"))), DURACAO_DO_ESTADO_S, CAMINHO_DO_LOGIN),
  ]);
}

async function voltaDoLogin(request: Request, url: URL, config: Configuracao, agora = Date.now()): Promise<Response> {
  const cookie = cookiesDe(url);
  // O `state` vale uma vez só: apaga sempre, deu certo ou não.
  const limpa = [cookie.apagar(COOKIE_ESTADO, CAMINHO_DO_LOGIN), cookie.apagar(COOKIE_VOLTA, CAMINHO_DO_LOGIN)];
  const falhou = () => redirecionar("/?erro=falha-login", limpa);

  const codigo = url.searchParams.get("code");
  if (!codigo || !estadoConfere(lerCookie(request, COOKIE_ESTADO), url.searchParams.get("state"))) return falhou();

  try {
    const tokens = await trocarCodigo(config.clientId, config.clientSecret, codigo, enderecoDeVolta(url), agora);
    if (!tokens) return falhou();
    const usuario = await buscarUsuario(tokens.token);
    if (!usuario) return falhou();
    const membro = await ehMembro(tokens.token, usuario.login);
    if (membro === "nao") return redirecionar("/?erro=nao-membro", [...limpa, cookie.apagar(COOKIE_SESSAO)]);
    if (membro === "erro") return falhou();
    const sessao: Sessao = { ...tokens, ...usuario, entrouEm: agora };
    return redirecionar(caminhoDeVolta(lerCookie(request, COOKIE_VOLTA)), [
      ...limpa,
      cookie.gravar(COOKIE_SESSAO, await cifrarSessao(sessao, config.chave), DURACAO_DA_SESSAO_S),
    ]);
  } catch {
    console.error("login: falha ao falar com o GitHub");
    return falhou();
  }
}

/**
 * A sessão de quem fez o pedido, já com o token renovado se ele venceu (os do GitHub App
 * duram 8 h). Ao renovar, confere de novo se a pessoa ainda é da sakura-corp.
 * Os `cookies` voltam na resposta: o novo, ou o que apaga a sessão.
 * Toda rota que usa o GitHub (/api/eu, /api/levas, /api/leva/<n>) passa por aqui.
 *
 * Só apaga a sessão quando ela é ruim de verdade (adulterada, passou dos 30 dias, a pessoa
 * saiu da sakura-corp). Se a renovação falhar (o GitHub fora do ar, ou duas abas renovando
 * ao mesmo tempo, já que cada `refresh` vale uma vez só), responde "sem sessão" mas deixa o
 * cookie como está: a outra aba pode já ter gravado o novo.
 */
export async function sessaoAtual(request: Request, config: Configuracao, agora = Date.now()) {
  const cookie = cookiesDe(new URL(request.url));
  const nada = { sessao: null, cookies: [] as string[] };
  const sair = { sessao: null, cookies: [cookie.apagar(COOKIE_SESSAO)] };

  const valor = lerCookie(request, COOKIE_SESSAO);
  if (!valor) return nada;
  const sessao = await decifrarSessao(valor, config.chave);
  if (!sessao || sessaoVencida(sessao, agora)) return sair;
  if (!precisaRenovar(sessao, agora)) return { sessao, cookies: [] as string[] };
  if (!sessao.refresh) return sair;

  try {
    const tokens = await renovarToken(config.clientId, config.clientSecret, sessao.refresh, agora);
    if (!tokens) return nada;
    // Os tokens novos já gastaram o refresh antigo: daqui pra frente, só grava ou apaga.
    if ((await ehMembro(tokens.token, sessao.login).catch(() => "erro" as const)) === "nao") return sair;
    const nova: Sessao = { ...sessao, ...tokens };
    const restanteS = Math.max(0, Math.floor((nova.entrouEm + DURACAO_DA_SESSAO_S * 1000 - agora) / 1000));
    return { sessao: nova, cookies: [cookie.gravar(COOKIE_SESSAO, await cifrarSessao(nova, config.chave), restanteS)] };
  } catch {
    console.error("login: falha ao renovar o token");
    return nada;
  }
}

/** /api/leva/3 → 3; outro caminho → null. */
export function levaDoCaminho(caminho: string): number | null {
  const achou = /^\/api\/leva\/(\d{1,4})$/.exec(caminho);
  return achou ? Number(achou[1]) : null;
}

/** Qual rota de dados: /api/levas, /api/levas/resumo (#548) ou /api/leva/<n>. */
type PedidoDeDados = { tipo: "levas" } | { tipo: "resumo" } | { tipo: "leva"; numero: number };

/**
 * As rotas com dados (#354): /api/levas, /api/levas/resumo e /api/leva/<n>, sempre com o token de quem está logado.
 * A página pede /api/eu antes destas (ver ComLogin), pra o token ser renovado uma vez só.
 */
async function dados(request: Request, config: Configuracao, pedido: PedidoDeDados): Promise<Response> {
  const { sessao, cookies } = await sessaoAtual(request, config);
  if (!sessao) return json({ ok: false, erro: "sem sessão" }, 401, cookies);
  const falhou = () => json({ ok: false, erro: "o GitHub não respondeu" }, 502, cookies);
  // O GitHub recusou o token (a pessoa tirou o acesso do app, por exemplo): entra de novo.
  const semAcesso = () => json({ ok: false, erro: "sem sessão" }, 401, [cookiesDe(new URL(request.url)).apagar(COOKIE_SESSAO)]);

  try {
    if (pedido.tipo === "levas") {
      const r = await consultar<DadosDasLevas>(sessao.token, CONSULTA_DAS_LEVAS, variaveisDoRepositorio);
      if (r.tipo === "sem-acesso") return semAcesso();
      if (r.tipo === "erro") return falhou();
      return json(levasDosDados(r.dados), 200, cookies);
    }
    // A consulta pesada (#548): só a página /levas pede; a barra, a Sala e o pegar usam a leve.
    if (pedido.tipo === "resumo") {
      const r = await consultar<DadosDoResumoDasLevas>(sessao.token, CONSULTA_DO_RESUMO_DAS_LEVAS, variaveisDoRepositorio);
      if (r.tipo === "sem-acesso") return semAcesso();
      if (r.tipo === "erro") return falhou();
      return json(resumoDasLevasDosDados(r.dados), 200, cookies);
    }
    const leva = pedido.numero;
    const r = await consultar<DadosDaLeva>(sessao.token, CONSULTA_DA_LEVA, { ...variaveisDoRepositorio, etiqueta: `leva-${leva}` });
    if (r.tipo === "sem-acesso") return semAcesso();
    if (r.tipo === "erro") return falhou();
    const resposta = levaDosDados(leva, r.dados);
    if (!resposta) return falhou();
    // #536: quais números do Depende de ainda estão abertos. Se essa consulta falhar, contam como abertos e a leva sai igual.
    await marcarDependenciasAbertas(resposta, r.dados, (consulta, variaveis) => consultar(sessao.token, consulta, variaveis));
    return json(resposta, 200, cookies);
  } catch {
    console.error("dados: falha ao falar com o GitHub");
    return falhou();
  }
}

/**
 * A sala de verdade (#468): robôs do Claude, robôs da casa e pessoas, com o token de quem está logado
 * (o "precisa de você" depende de quem olha). Se uma das três buscas falhar, a resposta diz qual em
 * `falhas`; se falharem todas, 502.
 */
async function sala(request: Request, config: Configuracao): Promise<Response> {
  const { sessao, cookies } = await sessaoAtual(request, config);
  if (!sessao) return json({ ok: false, erro: "sem sessão" }, 401, cookies);
  const r = await buscarSala(sessao.token, sessao.login);
  if (r.tipo === "sem-acesso") return json({ ok: false, erro: "sem sessão" }, 401, [cookiesDe(new URL(request.url)).apagar(COOKIE_SESSAO)]);
  if (r.tipo === "erro") return json({ ok: false, erro: "o GitHub não respondeu" }, 502, cookies);
  return json(r.sala, 200, cookies);
}

/** /api/tarefa/12/pegar → { numero: "12", acao: "pegar" }; outro caminho → null. O número é conferido depois (400). */
export function acaoDoCaminho(caminho: string): { numero: string; acao: "pegar" | "largar" } | null {
  const achou = /^\/api\/tarefa\/([^/]{1,20})\/(pegar|largar)$/.exec(caminho);
  return achou ? { numero: achou[1], acao: achou[2] as "pegar" | "largar" } : null;
}

/**
 * Pegar ou largar uma tarefa (#538). Escreve no GitHub, então: só POST, só vindo da própria página
 * (`Origin` igual, e obrigatório: todo navegador manda em POST) e só com sessão válida. O número é
 * conferido aqui e o resto (leva, dono, dependências, "uma por vez") de novo no GitHub, em `pegar.ts`.
 * Recusa → 409 com o motivo em português.
 */
async function acaoNaTarefa(request: Request, url: URL, config: Configuracao, numeroTexto: string, acao: "pegar" | "largar"): Promise<Response> {
  if (request.headers.get("origin") !== url.origin) return json({ ok: false, motivo: "origem não permitida" }, 403);
  const numero = /^\d{1,7}$/.test(numeroTexto) ? Number(numeroTexto) : NaN;
  if (!numeroValido(numero)) return json({ ok: false, motivo: "número de tarefa inválido" }, 400);

  const { sessao, cookies } = await sessaoAtual(request, config);
  if (!sessao) return json({ ok: false, erro: "sem sessão" }, 401, cookies);
  const falhou = () => json({ ok: false, motivo: "o GitHub não respondeu; tente de novo" }, 502, cookies);
  try {
    const perguntar = <T,>(consulta: string, variaveis: Record<string, unknown>) => consultar<T>(sessao.token, consulta, variaveis);
    const escrever = (metodo: "POST" | "DELETE", caminho: string, corpo: unknown) => escreverNoGitHub(sessao.token, metodo, caminho, corpo);
    const r = acao === "pegar" ? await pegarTarefa(numero, sessao.login, perguntar, escrever) : await largarTarefa(numero, sessao.login, perguntar, escrever);
    if (r.tipo === "ok") return json({ ok: true }, 200, cookies);
    if (r.tipo === "recusado") return json({ ok: false, motivo: r.motivo }, 409, cookies);
    if (r.tipo === "sem-acesso") return json({ ok: false, erro: "sem sessão" }, 401, [cookiesDe(url).apagar(COOKIE_SESSAO)]);
    return falhou();
  } catch {
    console.error(`tarefa: falha ao ${acao} no GitHub`);
    return falhou();
  }
}

const NOME_DA_SALA = "painel";
const salaDoPainel = (env: Ambiente) => env.SALA?.get(env.SALA.idFromName(NOME_DA_SALA));

/**
 * O aviso do GitHub (#355). Confere a assinatura antes de qualquer outra coisa (401 se não bater),
 * escolhe o que repassar e entrega à sala. O corpo da tarefa nunca sai daqui.
 */
async function webhook(request: Request, env: Ambiente): Promise<Response> {
  const segredo = env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!segredo) return json({ ok: false, erro: "webhook não configurado" }, 503);

  const corpo = await request.text();
  if (!(await assinaturaConfere(corpo, request.headers.get("x-hub-signature-256"), segredo))) {
    return json({ ok: false, erro: "assinatura inválida" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(corpo);
  } catch {
    return json({ ok: false, erro: "corpo inválido" }, 400);
  }
  const aviso = avisoDoEvento(request.headers.get("x-github-event"), payload);
  if (!aviso) return json({ ok: true, ignorado: true });

  const sala = salaDoPainel(env);
  if (!sala) return json({ ok: false, erro: "sala não configurada" }, 503);
  try {
    await sala.fetch("https://sala/aviso", { method: "POST", body: JSON.stringify(aviso) });
  } catch {
    console.error("webhook: falha ao falar com a sala");
    return json({ ok: false, erro: "a sala não respondeu" }, 502);
  }
  return json({ ok: true });
}

/**
 * Abre o WebSocket com a sala (#355). Só com sessão válida e vindo da própria página (`Origin`).
 * Não usa o token do GitHub, então só decifra o cookie: sem renovar (renovar gasta o `refresh`, e
 * numa resposta 101 o cookie novo não chegaria à página). Quem sai da sakura-corp perde a sessão na
 * próxima renovação; o que passa por aqui é só "a tarefa N mudou", sem dado nenhum.
 */
async function tempoReal(request: Request, url: URL, config: Configuracao, env: Ambiente): Promise<Response> {
  const valor = lerCookie(request, COOKIE_SESSAO);
  const sessao = valor ? await decifrarSessao(valor, config.chave) : null;
  if (!sessao || sessaoVencida(sessao, Date.now())) return json({ ok: false, erro: "sem sessão" }, 401);
  const origem = request.headers.get("origin");
  if (origem && origem !== url.origin) return json({ ok: false, erro: "origem não permitida" }, 403);
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return json({ ok: false, erro: "esta rota espera uma conexão WebSocket" }, 426);
  }
  const sala = salaDoPainel(env);
  if (!sala) return json({ ok: false, erro: "sala não configurada" }, 503);
  return sala.fetch(request);
}

export default {
  async fetch(request: Request, env: Ambiente): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const metodo = request.method;

    if (pathname === "/api/saude") {
      if (metodo !== "GET" && metodo !== "HEAD") return json({ ok: false, erro: "método não permitido" }, 405);
      return json({ ok: true });
    }

    if (pathname === "/api/login" || pathname === "/api/login/volta" || pathname === "/api/eu" || pathname === "/api/sair") {
      const config = configuracao(env);
      if (!config) return json({ ok: false, erro: "login não configurado" }, 503);

      if (pathname === "/api/sair") {
        if (metodo !== "POST") return json({ ok: false, erro: "método não permitido" }, 405);
        return json({ ok: true }, 200, [cookiesDe(url).apagar(COOKIE_SESSAO)]);
      }
      if (metodo !== "GET") return json({ ok: false, erro: "método não permitido" }, 405);
      if (pathname === "/api/login") return login(url, config);
      if (pathname === "/api/login/volta") return voltaDoLogin(request, url, config);

      const { sessao, cookies } = await sessaoAtual(request, config);
      if (!sessao) return json({ ok: false, erro: "sem sessão" }, 401, cookies);
      return json({ login: sessao.login, avatar: sessao.avatar }, 200, cookies);
    }

    if (pathname === "/api/webhook") {
      if (metodo !== "POST") return json({ ok: false, erro: "método não permitido" }, 405);
      return webhook(request, env);
    }

    if (pathname === "/api/tempo-real") {
      const config = configuracao(env);
      if (!config) return json({ ok: false, erro: "login não configurado" }, 503);
      if (metodo !== "GET") return json({ ok: false, erro: "método não permitido" }, 405);
      return tempoReal(request, url, config, env);
    }

    if (pathname === "/api/sala") {
      const config = configuracao(env);
      if (!config) return json({ ok: false, erro: "login não configurado" }, 503);
      if (metodo !== "GET") return json({ ok: false, erro: "método não permitido" }, 405);
      return sala(request, config);
    }

    const acao = acaoDoCaminho(pathname);
    if (acao) {
      const config = configuracao(env);
      if (!config) return json({ ok: false, erro: "login não configurado" }, 503);
      if (metodo !== "POST") return json({ ok: false, erro: "método não permitido" }, 405);
      return acaoNaTarefa(request, url, config, acao.numero, acao.acao);
    }

    const leva = levaDoCaminho(pathname);
    const pedido: PedidoDeDados | null =
      pathname === "/api/levas" ? { tipo: "levas" } : pathname === "/api/levas/resumo" ? { tipo: "resumo" } : leva !== null ? { tipo: "leva", numero: leva } : null;
    if (pedido) {
      const config = configuracao(env);
      if (!config) return json({ ok: false, erro: "login não configurado" }, 503);
      if (metodo !== "GET") return json({ ok: false, erro: "método não permitido" }, 405);
      return dados(request, config, pedido);
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return json({ ok: false, erro: "não encontrado" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};

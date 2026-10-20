// O lado da página nas tarefas de verdade (#354): pede as levas e as tarefas ao worker, uma
// rota depois da outra, e diz o que mostrar. O token nunca passa por aqui (fica no cookie).
import type { Leva, RespostaDaLeva, RespostaDasLevas, RespostaDoResumoDasLevas, ResumoDeLeva, Tarefa } from "../tipos";
import { numeroValido } from "./comecarComClaude";

export type EstadoDaLeva =
  | { tipo: "carregando" }
  /** A sessão acabou (401): volta pra tela de entrada. */
  | { tipo: "fora" }
  | { tipo: "erro"; mensagem: string }
  /** O repositório ainda não tem nenhuma etiqueta `leva-N`. */
  | { tipo: "sem-levas" }
  | { tipo: "pronto"; levas: Leva[]; /** A leva atual (a que abre em /leva). */ atual: number; leva: RespostaDaLeva };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não deu pra buscar as tarefas no GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";

/** /leva/3 → 3; "/leva" ou outro caminho → null (a leva atual). */
export function levaPedida(caminho: string): number | null {
  const achou = /^\/leva\/(\d{1,4})\/?$/.exec(caminho);
  return achou ? Number(achou[1]) : null;
}

/** O endereço da leva atual (#546: a "/" passou a ser o Início). */
export const ENDERECO_DA_LEVA_ATUAL = "/leva";

/** Endereço de uma leva na página: a atual é /leva, as outras /leva/<n>. */
export const enderecoDaLeva = (numero: number, atual: number | null) => (numero === atual ? ENDERECO_DA_LEVA_ATUAL : `/leva/${numero}`);

const ESTADOS_VALIDOS: readonly string[] = ["livre", "andamento", "revisao", "feita"];

const ehTarefa = (t: unknown): t is Tarefa => {
  if (typeof t !== "object" || t === null) return false;
  const { numero, titulo, url, estado, dono } = t as Record<string, unknown>;
  return (
    typeof numero === "number" &&
    typeof titulo === "string" &&
    typeof url === "string" &&
    typeof estado === "string" &&
    ESTADOS_VALIDOS.includes(estado) &&
    (dono === undefined || (typeof dono === "object" && dono !== null && typeof (dono as { login?: unknown }).login === "string"))
  );
};

async function pedirJson(buscar: Buscar, endereco: string): Promise<{ tipo: "ok"; corpo: unknown } | Exclude<EstadoDaLeva, { tipo: "pronto" | "carregando" | "sem-levas" }>> {
  let resposta: Response;
  try {
    resposta = await buscar(endereco, { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok || !(resposta.headers.get("content-type") ?? "").includes("application/json")) {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  try {
    return { tipo: "ok", corpo: await resposta.json() };
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
}

/**
 * Busca as levas e depois as tarefas da leva pedida (ou da atual), uma depois da outra: se o
 * token precisar ser renovado, só o primeiro pedido renova (cada `refresh` vale uma vez só).
 * Leva pedida que não existe abre a atual. `soAsLevas` (Sala e Escritório, que só precisam da
 * barra lateral): não busca as tarefas, e devolve a leva com a lista vazia.
 */
export async function carregarLeva(pedida: number | null, buscar: Buscar = fetch, soAsLevas = false): Promise<EstadoDaLeva> {
  const r1 = await pedirJson(buscar, "/api/levas");
  if (r1.tipo !== "ok") return r1;
  const corpo1 = r1.corpo as Partial<RespostaDasLevas>;
  if (!Array.isArray(corpo1.levas)) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  const levas = corpo1.levas;
  const atual = typeof corpo1.atual === "number" ? corpo1.atual : null;
  if (atual === null || levas.length === 0) return { tipo: "sem-levas" };
  const numero = pedida !== null && levas.some((l) => l.numero === pedida) ? pedida : atual;
  if (soAsLevas) return { tipo: "pronto", levas, atual, leva: { numero, tarefas: [], cortada: false } };

  const r2 = await pedirJson(buscar, `/api/leva/${numero}`);
  if (r2.tipo !== "ok") return r2;
  const corpo2 = r2.corpo as Partial<RespostaDaLeva>;
  if (!Array.isArray(corpo2.tarefas) || !corpo2.tarefas.every(ehTarefa)) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  return { tipo: "pronto", levas, atual, leva: { numero, tarefas: corpo2.tarefas, cortada: corpo2.cortada === true } };
}

// ---- Levas anteriores (#548) ----
/** Como a página /levas está: os mesmos estados da leva, mas o "pronto" traz só as levas com o resumo. */
export type EstadoDoResumo =
  | Exclude<EstadoDaLeva, { tipo: "pronto" }>
  | { tipo: "pronto"; levas: ResumoDeLeva[]; /** A leva atual (a que abre em /leva). */ atual: number };

/**
 * Busca o resumo das levas (/api/levas/resumo), um pedido só. Na página /levas é o único pedido depois do
 * /api/eu: a barra lateral usa as mesmas levas (o resumo também tem número, nome e abertas), então não sai
 * um /api/levas junto (dois pedidos ao mesmo tempo com o token vencido renovariam duas vezes).
 */
export async function carregarResumoDasLevas(buscar: Buscar = fetch): Promise<EstadoDoResumo> {
  const r = await pedirJson(buscar, "/api/levas/resumo");
  if (r.tipo !== "ok") return r;
  const corpo = r.corpo as Partial<RespostaDoResumoDasLevas>;
  if (!Array.isArray(corpo.levas)) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  const atual = typeof corpo.atual === "number" ? corpo.atual : null;
  if (atual === null || corpo.levas.length === 0) return { tipo: "sem-levas" };
  return { tipo: "pronto", levas: corpo.levas, atual };
}

// ---- Pegar e largar (#538) ----
export type ResultadoDaAcao = { tipo: "ok" } | { tipo: "recusado"; motivo: string } | { tipo: "fora" } | { tipo: "erro"; mensagem: string };

const ERRO_DA_ACAO = "Não deu pra falar com o GitHub agora. Tente de novo.";

/**
 * POST /api/tarefa/<n>/pegar ou /largar. Quem decide é o worker: recusa (409, 403, 400) vem como
 * `{ ok: false, motivo }` e é lida pelo corpo, não pelo status (só o 401 é à parte).
 */
export async function acaoNaTarefa(numero: number, acao: "pegar" | "largar", buscar: Buscar = fetch): Promise<ResultadoDaAcao> {
  if (!numeroValido(numero)) return { tipo: "erro", mensagem: "Tarefa inválida." };
  let resposta: Response;
  try {
    resposta = await buscar(`/api/tarefa/${numero}/${acao}`, { method: "POST", headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    return { tipo: "erro", mensagem: ERRO_DA_ACAO };
  }
  const { ok, motivo } = (typeof corpo === "object" && corpo !== null ? corpo : {}) as { ok?: unknown; motivo?: unknown };
  if (ok === true) return { tipo: "ok" };
  if (ok === false && typeof motivo === "string" && motivo.trim() !== "") return { tipo: "recusado", motivo: motivo.slice(0, 200) };
  return { tipo: "erro", mensagem: ERRO_DA_ACAO };
}

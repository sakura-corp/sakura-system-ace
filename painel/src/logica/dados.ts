// O lado da página nas tarefas de verdade (#354): pede as levas e as tarefas ao worker, uma
// rota depois da outra, e diz o que mostrar. O token nunca passa por aqui (fica no cookie).
import type { Leva, RespostaDaLeva, RespostaDasLevas, Tarefa } from "../tipos";

export type EstadoDaLeva =
  | { tipo: "carregando" }
  /** A sessão acabou (401): volta pra tela de entrada. */
  | { tipo: "fora" }
  | { tipo: "erro"; mensagem: string }
  /** O repositório ainda não tem nenhuma etiqueta `leva-N`. */
  | { tipo: "sem-levas" }
  | { tipo: "pronto"; levas: Leva[]; /** A leva atual (a que abre em "/"). */ atual: number; leva: RespostaDaLeva };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não deu pra buscar as tarefas no GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";

/** /leva/3 → 3; "/" ou outro caminho → null (a leva atual). */
export function levaPedida(caminho: string): number | null {
  const achou = /^\/leva\/(\d{1,4})\/?$/.exec(caminho);
  return achou ? Number(achou[1]) : null;
}

/** Endereço de uma leva na página: a atual é "/", as outras /leva/<n>. */
export const enderecoDaLeva = (numero: number, atual: number | null) => (numero === atual ? "/" : `/leva/${numero}`);

const ehTarefa = (t: unknown): t is Tarefa =>
  typeof t === "object" && t !== null && typeof (t as Tarefa).numero === "number" && typeof (t as Tarefa).titulo === "string";

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
 * Leva pedida que não existe abre a atual.
 */
export async function carregarLeva(pedida: number | null, buscar: Buscar = fetch): Promise<EstadoDaLeva> {
  const r1 = await pedirJson(buscar, "/api/levas");
  if (r1.tipo !== "ok") return r1;
  const corpo1 = r1.corpo as Partial<RespostaDasLevas>;
  if (!Array.isArray(corpo1.levas)) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  const levas = corpo1.levas;
  const atual = typeof corpo1.atual === "number" ? corpo1.atual : null;
  if (atual === null || levas.length === 0) return { tipo: "sem-levas" };
  const numero = pedida !== null && levas.some((l) => l.numero === pedida) ? pedida : atual;

  const r2 = await pedirJson(buscar, `/api/leva/${numero}`);
  if (r2.tipo !== "ok") return r2;
  const corpo2 = r2.corpo as Partial<RespostaDaLeva>;
  if (!Array.isArray(corpo2.tarefas) || !corpo2.tarefas.every(ehTarefa)) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  return { tipo: "pronto", levas, atual, leva: { numero, tarefas: corpo2.tarefas, cortada: corpo2.cortada === true } };
}

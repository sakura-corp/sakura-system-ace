// O lado da página na Sala de verdade (#468): pede /api/sala ao worker e diz o que mostrar.
// O token nunca passa por aqui (fica no cookie). Mesma forma de `dados.ts`.
import type { EntradaDaSala, RespostaDaSala, TipoBonequinho } from "../tipos";

export type EstadoDaSala =
  | { tipo: "carregando" }
  /** A sessão acabou (401): volta pra tela de entrada. */
  | { tipo: "fora" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; entradas: EntradaDaSala[]; falhas: TipoBonequinho[]; leva: number | null };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não consegui ler a sala do GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";

const TIPOS: readonly string[] = ["pessoa", "claude", "casa"];

const ehEntrada = (e: unknown): e is EntradaDaSala => {
  if (typeof e !== "object" || e === null) return false;
  const { id, tipo, nome, sinais } = e as Record<string, unknown>;
  return typeof id === "string" && typeof tipo === "string" && TIPOS.includes(tipo) && typeof nome === "string" && typeof sinais === "object" && sinais !== null;
};

/** Pede a sala. Resposta fora do formato combinado vale como erro: nada de adivinhar. */
export async function carregarSala(buscar: Buscar = fetch): Promise<EstadoDaSala> {
  let resposta: Response;
  try {
    resposta = await buscar("/api/sala", { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok || !(resposta.headers.get("content-type") ?? "").includes("application/json")) {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  let corpo: Partial<RespostaDaSala>;
  try {
    corpo = (await resposta.json()) as Partial<RespostaDaSala>;
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  const { entradas, falhas, leva } = corpo;
  if (!Array.isArray(entradas) || !entradas.every(ehEntrada) || !Array.isArray(falhas) || !falhas.every((f) => TIPOS.includes(f))) {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  return { tipo: "pronto", entradas, falhas, leva: typeof leva === "number" ? leva : null };
}

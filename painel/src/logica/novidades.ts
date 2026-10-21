// "O que mudou hoje" no Início (#549): o texto de cada novidade e o filtro do dia.
// O worker só repassa tipo, número, quem e quando (worker/novidades.ts); a frase é montada aqui, e o título
// da issue ou do PR nunca entra nela (vai à parte, e só vira link se for do GitHub da sakura-corp).
// Função pura: o `agora` vem de fora. Nada é guardado: a lista é lida do GitHub a cada visita.
import { linkSeguro } from "./link";

export type AcaoNaTarefa = "abriu" | "fechou" | "reabriu" | "pegou" | "largou";
export type AcaoNoPr = "abriu" | "mesclou" | "fechou" | "fechou-sem-mesclar" | "reabriu";

export type Novidade = {
  /** Único na lista (o id do evento ou da rodada do GitHub). */
  id: string;
  /** Data e hora ISO do GitHub. */
  quando: string;
  url?: string;
  titulo?: string;
} & (
  | { tipo: "tarefa"; acao: AcaoNaTarefa; quem: string; numero: number; /** Pegou/largou por outra pessoa: quem entrou ou saiu. */ alvo?: string }
  | { tipo: "pr"; acao: AcaoNoPr; quem: string; numero: number }
  | { tipo: "rodada"; passou: boolean; nome: string; numero?: number }
);

export type RespostaDasNovidades = { novidades: Novidade[]; /** "rodadas" = as conferências não vieram. */ falhas: "rodadas"[] };

/** No máximo 15 linhas no Início (decisão da issue #549). */
export const MAXIMO_DE_NOVIDADES = 15;

const ACOES_NA_TAREFA: readonly string[] = ["abriu", "fechou", "reabriu", "pegou", "largou"];
const ACOES_NO_PR: readonly string[] = ["abriu", "mesclou", "fechou", "fechou-sem-mesclar", "reabriu"];

const ehNumero = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;
const ehTexto = (t: unknown): t is string => typeof t === "string" && t.length > 0;

/** Confere o formato de uma novidade que veio do worker: fora do combinado, a página trata como erro. */
export function ehNovidade(n: unknown): n is Novidade {
  if (typeof n !== "object" || n === null) return false;
  const o = n as Record<string, unknown>;
  if (!ehTexto(o.id) || !ehTexto(o.quando) || Number.isNaN(Date.parse(o.quando))) return false;
  if (o.url !== undefined && typeof o.url !== "string") return false;
  if (o.titulo !== undefined && typeof o.titulo !== "string") return false;
  if (o.tipo === "tarefa") return ACOES_NA_TAREFA.includes(o.acao as string) && ehTexto(o.quem) && ehNumero(o.numero) && (o.alvo === undefined || ehTexto(o.alvo));
  if (o.tipo === "pr") return ACOES_NO_PR.includes(o.acao as string) && ehTexto(o.quem) && ehNumero(o.numero);
  if (o.tipo === "rodada") return typeof o.passou === "boolean" && ehTexto(o.nome) && (o.numero === undefined || ehNumero(o.numero));
  return false;
}

/** O mesmo dia de calendário no fuso do computador (nunca pelo dia em UTC). */
export function mesmoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * As de hoje (no fuso do computador), da mais nova pra mais velha, no máximo 15. Das rodadas da mesma
 * conferência no mesmo PR fica só a mais nova (#667), antes do corte; rodada sem PR fica uma por linha.
 */
export function novidadesDeHoje(novidades: Novidade[], agora: Date): Novidade[] {
  const vistas = new Set<string>();
  return novidades
    .filter((n) => mesmoDia(new Date(n.quando), agora))
    .sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando))
    .filter((n) => {
      if (n.tipo !== "rodada" || n.numero === undefined) return true;
      const chave = JSON.stringify([n.nome, n.numero]);
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    })
    .slice(0, MAXIMO_DE_NOVIDADES);
}

/** A frase de uma novidade, montada só do tipo, do número e de quem fez. */
export function textoDaNovidade(n: Novidade): string {
  if (n.tipo === "rodada") {
    const noPr = n.numero ? ` no PR #${n.numero}` : "";
    return `A conferência ${n.nome}${noPr} ${n.passou ? "passou" : "falhou"}`;
  }
  if (n.tipo === "pr") {
    const pr = `o PR #${n.numero}`;
    if (n.acao === "abriu") return `${n.quem} entregou ${pr}`;
    if (n.acao === "mesclou") return `${n.quem} mesclou ${pr}`;
    if (n.acao === "fechou-sem-mesclar") return `${n.quem} fechou ${pr} sem mesclar`;
    if (n.acao === "reabriu") return `${n.quem} reabriu ${pr}`;
    return `${n.quem} fechou ${pr}`;
  }
  const t = `a #${n.numero}`;
  const outra = n.alvo !== undefined && n.alvo.toLowerCase() !== n.quem.toLowerCase();
  if (n.acao === "pegou") return outra ? `${n.quem} pôs ${n.alvo} na #${n.numero}` : `${n.quem} pegou ${t}`;
  if (n.acao === "largou") {
    if (n.alvo === undefined) return `${n.quem} tirou o responsável da #${n.numero}`;
    return outra ? `${n.quem} tirou ${n.alvo} da #${n.numero}` : `${n.quem} largou ${t}`;
  }
  if (n.acao === "abriu") return `${n.quem} abriu ${t}`;
  if (n.acao === "reabriu") return `${n.quem} reabriu ${t}`;
  return `${n.quem} fechou ${t}`;
}

/** O link do título: só se for do GitHub da sakura-corp; qualquer outro vira texto sem link. */
export function linkDaNovidade(n: Novidade): string | undefined {
  return linkSeguro(n.url);
}

export type EstadoDasNovidades =
  | { tipo: "carregando" }
  /** A sessão acabou (401). */
  | { tipo: "fora" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; novidades: Novidade[]; falhas: "rodadas"[] };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não consegui ler o que mudou hoje no GitHub.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";

/** Pede /api/novidades. Resposta fora do formato combinado vale como erro, nunca como "nada mudou". */
export async function carregarNovidades(buscar: Buscar = fetch): Promise<EstadoDasNovidades> {
  let resposta: Response;
  try {
    resposta = await buscar("/api/novidades", { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok || !(resposta.headers.get("content-type") ?? "").includes("application/json")) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  let corpo: Partial<RespostaDasNovidades>;
  try {
    corpo = (await resposta.json()) as Partial<RespostaDasNovidades>;
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  const { novidades, falhas } = corpo;
  if (!Array.isArray(novidades) || !novidades.every(ehNovidade) || !Array.isArray(falhas) || !falhas.every((f) => f === "rodadas")) {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  return { tipo: "pronto", novidades, falhas };
}

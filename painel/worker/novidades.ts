// "O que mudou hoje" (#549): os eventos do repositório no GitHub, lidos na hora com o token de quem está
// logado. Nada é guardado (nem na sala): cada visita ao Início pergunta de novo.
//
// Dois pedidos REST: a lista de eventos (issue e PR) e as rodadas do Actions (as conferências). A lista de
// eventos do GitHub não traz rodada nenhuma, por isso o segundo. Se as rodadas falharem, as de issue e PR
// saem igual e a resposta diz `falhas: ["rodadas"]`; se os eventos falharem, a rota inteira falha.
//
// Daqui sai só tipo, número, quem e quando (mais o título, que a página mostra à parte); a frase é montada
// na página (`src/logica/novidades.ts`). Link só do GitHub da sakura-corp.
import { linkSeguro } from "../src/logica/link";
import type { AcaoNaTarefa, AcaoNoPr, Novidade, RespostaDasNovidades } from "../src/logica/novidades";
import { buscarRest, ORGANIZACAO, REPOSITORIO } from "./github";
import { DIA } from "../src/logica/tempo";

const REPO = `https://github.com/${ORGANIZACAO}/${REPOSITORIO}`;
export const CAMINHO_DOS_EVENTOS = `/repos/${ORGANIZACAO}/${REPOSITORIO}/events?per_page=100`;
export const CAMINHO_DAS_RODADAS = `/repos/${ORGANIZACAO}/${REPOSITORIO}/actions/runs?per_page=50`;

/** "Hoje" é decidido na página, no fuso do computador; aqui só corta o que com certeza não é hoje em fuso nenhum. */
const JANELA_MS = 2 * DIA;
const TAMANHO_DO_TITULO = 120;

const cortar = (texto: string) => (texto.length > TAMANHO_DO_TITULO ? `${texto.slice(0, TAMANHO_DO_TITULO - 1)}…` : texto);

type Objeto = Record<string, unknown>;
const objeto = (v: unknown): Objeto | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Objeto) : null);
const texto = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
const numero = (v: unknown): number | undefined => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined);

export type EventoDoGitHub = { id?: unknown; type?: unknown; created_at?: unknown; actor?: unknown; payload?: unknown };

const ACOES_DA_TAREFA: Record<string, AcaoNaTarefa> = { opened: "abriu", closed: "fechou", reopened: "reabriu", assigned: "pegou", unassigned: "largou" };

/** Um evento do GitHub vira novidade, ou `null` se não é de issue nem de PR (ou veio sem o que precisa). */
export function novidadeDoEvento(evento: EventoDoGitHub): Novidade | null {
  const id = texto(evento.id) ?? (typeof evento.id === "number" ? String(evento.id) : undefined);
  const quando = texto(evento.created_at);
  const quem = texto(objeto(evento.actor)?.login);
  const payload = objeto(evento.payload);
  if (!id || !quando || Number.isNaN(Date.parse(quando)) || !quem || !payload) return null;
  const acao = texto(payload.action);

  if (evento.type === "IssuesEvent") {
    const issue = objeto(payload.issue);
    const n = numero(issue?.number);
    const nossa = acao ? ACOES_DA_TAREFA[acao] : undefined;
    // Um PR também é "issue" pro GitHub, mas os eventos de PR vêm em PullRequestEvent.
    if (!issue || !n || !nossa || issue.pull_request !== undefined) return null;
    // Em `unassigned` o GitHub manda `assignee: null` (visto em 20/10): sem saber quem saiu, a frase fica neutra.
    const alvo = nossa === "pegou" || nossa === "largou" ? texto(objeto(payload.assignee)?.login) : undefined;
    if (nossa === "pegou" && !alvo) return null;
    return {
      id: `e${id}`, quando, tipo: "tarefa", acao: nossa, quem, numero: n,
      ...(alvo ? { alvo } : {}), ...extras(issue, `${REPO}/issues/${n}`),
    };
  }

  if (evento.type === "PullRequestEvent") {
    const pr = objeto(payload.pull_request);
    const n = numero(payload.number) ?? numero(pr?.number);
    if (!n) return null;
    let nossa: AcaoNoPr;
    // A lista de eventos manda o PR enxuto (só number, url, head, base; sem title, html_url nem merged) e a
    // mesclagem como `action: "merged"` (visto em 20/10). O `closed` com `merged` fica pro formato antigo.
    if (acao === "opened") nossa = "abriu";
    else if (acao === "merged") nossa = "mesclou";
    else if (acao === "reopened") nossa = "reabriu";
    else if (acao === "closed") {
      // O GitHub pode mandar o PR enxuto: sem `merged`, não dá pra saber se mesclou; fica só "fechou".
      const mesclado = pr?.merged === true || texto(pr?.merged_at) !== undefined;
      nossa = mesclado ? "mesclou" : pr?.merged === false ? "fechou-sem-mesclar" : "fechou";
    } else return null;
    return { id: `e${id}`, quando, tipo: "pr", acao: nossa, quem, numero: n, ...extras(pr, `${REPO}/pull/${n}`) };
  }
  return null;
}

/** O link vem do número (sempre da sakura-corp) quando o GitHub não manda `html_url`. */
function extras(item: Objeto | null, padrao: string): { url?: string; titulo?: string } {
  const url = linkSeguro(texto(item?.html_url)) ?? padrao;
  const titulo = texto(item?.title);
  return { ...(url ? { url } : {}), ...(titulo ? { titulo: cortar(titulo) } : {}) };
}

export type RodadaDasNovidades = { id?: unknown; name?: unknown; status?: unknown; conclusion?: unknown; updated_at?: unknown; html_url?: unknown; pull_requests?: unknown; display_title?: unknown };

/** Uma rodada terminada que passou ou falhou vira novidade; o resto (em andamento, cancelada, pulada) não. */
export function novidadeDaRodada(rodada: RodadaDasNovidades): Novidade | null {
  const id = numero(rodada.id);
  const nome = texto(rodada.name);
  const quando = texto(rodada.updated_at);
  if (!id || !nome || !quando || Number.isNaN(Date.parse(quando)) || rodada.status !== "completed") return null;
  const passou = rodada.conclusion === "success" ? true : rodada.conclusion === "failure" || rodada.conclusion === "timed_out" ? false : null;
  if (passou === null) return null;
  const prs = Array.isArray(rodada.pull_requests) ? rodada.pull_requests : [];
  const n = numero(objeto(prs[0])?.number);
  const url = linkSeguro(texto(rodada.html_url));
  const titulo = texto(rodada.display_title);
  return {
    id: `r${id}`, quando, tipo: "rodada", passou, nome: cortar(nome),
    ...(n ? { numero: n } : {}), ...(url ? { url } : {}), ...(titulo ? { titulo: cortar(titulo) } : {}),
  };
}

const recente = (n: Novidade, agora: number) => agora - Date.parse(n.quando) <= JANELA_MS;

/**
 * As novidades dos dois últimos dias. `sem-acesso` (401 nos eventos) e `erro` (eventos fora do ar ou fora do
 * formato) valem pra rota inteira; as rodadas que falham só entram em `falhas`.
 */
export async function buscarNovidades(token: string, agora = Date.now()): Promise<{ tipo: "ok"; resposta: RespostaDasNovidades } | { tipo: "sem-acesso" } | { tipo: "erro" }> {
  const [eventos, rodadas] = await Promise.all([
    buscarRest<unknown>(token, CAMINHO_DOS_EVENTOS),
    buscarRest<unknown>(token, CAMINHO_DAS_RODADAS).catch(() => ({ tipo: "erro" as const })),
  ]);
  if (eventos.tipo === "sem-acesso") return { tipo: "sem-acesso" };
  if (eventos.tipo !== "ok" || !Array.isArray(eventos.dados)) return { tipo: "erro" };

  const novidades: Novidade[] = [];
  for (const e of eventos.dados) {
    const n = objeto(e) ? novidadeDoEvento(e as EventoDoGitHub) : null;
    if (n && recente(n, agora)) novidades.push(n);
  }
  const listaDeRodadas = rodadas.tipo === "ok" ? objeto(rodadas.dados)?.workflow_runs : undefined;
  const falhas: "rodadas"[] = Array.isArray(listaDeRodadas) ? [] : ["rodadas"];
  for (const r of Array.isArray(listaDeRodadas) ? listaDeRodadas : []) {
    const n = objeto(r) ? novidadeDaRodada(r as RodadaDasNovidades) : null;
    if (n && recente(n, agora)) novidades.push(n);
  }
  novidades.sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando));
  return { tipo: "ok", resposta: { novidades, falhas } };
}

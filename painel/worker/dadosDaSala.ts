// A sala de verdade (#468): de onde vem cada bonequinho. Três buscas independentes, com o token de
// quem está logado; se uma falhar, só aquele grupo fica de fora (`falhas`), e a página mostra o aviso
// em vez de "livre". Aqui só o que é do GitHub; o estado (trabalhando, dormindo…) sai de
// `src/logica/sala.ts`, na página.
import { ROBOS_DA_CASA, nomeDoRoboDaCasa } from "../src/logica/sala";
import { linkSeguro } from "../src/logica/link";
import type { EntradaDaSala, RespostaDaSala, Tarefa, TipoBonequinho } from "../src/tipos";
import { buscarRest, consultar, ORGANIZACAO, REPOSITORIO } from "./github";
import { CONSULTA_DA_LEVA, CONSULTA_DAS_LEVAS, levaDosDados, levasDosDados, variaveisDoRepositorio, type DadosDaLeva, type DadosDasLevas } from "./tarefas";

const REPO = `https://github.com/${ORGANIZACAO}/${REPOSITORIO}`;
const PREFIXO_DOS_ROBOS = "claude/";
const MAXIMO_DE_RODADAS = 100;
const TAMANHO_DO_TEXTO = 80;

const cortar = (texto: string) => (texto.length > TAMANHO_DO_TEXTO ? `${texto.slice(0, TAMANHO_DO_TEXTO - 1)}…` : texto);

// ---- Robôs do Claude: uma consulta só, nos branches `claude/` ----

export const CONSULTA_DOS_ROBOS = `
query Robos($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    refs(refPrefix: "refs/heads/${PREFIXO_DOS_ROBOS}", first: 100) {
      pageInfo { hasNextPage }
      nodes {
        name
        target { ... on Commit { committedDate } }
        associatedPullRequests(first: 1, states: OPEN) {
          nodes {
            number
            title
            url
            reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } } } }
          }
        }
      }
    }
  }
}`;

export type DadosDosRobos = {
  repository: {
    refs: {
      pageInfo?: { hasNextPage?: boolean };
      nodes: ({
        name: string;
        target: { committedDate?: string } | null;
        associatedPullRequests: {
          nodes: ({
            number: number;
            title: string;
            url: string;
            reviewRequests: { nodes: ({ requestedReviewer: { login?: string } | null } | null)[] } | null;
          } | null)[];
        } | null;
      } | null)[];
    } | null;
  } | null;
};

/** `null` = a resposta não tem o que precisa (isso é falha, não "nenhum robô"). */
export function robosDoClaudeDosDados(dados: DadosDosRobos): EntradaDaSala[] | null {
  const nos = dados.repository?.refs?.nodes;
  if (!nos) return null;
  // Mais de 100 branches: a lista veio incompleta, então o grupo falha (nunca mostra metade como se fosse tudo).
  if (dados.repository?.refs?.pageInfo?.hasNextPage) return null;
  const entradas: EntradaDaSala[] = [];
  for (const no of nos) {
    if (!no || typeof no.name !== "string") continue;
    // `refPrefix` já tira "refs/heads/claude/": o nome vem sem o prefixo.
    const branch = `${PREFIXO_DOS_ROBOS}${no.name}`;
    const pr = no.associatedPullRequests?.nodes.find((p) => p !== null) ?? null;
    const revisores = (pr?.reviewRequests?.nodes ?? []).flatMap((r) => (r?.requestedReviewer?.login ? [r.requestedReviewer.login] : []));
    const entrada: EntradaDaSala = {
      id: `claude:${branch}`,
      tipo: "claude",
      nome: no.name,
      fazendo: pr ? cortar(`#${pr.number} ${pr.title}`) : branch,
      sinais: revisores.length > 0 ? { revisaoPedidaA: revisores } : {},
    };
    // Só link do GitHub da Sakura (a mesma regra da Sala); sem PR, a página do branch.
    const url = linkSeguro(pr?.url) ?? `${REPO}/tree/${branch.split("/").map(encodeURIComponent).join("/")}`;
    entrada.url = url;
    const quando = no.target?.committedDate;
    if (typeof quando === "string") entrada.ultimaAtividade = quando;
    entradas.push(entrada);
  }
  return entradas;
}

// ---- Robôs da casa: as rodadas do GitHub Actions ----

export type RodadaDoGitHub = {
  id: number;
  path?: string;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  display_title?: string;
  updated_at?: string;
  run_started_at?: string;
};

export type EsperaDeAprovacao = { current_user_can_approve?: boolean };

/** ".github/workflows/ci.yml@refs/heads/main" → "ci.yml". */
export function arquivoDoTrabalho(path: string | undefined): string | null {
  if (!path) return null;
  const arquivo = path.split("@")[0].split("/").pop();
  return arquivo && /\.ya?ml$/.test(arquivo) ? arquivo : null;
}

const EM_ANDAMENTO = ["in_progress", "queued", "requested", "waiting", "pending"];

/** A rodada mais nova de cada trabalho (a lista do GitHub já vem da mais nova pra mais velha; confere pela data). */
export function maisNovaDeCada(rodadas: RodadaDoGitHub[]): Map<string, RodadaDoGitHub> {
  const mapa = new Map<string, RodadaDoGitHub>();
  for (const r of rodadas) {
    const arquivo = arquivoDoTrabalho(r.path);
    if (!arquivo) continue;
    const atual = mapa.get(arquivo);
    if (!atual || Date.parse(r.updated_at ?? "") > Date.parse(atual.updated_at ?? "")) mapa.set(arquivo, r);
  }
  return mapa;
}

/**
 * O robô da casa de uma rodada. `podeAprovar`: a rodada está esperando aprovação e quem está olhando
 * pode dar (`current_user_can_approve` do GitHub). Rodada esperando outra pessoa fica "trabalhando".
 */
export function roboDaCasa(arquivo: string, rodada: RodadaDoGitHub | null, podeAprovar: boolean, quemEstaOlhando: string): EntradaDaSala {
  const nome = nomeDoRoboDaCasa(arquivo);
  const base: EntradaDaSala = { id: `casa:${arquivo}`, tipo: "casa", nome, sinais: {} };
  if (!rodada) {
    // Sem rodada recente: livre, e diz isso (não finge que deu certo).
    return { ...base, fazendo: "sem rodada recente", url: `${REPO}/actions/workflows/${arquivo}` };
  }
  const url = linkSeguro(rodada.html_url) ?? `${REPO}/actions/workflows/${arquivo}`;
  const quando = rodada.updated_at ?? rodada.run_started_at;
  const entrada: EntradaDaSala = { ...base, url, ...(quando ? { ultimaAtividade: quando } : {}) };
  const titulo = rodada.display_title ? cortar(rodada.display_title) : "";
  if (rodada.status === "waiting") {
    return podeAprovar
      ? { ...entrada, fazendo: "rodada esperando a sua aprovação", sinais: { rodando: true, aprovacaoEsperadaDe: [quemEstaOlhando] } }
      : { ...entrada, fazendo: "rodada esperando aprovação de outra pessoa", sinais: { rodando: true } };
  }
  if (rodada.status !== null && EM_ANDAMENTO.includes(rodada.status)) {
    return { ...entrada, fazendo: titulo ? `rodando: ${titulo}` : "rodando", sinais: { rodando: true } };
  }
  if (rodada.conclusion === "success") return { ...entrada, fazendo: "última rodada deu certo", sinais: { ultimaRodada: "deu-certo" } };
  if (rodada.conclusion === "failure" || rodada.conclusion === "timed_out" || rodada.conclusion === "startup_failure") {
    return { ...entrada, fazendo: "a última rodada falhou", sinais: { ultimaRodada: "falhou" } };
  }
  // cancelada, pulada, neutra: não é erro nem sucesso
  return { ...entrada, fazendo: "última rodada foi cancelada ou pulada" };
}

type Resultado<T> = { tipo: "ok"; dados: T } | { tipo: "sem-acesso" } | { tipo: "erro" };

/** Uma busca REST que não achou nada (404) onde devia achar é falha. */
const comoFalha = <T,>(r: Exclude<Awaited<ReturnType<typeof buscarRest<T>>>, { tipo: "ok" }>): Resultado<never> =>
  r.tipo === "sem-acesso" ? r : { tipo: "erro" };

/**
 * Os robôs da casa. Os seis trabalhos fixos sempre aparecem: um que não está entre as últimas 100
 * rodadas é buscado sozinho (senão ficaria "livre" escondendo, por exemplo, um backup que falha).
 * Qualquer busca que falhe derruba o grupo todo.
 */
export async function robosDaCasa(token: string, quemEstaOlhando: string): Promise<Resultado<EntradaDaSala[]>> {
  const base = `/repos/${ORGANIZACAO}/${REPOSITORIO}/actions`;
  const lista = await buscarRest<{ workflow_runs?: RodadaDoGitHub[] }>(token, `${base}/runs?per_page=${MAXIMO_DE_RODADAS}`);
  if (lista.tipo !== "ok") return comoFalha(lista);
  if (!Array.isArray(lista.dados.workflow_runs)) return { tipo: "erro" };
  const maisNovas = maisNovaDeCada(lista.dados.workflow_runs);

  const faltam = ROBOS_DA_CASA.map((r) => r.arquivo).filter((a) => !maisNovas.has(a));
  const buscadas = await Promise.all(
    faltam.map(async (arquivo) => ({ arquivo, r: await buscarRest<{ workflow_runs?: RodadaDoGitHub[] }>(token, `${base}/workflows/${encodeURIComponent(arquivo)}/runs?per_page=1`) })),
  );
  for (const { arquivo, r } of buscadas) {
    // 404 = o arquivo do trabalho não existe (mais): fica sem rodada, não é falha do GitHub.
    if (r.tipo === "sem-acesso") return r;
    if (r.tipo === "nao-existe") continue;
    if (r.tipo === "erro") return r;
    const rodada = r.dados.workflow_runs?.[0];
    if (rodada) maisNovas.set(arquivo, { ...rodada, path: rodada.path ?? `.github/workflows/${arquivo}` });
  }

  // As que estão esperando aprovação: pergunta ao GitHub se quem está olhando pode aprovar.
  const entradas = await Promise.all(
    [...new Set([...ROBOS_DA_CASA.map((r) => r.arquivo), ...maisNovas.keys()])].map(async (arquivo) => {
      const rodada = maisNovas.get(arquivo) ?? null;
      if (rodada?.status !== "waiting") return { ok: true as const, entrada: roboDaCasa(arquivo, rodada, false, quemEstaOlhando) };
      const espera = await buscarRest<EsperaDeAprovacao[]>(token, `${base}/runs/${rodada.id}/pending_deployments`);
      if (espera.tipo !== "ok" || !Array.isArray(espera.dados)) return { ok: false as const, resultado: espera.tipo === "ok" ? ({ tipo: "erro" } as const) : comoFalha(espera) };
      return { ok: true as const, entrada: roboDaCasa(arquivo, rodada, espera.dados.some((e) => e.current_user_can_approve === true), quemEstaOlhando) };
    }),
  );
  const ruim = entradas.find((e) => !e.ok);
  if (ruim && !ruim.ok) return ruim.resultado;
  return { tipo: "ok", dados: entradas.flatMap((e) => (e.ok ? [e.entrada] : [])) };
}

// ---- Pessoas: quem tem tarefa na leva atual (a mesma busca da tarefa 6) ----

/** Uma pessoa por responsável; "trabalhando" se tem tarefa em andamento ou em revisão. */
export function pessoasDasTarefas(tarefas: Tarefa[]): EntradaDaSala[] {
  const porLogin = new Map<string, { avatar: string; tarefas: Tarefa[] }>();
  for (const t of tarefas) {
    if (!t.dono) continue;
    const p = porLogin.get(t.dono.login) ?? { avatar: t.dono.avatar, tarefas: [] };
    p.tarefas.push(t);
    porLogin.set(t.dono.login, p);
  }
  return [...porLogin].map(([login, p]) => {
    const ativas = p.tarefas.filter((t) => t.estado === "andamento" || t.estado === "revisao");
    const entrada: EntradaDaSala = { id: `pessoa:${login}`, tipo: "pessoa", nome: login, sinais: { tarefaEmAndamento: ativas.length > 0 } };
    if (p.avatar) entrada.avatar = p.avatar;
    const primeira = ativas[0];
    if (primeira) {
      entrada.fazendo = cortar(`#${primeira.numero} ${primeira.titulo}`) + (ativas.length > 1 ? ` (+${ativas.length - 1})` : "");
      entrada.url = primeira.url;
    } else {
      entrada.fazendo = "sem tarefa agora";
    }
    return entrada;
  });
}

async function pessoas(token: string): Promise<Resultado<{ entradas: EntradaDaSala[]; leva: number | null }>> {
  const levas = await consultar<DadosDasLevas>(token, CONSULTA_DAS_LEVAS, variaveisDoRepositorio);
  if (levas.tipo !== "ok") return levas;
  const { atual } = levasDosDados(levas.dados);
  // Sem nenhuma leva ainda: não há de quem falar, e isso não é falha.
  if (atual === null) return { tipo: "ok", dados: { entradas: [], leva: null } };
  const tarefas = await consultar<DadosDaLeva>(token, CONSULTA_DA_LEVA, { ...variaveisDoRepositorio, etiqueta: `leva-${atual}` });
  if (tarefas.tipo !== "ok") return tarefas;
  const leva = levaDosDados(atual, tarefas.dados);
  if (!leva) return { tipo: "erro" };
  return { tipo: "ok", dados: { entradas: pessoasDasTarefas(leva.tarefas), leva: atual } };
}

async function robosDoClaude(token: string): Promise<Resultado<EntradaDaSala[]>> {
  const r = await consultar<DadosDosRobos>(token, CONSULTA_DOS_ROBOS, variaveisDoRepositorio);
  if (r.tipo !== "ok") return r;
  const entradas = robosDoClaudeDosDados(r.dados);
  return entradas ? { tipo: "ok", dados: entradas } : { tipo: "erro" };
}

/** Tenta uma busca; uma exceção (rede) conta como falha daquele grupo. */
async function tentar<T>(f: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await f();
  } catch {
    return { tipo: "erro" };
  }
}

/**
 * A sala inteira. `sem-acesso` (o GitHub recusou o token) em qualquer busca = a sessão acabou.
 * As três falhando (sem outra explicação) = `erro`: não há nada de verdade pra mostrar.
 */
export async function buscarSala(token: string, quemEstaOlhando: string): Promise<{ tipo: "ok"; sala: RespostaDaSala } | { tipo: "sem-acesso" } | { tipo: "erro" }> {
  const [claude, casa, gente] = await Promise.all([
    tentar(() => robosDoClaude(token)),
    tentar(() => robosDaCasa(token, quemEstaOlhando)),
    tentar(() => pessoas(token)),
  ]);
  if ([claude, casa, gente].some((r) => r.tipo === "sem-acesso")) return { tipo: "sem-acesso" };
  const falhas: TipoBonequinho[] = [];
  const entradas: EntradaDaSala[] = [];
  if (gente.tipo === "ok") entradas.push(...gente.dados.entradas);
  else falhas.push("pessoa");
  if (claude.tipo === "ok") entradas.push(...claude.dados);
  else falhas.push("claude");
  if (casa.tipo === "ok") entradas.push(...casa.dados);
  else falhas.push("casa");
  if (falhas.length === 3) return { tipo: "erro" };
  return { tipo: "ok", sala: { entradas, falhas, leva: gente.tipo === "ok" ? gente.dados.leva : null } };
}

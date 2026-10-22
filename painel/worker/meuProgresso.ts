// O "Meu progresso" (#734): as tarefas feitas e os PRs mesclados de UMA pessoa, em todos os projetos (o SSACE e os
// secundários, #731). Conta pela tarefa (quem é o responsável) e pelo PR (quem abriu), nunca por commit: o que uma
// sessão do Claude faz fica no nome "claude" nos commits.
// Quem vê o quê: cada pessoa vê só o seu; a dona (env.DONA_DO_FINANCEIRO, a Sofia) escolhe a pessoa com ?pessoa=.
// Quem pede vem SEMPRE da sessão, nunca da página. O texto da issue só serve pra ler a estimativa: não sai daqui.
import { chefeDaEtiqueta } from "../src/logica/comecarComClaude";
import { lerEstimativa, numeroDaLeva } from "../src/logica/estado";
import { linkSeguro } from "../src/logica/link";
import type { PrMesclado, RespostaDoMeuProgresso, TarefaEntregue } from "../src/tipos";
import { ehDona } from "./financeiro";
import { ORGANIZACAO, REPOSITORIO } from "./github";
import { CONSULTA_DOS_PROJETOS, projetosDosDados, variaveisDosProjetos, type Consultar, type DadosDosProjetos } from "./projetos";

/** No máximo isto de páginas de 100 em cada busca (tarefas e PRs); com mais, a resposta vem `cortada`. */
export const LIMITE_DE_PAGINAS = 5;

/** Login do GitHub: letras, números e hífen simples no meio, até 39. Só login assim entra no texto da busca. */
export function loginValido(login: unknown): login is string {
  return typeof login === "string" && /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(login);
}

/**
 * De quem são os números. Sem `pedida` (ou com o próprio login): de quem está logado. Outra pessoa: só a dona;
 * pra qualquer outra, recusa. Dona sem variável configurada = ninguém (falha fechada, como no Financeiro).
 */
export function quemVer(
  login: string,
  pedida: string | null,
  dona: string | undefined,
): { tipo: "ok"; login: string; dona: boolean } | { tipo: "recusado" } | { tipo: "invalido" } {
  const ehADona = ehDona(login, dona);
  if (!pedida || pedida.toLowerCase() === login.toLowerCase()) return { tipo: "ok", login, dona: ehADona };
  if (!ehADona) return { tipo: "recusado" };
  if (!loginValido(pedida)) return { tipo: "invalido" };
  return { tipo: "ok", login: pedida, dona: true };
}

// As tarefas fechadas no nome da pessoa, na organização inteira; o filtro do projeto, da leva e do "concluída" é aqui.
export const CONSULTA_DAS_TAREFAS_FEITAS = `
query TarefasFeitas($busca: String!, $depois: String) {
  search(query: $busca, type: ISSUE, first: 100, after: $depois) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on Issue {
        number
        title
        url
        closedAt
        stateReason
        body
        repository { name }
        labels(first: 30) { nodes { name } }
        assignees(first: 10) { nodes { login } }
        timelineItems(itemTypes: [ASSIGNED_EVENT], last: 20) { nodes { ... on AssignedEvent { createdAt assignee { ... on User { login } } } } }
        closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { createdAt author { login } } }
      }
    }
  }
}`;

export const CONSULTA_DOS_PRS_MESCLADOS = `
query PrsMesclados($busca: String!, $depois: String) {
  search(query: $busca, type: ISSUE, first: 100, after: $depois) {
    pageInfo { hasNextPage endCursor }
    nodes { ... on PullRequest { number mergedAt repository { name } } }
  }
}`;

// Só pra dona: as pessoas da organização, pra ela escolher de quem ver.
export const CONSULTA_DAS_PESSOAS = `
query Pessoas($dono: String!) {
  organization(login: $dono) { membersWithRole(first: 100) { nodes { login } } }
}`;

export const buscaDasTarefas = (login: string) => `org:${ORGANIZACAO} is:issue is:closed assignee:${login}`;
export const buscaDosPrs = (login: string) => `org:${ORGANIZACAO} is:pr is:merged author:${login}`;

export type IssueFeita = {
  number: number;
  title: string;
  url: string;
  closedAt: string | null;
  stateReason?: string | null;
  body: string | null;
  repository: { name: string } | null;
  labels: { nodes: ({ name: string } | null)[] | null } | null;
  assignees: { nodes: ({ login: string } | null)[] | null } | null;
  timelineItems: { nodes: ({ createdAt?: string; assignee?: { login?: string } | null } | null)[] | null } | null;
  closedByPullRequestsReferences: { nodes: ({ createdAt: string; author?: { login: string } | null } | null)[] | null } | null;
};
export type PrDaBusca = { number: number; mergedAt: string | null; repository: { name: string } | null };
type Pagina<T> = { search: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: (T | null)[] | null } | null };

const tempo = (iso: string | undefined | null) => (iso ? Date.parse(iso) : NaN);

/**
 * As tarefas feitas: fechadas como concluídas, com etiqueta `leva-N`, com a pessoa entre os responsáveis e de um dos
 * `projetos`, sem repetir. O PR é o primeiro que a PRÓPRIA pessoa abriu (o PR largado de outra não conta); o "pegou" é
 * a última vez que ela foi posta como responsável antes dele (sem PR, a última).
 */
export function tarefasDosDados(nodes: (IssueFeita | null)[], login: string, projetos: Set<string>): TarefaEntregue[] {
  const eu = login.toLowerCase();
  const tarefas: TarefaEntregue[] = [];
  const vistas = new Set<string>();
  for (const i of nodes) {
    if (!i || !i.repository || !projetos.has(i.repository.name)) continue;
    const chave = `${i.repository.name}#${i.number}`;
    if (vistas.has(chave)) continue;
    if (i.stateReason !== "COMPLETED" || !i.closedAt || Number.isNaN(tempo(i.closedAt))) continue;
    const etiquetas = (i.labels?.nodes ?? []).filter((l) => l !== null).map((l) => l.name);
    if (!etiquetas.some((e) => numeroDaLeva(e) !== null)) continue;
    if (!(i.assignees?.nodes ?? []).some((a) => a?.login.toLowerCase() === eu)) continue;
    vistas.add(chave);
    const repositorio = i.repository.name;
    const tarefa: TarefaEntregue = {
      repositorio,
      numero: i.number,
      titulo: i.title,
      url: linkSeguro(i.url) ?? `https://github.com/${ORGANIZACAO}/${repositorio}/issues/${i.number}`,
      feitaEm: i.closedAt,
    };
    const estimativa = lerEstimativa(i.body);
    if (estimativa !== undefined) tarefa.estimativaHoras = estimativa;
    const chefe = etiquetas.map(chefeDaEtiqueta).find((c) => c !== undefined);
    if (chefe) tarefa.chefe = chefe;
    const prs = (i.closedByPullRequestsReferences?.nodes ?? []).filter((p) => p !== null && p.author?.login.toLowerCase() === eu && !Number.isNaN(tempo(p.createdAt)));
    const primeiroPr = prs.sort((a, b) => tempo(a!.createdAt) - tempo(b!.createdAt))[0];
    const limite = primeiroPr ? tempo(primeiroPr.createdAt) : Infinity;
    const atribuicoes = (i.timelineItems?.nodes ?? [])
      .filter((e) => e?.assignee?.login?.toLowerCase() === eu && !Number.isNaN(tempo(e.createdAt)) && tempo(e.createdAt) <= limite)
      .sort((a, b) => tempo(a!.createdAt) - tempo(b!.createdAt));
    const pegou = atribuicoes[atribuicoes.length - 1]?.createdAt;
    if (pegou) tarefa.pegouEm = pegou;
    if (primeiroPr) tarefa.prAbertoEm = primeiroPr.createdAt;
    tarefas.push(tarefa);
  }
  return tarefas;
}

/** Os PRs mesclados dos `projetos`, sem repetir. */
export function prsDosDados(nodes: (PrDaBusca | null)[], projetos: Set<string>): PrMesclado[] {
  const vistos = new Set<string>();
  const prs: PrMesclado[] = [];
  for (const p of nodes) {
    if (!p || !p.repository || !projetos.has(p.repository.name) || !p.mergedAt || Number.isNaN(tempo(p.mergedAt))) continue;
    const chave = `${p.repository.name}#${p.number}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    prs.push({ repositorio: p.repository.name, numero: p.number, mescladoEm: p.mergedAt });
  }
  return prs;
}

type Resultado<T> = { tipo: "ok"; dados: T } | { tipo: "sem-acesso" } | { tipo: "erro" };

/** Todas as páginas de uma busca, até LIMITE_DE_PAGINAS. */
async function buscarPaginas<T>(consultar: Consultar, consulta: string, busca: string): Promise<Resultado<{ nodes: (T | null)[]; cortada: boolean }>> {
  const nodes: (T | null)[] = [];
  let depois: string | null = null;
  for (let pagina = 0; pagina < LIMITE_DE_PAGINAS; pagina++) {
    const r: Resultado<Pagina<T>> = await consultar<Pagina<T>>(consulta, { busca, depois });
    if (r.tipo !== "ok") return r;
    const s: Pagina<T>["search"] = r.dados.search;
    if (!s) return { tipo: "erro" };
    nodes.push(...(s.nodes ?? []));
    if (!s.pageInfo.hasNextPage || !s.pageInfo.endCursor) return { tipo: "ok", dados: { nodes, cortada: false } };
    depois = s.pageInfo.endCursor;
  }
  return { tipo: "ok", dados: { nodes, cortada: true } };
}

/**
 * Os números de `login` (já conferido por `quemVer`). `dona`: também a lista de pessoas pra escolher (se ela falhar,
 * a lista vem vazia e o resto segue).
 */
export async function buscarMeuProgresso(consultar: Consultar, login: string, dona: boolean): Promise<Resultado<RespostaDoMeuProgresso>> {
  if (!loginValido(login)) return { tipo: "erro" };
  const rp = await consultar<DadosDosProjetos>(CONSULTA_DOS_PROJETOS, variaveisDosProjetos);
  if (rp.tipo !== "ok") return rp;
  const projetos = new Set([REPOSITORIO, ...projetosDosDados(rp.dados).projetos.map((p) => p.repositorio)]);

  const rt = await buscarPaginas<IssueFeita>(consultar, CONSULTA_DAS_TAREFAS_FEITAS, buscaDasTarefas(login));
  if (rt.tipo !== "ok") return rt;
  const rpr = await buscarPaginas<PrDaBusca>(consultar, CONSULTA_DOS_PRS_MESCLADOS, buscaDosPrs(login));
  if (rpr.tipo !== "ok") return rpr;

  const resposta: RespostaDoMeuProgresso = { login, tarefas: tarefasDosDados(rt.dados.nodes, login, projetos), prs: prsDosDados(rpr.dados.nodes, projetos) };
  if (rt.dados.cortada || rpr.dados.cortada) resposta.cortada = true;
  if (dona) {
    let pessoas: string[] = [];
    try {
      const r = await consultar<{ organization: { membersWithRole: { nodes: ({ login: string } | null)[] | null } | null } | null }>(CONSULTA_DAS_PESSOAS, { dono: ORGANIZACAO });
      if (r.tipo === "ok") {
        pessoas = (r.dados.organization?.membersWithRole?.nodes ?? [])
          .map((n) => n?.login)
          .filter(loginValido)
          .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
      }
    } catch {
      console.error("meu progresso: falha ao buscar as pessoas");
    }
    resposta.pessoas = pessoas;
  }
  return { tipo: "ok", dados: resposta };
}

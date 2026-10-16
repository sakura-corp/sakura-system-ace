// As tarefas de verdade (#354): as consultas ao GitHub e a conversão pro formato `Tarefa` da página.
// O texto da issue só serve pra ler a estimativa: não vai pra página.
import { estadoDaTarefa, lerEstimativa, levaAtual, numeroDaLeva } from "../src/logica/estado";
import { linkSeguro } from "../src/logica/link";
import type { Leva, RespostaDaLeva, RespostaDasLevas, Tarefa } from "../src/tipos";
import { ORGANIZACAO, REPOSITORIO } from "./github";

/** Uma consulta só pra cada leva; o GitHub devolve no máximo 100 issues por página. */
export const MAXIMO_DE_TAREFAS = 100;

export const CONSULTA_DAS_LEVAS = `
query Levas($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    labels(first: 100, query: "leva-") {
      nodes { name issues(states: OPEN) { totalCount } }
    }
  }
}`;

export const CONSULTA_DA_LEVA = `
query Leva($dono: String!, $nome: String!, $etiqueta: String!) {
  repository(owner: $dono, name: $nome) {
    issues(first: ${MAXIMO_DE_TAREFAS}, labels: [$etiqueta], states: [OPEN, CLOSED], orderBy: { field: CREATED_AT, direction: ASC }) {
      totalCount
      nodes {
        number
        title
        url
        state
        body
        assignees(first: 1) { nodes { login avatarUrl(size: 40) } }
        closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { url state } }
      }
    }
  }
}`;

export const variaveisDoRepositorio = { dono: ORGANIZACAO, nome: REPOSITORIO };

export type DadosDasLevas = {
  repository: { labels: { nodes: ({ name: string; issues: { totalCount: number } } | null)[] } | null } | null;
};

export type IssueDoGitHub = {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  body: string | null;
  assignees: { nodes: ({ login: string; avatarUrl: string } | null)[] };
  closedByPullRequestsReferences: { nodes: ({ url: string; state: "OPEN" | "CLOSED" | "MERGED" } | null)[] } | null;
};

export type DadosDaLeva = {
  repository: { issues: { totalCount: number; nodes: (IssueDoGitHub | null)[] } } | null;
};

export function levasDosDados(dados: DadosDasLevas): RespostaDasLevas {
  const levas: Leva[] = [];
  for (const no of dados.repository?.labels?.nodes ?? []) {
    if (!no) continue;
    const numero = numeroDaLeva(no.name);
    if (numero !== null) levas.push({ numero, nome: `Leva ${numero}`, abertas: no.issues.totalCount });
  }
  levas.sort((a, b) => a.numero - b.numero);
  return { levas, atual: levaAtual(levas) };
}

const linkDaIssue = (numero: number) => `https://github.com/${ORGANIZACAO}/${REPOSITORIO}/issues/${numero}`;

export function tarefaDaIssue(issue: IssueDoGitHub): Tarefa {
  const dono = issue.assignees.nodes.find((a) => a !== null) ?? undefined;
  const prs = (issue.closedByPullRequestsReferences?.nodes ?? []).filter((p) => p !== null);
  const prAberto = prs.find((p) => p.state === "OPEN");
  const prDoLink = prAberto ?? prs.find((p) => p.state === "MERGED");
  const tarefa: Tarefa = {
    numero: issue.number,
    titulo: issue.title,
    // Só link do GitHub da Sakura (a mesma regra da Sala); se vier outro, monta pelo número.
    url: linkSeguro(issue.url) ?? linkDaIssue(issue.number),
    estado: estadoDaTarefa({ fechada: issue.state === "CLOSED", temResponsavel: dono !== undefined, temPrAberto: prAberto !== undefined }),
  };
  if (dono) tarefa.dono = { login: dono.login, avatar: dono.avatarUrl.startsWith("https://") ? dono.avatarUrl : "" };
  const estimativa = lerEstimativa(issue.body);
  if (estimativa !== undefined) tarefa.estimativaHoras = estimativa;
  const prUrl = linkSeguro(prDoLink?.url);
  if (prUrl) tarefa.prUrl = prUrl;
  return tarefa;
}

export function levaDosDados(numero: number, dados: DadosDaLeva): RespostaDaLeva | null {
  const issues = dados.repository?.issues;
  if (!issues) return null;
  const tarefas = issues.nodes.filter((i) => i !== null).map(tarefaDaIssue);
  return { numero, tarefas, cortada: issues.totalCount > tarefas.length };
}

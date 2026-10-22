// Os projetos secundários (#731): os repositórios da sakura-corp com o tópico `projeto-secundario`, cada um com as
// suas levas, e as propostas (issues do `secundarios`). Nada de lista no código: o painel descobre os projetos pelo
// tópico, com o token de quem olha (repositório que o login não alcança não aparece).
// Só nomes, contagens, títulos e links: o texto das issues não sai daqui.
import { numeroDaLeva } from "../src/logica/estado";
import { linkSeguro } from "../src/logica/link";
import {
  ESTADOS_DA_PROPOSTA,
  type EstadoDaProposta,
  type Leva,
  type Projeto,
  type Proposta,
  type RespostaDaLevaDoProjeto,
  type RespostaDasPropostas,
  type RespostaDosProjetos,
} from "../src/tipos";
import { ORGANIZACAO, REPOSITORIO } from "./github";
import { CONSULTA_DA_LEVA, levaDosDados, marcarDependenciasAbertas, variaveisDe, type DadosDaLeva, type PerguntarAoGitHub } from "./tarefas";

export const TOPICO_DOS_PROJETOS = "projeto-secundario";
/** O repositório das propostas: tem o tópico só se alguém puser, mas nunca é um projeto. */
export const REPOSITORIO_DAS_PROPOSTAS = "secundarios";
/** Os repositórios da organização olhados numa consulta só. */
export const MAXIMO_DE_REPOSITORIOS = 100;
/** As propostas olhadas (as atualizadas por último). */
export const MAXIMO_DE_PROPOSTAS = 50;
/** No máximo isto de repositórios na conferência da "uma por vez" (os projetos e o SSACE). */
export const MAXIMO_DE_REPOSITORIOS_NA_REGRA = 30;

/** Nome de repositório do GitHub: letras, números, ponto, hífen e sublinhado; nunca "." nem "..". */
export function repositorioValido(nome: unknown): nome is string {
  return typeof nome === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(nome) && nome !== "." && nome !== "..";
}

/** /api/projetos/<repo>/<resto> → o repositório (já validado) e o resto; outro caminho → null. */
export function projetoDoCaminho(caminho: string): { repositorio: string; resto: string } | null {
  const achou = /^\/api\/projetos\/([^/]{1,100})\/(.+)$/.exec(caminho);
  if (!achou || !repositorioValido(achou[1])) return null;
  return { repositorio: achou[1], resto: achou[2] };
}

export const variaveisDosProjetos = { dono: ORGANIZACAO };

// Os repositórios da organização, com os tópicos e as etiquetas `leva-` (as contagens, como a CONSULTA_DAS_LEVAS).
export const CONSULTA_DOS_PROJETOS = `
query Projetos($dono: String!) {
  organization(login: $dono) {
    repositories(first: ${MAXIMO_DE_REPOSITORIOS}, orderBy: { field: NAME, direction: ASC }) {
      totalCount
      nodes {
        name
        description
        url
        isArchived
        repositoryTopics(first: 20) { nodes { topic { name } } }
        labels(first: 100, query: "leva-") {
          nodes { name issues(states: OPEN) { totalCount } fechadas: issues(states: CLOSED) { totalCount } }
        }
      }
    }
  }
}`;

export type RepositorioDoGitHub = {
  name: string;
  description: string | null;
  url: string;
  isArchived: boolean;
  repositoryTopics: { nodes: ({ topic: { name: string } | null } | null)[] | null } | null;
  labels: { nodes: ({ name: string; issues: { totalCount: number }; fechadas?: { totalCount: number } } | null)[] | null } | null;
};

export type DadosDosProjetos = {
  organization?: { repositories: { totalCount: number; nodes: (RepositorioDoGitHub | null)[] | null } | null } | null;
};

/** A leva atual de um projeto secundário: a menor `leva-N` com tarefa aberta (sem as fases do SSACE); null se nenhuma. */
export function levaAtualDoProjeto(levas: Leva[]): number | null {
  const abertas = levas.filter((l) => l.abertas > 0).map((l) => l.numero);
  return abertas.length > 0 ? Math.min(...abertas) : null;
}

function projetoDoRepositorio(r: RepositorioDoGitHub): Projeto {
  const levas: Leva[] = [];
  for (const no of r.labels?.nodes ?? []) {
    const numero = no ? numeroDaLeva(no.name) : null;
    if (no && numero !== null) levas.push({ numero, nome: `Leva ${numero}`, abertas: no.issues.totalCount, fechadas: no.fechadas?.totalCount ?? 0 });
  }
  levas.sort((a, b) => a.numero - b.numero);
  const projeto: Projeto = {
    repositorio: r.name,
    nome: r.name,
    url: linkSeguro(r.url) ?? `https://github.com/${ORGANIZACAO}/${r.name}`,
    levas,
    atual: levaAtualDoProjeto(levas),
  };
  const descricao = (r.description ?? "").trim();
  if (descricao) projeto.descricao = descricao.slice(0, 300);
  return projeto;
}

/** Os projetos: só com o tópico, não arquivados, de nome válido, e nunca o SSACE nem o `secundarios`. */
export function projetosDosDados(dados: DadosDosProjetos): RespostaDosProjetos {
  const repositorios = dados?.organization?.repositories;
  if (!repositorios) return { projetos: [] };
  const vieram = repositorios.nodes ?? [];
  const projetos = vieram
    .filter((r) => r !== null)
    .filter((r) => !r.isArchived && repositorioValido(r.name) && r.name !== REPOSITORIO && r.name !== REPOSITORIO_DAS_PROPOSTAS)
    .filter((r) => (r.repositoryTopics?.nodes ?? []).some((t) => t?.topic?.name === TOPICO_DOS_PROJETOS))
    .map(projetoDoRepositorio);
  const resposta: RespostaDosProjetos = { projetos };
  if (repositorios.totalCount > vieram.length) resposta.cortada = true;
  return resposta;
}

type Consultar = <T>(consulta: string, variaveis: Record<string, unknown>) => Promise<{ tipo: "ok"; dados: T } | { tipo: "sem-acesso" } | { tipo: "erro" }>;

/**
 * A leva atual de um projeto (/api/projetos/<repo>/leva). Confere antes que o repositório é mesmo um projeto (pela
 * lista do tópico): `nao-existe` se não for (ou se o login não alcança). Sem leva com tarefa aberta, `leva` vem null.
 */
export async function buscarLevaDoProjeto(
  repositorio: string,
  consultar: Consultar,
): Promise<{ tipo: "ok"; dados: RespostaDaLevaDoProjeto } | { tipo: "nao-existe" } | { tipo: "sem-acesso" } | { tipo: "erro" }> {
  const r = await consultar<DadosDosProjetos>(CONSULTA_DOS_PROJETOS, variaveisDosProjetos);
  if (r.tipo !== "ok") return r;
  const projeto = projetosDosDados(r.dados).projetos.find((p) => p.repositorio === repositorio);
  if (!projeto) return { tipo: "nao-existe" };
  const base = { repositorio, levas: projeto.levas, atual: projeto.atual };
  if (projeto.atual === null) return { tipo: "ok", dados: { ...base, leva: null } };
  const r2 = await consultar<DadosDaLeva>(CONSULTA_DA_LEVA, { ...variaveisDe(repositorio), etiqueta: `leva-${projeto.atual}` });
  if (r2.tipo !== "ok") return r2;
  const leva = levaDosDados(projeto.atual, r2.dados, repositorio);
  if (!leva) return { tipo: "erro" };
  // As dependências de fora da leva: se essa consulta falhar, contam como abertas e a leva sai igual.
  await marcarDependenciasAbertas(leva, r2.dados, consultar as PerguntarAoGitHub, repositorio);
  return { tipo: "ok", dados: { ...base, leva } };
}

// ---- As propostas (issues do `secundarios` com a etiqueta `proposta`) ----

export const variaveisDasPropostas = { dono: ORGANIZACAO, nome: REPOSITORIO_DAS_PROPOSTAS };

export const CONSULTA_DAS_PROPOSTAS = `
query Propostas($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    issues(first: ${MAXIMO_DE_PROPOSTAS}, labels: ["proposta"], states: [OPEN, CLOSED], orderBy: { field: UPDATED_AT, direction: DESC }) {
      totalCount
      nodes { number title url state updatedAt labels(first: 20) { nodes { name } } }
    }
  }
}`;

type IssueDaProposta = { number: number; title: string; url: string; state: "OPEN" | "CLOSED"; updatedAt: string; labels: { nodes: ({ name: string } | null)[] | null } | null };

export type DadosDasPropostas = { repository: { issues: { totalCount: number; nodes: (IssueDaProposta | null)[] | null } } | null };

/** O estado pela etiqueta `proposta:<estado>`. Nenhuma, uma desconhecida, ou mais de uma = null (a página diz "sem estado"). */
function estadoDaProposta(etiquetas: string[]): EstadoDaProposta | null {
  const estados = etiquetas.filter((e) => e.startsWith("proposta:")).map((e) => e.slice("proposta:".length));
  if (estados.length !== 1) return null;
  return ESTADOS_DA_PROPOSTA.find((e) => e === estados[0]) ?? null;
}

/** As propostas, na ordem do GitHub (a atualizada por último primeiro). Sem o repositório: lista vazia e `semAcesso`. */
export function propostasDosDados(dados: DadosDasPropostas): RespostaDasPropostas {
  const issues = dados?.repository?.issues;
  if (!issues) return { propostas: [], semAcesso: true };
  const vieram = issues.nodes ?? [];
  const propostas: Proposta[] = vieram.filter((i) => i !== null).map((i) => ({
    numero: i.number,
    titulo: i.title,
    url: linkSeguro(i.url) ?? `https://github.com/${ORGANIZACAO}/${REPOSITORIO_DAS_PROPOSTAS}/issues/${i.number}`,
    estado: estadoDaProposta((i.labels?.nodes ?? []).map((l) => l?.name ?? "")),
    aberta: i.state === "OPEN",
    atualizadaEm: i.updatedAt,
  }));
  const resposta: RespostaDasPropostas = { propostas };
  if (issues.totalCount > vieram.length) resposta.cortada = true;
  return resposta;
}

// ---- "Uma tarefa por vez no total" (#731): o que a pessoa segura em cada repositório ----

/** Uma tarefa em andamento da pessoa: aberta, com etiqueta `leva-N`, sem PR aberto (com PR aberto já pode pegar outra). */
export type TarefaSegurada = { repositorio: string; numero: number };

/**
 * Uma consulta só, com um apelido `r<i>` por repositório: as issues abertas em que a pessoa é responsável. O nome entra
 * no texto da consulta, então só nome válido entra (e com aspas do JSON); o login vai como variável.
 */
export function consultaDasTarefasDaPessoa(repositorios: string[]): string {
  const validos = repositorios.filter(repositorioValido).slice(0, MAXIMO_DE_REPOSITORIOS_NA_REGRA);
  const linhas = validos.map(
    (nome, i) =>
      `  r${i}: repository(owner: $dono, name: ${JSON.stringify(nome)}) {\n` +
      `    issues(first: 50, states: OPEN, filterBy: { assignee: $login }) {\n` +
      `      nodes { number labels(first: 30) { nodes { name } } closedByPullRequestsReferences(first: 10) { nodes { state } } }\n` +
      `    }\n  }`,
  );
  return `
query TarefasDaPessoa($dono: String!, $login: String!) {
${linhas.join("\n")}
}`;
}

type IssueDaPessoa = {
  number: number;
  labels: { nodes: ({ name: string } | null)[] | null } | null;
  closedByPullRequestsReferences: { nodes: ({ state: string } | null)[] | null } | null;
};
export type DadosDasTarefasDaPessoa = Record<string, { issues: { nodes: (IssueDaPessoa | null)[] | null } | null } | null>;

/** As tarefas em andamento, na ordem dos repositórios. Repositório que não veio (sem acesso) fica de fora. */
export function tarefasSeguradasDosDados(repositorios: string[], dados: DadosDasTarefasDaPessoa | null | undefined): TarefaSegurada[] {
  const validos = repositorios.filter(repositorioValido).slice(0, MAXIMO_DE_REPOSITORIOS_NA_REGRA);
  const seguradas: TarefaSegurada[] = [];
  validos.forEach((repositorio, i) => {
    for (const issue of dados?.[`r${i}`]?.issues?.nodes ?? []) {
      if (!issue) continue;
      const deLeva = (issue.labels?.nodes ?? []).some((l) => l !== null && numeroDaLeva(l.name) !== null);
      const comPrAberto = (issue.closedByPullRequestsReferences?.nodes ?? []).some((p) => p?.state === "OPEN");
      if (deLeva && !comPrAberto) seguradas.push({ repositorio, numero: issue.number });
    }
  });
  return seguradas;
}

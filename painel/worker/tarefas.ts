// As tarefas de verdade (#354): as consultas ao GitHub e a conversão pro formato `Tarefa` da página.
// O texto da issue só serve pra ler a estimativa e o cabeçalho (#536): não vai pra página.
import { lerCabecalho } from "../src/logica/cabecalho";
import { estadoDaTarefa, lerEstimativa, levaAtual, numeroDaLeva } from "../src/logica/estado";
import { chefeDaEtiqueta, numeroValido } from "../src/logica/comecarComClaude";
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
        labels(first: 30) { nodes { name } }
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
  labels?: { nodes: ({ name: string } | null)[] } | null;
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
  const chefe = (issue.labels?.nodes ?? []).map((l) => (l ? chefeDaEtiqueta(l.name) : undefined)).find((c) => c !== undefined);
  if (chefe) tarefa.chefe = chefe;
  const prUrl = linkSeguro(prDoLink?.url);
  if (prUrl) tarefa.prUrl = prUrl;
  // O cabeçalho (#536). O chefe da etiqueta vai sempre como 2º argumento (mesmo vazio), pra conferir com a linha Chefe.
  const cabecalho = lerCabecalho(issue.body, chefe);
  if (cabecalho.ajudantes) tarefa.ajudantes = cabecalho.ajudantes;
  // Tarefa feita nunca aparece como "incompleta": o cabeçalho dela não importa mais.
  if (cabecalho.falta.length > 0 && tarefa.estado !== "feita") tarefa.incompleta = cabecalho.falta;
  return tarefa;
}

export function levaDosDados(numero: number, dados: DadosDaLeva): RespostaDaLeva | null {
  const issues = dados.repository?.issues;
  if (!issues) return null;
  const tarefas = issues.nodes.filter((i) => i !== null).map(tarefaDaIssue);
  return { numero, tarefas, cortada: issues.totalCount > tarefas.length };
}

// ---- O "Depende de" (#536) ----
// O botão "Começar com o Claude" fica desligado enquanto algum número do Depende de estiver aberto.
// Conta como resolvido só quando a issue está FECHADA (de qualquer jeito). Na dúvida, conta como aberto.

/** No máximo isto de números de fora da leva numa consulta só; os que sobram contam como abertos (o lado seguro). */
export const MAXIMO_DE_DEPENDENCIAS = 50;

/** A resposta da consulta das dependências: um apelido `d<N>` por número; null = não existe (ou não deu pra ler). */
export type DadosDasDependencias = {
  repository: Record<string, { state?: string } | null> | null;
};

type RespostaDoGitHub = { tipo: "ok"; dados: DadosDasDependencias } | { tipo: "sem-acesso" } | { tipo: "erro" };
/** A chamada ao GitHub, de fora (no worker, `consultar` com o token da sessão); nos testes, fingida. */
export type PerguntarAoGitHub = (consulta: string, variaveis: Record<string, unknown>) => Promise<RespostaDoGitHub>;

/**
 * De cada tarefa NÃO feita e COMPLETA (sem `incompleta`), os números do Depende de. Tarefa feita ou
 * incompleta não entra: não precisa consultar nada pra ela. O próprio número é ignorado (uma tarefa
 * não espera por ela mesma; senão o botão ficaria desligado pra sempre).
 */
export function dependenciasDaLeva(dados: DadosDaLeva): Map<number, number[]> {
  const pendencias = new Map<number, number[]>();
  for (const issue of dados.repository?.issues.nodes ?? []) {
    if (!issue || issue.state === "CLOSED") continue;
    const chefe = (issue.labels?.nodes ?? []).map((l) => (l ? chefeDaEtiqueta(l.name) : undefined)).find((c) => c !== undefined);
    const cabecalho = lerCabecalho(issue.body, chefe);
    if (cabecalho.falta.length > 0) continue;
    const numeros = [...new Set(cabecalho.dependeDe.filter((n) => numeroValido(n) && n !== issue.number))];
    if (numeros.length > 0) pendencias.set(issue.number, numeros);
  }
  return pendencias;
}

/** O estado de cada issue que JÁ veio na leva: true = fechada. */
export function estadosDaLeva(dados: DadosDaLeva): Map<number, boolean> {
  const estados = new Map<number, boolean>();
  for (const issue of dados.repository?.issues.nodes ?? []) {
    if (issue) estados.set(issue.number, issue.state === "CLOSED");
  }
  return estados;
}

/**
 * Os números que precisam de consulta (não estão na leva): só inteiros válidos, sem repetir, no máximo
 * `MAXIMO_DE_DEPENDENCIAS`. O resto não é consultado e conta como aberto.
 */
export function numerosDeFora(pendencias: Map<number, number[]>, naLeva: Map<number, boolean>): number[] {
  const fora = new Set<number>();
  for (const numeros of pendencias.values()) {
    for (const n of numeros) if (numeroValido(n) && !naLeva.has(n)) fora.add(n);
  }
  return [...fora].slice(0, MAXIMO_DE_DEPENDENCIAS);
}

/**
 * A consulta, com um apelido `d<N>` por número. Confere de novo cada número com `numeroValido` (só
 * inteiro entra no texto da consulta), tira os repetidos e corta em `MAXIMO_DE_DEPENDENCIAS`.
 */
export function consultaDasDependencias(numeros: number[]): string {
  const validos = [...new Set(numeros.filter((n) => numeroValido(n)))].slice(0, MAXIMO_DE_DEPENDENCIAS);
  const linhas = validos.map((n) => `    d${n}: issue(number: ${n}) { state }`);
  return `
query Dependencias($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
${linhas.join("\n")}
  }
}`;
}

/** Quais números a resposta diz que estão FECHADOS. Null, sem `state` ou outro estado: não entra (conta como aberto). */
export function fechadasDaResposta(numeros: number[], dados: DadosDasDependencias | null | undefined): Set<number> {
  const fechadas = new Set<number>();
  const repositorio = dados?.repository;
  if (!repositorio) return fechadas;
  for (const n of numeros) {
    if (numeroValido(n) && repositorio[`d${n}`]?.state === "CLOSED") fechadas.add(n);
  }
  return fechadas;
}

/** Põe `dependeDeAbertas` nas tarefas (só quando tem algum aberto). Fechada = está em `fechadas`. */
export function aplicarDependencias(tarefas: Tarefa[], pendencias: Map<number, number[]>, fechadas: Set<number>): void {
  for (const tarefa of tarefas) {
    const abertas = (pendencias.get(tarefa.numero) ?? []).filter((n) => !fechadas.has(n));
    if (abertas.length > 0) tarefa.dependeDeAbertas = abertas;
  }
}

/**
 * Descobre quais números do Depende de ainda estão abertos e marca nas tarefas da `resposta`.
 * Os da própria leva usam o estado que já veio; os de fora, UMA consulta só (e nenhuma se não houver).
 * Nunca lança erro: se a consulta falhar (rede, GitHub, token), os de fora contam como abertos.
 */
export async function marcarDependenciasAbertas(resposta: RespostaDaLeva, dados: DadosDaLeva, perguntar: PerguntarAoGitHub): Promise<RespostaDaLeva> {
  const pendencias = dependenciasDaLeva(dados);
  if (pendencias.size === 0) return resposta;
  const naLeva = estadosDaLeva(dados);
  const fechadas = new Set([...naLeva].filter(([, fechada]) => fechada).map(([n]) => n));
  const fora = numerosDeFora(pendencias, naLeva);
  if (fora.length > 0) {
    try {
      const r = await perguntar(consultaDasDependencias(fora), variaveisDoRepositorio);
      if (r.tipo === "ok") for (const n of fechadasDaResposta(fora, r.dados)) fechadas.add(n);
    } catch {
      console.error("dependências: falha ao falar com o GitHub");
    }
  }
  aplicarDependencias(resposta.tarefas, pendencias, fechadas);
  return resposta;
}

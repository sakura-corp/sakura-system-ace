// As tarefas de verdade (#354): as consultas ao GitHub e a conversão pro formato `Tarefa` da página.
// O texto da issue só serve pra ler a estimativa e o cabeçalho (#536): não vai pra página.
import { lerCabecalho } from "../src/logica/cabecalho";
import { estadoDaTarefa, lerEstimativa, levaAtual, numeroDaLeva } from "../src/logica/estado";
import { antesDasFases, faseDaLeva, levaDoRelatorioNaMain, levaDoRelatorioNoPr } from "../src/logica/fases";
import { chefeDaEtiqueta, numeroValido } from "../src/logica/comecarComClaude";
import { MAXIMO_DE_LEVAS } from "../src/logica/levasAnteriores";
import { linkSeguro } from "../src/logica/link";
import type { Leva, RespostaDaLeva, RespostaDasLevas, RespostaDoResumoDasLevas, ResumoDeLeva, Tarefa } from "../src/tipos";
import { ORGANIZACAO, REPOSITORIO } from "./github";

/** Uma consulta só pra cada leva; o GitHub devolve no máximo 100 issues por página. */
export const MAXIMO_DE_TAREFAS = 100;

/** Os PRs abertos olhados pra achar o relatório de uma leva (os atualizados por último). */
export const MAXIMO_DE_PRS = 50;

// A fase das levas (#644), no mesmo pedido: os `leva-N.md` que já estão na main (aprovadas) e os PRs abertos que
// mexem num `docs/relatorios/leva-N.md` (em Relatório). Só nomes e caminhos de arquivo, nunca o texto.
const RELATORIOS_DAS_LEVAS = `
    relatoriosNaMain: object(expression: "main:docs/relatorios") { ... on Tree { entries { name } } }
    prsAbertos: pullRequests(states: OPEN, first: ${MAXIMO_DE_PRS}, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { files(first: 100) { nodes { path changeType } } }
    }`;

// Leve: usada a toda hora (a barra lateral, a Sala e o pegar tarefa). Só contagens e caminhos: nada de texto (#548).
export const CONSULTA_DAS_LEVAS = `
query Levas($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    labels(first: 100, query: "leva-") {
      nodes { name issues(states: OPEN) { totalCount } fechadas: issues(states: CLOSED) { totalCount } }
    }${RELATORIOS_DAS_LEVAS}
  }
}`;

// O resumo das "Levas anteriores" (#548), só na página /levas (é pesada: o texto de até 100 tarefas por leva).
// Só as MAXIMO_DE_LEVAS (20) etiquetas `leva-` criadas por último.
// `issues`: só as abertas. `todas`: abertas e fechadas, pro total, as horas e a data.
export const CONSULTA_DO_RESUMO_DAS_LEVAS = `
query ResumoDasLevas($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    labels(first: ${MAXIMO_DE_LEVAS}, query: "leva-", orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes {
        name
        issues(states: OPEN) { totalCount }
        todas: issues(first: ${MAXIMO_DE_TAREFAS}, states: [OPEN, CLOSED]) {
          totalCount
          nodes { state closedAt body }
        }
      }
    }${RELATORIOS_DAS_LEVAS}
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
        stateReason
        body
        labels(first: 30) { nodes { name } }
        assignees(first: 1) { nodes { login avatarUrl(size: 40) } }
        closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { url state } }
      }
    }
  }
}`;

export const variaveisDoRepositorio = { dono: ORGANIZACAO, nome: REPOSITORIO };

/** As variáveis das consultas pra outro repositório da sakura-corp (um projeto secundário, #731). */
export const variaveisDe = (repositorio: string) => ({ dono: ORGANIZACAO, nome: repositorio });

/** O que o RELATORIOS_DAS_LEVAS devolve. `relatoriosNaMain` é null se a pasta não existe na main. */
export type RelatoriosDasLevas = {
  relatoriosNaMain?: { entries?: ({ name: string } | null)[] | null } | null;
  prsAbertos?: { nodes: ({ files: { nodes: ({ path: string; changeType?: string } | null)[] | null } | null } | null)[] | null } | null;
};

export type DadosDasLevas = {
  repository:
    | ({ labels: { nodes: ({ name: string; issues: { totalCount: number }; fechadas?: { totalCount: number } } | null)[] } | null } & RelatoriosDasLevas)
    | null;
};

/** Uma tarefa da leva, só com o que o resumo usa. */
export type TarefaDoResumo = { state: "OPEN" | "CLOSED"; closedAt: string | null; body: string | null };

/** Uma etiqueta como a CONSULTA_DO_RESUMO_DAS_LEVAS devolve. */
export type EtiquetaDoResumo = {
  name: string;
  issues: { totalCount: number };
  todas: { totalCount: number; nodes: (TarefaDoResumo | null)[] };
};

export type DadosDoResumoDasLevas = {
  repository: ({ labels: { nodes: (EtiquetaDoResumo | null)[] } | null } & RelatoriosDasLevas) | null;
};

export type IssueDoGitHub = {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  /** Por que foi fechada: COMPLETED (concluída), NOT_PLANNED, DUPLICATE... Null em issue aberta. */
  stateReason?: string | null;
  body: string | null;
  labels?: { nodes: ({ name: string } | null)[] } | null;
  assignees: { nodes: ({ login: string; avatarUrl: string } | null)[] };
  closedByPullRequestsReferences: { nodes: ({ url: string; state: "OPEN" | "CLOSED" | "MERGED" } | null)[] } | null;
};

export type DadosDaLeva = {
  repository: { issues: { totalCount: number; nodes: (IssueDoGitHub | null)[] } } | null;
};

/** O resumo de uma leva (#548): total, feitas (fechada = feita), a soma das horas e o dia em que terminou. */
export function levaDaEtiqueta(numero: number, etiqueta: EtiquetaDoResumo): ResumoDeLeva {
  const abertas = etiqueta.issues.totalCount;
  const nos = etiqueta.todas.nodes.filter((n) => n !== null);
  const total = etiqueta.todas.totalCount;
  // Tarefa sem estimativa conta 0; o arredondamento tira o 0.30000000000000004 da soma.
  const soma = nos.reduce((horas, n) => horas + (lerEstimativa(n.body) ?? 0), 0);
  const leva: ResumoDeLeva = { numero, nome: `Leva ${numero}`, abertas, fechadas: Math.max(total - abertas, 0), total, feitas: Math.max(total - abertas, 0), horas: Math.round(soma * 10) / 10, terminouEm: null };
  // Só terminou se não tem nenhuma aberta (nem na contagem, nem nas que vieram) e tem pelo menos uma tarefa.
  if (abertas === 0 && total > 0 && nos.every((n) => n.state === "CLOSED")) leva.terminouEm = ultimoFechamento(nos);
  if (total > nos.length) leva.cortada = true;
  return leva;
}

/** O maior `closedAt` válido, como veio do GitHub; null se nenhum serve. */
function ultimoFechamento(nos: TarefaDoResumo[]): string | null {
  let maior: { texto: string; tempo: number } | null = null;
  for (const n of nos) {
    if (!n.closedAt) continue;
    const tempo = Date.parse(n.closedAt);
    if (Number.isFinite(tempo) && (maior === null || tempo > maior.tempo)) maior = { texto: n.closedAt, tempo };
  }
  return maior?.texto ?? null;
}

/** Quais levas têm o relatório na main e quais têm um PR aberto com ele (#644). */
function relatoriosDosDados(dados: RelatoriosDasLevas | null | undefined): { naMain: Set<number>; emPr: Set<number> } {
  const naMain = new Set<number>();
  for (const e of dados?.relatoriosNaMain?.entries ?? []) {
    const n = e ? levaDoRelatorioNaMain(e.name) : null;
    if (n !== null) naMain.add(n);
  }
  const emPr = new Set<number>();
  for (const pr of dados?.prsAbertos?.nodes ?? []) {
    for (const f of pr?.files?.nodes ?? []) {
      // Um PR que só apaga o relatório não põe a leva em Relatório.
      const n = f && f.changeType !== "DELETED" ? levaDoRelatorioNoPr(f.path) : null;
      if (n !== null) emPr.add(n);
    }
  }
  return { naMain, emPr };
}

/**
 * Põe a fase em cada leva (já em ordem) e devolve a atual (#644). Aprovada não depende de nada; a atual é a mais
 * antiga não aprovada; e uma leva espera em Montando se alguma de número menor ainda não foi aprovada.
 */
function comFases<T extends Leva>(levas: T[], dados: RelatoriosDasLevas | null | undefined): { levas: T[]; atual: number | null } {
  const { naMain, emPr } = relatoriosDosDados(dados);
  const aprovada = (n: number) => antesDasFases(n) || naMain.has(n);
  const atual = levaAtual(levas.map((l) => ({ numero: l.numero, abertas: l.abertas, aprovada: aprovada(l.numero) })));
  for (const l of levas) {
    l.fase = faseDaLeva({
      numero: l.numero,
      abertas: l.abertas,
      fechadas: l.fechadas ?? 0,
      relatorioEmPr: emPr.has(l.numero),
      relatorioNaMain: naMain.has(l.numero),
      anteriorPendente: levas.some((o) => o.numero < l.numero && !aprovada(o.numero)),
    });
    if (antesDasFases(l.numero)) l.antesDasFases = true;
  }
  return { levas, atual };
}

export function levasDosDados(dados: DadosDasLevas): RespostaDasLevas {
  const levas: Leva[] = [];
  for (const no of dados.repository?.labels?.nodes ?? []) {
    if (!no) continue;
    const numero = numeroDaLeva(no.name);
    if (numero !== null) levas.push({ numero, nome: `Leva ${numero}`, abertas: no.issues.totalCount, fechadas: no.fechadas?.totalCount ?? 0 });
  }
  levas.sort((a, b) => a.numero - b.numero);
  return comFases(levas, dados.repository);
}

/** O que /api/levas/resumo devolve (#548): as levas com o resumo e a fase, em ordem, e a atual entre elas. */
export function resumoDasLevasDosDados(dados: DadosDoResumoDasLevas): RespostaDoResumoDasLevas {
  const levas: ResumoDeLeva[] = [];
  for (const no of dados.repository?.labels?.nodes ?? []) {
    if (!no) continue;
    const numero = numeroDaLeva(no.name);
    if (numero !== null) levas.push(levaDaEtiqueta(numero, no));
  }
  levas.sort((a, b) => a.numero - b.numero);
  return comFases(levas, dados.repository);
}

const linkDaIssue = (numero: number, repositorio: string) => `https://github.com/${ORGANIZACAO}/${repositorio}/issues/${numero}`;

/** `repositorio`: de onde a issue veio (#731); o padrão é o SSACE, e só tarefa de outro repositório leva o campo. */
export function tarefaDaIssue(issue: IssueDoGitHub, repositorio = REPOSITORIO): Tarefa {
  const dono = issue.assignees.nodes.find((a) => a !== null) ?? undefined;
  const prs = (issue.closedByPullRequestsReferences?.nodes ?? []).filter((p) => p !== null);
  const prAberto = prs.find((p) => p.state === "OPEN");
  const prDoLink = prAberto ?? prs.find((p) => p.state === "MERGED");
  const tarefa: Tarefa = {
    numero: issue.number,
    titulo: issue.title,
    // Só link do GitHub da Sakura (a mesma regra da Sala); se vier outro, monta pelo número.
    url: linkSeguro(issue.url) ?? linkDaIssue(issue.number, repositorio),
    estado: estadoDaTarefa({ fechada: issue.state === "CLOSED", temResponsavel: dono !== undefined, temPrAberto: prAberto !== undefined }),
  };
  if (repositorio !== REPOSITORIO) tarefa.repositorio = repositorio;
  if (dono) tarefa.dono = { login: dono.login, avatar: dono.avatarUrl.startsWith("https://") ? dono.avatarUrl : "" };
  const estimativa = lerEstimativa(issue.body);
  if (estimativa !== undefined) tarefa.estimativaHoras = estimativa;
  const chefe = (issue.labels?.nodes ?? []).map((l) => (l ? chefeDaEtiqueta(l.name) : undefined)).find((c) => c !== undefined);
  if (chefe) tarefa.chefe = chefe;
  const prUrl = linkSeguro(prDoLink?.url);
  if (prUrl) tarefa.prUrl = prUrl;
  // O cabeçalho (#536), conferindo a linha Chefe com a etiqueta (sem etiqueta = incompleta).
  const cabecalho = lerCabecalho(issue.body, { etiquetaChefe: chefe });
  if (cabecalho.ajudantes) tarefa.ajudantes = cabecalho.ajudantes;
  if (cabecalho.prioridade !== undefined) tarefa.prioridade = cabecalho.prioridade;
  if (cabecalho.reservadaPra) tarefa.reservadaPra = cabecalho.reservadaPra;
  // Tarefa feita nunca aparece como "incompleta": o cabeçalho dela não importa mais.
  if (cabecalho.falta.length > 0 && tarefa.estado !== "feita") tarefa.incompleta = cabecalho.falta;
  return tarefa;
}

export function levaDosDados(numero: number, dados: DadosDaLeva, repositorio = REPOSITORIO): RespostaDaLeva | null {
  const issues = dados.repository?.issues;
  if (!issues) return null;
  const tarefas = issues.nodes.filter((i) => i !== null).map((i) => tarefaDaIssue(i, repositorio));
  return { numero, tarefas, cortada: issues.totalCount > tarefas.length };
}

// ---- O "Depende de" (#536) ----
// O botão "Começar com o Claude" fica desligado enquanto algum número do Depende de estiver aberto.
// Conta como resolvido só quando a issue foi FECHADA COMO CONCLUÍDA (Sofia, 17/10): é assim que o PR na `main` fecha.
// Fechada como "não planejada" ou duplicada não libera: o trabalho não foi feito. Na dúvida, conta como aberto.

/** A issue foi fechada como concluída (o único fechamento que libera quem depende dela). */
export const concluida = (issue: { state?: string; stateReason?: string | null } | null | undefined): boolean =>
  issue?.state === "CLOSED" && issue.stateReason === "COMPLETED";

/** No máximo isto de números de fora da leva numa consulta só; os que sobram contam como abertos (o lado seguro). */
export const MAXIMO_DE_DEPENDENCIAS = 50;

/** A resposta da consulta das dependências: um apelido `d<N>` por número; null = não existe (ou não deu pra ler). */
export type DadosDasDependencias = {
  repository: Record<string, { state?: string; stateReason?: string | null } | null> | null;
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
    const cabecalho = lerCabecalho(issue.body, { etiquetaChefe: chefe });
    if (cabecalho.falta.length > 0) continue;
    const numeros = [...new Set(cabecalho.dependeDe.filter((n) => numeroValido(n) && n !== issue.number))];
    if (numeros.length > 0) pendencias.set(issue.number, numeros);
  }
  return pendencias;
}

/** O estado de cada issue que JÁ veio na leva: true = fechada como concluída. */
export function estadosDaLeva(dados: DadosDaLeva): Map<number, boolean> {
  const estados = new Map<number, boolean>();
  for (const issue of dados.repository?.issues.nodes ?? []) {
    if (issue) estados.set(issue.number, concluida(issue));
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
  const linhas = validos.map((n) => `    d${n}: issue(number: ${n}) { state stateReason }`);
  return `
query Dependencias($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
${linhas.join("\n")}
  }
}`;
}

/** Quais números a resposta diz que estão FECHADOS COMO CONCLUÍDOS. Qualquer outra coisa não entra (conta como aberto). */
export function fechadasDaResposta(numeros: number[], dados: DadosDasDependencias | null | undefined): Set<number> {
  const fechadas = new Set<number>();
  const repositorio = dados?.repository;
  if (!repositorio) return fechadas;
  for (const n of numeros) {
    if (numeroValido(n) && concluida(repositorio[`d${n}`])) fechadas.add(n);
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
export async function marcarDependenciasAbertas(
  resposta: RespostaDaLeva,
  dados: DadosDaLeva,
  perguntar: PerguntarAoGitHub,
  repositorio = REPOSITORIO,
): Promise<RespostaDaLeva> {
  const pendencias = dependenciasDaLeva(dados);
  if (pendencias.size === 0) return resposta;
  const naLeva = estadosDaLeva(dados);
  const fechadas = new Set([...naLeva].filter(([, fechada]) => fechada).map(([n]) => n));
  const fora = numerosDeFora(pendencias, naLeva);
  if (fora.length > 0) {
    try {
      const r = await perguntar(consultaDasDependencias(fora), variaveisDe(repositorio));
      if (r.tipo === "ok") for (const n of fechadasDaResposta(fora, r.dados)) fechadas.add(n);
      else console.error(`dependências: o GitHub não respondeu (${r.tipo}); as de fora contam como abertas`);
    } catch {
      console.error("dependências: falha ao falar com o GitHub");
    }
  }
  aplicarDependencias(resposta.tarefas, pendencias, fechadas);
  return resposta;
}

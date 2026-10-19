// "Pegar tarefa" e "Largar" (#538). Quem escreve no GitHub é o token da própria pessoa, e só o login dela
// entra ou sai da tarefa: nunca outra pessoa. O worker confere tudo de novo no GitHub, na hora, e não
// confia no que a página mandou (a página só desliga o botão). Os erros nunca levam token nem resposta do GitHub.
import type { Tarefa } from "../src/tipos";
import { mesmoLogin, motivoPraNaoLargar, motivoPraNaoPegar } from "../src/logica/pegar";
import { numeroValido } from "../src/logica/comecarComClaude";
import { levaAceitaPegar } from "../src/logica/estado";
import { ORGANIZACAO, REPOSITORIO } from "./github";
import {
  CONSULTA_DA_LEVA,
  CONSULTA_DAS_LEVAS,
  levaDosDados,
  levasDosDados,
  marcarDependenciasAbertas,
  tarefaDaIssue,
  variaveisDoRepositorio,
  type DadosDaLeva,
  type DadosDasLevas,
  type IssueDoGitHub,
} from "./tarefas";

type Resposta<T> = { tipo: "ok"; dados: T } | { tipo: "sem-acesso" } | { tipo: "erro" };

/** Uma consulta GraphQL com o token da pessoa (no worker, `consultar`; nos testes, fingida). */
export type Perguntar = <T>(consulta: string, variaveis: Record<string, unknown>) => Promise<Resposta<T>>;
/** Uma escrita REST com o token da pessoa (no worker, `escreverNoGitHub`; nos testes, fingida). */
export type Escrever = (metodo: "POST" | "DELETE", caminho: string, corpo: unknown) => Promise<Resposta<unknown>>;

export type Resultado = { tipo: "ok" } | { tipo: "recusado"; motivo: string } | { tipo: "sem-acesso" } | { tipo: "erro" };

/**
 * As regras olham TODOS os responsáveis da issue (até 10), não só o primeiro que a página mostra: quem está
 * em 2º lugar também segura a tarefa (pode largar, e conta na "uma por vez"). Tirando isso, é a consulta da leva.
 */
export const CONSULTA_DA_LEVA_PRA_REGRAS = CONSULTA_DA_LEVA.replace("assignees(first: 1)", "assignees(first: 10)");

/** Uma tarefa só, com os mesmos campos da leva (pra `tarefaDaIssue` dar o mesmo resultado). */
export const CONSULTA_DA_TAREFA = `
query Tarefa($dono: String!, $nome: String!, $numero: Int!) {
  repository(owner: $dono, name: $nome) {
    issue(number: $numero) {
      number
      title
      url
      state
      stateReason
      body
      labels(first: 30) { nodes { name } }
      assignees(first: 10) { nodes { login avatarUrl(size: 40) } }
      closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { url state } }
    }
  }
}`;

const caminhoDosResponsaveis = (numero: number) => `/repos/${ORGANIZACAO}/${REPOSITORIO}/issues/${numero}/assignees`;

/**
 * A tarefa como as regras devem ver: se `login` é um dos responsáveis (em qualquer posição), ele é o dono.
 * Assim "uma por vez" e "Largar" valem pra quem está em 2º lugar também.
 */
function paraAsRegras(tarefa: Tarefa, issue: IssueDoGitHub | undefined, login: string): Tarefa {
  const eu = issue?.assignees.nodes.find((a) => a !== null && mesmoLogin(a.login, login));
  return eu ? { ...tarefa, dono: { login: eu.login, avatar: tarefa.dono?.avatar ?? "" } } : tarefa;
}

/** As tarefas da leva vistas pelas regras (`paraAsRegras` em cada uma). */
function tarefasPraRegras(tarefas: Tarefa[], dados: DadosDaLeva, login: string): Tarefa[] {
  const issues = new Map((dados.repository?.issues.nodes ?? []).filter((i) => i !== null).map((i) => [i.number, i]));
  return tarefas.map((t) => paraAsRegras(t, issues.get(t.numero), login));
}

/** Os logins que o GitHub diz que estão na issue, depois de uma escrita em /assignees. */
function responsaveisDaResposta(dados: unknown): string[] {
  const lista = (dados as { assignees?: unknown } | null)?.assignees;
  if (!Array.isArray(lista)) return [];
  return lista.map((a) => (a as { login?: unknown } | null)?.login).filter((l): l is string => typeof l === "string" && l !== "");
}

/**
 * As tarefas de todas as levas abertas (a atual e as anteriores com tarefa aberta, `levaAceitaPegar`), juntas e
 * vistas pelas regras: a tarefa pode estar em qualquer uma, e a "uma por vez" vale entre elas.
 */
async function tarefasDasLevasAbertas(numeros: number[], login: string, perguntar: Perguntar, comDependencias: boolean): Promise<Tarefa[] | Resultado> {
  const porNumero = new Map<number, Tarefa>();
  for (const n of numeros) {
    const r = await perguntar<DadosDaLeva>(CONSULTA_DA_LEVA_PRA_REGRAS, { ...variaveisDoRepositorio, etiqueta: `leva-${n}` });
    if (r.tipo !== "ok") return r;
    const leva = levaDosDados(n, r.dados);
    if (!leva) return { tipo: "erro" };
    // Com mais de 100 tarefas, a "uma por vez" poderia não ver a outra tarefa da pessoa: na dúvida, não pega.
    if (leva.cortada) return { tipo: "recusado", motivo: "a leva tem tarefas demais pra conferir; peça à Sofia" };
    if (comDependencias) await marcarDependenciasAbertas(leva, r.dados, perguntar);
    for (const t of tarefasPraRegras(leva.tarefas, r.dados, login)) if (!porNumero.has(t.numero)) porNumero.set(t.numero, t);
  }
  return [...porNumero.values()];
}

/**
 * Pega a tarefa `numero` pra `login`. Confere, nesta ordem: as levas abertas, a tarefa numa delas (aberta, livre,
 * com o cabeçalho completo, sem dependência aberta) e se a pessoa já não está com outra em andamento, em qualquer
 * leva aberta. Depois de escrever, olha quem ficou na issue: se outra pessoa entrou junto (dois cliques ao mesmo
 * tempo), sai e avisa.
 */
export async function pegarTarefa(numero: number, login: string, perguntar: Perguntar, escrever: Escrever): Promise<Resultado> {
  if (!numeroValido(numero)) return { tipo: "recusado", motivo: "número de tarefa inválido" };

  const r1 = await perguntar<DadosDasLevas>(CONSULTA_DAS_LEVAS, variaveisDoRepositorio);
  if (r1.tipo !== "ok") return r1;
  const { levas, atual } = levasDosDados(r1.dados);
  if (atual === null) return { tipo: "recusado", motivo: "não há leva aberta" };
  const abertas = levas.filter((l) => levaAceitaPegar(l.numero, levas, atual)).map((l) => l.numero);

  const tarefas = await tarefasDasLevasAbertas(abertas, login, perguntar, true);
  if (!Array.isArray(tarefas)) return tarefas;
  const tarefa = tarefas.find((t) => t.numero === numero);
  const motivo = motivoPraNaoPegar(tarefa, tarefas, login);
  if (motivo) return { tipo: "recusado", motivo };

  const w = await escrever("POST", caminhoDosResponsaveis(numero), { assignees: [login] });
  if (w.tipo !== "ok") return w;
  const ficaram = responsaveisDaResposta(w.dados);
  // O GitHub ignora calado quem não pode ser responsável (sem acesso de escrita ao repositório).
  if (!ficaram.some((l) => mesmoLogin(l, login))) {
    return { tipo: "recusado", motivo: "o GitHub não deixou pôr você na tarefa; confira se você tem acesso de escrita ao repositório" };
  }
  const outro = ficaram.find((l) => !mesmoLogin(l, login));
  if (outro) {
    // Alguém pegou no mesmo instante: quem chegou depois sai.
    const saida = await sair(numero, login, escrever);
    if (saida === null) return { tipo: "recusado", motivo: `alguém pegou junto e não deu pra tirar você da #${numero}: largue a tarefa ou peça à Sofia` };
    // As duas pessoas saíram (cada uma viu a outra): ninguém ficou, e "é de X" seria mentira.
    if (saida.length === 0) return { tipo: "recusado", motivo: `outra pessoa tentou pegar a #${numero} no mesmo instante; tente de novo` };
    return { tipo: "recusado", motivo: `alguém pegou antes: a #${numero} é de ${outro}` };
  }

  // "Uma por vez" com duas abas: as duas conferências podem ter passado antes de qualquer escrita. Olha a leva
  // de novo; se a pessoa ficou com mais de uma em andamento, sai desta, a não ser que seja a de número menor
  // (a regra é a mesma nas duas chamadas, então fica só uma). Se a releitura falhar, fica: o aviso de
  // "várias em andamento" do painel mostra.
  const releitura = await tarefasDasLevasAbertas(abertas, login, perguntar, false);
  if (Array.isArray(releitura)) {
    const minhas = releitura
      .filter((t) => t.estado === "andamento" && mesmoLogin(t.dono?.login, login))
      .map((t) => t.numero);
    const menor = Math.min(...minhas);
    if (minhas.length > 1 && numero !== menor) {
      const saida = await sair(numero, login, escrever);
      if (saida === null) return { tipo: "recusado", motivo: `você ficou com a #${menor} e a #${numero} ao mesmo tempo; largue uma delas` };
      return { tipo: "recusado", motivo: `você já está com a #${menor}` };
    }
  }
  return { tipo: "ok" };
}

/** Tira `login` da issue. Devolve quem ficou, ou null se a saída falhou. Nunca lança erro. */
async function sair(numero: number, login: string, escrever: Escrever): Promise<string[] | null> {
  try {
    const w = await escrever("DELETE", caminhoDosResponsaveis(numero), { assignees: [login] });
    if (w.tipo !== "ok") return null;
    const ficaram = responsaveisDaResposta(w.dados);
    return ficaram.some((l) => mesmoLogin(l, login)) ? null : ficaram;
  } catch {
    return null;
  }
}

/** Larga a tarefa `numero`: só o dono, e só em andamento (sem PR aberto). Tira só o próprio login. */
export async function largarTarefa(numero: number, login: string, perguntar: Perguntar, escrever: Escrever): Promise<Resultado> {
  if (!numeroValido(numero)) return { tipo: "recusado", motivo: "número de tarefa inválido" };

  const r = await perguntar<{ repository: { issue: IssueDoGitHub | null } | null }>(CONSULTA_DA_TAREFA, { ...variaveisDoRepositorio, numero });
  if (r.tipo !== "ok") return r;
  const issue = r.dados.repository?.issue;
  const motivo = motivoPraNaoLargar(issue ? paraAsRegras(tarefaDaIssue(issue), issue, login) : undefined, login);
  if (motivo) return { tipo: "recusado", motivo };

  const w = await escrever("DELETE", caminhoDosResponsaveis(numero), { assignees: [login] });
  if (w.tipo !== "ok") return w;
  return { tipo: "ok" };
}

/**
 * A escrita REST de verdade, com o token da pessoa. `sem-acesso` = 401; `erro` = qualquer outra falha
 * (403, 404, 422, limite, fora do ar). Só fala com api.github.com, no caminho que este arquivo monta.
 */
export async function escreverNoGitHub(token: string, metodo: "POST" | "DELETE", caminho: string, corpo: unknown): Promise<Resposta<unknown>> {
  const resposta = await fetch(`https://api.github.com${caminho}`, {
    method: metodo,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "sakura-painel",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify(corpo),
    redirect: "manual",
  });
  if (resposta.status === 401) return { tipo: "sem-acesso" };
  if (!resposta.ok) return { tipo: "erro" };
  try {
    return { tipo: "ok", dados: (await resposta.json()) as unknown };
  } catch {
    return { tipo: "erro" };
  }
}

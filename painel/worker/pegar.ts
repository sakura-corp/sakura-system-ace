// "Pegar tarefa" e "Largar" (#538). Quem escreve no GitHub é o token da própria pessoa, e só o login dela
// entra ou sai da tarefa: nunca outra pessoa. O worker confere tudo de novo no GitHub, na hora, e não
// confia no que a página mandou (a página só desliga o botão). Os erros nunca levam token nem resposta do GitHub.
import { mesmoLogin, motivoPraNaoLargar, motivoPraNaoPegar } from "../src/logica/pegar";
import { numeroValido } from "../src/logica/comecarComClaude";
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
      assignees(first: 1) { nodes { login avatarUrl(size: 40) } }
      closedByPullRequestsReferences(first: 10, includeClosedPrs: true) { nodes { url state } }
    }
  }
}`;

const caminhoDosResponsaveis = (numero: number) => `/repos/${ORGANIZACAO}/${REPOSITORIO}/issues/${numero}/assignees`;

/** Os logins que o GitHub diz que estão na issue, depois de uma escrita em /assignees. */
function responsaveisDaResposta(dados: unknown): string[] {
  const lista = (dados as { assignees?: unknown } | null)?.assignees;
  if (!Array.isArray(lista)) return [];
  return lista.map((a) => (a as { login?: unknown } | null)?.login).filter((l): l is string => typeof l === "string" && l !== "");
}

/**
 * Pega a tarefa `numero` pra `login`. Confere, nesta ordem: a leva atual, a tarefa nela (aberta, livre, com o
 * cabeçalho completo, sem dependência aberta) e se a pessoa já não está com outra em andamento. Depois de
 * escrever, olha quem ficou na issue: se outra pessoa entrou junto (dois cliques ao mesmo tempo), sai e avisa.
 */
export async function pegarTarefa(numero: number, login: string, perguntar: Perguntar, escrever: Escrever): Promise<Resultado> {
  if (!numeroValido(numero)) return { tipo: "recusado", motivo: "número de tarefa inválido" };

  const r1 = await perguntar<DadosDasLevas>(CONSULTA_DAS_LEVAS, variaveisDoRepositorio);
  if (r1.tipo !== "ok") return r1;
  const atual = levasDosDados(r1.dados).atual;
  if (atual === null) return { tipo: "recusado", motivo: "não há leva aberta" };

  const r2 = await perguntar<DadosDaLeva>(CONSULTA_DA_LEVA, { ...variaveisDoRepositorio, etiqueta: `leva-${atual}` });
  if (r2.tipo !== "ok") return r2;
  const leva = levaDosDados(atual, r2.dados);
  if (!leva) return { tipo: "erro" };
  // Com mais de 100 tarefas, a "uma por vez" poderia não ver a outra tarefa da pessoa: na dúvida, não pega.
  if (leva.cortada) return { tipo: "recusado", motivo: "a leva tem tarefas demais pra conferir; peça à Sofia" };
  await marcarDependenciasAbertas(leva, r2.dados, perguntar);

  const tarefa = leva.tarefas.find((t) => t.numero === numero);
  const motivo = motivoPraNaoPegar(tarefa, leva.tarefas, login);
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
    // Alguém pegou no mesmo instante: quem chegou depois sai. Se a saída falhar, a pessoa vê os dois nomes e larga.
    await escrever("DELETE", caminhoDosResponsaveis(numero), { assignees: [login] }).catch(() => undefined);
    return { tipo: "recusado", motivo: `alguém pegou antes: a #${numero} é de ${outro}` };
  }
  return { tipo: "ok" };
}

/** Larga a tarefa `numero`: só o dono, e só em andamento (sem PR aberto). Tira só o próprio login. */
export async function largarTarefa(numero: number, login: string, perguntar: Perguntar, escrever: Escrever): Promise<Resultado> {
  if (!numeroValido(numero)) return { tipo: "recusado", motivo: "número de tarefa inválido" };

  const r = await perguntar<{ repository: { issue: IssueDoGitHub | null } | null }>(CONSULTA_DA_TAREFA, { ...variaveisDoRepositorio, numero });
  if (r.tipo !== "ok") return r;
  const issue = r.dados.repository?.issue;
  const motivo = motivoPraNaoLargar(issue ? tarefaDaIssue(issue) : undefined, login);
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

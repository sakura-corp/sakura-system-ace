// As decisões da Sofia (#648): as issues abertas com a etiqueta `sofia`, a mais antiga primeiro. O painel só lê;
// responder ou fechar a issue é no GitHub, nunca por aqui. O título vem do GitHub e vai pra página como texto puro.
// Junto, as propostas de projeto secundário esperando a Sofia (#732): as issues abertas do repositório das propostas com a
// etiqueta `proposta:esperando-sofia`, no mesmo pedido (um apelido na consulta). Se o repositório não existe ou o login não
// lê, o GitHub devolve só essa parte nula, e as decisões de sempre aparecem com um aviso.
import { linkSeguro } from "../src/logica/link";
import { variaveisDoRepositorio } from "./tarefas";

/** Quantas issues a consulta traz (o máximo que o GitHub dá numa página). */
export const MAXIMO_DE_DECISOES = 100;

/** O repositório (na mesma organização) onde moram as propostas de projeto secundário. */
export const REPOSITORIO_DAS_PROPOSTAS = "secundarios";
/** A etiqueta de proposta que está esperando a Sofia. */
export const ETIQUETA_DAS_PROPOSTAS = "proposta:esperando-sofia";

const issuesAbertas = (etiqueta: string) => `issues(states: OPEN, labels: ["${etiqueta}"], first: ${MAXIMO_DE_DECISOES}, orderBy: { field: CREATED_AT, direction: ASC }) {
      totalCount
      nodes { number title url createdAt }
    }`;

export const CONSULTA_DAS_DECISOES = `
query Decisoes($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    ${issuesAbertas("sofia")}
  }
  propostas: repository(owner: $dono, name: "${REPOSITORIO_DAS_PROPOSTAS}") {
    ${issuesAbertas(ETIQUETA_DAS_PROPOSTAS)}
  }
}`;

export { variaveisDoRepositorio as variaveisDasDecisoes };

type RepositorioNosDados = {
  issues: {
    totalCount?: number | null;
    nodes?: ({ number?: number; title?: string; url?: string; createdAt?: string } | null)[] | null;
  } | null;
} | null;

export type DadosDasDecisoes = {
  repository: RepositorioNosDados;
  /** Nulo (ou ausente) quando o repositório das propostas não existe ou o login não lê. */
  propostas?: RepositorioNosDados;
};

/** `proposta` só nas propostas de projeto secundário (#732); o número é do repositório delas. */
export type Decisao = { numero: number; titulo: string; url?: string; abertaEm: string; proposta?: true };

export type RespostaDasDecisoes = {
  decisoes: Decisao[];
  /** Quantas issues abertas com a etiqueta existem (pode ser mais do que as devolvidas). */
  total: number;
  /** Só quando o total passa do que coube na lista. */
  maisDoQueCabe?: true;
  /** Só quando as propostas não deram pra ler (o repositório não existe ou o login não alcança). */
  propostasFora?: true;
};

/** As issues válidas de um repositório, mais quantas existem e quantas vieram. */
function lerIssues(repositorio: RepositorioNosDados | undefined, proposta: boolean) {
  const issues = repositorio?.issues;
  const lidas: Decisao[] = [];
  for (const no of issues?.nodes ?? []) {
    if (!no || typeof no.number !== "number" || !Number.isInteger(no.number)) continue;
    if (typeof no.title !== "string" || no.title.trim() === "") continue;
    if (typeof no.createdAt !== "string" || Number.isNaN(Date.parse(no.createdAt))) continue;
    const url = linkSeguro(typeof no.url === "string" ? no.url : undefined);
    lidas.push({ numero: no.number, titulo: no.title, ...(url ? { url } : {}), abertaEm: no.createdAt, ...(proposta ? { proposta: true as const } : {}) });
  }
  const vieram = issues?.nodes?.length ?? 0;
  const total = typeof issues?.totalCount === "number" ? issues.totalCount : lidas.length;
  return { lidas, total, vieram };
}

/**
 * O que /api/decisoes devolve: as decisões e as propostas numa lista só, ordenada aqui de novo (mais antiga primeiro; empate:
 * a decisão antes da proposta, depois o número), sem confiar no GitHub.
 */
export function decisoesDosDados(dados: DadosDasDecisoes): RespostaDasDecisoes {
  const decisoes = lerIssues(dados.repository, false);
  const propostas = lerIssues(dados.propostas, true);
  const lista = [...decisoes.lidas, ...propostas.lidas].sort(
    (a, b) => Date.parse(a.abertaEm) - Date.parse(b.abertaEm) || Number(a.proposta === true) - Number(b.proposta === true) || a.numero - b.numero,
  );
  // Comparado com os nós que vieram (não com os válidos): um nó estragado descartado não quer dizer que faltou issue.
  const faltou = decisoes.total > decisoes.vieram || propostas.total > propostas.vieram;
  return {
    decisoes: lista,
    total: decisoes.total + propostas.total,
    ...(faltou ? { maisDoQueCabe: true as const } : {}),
    // Pelo esquema do GitHub, um erro em `issues` sobe até `propostas`; mesmo assim, `issues` nulo também é aviso.
    ...(dados.propostas?.issues ? {} : { propostasFora: true as const }),
  };
}

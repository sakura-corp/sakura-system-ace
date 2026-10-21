// As decisões da Sofia (#648): as issues abertas com a etiqueta `sofia`, a mais antiga primeiro. O painel só lê;
// responder ou fechar a issue é no GitHub, nunca por aqui. O título vem do GitHub e vai pra página como texto puro.
import { linkSeguro } from "../src/logica/link";
import { variaveisDoRepositorio } from "./tarefas";

/** Quantas issues a consulta traz (o máximo que o GitHub dá numa página). */
export const MAXIMO_DE_DECISOES = 100;

export const CONSULTA_DAS_DECISOES = `
query Decisoes($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    issues(states: OPEN, labels: ["sofia"], first: ${MAXIMO_DE_DECISOES}, orderBy: { field: CREATED_AT, direction: ASC }) {
      totalCount
      nodes { number title url createdAt }
    }
  }
}`;

export { variaveisDoRepositorio as variaveisDasDecisoes };

export type DadosDasDecisoes = {
  repository: {
    issues: {
      totalCount?: number | null;
      nodes?: ({ number?: number; title?: string; url?: string; createdAt?: string } | null)[] | null;
    } | null;
  } | null;
};

export type Decisao = { numero: number; titulo: string; url?: string; abertaEm: string };

export type RespostaDasDecisoes = {
  decisoes: Decisao[];
  /** Quantas issues abertas com a etiqueta existem (pode ser mais do que as devolvidas). */
  total: number;
  /** Só quando o total passa do que coube na lista. */
  maisDoQueCabe?: true;
};

/** O que /api/decisoes devolve: ordenado aqui de novo (mais antiga primeiro, empate pelo número), sem confiar no GitHub. */
export function decisoesDosDados(dados: DadosDasDecisoes): RespostaDasDecisoes {
  const issues = dados.repository?.issues;
  const decisoes: Decisao[] = [];
  for (const no of issues?.nodes ?? []) {
    if (!no || typeof no.number !== "number" || !Number.isInteger(no.number)) continue;
    if (typeof no.title !== "string" || no.title.trim() === "") continue;
    if (typeof no.createdAt !== "string" || Number.isNaN(Date.parse(no.createdAt))) continue;
    const url = linkSeguro(typeof no.url === "string" ? no.url : undefined);
    decisoes.push({ numero: no.number, titulo: no.title, ...(url ? { url } : {}), abertaEm: no.createdAt });
  }
  decisoes.sort((a, b) => Date.parse(a.abertaEm) - Date.parse(b.abertaEm) || a.numero - b.numero);
  const total = typeof issues?.totalCount === "number" ? issues.totalCount : decisoes.length;
  return { decisoes, total, ...(total > decisoes.length ? { maisDoQueCabe: true as const } : {}) };
}

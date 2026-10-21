// As versões do programa das lojas (#649): as releases do `sakura-corp/ssace-versoes` (público, docs/operacao.md). O painel só
// lê; publicar, liberar e voltar versão continuam nos workflows, com a aprovação da Sofia. Canal de teste = release marcada
// como pré-lançamento; liberada = sem a marca; a que o GitHub dá como "a mais recente" é a que as lojas recebem hoje
// (o Liberar marca ela com --latest, scripts/liberar-versao.mjs).
import { linkSeguro } from "../src/logica/link";
import { ORGANIZACAO } from "./github";

/** Quantas versões a página mostra. */
export const QUANTAS_VERSOES = 20;

export const REPOSITORIO_DAS_VERSOES = "ssace-versoes";

/** Busca umas a mais: um rascunho (só quem escreve lá vê) não pode tirar uma versão de verdade da lista. */
export const CONSULTA_DAS_VERSOES = `
query Versoes($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    releases(first: ${QUANTAS_VERSOES + 10}, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { tagName url isPrerelease isDraft isLatest publishedAt createdAt }
    }
  }
}`;

export const variaveisDasVersoes = { dono: ORGANIZACAO, nome: REPOSITORIO_DAS_VERSOES };

/** O motivo que a página reconhece: o login do painel não alcança o ssace-versoes. */
export const ERRO_SEM_ACESSO_AS_VERSOES = "sem acesso às versões";

export type DadosDasVersoes = {
  repository: {
    releases: {
      nodes?:
        | ({
            tagName?: string;
            url?: string;
            isPrerelease?: boolean;
            isDraft?: boolean;
            isLatest?: boolean;
            publishedAt?: string | null;
            createdAt?: string;
          } | null)[]
        | null;
    } | null;
  } | null;
};

export type Versao = {
  /** A tag, como no GitHub (ex.: "v0.9.60"). */
  versao: string;
  canal: "teste" | "liberada";
  /** Só na liberada que as lojas recebem hoje. */
  nasLojas?: true;
  publicadaEm: string;
  url?: string;
};

export type RespostaDasVersoes = { versoes: Versao[] };

/** "v0.9.60" → [0, 9, 60]; fora do formato → null. */
export function numeroDaVersao(tag: string): [number, number, number] | null {
  const achou = /^v?(\d{1,6})\.(\d{1,6})\.(\d{1,6})$/.exec(tag);
  return achou ? [Number(achou[1]), Number(achou[2]), Number(achou[3])] : null;
}

/** A mais nova primeiro: pelo número; tag fora do formato vai depois das numeradas, pela data. */
export function compararVersoes(a: Versao, b: Versao): number {
  const na = numeroDaVersao(a.versao);
  const nb = numeroDaVersao(b.versao);
  if (na && nb) return nb[0] - na[0] || nb[1] - na[1] || nb[2] - na[2] || Date.parse(b.publicadaEm) - Date.parse(a.publicadaEm);
  if (na) return -1;
  if (nb) return 1;
  return Date.parse(b.publicadaEm) - Date.parse(a.publicadaEm);
}

/**
 * O que /api/versoes devolve: as 20 mais novas, sem rascunho, ordenadas aqui de novo sem confiar no GitHub.
 * Só uma é "nas lojas" (a de número maior, se o GitHub disser duas), e nunca um pré-lançamento.
 * O repositório que volta null (o login não alcança o ssace-versoes) é tratado antes, na rota.
 */
export function versoesDosDados(dados: DadosDasVersoes): RespostaDasVersoes {
  const versoes: Versao[] = [];
  const marcadas = new Set<Versao>();
  for (const no of dados.repository?.releases?.nodes ?? []) {
    if (!no || no.isDraft === true) continue;
    if (typeof no.tagName !== "string" || no.tagName.trim() === "") continue;
    if (typeof no.isPrerelease !== "boolean") continue;
    const data = typeof no.publishedAt === "string" ? no.publishedAt : no.createdAt;
    if (typeof data !== "string" || Number.isNaN(Date.parse(data))) continue;
    const url = linkSeguro(typeof no.url === "string" ? no.url : undefined);
    const versao: Versao = { versao: no.tagName, canal: no.isPrerelease ? "teste" : "liberada", publicadaEm: data, ...(url ? { url } : {}) };
    if (no.isLatest === true && !no.isPrerelease) marcadas.add(versao);
    versoes.push(versao);
  }
  versoes.sort(compararVersoes);
  const nasLojas = versoes.find((v) => marcadas.has(v));
  return {
    versoes: versoes.slice(0, QUANTAS_VERSOES).map((v) => {
      const { versao, canal, publicadaEm, url } = v;
      return { versao, canal, ...(v === nasLojas ? { nasLojas: true as const } : {}), publicadaEm, ...(url ? { url } : {}) };
    }),
  };
}

// As versões do programa das lojas (#649): as releases do `sakura-corp/ssace-versoes` (público, docs/operacao.md). O painel só
// lê; publicar, liberar e voltar versão continuam nos workflows, com a aprovação da Sofia. Canal de teste = release marcada
// como pré-lançamento; liberada = sem a marca; a que o GitHub dá como "a mais recente" é a que as lojas recebem hoje
// (o Liberar marca ela com --latest, scripts/liberar-versao.mjs).
import { linkSeguro } from "../src/logica/link";
import { ORGANIZACAO } from "./github";

/** Quantas versões a página mostra. */
export const QUANTAS_VERSOES = 20;

export const REPOSITORIO_DAS_VERSOES = "ssace-versoes";

/**
 * Busca umas a mais: um rascunho (só quem escreve lá vê) não pode tirar uma versão de verdade da lista. A `latestRelease` vem
 * à parte: a das lojas pode ser mais velha que as 20 (muita versão de teste depois dela, ou voltou pra uma antiga).
 */
export const CONSULTA_DAS_VERSOES = `
query Versoes($dono: String!, $nome: String!) {
  repository(owner: $dono, name: $nome) {
    releases(first: ${QUANTAS_VERSOES + 10}, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { tagName url isPrerelease isDraft isLatest publishedAt createdAt }
    }
    latestRelease { tagName url isPrerelease isDraft publishedAt createdAt }
  }
}`;

export const variaveisDasVersoes = { dono: ORGANIZACAO, nome: REPOSITORIO_DAS_VERSOES };

/** O motivo que a página reconhece: o login do painel não alcança o ssace-versoes. */
export const ERRO_SEM_ACESSO_AS_VERSOES = "sem acesso às versões";

type NoDaRelease = {
  tagName?: string;
  url?: string;
  isPrerelease?: boolean;
  isDraft?: boolean;
  isLatest?: boolean;
  publishedAt?: string | null;
  createdAt?: string;
};

export type DadosDasVersoes = {
  repository: {
    releases: { nodes?: (NoDaRelease | null)[] | null } | null;
    latestRelease?: NoDaRelease | null;
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

export type RespostaDasVersoes = {
  versoes: Versao[];
  /** Só quando a que as lojas recebem hoje não coube nas 20. */
  nasLojasForaDaLista?: Versao;
};

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

/** Um nó do GitHub vira versão; rascunho ou nó estragado → null. */
function versaoDoNo(no: NoDaRelease | null | undefined): Versao | null {
  if (!no || no.isDraft === true) return null;
  if (typeof no.tagName !== "string" || no.tagName.trim() === "") return null;
  if (typeof no.isPrerelease !== "boolean") return null;
  const data = typeof no.publishedAt === "string" ? no.publishedAt : no.createdAt;
  if (typeof data !== "string" || Number.isNaN(Date.parse(data))) return null;
  const url = linkSeguro(typeof no.url === "string" ? no.url : undefined);
  return { versao: no.tagName, canal: no.isPrerelease ? "teste" : "liberada", publicadaEm: data, ...(url ? { url } : {}) };
}

/**
 * O que /api/versoes devolve: as 20 mais novas, sem rascunho, ordenadas aqui de novo sem confiar no GitHub.
 * Só uma é "nas lojas", e nunca um pré-lançamento: a `latestRelease` do GitHub; sem ela, a marcada com `isLatest` (a de
 * número maior, se vierem duas). Se ela não coube nas 20, vem à parte em `nasLojasForaDaLista`.
 * O repositório que volta null (o login não alcança o ssace-versoes) é tratado antes, na rota.
 */
export function versoesDosDados(dados: DadosDasVersoes): RespostaDasVersoes {
  const versoes: Versao[] = [];
  const marcadas = new Set<Versao>();
  for (const no of dados.repository?.releases?.nodes ?? []) {
    const versao = versaoDoNo(no);
    if (!versao) continue;
    if (no?.isLatest === true && versao.canal === "liberada") marcadas.add(versao);
    versoes.push(versao);
  }
  versoes.sort(compararVersoes);
  const lista = versoes.slice(0, QUANTAS_VERSOES);
  const ultima = versaoDoNo(dados.repository?.latestRelease);
  const daLoja = ultima && ultima.canal === "liberada" ? ultima : null;
  const nasLojas = daLoja ? lista.find((v) => v.versao === daLoja.versao) : versoes.find((v) => marcadas.has(v));
  const fora = daLoja && !nasLojas ? daLoja : null;
  return {
    versoes: lista.map((v) => {
      const { versao, canal, publicadaEm, url } = v;
      return { versao, canal, ...(v === nasLojas ? { nasLojas: true as const } : {}), publicadaEm, ...(url ? { url } : {}) };
    }),
    ...(fora ? { nasLojasForaDaLista: { versao: fora.versao, canal: fora.canal, nasLojas: true as const, publicadaEm: fora.publicadaEm, ...(fora.url ? { url: fora.url } : {}) } } : {}),
  };
}

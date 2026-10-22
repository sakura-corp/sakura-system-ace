// A fase Testando (#646): o que testar (`docs/relatorios/leva-N-testes.md`, na main) e os defeitos achados.
// O texto do arquivo vai pra página como texto puro (a tela nunca interpreta HTML). Decisões da Sofia, 19/10/2026.
import { linkSeguro } from "../src/logica/link";
import type { DefeitoDaLeva, RespostaDosTestes } from "../src/tipos";
import { variaveisDoRepositorio } from "./tarefas";

/** O texto da lista de testes passa disso (em caracteres): corta e avisa. A da leva 3 já tem uns 25 mil (22/10). */
export const MAXIMO_DO_TEXTO = 80_000;

/** Os defeitos abertos olhados (os criados por último). */
export const MAXIMO_DE_DEFEITOS = 50;

/** A etiqueta de defeito: nasce sem `leva-N`, e a Sofia decide se entra na leva atual (docs/painel.md). */
export const ETIQUETA_DE_DEFEITO = "defeito";

// `tarefas`: as fechadas da leva, só pra saber quando a última fechou (a entrada em Testando). As etiquetas servem pra
// pular os defeitos que entraram na leva: fechar um deles não pode mover o "desde" e esconder os outros abertos.
export const CONSULTA_DOS_TESTES = `
query Testes($dono: String!, $nome: String!, $arquivo: String!, $etiqueta: String!) {
  repository(owner: $dono, name: $nome) {
    arquivo: object(expression: $arquivo) { ... on Blob { text isBinary } }
    tarefas: issues(first: 100, labels: [$etiqueta], states: CLOSED, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { closedAt labels(first: 30) { nodes { name } } }
    }
    defeitos: issues(first: ${MAXIMO_DE_DEFEITOS}, labels: ["${ETIQUETA_DE_DEFEITO}"], states: OPEN, orderBy: { field: CREATED_AT, direction: DESC }) {
      totalCount
      nodes { number title url createdAt }
    }
  }
}`;

type TarefaFechada = { closedAt: string | null; labels?: { nodes: ({ name: string } | null)[] | null } | null };

export type DadosDosTestes = {
  repository: {
    /** null quando o arquivo não existe na main. */
    arquivo: { text?: string | null; isBinary?: boolean | null } | null;
    tarefas: { nodes: (TarefaFechada | null)[] } | null;
    defeitos: { totalCount: number; nodes: ({ number: number; title: string; url: string; createdAt: string } | null)[] } | null;
  } | null;
};

/** /api/leva/3/testes → 3; outro caminho → null. */
export function testesDoCaminho(caminho: string): number | null {
  const achou = /^\/api\/leva\/(\d{1,4})\/testes$/.exec(caminho);
  return achou ? Number(achou[1]) : null;
}

/** As variáveis da consulta: o arquivo da leva na main e a etiqueta dela. */
export const variaveisDosTestes = (numero: number) => ({
  ...variaveisDoRepositorio,
  arquivo: `main:docs/relatorios/leva-${numero}-testes.md`,
  etiqueta: `leva-${numero}`,
});

/** O maior `closedAt` válido das tarefas que não são defeito, como veio do GitHub; null se nenhum serve. */
function ultimoFechamento(nos: (TarefaFechada | null)[]): { texto: string; tempo: number } | null {
  let maior: { texto: string; tempo: number } | null = null;
  for (const n of nos) {
    if (n?.labels?.nodes?.some((e) => e?.name === ETIQUETA_DE_DEFEITO)) continue;
    const tempo = n?.closedAt ? Date.parse(n.closedAt) : NaN;
    if (Number.isFinite(tempo) && (maior === null || tempo > maior.tempo)) maior = { texto: n!.closedAt!, tempo };
  }
  return maior;
}

/**
 * O que /api/leva/<n>/testes devolve. `texto`: o arquivo como veio (null se não existe ou é binário).
 * `defeitos`: os abertos com `defeito` criados desde que a última tarefa da leva fechou (`desde`).
 */
export function testesDosDados(numero: number, dados: DadosDosTestes): RespostaDosTestes {
  const repo = dados.repository;
  const arquivo = repo?.arquivo;
  const bruto = arquivo && !arquivo.isBinary && typeof arquivo.text === "string" ? arquivo.text : null;
  const resposta: RespostaDosTestes = { numero, texto: bruto === null ? null : bruto.slice(0, MAXIMO_DO_TEXTO), desde: null, defeitos: [] };
  if (bruto !== null && bruto.length > MAXIMO_DO_TEXTO) resposta.textoCortado = true;

  const desde = ultimoFechamento(repo?.tarefas?.nodes ?? []);
  if (!desde) return resposta;
  resposta.desde = desde.texto;
  const defeitos: DefeitoDaLeva[] = [];
  for (const d of repo?.defeitos?.nodes ?? []) {
    if (!d || !(Date.parse(d.createdAt) >= desde.tempo)) continue;
    const url = linkSeguro(d.url);
    defeitos.push({ numero: d.number, titulo: d.title, ...(url ? { url } : {}), criadaEm: d.createdAt });
  }
  resposta.defeitos = defeitos;
  // Cortada só se o mais velho que veio ainda é da leva: senão, os que ficaram de fora são mais velhos ainda.
  const vieram = (repo?.defeitos?.nodes ?? []).filter((d) => d !== null);
  const maisVelho = vieram.at(-1);
  if ((repo?.defeitos?.totalCount ?? 0) > vieram.length && maisVelho && Date.parse(maisVelho.createdAt) >= desde.tempo) resposta.defeitosCortados = true;
  return resposta;
}

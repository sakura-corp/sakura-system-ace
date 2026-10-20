// A fase Testando (#646): o que testar (`docs/relatorios/leva-N-testes.md`, na main) e os defeitos achados.
// O texto do arquivo vai pra página como texto puro (a tela nunca interpreta HTML). Decisões da Sofia, 19/10/2026.
import { linkSeguro } from "../src/logica/link";
import type { DefeitoDaLeva, RespostaDosTestes } from "../src/tipos";
import { variaveisDoRepositorio } from "./tarefas";

/** O texto da lista de testes passa disso (em caracteres): corta e avisa. */
export const MAXIMO_DO_TEXTO = 20_000;

/** Os defeitos abertos olhados (os criados por último). */
export const MAXIMO_DE_DEFEITOS = 50;

/** A etiqueta de defeito: nasce sem `leva-N`, e a Sofia decide se entra na leva atual (docs/painel.md). */
export const ETIQUETA_DE_DEFEITO = "defeito";

// `tarefas`: as fechadas da leva, só pra saber quando a última fechou (a entrada em Testando).
export const CONSULTA_DOS_TESTES = `
query Testes($dono: String!, $nome: String!, $arquivo: String!, $etiqueta: String!) {
  repository(owner: $dono, name: $nome) {
    arquivo: object(expression: $arquivo) { ... on Blob { text isBinary } }
    tarefas: issues(first: 100, labels: [$etiqueta], states: CLOSED, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { closedAt }
    }
    defeitos: issues(first: ${MAXIMO_DE_DEFEITOS}, labels: ["${ETIQUETA_DE_DEFEITO}"], states: OPEN, orderBy: { field: CREATED_AT, direction: DESC }) {
      totalCount
      nodes { number title url createdAt }
    }
  }
}`;

export type DadosDosTestes = {
  repository: {
    /** null quando o arquivo não existe na main. */
    arquivo: { text?: string | null; isBinary?: boolean | null } | null;
    tarefas: { nodes: ({ closedAt: string | null } | null)[] } | null;
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

/** O maior `closedAt` válido, como veio do GitHub; null se nenhum serve. */
function ultimoFechamento(nos: ({ closedAt: string | null } | null)[]): { texto: string; tempo: number } | null {
  let maior: { texto: string; tempo: number } | null = null;
  for (const n of nos) {
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
  const nos = repo?.defeitos?.nodes?.length ?? 0;
  if ((repo?.defeitos?.totalCount ?? 0) > nos) resposta.defeitosCortados = true;
  return resposta;
}

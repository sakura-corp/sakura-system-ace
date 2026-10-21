// O relatório da leva (#647): o arquivo `docs/relatorios/leva-N.md`. PR aberto com o arquivo = esperando a aprovação
// da Sofia; arquivo na main = aprovado (aprovar é mesclar o PR, nunca um botão do painel). A leva 0 é de antes das fases.
// O texto vai pra página como texto puro (a tela nunca interpreta HTML).
import { antesDasFases, levaDoRelatorioNoPr } from "../src/logica/fases";
import { linkSeguro } from "../src/logica/link";
import { MAXIMO_DE_PRS, variaveisDoRepositorio } from "./tarefas";

/** O texto do relatório passa disso (em caracteres): corta e avisa. */
export const MAXIMO_DO_RELATORIO = 50_000;

/** Quantos arquivos de cada PR aberto são olhados (o máximo que o GitHub dá numa página). */
const MAXIMO_DE_ARQUIVOS = 100;

// `naMain`: o arquivo na main. `prsAbertos`: os PRs abertos, com os arquivos e o texto do relatório no último commit
// (`Commit.file` funciona também pra PR de fork, onde o branch não existe no nosso repositório).
export const CONSULTA_DO_RELATORIO = `
query Relatorio($dono: String!, $nome: String!, $arquivo: String!, $caminho: String!) {
  repository(owner: $dono, name: $nome) {
    naMain: object(expression: $arquivo) { ... on Blob { text isBinary } }
    prsAbertos: pullRequests(states: OPEN, first: ${MAXIMO_DE_PRS}, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        number
        url
        author { login }
        authorAssociation
        files(first: ${MAXIMO_DE_ARQUIVOS}) { nodes { path changeType } }
        commits(last: 1) { nodes { commit { file(path: $caminho) { object { ... on Blob { text isBinary } } } } } }
      }
    }
  }
}`;

type Arquivo = { text?: string | null; isBinary?: boolean | null } | null | undefined;

export type PrAberto = {
  number: number;
  url?: string;
  author?: { login?: string | null } | null;
  authorAssociation?: string | null;
  files?: { nodes?: ({ path?: string; changeType?: string } | null)[] | null } | null;
  commits?: { nodes?: ({ commit?: { file?: { object?: Arquivo } | null } | null } | null)[] | null } | null;
};

export type DadosDoRelatorio = {
  repository: {
    /** null quando o arquivo não existe na main. */
    naMain: Arquivo;
    prsAbertos: { nodes?: (PrAberto | null)[] | null } | null;
  } | null;
};

export type RespostaDoRelatorio = {
  numero: number;
  situacao: "antes-das-fases" | "aprovado" | "esperando" | "sem-relatorio";
  /** O arquivo como veio (cortado em MAXIMO_DO_RELATORIO); null se não há texto. */
  texto: string | null;
  textoCortado?: true;
  /**
   * Só em "esperando". O link só vem se for da sakura-corp. `autor`: quem abriu. `deFora`: quem abriu não é da equipe
   * (o repositório é público: qualquer pessoa pode abrir um PR com o arquivo).
   */
  pr?: { numero: number; url?: string; autor?: string; deFora?: true };
  /** Quantos PRs abertos A MAIS mexem no mesmo arquivo. */
  outrosPrs?: number;
};

/** /api/leva/3/relatorio → 3; outro caminho → null. */
export function relatorioDoCaminho(caminho: string): number | null {
  const achou = /^\/api\/leva\/(\d{1,4})\/relatorio$/.exec(caminho);
  return achou ? Number(achou[1]) : null;
}

/** As variáveis da consulta: o arquivo da leva na main e o caminho dele dentro do PR. */
export const variaveisDoRelatorio = (numero: number) => ({
  ...variaveisDoRepositorio,
  arquivo: `main:docs/relatorios/leva-${numero}.md`,
  caminho: `docs/relatorios/leva-${numero}.md`,
});

/** Quem é da equipe no GitHub: a dona, os membros da organização e quem tem acesso ao repositório. */
const LIGACOES_DA_EQUIPE: readonly string[] = ["OWNER", "MEMBER", "COLLABORATOR"];
const daEquipe = (pr: PrAberto): boolean => LIGACOES_DA_EQUIPE.includes(pr.authorAssociation ?? "");

const textoDe = (arquivo: Arquivo): string | null => (arquivo && !arquivo.isBinary && typeof arquivo.text === "string" ? arquivo.text : null);

/** O PR mexe (e não só apaga) no relatório desta leva? */
function mexeNoRelatorio(pr: PrAberto, numero: number): boolean {
  return (pr.files?.nodes ?? []).some((f) => f?.changeType !== "DELETED" && typeof f?.path === "string" && levaDoRelatorioNoPr(f.path) === numero);
}

/** O que /api/leva/<n>/relatorio devolve. */
export function relatorioDosDados(numero: number, dados: DadosDoRelatorio): RespostaDoRelatorio {
  if (antesDasFases(numero)) return { numero, situacao: "antes-das-fases", texto: null };
  const repo = dados.repository;
  const comTexto = (situacao: "aprovado" | "esperando", bruto: string | null): RespostaDoRelatorio => ({
    numero,
    situacao,
    texto: bruto === null ? null : bruto.slice(0, MAXIMO_DO_RELATORIO),
    ...(bruto !== null && bruto.length > MAXIMO_DO_RELATORIO ? { textoCortado: true as const } : {}),
  });

  const daMain = textoDe(repo?.naMain);
  if (daMain !== null) return comTexto("aprovado", daMain);

  // A consulta já traz os PRs do atualizado por último: o primeiro da equipe que bate é o que a página mostra (um PR
  // de fora atualizado depois não toma a página); sem nenhum da equipe, o primeiro de fora, marcado.
  const prs = (repo?.prsAbertos?.nodes ?? []).filter((p): p is PrAberto => p !== null && p !== undefined && mexeNoRelatorio(p, numero));
  if (prs.length === 0) return { numero, situacao: "sem-relatorio", texto: null };
  const escolhido = prs.find(daEquipe) ?? prs[0];
  const outros = prs.length - 1;
  const url = linkSeguro(escolhido.url);
  const autor = typeof escolhido.author?.login === "string" ? escolhido.author.login : undefined;
  return {
    ...comTexto("esperando", textoDe(escolhido.commits?.nodes?.[0]?.commit?.file?.object)),
    pr: { numero: escolhido.number, ...(url ? { url } : {}), ...(autor ? { autor } : {}), ...(daEquipe(escolhido) ? {} : { deFora: true as const }) },
    ...(outros > 0 ? { outrosPrs: outros } : {}),
  };
}

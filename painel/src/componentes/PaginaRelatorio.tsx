// O relatório da leva (#647): o arquivo `docs/relatorios/leva-N.md`, lido do GitHub. PR aberto com ele = esperando a
// aprovação da Sofia; na main = aprovado. Aprovar é a Sofia mesclar o PR no GitHub: o painel nunca tem botão de aprovar.
// O texto aparece formatado (#689): títulos, negrito, citações, listas e tabelas. HTML escrito no arquivo nunca roda
// (sem `rehype-raw`, o react-markdown mostra ele como texto), link só se for da sakura-corp e imagem não aparece.
import { CircleCheck, Hourglass } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { RespostaDoRelatorio } from "../../worker/relatorio";
import { linkSeguro } from "../logica/link";
import type { Leva } from "../tipos";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";
import { ErroDaLeva } from "./TelaDaLeva";

export type EstadoDoRelatorio =
  | { tipo: "carregando" }
  /** A sessão acabou (401). */
  | { tipo: "fora" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; relatorio: RespostaDoRelatorio };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não deu pra buscar o relatório no GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";
const SITUACOES: readonly string[] = ["antes-das-fases", "aprovado", "esperando", "sem-relatorio"];

const arquivoDaLeva = (numero: number) => `docs/relatorios/leva-${numero}.md`;

/**
 * Qual leva a barra ("Relatório da leva", sem número) abre: a de menor número que está esperando a aprovação; senão a
 * última aprovada (a leva 0 não tem relatório); senão a atual; senão nenhuma.
 */
export function levaDoRelatorio(levas: Leva[], atual: number | null): number | null {
  const numeros = (filtro: (l: Leva) => boolean) => levas.filter(filtro).map((l) => l.numero);
  const esperando = numeros((l) => l.fase === "relatorio");
  if (esperando.length > 0) return Math.min(...esperando);
  const aprovadas = numeros((l) => l.fase === "aprovada" && !l.antesDasFases);
  if (aprovadas.length > 0) return Math.max(...aprovadas);
  return atual;
}

/**
 * A `key` da página: o número e a fase da leva. Quando a Sofia mescla, o tempo real traz a lista com a fase nova, a chave
 * muda e a página busca o relatório de novo (senão ficaria "esperando" ao lado da barra dizendo Aprovada).
 */
export function chaveDoRelatorio(numero: number, levas: Leva[]): string {
  return `${numero}:${levas.find((l) => l.numero === numero)?.fase ?? ""}`;
}

/** Busca /api/leva/<n>/relatorio e confere o formato. O link do PR só passa se for da sakura-corp. */
export async function carregarRelatorio(numero: number, buscar: Buscar = fetch): Promise<EstadoDoRelatorio> {
  let resposta: Response;
  try {
    resposta = await buscar(`/api/leva/${numero}/relatorio`, { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  let corpo: Partial<RespostaDoRelatorio> | null;
  try {
    corpo = (await resposta.json()) as Partial<RespostaDoRelatorio> | null;
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  const { situacao, texto, pr, outrosPrs } = corpo ?? {};
  if (typeof situacao !== "string" || !SITUACOES.includes(situacao) || (texto !== null && typeof texto !== "string")) {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  if (pr !== undefined && (typeof pr !== "object" || pr === null || typeof pr.numero !== "number")) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  const url = linkSeguro(pr?.url);
  return {
    tipo: "pronto",
    relatorio: {
      numero,
      situacao: situacao as RespostaDoRelatorio["situacao"],
      texto,
      ...(corpo?.textoCortado === true ? { textoCortado: true as const } : {}),
      ...(pr
        ? { pr: { numero: pr.numero, ...(url ? { url } : {}), ...(typeof pr.autor === "string" ? { autor: pr.autor } : {}), ...(pr.deFora === true ? { deFora: true as const } : {}) } }
        : {}),
      ...(typeof outrosPrs === "number" && outrosPrs > 0 ? { outrosPrs } : {}),
    },
  };
}

const CAIXA = "mt-4 min-w-0 rounded-xl border border-borda bg-cartao px-4 py-4 sm:px-5";

/** O link do PR, em aba nova (ou só o número, se o endereço não é da sakura-corp). */
function LinkDoPr({ pr }: { pr: NonNullable<RespostaDoRelatorio["pr"]> }) {
  if (!pr.url) return <span>PR #{pr.numero}</span>;
  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
    >
      Ver o PR #{pr.numero} no GitHub<span className="sr-only"> (abre em aba nova)</span>
    </a>
  );
}

/** Cada pedaço do markdown com o estilo do painel (claro e escuro vêm das cores do tema). */
const PEDACOS: Components = {
  h1: ({ children }) => <h2 className="mt-5 text-lg font-semibold first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-5 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 text-sm font-semibold first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-4 text-sm font-semibold first:mt-0">{children}</h5>,
  h5: ({ children }) => <h6 className="mt-4 text-sm font-semibold first:mt-0">{children}</h6>,
  h6: ({ children }) => <h6 className="mt-4 text-sm font-semibold first:mt-0">{children}</h6>,
  p: ({ children }) => <p className="mt-3 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5 first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5 first:mt-0">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="mt-3 border-l-4 border-borda pl-3 text-texto-2 first:mt-0">{children}</blockquote>,
  code: ({ children }) => <code className="break-words rounded bg-fundo px-1 font-mono text-[13px]">{children}</code>,
  pre: ({ children }) => <pre className="mt-3 overflow-x-auto rounded-lg bg-fundo p-3 first:mt-0 [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  hr: () => <hr className="mt-4 border-borda" />,
  // A tabela larga rola de lado dentro da caixa, nunca a página inteira (celular de 375 px).
  table: ({ children }) => (
    <div className="mt-3 max-w-full overflow-x-auto first:mt-0">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  ),
  th: ({ children, style }) => <th style={style} className="border-b border-borda px-2 py-1.5 align-top font-semibold">{children}</th>,
  td: ({ children, style }) => <td style={style} className="border-b border-borda px-2 py-1.5 align-top">{children}</td>,
  // Link só se for do GitHub da sakura-corp, em aba nova; qualquer outro vira texto.
  a: ({ href, children }) => {
    const url = linkSeguro(href);
    if (!url) return <span>{children}</span>;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque">
        {children}
      </a>
    );
  },
  // Imagem não aparece (nem carrega).
  img: () => null,
};

/** O texto do relatório formatado. HTML no arquivo (um <script>, um <img onerror>) aparece escrito e não roda. */
function TextoDoRelatorio({ relatorio }: { relatorio: RespostaDoRelatorio }) {
  if (relatorio.texto === null) return <p className="mt-3 text-sm text-texto-2">O texto do relatório não pôde ser lido aqui. Abra o PR no GitHub.</p>;
  return (
    <>
      <div className="mt-3 min-w-0 break-words text-sm leading-relaxed">
        <Markdown remarkPlugins={[remarkGfm]} components={PEDACOS}>
          {relatorio.texto}
        </Markdown>
      </div>
      {relatorio.textoCortado && (
        <p className="mt-2 text-sm text-texto-2">
          O relatório é grande: só o começo aparece aqui. O resto está no arquivo, no GitHub{relatorio.pr ? <> (<LinkDoPr pr={relatorio.pr} />)</> : null}.
        </p>
      )}
    </>
  );
}

type PropsDoConteudo = { numero: number; estado: EstadoDoRelatorio; tentarDeNovo?: () => void };

/** O relatório, a partir do estado da busca (separado da busca pra dar pra testar sem rede). */
export function ConteudoDoRelatorio({ numero, estado, tentarDeNovo }: PropsDoConteudo) {
  if (estado.tipo === "carregando") {
    return (
      <p role="status" aria-busy="true" className={`${CAIXA} text-sm text-texto-2`}>
        Buscando o relatório no GitHub…
      </p>
    );
  }
  if (estado.tipo === "fora") {
    return (
      <p role="alert" className={`${CAIXA} text-sm`}>
        A sessão acabou. Recarregue a página e entre de novo para ver o relatório.
      </p>
    );
  }
  if (estado.tipo === "erro") {
    return (
      <div className="mt-4">
        <ErroDaLeva mensagem={estado.mensagem} tentarDeNovo={tentarDeNovo ?? (() => {})} />
      </div>
    );
  }
  const r = estado.relatorio;
  if (r.situacao === "antes-das-fases") {
    return <p className={`${CAIXA} text-sm`}>A leva {numero} é de antes das fases: aprovada, sem relatório.</p>;
  }
  if (r.situacao === "sem-relatorio") {
    return (
      <div className={CAIXA}>
        <p className="text-sm font-medium">Esta leva ainda não tem relatório.</p>
        <p className="mt-1 text-sm text-texto-2">
          Ele aparece aqui quando o PR com <code className="break-all font-mono">{arquivoDaLeva(numero)}</code> for aberto.
        </p>
      </div>
    );
  }
  const esperando = r.situacao === "esperando";
  return (
    <section aria-label={`Relatório da leva ${numero}`} className={CAIXA}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {esperando ? (
          <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-revisao-fundo px-3 py-1 text-sm font-medium text-revisao">
            <Hourglass aria-hidden="true" className="size-4" />
            Esperando a aprovação da Sofia
          </span>
        ) : (
          <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-feita-fundo px-3 py-1 text-sm font-medium text-feita">
            <CircleCheck aria-hidden="true" className="size-4" />
            Aprovado pela Sofia
          </span>
        )}
        {esperando && r.pr && (
          <span className="text-sm">
            <LinkDoPr pr={r.pr} />
            {r.pr.autor ? <span className="text-texto-2">, aberto por @{r.pr.autor}</span> : null}
          </span>
        )}
      </div>
      {esperando && r.pr?.deFora ? (
        <p role="alert" className="mt-3 text-sm font-medium text-revisao">
          Este PR foi aberto por alguém de fora da sakura-corp. Confira no GitHub antes de confiar no texto.
        </p>
      ) : null}
      {esperando && r.outrosPrs ? (
        <p className="mt-3 text-sm text-texto-2">
          Atenção: há mais {r.outrosPrs} {r.outrosPrs === 1 ? "PR" : "PRs"} abertos mexendo neste relatório. Aqui aparece o da equipe atualizado por último.
        </p>
      ) : null}
      {esperando && r.pr ? <p className="mt-3 text-[13px] font-medium text-texto-2">Texto do PR #{r.pr.numero}:</p> : null}
      <TextoDoRelatorio relatorio={r} />
      <p className="mt-3 text-[13px] text-texto-2">
        {esperando ? "Do PR aberto: " : "Vem de "}
        <code className="break-all font-mono">{arquivoDaLeva(numero)}</code>
        {esperando ? ". A Sofia aprova mesclando o PR no GitHub." : ", na main."}
      </p>
    </section>
  );
}

type Props = {
  /** A leva do relatório (ver `levaDoRelatorio`); null só sem login, quando não há leva nenhuma. */
  numero: number | null;
  /** Sem login (só no `npm run dev`): não busca nada. */
  semLogin?: boolean;
  /** Só nos testes: em vez de buscar no worker. */
  buscar?: Buscar;
};

/** A página inteira: o cabeçalho e o relatório da leva, buscado no worker. */
export function PaginaRelatorio({ numero, semLogin = false, buscar = fetch }: Props) {
  const [estado, setEstado] = useState<EstadoDoRelatorio>({ tipo: "carregando" });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (semLogin || numero === null) return;
    let vale = true;
    setEstado({ tipo: "carregando" });
    void carregarRelatorio(numero, buscar).then((novo) => {
      if (vale) setEstado(novo);
    });
    return () => {
      vale = false;
    };
  }, [numero, buscar, vez, semLogin]);
  const tentarDeNovo = useCallback(() => setVez((v) => v + 1), []);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <CabecalhoDaPagina trilha="1º · Produção" titulo={numero === null ? "Relatório da leva" : `Relatório da leva ${numero}`} explicacao="O que foi feito na leva, e se a Sofia já aprovou." />
      {semLogin || numero === null ? (
        <p className={`${CAIXA} text-sm text-texto-2`}>Sem login, o relatório não abre. Entre pelo painel de verdade.</p>
      ) : (
        <ConteudoDoRelatorio numero={numero} estado={estado} tentarDeNovo={tentarDeNovo} />
      )}
    </div>
  );
}

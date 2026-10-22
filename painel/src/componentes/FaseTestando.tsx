// A fase Testando na tela da leva (#646): o aviso de leva congelada, o que testar e os defeitos achados.
// A lista de testes vem de `docs/relatorios/leva-N-testes.md` (na main) e aparece como texto puro: nada é
// interpretado como HTML. Decisões da Sofia na entrevista de 19/10/2026 (docs/painel.md).
import { Bug, Check, ChevronDown, ChevronUp, Copy, ExternalLink, RotateCw, Snowflake } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { copiarTexto, type ResultadoDaCopia } from "../logica/copiarTexto";
import { linkSeguro } from "../logica/link";
import type { DefeitoDaLeva, RespostaDosTestes } from "../tipos";

export type EstadoDosTestes =
  | { tipo: "carregando" }
  /** A sessão acabou (401). */
  | { tipo: "fora" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; testes: RespostaDosTestes };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não deu pra buscar a lista de testes no GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";

const ehDefeito = (d: unknown): d is DefeitoDaLeva => {
  if (typeof d !== "object" || d === null) return false;
  const { numero, titulo, url, criadaEm } = d as Record<string, unknown>;
  return typeof numero === "number" && typeof titulo === "string" && typeof criadaEm === "string" && (url === undefined || typeof url === "string");
};

/** Busca /api/leva/<n>/testes e confere o formato. O link de cada defeito só passa se for da sakura-corp. */
export async function carregarTestes(numero: number, buscar: Buscar = fetch): Promise<EstadoDosTestes> {
  let resposta: Response;
  try {
    resposta = await buscar(`/api/leva/${numero}/testes`, { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  let corpo: Partial<RespostaDosTestes>;
  try {
    corpo = (await resposta.json()) as Partial<RespostaDosTestes>;
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  const texto = corpo?.texto;
  if ((texto !== null && typeof texto !== "string") || !Array.isArray(corpo.defeitos) || !corpo.defeitos.every(ehDefeito)) {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  const defeitos = corpo.defeitos.map(({ numero: n, titulo, url, criadaEm }) => {
    const seguro = linkSeguro(url);
    return { numero: n, titulo, ...(seguro ? { url: seguro } : {}), criadaEm };
  });
  return {
    tipo: "pronto",
    testes: {
      numero,
      texto,
      ...(corpo.textoCortado === true ? { textoCortado: true as const } : {}),
      desde: typeof corpo.desde === "string" ? corpo.desde : null,
      defeitos,
      ...(corpo.defeitosCortados === true ? { defeitosCortados: true as const } : {}),
    },
  };
}

/** O aviso do topo, grande: a leva congelou. */
export function AvisoDeLevaCongelada({ numero }: { numero: number }) {
  return (
    <div role="status" className="mt-4 flex min-w-0 items-start gap-3 rounded-xl border border-borda bg-revisao-fundo px-4 py-4 text-revisao sm:px-5">
      <Snowflake aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-snug sm:text-xl">Leva congelada: não pegue tarefa nova.</p>
        <p className="mt-1 text-sm">
          Todas as tarefas da leva {numero} fecharam. Agora é testar o que está abaixo e abrir um defeito no GitHub (etiqueta{" "}
          <code className="font-mono">defeito</code>) para cada problema.
        </p>
      </div>
    </div>
  );
}

type PropsDoConteudo = { numero: number; estado: EstadoDosTestes; tentarDeNovo?: () => void };

/** O que testar e os defeitos, a partir do estado da busca (separado da busca pra dar pra testar sem rede). */
export function ConteudoDaFaseTestando({ numero, estado, tentarDeNovo }: PropsDoConteudo) {
  if (estado.tipo === "carregando") {
    return (
      <p role="status" aria-busy="true" className="mt-4 rounded-xl border border-borda bg-cartao px-4 py-4 text-sm text-texto-2">
        Buscando a lista de testes e os defeitos no GitHub…
      </p>
    );
  }
  if (estado.tipo === "fora" || estado.tipo === "erro") {
    return (
      <div role="alert" className="mt-4 rounded-xl border border-borda bg-cartao px-4 py-4 text-sm">
        <p>{estado.tipo === "fora" ? "A sessão acabou. Recarregue a página e entre de novo para ver a lista de testes." : estado.mensagem}</p>
        {estado.tipo === "erro" && tentarDeNovo && (
          <button
            type="button"
            onClick={tentarDeNovo}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-destaque px-4 py-2 text-sm font-medium text-sobre-destaque hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
          >
            <RotateCw aria-hidden="true" className="size-4" />
            Tentar de novo
          </button>
        )}
      </div>
    );
  }
  const { texto, textoCortado, defeitos, defeitosCortados } = estado.testes;
  return (
    <div className="mt-4 grid min-w-0 gap-4">
      <section aria-labelledby="titulo-o-que-testar" className="min-w-0 rounded-xl border border-borda bg-cartao px-4 py-4 sm:px-5">
        <h2 id="titulo-o-que-testar" className="text-[15px] font-semibold">
          O que testar
        </h2>
        {texto === null ? (
          <p className="mt-2 text-sm text-texto-2">A lista de testes ainda não foi escrita.</p>
        ) : (
          <ListaParaCopiar texto={texto} cortado={!!textoCortado} />
        )}
        <p className="mt-3 text-[13px] text-texto-2">
          Vem de <code className="break-all font-mono">docs/relatorios/leva-{numero}-testes.md</code>, na main.
        </p>
      </section>

      <section aria-labelledby="titulo-defeitos" className="min-w-0 rounded-xl border border-borda bg-cartao px-4 py-4 sm:px-5">
        <h2 id="titulo-defeitos" className="text-[15px] font-semibold">
          Defeitos achados <span className="tabular-nums">({defeitos.length})</span>
        </h2>
        {defeitos.length === 0 ? (
          <p className="mt-2 text-sm text-texto-2">Nenhum defeito achado desde que a leva congelou.</p>
        ) : (
          <ul className="mt-2 divide-y divide-borda">
            {defeitos.map((d) => (
              <LinhaDoDefeito key={d.numero} defeito={d} />
            ))}
          </ul>
        )}
        {defeitosCortados && <p className="mt-2 text-sm text-texto-2">Só os defeitos abertos mais novos foram olhados: pode haver mais no GitHub.</p>}
        <p className="mt-3 text-[13px] text-texto-2">A Sofia decide se cada um entra nesta leva ou fica para a próxima.</p>
      </section>
    </div>
  );
}

const BOTAO =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";

/**
 * A lista é pra levar pro Claude, não pra ler aqui (Sofia, 22/10: "muito grande, difícil copiar tudo", "deixar claro
 * que é algo pra pegar"). Em cima, o que fazer e o botão de copiar; embaixo, a lista numa janelinha que abre inteira.
 */
export function ListaParaCopiar({ texto, cortado }: { texto: string; cortado: boolean }) {
  const [aberta, setAberta] = useState(false);
  const [copia, setCopia] = useState<ResultadoDaCopia | null>(null);
  const aviso = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(aviso.current), []);

  async function copiar() {
    const r = await copiarTexto(texto, navigator.clipboard);
    window.clearTimeout(aviso.current);
    setCopia(r);
    // Não deu pra copiar sozinho: abre a lista pra pessoa selecionar e copiar à mão.
    if (r === "plano-b") setAberta(true);
    else aviso.current = window.setTimeout(() => setCopia(null), 6000);
  }

  return (
    <>
      <div className="mt-3 rounded-lg border border-borda bg-fundo px-4 py-3">
        <p className="text-sm font-semibold">Leve esta lista pro seu Claude</p>
        <ol className="mt-1 list-decimal pl-5 text-sm leading-relaxed">
          <li>Clique em "Copiar a lista inteira".</li>
          <li>Abra o Claude Code na pasta do projeto e cole.</li>
          <li>Ele prepara o programa e te guia, um teste por vez.</li>
        </ol>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={copiar} className={`${BOTAO} bg-destaque text-sobre-destaque`}>
            {copia === "copiado" ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copia === "copiado" ? "Copiado" : "Copiar a lista inteira"}
          </button>
          <p role="status" className="text-sm text-texto-2">
            {copia === "copiado" && "Pronto: agora é só colar no Claude."}
            {copia === "plano-b" && "Não deu pra copiar sozinho. A lista abriu: selecione o texto e copie."}
          </p>
        </div>
        {cortado && <p className="mt-2 text-sm text-texto-2">A lista é grande demais: o botão copia só o começo. A lista inteira está no arquivo, no GitHub.</p>}
      </div>

      <div className="relative mt-3">
        {/* Texto puro: o React escapa tudo, então um <script> no arquivo aparece escrito e não roda. */}
        <pre
          id="lista-de-testes"
          className={`min-w-0 whitespace-pre-wrap break-words rounded-lg border border-borda px-3 py-3 font-sans text-sm leading-relaxed ${aberta ? "" : "max-h-56 overflow-hidden"}`}
        >
          {texto}
        </pre>
        {!aberta && <div aria-hidden="true" className="pointer-events-none absolute inset-x-px bottom-px h-16 rounded-b-lg bg-linear-to-t from-cartao to-transparent" />}
      </div>
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
        aria-controls="lista-de-testes"
        className={`${BOTAO} mt-2 border border-borda bg-cartao text-texto`}
      >
        {aberta ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
        {aberta ? "Fechar a lista" : "Ver a lista inteira"}
      </button>
    </>
  );
}

function LinhaDoDefeito({ defeito }: { defeito: DefeitoDaLeva }) {
  const url = linkSeguro(defeito.url);
  const conteudo = (
    <>
      <Bug aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="shrink-0 tabular-nums text-texto-2">#{defeito.numero}</span>
      <span className="min-w-0 break-words">{defeito.titulo}</span>
      {url && <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-texto-2" />}
    </>
  );
  return (
    <li className="py-2 text-sm">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex min-w-0 items-start gap-2 rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
        >
          {conteudo}
        </a>
      ) : (
        <span className="flex min-w-0 items-start gap-2">{conteudo}</span>
      )}
    </li>
  );
}

type Props = {
  numero: number;
  /** Só nos testes: em vez de buscar no worker. */
  buscar?: Buscar;
};

/** A fase Testando inteira: o aviso no topo e, embaixo, o que testar e os defeitos, buscados no worker. */
export function FaseTestando({ numero, buscar = fetch }: Props) {
  const [estado, setEstado] = useState<EstadoDosTestes>({ tipo: "carregando" });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vale = true;
    setEstado({ tipo: "carregando" });
    void carregarTestes(numero, buscar).then((novo) => {
      if (vale) setEstado(novo);
    });
    return () => {
      vale = false;
    };
  }, [numero, buscar, vez]);
  const tentarDeNovo = useCallback(() => setVez((v) => v + 1), []);
  return (
    <>
      <AvisoDeLevaCongelada numero={numero} />
      <ConteudoDaFaseTestando numero={numero} estado={estado} tentarDeNovo={tentarDeNovo} />
    </>
  );
}

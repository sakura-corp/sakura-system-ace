// A fase Testando na tela da leva (#646): o aviso de leva congelada, o que testar e os defeitos achados.
// A lista de testes vem de `docs/relatorios/leva-N-testes.md` (na main) e aparece como texto puro: nada é
// interpretado como HTML. Decisões da Sofia na entrevista de 19/10/2026 (docs/painel.md).
import { Bug, ExternalLink, RotateCw, Snowflake } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
          <>
            {/* Texto puro: o React escapa tudo, então um <script> no arquivo aparece escrito e não roda. */}
            <pre className="mt-2 min-w-0 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{texto}</pre>
            {textoCortado && <p className="mt-2 text-sm text-texto-2">A lista é grande: só o começo aparece aqui. O resto está no arquivo, no GitHub.</p>}
          </>
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

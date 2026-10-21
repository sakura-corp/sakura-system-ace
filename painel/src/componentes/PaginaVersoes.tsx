// As versões do programa das lojas (#649): as últimas 20 releases do `ssace-versoes`, a mais nova em cima. O painel só lê:
// não tem botão de publicar, liberar nem voltar versão (isso é nos workflows, com a aprovação da Sofia).
import { CircleCheck, FlaskConical, Store } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { compararVersoes, ERRO_SEM_ACESSO_AS_VERSOES, type RespostaDasVersoes, type Versao } from "../../worker/versoes";
import { linkSeguro } from "../logica/link";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";
import { ErroDaLeva } from "./TelaDaLeva";

export type EstadoDasVersoes =
  | { tipo: "carregando" }
  /** A sessão acabou (401). */
  | { tipo: "fora" }
  /** O login do painel não alcança o repositório das versões. */
  | { tipo: "sem-acesso" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; resposta: RespostaDasVersoes };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não deu pra buscar as versões no GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";
const TODAS_NO_GITHUB = "https://github.com/sakura-corp/ssace-versoes/releases";

const dois = (n: number) => String(n).padStart(2, "0");

/** Dia/mês/ano no fuso de quem olha (nunca toISOString().slice, que é UTC). */
export function dataDaVersao(iso: string): string {
  const d = new Date(iso);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function valida(v: unknown): v is Versao {
  if (typeof v !== "object" || v === null) return false;
  const x = v as Partial<Versao>;
  return typeof x.versao === "string" && (x.canal === "teste" || x.canal === "liberada") && typeof x.publicadaEm === "string" && !Number.isNaN(Date.parse(x.publicadaEm));
}

/** Busca /api/versoes e confere o formato. O link só passa se for da sakura-corp. */
export async function carregarVersoes(buscar: Buscar = fetch): Promise<EstadoDasVersoes> {
  let resposta: Response;
  try {
    resposta = await buscar("/api/versoes", { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  if (!resposta.ok) {
    const erro = typeof corpo === "object" && corpo !== null ? (corpo as { erro?: unknown }).erro : undefined;
    if (resposta.status === 502 && erro === ERRO_SEM_ACESSO_AS_VERSOES) return { tipo: "sem-acesso" };
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  const lista = typeof corpo === "object" && corpo !== null ? (corpo as Partial<RespostaDasVersoes>).versoes : undefined;
  if (!Array.isArray(lista) || !lista.every(valida)) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  const limpa = (v: Versao): Versao => {
    const url = linkSeguro(v.url);
    return { versao: v.versao, canal: v.canal, ...(v.nasLojas === true ? { nasLojas: true as const } : {}), publicadaEm: v.publicadaEm, ...(url ? { url } : {}) };
  };
  const versoes = lista.map(limpa).sort(compararVersoes);
  const fora = (corpo as Partial<RespostaDasVersoes>).nasLojasForaDaLista;
  const nasLojasForaDaLista = valida(fora) && fora.canal === "liberada" ? { ...limpa(fora), nasLojas: true as const } : undefined;
  return { tipo: "pronto", resposta: { versoes, ...(nasLojasForaDaLista ? { nasLojasForaDaLista } : {}) } };
}

const CAIXA = "mt-4 min-w-0 rounded-xl border border-borda bg-cartao px-4 py-4 sm:px-5";
const SELO = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium";

function SeloDoCanal({ canal }: { canal: Versao["canal"] }) {
  if (canal === "teste") {
    return (
      <span className={`${SELO} bg-livre-fundo text-livre`}>
        <FlaskConical aria-hidden="true" className="size-3.5" />
        No canal de teste
      </span>
    );
  }
  return (
    <span className={`${SELO} bg-feita-fundo text-feita`}>
      <CircleCheck aria-hidden="true" className="size-3.5" />
      Liberada
    </span>
  );
}

function LinhaDaVersao({ versao }: { versao: Versao }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:px-5">
      <div className="min-w-0 break-words text-sm font-medium">
        {versao.url ? (
          <a
            href={versao.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
          >
            {versao.versao}
            <span className="sr-only"> (abre em aba nova)</span>
          </a>
        ) : (
          versao.versao
        )}
      </div>
      <span className="text-[13px] text-texto-2">{dataDaVersao(versao.publicadaEm)}</span>
      <SeloDoCanal canal={versao.canal} />
      {versao.nasLojas ? (
        <span className={`${SELO} bg-destaque text-sobre-destaque`}>
          <Store aria-hidden="true" className="size-3.5" />
          Nas lojas hoje
        </span>
      ) : null}
    </li>
  );
}

type PropsDoConteudo = { estado: EstadoDasVersoes; tentarDeNovo?: () => void };

/** A lista, a partir do estado da busca (separado da busca pra dar pra testar sem rede). */
export function ConteudoDasVersoes({ estado, tentarDeNovo }: PropsDoConteudo) {
  if (estado.tipo === "carregando") {
    return (
      <p role="status" aria-busy="true" className={`${CAIXA} text-sm text-texto-2`}>
        Buscando as versões no GitHub…
      </p>
    );
  }
  if (estado.tipo === "fora") {
    return (
      <p role="alert" className={`${CAIXA} text-sm`}>
        A sessão acabou. Recarregue a página e entre de novo para ver as versões.
      </p>
    );
  }
  if (estado.tipo === "sem-acesso") {
    // Também pode ser um erro passageiro do GitHub (ele apaga o repositório da resposta): por isso o "Tentar de novo".
    return (
      <div className="mt-4">
        <ErroDaLeva
          mensagem="O login do painel não consegue ler as versões (o repositório ssace-versoes). Se tentar de novo não resolver, é com a Sofia: o app do painel no GitHub precisaria ter acesso de leitura a esse repositório."
          tentarDeNovo={tentarDeNovo ?? (() => {})}
        />
      </div>
    );
  }
  if (estado.tipo === "erro") {
    return (
      <div className="mt-4">
        <ErroDaLeva mensagem={estado.mensagem} tentarDeNovo={tentarDeNovo ?? (() => {})} />
      </div>
    );
  }
  const { versoes, nasLojasForaDaLista } = estado.resposta;
  return (
    <section aria-label="Versões" className="mt-4 min-w-0">
      {nasLojasForaDaLista ? (
        <div className="mb-4 min-w-0">
          <p className="mb-2 text-sm text-texto-2">A versão das lojas é mais antiga que as 20 da lista:</p>
          <ol className="min-w-0 rounded-xl border border-borda bg-cartao">
            <LinhaDaVersao versao={nasLojasForaDaLista} />
          </ol>
        </div>
      ) : null}
      {versoes.length === 0 ? (
        <p className={`${CAIXA} mt-0 text-sm`}>Nenhuma versão publicada ainda.</p>
      ) : (
        <ol className="min-w-0 divide-y divide-borda rounded-xl border border-borda bg-cartao">
          {versoes.map((v) => (
            <LinhaDaVersao key={v.versao} versao={v} />
          ))}
        </ol>
      )}
      <p className="mt-3 text-sm">
        <a
          href={TODAS_NO_GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
        >
          Ver todas no GitHub<span className="sr-only"> (abre em aba nova)</span>
        </a>
      </p>
    </section>
  );
}

type Props = {
  /** Sem login (só no `npm run dev`): não busca nada. */
  semLogin?: boolean;
  /** Só nos testes: em vez de buscar no worker. */
  buscar?: Buscar;
};

/** A página inteira: o cabeçalho e a lista, buscada no worker. */
export function PaginaVersoes({ semLogin = false, buscar = fetch }: Props) {
  const [estado, setEstado] = useState<EstadoDasVersoes>({ tipo: "carregando" });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (semLogin) return;
    let vale = true;
    setEstado({ tipo: "carregando" });
    void carregarVersoes(buscar).then((novo) => {
      if (vale) setEstado(novo);
    });
    return () => {
      vale = false;
    };
  }, [buscar, vez, semLogin]);
  const tentarDeNovo = useCallback(() => setVez((v) => v + 1), []);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <CabecalhoDaPagina
        trilha="4º · Segurança e operação"
        titulo="Versões"
        explicacao="As últimas 20 versões do programa das lojas, a mais nova em cima. Só para ver: publicar e liberar continuam com a Sofia."
      />
      {semLogin ? (
        <p className={`${CAIXA} text-sm text-texto-2`}>Sem login, a lista não abre. Entre pelo painel de verdade.</p>
      ) : (
        <ConteudoDasVersoes estado={estado} tentarDeNovo={tentarDeNovo} />
      )}
    </div>
  );
}

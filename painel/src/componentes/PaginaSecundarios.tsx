// Os projetos secundários (#731): as propostas (issues do repositório `secundarios`), um cartão por projeto e a leva
// atual do projeto escolhido. O painel só lê; pegar e largar tarefa vão pela rota do projeto (acaoNaTarefa).
import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { levaDeExemploDoProjeto, projetosDeExemplo, propostasDeExemplo } from "../dados/exemplo-secundarios";
import { repositorioValido } from "../logica/comecarComClaude";
import { ehTarefa } from "../logica/dados";
import { linkSeguro } from "../logica/link";
import { paginaPraVoltar } from "../logica/login";
import { pessoasComVariasEmAndamento } from "../logica/contador";
import { ESTADOS_DA_PROPOSTA, type EstadoDaProposta, type Projeto, type Proposta, type RespostaDaLevaDoProjeto, type RespostaDasPropostas, type RespostaDosProjetos } from "../tipos";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";
import { Contador } from "./Contador";
import { HorasPorPessoa } from "./HorasPorPessoa";
import { ListaDeTarefas } from "./ListaDeTarefas";
import { ErroDaLeva } from "./TelaDaLeva";
import { TelaDeEntrada } from "./TelaDeEntrada";

/** Uma parte da página: cada uma busca, falha e tenta de novo sozinha. */
export type ParteDosSecundarios<T> = { tipo: "carregando" } | { tipo: "erro"; mensagem: string } | { tipo: "pronto"; dados: T };
type Fora = { tipo: "fora" };
type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";
const ERRO_DOS_PROJETOS = "Não deu pra buscar os projetos no GitHub agora.";
const ERRO_DAS_PROPOSTAS = "Não deu pra buscar as propostas no GitHub agora.";
const ERRO_DA_LEVA = "Não deu pra buscar as tarefas do projeto no GitHub agora.";
const AVISO_SEM_ACESSO = "Não deu pra ler as propostas: o repositório secundarios ainda não existe ou seu login não alcança ele.";

const ehObjeto = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Pede um endereço e confere o formato com `ler` (devolve null se estiver errado). 401 = sessão acabou. */
async function pedir<T>(buscar: Buscar, endereco: string, mensagem: string, ler: (corpo: unknown) => T | null): Promise<ParteDosSecundarios<T> | Fora> {
  let resposta: Response;
  try {
    resposta = await buscar(endereco, { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok) return { tipo: "erro", mensagem };
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    return { tipo: "erro", mensagem };
  }
  const dados = ler(corpo);
  return dados === null ? { tipo: "erro", mensagem } : { tipo: "pronto", dados };
}

/** Link só se for da sakura-corp; senão "" (a página mostra só o texto). */
const linkLimpo = (url: unknown) => (typeof url === "string" ? (linkSeguro(url) ?? "") : "");

function lerProjetos(corpo: unknown): RespostaDosProjetos | null {
  if (!ehObjeto(corpo) || !Array.isArray(corpo.projetos)) return null;
  const projetos: Projeto[] = [];
  for (const p of corpo.projetos) {
    if (!ehObjeto(p) || typeof p.repositorio !== "string" || typeof p.nome !== "string" || !Array.isArray(p.levas)) return null;
    // Nome de repositório estranho: o projeto some da lista (nunca vira rota nem link).
    if (!repositorioValido(p.repositorio)) continue;
    projetos.push({
      repositorio: p.repositorio,
      nome: p.nome,
      ...(typeof p.descricao === "string" && p.descricao.trim() !== "" ? { descricao: p.descricao } : {}),
      url: linkLimpo(p.url),
      levas: p.levas as Projeto["levas"],
      atual: typeof p.atual === "number" ? p.atual : null,
    });
  }
  return { projetos, ...(corpo.cortada === true ? { cortada: true as const } : {}) };
}

function lerPropostas(corpo: unknown): RespostaDasPropostas | null {
  if (!ehObjeto(corpo) || !Array.isArray(corpo.propostas)) return null;
  const propostas: Proposta[] = [];
  for (const p of corpo.propostas) {
    if (!ehObjeto(p) || typeof p.numero !== "number" || typeof p.titulo !== "string") return null;
    propostas.push({
      numero: p.numero,
      titulo: p.titulo,
      url: linkLimpo(p.url),
      // Estado que a página não conhece vira "Sem estado", nunca texto cru do GitHub.
      estado: ESTADOS_DA_PROPOSTA.find((e) => e === p.estado) ?? null,
      aberta: p.aberta === true,
      atualizadaEm: typeof p.atualizadaEm === "string" ? p.atualizadaEm : "",
    });
  }
  return { propostas, ...(corpo.semAcesso === true ? { semAcesso: true as const } : {}), ...(corpo.cortada === true ? { cortada: true as const } : {}) };
}

/**
 * Busca os projetos e depois as propostas, um pedido de cada vez (o token do GitHub renova uma vez só; ver `useLeva`
 * no App). Erro numa parte não derruba a outra; 401 numa delas para tudo.
 */
export async function carregarInicio(buscar: Buscar = fetch): Promise<Fora | { tipo: "ok"; projetos: ParteDosSecundarios<RespostaDosProjetos>; propostas: ParteDosSecundarios<RespostaDasPropostas> }> {
  const projetos = await pedir(buscar, "/api/projetos", ERRO_DOS_PROJETOS, lerProjetos);
  if (projetos.tipo === "fora") return projetos;
  const propostas = await pedir(buscar, "/api/propostas", ERRO_DAS_PROPOSTAS, lerPropostas);
  if (propostas.tipo === "fora") return propostas;
  return { tipo: "ok", projetos, propostas };
}

/** A leva atual de um projeto. As tarefas voltam marcadas com o repositório (é dele que o Claude e o "pegar" precisam). */
export async function carregarLevaDoProjeto(repositorio: string, buscar: Buscar = fetch): Promise<ParteDosSecundarios<RespostaDaLevaDoProjeto> | Fora> {
  if (!repositorioValido(repositorio)) return { tipo: "erro", mensagem: ERRO_DA_LEVA };
  return pedir(buscar, `/api/projetos/${repositorio}/leva`, ERRO_DA_LEVA, (corpo): RespostaDaLevaDoProjeto | null => {
    if (!ehObjeto(corpo) || !Array.isArray(corpo.levas)) return null;
    const atual = typeof corpo.atual === "number" ? corpo.atual : null;
    const levas = corpo.levas as RespostaDaLevaDoProjeto["levas"];
    if (corpo.leva === null || corpo.leva === undefined) return { repositorio, levas, atual, leva: null };
    const leva = corpo.leva;
    if (!ehObjeto(leva) || typeof leva.numero !== "number" || !Array.isArray(leva.tarefas) || !leva.tarefas.every(ehTarefa)) return null;
    return { repositorio, levas, atual, leva: { numero: leva.numero, cortada: leva.cortada === true, tarefas: leva.tarefas.map((t) => ({ ...t, repositorio })) } };
  });
}

/** Qual projeto mostrar: o pedido (?projeto=) se existe; senão o primeiro com leva atual; senão nenhum. */
export function projetoEscolhido(projetos: Projeto[], pedido: string | null): string | null {
  if (pedido !== null && projetos.some((p) => p.repositorio === pedido)) return pedido;
  return projetos.find((p) => p.atual !== null)?.repositorio ?? null;
}

const ROTULO_DO_ESTADO: Record<EstadoDaProposta, string> = {
  "em-entrevista": "Em entrevista",
  "esperando-sofia": "Esperando a Sofia",
  "com-sugestoes": "Com sugestões",
  aprovada: "Aprovada",
  recusada: "Recusada",
};
const COR_DO_ESTADO: Record<EstadoDaProposta, string> = {
  "em-entrevista": "bg-andamento-fundo text-andamento",
  "esperando-sofia": "bg-revisao-fundo text-revisao",
  "com-sugestoes": "bg-revisao-fundo text-revisao",
  aprovada: "bg-feita-fundo text-feita",
  recusada: "bg-livre-fundo text-livre",
};

function SeloDaProposta({ estado }: { estado: EstadoDaProposta | null }) {
  const cor = estado ? COR_DO_ESTADO[estado] : "bg-livre-fundo text-texto-2";
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${cor}`}>{estado ? ROTULO_DO_ESTADO[estado] : "Sem estado"}</span>;
}

const CAIXA = "overflow-hidden rounded-xl border border-borda bg-cartao";
const LINK = "underline underline-offset-2 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";

function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Buscando no GitHub…
      </p>
      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: linhas }, (_, i) => (
          <div key={i} className="h-12 rounded-xl bg-livre-fundo motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function LinkDeFora({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
      <span className="sr-only"> (abre em aba nova)</span>
    </a>
  );
}

function Propostas({ parte, tentarDeNovo }: { parte: ParteDosSecundarios<RespostaDasPropostas>; tentarDeNovo: () => void }) {
  return (
    <section aria-labelledby="secundarios-propostas" className="mt-8 min-w-0">
      <h2 id="secundarios-propostas" className="text-[15px] font-semibold">
        Propostas
      </h2>
      <div className="mt-3">
        {parte.tipo === "carregando" ? (
          <Esqueleto />
        ) : parte.tipo === "erro" ? (
          <ErroDaLeva mensagem={parte.mensagem} tentarDeNovo={tentarDeNovo} />
        ) : parte.dados.semAcesso ? (
          <p role="status" className="min-w-0 break-words rounded-xl border border-borda bg-livre-fundo px-4 py-3 text-sm text-texto-2">
            {AVISO_SEM_ACESSO}
          </p>
        ) : parte.dados.propostas.length === 0 ? (
          <p className="text-sm text-texto-2">Nenhuma proposta ainda.</p>
        ) : (
          <>
            <ul className={`${CAIXA} divide-y divide-borda`}>
              {parte.dados.propostas.map((p) => (
                <li key={p.numero} className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:px-5">
                  <span className="min-w-0 break-words font-medium">{p.url ? <LinkDeFora href={p.url}>{p.titulo}</LinkDeFora> : p.titulo}</span>
                  <SeloDaProposta estado={p.estado} />
                </li>
              ))}
            </ul>
            {parte.dados.cortada && <p className="mt-2 text-[13px] text-texto-2">Há mais propostas no GitHub do que as mostradas aqui.</p>}
          </>
        )}
      </div>
    </section>
  );
}

const textoDeAbertas = (n: number) => `${n} ${n === 1 ? "aberta" : "abertas"}`;

function CartaoDoProjeto({ projeto, escolhido, aoEscolher }: { projeto: Projeto; escolhido: boolean; aoEscolher: (repositorio: string) => void }) {
  const abertas = projeto.levas.find((l) => l.numero === projeto.atual)?.abertas ?? 0;
  return (
    <li className={`flex min-w-0 flex-col rounded-xl border bg-cartao px-4 py-3 ${escolhido ? "border-destaque" : "border-borda"}`}>
      <p className="min-w-0 break-words font-semibold">{projeto.nome}</p>
      {projeto.descricao && <p className="mt-1 min-w-0 break-words text-sm text-texto-2">{projeto.descricao}</p>}
      <p className="mt-2 text-[13px] text-texto-2">
        {projeto.atual === null ? "Sem tarefa aberta" : `Leva ${projeto.atual}`}
        {projeto.atual !== null && <> · {textoDeAbertas(abertas)}</>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          aria-pressed={escolhido}
          onClick={() => aoEscolher(projeto.repositorio)}
          className={`inline-flex min-h-9 items-center rounded-lg border px-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque ${escolhido ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda text-texto hover:bg-livre-fundo"}`}
        >
          {escolhido ? "Leva à vista" : "Ver a leva"}
          <span className="sr-only"> do projeto {projeto.nome}</span>
        </button>
        {projeto.url && (
          <span className="inline-flex items-center gap-1 text-texto-2">
            <LinkDeFora href={projeto.url}>GitHub</LinkDeFora>
            <ExternalLink aria-hidden="true" className="size-3.5" />
          </span>
        )}
      </div>
    </li>
  );
}

function Projetos({ parte, escolhido, aoEscolher, tentarDeNovo }: { parte: ParteDosSecundarios<RespostaDosProjetos>; escolhido: string | null; aoEscolher: (repositorio: string) => void; tentarDeNovo: () => void }) {
  return (
    <section aria-labelledby="secundarios-projetos" className="mt-8 min-w-0">
      <h2 id="secundarios-projetos" className="text-[15px] font-semibold">
        Projetos
      </h2>
      <div className="mt-3">
        {parte.tipo === "carregando" ? (
          <Esqueleto />
        ) : parte.tipo === "erro" ? (
          <ErroDaLeva mensagem={parte.mensagem} tentarDeNovo={tentarDeNovo} />
        ) : parte.dados.projetos.length === 0 ? (
          <p className="text-sm text-texto-2">
            Nenhum projeto por aqui. Um projeto secundário é um repositório da sakura-corp com o tópico <code>projeto-secundario</code>.
          </p>
        ) : (
          <>
            <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
              {parte.dados.projetos.map((p) => (
                <CartaoDoProjeto key={p.repositorio} projeto={p} escolhido={p.repositorio === escolhido} aoEscolher={aoEscolher} />
              ))}
            </ul>
            {parte.dados.cortada && <p className="mt-2 text-[13px] text-texto-2">Há mais repositórios na organização do que os olhados: pode faltar algum projeto.</p>}
          </>
        )}
      </div>
    </section>
  );
}

type PropsDoConteudo = {
  projetos: ParteDosSecundarios<RespostaDosProjetos>;
  propostas: ParteDosSecundarios<RespostaDasPropostas>;
  /** A leva do projeto escolhido; sem ela (projeto sem tarefa aberta, ou nenhum projeto), a parte não busca. */
  leva?: ParteDosSecundarios<RespostaDaLevaDoProjeto>;
  escolhido: string | null;
  aoEscolher: (repositorio: string) => void;
  tentarProjetosDeNovo: () => void;
  tentarPropostasDeNovo: () => void;
  tentarLevaDeNovo: () => void;
  login?: string;
  /** Busca a leva de novo depois de pegar ou largar. */
  aoMudar?: () => Promise<unknown>;
};

/** A leva do projeto escolhido: Contador, Horas por pessoa e a lista, sob o subtítulo "<projeto> · Leva N". */
function LevaDoProjeto({ projeto, leva, tentarDeNovo, login, aoMudar }: { projeto: Projeto; leva?: ParteDosSecundarios<RespostaDaLevaDoProjeto>; tentarDeNovo: () => void; login?: string; aoMudar?: () => Promise<unknown> }) {
  const titulo = (texto: string) => (
    <h2 id="secundarios-leva" className="min-w-0 break-words text-[15px] font-semibold">
      {texto}
    </h2>
  );
  let corpo: React.ReactNode;
  let subtitulo = `${projeto.nome} · sem tarefa aberta`;
  if (projeto.atual === null || leva === undefined) {
    corpo = <p className="text-sm text-texto-2">Este projeto não tem tarefa aberta agora.</p>;
  } else if (leva.tipo === "carregando") {
    subtitulo = `${projeto.nome} · Leva ${projeto.atual}`;
    corpo = <Esqueleto linhas={4} />;
  } else if (leva.tipo === "erro") {
    subtitulo = `${projeto.nome} · Leva ${projeto.atual}`;
    corpo = <ErroDaLeva mensagem={leva.mensagem} tentarDeNovo={tentarDeNovo} />;
  } else if (leva.dados.leva === null) {
    corpo = <p className="text-sm text-texto-2">Este projeto não tem tarefa aberta agora.</p>;
  } else {
    const { leva: l, atual } = leva.dados;
    subtitulo = `${projeto.nome} · Leva ${l.numero}`;
    const avisos = pessoasComVariasEmAndamento(l.tarefas);
    corpo = (
      <>
        {avisos.length > 0 && (
          <div role="status" className="mb-4 rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
            {avisos.map((a) => (
              <p key={a.login} className="break-words">
                {a.login} está com {a.quantas} tarefas em andamento (a regra é uma por vez).
              </p>
            ))}
          </div>
        )}
        {l.cortada && (
          <p role="status" className="mb-4 rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
            Esta leva tem mais de 100 tarefas: só as 100 primeiras aparecem aqui.
          </p>
        )}
        {l.tarefas.length === 0 ? (
          <p className="rounded-xl border border-borda bg-cartao px-4 py-6 text-center text-sm text-texto-2">Nenhuma tarefa nesta leva ainda.</p>
        ) : (
          <div className="space-y-6">
            <Contador tarefas={l.tarefas} />
            <HorasPorPessoa tarefas={l.tarefas} />
            {/* Só a leva atual aceita pegar tarefa (a mesma regra do SSACE). */}
            <ListaDeTarefas tarefas={l.tarefas} login={login} aoMudar={aoMudar} levaAberta={l.numero === atual} />
          </div>
        )}
      </>
    );
  }
  return (
    <section aria-labelledby="secundarios-leva" className="mt-8 min-w-0">
      {titulo(subtitulo)}
      <div className="mt-3">{corpo}</div>
    </section>
  );
}

/** O corpo da página, sem buscar nada (os testes e o modo de exemplo usam direto). */
export function ConteudoDosSecundarios({ projetos, propostas, leva, escolhido, aoEscolher, tentarProjetosDeNovo, tentarPropostasDeNovo, tentarLevaDeNovo, login, aoMudar }: PropsDoConteudo) {
  const projeto = projetos.tipo === "pronto" ? projetos.dados.projetos.find((p) => p.repositorio === escolhido) : undefined;
  return (
    <div className="min-w-0">
      <Propostas parte={propostas} tentarDeNovo={tentarPropostasDeNovo} />
      <Projetos parte={projetos} escolhido={escolhido} aoEscolher={aoEscolher} tentarDeNovo={tentarProjetosDeNovo} />
      {projeto && <LevaDoProjeto projeto={projeto} leva={leva} tentarDeNovo={tentarLevaDeNovo} login={login} aoMudar={aoMudar} />}
    </div>
  );
}

const projetoDaBusca = (busca: string) => {
  const p = new URLSearchParams(busca).get("projeto");
  return p !== null && repositorioValido(p) ? p : null;
};

const buscaDoNavegador = () => (typeof window === "undefined" ? "" : window.location.search);

type Props = {
  /** Sem login (só no `npm run dev`): mostra os dados de exemplo, sem buscar. */
  semLogin?: boolean;
  login?: string;
  /** A busca do endereço (?projeto=<repo>) diz qual projeto abrir. */
  busca?: string;
  buscar?: Buscar;
};

export function PaginaSecundarios({ semLogin = false, login, busca = buscaDoNavegador(), buscar = fetch }: Props) {
  const [projetos, setProjetos] = useState<ParteDosSecundarios<RespostaDosProjetos>>(
    semLogin ? { tipo: "pronto", dados: { projetos: projetosDeExemplo } } : { tipo: "carregando" },
  );
  const [propostas, setPropostas] = useState<ParteDosSecundarios<RespostaDasPropostas>>(
    semLogin ? { tipo: "pronto", dados: { propostas: propostasDeExemplo } } : { tipo: "carregando" },
  );
  const [leva, setLeva] = useState<ParteDosSecundarios<RespostaDaLevaDoProjeto> | undefined>(undefined);
  const [fora, setFora] = useState(false);
  const [pedido, setPedido] = useState<string | null>(() => projetoDaBusca(busca));
  const [tentativaBase, setTentativaBase] = useState(0);
  const [tentativaLeva, setTentativaLeva] = useState(0);
  // Todo pedido entra nesta fila: nunca dois ao mesmo tempo (o token do GitHub renova uma vez só).
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const enfileirar = useCallback(<T,>(trabalho: () => Promise<T>): Promise<T> => {
    const vez = fila.current.then(trabalho, trabalho);
    fila.current = vez.catch(() => undefined);
    return vez;
  }, []);

  const escolhido = projetos.tipo === "pronto" ? projetoEscolhido(projetos.dados.projetos, pedido) : null;
  const projetoAtual = projetos.tipo === "pronto" ? projetos.dados.projetos.find((p) => p.repositorio === escolhido) : undefined;
  const levaPedida = projetoAtual && projetoAtual.atual !== null ? projetoAtual.repositorio : null;

  useEffect(() => {
    if (semLogin) return;
    let vivo = true;
    setProjetos({ tipo: "carregando" });
    setPropostas({ tipo: "carregando" });
    void enfileirar(() => carregarInicio(buscar)).then((r) => {
      if (!vivo) return;
      if (r.tipo === "fora") return setFora(true);
      setProjetos(r.projetos);
      setPropostas(r.propostas);
    });
    return () => {
      vivo = false;
    };
  }, [semLogin, buscar, enfileirar, tentativaBase]);

  useEffect(() => {
    if (semLogin || levaPedida === null) {
      setLeva(undefined);
      return;
    }
    let vivo = true;
    setLeva({ tipo: "carregando" });
    void enfileirar(() => carregarLevaDoProjeto(levaPedida, buscar)).then((r) => {
      if (!vivo) return;
      if (r.tipo === "fora") return setFora(true);
      setLeva(r);
    });
    return () => {
      vivo = false;
    };
  }, [semLogin, levaPedida, buscar, enfileirar, tentativaLeva]);

  // Depois de pegar ou largar: busca de novo sem piscar; erro não apaga o que já está na tela.
  const aoMudar = useCallback(async () => {
    if (levaPedida === null) return;
    const r = await enfileirar(() => carregarLevaDoProjeto(levaPedida, buscar));
    if (r.tipo === "fora") setFora(true);
    else if (r.tipo === "pronto") setLeva(r);
  }, [levaPedida, buscar, enfileirar]);

  const aoEscolher = useCallback((repositorio: string) => {
    setPedido(repositorio);
    // O endereço guarda o projeto (?projeto=), pra recarregar e mandar o link; sem histórico novo a cada clique.
    try {
      window.history.replaceState(null, "", `/secundarios?projeto=${encodeURIComponent(repositorio)}`);
    } catch {
      // Sem history (testes, iframe): a escolha vale só na tela.
    }
  }, []);

  if (fora) return <TelaDeEntrada volta={paginaPraVoltar("/secundarios", busca)} erro="Sua sessão acabou. Entre de novo." />;

  // Sem login, a leva é a de exemplo do projeto que a tem (o outro projeto não tem tarefa aberta).
  const levaMostrada = semLogin ? (escolhido === "ar-condicionado" ? ({ tipo: "pronto", dados: levaDeExemploDoProjeto } as const) : undefined) : leva;
  return (
    <>
      <CabecalhoDaPagina
        trilha="1º · Produção"
        titulo="Projetos secundários"
        explicacao={semLogin ? "Dados de exemplo: ainda sem ligação com o GitHub." : "As propostas, os projetos e a leva atual de cada um. Fora do programa das lojas."}
      />
      <ConteudoDosSecundarios
        projetos={projetos}
        propostas={propostas}
        leva={levaMostrada}
        escolhido={escolhido}
        aoEscolher={aoEscolher}
        tentarProjetosDeNovo={() => setTentativaBase((n) => n + 1)}
        tentarPropostasDeNovo={() => setTentativaBase((n) => n + 1)}
        tentarLevaDeNovo={() => setTentativaLeva((n) => n + 1)}
        login={login}
        aoMudar={semLogin ? undefined : aoMudar}
      />
    </>
  );
}

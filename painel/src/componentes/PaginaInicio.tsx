// A página Início (#546): "o que eu preciso fazer agora?". Cada bloco (sala, sua tarefa, leva, o que mudou hoje) vive do seu
// próprio estado: a sala pode carregar e a leva falhar, e um erro nunca vira "nada pra fazer".
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, RotateCw, X } from "lucide-react";
import { ESTADOS } from "../logica/contador";
import { montarInicio, type ResumoDaLeva } from "../logica/inicio";
import { linkSeguro } from "../logica/link";
import { linkDaNovidade, novidadesDeHoje, textoDaNovidade, type EstadoDasNovidades, type Novidade } from "../logica/novidades";
import { haQuantoTempo } from "../logica/tempo";
import type { EstadoDaLeva } from "../logica/dados";
import type { EstadoDaSala } from "../logica/salaDados";
import type { Bonequinho, EstadoTarefa } from "../tipos";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";
import { ItemDaTarefa } from "./ListaDeTarefas";

type Props = {
  login: string;
  sala: EstadoDaSala;
  leva: EstadoDaLeva;
  agora: Date;
  /** Depois de largar: busca a leva de novo. */
  aoMudar?: () => Promise<unknown>;
  tentarSalaDeNovo: () => void;
  tentarLevaDeNovo: () => void;
  /** "O que mudou hoje" (#549). */
  novidades: EstadoDasNovidades;
  tentarNovidadesDeNovo: () => void;
  /** Dados de exemplo (sem login). */
  exemplo?: boolean;
};

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";
const CARTAO = "rounded-xl border border-borda bg-cartao";
const BOTAO_CONTORNO = `inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-borda px-3.5 text-sm font-medium text-texto hover:bg-livre-fundo ${FOCO}`;
const LINK_DA_SECAO = `inline-flex min-h-11 items-center text-sm font-medium text-texto underline underline-offset-2 ${FOCO}`;

const CORES: Record<EstadoTarefa, string> = {
  livre: "bg-livre-fundo text-livre",
  andamento: "bg-andamento-fundo text-andamento",
  revisao: "bg-revisao-fundo text-revisao",
  feita: "bg-feita-fundo text-feita",
};
const CONTAGEM: Record<EstadoTarefa, [string, string]> = {
  livre: ["livre", "livres"],
  andamento: ["em andamento", "em andamento"],
  revisao: ["em revisão", "em revisão"],
  feita: ["feita", "feitas"],
};

const virgula = (n: number) => String(n).replace(".", ",");

function Esqueleto({ texto }: { texto: string }) {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">{texto}</p>
      <div aria-hidden="true" className={`${CARTAO} space-y-3 p-4`}>
        <div className="h-4 w-2/3 rounded bg-livre-fundo motion-safe:animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-livre-fundo motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

function Erro({ mensagem, tentarDeNovo }: { mensagem: string; tentarDeNovo: () => void }) {
  return (
    <div role="alert" className={`${CARTAO} flex min-w-0 flex-col items-start gap-3 px-4 py-4`}>
      <p className="min-w-0 break-words text-sm text-texto">{mensagem}</p>
      <button type="button" onClick={tentarDeNovo} className={`${BOTAO_CONTORNO} gap-2`}>
        <RotateCw aria-hidden="true" className="size-4" />
        Tentar de novo
      </button>
    </div>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <div className={`${CARTAO} min-w-0 px-4 py-4 text-sm text-texto-2`}>{children}</div>;
}

function LinhaDoPrecisa({ b }: { b: Bonequinho }) {
  const href = linkSeguro(b.url);
  return (
    <li className="flex min-w-0 items-center gap-3 px-4 py-3">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-texto-2" />
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="min-w-0 break-words text-sm font-medium text-texto">{b.fazendo ?? b.nome}</strong>
        {b.fazendo && <small className="min-w-0 break-words text-xs text-texto-2">{b.nome}</small>}
      </span>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className={BOTAO_CONTORNO}>
          Abrir<span className="sr-only"> {b.fazendo ?? b.nome} (abre no GitHub, em aba nova)</span>
        </a>
      )}
    </li>
  );
}

function BlocoPrecisa({ sala, precisa, tentarDeNovo }: { sala: EstadoDaSala; precisa: Bonequinho[]; tentarDeNovo: () => void }) {
  const titulo = sala.tipo === "pronto" ? `Precisa de você (${precisa.length})` : "Precisa de você";
  let corpo: ReactNode;
  if (sala.tipo === "carregando" || sala.tipo === "fora") corpo = <Esqueleto texto="Carregando o que precisa de você…" />;
  else if (sala.tipo === "erro") corpo = <Erro mensagem={sala.mensagem} tentarDeNovo={tentarDeNovo} />;
  else {
    const falhou = sala.falhas.length > 0;
    corpo = (
      <>
        {falhou && (
          <p role="status" className="mb-2 min-w-0 break-words rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
            Parte da sala não carregou: a lista pode estar incompleta.
          </p>
        )}
        {precisa.length > 0 ? (
          <ul className={`${CARTAO} divide-y divide-borda overflow-hidden`}>
            {precisa.map((b) => (
              <LinhaDoPrecisa key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          !falhou && (
            <Vazio>
              Nada esperando por você. Aqui aparecem uma revisão pedida a você, uma rodada esperando a sua aprovação e uma conferência vermelha num PR seu.
            </Vazio>
          )
        )}
      </>
    );
  }
  return (
    <section aria-labelledby="inicio-precisa" className="min-w-0">
      <h2 id="inicio-precisa" className="mb-2 flex min-h-11 items-center text-sm font-medium text-texto-2">{titulo}</h2>
      {corpo}
    </section>
  );
}

/**
 * O aviso de uma tarefa que saiu de "A sua tarefa" (depois de Largar). O cartão sumiu com o foco dentro;
 * o foco vem pra cá, pra pessoa (e o leitor de tela) não voltar pro começo da página.
 */
function AvisoSemCartao({ texto }: { texto: string }) {
  const p = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (texto) p.current?.focus();
  }, [texto]);
  return (
    <p ref={p} tabIndex={-1} role="status" aria-live="polite" className="mt-2 min-w-0 break-words text-sm text-texto empty:m-0">
      {texto}
    </p>
  );
}

function BlocoDaTarefa({ props, suaTarefa }: { props: Props; suaTarefa: ReturnType<typeof montarInicio>["suaTarefa"] }) {
  const { leva, login, aoMudar, tentarLevaDeNovo } = props;
  const [aviso, setAviso] = useState<{ numero: number; texto: string } | null>(null);
  let corpo: ReactNode;
  if (leva.tipo === "carregando" || leva.tipo === "fora") corpo = <Esqueleto texto="Carregando a sua tarefa…" />;
  else if (leva.tipo === "erro") corpo = <Erro mensagem={leva.mensagem} tentarDeNovo={tentarLevaDeNovo} />;
  else if (leva.tipo === "sem-levas") corpo = <Vazio>Ainda não existe leva.</Vazio>;
  else if (suaTarefa.length === 0 && leva.leva.cortada) {
    // Só as 100 primeiras vieram: uma tarefa sua pode estar depois delas.
    corpo = (
      <Vazio>
        Nenhuma tarefa sua entre as 100 primeiras da leva. Confira na{" "}
        <a href="/leva" className={`font-medium text-texto underline underline-offset-2 ${FOCO}`}>Leva</a>.
      </Vazio>
    );
  } else if (suaTarefa.length === 0) {
    corpo = (
      <Vazio>
        Você não está com nenhuma tarefa: veja as livres na{" "}
        <a href="/leva" className={`font-medium text-texto underline underline-offset-2 ${FOCO}`}>Leva</a>.
      </Vazio>
    );
  } else {
    corpo = (
      <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-cartao">
        {suaTarefa.map((t) => (
          <ItemDaTarefa
            key={t.numero}
            tarefa={t}
            tarefas={leva.leva.tarefas}
            login={login}
            aoMudar={aoMudar}
            levaAberta={true}
            aviso={aviso?.numero === t.numero ? aviso.texto : ""}
            aoAvisar={(texto) => setAviso(texto ? { numero: t.numero, texto } : null)}
          />
        ))}
      </ul>
    );
  }
  // Depois de largar, a tarefa sai da lista e leva o aviso junto: ele fica aqui, à vista.
  const avisoOrfao = aviso && !suaTarefa.some((t) => t.numero === aviso.numero) ? aviso.texto : "";
  return (
    <section aria-labelledby="inicio-tarefa" className="min-w-0">
      <h2 id="inicio-tarefa" className="mb-2 flex min-h-11 items-center text-sm font-medium text-texto-2">A sua tarefa</h2>
      {corpo}
      <AvisoSemCartao texto={avisoOrfao} />
    </section>
  );
}

function ResumoDaLevaEmUmaLinha({ r }: { r: ResumoDaLeva }) {
  const pct = r.horas.todas > 0 ? Math.min(100, Math.round((r.horas.feitas / r.horas.todas) * 100)) : 0;
  return (
    <div className={`${CARTAO} min-w-0 space-y-3 p-4`}>
      <p className="text-2xl font-semibold tabular-nums text-texto">
        {r.feitas} <span className="text-sm font-normal text-texto-2">de {r.total} {r.total === 1 ? "tarefa feita" : "tarefas feitas"}</span>
      </p>
      {r.horas.todas > 0 && (
        <>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Horas feitas"
            className="h-2 overflow-hidden rounded-full bg-livre-fundo"
          >
            <div className="h-full bg-destaque" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm tabular-nums text-texto-2">{virgula(r.horas.feitas)} h de {virgula(r.horas.todas)} h feitas</p>
        </>
      )}
      <ul className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => (
          <li key={e} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${CORES[e]}`}>
            {r.contagem[e]} {CONTAGEM[e][r.contagem[e] === 1 ? 0 : 1]}
          </li>
        ))}
      </ul>
      {r.cortada && (
        <p role="status" className="min-w-0 break-words text-sm text-revisao">
          Mostrando só as 100 primeiras tarefas: os números podem estar incompletos.
        </p>
      )}
    </div>
  );
}

function BlocoDaLeva({ leva, resumo, tentarDeNovo }: { leva: EstadoDaLeva; resumo: ResumoDaLeva | null; tentarDeNovo: () => void }) {
  let corpo: ReactNode;
  if (leva.tipo === "carregando" || leva.tipo === "fora") corpo = <Esqueleto texto="Carregando a leva…" />;
  else if (leva.tipo === "erro") corpo = <Erro mensagem={leva.mensagem} tentarDeNovo={tentarDeNovo} />;
  else if (leva.tipo === "sem-levas" || !resumo) corpo = <Vazio>Ainda não existe leva.</Vazio>;
  else corpo = <ResumoDaLevaEmUmaLinha r={resumo} />;
  return (
    <section aria-labelledby="inicio-leva" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="inicio-leva" className="text-sm font-medium text-texto-2">{resumo ? `Leva ${resumo.numero}` : "Leva"}</h2>
        {resumo && <a href="/leva" className={LINK_DA_SECAO}>Ver a leva</a>}
      </div>
      {corpo}
    </section>
  );
}

function LinhaDaNovidade({ n, agora }: { n: Novidade; agora: Date }) {
  const href = linkDaNovidade(n);
  const icone =
    n.tipo === "rodada" ? (
      <span aria-hidden="true" className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ${n.passou ? "bg-feita-fundo text-feita" : "bg-revisao-fundo text-revisao"}`}>
        {n.passou ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      </span>
    ) : (
      <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-livre-fundo text-xs font-semibold uppercase text-livre">
        {n.quem.charAt(0)}
      </span>
    );
  return (
    <li className="flex min-w-0 items-start gap-3 px-4 py-3">
      {icone}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="min-w-0 break-words text-sm text-texto">{textoDaNovidade(n)}</span>
        {n.titulo &&
          (href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className={`min-w-0 break-words text-xs text-texto-2 underline underline-offset-2 ${FOCO}`}>
              {n.titulo}
              <span className="sr-only"> (abre no GitHub, em aba nova)</span>
            </a>
          ) : (
            <small className="min-w-0 break-words text-xs text-texto-2">{n.titulo}</small>
          ))}
      </span>
      <time dateTime={n.quando} className="shrink-0 whitespace-nowrap text-xs text-texto-2">{haQuantoTempo(n.quando, agora)}</time>
    </li>
  );
}

function BlocoDasNovidades({ novidades, agora, tentarDeNovo }: { novidades: EstadoDasNovidades; agora: Date; tentarDeNovo: () => void }) {
  let corpo: ReactNode;
  if (novidades.tipo === "carregando" || novidades.tipo === "fora") corpo = <Esqueleto texto="Carregando o que mudou hoje…" />;
  else if (novidades.tipo === "erro") corpo = <Erro mensagem={novidades.mensagem} tentarDeNovo={tentarDeNovo} />;
  else {
    const hoje = novidadesDeHoje(novidades.novidades, agora);
    const falhou = novidades.falhas.length > 0;
    corpo = (
      <>
        {falhou && (
          <p role="status" className="mb-2 min-w-0 break-words rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
            As conferências não carregaram: a lista pode estar incompleta.
          </p>
        )}
        {hoje.length > 0 ? (
          <ul className={`${CARTAO} divide-y divide-borda overflow-hidden`}>
            {hoje.map((n) => (
              <LinhaDaNovidade key={n.id} n={n} agora={agora} />
            ))}
          </ul>
        ) : (
          <Vazio>Nada mudou hoje ainda. Aqui aparecem quem pegou, entregou ou fechou tarefa, e as conferências que passaram ou falharam.</Vazio>
        )}
      </>
    );
  }
  return (
    <section aria-labelledby="inicio-mudou" className="min-w-0">
      <h2 id="inicio-mudou" className="mb-2 flex min-h-11 items-center text-sm font-medium text-texto-2">O que mudou hoje</h2>
      {corpo}
    </section>
  );
}

export function PaginaInicio(props: Props) {
  const { login, sala, leva, agora, tentarSalaDeNovo, tentarLevaDeNovo, novidades, tentarNovidadesDeNovo, exemplo } = props;
  const inicio = montarInicio(sala.tipo === "pronto" ? sala : null, leva.tipo === "pronto" ? leva.leva : null, login, agora);
  return (
    <div className="min-w-0">
      <CabecalhoDaPagina
        titulo="Início"
        explicacao="O que precisa de você agora, como anda a leva e o que mudou hoje."
        acoes={
          <a href="/leva" className={BOTAO_CONTORNO}>
            Ver a leva atual
          </a>
        }
      />
      {exemplo && <p className="mt-3 text-xs text-texto-2">Dados de exemplo: ainda sem ligação com o GitHub.</p>}
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <BlocoPrecisa sala={sala} precisa={inicio.precisaDeVoce} tentarDeNovo={tentarSalaDeNovo} />
          <BlocoDaTarefa props={props} suaTarefa={inicio.suaTarefa} />
        </div>
        <div className="min-w-0 space-y-6">
          <BlocoDaLeva leva={leva} resumo={inicio.resumoDaLeva} tentarDeNovo={tentarLevaDeNovo} />
          <BlocoDasNovidades novidades={novidades} agora={agora} tentarDeNovo={tentarNovidadesDeNovo} />
        </div>
      </div>
    </div>
  );
}

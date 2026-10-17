import { useEffect, useRef, useState } from "react";
import type { Tarefa } from "../tipos";
import { agruparPorEstado } from "../logica/contador";
import { Avatar } from "./Avatar";
import { linkParaComecar, textoDaTarefa } from "../logica/comecarComClaude";
import { copiarTexto, type ResultadoDaCopia } from "../logica/copiarTexto";
import { acaoNaTarefa } from "../logica/dados";
import { linkDoClaude } from "../logica/link";
import { depoisDaAcao, mesmoLogin, motivoPraNaoPegar } from "../logica/pegar";
import { PLURAL, Selo } from "./Selo";

type Props = {
  tarefas: Tarefa[];
  /** Quem está olhando. Sem login (modo de exemplo), o "Pegar tarefa" fica desligado. */
  login?: string;
  /** Depois de pegar ou largar (ou da sessão acabar): busca a leva de novo. */
  aoMudar?: () => Promise<unknown>;
  /** Só a leva atual aceita "Pegar tarefa". */
  ehALevaAtual?: boolean;
};

export function ListaDeTarefas({ tarefas, login, aoMudar, ehALevaAtual = true }: Props) {
  // O aviso da última ação mora aqui, não no cartão: depois de recarregar, o cartão pode mudar de grupo
  // (ou perder os botões, se outra pessoa pegou) e o aviso vai junto com ele.
  const [aviso, setAviso] = useState<{ numero: number; texto: string } | null>(null);
  return (
    <div className="space-y-8">
      {agruparPorEstado(tarefas)
        .filter((g) => g.tarefas.length > 0)
        .map((g) => (
          <section key={g.estado} aria-labelledby={`grupo-${g.estado}`}>
            <h2 id={`grupo-${g.estado}`} className="mb-2 text-sm font-medium text-texto-2">
              {PLURAL[g.estado]} <span className="tabular-nums">({g.tarefas.length})</span>
            </h2>
            <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-cartao">
              {g.tarefas.map((t) => (
                <ItemDaTarefa
                  key={t.numero}
                  tarefa={t}
                  tarefas={tarefas}
                  login={login}
                  aoMudar={aoMudar}
                  ehALevaAtual={ehALevaAtual}
                  aviso={aviso?.numero === t.numero ? aviso.texto : ""}
                  aoAvisar={(texto) => setAviso(texto ? { numero: t.numero, texto } : null)}
                />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

const BOTAO =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-medium hover:opacity-90";

/** O desligado: o mesmo jeito do botão "Espera" de antes (sem opacity, pra o contraste continuar valendo). */
const BOTAO_DESLIGADO = `${BOTAO} max-w-full min-w-0 cursor-not-allowed break-words border border-borda bg-cartao text-center text-texto-2 hover:opacity-100`;
const BOTAO_SECUNDARIO = `${BOTAO} border border-borda bg-cartao text-texto`;

type Acao = "pegar" | "largar";

type PropsDosBotoes = {
  tarefa: Tarefa;
  tarefas: Tarefa[];
  login?: string;
  aoMudar?: () => Promise<unknown>;
  ehALevaAtual: boolean;
  planoB: boolean;
  aoCopiar: (r: ResultadoDaCopia) => void;
  /** Põe (ou apaga, com "") o aviso da última ação, que fica à vista no cartão. */
  aoAvisar: (texto: string) => void;
};

/**
 * Os botões do cartão (#538), por ordem:
 * - feita → nada; incompleta → só o aviso "tarefa incompleta" e o que falta (vale mais que a dependência);
 * - com dono, e é quem olha → "Começar com o Claude", "Copiar texto" e, só em andamento, "Largar" (com confirmação aqui dentro);
 * - com dono, outra pessoa → nada;
 * - sem dono → "Pegar tarefa"; se não pode, desligado e o motivo à vista (no celular não existe dica de mouse).
 * Quem decide de verdade é o worker; a página só desliga o botão e diz o porquê.
 */
function BotoesDaTarefa({ tarefa, tarefas, login, aoMudar, ehALevaAtual, planoB, aoCopiar, aoAvisar }: PropsDosBotoes) {
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState<Acao | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const aviso = useRef<number | undefined>(undefined);
  const botaoLargar = useRef<HTMLButtonElement>(null);
  useEffect(() => () => window.clearTimeout(aviso.current), []);

  const texto = textoDaTarefa(tarefa.numero, tarefa.chefe);
  const href = linkDoClaude(linkParaComecar(tarefa.numero, tarefa.chefe));
  if (tarefa.estado === "feita" || !href || texto === undefined) return null;

  const faltas = tarefa.incompleta ?? [];
  if (faltas.length > 0) {
    // O que falta fica à vista (no celular não existe dica de mouse; Sofia, 17/10).
    return (
      <div className="mx-4 mb-3 min-w-0 text-sm text-texto-2">
        <p>
          tarefa incompleta<span className="sr-only"> (tarefa #{tarefa.numero})</span>
        </p>
        <p className="break-words text-xs">No cabeçalho: {faltas.join("; ")}</p>
      </div>
    );
  }

  const dono = tarefa.dono?.login;
  const souEu = !!dono && mesmoLogin(dono, login);
  // Tem dono e não sou eu: nada a fazer aqui.
  if (dono && !souEu) return null;

  async function copiar() {
    const r = await copiarTexto(texto!, navigator.clipboard);
    aoCopiar(r);
    window.clearTimeout(aviso.current);
    setCopiado(r === "copiado");
    if (r === "copiado") aviso.current = window.setTimeout(() => setCopiado(false), 4000);
  }

  async function agir(acao: Acao) {
    setOcupado(acao);
    setConfirmando(false);
    aoAvisar("");
    try {
      const { aviso, recarregar } = depoisDaAcao(tarefa.numero, await acaoNaTarefa(tarefa.numero, acao));
      aoAvisar(aviso);
      if (recarregar) await aoMudar?.();
    } catch {
      aoAvisar("Não deu certo agora. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  const numero = tarefa.numero;

  if (souEu) {
    return (
      <div className="mx-4 mb-3">
        <div className="flex flex-wrap gap-2">
          <a href={href} target="_blank" rel="noopener noreferrer" className={`${BOTAO} bg-destaque text-sobre-destaque`}>
            Começar com o Claude<span className="sr-only"> (tarefa #{numero}; abre o Claude em aba nova)</span>
          </a>
          <button type="button" onClick={copiar} className={BOTAO_SECUNDARIO}>
            {copiado ? "Copiado" : "Copiar texto"}
            <span className="sr-only"> (tarefa #{numero})</span>
          </button>
          {tarefa.estado === "andamento" &&
            (confirmando ? (
              <>
                <span className="flex min-h-11 items-center text-sm text-texto">Largar mesmo?</span>
                <button type="button" onClick={() => agir("largar")} className={`${BOTAO} bg-destaque text-sobre-destaque`}>
                  Sim, largar<span className="sr-only"> (tarefa #{numero})</span>
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setConfirmando(false);
                    window.requestAnimationFrame(() => botaoLargar.current?.focus());
                  }}
                  className={BOTAO_SECUNDARIO}
                >
                  Cancelar<span className="sr-only"> (largar a tarefa #{numero})</span>
                </button>
              </>
            ) : ocupado === "largar" ? (
              <button type="button" disabled className={BOTAO_DESLIGADO}>
                Largando…<span className="sr-only"> (tarefa #{numero})</span>
              </button>
            ) : (
              <button type="button" ref={botaoLargar} onClick={() => setConfirmando(true)} className={BOTAO_SECUNDARIO}>
                Largar<span className="sr-only"> (tarefa #{numero})</span>
              </button>
            ))}
          <p className="basis-full text-sm text-texto-2 sm:hidden">
            No celular, se o texto não aparecer, abra pelo navegador ou use Copiar texto.
          </p>
          <span className="sr-only" role="status" aria-live="polite">
            {copiado ? `Texto da tarefa #${numero} copiado` : planoB ? "Não deu pra copiar sozinho: o texto está no campo abaixo, já selecionado" : ""}
          </span>
        </div>
      </div>
    );
  }

  // Sem dono: Pegar tarefa.
  const motivo = !ehALevaAtual ? "esta tarefa não está na leva atual" : motivoPraNaoPegar(tarefa, tarefas, login);
  if (motivo === null) {
    return (
      <div className="mx-4 mb-3">
        <div className="flex flex-wrap gap-2">
          {ocupado === "pegar" ? (
            <button type="button" disabled className={BOTAO_DESLIGADO}>
              Pegando…<span className="sr-only"> (tarefa #{numero})</span>
            </button>
          ) : (
            <button type="button" onClick={() => agir("pegar")} className={`${BOTAO} bg-destaque text-sobre-destaque`}>
              Pegar tarefa<span className="sr-only"> (tarefa #{numero})</span>
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-4 mb-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled aria-describedby={`motivo-${numero}`} className={BOTAO_DESLIGADO}>
          Pegar tarefa<span className="sr-only"> (tarefa #{numero})</span>
        </button>
        <p id={`motivo-${numero}`} className="basis-full break-words text-xs text-texto-2">
          {motivo}
        </p>
      </div>
    </div>
  );
}

/**
 * O aviso da última ação no cartão (#538). Sempre presente (vazio quando não há), pra ser uma região viva.
 * Quando aparece, o foco vai pra ele: o botão clicado sumiu, e depois de recarregar o cartão pode ter mudado
 * de grupo; o foco leva a pessoa (e o leitor de tela) até o motivo.
 */
function AvisoDaAcao({ texto }: { texto: string }) {
  const p = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (texto) p.current?.focus();
  }, [texto]);
  return (
    <p ref={p} tabIndex={-1} role="status" aria-live="polite" className="mx-4 mb-3 break-words text-sm text-texto empty:m-0">
      {texto}
    </p>
  );
}

/** Plano B: o texto num campo já selecionado, pra copiar à mão (toque e segure, ou Ctrl+C). */
function CampoDoTexto({ texto, numero }: { texto: string; numero: number }) {
  const campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
  }, []);
  return (
    <div className="mx-4 mb-3 flex flex-col gap-1">
      <label htmlFor={`texto-${numero}`} className="text-sm text-texto-2">
        Não deu pra copiar sozinho. Copie este texto e cole no Claude:
      </label>
      <textarea
        id={`texto-${numero}`}
        ref={campo}
        readOnly
        rows={5}
        value={texto}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-borda bg-fundo p-2 text-sm text-texto"
      />
    </div>
  );
}

type PropsDoItem = {
  tarefa: Tarefa;
  tarefas: Tarefa[];
  login?: string;
  aoMudar?: () => Promise<unknown>;
  ehALevaAtual: boolean;
  aviso: string;
  aoAvisar: (texto: string) => void;
};

function ItemDaTarefa({ tarefa: t, tarefas, login, aoMudar, ehALevaAtual, aviso, aoAvisar }: PropsDoItem) {
  const [planoB, setPlanoB] = useState(false);
  const texto = textoDaTarefa(t.numero, t.chefe);
  return (
    <li className="flex flex-col hover:bg-fundo">
      <div className="flex flex-col">
        <a
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 focus-visible:-outline-offset-2"
        >
          <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
            <span className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="shrink-0 text-sm tabular-nums text-texto-2">#{t.numero}</span>
              <span className="min-w-0 font-medium sm:truncate" title={t.titulo}>{t.titulo}</span>
              <span className="sr-only"> (abre no GitHub, em aba nova)</span>
            </span>
            <span className="flex flex-wrap items-center gap-3 text-sm">
              <Selo estado={t.estado} />
              {/* Livre já diz no selo que não tem dono; nos outros estados, avisa. */}
              {t.dono ? (
                <span className="flex items-center gap-1.5 text-texto-2">
                  <Avatar login={t.dono.login} avatar={t.dono.avatar} />
                  {t.dono.login}
                </span>
              ) : (
                t.estado !== "livre" && <span className="text-texto-2">sem responsável</span>
              )}
              {t.estimativaHoras !== undefined && (
                <span className="tabular-nums text-texto-2">{String(t.estimativaHoras).replace(".", ",")} h</span>
              )}
            </span>
          </span>
          {/* Chefe e ajudantes numa linha só deles: na mesma linha do título, cortavam o título no computador. */}
          {(t.chefe || t.ajudantes) && (
            <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-sm text-texto-2">
              {t.chefe && <span className="min-w-0 max-w-full break-words">Chefe: {t.chefe}</span>}
              {t.ajudantes && <span className="min-w-0 max-w-full break-words">Ajudantes: {t.ajudantes}</span>}
            </span>
          )}
        </a>
        <BotoesDaTarefa
          tarefa={t}
          tarefas={tarefas}
          login={login}
          aoMudar={aoMudar}
          ehALevaAtual={ehALevaAtual}
          planoB={planoB}
          aoCopiar={(r) => setPlanoB(r === "plano-b")}
          aoAvisar={aoAvisar}
        />
        <AvisoDaAcao texto={aviso} />
      </div>
      {planoB && t.estado !== "feita" && texto !== undefined && <CampoDoTexto texto={texto} numero={t.numero} />}
    </li>
  );
}

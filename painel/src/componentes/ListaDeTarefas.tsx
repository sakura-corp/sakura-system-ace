import { useEffect, useRef, useState } from "react";
import type { Tarefa } from "../tipos";
import { agruparPorEstado } from "../logica/contador";
import { Avatar } from "./Avatar";
import { linkParaComecar, numeroValido, textoDaTarefa } from "../logica/comecarComClaude";
import { copiarTexto, type ResultadoDaCopia } from "../logica/copiarTexto";
import { linkDoClaude } from "../logica/link";
import { PLURAL, Selo } from "./Selo";

export function ListaDeTarefas({ tarefas }: { tarefas: Tarefa[] }) {
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
                <ItemDaTarefa key={t.numero} tarefa={t} />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

const BOTAO =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-medium hover:opacity-90";

/**
 * Só em tarefa que não está feita: abre o formulário do Claude (que não envia sozinho) ou copia o mesmo texto.
 * Cabeçalho incompleto → só o aviso "tarefa incompleta" (vale mais que a dependência, que não dá pra confiar).
 * Dependência ainda aberta → o botão aparece desligado com "Espera #N", e sem o "Copiar texto".
 */
function BotoesDoClaude({ tarefa, planoB, aoCopiar }: { tarefa: Tarefa; planoB: boolean; aoCopiar: (r: ResultadoDaCopia) => void }) {
  const [copiado, setCopiado] = useState(false);
  const aviso = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(aviso.current), []);

  const texto = textoDaTarefa(tarefa.numero, tarefa.chefe);
  const href = linkDoClaude(linkParaComecar(tarefa.numero, tarefa.chefe));
  if (tarefa.estado === "feita" || !href || texto === undefined) return null;

  const faltas = tarefa.incompleta ?? [];
  if (faltas.length > 0) {
    return (
      <p className="mx-4 mb-3 min-w-0 break-words text-sm text-texto-2" title={faltas.join("; ")}>
        tarefa incompleta
        <span className="sr-only">: falta no cabeçalho da tarefa #{tarefa.numero}: {faltas.join("; ")}</span>
      </p>
    );
  }

  const esperando = (tarefa.dependeDeAbertas ?? []).filter(numeroValido);
  if (esperando.length > 0) {
    const lista = esperando.map((n) => `#${n}`).join(", ");
    return (
      <div className="mx-4 mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          className={`${BOTAO} max-w-full min-w-0 cursor-not-allowed break-words border border-borda bg-cartao text-center text-texto-2 hover:opacity-100`}
        >
          <span className="min-w-0">
            Começar com o Claude · Espera {lista}
            <span className="sr-only"> (a tarefa #{tarefa.numero} só pode começar quando {lista} for fechada)</span>
          </span>
        </button>
      </div>
    );
  }

  async function copiar() {
    const r = await copiarTexto(texto!, navigator.clipboard);
    aoCopiar(r);
    window.clearTimeout(aviso.current);
    setCopiado(r === "copiado");
    if (r === "copiado") aviso.current = window.setTimeout(() => setCopiado(false), 4000);
  }

  return (
    <div className="mx-4 mb-3 flex flex-wrap gap-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${BOTAO} bg-destaque text-sobre-destaque`}
      >
        Começar com o Claude<span className="sr-only"> (tarefa #{tarefa.numero}; abre o Claude em aba nova)</span>
      </a>
      <button type="button" onClick={copiar} className={`${BOTAO} border border-borda bg-cartao text-texto`}>
        {copiado ? "Copiado" : "Copiar texto"}
        <span className="sr-only"> (tarefa #{tarefa.numero})</span>
      </button>
      <p className="basis-full text-sm text-texto-2 sm:hidden">
        No celular, se o texto não aparecer, abra pelo navegador ou use Copiar texto.
      </p>
      <span className="sr-only" role="status" aria-live="polite">
        {copiado ? `Texto da tarefa #${tarefa.numero} copiado` : planoB ? "Não deu pra copiar sozinho: o texto está no campo abaixo, já selecionado" : ""}
      </span>
    </div>
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

function ItemDaTarefa({ tarefa: t }: { tarefa: Tarefa }) {
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
        <BotoesDoClaude tarefa={t} planoB={planoB} aoCopiar={(r) => setPlanoB(r === "plano-b")} />
      </div>
      {planoB && t.estado !== "feita" && texto !== undefined && <CampoDoTexto texto={texto} numero={t.numero} />}
    </li>
  );
}

import { useEffect, useRef, useState } from "react";
import type { Tarefa } from "../tipos";
import { agruparPorEstado } from "../logica/contador";
import { Avatar } from "./Avatar";
import { linkParaComecar, textoDaTarefa } from "../logica/comecarComClaude";
import { copiarTexto, type ResultadoDaCopia } from "../logica/copiarTexto";
import { acaoNaTarefa } from "../logica/dados";
import { linkDoClaude } from "../logica/link";
import { depoisDaAcao, mesmoLogin, motivoPraNaoPegar } from "../logica/pegar";
import { Selo } from "./Selo";

type Props = {
  tarefas: Tarefa[];
  /** Quem está olhando. Sem login (modo de exemplo), o "Pegar tarefa" fica desligado. */
  login?: string;
  /** Depois de pegar ou largar (ou da sessão acabar): busca a leva de novo. */
  aoMudar?: () => Promise<unknown>;
  /** A leva aceita "Pegar tarefa": a atual, ou uma anterior com tarefa aberta (`levaAceitaPegar`). */
  levaAberta?: boolean;
};

export function ListaDeTarefas({ tarefas, login, aoMudar, levaAberta = true }: Props) {
  // O aviso da última ação mora aqui, não na linha: depois de recarregar, a linha pode mudar de lugar
  // (ou perder os botões, se outra pessoa pegou) e o aviso vai junto com ela.
  const [aviso, setAviso] = useState<{ numero: number; texto: string } | null>(null);
  // Uma lista só, na ordem dos grupos (o estado está no selo de cada linha; o contador dá os totais).
  // Dentro de cada grupo, pela prioridade (#776).
  const emOrdem = agruparPorEstado(tarefas).flatMap((g) => [...g.tarefas].sort(porPrioridade));
  const comPrioridade = tarefas.some((t) => t.prioridade !== undefined);
  const dica = tarefas.some((t) => temBotoesDoClaude(t, login));
  return (
    <section aria-labelledby="titulo-das-tarefas" className="overflow-hidden rounded-xl border border-borda bg-cartao">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pb-2 pt-4 sm:px-5">
        <h2 id="titulo-das-tarefas" className="text-[15px] font-semibold">
          Tarefas <span className="tabular-nums">({tarefas.length})</span>
          {comPrioridade && ", em ordem de prioridade"}
        </h2>
        <p className="text-[13px] text-texto-2">os botões aparecem só na tarefa de quem olha</p>
        {/* Uma vez na tela, não em cada tarefa (#547). */}
        {dica && (
          <p className="basis-full text-sm text-texto-2 sm:hidden">
            No celular, se o texto não aparecer, abra pelo navegador ou use Copiar texto.
          </p>
        )}
      </div>
      <div aria-hidden="true" className={`hidden ${GRADE} pb-2 pt-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-texto-2 lg:grid`}>
        <span>Nº</span>
        <span>Tarefa</span>
        <span>Estado</span>
        <span>Chefe</span>
        <span>Quem</span>
        <span className="text-right">Horas</span>
      </div>
      <ul className="divide-y divide-borda border-t border-borda">
        {emOrdem.map((t) => (
          <LinhaDaTarefa
            key={t.numero}
            tarefa={t}
            tarefas={tarefas}
            login={login}
            aoMudar={aoMudar}
            levaAberta={levaAberta}
            aviso={aviso?.numero === t.numero ? aviso.texto : ""}
            aoAvisar={(texto) => setAviso(texto ? { numero: t.numero, texto } : null)}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * A ordem dentro de um grupo (#776): a prioridade (1 é a mais importante); sem prioridade vai pro fim.
 * Empate, e entre as sem prioridade, pela ordem do número da issue.
 */
export function porPrioridade(a: Tarefa, b: Tarefa): number {
  const pa = a.prioridade ?? Infinity;
  const pb = b.prioridade ?? Infinity;
  if (pa !== pb) return pa < pb ? -1 : 1;
  return a.numero - b.numero;
}

/**
 * Aviso, nunca tranca (#776): a tarefa de prioridade maior (a mais alta) que quem olha também poderia pegar agora.
 * Undefined = nenhuma. Só serve pra um aviso curto embaixo do "Pegar tarefa": pegar a 3ª antes da 1ª é permitido.
 */
function prioridadeMaiorLivre(tarefa: Tarefa, tarefas: Tarefa[], login: string | undefined): Tarefa | undefined {
  const minha = tarefa.prioridade ?? Infinity;
  return tarefas
    .filter((t) => t.numero !== tarefa.numero && t.prioridade !== undefined && t.prioridade < minha)
    .filter((t) => motivoPraNaoPegar(t, tarefas, login) === null)
    .sort(porPrioridade)[0];
}

/** A tarefa tem os botões do Claude pra quem olha (a mesma conta do `BotoesDaTarefa`). */
function temBotoesDoClaude(t: Tarefa, login: string | undefined): boolean {
  if (t.estado === "feita" || (t.incompleta ?? []).length > 0) return false;
  if (!t.dono || !mesmoLogin(t.dono.login, login)) return false;
  return !!linkDoClaude(linkParaComecar(t.numero, t.chefe, t.repositorio)) && textoDaTarefa(t.numero, t.chefe, t.repositorio) !== undefined;
}

/**
 * A grade da linha (versão A, #547). No computador (lg), uma linha com as colunas do cabeçalho e, embaixo,
 * os botões e avisos ("x"). Abaixo disso: número à esquerda, título em cima, estado e horas, e o chefe e quem cada um
 * na largura toda (lado a lado, a coluna "auto" espremia o chefe até quebrar letra por letra em 320 px).
 */
const GRADE =
  "grid grid-cols-[40px_minmax(0,1fr)_auto] gap-x-3 px-4 sm:px-5 [grid-template-areas:'n_t_t'_'._s_h'_'._c_c'_'._d_d'_'._x_x'] " +
  "lg:grid-cols-[52px_minmax(0,1fr)_112px_128px_168px_44px] lg:[grid-template-areas:'n_t_s_c_d_h'_'._x_x_x_x_x'] lg:items-center";

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
  levaAberta: boolean;
  planoB: boolean;
  aoCopiar: (r: ResultadoDaCopia) => void;
  /** Põe (ou apaga, com "") o aviso da última ação, que fica à vista no cartão. */
  aoAvisar: (texto: string) => void;
  /** Onde os botões ficam (a linha da leva põe numa área da grade). */
  className?: string;
  /** A dica do celular embaixo dos botões; a lista da leva mostra a dela uma vez só (#547). */
  dica?: boolean;
};

/**
 * Os botões do cartão (#538), por ordem:
 * - feita → nada; incompleta → só o aviso "tarefa incompleta" e o que falta (vale mais que a dependência);
 * - com dono, e é quem olha → "Começar com o Claude", "Copiar texto" e, só em andamento, "Largar" (com confirmação aqui dentro);
 * - com dono, outra pessoa → nada;
 * - sem dono → "Pegar tarefa"; se não pode, desligado e o motivo à vista (no celular não existe dica de mouse).
 * Quem decide de verdade é o worker; a página só desliga o botão e diz o porquê.
 */
function BotoesDaTarefa({ tarefa, tarefas, login, aoMudar, levaAberta, planoB, aoCopiar, aoAvisar, className = "mx-4 mb-3", dica = true }: PropsDosBotoes) {
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState<Acao | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const aviso = useRef<number | undefined>(undefined);
  const botaoLargar = useRef<HTMLButtonElement>(null);
  useEffect(() => () => window.clearTimeout(aviso.current), []);

  const texto = textoDaTarefa(tarefa.numero, tarefa.chefe, tarefa.repositorio);
  const href = linkDoClaude(linkParaComecar(tarefa.numero, tarefa.chefe, tarefa.repositorio));
  if (tarefa.estado === "feita" || !href || texto === undefined) return null;

  const faltas = tarefa.incompleta ?? [];
  if (faltas.length > 0) {
    // O que falta fica à vista (no celular não existe dica de mouse; Sofia, 17/10).
    return (
      <div className={`${className} min-w-0 text-sm text-texto-2`}>
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
      const { aviso, recarregar } = depoisDaAcao(tarefa.numero, await acaoNaTarefa(tarefa.numero, acao, undefined, tarefa.repositorio));
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
      <div className={className}>
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
          {dica && (
            <p className="basis-full text-sm text-texto-2 sm:hidden">
              No celular, se o texto não aparecer, abra pelo navegador ou use Copiar texto.
            </p>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {copiado ? `Texto da tarefa #${numero} copiado` : planoB ? "Não deu pra copiar sozinho: o texto está no campo abaixo, já selecionado" : ""}
          </span>
        </div>
      </div>
    );
  }

  // Sem dono: Pegar tarefa.
  const motivo = !levaAberta ? "esta tarefa não está numa leva aberta" : motivoPraNaoPegar(tarefa, tarefas, login);
  if (motivo === null) {
    const maior = prioridadeMaiorLivre(tarefa, tarefas, login);
    return (
      <div className={className}>
        <div className="flex flex-wrap gap-2">
          {ocupado === "pegar" ? (
            <button type="button" disabled className={BOTAO_DESLIGADO}>
              Pegando…<span className="sr-only"> (tarefa #{numero})</span>
            </button>
          ) : (
            <button type="button" onClick={() => agir("pegar")} aria-describedby={maior ? `prioridade-${numero}` : undefined} className={BOTAO_SECUNDARIO}>
              Pegar tarefa<span className="sr-only"> (tarefa #{numero})</span>
            </button>
          )}
          {maior && (
            <p id={`prioridade-${numero}`} className="basis-full break-words text-xs text-texto-2">
              a #{maior.numero} ({maior.prioridade}º) tem prioridade maior e está livre
            </p>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
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
function AvisoDaAcao({ texto, className = "mx-4 mb-3" }: { texto: string; className?: string }) {
  const p = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (texto) p.current?.focus();
  }, [texto]);
  return (
    <p ref={p} tabIndex={-1} role="status" aria-live="polite" className={`${className} break-words text-sm text-texto empty:m-0`}>
      {texto}
    </p>
  );
}

/** Plano B: o texto num campo já selecionado, pra copiar à mão (toque e segure, ou Ctrl+C). */
function CampoDoTexto({ texto, numero, className = "mx-4 mb-3" }: { texto: string; numero: number; className?: string }) {
  const campo = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
  }, []);
  return (
    <div className={`${className} flex flex-col gap-1`}>
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

export type PropsDoItem = {
  tarefa: Tarefa;
  tarefas: Tarefa[];
  login?: string;
  aoMudar?: () => Promise<unknown>;
  levaAberta: boolean;
  aviso: string;
  aoAvisar: (texto: string) => void;
};

/** Um cartão de tarefa com os botões da #538; o Início (#546) usa pra "A sua tarefa". */
export function ItemDaTarefa({ tarefa: t, tarefas, login, aoMudar, levaAberta, aviso, aoAvisar }: PropsDoItem) {
  const [planoB, setPlanoB] = useState(false);
  const texto = textoDaTarefa(t.numero, t.chefe, t.repositorio);
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
          levaAberta={levaAberta}
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

/**
 * Uma linha da lista da leva (versão A, #547): os mesmos botões e avisos do cartão, na grade compacta.
 * "Pegar tarefa" fica na coluna "Quem" (a livre não tem dono); os botões de quem olha, embaixo, na linha toda.
 */
function LinhaDaTarefa({ tarefa: t, tarefas, login, aoMudar, levaAberta, aviso, aoAvisar }: PropsDoItem) {
  const [planoB, setPlanoB] = useState(false);
  const texto = textoDaTarefa(t.numero, t.chefe, t.repositorio);
  const minha = !!t.dono && mesmoLogin(t.dono.login, login);
  // Só a livre: em andamento ou revisão sem dono, a coluna diz "sem responsável" e os botões vão embaixo.
  const pegarNaColunaQuem = !t.dono && t.estado === "livre" && (t.incompleta ?? []).length === 0;
  const pequeno = "text-[13px] text-texto-2";
  return (
    <li className={`${GRADE} py-3 text-sm ${minha ? "bg-livre-fundo" : "hover:bg-fundo"}`}>
      <span className="pt-px tabular-nums text-texto-2 [grid-area:n] lg:pt-0">#{t.numero}</span>
      <a
        href={t.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 font-medium leading-snug [grid-area:t] [overflow-wrap:anywhere] hover:underline focus-visible:outline-offset-2"
      >
        {t.prioridade !== undefined && (
          <span className="mr-2 inline-block rounded-md border border-borda px-1.5 align-[1px] text-xs font-semibold tabular-nums text-texto">
            {t.prioridade}º<span className="sr-only"> de prioridade</span>
          </span>
        )}
        {t.titulo}
        <span className="sr-only"> (abre no GitHub, em aba nova)</span>
      </a>
      <span className="mt-2 [grid-area:s] lg:mt-0">
        <Selo estado={t.estado} />
      </span>
      <span className="mt-2 text-right tabular-nums [grid-area:h] lg:mt-0">
        {t.estimativaHoras !== undefined ? (
          `${String(t.estimativaHoras).replace(".", ",")} h`
        ) : (
          <span className="text-texto-2">—<span className="sr-only"> sem estimativa</span></span>
        )}
      </span>
      <span className="mt-2 flex min-w-0 flex-col leading-tight [grid-area:c] lg:mt-0">
        {t.chefe ? (
          <span className="min-w-0 max-w-full break-words">Chefe: {t.chefe}</span>
        ) : (
          <span className="text-texto-2">sem chefe</span>
        )}
        {t.ajudantes && <span className={`min-w-0 max-w-full break-words ${pequeno}`}>Ajudantes: {t.ajudantes}</span>}
      </span>
      {pegarNaColunaQuem ? (
        <BotoesDaTarefa
          tarefa={t}
          tarefas={tarefas}
          login={login}
          aoMudar={aoMudar}
          levaAberta={levaAberta}
          planoB={planoB}
          aoCopiar={(r) => setPlanoB(r === "plano-b")}
          aoAvisar={aoAvisar}
          className="mt-2 flex min-w-0 flex-col items-start [grid-area:d] lg:mt-0"
          dica={false}
        />
      ) : (
        <span className="mt-2 flex min-w-0 items-center gap-1.5 [grid-area:d] empty:hidden lg:mt-0 lg:empty:flex">
          {t.dono ? (
            <>
              <Avatar login={t.dono.login} avatar={t.dono.avatar} />
              <span className="min-w-0 break-words">
                {t.dono.login}
                {minha && <span className="text-texto-2"> (você)</span>}
              </span>
            </>
          ) : (
            t.estado !== "livre" && <span className="text-texto-2">sem responsável</span>
          )}
        </span>
      )}
      <div className="flex min-w-0 flex-col [grid-area:x]">
        {!pegarNaColunaQuem && (
          <BotoesDaTarefa
            tarefa={t}
            tarefas={tarefas}
            login={login}
            aoMudar={aoMudar}
            levaAberta={levaAberta}
            planoB={planoB}
            aoCopiar={(r) => setPlanoB(r === "plano-b")}
            aoAvisar={aoAvisar}
            className="mt-2.5"
            dica={false}
          />
        )}
        <AvisoDaAcao texto={aviso} className="mt-2.5" />
        {planoB && t.estado !== "feita" && texto !== undefined && <CampoDoTexto texto={texto} numero={t.numero} className="mt-2.5" />}
      </div>
    </li>
  );
}

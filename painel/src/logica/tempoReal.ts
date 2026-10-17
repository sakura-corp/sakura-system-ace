// O tempo real da página (#355). A conexão com a sala do worker (WebSocket) e as regras em volta:
// quando buscar de novo, quanto esperar pra reconectar, e o `estado` que a barra lateral mostra.
// Tudo aqui é independente do React (o relógio, os temporizadores e o WebSocket vêm por parâmetro),
// pra poder ser testado. O aviso não leva dado nenhum da tarefa: cada painel busca pela própria sessão.

export type EstadoDoTempoReal = "aovivo" | "reconectando" | "desatualizado";

/** A última busca com sucesso passou disso: o painel não mostra mais dado velho como se fosse de agora. */
export const LIMITE_DESATUALIZADO_MS = 2 * 60 * 1000;
/** De reserva, busca de novo de tempos em tempos, mesmo sem aviso. */
export const RESERVA_MS = 2 * 60 * 1000;
/** Avisos seguidos viram uma busca só. */
export const JUNTAR_AVISOS_MS = 1000;
/** De quanto em quanto tempo o `estado` é recalculado (pra virar "desatualizado" sozinho). */
const CONFERIR_ESTADO_MS = 10 * 1000;

const ESPERAS_MS = [1000, 2000, 5000, 10000, 30000];

/** Quanto esperar antes da tentativa `n` (0 = a primeira depois da queda): 1 s, 2 s, 5 s, 10 s, até 30 s. */
export function esperaDaReconexao(tentativa: number): number {
  const n = Number.isFinite(tentativa) ? Math.max(0, Math.floor(tentativa)) : 0;
  return ESPERAS_MS[Math.min(n, ESPERAS_MS.length - 1)];
}

/**
 * O que a barra lateral mostra. "Desatualizado" ganha de tudo: se faz mais de 2 minutos que nenhuma
 * busca deu certo, a tela está velha, mesmo com a conexão aberta. O relógio vem por parâmetro.
 */
export function estadoDoTempoReal(conectado: boolean, ultimaBuscaOk: number | null, agora: number): EstadoDoTempoReal {
  if (ultimaBuscaOk !== null && agora - ultimaBuscaOk > LIMITE_DESATUALIZADO_MS) return "desatualizado";
  return conectado ? "aovivo" : "reconectando";
}

/** Os avisos de tarefa fazem a tela da leva buscar de novo. */
const EVENTOS_DE_TAREFA = ["issues", "pull_request", "label"];
/** A Sala (#468) também escuta os de robô (rodadas) e de branch (push, create, delete). */
const EVENTOS_DA_SALA = [...EVENTOS_DE_TAREFA, "workflow_run", "push", "create", "delete"];

function avisoDe(texto: unknown, eventos: string[]): { evento: string; numero?: number } | null {
  if (typeof texto !== "string") return null;
  try {
    const aviso = JSON.parse(texto) as { evento?: unknown; numero?: unknown };
    if (typeof aviso.evento !== "string" || !eventos.includes(aviso.evento)) return null;
    return typeof aviso.numero === "number" ? { evento: aviso.evento, numero: aviso.numero } : { evento: aviso.evento };
  } catch {
    return null;
  }
}

/** O texto que chega da sala, se for um aviso de tarefa. Qualquer outra coisa vira `null`. */
export const avisoDeTarefa = (texto: unknown) => avisoDe(texto, EVENTOS_DE_TAREFA);

/** O texto que chega da sala, se for um aviso que muda a Sala (#468). Qualquer outra coisa vira `null`. */
export const avisoDaSala = (texto: unknown) => avisoDe(texto, EVENTOS_DA_SALA);

/**
 * A linha de conexão do topo da Sala (#468). O número vem do relógio de quem olha, não do servidor.
 * "Desatualizado" já vem decidido por `estadoDoTempoReal` (mais de 2 min sem busca com sucesso).
 */
export function textoDaConexao(estado: EstadoDoTempoReal, ultimaAtualizacao: number | null, agora: number): string {
  if (estado === "reconectando") return "reconectando…";
  const ms = ultimaAtualizacao === null ? null : Math.max(0, agora - ultimaAtualizacao);
  if (estado === "desatualizado") return ms === null ? "desatualizado" : `desatualizado há ${Math.max(2, Math.floor(ms / 60_000))} min`;
  if (ms === null) return "ao vivo";
  const s = Math.floor(ms / 1000);
  if (s < 1) return "ao vivo · atualizado agora";
  return s < 60 ? `ao vivo · atualizado há ${s} s` : `ao vivo · atualizado há ${Math.floor(s / 60)} min`;
}

/** Do jeito que o navegador entrega: a mensagem vem em `data`. */
export interface ConexaoLike {
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  close(): void;
}

export type SituacaoDoTempoReal = { estado: EstadoDoTempoReal; ultimaAtualizacao: number | null };

export interface OpcoesDoTempoReal {
  abrir: () => ConexaoLike;
  /** Busca a leva (ou a Sala) de novo. `true` = deu certo (só então conta como "atualizado"). */
  buscar: () => Promise<boolean>;
  /** Quais avisos fazem buscar de novo. Padrão: os de tarefa. */
  aviso?: (texto: unknown) => unknown;
  aoMudar: (situacao: SituacaoDoTempoReal) => void;
  relogio?: () => number;
  agendar?: (f: () => void, ms: number) => unknown;
  cancelar?: (id: unknown) => void;
}

export interface TempoReal {
  iniciar(): void;
  parar(): void;
  /** Uma busca que deu certo e foi feita por fora (a primeira, da página). */
  buscaFeita(): void;
  /** A janela voltou a ficar em foco. */
  voltouAoFoco(): void;
  /** Busca agora (o "Tentar de novo" da Sala, #468). Se já tem uma busca andando, não faz outra. */
  atualizar(): Promise<void>;
}

/**
 * Liga a página à sala. Conecta; a cada aviso de tarefa busca de novo (juntando os avisos de 1 s);
 * se a conexão cair, tenta de novo sozinha (1, 2, 5, 10, até 30 s) e, ao voltar, busca de novo
 * (pode ter perdido avisos). De reserva, busca a cada 2 minutos e quando a janela volta ao foco.
 */
export function criarTempoReal(opcoes: OpcoesDoTempoReal): TempoReal {
  const aviso = opcoes.aviso ?? avisoDeTarefa;
  const relogio = opcoes.relogio ?? Date.now;
  const agendar = opcoes.agendar ?? ((f, ms) => setTimeout(f, ms));
  const cancelar = opcoes.cancelar ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));

  let ativo = false;
  let conectado = false;
  let jaConectou = false;
  let tentativa = 0;
  let ultima: number | null = null;
  let conexao: ConexaoLike | null = null;
  let buscando = false;
  let timerDeReconexao: unknown = null;
  let timerDeAvisos: unknown = null;
  let timerDaReserva: unknown = null;
  let timerDoEstado: unknown = null;

  const emitir = () => opcoes.aoMudar({ estado: estadoDoTempoReal(conectado, ultima, relogio()), ultimaAtualizacao: ultima });

  async function buscarAgora() {
    if (!ativo || buscando) return;
    buscando = true;
    try {
      if (await opcoes.buscar()) ultima = relogio();
    } catch {
      // buscar falhou: segue com o dado de antes, e o estado denuncia se passar de 2 minutos
    } finally {
      buscando = false;
    }
    if (ativo) emitir();
  }

  function conectar() {
    if (!ativo) return;
    const c = opcoes.abrir();
    conexao = c;
    c.onopen = () => {
      if (c !== conexao) return;
      conectado = true;
      tentativa = 0;
      const reconectou = jaConectou;
      jaConectou = true;
      emitir();
      if (reconectou) void buscarAgora();
    };
    c.onmessage = (e) => {
      if (c !== conexao || !aviso(e.data) || timerDeAvisos !== null) return;
      timerDeAvisos = agendar(() => {
        timerDeAvisos = null;
        void buscarAgora();
      }, JUNTAR_AVISOS_MS);
    };
    c.onclose = () => {
      if (c !== conexao) return;
      conexao = null;
      conectado = false;
      emitir();
      if (!ativo) return;
      timerDeReconexao = agendar(() => {
        timerDeReconexao = null;
        conectar();
      }, esperaDaReconexao(tentativa++));
    };
    c.onerror = () => {
      // o navegador fecha a conexão logo depois (onclose), que é onde se reconecta
    };
  }

  const reserva = () => {
    void buscarAgora();
    timerDaReserva = agendar(reserva, RESERVA_MS);
  };
  const conferirEstado = () => {
    emitir();
    timerDoEstado = agendar(conferirEstado, CONFERIR_ESTADO_MS);
  };

  return {
    iniciar() {
      if (ativo) return;
      ativo = true;
      emitir();
      conectar();
      timerDaReserva = agendar(reserva, RESERVA_MS);
      timerDoEstado = agendar(conferirEstado, CONFERIR_ESTADO_MS);
    },
    parar() {
      ativo = false;
      for (const t of [timerDeReconexao, timerDeAvisos, timerDaReserva, timerDoEstado]) if (t !== null) cancelar(t);
      timerDeReconexao = timerDeAvisos = timerDaReserva = timerDoEstado = null;
      const c = conexao;
      conexao = null;
      conectado = false;
      c?.close();
    },
    buscaFeita() {
      ultima = relogio();
      if (ativo) emitir();
    },
    voltouAoFoco() {
      void buscarAgora();
    },
    atualizar: buscarAgora,
  };
}

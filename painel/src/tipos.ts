/** As páginas do painel. */
export type Pagina = "leva" | "escritorio";

export type EstadoTarefa = "livre" | "andamento" | "revisao" | "feita";

export type Tarefa = {
  numero: number;
  titulo: string;
  url: string;
  estado: EstadoTarefa;
  dono?: { login: string; avatar: string };
  estimativaHoras?: number;
  prUrl?: string;
};

// ---- Sala (#467) e Escritório de agentes ----
// Os estados são os mesmos da Sala (#467): o Escritório usa o mesmo jeito de brilhar.
export type TipoBonequinho = "pessoa" | "claude" | "casa";
export type EstadoBonequinho = "trabalhando" | "precisa" | "erro" | "dormindo" | "livre";

export type Modelo = "opus" | "sonnet" | "haiku";

/** Uma equipe é uma sala do Escritório (ex.: "Programa das lojas"). */
export type Equipe = {
  id: string;
  nome: string;
  /** Cor da sala: só uma das "Cores das equipes" do docs/painel.md. */
  cor: string;
  /** Nome do agente que lidera a sala. */
  lider: string;
  numeros: { tarefasHoje: number[]; rodando: number[]; tempoMedioMin: number[] };
  ferramentas: string[];
  skills: { nome: string; progresso: number }[];
};

/** Um agente: uma sessão do Claude com um papel. Os campos "brutos" viram estado em logica/escritorio.ts. */
export type Agente = {
  id: string;
  nome: string;
  equipe: string;
  modelo: Modelo;
  fazendo: string;
  /** ISO, com fuso. Usada pro "trabalhando" (até 2 h) e pro "dormindo" (3 dias ou mais). */
  ultimaAtividade: string;
  rodando?: boolean;
  /** Login de quem precisa aprovar ou revisar algo deste agente. */
  esperandoPor?: string;
  falhou?: boolean;
  url?: string;
};

export type SituacaoDaTarefa = "rodando" | "esperando" | "feita";

export type TarefaDoEscritorio = {
  id: string;
  titulo: string;
  equipe: string;
  situacao: SituacaoDaTarefa;
  /** 0 a 100, só pra "rodando". */
  progresso?: number;
  /** ISO, só pra "feita". */
  feitaEm?: string;
  url?: string;
};

/** As páginas do painel. */
export type Pagina = "inicio" | "leva" | "levas" | "secundarios" | "versoes" | "fases" | "relatorio" | "sala" | "pessoas" | "escritorio" | "financeiro" | "dre" | "lojas" | "posvenda" | "bancos" | "decisoes" | "configuracoes" | "meu-progresso" | "nao-encontrada";
// "nao-encontrada" (#560): /em-breve/<id que não existe>. Não é item da barra: nada fica marcado.

export type EstadoTarefa = "livre" | "andamento" | "revisao" | "feita";

export type Tarefa = {
  numero: number;
  titulo: string;
  url: string;
  estado: EstadoTarefa;
  dono?: { login: string; avatar: string };
  estimativaHoras?: number;
  prUrl?: string;
  /** A função do chefe (etiqueta `chefe:<função>`), só se for uma das 5 conhecidas. */
  chefe?: string;
  /** Quem ajuda, como está na linha Ajudantes do cabeçalho (até 200 caracteres). */
  ajudantes?: string;
  /** A linha opcional `Prioridade: N` do cabeçalho (#776); 1 é a mais importante. Sem ela (ou escrita errada), não vem. */
  prioridade?: number;
  /** A linha opcional `Reservada pra: <quem>` do cabeçalho (Sofia, 24/10). Só um selinho: nunca tranca o "Pegar tarefa". */
  reservadaPra?: string;
  /** Os números do Depende de que ainda estão abertos. */
  dependeDeAbertas?: number[];
  /** O que falta no cabeçalho da issue; só vem preenchido quando a tarefa está incompleta. */
  incompleta?: string[];
  /** O repositório da sakura-corp de onde a tarefa veio (#731). Só vem em tarefa de projeto secundário; sem ele, é do SSACE. */
  repositorio?: string;
};

// ---- Sala (#467) e Escritório de agentes ----
// Os estados são os mesmos da Sala (#467): o Escritório usa o mesmo jeito de brilhar.
export type TipoBonequinho = "pessoa" | "claude" | "casa";
export type EstadoBonequinho = "trabalhando" | "precisa" | "erro" | "dormindo" | "livre";

export type Bonequinho = {
  id: string;
  tipo: TipoBonequinho;
  nome: string;
  estado: EstadoBonequinho;
  fazendo?: string; // ex.: "#454 Central do dia" ou "Publicando a v0.9.52"
  url?: string; // onde clicar no GitHub
  avatar?: string; // só pessoas
  ultimaAtividade?: string; // ISO; usada pro "dormindo"
};

/** O que se sabe de um bonequinho antes de decidir o estado (a tarefa 8, #468, preenche isto com o GitHub). */
export type SinaisDoBonequinho = {
  /** Pessoa: tem tarefa em andamento. */
  tarefaEmAndamento?: boolean;
  /** Robô da casa: rodando agora. */
  rodando?: boolean;
  /** Robô da casa: como terminou a última rodada. */
  ultimaRodada?: "deu-certo" | "falhou";
  /** Logins a quem um PR pediu revisão. */
  revisaoPedidaA?: string[];
  /** Logins cuja aprovação uma rodada espera. */
  aprovacaoEsperadaDe?: string[];
  /** Login do dono do PR em que a conferência ficou vermelha. */
  conferenciaVermelhaNoPrDe?: string;
  /** Login de quem aprova o relatório da leva atual, quando ela está em Relatório (#645). */
  relatorioEsperaDe?: string;
};

export type EntradaDaSala = Omit<Bonequinho, "estado"> & { sinais: SinaisDoBonequinho };

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

// ---- Login (#353) ----
/** Quem entrou: o que o worker devolve em /api/eu. O token nunca chega na página. */
export type Usuario = { login: string; avatar: string };

// ---- As tarefas de verdade (#354) ----
/** A fase de uma leva (#644), lida do GitHub: `logica/fases.ts`. */
export type FaseDaLeva = "montando" | "trabalhando" | "testando" | "relatorio" | "aprovada";

/**
 * Uma leva, como /api/levas devolve: a etiqueta `leva-<numero>` e quantas tarefas abertas ela tem.
 * `fechadas` e `fase` (#644) sempre vêm do worker; são opcionais só pra quem monta uma leva à mão (os testes das telas).
 * `antesDasFases`: a leva 0, Aprovada sem relatório.
 */
export type Leva = { numero: number; nome: string; abertas: number; fechadas?: number; fase?: FaseDaLeva; antesDasFases?: true };

/**
 * Uma leva com o resumo das "Levas anteriores" (#548), como /api/levas/resumo devolve. `total`: todas as tarefas
 * da etiqueta; `feitas`: as fechadas (de qualquer jeito, como na tela da leva). `horas`: a soma das estimativas
 * (tarefa sem estimativa conta 0). `terminouEm`: o instante (ISO) em que a última tarefa foi fechada; null
 * enquanto houver tarefa aberta. `cortada`: mais de 100 tarefas, e as horas e a data saíram só das 100 primeiras.
 */
export type ResumoDeLeva = Leva & { total: number; feitas: number; horas: number; terminouEm: string | null; cortada?: true };

/** O que /api/levas/resumo devolve: as 20 levas mais novas e a atual entre elas (null sem nenhuma). */
export type RespostaDoResumoDasLevas = { levas: ResumoDeLeva[]; atual: number | null };

/** O que /api/levas devolve. `atual` é null quando ainda não existe etiqueta `leva-N`. */
export type RespostaDasLevas = { levas: Leva[]; atual: number | null };

/**
 * O que /api/leva/<n> devolve. `cortada`: a leva tem mais de 100 tarefas, e só as 100 primeiras vieram.
 * `fase` (#644): falta só quando a consulta das levas falhou.
 */
export type RespostaDaLeva = { numero: number; tarefas: Tarefa[]; cortada: boolean; fase?: FaseDaLeva };

/** Um defeito achado na fase Testando (#646): issue aberta com `defeito`. `url` só se for da sakura-corp. */
export type DefeitoDaLeva = { numero: number; titulo: string; url?: string; criadaEm: string };

/**
 * O que /api/leva/<n>/testes devolve (#646). `texto`: `docs/relatorios/leva-N-testes.md` da main, como veio (null se
 * ainda não existe); `textoCortado`: passou do limite. `desde`: quando a última tarefa da leva fechou (null se nenhuma).
 * `defeitosCortados`: há mais defeitos abertos do que os olhados.
 */
/** Uma caixinha da issue da rodada de testes: quem testa e se já terminou. `semAcesso`: ainda não entrou no banco de teste. */
export type PessoaDaRodada = { nome: string; terminou: boolean; semAcesso?: true };

/** A issue da rodada de testes da leva (a #728 da leva 3). `url` só se for da sakura-corp. */
export type RodadaDeTestes = { numero: number; url?: string; pessoas: PessoaDaRodada[] };

export type RespostaDosTestes = {
  numero: number;
  texto: string | null;
  textoCortado?: true;
  desde: string | null;
  defeitos: DefeitoDaLeva[];
  defeitosCortados?: true;
  /** Falta quando a issue da rodada ainda não existe. */
  rodada?: RodadaDeTestes;
};

// ---- A sala de verdade (#468) ----
/**
 * O que /api/sala devolve. `entradas` já vêm com os sinais; o estado (e o "dormindo") sai de
 * `montarSala()` na página, que recalcula sem buscar. `falhas`: os grupos cuja busca no GitHub falhou
 * (a página mostra o aviso, nunca "livre"). `leva`: a leva de onde saíram as pessoas (null se essa busca falhou).
 */
export type RespostaDaSala = { entradas: EntradaDaSala[]; falhas: TipoBonequinho[]; leva: number | null };

// ---- Projetos secundários (#731) ----
/**
 * Um projeto secundário: um repositório da sakura-corp com o tópico `projeto-secundario` que o login de quem olha
 * alcança. `levas`: as etiquetas `leva-N` dele, em ordem. `atual`: a menor `leva-N` com tarefa aberta (sem as fases
 * do SSACE); null se nenhuma tem. `descricao` é texto puro (a página nunca põe HTML).
 */
export type Projeto = { repositorio: string; nome: string; descricao?: string; url: string; levas: Leva[]; atual: number | null };

/** O que /api/projetos devolve. `cortada`: a organização tem mais repositórios do que os olhados. */
export type RespostaDosProjetos = { projetos: Projeto[]; cortada?: true };

/** O que /api/projetos/<repo>/leva devolve: a leva atual do projeto (null se nenhuma leva tem tarefa aberta). */
export type RespostaDaLevaDoProjeto = { repositorio: string; levas: Leva[]; atual: number | null; leva: RespostaDaLeva | null };

/** Os estados de uma proposta: a etiqueta `proposta:<estado>` no repositório `secundarios`. */
export const ESTADOS_DA_PROPOSTA = ["em-entrevista", "esperando-sofia", "com-sugestoes", "aprovada", "recusada"] as const;
export type EstadoDaProposta = (typeof ESTADOS_DA_PROPOSTA)[number];

/** Uma proposta (issue com a etiqueta `proposta`). `estado` null: falta a etiqueta de estado (ou tem mais de uma). */
export type Proposta = { numero: number; titulo: string; url: string; estado: EstadoDaProposta | null; aberta: boolean; atualizadaEm: string };

/**
 * O que /api/propostas devolve. `semAcesso`: o repositório `secundarios` não existe ou o login não lê ele
 * (a lista vem vazia e a página diz isso, sem quebrar). `cortada`: há mais propostas do que as olhadas.
 */
export type RespostaDasPropostas = { propostas: Proposta[]; semAcesso?: true; cortada?: true };

// ---- Meu progresso (#734): o relatório pessoal, sempre de uma pessoa só ----

/** Uma tarefa feita (fechada como concluída, com etiqueta `leva-N`) em que a pessoa é a responsável. */
export type TarefaEntregue = {
  repositorio: string;
  numero: number;
  titulo: string;
  url: string;
  /** Quando foi fechada (ISO, do GitHub). */
  feitaEm: string;
  estimativaHoras?: number;
  /** A função da etiqueta `chefe:<função>`, se for uma das conhecidas. */
  chefe?: string;
  /** Quando a pessoa foi posta como responsável (pegou a tarefa). */
  pegouEm?: string;
  /** Quando abriu o primeiro PR que fecha a tarefa. */
  prAbertoEm?: string;
};

/** Um PR mesclado que a pessoa abriu. */
export type PrMesclado = { repositorio: string; numero: number; mescladoEm: string };

/** O que /api/meu-progresso devolve: os dados de UMA pessoa. */
export type RespostaDoMeuProgresso = {
  login: string;
  tarefas: TarefaEntregue[];
  prs: PrMesclado[];
  /** Só pra dona (a Sofia): as pessoas que ela pode escolher. Pra qualquer outra pessoa, nunca vem. */
  pessoas?: string[];
  /** Mais entregas do que as olhadas: os números podem estar incompletos. */
  cortada?: true;
};

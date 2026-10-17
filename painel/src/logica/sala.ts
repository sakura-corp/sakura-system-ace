import type { Bonequinho, EntradaDaSala, EstadoBonequinho } from "../tipos";
import { decorrido, DORMINDO_A_PARTIR_MS, TRABALHANDO_ATE_MS } from "./tempo";

export { haQuantoTempo } from "./tempo";
export { fotoSegura, linkSeguro } from "./link";

/** Os robôs da casa: cada trabalho automático do GitHub, no seu cantinho fixo, nesta ordem. */
export const ROBOS_DA_CASA: { arquivo: string; nome: string }[] = [
  { arquivo: "ci.yml", nome: "Conferência" },
  { arquivo: "release.yml", nome: "Publicar" },
  { arquivo: "liberar-versao.yml", nome: "Liberar" },
  { arquivo: "atualizar-bancos.yml", nome: "Atualizar bancos" },
  { arquivo: "backup-banco.yml", nome: "Cópia do banco" },
  { arquivo: "electron-desatualizado.yml", nome: "Aviso do Electron" },
];

/** Nome do robô da casa pelo arquivo do trabalho; um que não está na lista fica com o nome do arquivo. */
export function nomeDoRoboDaCasa(arquivo: string): string {
  return ROBOS_DA_CASA.find((r) => r.arquivo === arquivo)?.nome ?? arquivo.replace(/\.ya?ml$/, "");
}

export const ORDEM_DA_LISTA: EstadoBonequinho[] = ["precisa", "erro", "trabalhando", "dormindo", "livre"];

export const ROTULO: Record<EstadoBonequinho, string> = {
  trabalhando: "trabalhando",
  precisa: "precisa de você",
  erro: "com erro",
  dormindo: "dormindo",
  livre: "livre",
};

export const TITULO_DO_GRUPO: Record<EstadoBonequinho, string> = {
  precisa: "Precisa de você",
  erro: "Com erro",
  trabalhando: "Trabalhando",
  dormindo: "Dormindo",
  livre: "Livres",
};

export const BALAO: Record<EstadoBonequinho, string> = {
  trabalhando: "digitando…",
  precisa: "!",
  erro: "×",
  dormindo: "zZ",
  livre: "",
};

/** Os três casos do "precisa de você": revisão pedida, rodada esperando aprovação, conferência vermelha num PR seu. */
export function precisaDe(e: EntradaDaSala, quemEstaOlhando: string): boolean {
  const s = e.sinais;
  return (
    (s.revisaoPedidaA?.includes(quemEstaOlhando) ?? false) ||
    (s.aprovacaoEsperadaDe?.includes(quemEstaOlhando) ?? false) ||
    s.conferenciaVermelhaNoPrDe === quemEstaOlhando
  );
}

/**
 * O estado de um bonequinho, do ponto de vista de quem está olhando.
 * Precisa de você > com erro > trabalhando > dormindo > livre.
 */
export function estadoDoBonequinho(e: EntradaDaSala, agora: Date, quemEstaOlhando: string): EstadoBonequinho {
  if (precisaDe(e, quemEstaOlhando)) return "precisa";
  if (e.tipo === "casa") {
    if (e.sinais.ultimaRodada === "falhou") return "erro";
    return e.sinais.rodando ? "trabalhando" : "livre";
  }
  if (e.tipo === "pessoa") return e.sinais.tarefaEmAndamento ? "trabalhando" : "livre";
  // robô do Claude: pelo último commit
  if (!e.ultimaAtividade) return "livre";
  const ms = decorrido(e.ultimaAtividade, agora);
  if (ms < TRABALHANDO_ATE_MS) return "trabalhando";
  if (ms >= DORMINDO_A_PARTIR_MS) return "dormindo";
  return "livre";
}

const ordemDoTipo = { pessoa: 0, claude: 1, casa: 2 } as const;

function lugarDaCasa(nome: string): number {
  const i = ROBOS_DA_CASA.findIndex((r) => r.nome === nome);
  return i === -1 ? ROBOS_DA_CASA.length : i;
}

/**
 * A ordem das mesas: pessoas, depois robôs do Claude (pelo nome), e os robôs da casa sempre no mesmo lugar
 * (a ordem de ROBOS_DA_CASA; os que não estão na lista vão pro fim, pelo nome). Não muda a lista recebida.
 */
export function ordemDasMesas<T extends Pick<Bonequinho, "tipo" | "nome">>(lista: T[]): T[] {
  return [...lista].sort((a, b) => {
    if (a.tipo !== b.tipo) return ordemDoTipo[a.tipo] - ordemDoTipo[b.tipo];
    if (a.tipo === "casa") return lugarDaCasa(a.nome) - lugarDaCasa(b.nome) || a.nome.localeCompare(b.nome, "pt-BR");
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export function montarSala(entradas: EntradaDaSala[], agora: Date, quemEstaOlhando: string): Bonequinho[] {
  return ordemDasMesas(
    entradas.map((e) => {
      const { sinais: _sinais, ...bonequinho } = e;
      return { ...bonequinho, estado: estadoDoBonequinho(e, agora, quemEstaOlhando) };
    }),
  );
}

/** A lista embaixo da sala: grupos por estado, "Precisa de você" primeiro; grupo vazio some. */
export function agruparPorEstado(bonequinhos: Bonequinho[]): { estado: EstadoBonequinho; itens: Bonequinho[] }[] {
  return ORDEM_DA_LISTA.map((estado) => ({ estado, itens: bonequinhos.filter((b) => b.estado === estado) })).filter(
    (g) => g.itens.length > 0,
  );
}

export function quantosPrecisam(bonequinhos: Bonequinho[]): number {
  return bonequinhos.filter((b) => b.estado === "precisa").length;
}

export function textoPrecisam(n: number): string {
  return n === 1 ? "1 coisa precisa de você" : `${n} coisas precisam de você`;
}

/** Iniciais de uma pessoa: "ana-exemplo" → "AE", "Bruno" → "B". */
export function iniciais(nome: string): string {
  return nome
    .split(/[\s\-_.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Modo TV: /sala?tv (com ou sem valor). */
export function ehModoTv(busca: string): boolean {
  return new URLSearchParams(busca).has("tv");
}

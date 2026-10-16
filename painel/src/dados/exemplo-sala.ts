import type { EntradaDaSala } from "../tipos";

// A Sala com DADOS DE EXEMPLO (a tarefa 8, #468, troca pelos do GitHub).
// 2 pessoas, 3 robôs do Claude (trabalhando, esperando revisão, dormindo) e os 6 robôs da casa
// (um rodando, um com erro, um esperando aprovação, o resto livre).

/** Quem está olhando, no exemplo. */
export const QUEM_ESTA_OLHANDO_NA_SALA = "voce-exemplo";

const repo = "https://github.com/sakura-corp/sakura-system-ace";

export function salaDeExemplo(agora: Date): EntradaDaSala[] {
  const ha = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
  const eu = QUEM_ESTA_OLHANDO_NA_SALA;
  return [
    { id: "p1", tipo: "pessoa", nome: "ana-exemplo", fazendo: "#454 Central do dia", url: `${repo}/issues/454`, ultimaAtividade: ha(25), sinais: { tarefaEmAndamento: true } },
    { id: "p2", tipo: "pessoa", nome: "bruno-exemplo", fazendo: "sem tarefa agora", ultimaAtividade: ha(300), sinais: {} },

    { id: "c1", tipo: "claude", nome: "Painel: a Sala", fazendo: "claude/painel-sala", url: `${repo}/pulls`, ultimaAtividade: ha(12), sinais: {} },
    { id: "c2", tipo: "claude", nome: "Clientes que sumiram", fazendo: "PR pronto, pedindo a sua revisão", url: `${repo}/pulls`, ultimaAtividade: ha(200), sinais: { revisaoPedidaA: [eu] } },
    { id: "c3", tipo: "claude", nome: "Sessão esquecida", fazendo: "claude/ajuste-antigo", ultimaAtividade: ha(4 * 24 * 60), sinais: {} },

    { id: "h1", tipo: "casa", nome: "Conferência", fazendo: "rodando no PR #477", url: `${repo}/actions/workflows/ci.yml`, ultimaAtividade: ha(3), sinais: { rodando: true } },
    { id: "h2", tipo: "casa", nome: "Publicar", fazendo: "última rodada deu certo", url: `${repo}/actions/workflows/release.yml`, ultimaAtividade: ha(20 * 60), sinais: { ultimaRodada: "deu-certo" } },
    { id: "h3", tipo: "casa", nome: "Liberar", fazendo: "rodada esperando a sua aprovação", url: `${repo}/actions/workflows/liberar-versao.yml`, ultimaAtividade: ha(40), sinais: { aprovacaoEsperadaDe: [eu] } },
    { id: "h4", tipo: "casa", nome: "Atualizar bancos", fazendo: "última rodada deu certo", ultimaAtividade: ha(2 * 24 * 60), sinais: { ultimaRodada: "deu-certo" } },
    { id: "h5", tipo: "casa", nome: "Cópia do banco", fazendo: "última rodada deu certo", ultimaAtividade: ha(9 * 60), sinais: { ultimaRodada: "deu-certo" } },
    // h6 tem link de fora do GitHub de propósito: o cartão mostra o endereço como texto, sem link.
    { id: "h6", tipo: "casa", nome: "Aviso do Electron", fazendo: "a última rodada falhou", url: "https://exemplo.com/fora-do-github", ultimaAtividade: ha(6 * 60), sinais: { ultimaRodada: "falhou" } },
  ];
}

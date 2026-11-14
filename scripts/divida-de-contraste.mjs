/**
 * Contraste que já estava abaixo da WCAG antes da varredura no DOM existir, e
 * que **depende de uma decisão da usuária** pra ser corrigido.
 *
 * Por que uma lista, e não uma correção direta: o item TR-01.3 do guia é
 * explícito — "traga o relatório para a usuária e corrija só o que ela
 * aprovar; não saia trocando cor da paleta sozinho". A cara do app é decisão
 * de quem é dona do produto, não efeito colateral de uma varredura. O que já
 * era erro claro (vermelho escuro sobre card escuro, letra branca sobre o
 * rosa neon) foi corrigido na hora e NÃO está aqui.
 *
 * A lista serve pra checagem poder ficar VERDE hoje e mesmo assim impedir que
 * apareça coisa NOVA — mesma disciplina do teste de arquitetura
 * (PROJETO_STATUS.md, seção 6, item 49): ela encolhe, nunca cresce. Quem
 * corrigir um item apaga a entrada, e o próprio script reprova se uma entrada
 * daqui parar de casar com alguma coisa.
 *
 * As entradas são por CAUSA, não por seletor: são 34 combinações reprovadas,
 * mas apenas três decisões — e uma lista de seletores quebraria inteira na
 * primeira classe que alguém mudasse.
 *
 * A entrada `borda-de-campo` (51 combinações, 1,15:1) saiu daqui em
 * 12/09/2026: a usuária aprovou clarear a borda, e ela virou o token
 * --color-sakura-borda-campo em globals.css.
 *
 * As entradas `botao-roxo-com-letra-branca` (4,48:1) e `texto-roxo-como-link`
 * (4,14:1) saíram em 14/11/2026, com o visual novo (#990): o botão principal
 * virou laranja com a letra escura (6,1:1) e o laranja como texto dá 5,5:1
 * contra o cartão.
 */
export const DIVIDA_DE_CONTRASTE = [
  {
    id: "calendario-dias-do-mes-vizinho",
    // 2,56:1. Estes são apagados DE PROPÓSITO: o calendário do Início mostra
    // a sobra do mês anterior e os primeiros dias do seguinte em cinza, pra
    // não competir com o mês corrente. Clarear resolve o número e estraga a
    // ideia. Fica aqui como decisão consciente, não como esquecimento.
    // O segundo tom é o mesmo dia apagado quando ele é feriado: o fundo do
    // feriado muda a mistura do cinza. Só aparece quando um feriado cai na
    // sobra visível (Finados, 2/11, no calendário de outubro; 1º/1 no de
    // dezembro), por isso a varredura reprovou pela primeira vez em 1º/10/2026.
    // Os dois tons são os do visual novo (#990), medidos com o relógio parado
    // em outubro; no tema rosa e roxo eram #5a5059 e #60545e.
    quando: (g) => g.tipo === "texto" && (g.frente === "#616165" || g.frente === "#65656a"),
  },
];

export function ehDividaConhecida(grupo) {
  return DIVIDA_DE_CONTRASTE.some((d) => d.quando(grupo));
}

/** Entradas que não casam com nada — já foram corrigidas e podem sair daqui. */
export function dividaResolvida(grupos) {
  return DIVIDA_DE_CONTRASTE.filter((d) => !grupos.some((g) => d.quando(g)));
}

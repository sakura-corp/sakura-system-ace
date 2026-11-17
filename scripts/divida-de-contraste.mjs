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
 * --color-borda-campo em globals.css.
 *
 * As entradas `botao-roxo-com-letra-branca` (4,48:1) e `texto-roxo-como-link`
 * (4,14:1) saíram em 14/11/2026, com o visual novo (#990): o botão principal
 * virou laranja com a letra escura (6,1:1) e o laranja como texto dá 5,5:1
 * contra o cartão.
 *
 * As entradas `calendario-dias-do-mes-vizinho*` saíram em 15/11/2026, com o
 * Início novo (tarefa 4): os dias do mês vizinho passaram ao `texto-3`, 5,4:1.
 */
export const DIVIDA_DE_CONTRASTE = [];

export function ehDividaConhecida(grupo) {
  return DIVIDA_DE_CONTRASTE.some((d) => d.quando(grupo));
}

/** Entradas que não casam com nada — já foram corrigidas e podem sair daqui. */
export function dividaResolvida(grupos) {
  return DIVIDA_DE_CONTRASTE.filter((d) => !grupos.some((g) => d.quando(g)));
}

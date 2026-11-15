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
    // 3,04:1. Estes são apagados DE PROPÓSITO: o calendário do Início mostra
    // a sobra do mês anterior e os primeiros dias do seguinte em cinza, pra
    // não competir com o mês corrente. Clarear resolve o número e estraga a
    // ideia. Fica aqui como decisão consciente, não como esquecimento.
    // É um tom só desde 15/11/2026, quando o cartão virou sólido (visual
    // novo, #990, tarefa 2): medido com o relógio parado em outubro (com o
    // feriado de Finados na sobra visível) e em novembro. Enquanto o cartão
    // era vidro eram dois tons, #616165 e #65656a (2,56:1), porque o fundo do
    // feriado mudava a mistura do cinza; no tema rosa e roxo, #5a5059 e
    // #60545e.
    quando: (g) =>
      g.tipo === "texto" &&
      // No tema claro (15/11/2026) é o mesmo cinza apagado, em cima do branco: 2,19:1.
      ((g.tema === "escuro" && g.frente === "#65656b" && g.fundo === "#191920") ||
        (g.tema === "claro" && g.frente === "#afafb1" && g.fundo === "#ffffff")),
  },
];

export function ehDividaConhecida(grupo) {
  return DIVIDA_DE_CONTRASTE.some((d) => d.quando(grupo));
}

/** Entradas que não casam com nada — já foram corrigidas e podem sair daqui. */
export function dividaResolvida(grupos) {
  return DIVIDA_DE_CONTRASTE.filter((d) => !grupos.some((g) => d.quando(g)));
}

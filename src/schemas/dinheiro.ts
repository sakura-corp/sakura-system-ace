/**
 * As contas de centavo, num lugar só.
 *
 * Por que este arquivo existe. A expressão `Math.round(valor * 100) / 100`
 * estava escrita **doze vezes** em sete arquivos diferentes — quatro delas
 * como funções privadas idênticas chamadas `arredondar`, copiadas de um
 * arquivo pro outro. Esse é exatamente o padrão que já custou cinco bugs de
 * dinheiro neste projeto (PROJETO_STATUS.md, seção 6, itens 35, 40 e 44:
 * "sempre que uma conta de dinheiro aparece em mais de um lugar, ela vai
 * divergir").
 *
 * Junto disso, a auditoria do esquema (guia de melhorias, TR-05.3) achou uma
 * soma de pagamentos que ia pro banco **sem** arredondar nenhum: somar
 * números já arredondados ainda produz cauda (0.1 + 0.2 dá
 * 0.30000000000000004), e a coluna `contas_receber.valor` era `numeric`
 * solto, então guardava a cauda inteira. Daí `somar()`, abaixo.
 *
 * ## Um limite conhecido, de propósito
 *
 * `arredondarCentavo()` mantém **exatamente** a mesma aritmética que já
 * estava espalhada pelo código, inclusive o canto conhecido dela: 1,005 vira
 * 1,00 (e não 1,01), porque 1,005 em binário fica um fio abaixo da metade.
 * Isso é herança do ponto flutuante, não deste arquivo.
 *
 * Foi mantido assim de propósito: trocar a regra de arredondamento mudaria
 * valores que hoje saem numa nota fiscal e num lançamento de caixa, e isso
 * é decisão dela, não efeito colateral de uma arrumação de código. Na
 * prática nenhum centavo se perde, porque quem divide valor (parcela,
 * rateio de pagamento) faz a última linha absorver a diferença — ver
 * `calcularListaParcelas` e `ratearPagamentos`, em `faturamento.ts`. O teste
 * `dinheiro.test.ts` fixa esse comportamento, pra que mudá-lo seja uma
 * escolha visível e não uma surpresa.
 */

/** Valor em reais → centavos inteiros. */
export function paraCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Centavos inteiros → valor em reais. */
export function deCentavos(centavos: number): number {
  return centavos / 100;
}

/**
 * Arredonda pro centavo. É o jeito padrão de fechar qualquer conta de
 * dinheiro do sistema antes de mostrar na tela ou gravar no banco.
 */
export function arredondarCentavo(valor: number): number {
  return deCentavos(paraCentavos(valor));
}

/**
 * Soma valores em dinheiro e fecha no centavo.
 *
 * Use isto em vez de `.reduce((a, b) => a + b, 0)` sempre que o resultado da
 * soma for gravado ou comparado: somar em ponto flutuante deixa cauda mesmo
 * quando cada pedaço já está arredondado.
 */
export function somar(valores: readonly number[]): number {
  return arredondarCentavo(valores.reduce((soma, valor) => soma + valor, 0));
}

/**
 * Valor em reais como a tela mostra: "R$ 1.234,56".
 *
 * Estava copiado, idêntico, em mais de dez arquivos de tela — a mesma
 * duplicação que motivou este arquivo, só que de formatação e não de conta.
 * Quem precisa de um valor formatado importa daqui; as telas que ainda têm a
 * cópia antiga vão trocando conforme forem mexidas.
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Percentual com uma casa, do jeito brasileiro: 42,2%. */
export function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/**
 * Reparte um total entre N pedaços, em centavos inteiros, de modo que a soma
 * feche **exatamente** e nenhum pedaço fique negativo.
 *
 * Por que existe (item TR-06.1 do guia). As duas funções que repartiam valor
 * — `calcularListaParcelas` e `ratearPagamentos` — faziam a mesma coisa do
 * mesmo jeito: arredondavam cada pedaço e jogavam TODA a sobra na última
 * linha. Isso fecha a soma, mas o erro de arredondamento de N−1 pedaços se
 * acumula num só, e os testes de propriedade acharam os dois efeitos disso:
 *
 * - **última linha negativa** — R$ 0,03 em 5x deixava a última em −R$ 0,01, e
 *   no rateio da nota fiscal uma OS quase toda de serviço com o pagamento
 *   dividido em várias formas fazia a parte de peça ficar negativa. Valor
 *   negativo é rejeição na hora de emitir (é a família dos itens 31 e 32 da
 *   seção 6 do PROJETO_STATUS).
 * - **centavos espalhados** — R$ 1,14 em 12x saía com onze parcelas de
 *   R$ 0,10 e uma de R$ 0,04, seis centavos fora das outras.
 *
 * Aqui a sobra é distribuída **um centavo por pedaço** (maior resto primeiro),
 * então a diferença entre dois pedaços nunca passa de um centavo.
 *
 * **A ordem foi escolhida pra não mudar nada do que já aparecia na tela**: no
 * empate, o centavo vai pro pedaço mais à direita. É o que mantém R$ 100 em
 * 3x saindo como 33,33 / 33,33 / 33,34 — do jeito que a maquininha mostra, e
 * do jeito que os testes de exemplo já fixavam antes desta função existir.
 *
 * @param total  Valor a repartir (em reais).
 * @param pesos  Peso de cada pedaço. Pesos iguais = divisão igual.
 */
export function repartirEmCentavos(total: number, pesos: readonly number[]): number[] {
  if (pesos.length === 0) return [];

  const totalCentavos = paraCentavos(total);
  const somaPesos = pesos.reduce((soma, peso) => soma + peso, 0);

  // Sem peso nenhum (tudo zero) não há proporção pra respeitar: reparte em
  // partes iguais, que é o que "dividir sem critério" deve significar.
  const fracoes = pesos.map((peso) =>
    somaPesos > 0 ? (totalCentavos * peso) / somaPesos : totalCentavos / pesos.length,
  );

  const base = fracoes.map(Math.floor);
  const sobra = totalCentavos - base.reduce((soma, c) => soma + c, 0);

  // Quem tem o maior resto leva o centavo que sobrou; no empate, o de índice
  // maior (ver o comentário sobre a ordem, acima).
  const ordem = fracoes
    .map((fracao, indice) => ({ indice, resto: fracao - Math.floor(fracao) }))
    .sort((a, b) => b.resto - a.resto || b.indice - a.indice);

  for (let i = 0; i < sobra; i++) base[ordem[i % ordem.length].indice] += 1;

  return base.map(deCentavos);
}

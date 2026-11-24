/**
 * A matemática dos gráficos de Relações (#1086): onde cada valor cai na tela.
 * Nada de dinheiro aqui (as contas moram em `src/schemas/`); só posição.
 *
 * **Linha só reta ou em degrau** (decidido em 17/11): a curva suave de antes
 * inventava dias que não existiam (a curva passava por cima e por baixo dos
 * pontos de verdade). Os caminhos daqui usam só os comandos M, L, H e V do
 * SVG, e o `temCurva` deixa os testes provarem isso em qualquer desenho.
 */

export type Ponto = { readonly x: number; readonly y: number };

/**
 * Leva um valor do domínio (os números) pra faixa (os pixels). A faixa pode vir
 * invertida (`[altura, 0]`), que é o caso do eixo y: no SVG ele cresce pra baixo.
 * Domínio de um ponto só não divide por zero: tudo cai no meio da faixa.
 */
export function escalaLinear(
  dominio: readonly [number, number],
  faixa: readonly [number, number],
): (valor: number) => number {
  const [d0, d1] = dominio;
  const [f0, f1] = faixa;
  if (d1 === d0) return () => (f0 + f1) / 2;
  return (valor) => f0 + ((valor - d0) / (d1 - d0)) * (f1 - f0);
}

/** Tira o ruído de vírgula flutuante (0,1 + 0,2 = 0,30000000000000004). */
function limpar(n: number): number {
  const limpo = Number(n.toFixed(10));
  return limpo === 0 ? 0 : limpo; // e o -0 vira 0
}

/**
 * As marcas do eixo: valores redondos (1, 2, 2,5 ou 5 vezes uma potência de 10),
 * cobrindo de `min` a `max`, perto de `quantas` marcas. Como todas são múltiplas
 * do mesmo passo, **o zero sempre aparece quando o domínio cruza o zero** (a
 * linha do zero é a base de toda barra e coluna). O gráfico usa a primeira e a
 * última marca como domínio, pra o eixo terminar num número redondo.
 */
export function marcasDoEixo(min: number, max: number, quantas = 5): number[] {
  let baixo = Math.min(min, max);
  let alto = Math.max(min, max);
  if (!Number.isFinite(baixo) || !Number.isFinite(alto)) return [0, 1];
  if (baixo === alto) {
    // Um valor só: o eixo vai do zero até ele (ou dele até o zero). Tudo zero
    // (período sem venda): de 0 a 1, pra ainda ter um eixo.
    if (alto === 0) return [0, 1];
    baixo = Math.min(0, baixo);
    alto = Math.max(0, alto);
  }
  const intervalos = Math.max(1, quantas - 1);
  const passoBruto = (alto - baixo) / intervalos;
  const potencia = 10 ** Math.floor(Math.log10(passoBruto));
  const normal = passoBruto / potencia;
  const fator = normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 2.5 ? 2.5 : normal <= 5 ? 5 : 10;
  const passo = fator * potencia;
  const primeiro = Math.floor(limpar(baixo / passo));
  const ultimo = Math.ceil(limpar(alto / passo));
  const marcas: number[] = [];
  for (let k = primeiro; k <= ultimo; k++) marcas.push(limpar(k * passo));
  return marcas;
}

/** Um número curto pro caminho: uma casa depois da vírgula basta (é pixel). */
function n(valor: number): string {
  return String(limpar(Math.round(valor * 10) / 10));
}

/** Liga os pontos com retas (M e L): a linha do mês somando dia a dia. */
export function caminhoReto(pontos: readonly Ponto[]): string {
  return pontos.map((p, i) => `${i === 0 ? "M" : "L"}${n(p.x)} ${n(p.y)}`).join(" ");
}

/**
 * Em degraus (H e V): o valor fica igual até o próximo ponto, e ali sobe ou
 * desce de uma vez. É o saldo do caixa: ele não muda "aos poucos" entre um dia
 * e outro. Pra o último degrau ter largura, quem chama põe um ponto a mais no
 * fim (o fim do último dia, com o mesmo valor).
 */
export function caminhoEmDegraus(pontos: readonly Ponto[]): string {
  if (pontos.length === 0) return "";
  const [primeiro, ...resto] = pontos;
  return [`M${n(primeiro.x)} ${n(primeiro.y)}`, ...resto.map((p) => `H${n(p.x)} V${n(p.y)}`)].join(" ");
}

/** Se o caminho tem algum comando de curva (C, S, Q, T ou arco A). Usado nos testes. */
export function temCurva(caminho: string): boolean {
  return /[CcSsQqTtAa]/.test(caminho);
}

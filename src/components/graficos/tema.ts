/**
 * As cores e medidas comuns dos gráficos de Relações (#1086). Regras de cor:
 * docs/referencia/visual-novo/README.md. As cores vão por variável do tema
 * (`var(--…)`), nunca por valor: o mesmo desenho serve pro tema escuro e o claro.
 *
 * Laranja = o destaque (1 por gráfico); cinza = o resto; vermelho só pra
 * prejuízo ou falta, e sempre com "−" e ▼ junto (a cor sozinha não avisa).
 */
export const COR = {
  /** O destaque (1 por gráfico): o hoje, o "Sobrou", o grupo A, o saldo. */
  destaque: "var(--color-acao)",
  /** Texto em laranja: no tema claro é a versão escura, que se lê no branco. */
  destaqueTexto: "var(--text-color-acao-clara)",
  /** O resto, em cinza. */
  neutro: "var(--grafico-comparacao)",
  neutroForte: "var(--color-texto-2)",
  texto: "var(--color-texto)",
  texto2: "var(--color-texto-2)",
  grade: "var(--color-linha)",
  eixo: "var(--color-linha-forte)",
  perigo: "var(--color-perigo)",
  atencao: "var(--color-atencao)",
  foco: "var(--color-foco)",
  fundo: "var(--color-cartao)",
} as const;

/** Distância entre o rótulo e a marca (regra "nada encosta"). */
export const VAO_DO_ROTULO = 4;

/** Um valor com o sinal de menos tipográfico ("−", não o hífen) quando negativo. */
export function comSinal(valor: number, formatar: (v: number) => string): string {
  return valor < 0 ? `− ${formatar(Math.abs(valor))}` : formatar(valor);
}

/** A largura aproximada de um texto pequeno (12 a 13 px), pra reservar o espaço dele. */
export function larguraDoTexto(texto: string): number {
  return Math.ceil(texto.length * 7);
}

/**
 * Quebra um rótulo em até `maxLinhas` linhas de até `porLinha` letras, pelas
 * palavras; o que não cabe termina em "…" (o texto inteiro está na dica).
 */
export function quebrarEmLinhas(texto: string, porLinha: number, maxLinhas = 2): string[] {
  const limite = Math.max(3, Math.floor(porLinha));
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const junto = atual ? `${atual} ${palavra}` : palavra;
    if (junto.length <= limite || !atual) {
      atual = junto;
    } else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  const cortadas = linhas.slice(0, maxLinhas).map((l) => (l.length > limite ? `${l.slice(0, limite - 1)}…` : l));
  if (linhas.length > maxLinhas) {
    const ultima = cortadas[maxLinhas - 1];
    cortadas[maxLinhas - 1] = ultima.length >= limite ? `${ultima.slice(0, limite - 1)}…` : `${ultima}…`;
  }
  return cortadas;
}

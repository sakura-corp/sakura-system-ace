/**
 * Curva suave que **não passa** dos pontos (monotônica, Fritsch–Carlson): uma
 * curva comum faz "barriga" entre um dia zerado e outro, e desenha um
 * prejuízo que não existiu.
 */
export function caminhoSuave(pontos: readonly (readonly [number, number])[]): string {
  const n = pontos.length;
  if (n === 0) return "";
  if (n === 1) return `M${pontos[0][0]} ${pontos[0][1]}`;
  const dx: number[] = [];
  const inclinacao: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pontos[i + 1][0] - pontos[i][0]);
    inclinacao.push((pontos[i + 1][1] - pontos[i][1]) / dx[i]);
  }
  const tangente: number[] = [inclinacao[0]];
  for (let i = 1; i < n - 1; i++) {
    tangente.push(inclinacao[i - 1] * inclinacao[i] <= 0 ? 0 : (inclinacao[i - 1] + inclinacao[i]) / 2);
  }
  tangente.push(inclinacao[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (inclinacao[i] === 0) {
      tangente[i] = 0;
      tangente[i + 1] = 0;
      continue;
    }
    const a = tangente[i] / inclinacao[i];
    const b = tangente[i + 1] / inclinacao[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangente[i] = t * a * inclinacao[i];
      tangente[i + 1] = t * b * inclinacao[i];
    }
  }
  let d = `M${pontos[0][0]} ${pontos[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pontos[i];
    const [x1, y1] = pontos[i + 1];
    const terco = dx[i] / 3;
    d += ` C${x0 + terco} ${y0 + tangente[i] * terco} ${x1 - terco} ${y1 - tangente[i + 1] * terco} ${x1} ${y1}`;
  }
  return d;
}

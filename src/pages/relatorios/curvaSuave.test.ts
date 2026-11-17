import { describe, expect, it } from "vitest";
import { caminhoSuave } from "./curvaSuave";

/** Os pontos de controle de cada trecho "C x1 y1 x2 y2 x y" do caminho. */
function controles(d: string): number[][] {
  return [...d.matchAll(/C([^C]+)/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
}

describe("caminhoSuave", () => {
  it("passa por todos os pontos", () => {
    const pontos = [[0, 100], [10, 40], [20, 100], [30, 70]] as const;
    const d = caminhoSuave(pontos);
    expect(d.startsWith("M0 100")).toBe(true);
    expect(controles(d).map((c) => [c[4], c[5]])).toEqual([[10, 40], [20, 100], [30, 70]]);
  });

  it("não faz barriga: entre dois dias iguais (zerados) a curva fica reta, sem inventar prejuízo", () => {
    // y = 100 é o zero do gráfico; os dias 2 e 3 não tiveram venda.
    const d = caminhoSuave([[0, 40], [10, 100], [20, 100], [30, 30]]);
    const [, meio] = controles(d);
    expect(meio[1]).toBe(100);
    expect(meio[3]).toBe(100);
  });

  it("nenhum ponto de controle passa do maior nem do menor ponto (curva monotônica)", () => {
    const pontos = [[0, 90], [10, 10], [20, 95], [30, 0], [40, 100], [50, 50]] as const;
    const ys = controles(caminhoSuave(pontos)).flatMap((c) => [c[1], c[3]]);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });
});

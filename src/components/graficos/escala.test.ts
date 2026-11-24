// A matemática dos gráficos de Relações (#1086): escala, marcas do eixo e os
// caminhos. Nada de dinheiro aqui; é só onde cada coisa cai na tela.
import { describe, expect, it } from "vitest";
import { caminhoEmDegraus, caminhoReto, escalaLinear, marcasDoEixo, temCurva } from "./escala";

describe("escalaLinear", () => {
  it("leva o domínio pra faixa, inclusive invertida (o y do SVG cresce pra baixo)", () => {
    const y = escalaLinear([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(100)).toBe(0);
    expect(y(25)).toBe(150);
  });

  it("domínio de um ponto só não divide por zero: cai no meio da faixa", () => {
    const x = escalaLinear([5, 5], [0, 100]);
    expect(x(5)).toBe(50);
  });
});

describe("marcasDoEixo", () => {
  it("dá valores redondos, cobrindo o domínio", () => {
    expect(marcasDoEixo(0, 2600, 4)).toEqual([0, 1000, 2000, 3000]);
    expect(marcasDoEixo(0, 95, 5)).toEqual([0, 25, 50, 75, 100]);
  });

  it("sempre inclui o zero quando o domínio cruza o zero", () => {
    const marcas = marcasDoEixo(-1230, 4870, 5);
    expect(marcas).toContain(0);
    expect(marcas[0]).toBeLessThanOrEqual(-1230);
    expect(marcas[marcas.length - 1]).toBeGreaterThanOrEqual(4870);
  });

  it("sem erro de vírgula flutuante (0,1 + 0,2)", () => {
    expect(marcasDoEixo(0, 0.3, 4)).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it("tudo zero (período sem venda) ainda dá um eixo", () => {
    expect(marcasDoEixo(0, 0, 4)).toEqual([0, 1]);
  });
});

describe("caminhos: só retas, nenhuma curva", () => {
  const pontos = [
    { x: 0, y: 10 },
    { x: 10.25, y: 5 },
    { x: 20, y: 7.5 },
  ];

  it("caminhoReto liga ponto a ponto com M e L", () => {
    expect(caminhoReto(pontos)).toBe("M0 10 L10.3 5 L20 7.5");
    expect(temCurva(caminhoReto(pontos))).toBe(false);
  });

  it("caminhoEmDegraus anda na horizontal e depois sobe ou desce (H e V)", () => {
    expect(caminhoEmDegraus(pontos)).toBe("M0 10 H10.3 V5 H20 V7.5");
    expect(temCurva(caminhoEmDegraus(pontos))).toBe(false);
  });

  it("sem pontos, caminho vazio", () => {
    expect(caminhoReto([])).toBe("");
    expect(caminhoEmDegraus([])).toBe("");
  });

  it("temCurva acha C, Q, S, T e A (o que o caminhoSuave de antes usava)", () => {
    expect(temCurva("M0 0 C1 1 2 2 3 3")).toBe(true);
    expect(temCurva("M0 0 q1 1 2 2")).toBe(true);
    expect(temCurva("M0 0 A5 5 0 0 1 10 10")).toBe(true);
    expect(temCurva("M0 0 L1 1 H3 V4 Z")).toBe(false);
  });
});

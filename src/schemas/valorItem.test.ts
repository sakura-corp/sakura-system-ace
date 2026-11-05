import { describe, expect, it } from "vitest";
import {
  somarValoresLiquidos,
  totalDoPedidoCompra,
  valorDaPecaEmEstoque,
  valorDoEstoque,
  valorLiquidoDoItem,
} from "./valorItem";

describe("valorLiquidoDoItem", () => {
  it("sem desconto: quantidade × preço", () => {
    expect(valorLiquidoDoItem({ quantidade: 4, preco_unitario: 250, desconto: 0 })).toBe(1000);
  });

  it("com desconto: tira o desconto da linha inteira", () => {
    expect(valorLiquidoDoItem({ quantidade: 2, preco_unitario: 100, desconto: 15 })).toBe(185);
  });

  it("quantidade quebrada: não arredonda (quem grava ou manda pra nota arredonda)", () => {
    // 1,5 × 33,33 = 49,995. Fica com a cauda, igual à conta que estava
    // espalhada pelas telas; a nota fiscal arredonda por cima (focusNfe).
    expect(valorLiquidoDoItem({ quantidade: 1.5, preco_unitario: 33.33, desconto: 0 })).toBe(
      1.5 * 33.33,
    );
    expect(valorLiquidoDoItem({ quantidade: 0.5, preco_unitario: 9.9, desconto: 1 })).toBe(
      0.5 * 9.9 - 1,
    );
  });
});

describe("somarValoresLiquidos", () => {
  it("lista vazia dá zero", () => {
    expect(somarValoresLiquidos([])).toBe(0);
  });

  it("soma as linhas com desconto", () => {
    expect(
      somarValoresLiquidos([
        { quantidade: 2, preco_unitario: 100, desconto: 15 },
        { quantidade: 1, preco_unitario: 50, desconto: 0 },
      ]),
    ).toBe(235);
  });

  it("dá EXATAMENTE o número da conta antiga, bit a bit (é só mudança de lugar)", () => {
    // A conta antiga, copiada de src/types/os.ts e de comissoes.ts. A ordem
    // das operações importa no ponto flutuante: (total + q×p) − d.
    const antiga = (itens: { quantidade: number; preco_unitario: number; desconto: number }[]) =>
      itens.reduce(
        (total, item) => total + item.quantidade * item.preco_unitario - item.desconto,
        0,
      );
    let semente = 7;
    const sorteio = () => {
      semente = (semente * 16807) % 2147483647;
      return semente / 2147483647;
    };
    for (let rodada = 0; rodada < 500; rodada++) {
      const itens = Array.from({ length: 1 + Math.floor(sorteio() * 6) }, () => ({
        quantidade: Math.round(sorteio() * 400) / 100,
        preco_unitario: Math.round(sorteio() * 100000) / 100,
        desconto: Math.round(sorteio() * 2000) / 100,
      }));
      expect(somarValoresLiquidos(itens)).toBe(antiga(itens));
    }
  });

  it("um item só dá o mesmo que valorLiquidoDoItem", () => {
    const item = { quantidade: 1.5, preco_unitario: 33.33, desconto: 0.07 };
    expect(somarValoresLiquidos([item])).toBe(valorLiquidoDoItem(item));
  });
});

describe("totalDoPedidoCompra", () => {
  it("soma quantidade pedida × preço; preço vazio conta zero", () => {
    expect(
      totalDoPedidoCompra([
        { quantidade_pedida: 3, preco_unitario: 10.5 },
        { quantidade_pedida: 2, preco_unitario: null },
        { quantidade_pedida: 1, preco_unitario: 4 },
      ]),
    ).toBe(35.5);
  });

  it("lista vazia dá zero", () => {
    expect(totalDoPedidoCompra([])).toBe(0);
  });
});

describe("valorDoEstoque", () => {
  const pecas = [
    { id: "a", preco_custo: 10 },
    { id: "b", preco_custo: null },
    { id: "c", preco_custo: 2.5 },
    { id: "d", preco_custo: 7 },
  ];

  it("saldo × preço de custo; sem custo ou sem saldo conta zero", () => {
    const saldos = new Map([
      ["a", 3],
      ["b", 5],
      ["c", 4],
    ]);
    expect(valorDoEstoque(pecas, saldos)).toBe(40);
  });

  it("saldo negativo entra negativo (igual à tela de hoje)", () => {
    expect(valorDoEstoque([{ id: "a", preco_custo: 10 }], new Map([["a", -2]]))).toBe(-20);
  });
});

describe("valorDaPecaEmEstoque", () => {
  it("saldo × preço de custo; sem custo conta zero", () => {
    expect(valorDaPecaEmEstoque(4, 2.5)).toBe(10);
    expect(valorDaPecaEmEstoque(4, null)).toBe(0);
    expect(valorDaPecaEmEstoque(-1, 3)).toBe(-3);
  });
});

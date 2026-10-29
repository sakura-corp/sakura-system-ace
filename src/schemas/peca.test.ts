import { describe, expect, it } from "vitest";
import { margemAPartirDoPreco, precoAPartirDaMargem } from "./peca";

// #835: a margem é SOBRE A VENDA — (venda − custo) / venda —, que é o que
// "margem" quer dizer pro dono de loja e pro contador. Sobre o custo seria
// "markup", e o programa não usa esse número.

describe("precoAPartirDaMargem", () => {
  it("calcula o preço final a partir do custo e da margem sobre a venda", () => {
    // custo 100, margem 20% -> preço 125 (dos 125, 25 = 20% é lucro)
    expect(precoAPartirDaMargem("100", "20")).toBe("125");
  });

  it("arredonda o preço pra 2 casas decimais", () => {
    // custo 33.33, margem 15% -> 39.2117... -> arredonda pra 39.21
    expect(precoAPartirDaMargem("33.33", "15")).toBe("39.21");
  });

  it("devolve null se o custo estiver vazio", () => {
    expect(precoAPartirDaMargem("", "20")).toBeNull();
  });

  it("devolve null se a margem não for um número válido", () => {
    expect(precoAPartirDaMargem("100", "")).toBeNull();
    expect(precoAPartirDaMargem("100", "abc")).toBeNull();
  });

  it("devolve null com margem de 100% ou mais (não existe preço que dê isso)", () => {
    expect(precoAPartirDaMargem("100", "100")).toBeNull();
    expect(precoAPartirDaMargem("100", "150")).toBeNull();
  });

  it("aceita margem negativa (venda abaixo do custo, caso raro mas válido)", () => {
    // custo 100, margem −25% -> preço 80 (perde 20, que é 25% de 80)
    expect(precoAPartirDaMargem("100", "-25")).toBe("80");
  });
});

describe("margemAPartirDoPreco", () => {
  it("calcula a margem sobre a venda: custo 245, venda 389,90 -> 37,2% (não 59%)", () => {
    expect(margemAPartirDoPreco("245", "389.90")).toBe("37.2");
  });

  it("custo 100, preço 125 -> 20% de margem", () => {
    expect(margemAPartirDoPreco("100", "125")).toBe("20");
  });

  it("arredonda pra 1 casa decimal", () => {
    // (45 − 30) / 45 = 33,33...%
    expect(margemAPartirDoPreco("30", "45")).toBe("33.3");
  });

  it("devolve string vazia se o custo for zero ou negativo (custo não cadastrado)", () => {
    expect(margemAPartirDoPreco("0", "120")).toBe("");
    expect(margemAPartirDoPreco("-10", "120")).toBe("");
  });

  it("devolve string vazia se o preço for zero ou negativo (não dá pra calcular %)", () => {
    expect(margemAPartirDoPreco("100", "0")).toBe("");
    expect(margemAPartirDoPreco("100", "-5")).toBe("");
  });

  it("devolve string vazia se custo ou preço estiverem vazios", () => {
    expect(margemAPartirDoPreco("", "120")).toBe("");
    expect(margemAPartirDoPreco("100", "")).toBe("");
  });

  it("ida e volta bate: preço calculado da margem, e a margem calculada desse preço, é a mesma", () => {
    const preco = precoAPartirDaMargem("80", "25");
    expect(preco).not.toBeNull();
    expect(margemAPartirDoPreco("80", preco as string)).toBe("25");
  });
});

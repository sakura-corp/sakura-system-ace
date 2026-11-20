import { describe, expect, it } from "vitest";
import {
  agruparPorCategoria,
  caixaFormSchema,
  caixaFormVazio,
  movimentosManuais,
  movimentosSemCategoria,
  paraNovoMovimentoCaixa,
  resumirSemCategoria,
  totaisPorCategoria,
} from "./caixa";
import type { MovimentoCaixa, TipoCaixa } from "@/types/caixa";

function movimento(parcial: Partial<MovimentoCaixa> & { id: string }): MovimentoCaixa {
  return {
    loja_id: "loja-1",
    data: "2026-09-01T12:00:00Z",
    ordem_servico_id: null,
    tipo: "saida" as TipoCaixa,
    forma_pagamento: "dinheiro",
    valor: 100,
    descricao: null,
    categoria_id: null,
    ...parcial,
  };
}

describe("categoria obrigatória no lançamento manual", () => {
  const valores = { ...caixaFormVazio("saida"), valor: "50" };

  it("recusa o formulário sem categoria", () => {
    const resultado = caixaFormSchema.safeParse(valores);

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe("Escolha uma categoria.");
    }
  });

  it("aceita com categoria escolhida", () => {
    const resultado = caixaFormSchema.safeParse({ ...valores, categoria_id: "cat-1" });
    expect(resultado.success).toBe(true);
  });

  it("continua exigindo valor maior que zero", () => {
    const resultado = caixaFormSchema.safeParse({
      ...valores,
      categoria_id: "cat-1",
      valor: "0",
    });
    expect(resultado.success).toBe(false);
  });

  it("leva a categoria escolhida pro movimento gravado", () => {
    const novo = paraNovoMovimentoCaixa({ ...valores, categoria_id: "cat-1" });
    expect(novo.categoria_id).toBe("cat-1");
    expect(novo.ordem_servico_id).toBeNull();
  });
});

describe("o recorte de lançamento manual", () => {
  const movimentos = [
    movimento({ id: "a", tipo: "saida" }),
    movimento({ id: "b", tipo: "entrada" }),
    // Faturamento de OS: entra no caixa sem categoria e deve ficar assim.
    movimento({ id: "c", tipo: "entrada", ordem_servico_id: "os-1" }),
  ];

  it("deixa de fora o que nasceu de uma OS faturada", () => {
    expect(movimentosManuais(movimentos, "entrada").map((m) => m.id)).toEqual(["b"]);
  });

  it("separa por tipo", () => {
    expect(movimentosManuais(movimentos, "saida").map((m) => m.id)).toEqual(["a"]);
  });

  it("nunca oferece uma OS faturada pra categorizar", () => {
    // Se a OS entrasse aqui, o conserto do histórico convidaria a classificar
    // venda como se fosse despesa avulsa.
    expect(movimentosSemCategoria(movimentos, "entrada").map((m) => m.id)).toEqual(["b"]);
  });
});

describe("o histórico sem categoria", () => {
  const movimentos = [
    movimento({ id: "a", valor: 31000 }),
    movimento({ id: "b", valor: 500, categoria_id: "cat-aluguel" }),
    movimento({ id: "c", valor: 0.1 }),
    movimento({ id: "d", valor: 0.2 }),
    movimento({ id: "e", valor: 90, tipo: "entrada" }),
  ];

  it("conta e soma só o que está sem categoria, daquele tipo", () => {
    expect(resumirSemCategoria(movimentos, "saida")).toEqual({
      quantidade: 3,
      total: 31000.3,
    });
  });

  it("soma sem deixar cauda de ponto flutuante", () => {
    // 0.1 + 0.2 dá 0.30000000000000004 num reduce solto — é o defeito que a
    // migration 0048 e o schemas/dinheiro.ts existem pra fechar.
    const { total } = resumirSemCategoria([movimento({ id: "c", valor: 0.1 }), movimento({ id: "d", valor: 0.2 })], "saida");
    expect(total).toBe(0.3);
  });

  it("devolve zero quando não há nada a consertar", () => {
    expect(resumirSemCategoria([movimento({ id: "b", categoria_id: "cat-1" })], "saida")).toEqual({
      quantidade: 0,
      total: 0,
    });
  });
});

describe("agrupar as escolhas antes de gravar", () => {
  it("junta os lançamentos que receberam a mesma categoria", () => {
    const grupos = agruparPorCategoria({ a: "cat-1", b: "cat-2", c: "cat-1" });

    expect(grupos).toHaveLength(2);
    expect(grupos.find((g) => g.categoriaId === "cat-1")?.ids).toEqual(["a", "c"]);
    expect(grupos.find((g) => g.categoriaId === "cat-2")?.ids).toEqual(["b"]);
  });

  it("ignora a linha deixada em branco", () => {
    // Quem não soube classificar agora classifica depois — nada é gravado
    // por acidente.
    expect(agruparPorCategoria({ a: "", b: "cat-1" })).toEqual([
      { categoriaId: "cat-1", ids: ["b"] },
    ]);
  });

  it("não grava nada quando ninguém escolheu", () => {
    expect(agruparPorCategoria({ a: "", b: "" })).toEqual([]);
  });
});

describe("totaisPorCategoria (Caixa → Entradas/Saídas, #875)", () => {
  it("soma por nome de categoria, do maior pro menor; sem categoria tem rótulo próprio", () => {
    const movimentos = [
      movimento({ id: "1", valor: 30, categoria: { nome: "Aluguel" } }),
      movimento({ id: "2", valor: 20.1, categoria: null }),
      movimento({ id: "3", valor: 100, categoria: { nome: "Luz" } }),
      movimento({ id: "4", valor: 40, categoria: { nome: "Aluguel" } }),
    ];
    expect(totaisPorCategoria(movimentos)).toEqual([
      ["Luz", 100],
      ["Aluguel", 70],
      ["Sem categoria", 20.1],
    ]);
  });

  it("nada lançado dá lista vazia", () => {
    expect(totaisPorCategoria([])).toEqual([]);
  });
});

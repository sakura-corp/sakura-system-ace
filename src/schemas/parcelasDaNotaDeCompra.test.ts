import { describe, expect, it } from "vitest";
import {
  conferirParcelas,
  contasPagarDaNota,
  descricaoDaParcela,
  motivoParaNaoLancarParcelas,
  sugerirParcelas,
  totalDaNota,
} from "./parcelasDaNotaDeCompra";

// #1020: a nota de compra importada pelo XML já sai com as contas a pagar.
// Dados fictícios.
const item = (quantidade: number, preco_unitario: number) => ({ quantidade, preco_unitario });

describe("totalDaNota", () => {
  it("usa o total da nota (vNF) quando ele existe", () => {
    expect(totalDaNota({ valor_total: 1050.4, itens: [item(4, 250)] })).toBe(1050.4);
  });

  it("sem vNF, soma quantidade × preço dos itens, fechando no centavo", () => {
    expect(totalDaNota({ valor_total: null, itens: [item(3, 0.1), item(2, 10.005)] })).toBe(20.31);
  });
});

describe("sugerirParcelas", () => {
  it("3 duplicatas viram 3 parcelas com os valores e vencimentos da nota", () => {
    const parcelas = sugerirParcelas({
      valor_total: 1000,
      itens: [item(4, 250)],
      duplicatas: [
        { numero: "001", vencimento: "2026-12-01", valor: 333.34 },
        { numero: "002", vencimento: "2026-12-31", valor: 333.33 },
        { numero: "003", vencimento: "2027-01-30", valor: 333.33 },
      ],
    });
    expect(parcelas).toEqual([
      { numero: "001", vencimento: "2026-12-01", valor: 333.34 },
      { numero: "002", vencimento: "2026-12-31", valor: 333.33 },
      { numero: "003", vencimento: "2027-01-30", valor: 333.33 },
    ]);
  });

  it("duplicata sem vencimento legível vira parcela com o vencimento em branco", () => {
    const parcelas = sugerirParcelas({
      valor_total: 100,
      itens: [],
      duplicatas: [{ numero: "1", vencimento: null, valor: 100 }],
    });
    expect(parcelas).toEqual([{ numero: "1", vencimento: "", valor: 100 }]);
  });

  it("nota sem duplicata vira 1 parcela com o total e o vencimento em branco", () => {
    const parcelas = sugerirParcelas({ valor_total: 1000, itens: [item(4, 250)], duplicatas: [] });
    expect(parcelas).toEqual([{ numero: null, vencimento: "", valor: 1000 }]);
  });

  it("nota sem duplicata e sem vNF usa a soma dos itens", () => {
    const parcelas = sugerirParcelas({ valor_total: null, itens: [item(2, 150.5)], duplicatas: [] });
    expect(parcelas).toEqual([{ numero: null, vencimento: "", valor: 301 }]);
  });
});

describe("conferirParcelas", () => {
  it("soma que bate com o total, mesmo com a cauda do ponto flutuante", () => {
    const conferencia = conferirParcelas(
      [
        { numero: null, vencimento: "2026-12-01", valor: 0.1 },
        { numero: null, vencimento: "2026-12-31", valor: 0.2 },
      ],
      0.3,
    );
    expect(conferencia).toEqual({ soma: 0.3, total: 0.3, diferenca: 0, bate: true });
  });

  it("soma diferente do total diz a diferença (parcelas a menos é negativo)", () => {
    const conferencia = conferirParcelas(
      [
        { numero: null, vencimento: "2026-12-01", valor: 333.34 },
        { numero: null, vencimento: "2026-12-31", valor: 333.33 },
      ],
      1000,
    );
    expect(conferencia).toEqual({ soma: 666.67, total: 1000, diferenca: -333.33, bate: false });
  });
});

describe("motivoParaNaoLancarParcelas", () => {
  it("tudo preenchido: nenhum motivo", () => {
    expect(
      motivoParaNaoLancarParcelas([{ numero: null, vencimento: "2026-12-01", valor: 10 }]),
    ).toBeNull();
  });

  it("parcela sem vencimento: diz qual", () => {
    expect(
      motivoParaNaoLancarParcelas([
        { numero: null, vencimento: "2026-12-01", valor: 10 },
        { numero: null, vencimento: "", valor: 10 },
      ]),
    ).toBe("Falta o vencimento da parcela 2.");
  });

  it("vencimento que não é um dia de verdade conta como sem vencimento", () => {
    expect(
      motivoParaNaoLancarParcelas([{ numero: null, vencimento: "2026-02-30", valor: 10 }]),
    ).toBe("Falta o vencimento da parcela 1.");
  });

  it("parcela com valor zero ou negativo: diz qual", () => {
    expect(
      motivoParaNaoLancarParcelas([{ numero: null, vencimento: "2026-12-01", valor: 0 }]),
    ).toBe("A parcela 1 precisa de um valor maior que zero.");
  });

  it("nenhuma parcela: diz que não há o que lançar", () => {
    expect(motivoParaNaoLancarParcelas([])).toBe("Não há nenhuma parcela pra lançar.");
  });
});

describe("descricaoDaParcela", () => {
  it("NF <número> — <fornecedor> (1/3)", () => {
    expect(descricaoDaParcela("1234", "Fornecedor Exemplo LTDA", 0, 3)).toBe(
      "NF 1234 — Fornecedor Exemplo LTDA (1/3)",
    );
  });

  it("parcela única fica (1/1)", () => {
    expect(descricaoDaParcela("1234", "Fornecedor Exemplo LTDA", 0, 1)).toBe(
      "NF 1234 — Fornecedor Exemplo LTDA (1/1)",
    );
  });

  it("nota sem número não escreve 'NF null'", () => {
    expect(descricaoDaParcela(null, "Fornecedor Exemplo LTDA", 1, 2)).toBe(
      "NF sem número — Fornecedor Exemplo LTDA (2/2)",
    );
  });
});

describe("contasPagarDaNota", () => {
  it("monta uma conta a pagar por parcela, com a descrição, a categoria e o vencimento", () => {
    const contas = contasPagarDaNota(
      [
        { numero: "001", vencimento: "2026-12-01", valor: 500 },
        { numero: "002", vencimento: "2026-12-31", valor: 500.004 },
      ],
      { numeroNota: "1234", fornecedorNome: "Fornecedor Exemplo LTDA", categoriaId: "cat-1" },
    );
    expect(contas).toEqual([
      {
        descricao: "NF 1234 — Fornecedor Exemplo LTDA (1/2)",
        valor: 500,
        vencimento: "2026-12-01",
        categoria_id: "cat-1",
        recorrente: false,
        recorrente_ate: null,
      },
      {
        descricao: "NF 1234 — Fornecedor Exemplo LTDA (2/2)",
        valor: 500,
        vencimento: "2026-12-31",
        categoria_id: "cat-1",
        recorrente: false,
        recorrente_ate: null,
      },
    ]);
  });

  it("sem categoria escolhida, fica sem categoria (null, não texto vazio)", () => {
    const [conta] = contasPagarDaNota([{ numero: null, vencimento: "2026-12-01", valor: 10 }], {
      numeroNota: "1",
      fornecedorNome: "F",
      categoriaId: "",
    });
    expect(conta.categoria_id).toBeNull();
  });
});

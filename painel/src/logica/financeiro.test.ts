import { describe, expect, it } from "vitest";
import { centavosDoTexto, formatarCentavos, mesAnterior, mesDe, mesEmSaoPaulo, mesSeguinte, nomeCurtoDoMes, resumoFinanceiro, validarNovoLancamento, type LancamentoParaConta } from "./financeiro";

describe("meses", () => {
  it("mesDe pega o mês do dia, não o dia", () => {
    expect(mesDe("2026-12-31")).toBe("2026-12");
    expect(mesDe("2027-01-01")).toBe("2027-01");
  });
  it("mesSeguinte e mesAnterior viram o ano", () => {
    expect(mesSeguinte("2026-12")).toBe("2027-01");
    expect(mesSeguinte("2026-09")).toBe("2026-10");
    expect(mesAnterior("2027-01")).toBe("2026-12");
    expect(mesAnterior("2026-10")).toBe("2026-09");
  });
  it("mesEmSaoPaulo usa o dia de São Paulo, não o de UTC", () => {
    // 02:30 de 01/11 em UTC ainda é 23:30 de 31/10 em São Paulo
    expect(mesEmSaoPaulo(new Date("2026-11-01T02:30:00Z"))).toBe("2026-10");
    expect(mesEmSaoPaulo(new Date("2026-11-01T03:30:00Z"))).toBe("2026-11");
  });
});

describe("dinheiro em texto", () => {
  it("formatarCentavos escreve em reais com ponto de milhar e vírgula", () => {
    expect(formatarCentavos(123456)).toBe("R$ 1.234,56");
    expect(formatarCentavos(5)).toBe("R$ 0,05");
    expect(formatarCentavos(0)).toBe("R$ 0,00");
    expect(formatarCentavos(100000000)).toBe("R$ 1.000.000,00");
    expect(formatarCentavos(-123456)).toBe("-R$ 1.234,56");
  });
  it("centavosDoTexto lê o que a pessoa digita", () => {
    expect(centavosDoTexto("0,1")).toBe(10);
    expect(centavosDoTexto("1.234,56")).toBe(123456);
    expect(centavosDoTexto("1234,5")).toBe(123450);
    expect(centavosDoTexto("10")).toBe(1000);
    expect(centavosDoTexto(" 0,29 ")).toBe(29);
    expect(centavosDoTexto("R$ 1.000.000,00")).toBe(100000000);
  });
  it("centavosDoTexto recusa o que não é valor", () => {
    expect(centavosDoTexto("abc")).toBeNull();
    expect(centavosDoTexto("-5")).toBeNull();
    expect(centavosDoTexto("1,234")).toBeNull();
    expect(centavosDoTexto("")).toBeNull();
    expect(centavosDoTexto("1.23,00")).toBeNull();
    expect(centavosDoTexto("1,")).toBeNull();
    expect(centavosDoTexto("10.5")).toBeNull();
  });
  it("nomeCurtoDoMes", () => {
    expect(nomeCurtoDoMes("2026-10")).toBe("out/2026");
    expect(nomeCurtoDoMes("2027-01")).toBe("jan/2027");
    expect(nomeCurtoDoMes("2026-12")).toBe("dez/2026");
  });
});

// Lançamentos de mentira: valores e categorias genéricos.
const entrada = (data: string, valorCentavos: number, categoria = "mensalidade de loja"): LancamentoParaConta => ({ data, tipo: "entrada", valorCentavos, categoria });
const saida = (data: string, valorCentavos: number, categoria = "outros"): LancamentoParaConta => ({ data, tipo: "saida", valorCentavos, categoria });

describe("resumoFinanceiro: somas em centavos", () => {
  it("10 + 20 centavos dá 30 exato (em reais 0,1 + 0,2 não dá 0,3)", () => {
    const r = resumoFinanceiro([entrada("2026-10-01", 10), entrada("2026-10-02", 20)], "2026-10");
    expect(r.mesAtual.entrouCentavos).toBe(30);
    expect(r.mesAtual.saldoCentavos).toBe(30);
  });
  it("saldo pode ser negativo", () => {
    const r = resumoFinanceiro([entrada("2026-10-01", 5000), saida("2026-10-03", 12000, "servidor")], "2026-10");
    expect(r.mesAtual).toEqual({ mes: "2026-10", entrouCentavos: 5000, saiuCentavos: 12000, saldoCentavos: -7000, crescimentoPercentual: null });
  });
  it("sem lançamento nenhum: mês atual com zeros", () => {
    const r = resumoFinanceiro([], "2026-10");
    const zero = { mes: "2026-10", entrouCentavos: 0, saiuCentavos: 0, saldoCentavos: 0, crescimentoPercentual: null };
    expect(r).toEqual({ mesAtual: zero, meses: [zero], saidasPorCategoria: [] });
  });
  it("valor inválido que chegar (quebrado, negativo, zero) é ignorado", () => {
    const r = resumoFinanceiro([entrada("2026-10-01", 1000), entrada("2026-10-01", 10.5), entrada("2026-10-01", -300), saida("2026-10-01", 0), saida("2026-10-01", Number.NaN)], "2026-10");
    expect(r.mesAtual.entrouCentavos).toBe(1000);
    expect(r.mesAtual.saiuCentavos).toBe(0);
  });
});

describe("resumoFinanceiro: mês virando e série", () => {
  it("31/12 e 01/01 caem em meses diferentes, e a série atravessa o ano sem buraco", () => {
    const r = resumoFinanceiro([entrada("2026-12-31", 100), entrada("2027-01-01", 200)], "2027-01");
    expect(r.meses.map((m) => [m.mes, m.entrouCentavos])).toEqual([["2026-12", 100], ["2027-01", 200]]);
  });
  it("mês sem lançamento no meio entra com zero", () => {
    const r = resumoFinanceiro([entrada("2026-08-10", 1000), saida("2026-10-05", 300)], "2026-10");
    expect(r.meses).toEqual([
      { mes: "2026-08", entrouCentavos: 1000, saiuCentavos: 0, saldoCentavos: 1000, crescimentoPercentual: null },
      { mes: "2026-09", entrouCentavos: 0, saiuCentavos: 0, saldoCentavos: 0, crescimentoPercentual: -100 },
      { mes: "2026-10", entrouCentavos: 0, saiuCentavos: 300, saldoCentavos: -300, crescimentoPercentual: null },
    ]);
  });
  it("crescimento: null no primeiro mês e depois de mês com 0 de entrada; 1 casa", () => {
    const r = resumoFinanceiro([
      entrada("2026-05-01", 30000), // primeiro: null
      entrada("2026-06-01", 33750), // +12,5%
      entrada("2026-07-01", 45000), // 33750 -> 45000 = +33,333...%
      entrada("2026-08-01", 30000), // 45000 -> 30000 = -33,333...%
      // setembro: 0 de entrada
      entrada("2026-10-01", 500), // depois de mês com 0: null
    ], "2026-10");
    expect(r.meses.map((m) => m.crescimentoPercentual)).toEqual([null, 12.5, 33.3, -33.3, -100, null]);
    expect(r.mesAtual.crescimentoPercentual).toBeNull();
  });
  it("arredonda pra 1 casa e não devolve -0", () => {
    const r = resumoFinanceiro([entrada("2026-09-01", 600), entrada("2026-10-01", 601), entrada("2026-11-01", 600_000), entrada("2026-12-01", 599_999)], "2026-12");
    expect(r.meses.map((m) => m.crescimentoPercentual)).toEqual([null, 0.2, 99733.6, 0]);
    expect(Object.is(r.mesAtual.crescimentoPercentual, -0)).toBe(false);
  });
  it("no máximo 12 meses, terminando no mês atual; o crescimento do 1º mostrado usa o mês de antes", () => {
    const r = resumoFinanceiro([entrada("2025-09-15", 1000), entrada("2025-10-15", 2000), entrada("2026-10-15", 4000)], "2026-10");
    expect(r.meses).toHaveLength(12);
    expect(r.meses[0].mes).toBe("2025-11");
    expect(r.meses[11].mes).toBe("2026-10");
    expect(r.meses[0].crescimentoPercentual).toBe(-100);
    expect(r.meses.every((m) => m.entrouCentavos === 0 || m.mes === "2026-10")).toBe(true);
  });
  it("lançamento depois do mês atual não entra", () => {
    const r = resumoFinanceiro([entrada("2026-10-31", 100), entrada("2026-11-01", 999), saida("2027-02-01", 50)], "2026-10");
    expect(r.meses.map((m) => m.mes)).toEqual(["2026-10"]);
    expect(r.mesAtual.entrouCentavos).toBe(100);
    expect(r.mesAtual.saiuCentavos).toBe(0);
  });
  it("mês atual sem nada, com lançamento antes: zeros no fim da série", () => {
    const r = resumoFinanceiro([entrada("2026-09-01", 100)], "2026-10");
    expect(r.mesAtual).toEqual({ mes: "2026-10", entrouCentavos: 0, saiuCentavos: 0, saldoCentavos: 0, crescimentoPercentual: -100 });
  });
});

describe("resumoFinanceiro: saídas por categoria", () => {
  it("só saídas do mês atual, maior primeiro; empate em ordem alfabética; sem zeros", () => {
    const r = resumoFinanceiro([
      saida("2026-09-30", 99999, "servidor"), // mês anterior: fora
      saida("2026-10-01", 3000, "servidor"),
      saida("2026-10-20", 2000, "servidor"),
      saida("2026-10-02", 5000, "outros"),
      saida("2026-10-03", 5000, "água"),
      saida("2026-10-04", 100, "internet"),
      entrada("2026-10-05", 70000, "mensalidade de loja"), // entrada: fora
      saida("2026-11-01", 80000, "internet"), // depois: fora
    ], "2026-10");
    expect(r.saidasPorCategoria).toEqual([
      { categoria: "água", saiuCentavos: 5000 },
      { categoria: "outros", saiuCentavos: 5000 },
      { categoria: "servidor", saiuCentavos: 5000 },
      { categoria: "internet", saiuCentavos: 100 },
    ]);
  });
});

describe("validarNovoLancamento", () => {
  const bom = { data: "2026-10-20", tipo: "saida", valorCentavos: 4990, categoriaId: 3, descricao: "  conta do servidor  " };
  const erro = (entrada: unknown) => {
    const r = validarNovoLancamento(entrada);
    return r.ok ? null : r.erro;
  };

  it("aceita o bom e apara a descrição", () => {
    expect(validarNovoLancamento(bom)).toEqual({ ok: true, valor: { data: "2026-10-20", tipo: "saida", valorCentavos: 4990, categoriaId: 3, descricao: "conta do servidor" } });
  });
  it("aceita entrada, 29/02 de ano bissexto, descrição vazia ou ausente e o valor máximo", () => {
    expect(validarNovoLancamento({ ...bom, tipo: "entrada", data: "2028-02-29", descricao: "", valorCentavos: 100_000_000_000 }).ok).toBe(true);
    const { descricao: _sem, ...semDescricao } = bom;
    expect(validarNovoLancamento(semDescricao)).toEqual({ ok: true, valor: { data: "2026-10-20", tipo: "saida", valorCentavos: 4990, categoriaId: 3, descricao: "" } });
    expect(validarNovoLancamento({ ...bom, descricao: "x".repeat(200) }).ok).toBe(true);
  });
  it("recusa o que não é objeto", () => {
    expect(erro(null)).toMatch(/dados/i);
    expect(erro("texto")).toMatch(/dados/i);
    expect(erro([bom])).toMatch(/dados/i);
  });
  it("recusa dia que não existe ou fora do formato", () => {
    expect(erro({ ...bom, data: "2026-02-30" })).toMatch(/data/i);
    expect(erro({ ...bom, data: "2026-02-29" })).toMatch(/data/i);
    expect(erro({ ...bom, data: "2026-13-01" })).toMatch(/data/i);
    expect(erro({ ...bom, data: "2026-04-31" })).toMatch(/data/i);
    expect(erro({ ...bom, data: "20/10/2026" })).toMatch(/data/i);
    expect(erro({ ...bom, data: "2026-10-20T10:00:00Z" })).toMatch(/data/i);
    expect(erro({ ...bom, data: undefined })).toMatch(/data/i);
  });
  it("recusa tipo errado", () => {
    expect(erro({ ...bom, tipo: "saída" })).toMatch(/tipo/i);
    expect(erro({ ...bom, tipo: "transferencia" })).toMatch(/tipo/i);
  });
  it("recusa valor 0, quebrado, negativo, texto ou acima do máximo", () => {
    expect(erro({ ...bom, valorCentavos: 0 })).toMatch(/valor/i);
    expect(erro({ ...bom, valorCentavos: 1.5 })).toMatch(/valor/i);
    expect(erro({ ...bom, valorCentavos: -100 })).toMatch(/valor/i);
    expect(erro({ ...bom, valorCentavos: "4990" })).toMatch(/valor/i);
    expect(erro({ ...bom, valorCentavos: Number.NaN })).toMatch(/valor/i);
    expect(erro({ ...bom, valorCentavos: 100_000_000_001 })).toMatch(/valor/i);
  });
  it("recusa categoria que não é inteiro positivo", () => {
    expect(erro({ ...bom, categoriaId: 0 })).toMatch(/categoria/i);
    expect(erro({ ...bom, categoriaId: 2.5 })).toMatch(/categoria/i);
    expect(erro({ ...bom, categoriaId: "3" })).toMatch(/categoria/i);
  });
  it("recusa descrição de 201 caracteres ou que não é texto", () => {
    expect(erro({ ...bom, descricao: "x".repeat(201) })).toMatch(/descri/i);
    expect(erro({ ...bom, descricao: 42 })).toMatch(/descri/i);
  });
});

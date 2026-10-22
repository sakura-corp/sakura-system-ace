import { describe, expect, it } from "vitest";
import {
  acharPecasParecidas,
  MOTIVO_PARECIDA_ROTULO,
  type PecaComparavel,
} from "./pecaParecida";

function peca(p: Partial<PecaComparavel> & { descricao: string }): PecaComparavel {
  return { codigo_interno: null, codigo_barras: null, medida: null, ...p };
}

const pneu = peca({ id: "1", descricao: "Pneu 175/70 R13 Pirelli" });

describe("acharPecasParecidas", () => {
  it("mesmo código de barras é parecido, mesmo com nome bem diferente", () => {
    const nova = peca({ descricao: "Filtro de óleo", codigo_barras: "789123" });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Amortecedor dianteiro", codigo_barras: "789123" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].motivo).toBe("codigo_barras");
    expect(r[0].semelhanca).toBe(1);
  });

  it("mesmo código interno é parecido", () => {
    const nova = peca({ descricao: "Vela", codigo_interno: "VL-10" });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Pastilha de freio", codigo_interno: "VL-10" }),
    ]);
    expect(r[0].motivo).toBe("codigo_interno");
  });

  it("código vazio ou nulo nunca casa", () => {
    const nova = peca({ descricao: "Vela", codigo_interno: "", codigo_barras: null });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Pastilha de freio", codigo_interno: "", codigo_barras: null }),
      peca({ id: "b", descricao: "Cabo", codigo_interno: "  ", codigo_barras: " " }),
    ]);
    expect(r).toEqual([]);
  });

  it("nome com acento, maiúscula e espaçamento diferentes é parecido", () => {
    const r = acharPecasParecidas(peca({ descricao: "PNEU 175/70R13 PIRÉLLI" }), [pneu]);
    expect(r).toHaveLength(1);
    expect(r[0].motivo).toBe("nome");
    expect(r[0].semelhanca).toBeGreaterThanOrEqual(0.8);
  });

  it("acento é ignorado mesmo em nome curto (Lâmpada x LAMPADA)", () => {
    const r = acharPecasParecidas(peca({ descricao: "LAMPADA H4 55W" }), [
      peca({ id: "l", descricao: "Lâmpada H4 55W" }),
    ]);
    expect(r[0]?.motivo).toBe("nome");
    // Igual depois de tirar o acento: tem que dar semelhança total.
    expect(r[0]?.semelhanca).toBe(1);
  });

  it("R13 x R14 NÃO é parecido: a medida conta mais que o resto do nome", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pneu 175/70 R14 Pirelli" }), [pneu]);
    expect(r).toEqual([]);
  });

  it("referência de peça diferente (PSL55 x PSL56) não é parecida", () => {
    const r = acharPecasParecidas(peca({ descricao: "Filtro de óleo PSL56" }), [
      peca({ id: "f", descricao: "Filtro de óleo PSL55" }),
    ]);
    expect(r).toEqual([]);
  });

  it("a ordem das palavras não importa", () => {
    const r = acharPecasParecidas(peca({ descricao: "Pirelli Pneu R13 175/70" }), [pneu]);
    expect(r[0]?.motivo).toBe("nome");
  });

  it("nomes bem diferentes não são parecidos", () => {
    const r = acharPecasParecidas(peca({ descricao: "Amortecedor dianteiro" }), [pneu]);
    expect(r).toEqual([]);
  });

  it("o campo medida entra nos números", () => {
    // Sem medida na descrição: só a medida diferencia.
    const a = peca({ id: "a", descricao: "Pneu Pirelli", medida: "175/70 R13" });
    const nova = peca({ descricao: "Pneu Pirelli", medida: "175/70 R14" });
    expect(acharPecasParecidas(nova, [a])).toEqual([]);
    // E medida repetida na descrição não duplica nem atrapalha.
    const b = peca({ id: "b", descricao: "Pneu 175/70 R13 Pirelli", medida: "175/70 R13" });
    expect(acharPecasParecidas(peca({ descricao: "Pneu 175/70 R13 Pirelli" }), [b])).toHaveLength(1);
  });

  it("ignora a própria peça pelo id", () => {
    const r = acharPecasParecidas(peca({ id: "1", descricao: "Pneu 175/70 R13 Pirelli" }), [pneu]);
    expect(r).toEqual([]);
  });

  it("cada peça aparece uma vez, com o motivo mais forte", () => {
    const nova = peca({
      descricao: "Pneu 175/70 R13 Pirelli",
      codigo_barras: "1",
      codigo_interno: "X",
    });
    const r = acharPecasParecidas(nova, [
      peca({ id: "a", descricao: "Pneu 175/70 R13 Pirelli", codigo_barras: "1", codigo_interno: "X" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].motivo).toBe("codigo_barras");
  });

  it("ordena: motivo mais forte primeiro, e no nome a maior semelhança primeiro", () => {
    const nova = peca({ descricao: "Pneu 175/70 R13 Pirelli", codigo_interno: "X", codigo_barras: "9" });
    const r = acharPecasParecidas(nova, [
      peca({ id: "nome-menos", descricao: "Pneu 175/70 R13 Pirelli Cinturato" }),
      peca({ id: "nome-igual", descricao: "Pneu 175/70 R13 Pirelli" }),
      peca({ id: "interno", descricao: "Outra coisa", codigo_interno: "x" }),
      peca({ id: "barras", descricao: "Qualquer", codigo_barras: "9" }),
    ]);
    expect(r.map((x) => x.peca.id)).toEqual(["barras", "interno", "nome-igual", "nome-menos"]);
    expect(r[2].semelhanca).toBeGreaterThan(r[3].semelhanca);
  });

  it("tem frase curta pra cada motivo", () => {
    expect(MOTIVO_PARECIDA_ROTULO.codigo_barras).toBe("mesmo código de barras");
    expect(MOTIVO_PARECIDA_ROTULO.codigo_interno).toBe("mesmo código interno");
    expect(MOTIVO_PARECIDA_ROTULO.nome).toBe("nome muito parecido");
  });
});

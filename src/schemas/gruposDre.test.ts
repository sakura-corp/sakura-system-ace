import { describe, expect, it } from "vitest";
import {
  GRUPOS_DRE,
  GRUPO_PADRAO,
  contarSemGrupo,
  grupoServePraTipo,
  gruposParaTipo,
  rotuloDoGrupo,
} from "./gruposDre";

describe("gruposDre", () => {
  it("a lista bate com as chaves do banco, na ordem", () => {
    expect(GRUPOS_DRE.map((g) => g.chave)).toEqual([
      "deducoes_venda",
      "custos",
      "despesas_pessoal",
      "despesas_administrativas",
      "despesas_comerciais",
      "despesas_financeiras",
      "outras_despesas",
      "outras_receitas",
      "receitas_financeiras",
      "fora_do_resultado",
      "a_classificar",
    ]);
    expect(GRUPO_PADRAO).toBe("a_classificar");
  });

  it("saída oferece 9 grupos, sem os de receita", () => {
    const chaves = gruposParaTipo("saida").map((g) => g.chave);
    expect(chaves).toHaveLength(9);
    expect(chaves).toContain("custos");
    expect(chaves).toContain("fora_do_resultado");
    expect(chaves).not.toContain("outras_receitas");
    expect(chaves).not.toContain("receitas_financeiras");
  });

  it("entrada oferece só os 2 de receita e os 2 que servem pras duas", () => {
    expect(gruposParaTipo("entrada").map((g) => g.chave)).toEqual([
      "outras_receitas",
      "receitas_financeiras",
      "fora_do_resultado",
      "a_classificar",
    ]);
  });

  it("grupoServePraTipo", () => {
    expect(grupoServePraTipo("custos", "saida")).toBe(true);
    expect(grupoServePraTipo("custos", "entrada")).toBe(false);
    expect(grupoServePraTipo("outras_receitas", "saida")).toBe(false);
    expect(grupoServePraTipo("a_classificar", "entrada")).toBe(true);
    expect(grupoServePraTipo("inventado", "saida")).toBe(false);
  });

  it("rotuloDoGrupo", () => {
    expect(rotuloDoGrupo("despesas_pessoal")).toBe("Despesas com pessoal");
    expect(rotuloDoGrupo("a_classificar")).toBe("A classificar");
    expect(rotuloDoGrupo("inventado")).toBe("inventado");
  });

  it("contarSemGrupo conta as a_classificar", () => {
    expect(contarSemGrupo([])).toBe(0);
    expect(
      contarSemGrupo([
        { grupo: "a_classificar" },
        { grupo: "custos" },
        { grupo: "a_classificar" },
      ]),
    ).toBe(2);
  });
});

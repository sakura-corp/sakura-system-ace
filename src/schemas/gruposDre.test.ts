import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  GRUPOS_DRE,
  GRUPO_PADRAO,
  contarSemGrupo,
  grupoServePraTipo,
  gruposParaTipo,
  rotuloDoGrupo,
} from "./gruposDre";

describe("gruposDre acompanha a migration 0088", () => {
  // Lê as travas da migration DE VERDADE: se o banco e este arquivo
  // divergirem, o dono escolheria na tela um grupo que o banco recusa.
  const sql = readFileSync("supabase/migrations/0088_grupo_das_categorias_de_caixa.sql", "utf8");
  const chaves = (trecho: string) => [...trecho.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
  const depoisDe = (marca: string) => {
    const i = sql.indexOf(marca);
    expect(i, `não achei "${marca}" na 0088`).toBeGreaterThan(-1);
    return sql.slice(i + marca.length);
  };

  it("a lista de grupos é a mesma da trava ck_categorias_caixa_grupo", () => {
    const bloco = depoisDe("add constraint ck_categorias_caixa_grupo\n").split(");")[0];
    expect(chaves(bloco)).toEqual(GRUPOS_DRE.map((g) => g.chave).sort());
  });

  it("os grupos de cada tipo são os mesmos da trava ck_categorias_caixa_grupo_do_tipo", () => {
    const bloco = depoisDe("add constraint ck_categorias_caixa_grupo_do_tipo").split(");")[0];
    const dosDois = chaves(/grupo in \(([^)]*)\)/.exec(bloco)![1]);
    const saida = chaves(/tipo = 'saida' and grupo in \(([^)]*)\)/.exec(bloco)![1]);
    const entrada = chaves(/tipo = 'entrada' and grupo in \(([^)]*)\)/.exec(bloco)![1]);
    expect(gruposParaTipo("saida").map((g) => g.chave).sort()).toEqual([...saida, ...dosDois].sort());
    expect(gruposParaTipo("entrada").map((g) => g.chave).sort()).toEqual([...entrada, ...dosDois].sort());
  });
});

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

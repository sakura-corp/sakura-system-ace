import { describe, expect, it } from "vitest";
import {
  CATALOGO_VEICULOS,
  MARCAS_DO_CATALOGO,
  MARCAS_VEICULO,
  acharModelo,
  anosDoModelo,
  modelosDaMarca,
  opcoesDeMarca,
  tipoDoModelo,
} from "./marcasVeiculo";

const TIPOS = ["hatch", "sedan", "suv", "picape", "moto"];
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

describe("modelos por marca", () => {
  it("Fiat tem Uno e Strada, não tem Gol", () => {
    const nomes = modelosDaMarca("Fiat").map((m) => m.nome);
    expect(nomes).toContain("Uno");
    expect(nomes).toContain("Strada");
    expect(nomes).not.toContain("Gol");
  });

  it("acha a marca sem acento, sem maiúscula e com espaço nas pontas", () => {
    expect(modelosDaMarca("citroen").length).toBeGreaterThan(0);
    expect(modelosDaMarca(" fiat ")).toEqual(modelosDaMarca("Fiat"));
  });

  it("marca desconhecida ou vazia dá lista vazia", () => {
    expect(modelosDaMarca("Ferrari")).toEqual([]);
    expect(modelosDaMarca("")).toEqual([]);
    expect(modelosDaMarca("   ")).toEqual([]);
  });
});

describe("anos e tipo do modelo", () => {
  it("anos do mais novo pro mais velho, dentro da faixa", () => {
    const m = acharModelo("Fiat", "Uno")!;
    const anos = anosDoModelo("Fiat", "Uno", 2026);
    expect(anos[0]).toBe(m.anos.ate ?? 2026);
    expect(anos[anos.length - 1]).toBe(m.anos.de);
    for (let i = 1; i < anos.length; i++) expect(anos[i]).toBe(anos[i - 1] - 1);
  });

  it("modelo ainda vendido vai até o ano atual passado", () => {
    expect(acharModelo("Fiat", "Strada")!.anos.ate).toBeNull();
    expect(anosDoModelo("Fiat", "Strada", 2030)[0]).toBe(2030);
    expect(anosDoModelo("Fiat", "Strada", 2026)[0]).toBe(2026);
  });

  it("modelo desconhecido não tem anos nem tipo", () => {
    expect(anosDoModelo("Fiat", "Gol", 2026)).toEqual([]);
    expect(tipoDoModelo("Fiat", "Gol")).toBeNull();
  });

  it("escolhe o tipo", () => {
    expect(tipoDoModelo("Fiat", "Strada")).toBe("picape");
    expect(tipoDoModelo("fiat", "strada")).toBe("picape");
    expect(tipoDoModelo("Honda", "CG 160")).toBe("moto");
  });
});

describe("catálogo inteiro", () => {
  it("tem exatamente 15 marcas, todas também em MARCAS_VEICULO", () => {
    expect(CATALOGO_VEICULOS).toHaveLength(15);
    expect(MARCAS_DO_CATALOGO).toEqual(CATALOGO_VEICULOS.map((c) => c.marca));
    for (const m of MARCAS_DO_CATALOGO) expect(MARCAS_VEICULO).toContain(m);
  });

  it("todo tipo é um dos 5", () => {
    for (const c of CATALOGO_VEICULOS)
      for (const m of c.modelos) expect(TIPOS, `${c.marca} ${m.nome}`).toContain(m.tipo);
  });

  it("sem modelo repetido na marca e com faixa de anos válida", () => {
    for (const c of CATALOGO_VEICULOS) {
      const nomes = c.modelos.map((m) => norm(m.nome));
      expect(new Set(nomes).size, c.marca).toBe(nomes.length);
      for (const m of c.modelos) {
        expect(m.anos.de, `${c.marca} ${m.nome}`).toBeGreaterThan(1950);
        if (m.anos.ate !== null) expect(m.anos.de).toBeLessThanOrEqual(m.anos.ate);
      }
    }
  });
});

describe("opcoesDeMarca", () => {
  it("começa pelas 15 na ordem e não repete", () => {
    const o = opcoesDeMarca();
    expect(o.slice(0, 15)).toEqual(MARCAS_DO_CATALOGO);
    const normas = o.map(norm);
    expect(new Set(normas).size).toBe(normas.length);
    expect(o).toContain("Audi");
    expect(o.filter((x) => norm(x) === "caoa chery")).toHaveLength(1);
  });
});

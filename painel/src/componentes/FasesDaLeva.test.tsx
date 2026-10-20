import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FasesDaLeva } from "./FasesDaLeva";

const html = (props: Parameters<typeof FasesDaLeva>[0]) => renderToString(<FasesDaLeva {...props} />).replace(/<!-- -->/g, "");
/** Os itens da linha das cinco fases (a de computador), em ordem. */
const itens = (h: string) => [...h.matchAll(/<li[^>]*data-fase="([a-z]+)"[^>]*data-situacao="([a-z]+)"/g)].map((m) => [m[1], m[2]]);

describe("FasesDaLeva (#645)", () => {
  it("as cinco fases em ordem; a atual acesa, as passadas feitas, as próximas por vir", () => {
    const h = html({ numero: 1, fase: "testando" });
    expect(itens(h)).toEqual([
      ["montando", "feita"],
      ["trabalhando", "feita"],
      ["testando", "atual"],
      ["relatorio", "proxima"],
      ["aprovada", "proxima"],
    ]);
    for (const rotulo of ["Montando", "Trabalhando", "Testando", "Relatório", "Aprovada"]) expect(h).toContain(rotulo);
    // Só uma fase é a atual, e o leitor de tela fica sabendo qual é.
    expect(h.match(/aria-current="step"/g)).toHaveLength(1);
    expect(h).toMatch(/aria-current="step"[^>]*>[\s\S]*?Testando/);
  });

  it("no celular: só a fase atual e \"fase N de 5\"", () => {
    expect(html({ numero: 1, fase: "trabalhando" })).toContain("fase 2 de 5");
    expect(html({ numero: 1, fase: "aprovada" })).toContain("fase 5 de 5");
  });

  it("Montando: a primeira acesa, nenhuma feita", () => {
    expect(itens(html({ numero: 2, fase: "montando" })).map(([, s]) => s)).toEqual(["atual", "proxima", "proxima", "proxima", "proxima"]);
  });

  it("Aprovada: as quatro antes feitas; a leva 0 diz que é de antes das fases, sem relatório", () => {
    expect(itens(html({ numero: 1, fase: "aprovada" })).map(([, s]) => s)).toEqual(["feita", "feita", "feita", "feita", "atual"]);
    expect(html({ numero: 1, fase: "aprovada" })).not.toContain("antes das fases");
    expect(html({ numero: 0, fase: "aprovada", antesDasFases: true })).toContain("antes das fases, sem relatório");
  });
});

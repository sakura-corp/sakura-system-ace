import { describe, expect, it } from "vitest";
import type { Leva } from "../tipos";
import { levasDaMaisNovaPraMaisVelha, textoDasHoras, textoDoDia, textoDoFim } from "./levasAnteriores";

const leva = (numero: number): Leva => ({ numero, nome: `Leva ${numero}`, abertas: 0, total: 1, feitas: 1, horas: 0, terminouEm: null });

describe("levasAnteriores", () => {
  it("ordena da mais nova pra mais velha, sem mexer na lista de fora", () => {
    const entrada = [leva(0), leva(2), leva(1)];
    expect(levasDaMaisNovaPraMaisVelha(entrada).map((l) => l.numero)).toEqual([2, 1, 0]);
    expect(entrada.map((l) => l.numero)).toEqual([0, 2, 1]);
  });
  it("horas: inteiro sem casa, decimal com vírgula", () => {
    expect(textoDasHoras(12)).toBe("12 h");
    expect(textoDasHoras(0)).toBe("0 h");
    expect(textoDasHoras(2.5)).toBe("2,5 h");
    expect(textoDasHoras(30.54)).toBe("30,5 h");
    expect(textoDasHoras(3.04)).toBe("3 h");
  });
  it("dia local em português", () => {
    expect(textoDoDia("2026-10-17T15:00:00Z")).toBe("17/10/2026");
    expect(textoDoDia("lixo")).toBeNull();
  });
  it("fim: data ou em andamento", () => {
    expect(textoDoFim("2026-10-17T15:00:00Z")).toBe("terminou em 17/10/2026");
    expect(textoDoFim(null)).toBe("em andamento");
    expect(textoDoFim("lixo")).toBe("em andamento");
  });
});

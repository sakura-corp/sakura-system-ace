import { describe, expect, it } from "vitest";
import type { ResumoDeLeva } from "../tipos";
import { levasDaMaisNovaPraMaisVelha, textoDasHoras, textoDoDia, textoDoFim } from "./levasAnteriores";

const leva = (numero: number): ResumoDeLeva => ({ numero, nome: `Leva ${numero}`, abertas: 0, total: 1, feitas: 1, horas: 0, terminouEm: null });
const SP = "America/Sao_Paulo";

describe("levasAnteriores", () => {
  it("ordena da mais nova pra mais velha, sem mexer na lista de fora", () => {
    const entrada = [leva(0), leva(2), leva(1)];
    expect(levasDaMaisNovaPraMaisVelha(entrada).map((l) => l.numero)).toEqual([2, 1, 0]);
    expect(entrada.map((l) => l.numero)).toEqual([0, 2, 1]);
  });
  it("horas: inteiro sem casa, decimal com vírgula, sempre \"estimadas\"", () => {
    expect(textoDasHoras(14)).toBe("14 h estimadas");
    expect(textoDasHoras(0)).toBe("0 h estimadas");
    expect(textoDasHoras(2.5)).toBe("2,5 h estimadas");
    expect(textoDasHoras(30.54)).toBe("30,5 h estimadas");
    expect(textoDasHoras(3.04)).toBe("3 h estimadas");
  });
  it("dia em português; ISO inválido não tem dia", () => {
    expect(textoDoDia("2026-10-17T15:00:00Z", SP)).toBe("17/10/2026");
    expect(textoDoDia("lixo")).toBeNull();
    expect(textoDoDia("lixo", SP)).toBeNull();
  });
  it("virada do dia: 01:30 em UTC ainda é o dia anterior em São Paulo", () => {
    expect(textoDoDia("2026-10-18T01:30:00Z", SP)).toBe("17/10/2026");
    expect(textoDoDia("2026-10-18T01:30:00Z", "UTC")).toBe("18/10/2026");
    expect(textoDoFim({ terminouEm: "2026-10-18T01:30:00Z", total: 3 }, SP)).toBe("terminou em 17/10/2026");
  });
  it("fim: data, em andamento, ou sem tarefas ainda", () => {
    expect(textoDoFim({ terminouEm: "2026-10-17T15:00:00Z", total: 3 }, SP)).toBe("terminou em 17/10/2026");
    expect(textoDoFim({ terminouEm: null, total: 3 })).toBe("em andamento");
    expect(textoDoFim({ terminouEm: "lixo", total: 3 })).toBe("em andamento");
    expect(textoDoFim({ terminouEm: null, total: 0 })).toBe("sem tarefas ainda");
  });
});

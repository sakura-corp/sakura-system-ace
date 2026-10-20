import { describe, expect, it } from "vitest";
import { antesDasFases, faseDaLeva, levaDoRelatorioNaMain, levaDoRelatorioNoPr, type SinaisDaLeva } from "./fases";

const sinais = (s: Partial<SinaisDaLeva>): SinaisDaLeva => ({
  numero: 1,
  abertas: 0,
  fechadas: 0,
  relatorioEmPr: false,
  relatorioNaMain: false,
  anteriorPendente: false,
  ...s,
});

describe("faseDaLeva (#644)", () => {
  it("Montando: a leva nova, enquanto uma anterior não foi aprovada (mesmo com tarefa aberta)", () => {
    expect(faseDaLeva(sinais({ numero: 2, abertas: 3, anteriorPendente: true }))).toBe("montando");
  });
  it("Montando: a leva sem nenhuma tarefa ainda", () => {
    expect(faseDaLeva(sinais({ abertas: 0, fechadas: 0 }))).toBe("montando");
  });
  it("Trabalhando: tem tarefa aberta", () => {
    expect(faseDaLeva(sinais({ abertas: 1, fechadas: 4 }))).toBe("trabalhando");
  });
  it("Trabalhando: um defeito entrou na leva com o relatório já no PR (volta de propósito)", () => {
    expect(faseDaLeva(sinais({ abertas: 1, fechadas: 4, relatorioEmPr: true }))).toBe("trabalhando");
  });
  it("Testando: todas fechadas e nenhum relatório", () => {
    expect(faseDaLeva(sinais({ abertas: 0, fechadas: 5 }))).toBe("testando");
  });
  it("Relatório: todas fechadas e um PR aberto com docs/relatorios/leva-N.md", () => {
    expect(faseDaLeva(sinais({ abertas: 0, fechadas: 5, relatorioEmPr: true }))).toBe("relatorio");
  });
  it("Aprovada: o relatório está na main", () => {
    expect(faseDaLeva(sinais({ abertas: 0, fechadas: 5, relatorioNaMain: true }))).toBe("aprovada");
  });
  it("Aprovada: a leva 0, antes das fases, sem relatório nenhum", () => {
    expect(faseDaLeva(sinais({ numero: 0, abertas: 2, fechadas: 9 }))).toBe("aprovada");
    expect(antesDasFases(0)).toBe(true);
    expect(antesDasFases(1)).toBe(false);
  });
});

describe("os caminhos do relatório", () => {
  it("só docs/relatorios/leva-N.md conta, não o leva-N-testes.md", () => {
    expect(levaDoRelatorioNoPr("docs/relatorios/leva-1.md")).toBe(1);
    expect(levaDoRelatorioNoPr("docs/relatorios/leva-12.md")).toBe(12);
    expect(levaDoRelatorioNoPr("docs/relatorios/leva-1-testes.md")).toBeNull();
    expect(levaDoRelatorioNoPr("docs/leva-1.md")).toBeNull();
    expect(levaDoRelatorioNoPr("docs/relatorios/leva-x.md")).toBeNull();
    expect(levaDoRelatorioNaMain("leva-3.md")).toBe(3);
    expect(levaDoRelatorioNaMain("leva-3-testes.md")).toBeNull();
    expect(levaDoRelatorioNaMain("2026-10-20-tarefa-644-backend.md")).toBeNull();
  });
});

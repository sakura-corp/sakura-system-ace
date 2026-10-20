import { describe, expect, it } from "vitest";
import { estadoDaTarefa, lerEstimativa, levaAceitaPegar, levaAtual, numeroDaLeva } from "./estado";

describe("estadoDaTarefa", () => {
  const s = (fechada: boolean, temResponsavel: boolean, temPrAberto: boolean) => estadoDaTarefa({ fechada, temResponsavel, temPrAberto });
  it("fechada é feita, mesmo com responsável e PR aberto", () => {
    expect(s(true, false, false)).toBe("feita");
    expect(s(true, true, true)).toBe("feita");
  });
  it("aberta com PR aberto é revisão, com ou sem responsável", () => {
    expect(s(false, true, true)).toBe("revisao");
    expect(s(false, false, true)).toBe("revisao");
  });
  it("aberta com responsável e sem PR aberto é andamento", () => {
    expect(s(false, true, false)).toBe("andamento");
  });
  it("aberta, sem responsável e sem PR é livre", () => {
    expect(s(false, false, false)).toBe("livre");
  });
});

describe("lerEstimativa", () => {
  it("aceita 2h, 2 h, 1,5 h e 1.5 h", () => {
    expect(lerEstimativa("Estimativa: 2h")).toBe(2);
    expect(lerEstimativa("Estimativa: 2 h")).toBe(2);
    expect(lerEstimativa("Estimativa: 1,5 h")).toBe(1.5);
    expect(lerEstimativa("Estimativa: 1.5 h")).toBe(1.5);
  });
  it("acha a linha no meio do texto, com negrito, maiúscula ou item de lista", () => {
    expect(lerEstimativa("Texto antes\n\n**Estimativa**: 8 h\n\nDepois")).toBe(8);
    expect(lerEstimativa("**Estimativa: 3 h**")).toBe(3);
    expect(lerEstimativa("ESTIMATIVA: 4 h")).toBe(4);
    expect(lerEstimativa("- Estimativa: 6 h")).toBe(6);
    expect(lerEstimativa("Estimativa: 5 h\r\n\r\n**Tarefa 6 de 8**")).toBe(5);
  });
  it("sem a linha, ou com algo que não é horas, não tem estimativa", () => {
    expect(lerEstimativa(null)).toBeUndefined();
    expect(lerEstimativa("")).toBeUndefined();
    expect(lerEstimativa("Sem estimativa nenhuma")).toBeUndefined();
    expect(lerEstimativa("Estimativa: 2 horas e meia? hmm")).toBeUndefined();
    expect(lerEstimativa("Estimativa: 0 h")).toBeUndefined();
    expect(lerEstimativa("Estimativa: N h")).toBeUndefined();
    expect(lerEstimativa("A estimativa: 2 h foi no meio da frase")).toBeUndefined();
  });
  it("vale a primeira linha de estimativa", () => {
    expect(lerEstimativa("Estimativa: 3 h\nEstimativa: 9 h")).toBe(3);
  });
});

describe("numeroDaLeva", () => {
  it("só leva-<número>", () => {
    expect(numeroDaLeva("leva-0")).toBe(0);
    expect(numeroDaLeva("leva-12")).toBe(12);
    expect(numeroDaLeva("leva-x")).toBeNull();
    expect(numeroDaLeva("leva-1a")).toBeNull();
    expect(numeroDaLeva("nova-leva-1")).toBeNull();
    expect(numeroDaLeva("Leva-1")).toBeNull();
  });
});

describe("levaAtual (#644: a mais antiga que ainda não foi aprovada)", () => {
  it("a mais antiga não aprovada, mesmo com uma mais nova cheia de tarefa aberta", () => {
    expect(levaAtual([{ numero: 0, abertas: 3 }, { numero: 1, abertas: 2 }, { numero: 2, abertas: 9 }])).toBe(1);
    expect(levaAtual([{ numero: 1, abertas: 0, aprovada: true }, { numero: 2, abertas: 0 }, { numero: 3, abertas: 5 }])).toBe(2);
  });
  it("a leva 0 conta como aprovada, mesmo com tarefa aberta", () => {
    expect(levaAtual([{ numero: 0, abertas: 4 }, { numero: 1, abertas: 0 }])).toBe(1);
  });
  it("todas aprovadas: a de maior número", () => {
    expect(levaAtual([{ numero: 2, abertas: 0, aprovada: true }, { numero: 0, abertas: 0 }, { numero: 1, abertas: 0, aprovada: true }])).toBe(2);
  });
  it("não depende da ordem, e sem levas é null", () => {
    expect(levaAtual([{ numero: 3, abertas: 0 }, { numero: 0, abertas: 1 }, { numero: 2, abertas: 1 }])).toBe(2);
    expect(levaAtual([])).toBeNull();
  });
});

describe("levaAceitaPegar", () => {
  const levas = [{ numero: 0, abertas: 0 }, { numero: 1, abertas: 4 }, { numero: 2, abertas: 11 }];
  it("a atual e as anteriores com tarefa aberta aceitam; a anterior sem tarefa aberta e a que não existe, não", () => {
    expect(levaAceitaPegar(2, levas, 2)).toBe(true);
    expect(levaAceitaPegar(1, levas, 2)).toBe(true);
    expect(levaAceitaPegar(0, levas, 2)).toBe(false);
    expect(levaAceitaPegar(7, levas, 2)).toBe(false);
  });
  it("a atual aceita mesmo com tudo fechado", () => {
    expect(levaAceitaPegar(0, [{ numero: 0, abertas: 0 }], 0)).toBe(true);
  });
  it("leva em Montando não aceita, mesmo com tarefa aberta (#644)", () => {
    const comFases = [{ numero: 1, abertas: 2, fase: "trabalhando" as const }, { numero: 2, abertas: 5, fase: "montando" as const }];
    expect(levaAceitaPegar(1, comFases, 1)).toBe(true);
    expect(levaAceitaPegar(2, comFases, 1)).toBe(false);
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MAXIMO_DE_LEVAS } from "../logica/levasAnteriores";
import type { ResumoDeLeva } from "../tipos";
import { PaginaDasLevas } from "./PaginaDasLevas";

const base: ResumoDeLeva = { numero: 0, nome: "Leva 0", abertas: 0, total: 8, feitas: 8, horas: 14, terminouEm: "2026-10-16T12:00:00Z" };
const levas: ResumoDeLeva[] = [
  base,
  { ...base, numero: 1, nome: "Leva 1", total: 11, feitas: 9, abertas: 2, horas: 30.5, terminouEm: null },
  { ...base, numero: 2, nome: "Leva 2", feitas: 0, horas: 0, terminouEm: null },
  { ...base, numero: 3, nome: "Leva 3", abertas: 0, total: 0, feitas: 0, horas: 0, terminouEm: null },
];
const html = (l: ResumoDeLeva[], atual: number | null = 3) => renderToStaticMarkup(<PaginaDasLevas levas={l} atual={atual} />);
const texto = (h: string) => h.replace(/<!-- -->/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

describe("PaginaDasLevas", () => {
  it("da mais nova pra mais velha, cada linha um link (a atual vai pra /leva)", () => {
    const h = html(levas);
    expect(h.indexOf("Leva 3")).toBeLessThan(h.indexOf("Leva 2"));
    expect(h.indexOf("Leva 2")).toBeLessThan(h.indexOf("Leva 1"));
    expect(h.indexOf("Leva 1")).toBeLessThan(h.indexOf("Leva 0"));
    expect(h).toContain('href="/leva"');
    expect(h).toContain('href="/leva/1"');
    expect(h).toContain('href="/leva/0"');
  });
  it("mostra feitas, horas, data e andamento", () => {
    const t = texto(html(levas));
    expect(t).toContain("8 de 8 feitas");
    expect(t).toContain("14 h estimadas");
    expect(t).toContain("terminou em 16/10/2026");
    expect(t).toContain("9 de 11 feitas");
    expect(t).toContain("30,5 h estimadas");
    expect(t).toContain("em andamento");
  });
  it("leva sem nenhuma tarefa: \"sem tarefas ainda\", não \"em andamento\"", () => {
    const t = texto(html([levas[3]], 3));
    expect(t).toContain("sem tarefas ainda");
    expect(t).not.toContain("em andamento");
  });
  it("com 20 levas avisa que são as mais novas; com menos, não", () => {
    const vinte = Array.from({ length: MAXIMO_DE_LEVAS }, (_, i) => ({ ...base, numero: i, nome: `Leva ${i}` }));
    expect(MAXIMO_DE_LEVAS).toBe(20);
    expect(texto(html(vinte, 19))).toContain("Mostrando as 20 mais novas.");
    expect(texto(html(vinte.slice(1), 19))).not.toContain("mais novas");
  });
  it("o selo atual só na leva atual", () => {
    expect(html(levas).match(/>atual</g)).toHaveLength(1);
    expect(html(levas, null)).not.toContain(">atual<");
  });
  it("leva cortada avisa; sem corte não avisa", () => {
    expect(texto(html([{ ...base, cortada: true }], 5))).toContain("mais de 100 tarefas: horas e data das 100 primeiras");
    expect(html(levas)).not.toContain("mais de 100 tarefas");
  });
  it("sem levas: mensagem simples", () => {
    expect(texto(html([], null))).toContain("Nenhuma leva ainda.");
  });
  it("sem nota por pessoa", () => {
    expect(texto(html(levas))).not.toMatch(/nota|@/i);
  });
});

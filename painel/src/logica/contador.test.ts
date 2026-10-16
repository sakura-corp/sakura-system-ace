import { describe, expect, it } from "vitest";
import { tarefasDeExemplo } from "../dados/exemplo";
import type { Tarefa } from "../tipos";
import { agruparPorEstado, contarPorEstado, horas, pessoasComVariasEmAndamento, total } from "./contador";

const t = (numero: number, estado: Tarefa["estado"], extra: Partial<Tarefa> = {}): Tarefa => ({
  numero, titulo: `T${numero}`, url: "https://github.com/sakura-corp/x", estado, ...extra,
});

describe("contarPorEstado e total", () => {
  it("conta cada estado", () => {
    expect(contarPorEstado(tarefasDeExemplo)).toEqual({ livre: 4, andamento: 2, revisao: 1, feita: 1 });
    expect(total(tarefasDeExemplo)).toBe(8);
  });
  it("lista vazia dá tudo zero", () => {
    expect(contarPorEstado([])).toEqual({ livre: 0, andamento: 0, revisao: 0, feita: 0 });
  });
});

describe("horas", () => {
  it("soma só as feitas e todas; sem estimativa não conta", () => {
    expect(horas([t(1, "feita", { estimativaHoras: 2.5 }), t(2, "livre", { estimativaHoras: 4 }), t(3, "feita")])).toEqual({ feitas: 2.5, todas: 6.5 });
  });
  it("em andamento e em revisão contam no total, mas não nas feitas", () => {
    expect(horas([t(1, "andamento", { estimativaHoras: 1 }), t(2, "revisao", { estimativaHoras: 2 }), t(3, "feita", { estimativaHoras: 3 })])).toEqual({ feitas: 3, todas: 6 });
    expect(horas(tarefasDeExemplo)).toEqual({ feitas: 3, todas: 36 });
  });
});

describe("pessoasComVariasEmAndamento", () => {
  const dono = (login: string) => ({ login, avatar: "" });
  it("acha quem tem 2 em andamento, e ignora revisão e feita", () => {
    const lista = [
      t(1, "andamento", { dono: dono("a") }), t(2, "andamento", { dono: dono("a") }),
      t(3, "revisao", { dono: dono("b") }), t(4, "andamento", { dono: dono("b") }),
      t(5, "feita", { dono: dono("a") }),
    ];
    expect(pessoasComVariasEmAndamento(lista)).toEqual([{ login: "a", quantas: 2 }]);
  });
  it("nos dados de exemplo, bruno-exemplo tem 2", () => {
    expect(pessoasComVariasEmAndamento(tarefasDeExemplo)).toEqual([{ login: "bruno-exemplo", quantas: 2 }]);
  });
});

describe("agruparPorEstado", () => {
  it("segue a ordem: andamento, revisão, livres, feitas", () => {
    expect(agruparPorEstado(tarefasDeExemplo).map((g) => g.estado)).toEqual(["andamento", "revisao", "livre", "feita"]);
  });
});

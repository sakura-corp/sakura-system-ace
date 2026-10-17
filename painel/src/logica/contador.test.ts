import { describe, expect, it } from "vitest";
import { tarefasDeExemplo } from "../dados/exemplo";
import type { Tarefa } from "../tipos";
import { agruparPorEstado, contarPorEstado, horas, horasPorPessoa, pessoasComVariasEmAndamento, total } from "./contador";

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

describe("horasPorPessoa", () => {
  const dono = (login: string, avatar = "") => ({ login, avatar });

  it("lista vazia dá lista vazia", () => {
    expect(horasPorPessoa([])).toEqual([]);
  });

  it("meia hora e decimais: 1,5 + 0,25 e a soma sem sujeira de ponto flutuante", () => {
    const r = horasPorPessoa([
      t(1, "feita", { dono: dono("a"), estimativaHoras: 1.5 }),
      t(2, "feita", { dono: dono("a"), estimativaHoras: 0.25 }),
      t(3, "andamento", { dono: dono("a"), estimativaHoras: 0.1 }),
      t(4, "revisao", { dono: dono("a"), estimativaHoras: 0.2 }),
    ]);
    expect(r).toEqual([{ login: "a", avatar: "", entregues: 1.75, segurando: 0.3, semEstimativa: 0 }]);
  });

  it("tarefa sem estimativa conta em semEstimativa e não soma horas", () => {
    const r = horasPorPessoa([
      t(1, "feita", { dono: dono("a"), estimativaHoras: 2 }),
      t(2, "feita", { dono: dono("a") }),
      t(3, "andamento", { dono: dono("a") }),
      t(4, "andamento", { dono: dono("b") }),
    ]);
    expect(r).toEqual([
      { login: "a", avatar: "", entregues: 2, segurando: 0, semEstimativa: 2 },
      { login: "b", avatar: "", entregues: 0, segurando: 0, semEstimativa: 1 },
    ]);
  });

  it("tarefa sem dono é ignorada", () => {
    expect(horasPorPessoa([t(1, "feita", { estimativaHoras: 3 }), t(2, "andamento", { estimativaHoras: 1 })])).toEqual([]);
  });

  it("tarefa livre é ignorada (mesmo com dono)", () => {
    expect(horasPorPessoa([t(1, "livre", { estimativaHoras: 3 }), t(2, "livre", { dono: dono("a"), estimativaHoras: 2 })])).toEqual([]);
  });

  it("revisão conta como segurando, não como entregue", () => {
    const r = horasPorPessoa([t(1, "revisao", { dono: dono("a"), estimativaHoras: 2 }), t(2, "andamento", { dono: dono("a"), estimativaHoras: 1 })]);
    expect(r).toEqual([{ login: "a", avatar: "", entregues: 0, segurando: 3, semEstimativa: 0 }]);
  });

  it("mesma pessoa com várias tarefas vira uma linha só, com o avatar", () => {
    const r = horasPorPessoa([
      t(1, "feita", { dono: dono("a", "https://avatar/a"), estimativaHoras: 2 }),
      t(2, "feita", { dono: dono("a", "https://avatar/a"), estimativaHoras: 3 }),
      t(3, "andamento", { dono: dono("a", "https://avatar/a"), estimativaHoras: 1 }),
    ]);
    expect(r).toEqual([{ login: "a", avatar: "https://avatar/a", entregues: 5, segurando: 1, semEstimativa: 0 }]);
  });

  it("ordem: mais entregues primeiro; empate, mais segurando; empate, login em ordem alfabética", () => {
    const base = [
      t(1, "feita", { dono: dono("zeca"), estimativaHoras: 5 }),
      t(2, "feita", { dono: dono("ana"), estimativaHoras: 2 }),
      t(3, "andamento", { dono: dono("ana"), estimativaHoras: 1 }),
      t(4, "feita", { dono: dono("bia"), estimativaHoras: 2 }),
      t(5, "andamento", { dono: dono("bia"), estimativaHoras: 4 }),
      t(6, "feita", { dono: dono("caio"), estimativaHoras: 2 }),
      t(7, "andamento", { dono: dono("caio"), estimativaHoras: 4 }),
      t(8, "andamento", { dono: dono("dani"), estimativaHoras: 9 }),
    ];
    const esperado = ["zeca", "bia", "caio", "ana", "dani"];
    expect(horasPorPessoa(base).map((p) => p.login)).toEqual(esperado);
    // a ordem de entrada não muda o resultado
    expect(horasPorPessoa([...base].reverse()).map((p) => p.login)).toEqual(esperado);
  });
});

import { describe, expect, it } from "vitest";
import {
  motivoParaNaoTrocar,
  pecasQueFicamNegativas,
  problemaDaTroca,
  resumoDaTroca,
  totalConfere,
  totalDaLista,
  type ItemDaTroca,
} from "./trocaFaturada";

const pneuErrado: ItemDaTroca = {
  id: "i1",
  tipo: "peca",
  peca_id: "p1",
  servico_id: null,
  tecnico_id: null,
  descricao: "Pneu 175/70 R13",
  quantidade: 2,
  preco_unitario: 300,
  desconto: 0,
};
const balanceamento: ItemDaTroca = {
  id: "i2",
  tipo: "servico",
  peca_id: null,
  servico_id: "s1",
  tecnico_id: null,
  descricao: "Balanceamento",
  quantidade: 1,
  preco_unitario: 50,
  desconto: 0,
};
const antes = [pneuErrado, balanceamento];

describe("totalConfere", () => {
  it("aceita a troca de peça pelo mesmo total", () => {
    const depois = [{ ...pneuErrado, peca_id: "p2", descricao: "Pneu 175/65 R14" }, balanceamento];
    expect(totalConfere(antes, depois)).toBe(true);
  });

  it("aceita preços diferentes que somam o mesmo total", () => {
    const depois = [
      { ...pneuErrado, preco_unitario: 290 },
      { ...balanceamento, preco_unitario: 70 },
    ];
    expect(totalConfere(antes, depois)).toBe(true);
  });

  it("recusa um centavo de diferença", () => {
    const depois = [{ ...pneuErrado, desconto: 0.01 }, balanceamento];
    expect(totalConfere(antes, depois)).toBe(false);
  });

  it("aceita a cauda do ponto flutuante (0,1 + 0,2)", () => {
    const a = [{ ...balanceamento, preco_unitario: 0.3 }];
    const d = [
      { ...balanceamento, preco_unitario: 0.1 },
      { ...balanceamento, id: undefined, preco_unitario: 0.2 },
    ];
    expect(totalConfere(a, d)).toBe(true);
  });
});

describe("problemaDaTroca", () => {
  it("explica que mudar o valor vem numa próxima etapa", () => {
    const depois = [{ ...pneuErrado, preco_unitario: 310 }, balanceamento];
    const problema = problemaDaTroca(antes, depois)?.replace(/\s/g, " ");
    expect(problema).toContain("R$ 650,00");
    expect(problema).toContain("R$ 670,00");
    expect(problema).toContain("próxima etapa");
  });

  it("não deixa a OS sem item", () => {
    expect(problemaDaTroca(antes, [])).toMatch(/pelo menos um item/);
  });

  it("pede a peça e a descrição", () => {
    expect(problemaDaTroca(antes, [{ ...pneuErrado, peca_id: null }, balanceamento])).toMatch(
      /Escolha a peça/,
    );
    expect(problemaDaTroca(antes, [{ ...balanceamento, descricao: " " }, pneuErrado])).toMatch(
      /descrição/,
    );
  });

  it("pede quantidade maior que zero", () => {
    expect(problemaDaTroca(antes, [{ ...pneuErrado, quantidade: 0 }, balanceamento])).toMatch(
      /quantidade/,
    );
  });

  it("sem mudança nenhuma não tem o que trocar", () => {
    expect(problemaDaTroca(antes, antes)).toMatch(/Nada mudou/);
  });

  it("troca válida não tem problema", () => {
    const depois = [{ ...pneuErrado, peca_id: "p2", descricao: "Pneu 175/65 R14" }, balanceamento];
    expect(problemaDaTroca(antes, depois)).toBeNull();
  });
});

describe("resumoDaTroca", () => {
  it("lista o que sai e o que entra, e deixa de fora o que ficou igual", () => {
    const pneuCerto = { ...pneuErrado, peca_id: "p2", descricao: "Pneu 175/65 R14" };
    const { saem, entram } = resumoDaTroca(antes, [pneuCerto, balanceamento]);
    expect(saem.map((i) => i.descricao)).toEqual(["Pneu 175/70 R13"]);
    expect(entram.map((i) => i.descricao)).toEqual(["Pneu 175/65 R14"]);
  });

  it("item tirado só sai; item novo só entra", () => {
    const novo: ItemDaTroca = { ...balanceamento, id: undefined, descricao: "Recapagem", preco_unitario: 600 };
    const { saem, entram } = resumoDaTroca(antes, [balanceamento, novo]);
    expect(saem.map((i) => i.descricao)).toEqual(["Pneu 175/70 R13"]);
    expect(entram.map((i) => i.descricao)).toEqual(["Recapagem"]);
  });
});

describe("pecasQueFicamNegativas", () => {
  const nomes = new Map([
    ["p1", "Pneu 175/70 R13"],
    ["p2", "Pneu 175/65 R14"],
  ]);

  it("avisa a peça que entra sem saldo suficiente", () => {
    const depois = [{ ...pneuErrado, peca_id: "p2" }, balanceamento];
    const saldo = new Map([
      ["p1", 0],
      ["p2", 1],
    ]);
    expect(pecasQueFicamNegativas(antes, depois, saldo, nomes)).toEqual([
      { pecaId: "p2", descricao: "Pneu 175/65 R14", saldoDepois: -1 },
    ]);
  });

  it("a peça que volta pro estoque nunca é aviso", () => {
    const depois = [{ ...pneuErrado, peca_id: "p2" }, balanceamento];
    const saldo = new Map([
      ["p1", -5],
      ["p2", 10],
    ]);
    expect(pecasQueFicamNegativas(antes, depois, saldo, nomes)).toEqual([]);
  });

  it("conta só a diferença: a mesma peça com 1 a mais baixa só 1", () => {
    const depois = [{ ...pneuErrado, quantidade: 3, preco_unitario: 200 }, balanceamento];
    const saldo = new Map([["p1", 1]]);
    expect(pecasQueFicamNegativas(antes, depois, saldo, nomes)).toEqual([]);
    expect(pecasQueFicamNegativas(antes, depois, new Map([["p1", 0]]), nomes)).toEqual([
      { pecaId: "p1", descricao: "Pneu 175/70 R13", saldoDepois: -1 },
    ]);
  });
});

describe("motivoParaNaoTrocar", () => {
  it("só OS faturada, só gerente, sem nota", () => {
    expect(motivoParaNaoTrocar({ faturada: false, gerente: true, temNota: false })).not.toBeNull();
    expect(motivoParaNaoTrocar({ faturada: true, gerente: false, temNota: false })).toMatch(/gerente/);
    expect(motivoParaNaoTrocar({ faturada: true, gerente: true, temNota: true })).toMatch(/nota fiscal/);
    expect(motivoParaNaoTrocar({ faturada: true, gerente: true, temNota: false })).toBeNull();
  });
});

describe("peça sem cadastro (avulsa) que já estava na OS", () => {
  const avulsa: ItemDaTroca = { ...pneuErrado, id: "i3", peca_id: null, descricao: "Válvula", quantidade: 1, preco_unitario: 10 };

  it("pode ficar como está enquanto se troca outro item", () => {
    const a = [pneuErrado, avulsa];
    const d = [{ ...pneuErrado, peca_id: "p2", descricao: "Pneu 175/65 R14" }, avulsa];
    expect(problemaDaTroca(a, d)).toBeNull();
  });

  it("item novo sem peça do cadastro continua recusado", () => {
    const novo: ItemDaTroca = { ...avulsa, id: undefined };
    expect(problemaDaTroca([pneuErrado, avulsa], [avulsa, { ...novo, preco_unitario: 600 }])).toMatch(
      /Escolha a peça/,
    );
  });
});

describe("totalDaLista", () => {
  it("devolve null com número inválido", () => {
    expect(totalDaLista([{ ...pneuErrado, quantidade: Number.NaN }])).toBeNull();
    expect(totalDaLista(antes)).toBe(650);
  });
});

import { describe, expect, it } from "vitest";
import {
  acertosDaCorrecao,
  diferencaDaCorrecao,
  manterOTotal,
  motivoParaNaoTrocar,
  pecasQueFicamNegativas,
  problemaDaTroca,
  problemaDoAcerto,
  resumoDaTroca,
  textoDoAcerto,
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
  it("aceita total diferente: a diferença é acertada no Caixa de hoje (#1182)", () => {
    const subiu = [{ ...pneuErrado, preco_unitario: 310 }, balanceamento];
    const desceu = [pneuErrado];
    expect(problemaDaTroca(antes, subiu)).toBeNull();
    expect(problemaDaTroca(antes, desceu)).toBeNull();
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

  it("a nota emitida manda cancelar antes, avisando do prazo (#1182)", () => {
    const motivo = motivoParaNaoTrocar({ faturada: true, gerente: true, temNota: true });
    expect(motivo).toMatch(/Cancele a nota/);
    expect(motivo).toMatch(/prazo/);
  });

  it("trava só pelo caixa de HOJE fechado (#1182)", () => {
    expect(motivoParaNaoTrocar({ faturada: true, gerente: true, temNota: false, caixaDeHojeFechado: true })).toMatch(
      /desfaça o fechamento de hoje/,
    );
    expect(motivoParaNaoTrocar({ faturada: true, gerente: true, temNota: false, caixaDeHojeFechado: false })).toBeNull();
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

describe("diferencaDaCorrecao (#1182)", () => {
  it("é o total novo menos o faturado, no centavo", () => {
    expect(diferencaDaCorrecao(antes, [{ ...pneuErrado, preco_unitario: 310 }, balanceamento])).toBe(20);
    expect(diferencaDaCorrecao(antes, [pneuErrado])).toBe(-50);
  });

  it("a cauda do ponto flutuante vira zero, não um resto de centavo", () => {
    const a = [{ ...balanceamento, preco_unitario: 0.3 }];
    const d = [
      { ...balanceamento, preco_unitario: 0.1 },
      { ...balanceamento, id: undefined, preco_unitario: 0.2 },
    ];
    expect(diferencaDaCorrecao(a, d)).toBe(0);
    expect(diferencaDaCorrecao([{ ...balanceamento, preco_unitario: 0.1 }], [{ ...balanceamento, preco_unitario: 0.3 }])).toBe(0.2);
  });
});

describe("acertosDaCorrecao (#1182)", () => {
  it("total igual: não tem acerto (o caminho de sempre)", () => {
    expect(acertosDaCorrecao({ diferenca: 0, contaDoFaturamentoEmAberto: false })).toEqual({ opcoes: [], padrao: null });
    expect(acertosDaCorrecao({ diferenca: 0, contaDoFaturamentoEmAberto: true })).toEqual({ opcoes: [], padrao: null });
  });

  it("conta do faturamento em aberto: a conta muda de valor, sem escolha (sobe ou desce)", () => {
    expect(acertosDaCorrecao({ diferenca: 20, contaDoFaturamentoEmAberto: true })).toEqual({
      opcoes: ["conta_aberta"],
      padrao: "conta_aberta",
    });
    expect(acertosDaCorrecao({ diferenca: -50, contaDoFaturamentoEmAberto: true })).toEqual({
      opcoes: ["conta_aberta"],
      padrao: "conta_aberta",
    });
  });

  it("paga e subiu: cliente paga agora (já marcado) ou fica a receber", () => {
    expect(acertosDaCorrecao({ diferenca: 20, contaDoFaturamentoEmAberto: false })).toEqual({
      opcoes: ["pago_agora", "a_receber"],
      padrao: "pago_agora",
    });
  });

  it("paga e desceu: devolver agora", () => {
    expect(acertosDaCorrecao({ diferenca: -50, contaDoFaturamentoEmAberto: false })).toEqual({
      opcoes: ["devolvido"],
      padrao: "devolvido",
    });
  });
});

describe("manterOTotal (#1182)", () => {
  it("põe a diferença como desconto no item que entrou: o total volta ao faturado", () => {
    const alinhamento: ItemDaTroca = { ...balanceamento, id: undefined, servico_id: "s2", descricao: "Alinhamento", preco_unitario: 50 };
    const depois = manterOTotal(antes, [...antes, alinhamento]);
    expect(depois?.map((i) => i.desconto)).toEqual([0, 0, 50]);
    expect(totalConfere(antes, depois ?? [])).toBe(true);
  });

  it("reparte entre os itens que mudaram, pelo valor de cada um, fechando no centavo", () => {
    const pneuMaisCaro = { ...pneuErrado, preco_unitario: 310 }; // 620
    const novo: ItemDaTroca = { ...balanceamento, id: undefined, descricao: "Válvula", preco_unitario: 100 };
    // diferença 120: 120 × 620/720 = 103,33 e 120 × 100/720 = 16,67
    const depois = manterOTotal(antes, [pneuMaisCaro, balanceamento, novo]);
    expect(depois?.map((i) => i.desconto)).toEqual([103.33, 0, 16.67]);
    expect(diferencaDaCorrecao(antes, depois ?? [])).toBe(0);
  });

  it("soma ao desconto que o item já tinha", () => {
    const comDesconto = { ...pneuErrado, preco_unitario: 310, desconto: 5 }; // 615, diferença 15
    expect(manterOTotal(antes, [comDesconto, balanceamento])?.map((i) => i.desconto)).toEqual([20, 0]);
  });

  it("só existe quando o total subiu", () => {
    expect(manterOTotal(antes, [pneuErrado])).toBeNull();
    expect(manterOTotal(antes, antes)).toBeNull();
  });
});

describe("textoDoAcerto (#1182): o rodapé diz exatamente o que vai lançar", () => {
  const hoje = "2026-11-24";
  const limpo = (t: string) => t.replace(/\s/g, " ");

  it("pago agora: Entrada no Caixa de hoje", () => {
    expect(limpo(textoDoAcerto({ acerto: "pago_agora", diferenca: 20, hoje }))).toBe(
      "Lança R$ 20,00 como Entrada no Caixa de hoje, 24/11.",
    );
  });

  it("devolvido: Saída (Devolução ao cliente) no Caixa de hoje", () => {
    expect(limpo(textoDoAcerto({ acerto: "devolvido", diferenca: -50, hoje }))).toBe(
      "Lança R$ 50,00 como Saída (Devolução ao cliente) no Caixa de hoje, 24/11.",
    );
  });

  it("fica a receber: conta nova só da diferença, a do faturamento não muda", () => {
    expect(limpo(textoDoAcerto({ acerto: "a_receber", diferenca: 20, hoje, vencimento: "2026-12-10" }))).toBe(
      "Cria uma conta a receber de R$ 20,00, com vencimento em 10/12/2026. Nada entra no Caixa hoje.",
    );
  });

  it("conta em aberto: a conta muda de valor, nada no Caixa", () => {
    expect(limpo(textoDoAcerto({ acerto: "conta_aberta", diferenca: -50, hoje, valorDaConta: 650 }))).toBe(
      "A conta a receber da OS passa de R$ 650,00 para R$ 600,00. Nada entra no Caixa.",
    );
  });

  it("total igual: nada no Caixa", () => {
    expect(textoDoAcerto({ acerto: null, diferenca: 0, hoje })).toBe("O total não muda: nada entra no Caixa.");
  });
});

describe("problemaDoAcerto (#1182)", () => {
  const hoje = "2026-11-24";
  const base = { diferenca: 20, contaDoFaturamentoEmAberto: false, hoje };

  it("total igual não pede acerto", () => {
    expect(problemaDoAcerto({ ...base, diferenca: 0, acerto: null })).toBeNull();
  });

  it("com diferença, pede um acerto que valha pro caso", () => {
    expect(problemaDoAcerto({ ...base, acerto: null })).toMatch(/como acertar/);
    expect(problemaDoAcerto({ ...base, acerto: "devolvido", formaPagamento: "pix" })).toMatch(/como acertar/);
    expect(problemaDoAcerto({ ...base, contaDoFaturamentoEmAberto: true, acerto: "pago_agora", formaPagamento: "pix" })).toMatch(
      /como acertar/,
    );
  });

  it("pago agora e devolvido pedem a forma de pagamento", () => {
    expect(problemaDoAcerto({ ...base, acerto: "pago_agora" })).toMatch(/forma de pagamento/);
    expect(problemaDoAcerto({ ...base, diferenca: -5, acerto: "devolvido", formaPagamento: "" })).toMatch(/forma de pagamento/);
    expect(problemaDoAcerto({ ...base, acerto: "pago_agora", formaPagamento: "pix" })).toBeNull();
  });

  it("fica a receber pede o vencimento, de hoje em diante", () => {
    expect(problemaDoAcerto({ ...base, acerto: "a_receber" })).toMatch(/vencimento/);
    expect(problemaDoAcerto({ ...base, acerto: "a_receber", vencimento: "2026-11-23" })).toMatch(/antes de hoje/);
    expect(problemaDoAcerto({ ...base, acerto: "a_receber", vencimento: "2026-11-24" })).toBeNull();
  });

  it("conta em aberto não pede nada", () => {
    expect(problemaDoAcerto({ ...base, contaDoFaturamentoEmAberto: true, acerto: "conta_aberta" })).toBeNull();
  });
});

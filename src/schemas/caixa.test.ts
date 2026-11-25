import { describe, expect, it } from "vitest";
import { diaLocal } from "@/lib/datas";
import {
  agruparPorCategoria,
  filtrarPorTipo,
  totalDoFiltro,
  caixaFormSchema,
  caixaFormVazio,
  diaAnterior,
  FORMAS_DO_LANCAMENTO,
  movimentosDoDia,
  movimentosManuais,
  movimentosSemCategoria,
  paraNovoMovimentoCaixa,
  resumirDiaDoCaixa,
  resumirSemCategoria,
  saidasDoMes,
  totaisPorCategoria,
} from "./caixa";
import type { MovimentoCaixa, TipoCaixa } from "@/types/caixa";

function movimento(parcial: Partial<MovimentoCaixa> & { id: string }): MovimentoCaixa {
  return {
    loja_id: "loja-1",
    data: "2026-09-01T12:00:00Z",
    ordem_servico_id: null,
    tipo: "saida" as TipoCaixa,
    forma_pagamento: "dinheiro",
    valor: 100,
    descricao: null,
    categoria_id: null,
    ...parcial,
  };
}

describe("categoria obrigatória no lançamento manual", () => {
  const valores = { ...caixaFormVazio("saida"), valor: "50" };

  it("recusa o formulário sem categoria", () => {
    const resultado = caixaFormSchema.safeParse(valores);

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe("Escolha uma categoria.");
    }
  });

  it("aceita com categoria escolhida", () => {
    const resultado = caixaFormSchema.safeParse({ ...valores, categoria_id: "cat-1" });
    expect(resultado.success).toBe(true);
  });

  it("continua exigindo valor maior que zero", () => {
    const resultado = caixaFormSchema.safeParse({
      ...valores,
      categoria_id: "cat-1",
      valor: "0",
    });
    expect(resultado.success).toBe(false);
  });

  it("leva a categoria escolhida pro movimento gravado", () => {
    const novo = paraNovoMovimentoCaixa({ ...valores, categoria_id: "cat-1" });
    expect(novo.categoria_id).toBe("cat-1");
    expect(novo.ordem_servico_id).toBeNull();
  });
});

describe("forma de pagamento do lançamento manual (#1089)", () => {
  const valores = { ...caixaFormVazio("entrada"), valor: "50", categoria_id: "cat-1" };

  it("oferece as seis formas, na ordem da lista", () => {
    expect(FORMAS_DO_LANCAMENTO.map((f) => f.valor)).toEqual([
      "dinheiro",
      "pix",
      "cartao_debito",
      "cartao_credito",
      "transferencia",
      "outro",
    ]);
  });

  it("nasce em dinheiro", () => {
    expect(caixaFormVazio("saida").forma_pagamento).toBe("dinheiro");
  });

  it("recusa texto livre: a forma vem da lista", () => {
    const resultado = caixaFormSchema.safeParse({ ...valores, forma_pagamento: "Vale da loja" });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0].message).toBe("Escolha a forma de pagamento.");
    }
  });

  it("recusa a forma em branco", () => {
    const resultado = caixaFormSchema.safeParse({ ...valores, forma_pagamento: "" });
    expect(resultado.success).toBe(false);
  });

  it("aceita cada chave da lista e grava a chave, não o nome", () => {
    for (const forma of ["dinheiro", "pix", "cartao_debito", "cartao_credito", "transferencia", "outro"]) {
      const resultado = caixaFormSchema.safeParse({ ...valores, forma_pagamento: forma });
      expect(resultado.success, forma).toBe(true);
      if (resultado.success) {
        expect(paraNovoMovimentoCaixa(resultado.data).forma_pagamento).toBe(forma);
      }
    }
  });
});

describe("o recorte de lançamento manual", () => {
  const movimentos = [
    movimento({ id: "a", tipo: "saida" }),
    movimento({ id: "b", tipo: "entrada" }),
    // Faturamento de OS: entra no caixa sem categoria e deve ficar assim.
    movimento({ id: "c", tipo: "entrada", ordem_servico_id: "os-1" }),
  ];

  it("deixa de fora o que nasceu de uma OS faturada", () => {
    expect(movimentosManuais(movimentos, "entrada").map((m) => m.id)).toEqual(["b"]);
  });

  it("separa por tipo", () => {
    expect(movimentosManuais(movimentos, "saida").map((m) => m.id)).toEqual(["a"]);
  });

  it("a devolução da correção de OS (saída ligada à OS, #1182) aparece nas Saídas", () => {
    const comDevolucao = [
      ...movimentos,
      movimento({ id: "d", tipo: "saida", ordem_servico_id: "os-1", categoria_id: "devolucao" }),
    ];
    expect(movimentosManuais(comDevolucao, "saida").map((m) => m.id)).toEqual(["a", "d"]);
    // A entrada da OS continua fora.
    expect(movimentosManuais(comDevolucao, "entrada").map((m) => m.id)).toEqual(["b"]);
  });

  it("nunca oferece uma OS faturada pra categorizar", () => {
    // Se a OS entrasse aqui, o conserto do histórico convidaria a classificar
    // venda como se fosse despesa avulsa.
    expect(movimentosSemCategoria(movimentos, "entrada").map((m) => m.id)).toEqual(["b"]);
  });
});

describe("o histórico sem categoria", () => {
  const movimentos = [
    movimento({ id: "a", valor: 31000 }),
    movimento({ id: "b", valor: 500, categoria_id: "cat-aluguel" }),
    movimento({ id: "c", valor: 0.1 }),
    movimento({ id: "d", valor: 0.2 }),
    movimento({ id: "e", valor: 90, tipo: "entrada" }),
  ];

  it("conta e soma só o que está sem categoria, daquele tipo", () => {
    expect(resumirSemCategoria(movimentos, "saida")).toEqual({
      quantidade: 3,
      total: 31000.3,
    });
  });

  it("soma sem deixar cauda de ponto flutuante", () => {
    // 0.1 + 0.2 dá 0.30000000000000004 num reduce solto — é o defeito que a
    // migration 0048 e o schemas/dinheiro.ts existem pra fechar.
    const { total } = resumirSemCategoria([movimento({ id: "c", valor: 0.1 }), movimento({ id: "d", valor: 0.2 })], "saida");
    expect(total).toBe(0.3);
  });

  it("devolve zero quando não há nada a consertar", () => {
    expect(resumirSemCategoria([movimento({ id: "b", categoria_id: "cat-1" })], "saida")).toEqual({
      quantidade: 0,
      total: 0,
    });
  });
});

describe("agrupar as escolhas antes de gravar", () => {
  it("junta os lançamentos que receberam a mesma categoria", () => {
    const grupos = agruparPorCategoria({ a: "cat-1", b: "cat-2", c: "cat-1" });

    expect(grupos).toHaveLength(2);
    expect(grupos.find((g) => g.categoriaId === "cat-1")?.ids).toEqual(["a", "c"]);
    expect(grupos.find((g) => g.categoriaId === "cat-2")?.ids).toEqual(["b"]);
  });

  it("ignora a linha deixada em branco", () => {
    // Quem não soube classificar agora classifica depois — nada é gravado
    // por acidente.
    expect(agruparPorCategoria({ a: "", b: "cat-1" })).toEqual([
      { categoriaId: "cat-1", ids: ["b"] },
    ]);
  });

  it("não grava nada quando ninguém escolheu", () => {
    expect(agruparPorCategoria({ a: "", b: "" })).toEqual([]);
  });
});

describe("totaisPorCategoria (Caixa → Entradas/Saídas, #875)", () => {
  it("soma por nome de categoria, do maior pro menor; sem categoria tem rótulo próprio", () => {
    const movimentos = [
      movimento({ id: "1", valor: 30, categoria: { nome: "Aluguel" } }),
      movimento({ id: "2", valor: 20.1, categoria: null }),
      movimento({ id: "3", valor: 100, categoria: { nome: "Luz" } }),
      movimento({ id: "4", valor: 40, categoria: { nome: "Aluguel" } }),
    ];
    expect(totaisPorCategoria(movimentos)).toEqual([
      ["Luz", 100],
      ["Aluguel", 70],
      ["Sem categoria", 20.1],
    ]);
  });

  it("nada lançado dá lista vazia", () => {
    expect(totaisPorCategoria([])).toEqual([]);
  });
});

// Os horários dos testes abaixo são montados no fuso LOCAL (new Date(ano,
// mês, dia, hora)), pra que o "dia" seja o mesmo nas duas rodadas do
// `npm run test:fusos`.
function noDia(ano: number, mes: number, dia: number, hora = 12, minuto = 0): string {
  return new Date(ano, mes - 1, dia, hora, minuto).toISOString();
}

describe("movimentosDoDia (a página única do Caixa, #1089)", () => {
  it("fica só com os lançamentos daquele dia; dias atrás ficam de fora", () => {
    const movimentos = [
      movimento({ id: "hoje-cedo", data: noDia(2026, 11, 25, 0, 5) }),
      movimento({ id: "hoje-noite", data: noDia(2026, 11, 25, 22, 30) }),
      movimento({ id: "ontem", data: noDia(2026, 11, 24, 23, 59) }),
      movimento({ id: "semana-passada", data: noDia(2026, 11, 18) }),
      movimento({ id: "amanha", data: noDia(2026, 11, 26, 0, 1) }),
    ];

    expect(movimentosDoDia(movimentos, "2026-11-25").map((m) => m.id)).toEqual([
      "hoje-cedo",
      "hoje-noite",
    ]);
  });

  it("às 22h de Brasília ainda é o mesmo dia (o UTC já virou)", () => {
    // 22h em São Paulo = 01h do dia seguinte em UTC: o recorte é pelo dia
    // local, nunca pelo pedaço de texto do horário em UTC.
    const m = movimento({ id: "noite", data: noDia(2026, 11, 25, 22) });
    expect(movimentosDoDia([m], diaLocal(m.data)).map((x) => x.id)).toEqual(["noite"]);
    expect(movimentosDoDia([m], "2026-11-25").map((x) => x.id)).toEqual(["noite"]);
  });

  it("dia sem lançamento dá lista vazia", () => {
    expect(movimentosDoDia([movimento({ id: "a", data: noDia(2026, 11, 24) })], "2026-11-25")).toEqual([]);
  });
});

describe("o filtro da lista do dia e o Total do rodapé", () => {
  const movimentos = [
    movimento({ id: "e1", tipo: "entrada", valor: 150 }),
    movimento({ id: "s1", tipo: "saida", valor: 40 }),
    movimento({ id: "e2", tipo: "entrada", valor: 0.1 }),
    movimento({ id: "e3", tipo: "entrada", valor: 0.2 }),
  ];

  it("'tudo' mostra tudo; 'entrada' e 'saida' separam", () => {
    expect(filtrarPorTipo(movimentos, "tudo").map((m) => m.id)).toEqual(["e1", "s1", "e2", "e3"]);
    expect(filtrarPorTipo(movimentos, "entrada").map((m) => m.id)).toEqual(["e1", "e2", "e3"]);
    expect(filtrarPorTipo(movimentos, "saida").map((m) => m.id)).toEqual(["s1"]);
  });

  it("o Total soma as entradas e tira as saídas, no centavo", () => {
    // 150 + 0,1 + 0,2 − 40 = 110,30 (sem o 0,30000000000000004).
    expect(totalDoFiltro(movimentos)).toBe(110.3);
    expect(totalDoFiltro(filtrarPorTipo(movimentos, "entrada"))).toBe(150.3);
    expect(totalDoFiltro(filtrarPorTipo(movimentos, "saida"))).toBe(-40);
    expect(totalDoFiltro([])).toBe(0);
  });
});

describe("diaAnterior (a seta ‹ do dia)", () => {
  it("volta um dia, virando mês, ano e o fevereiro bissexto", () => {
    expect(diaAnterior("2026-11-25")).toBe("2026-11-24");
    expect(diaAnterior("2026-03-01")).toBe("2026-02-28");
    expect(diaAnterior("2028-03-01")).toBe("2028-02-29");
    expect(diaAnterior("2027-01-01")).toBe("2026-12-31");
  });

  it("passa pelo dia do horário de verão sem pular nem repetir dia", () => {
    // Em 2018, no Brasil, o horário de verão começou à 0h de 04/11: o
    // relógio foi de 23h59 direto pra 1h, e aquele dia não teve meia-noite.
    expect(diaAnterior("2018-11-05")).toBe("2018-11-04");
    expect(diaAnterior("2018-11-04")).toBe("2018-11-03");
  });
});

describe("resumirDiaDoCaixa (os números do topo da página do Caixa)", () => {
  // Custo fixo de mentira: só as OS usam; os lançamentos avulsos não têm custo.
  const semCusto = () => 0;

  it("lançamento com 'Dinheiro' entra na gaveta; com 'Pix' não", () => {
    const r = resumirDiaDoCaixa(
      [
        // A chave do formulário novo e o texto livre antigo valem igual.
        movimento({ id: "1", tipo: "entrada", valor: 100, forma_pagamento: "dinheiro" }),
        movimento({ id: "2", tipo: "entrada", valor: 50, forma_pagamento: "Dinheiro" }),
        movimento({ id: "3", tipo: "entrada", valor: 80, forma_pagamento: "pix" }),
        movimento({ id: "4", tipo: "entrada", valor: 20, forma_pagamento: "Pix" }),
      ],
      semCusto,
    );

    expect(r.gaveta).toBe(150);
    expect(r.pixECartao).toBe(100);
    expect(r.entradas).toBe(250);
    expect(r.saidas).toBe(0);
    expect(r.saldo).toBe(250);
  });

  it("saída em dinheiro baixa a gaveta (e o saldo); saída no Pix baixa o Pix e cartão", () => {
    const r = resumirDiaDoCaixa(
      [
        movimento({ id: "1", tipo: "entrada", valor: 300, forma_pagamento: "dinheiro" }),
        movimento({ id: "2", tipo: "saida", valor: 45.5, forma_pagamento: "dinheiro" }),
        movimento({ id: "3", tipo: "saida", valor: 10, forma_pagamento: "pix" }),
      ],
      semCusto,
    );

    expect(r.gaveta).toBe(254.5);
    expect(r.pixECartao).toBe(-10);
    expect(r.saidas).toBe(55.5);
    expect(r.saldo).toBe(244.5);
  });

  it("Pix e os dois cartões somam juntos, com chave ou com o texto antigo", () => {
    const r = resumirDiaDoCaixa(
      [
        movimento({ id: "1", tipo: "entrada", valor: 10, forma_pagamento: "pix" }),
        movimento({ id: "2", tipo: "entrada", valor: 20, forma_pagamento: "cartao_debito" }),
        movimento({ id: "3", tipo: "entrada", valor: 30, forma_pagamento: "cartao_credito" }),
        movimento({ id: "4", tipo: "entrada", valor: 40, forma_pagamento: "PIX" }),
        movimento({ id: "5", tipo: "entrada", valor: 50, forma_pagamento: "Cartão de crédito" }),
      ],
      semCusto,
    );

    expect(r.pixECartao).toBe(150);
    expect(r.gaveta).toBe(0);
  });

  it("transferência, outro e sem forma ficam fora da gaveta e do Pix e cartão (só no saldo)", () => {
    const r = resumirDiaDoCaixa(
      [
        movimento({ id: "1", tipo: "entrada", valor: 100, forma_pagamento: "transferencia" }),
        movimento({ id: "2", tipo: "entrada", valor: 60, forma_pagamento: "outro" }),
        movimento({ id: "3", tipo: "entrada", valor: 30, forma_pagamento: null }),
        movimento({ id: "4", tipo: "saida", valor: 15, forma_pagamento: "transferencia" }),
      ],
      semCusto,
    );

    expect(r.gaveta).toBe(0);
    expect(r.pixECartao).toBe(0);
    expect(r.entradas).toBe(190);
    expect(r.saldo).toBe(175);
  });

  it("os centavos batem: 0,1 + 0,2 dá 0,3 em todos os números", () => {
    const r = resumirDiaDoCaixa(
      [
        movimento({ id: "1", tipo: "entrada", valor: 0.1, forma_pagamento: "dinheiro" }),
        movimento({ id: "2", tipo: "entrada", valor: 0.2, forma_pagamento: "dinheiro" }),
        movimento({ id: "3", tipo: "entrada", valor: 0.1, forma_pagamento: "pix" }),
        movimento({ id: "4", tipo: "entrada", valor: 0.2, forma_pagamento: "cartao_debito" }),
      ],
      semCusto,
    );

    expect(r.gaveta).toBe(0.3);
    expect(r.pixECartao).toBe(0.3);
    expect(r.entradas).toBe(0.6);
    expect(r.saldo).toBe(0.6);
    expect(r.lucro).toBe(0.6);
  });

  it("o lucro é o mesmo de sempre: entradas − saídas − custo da OS", () => {
    const venda = movimento({
      id: "os",
      tipo: "entrada",
      valor: 500,
      forma_pagamento: "pix",
      ordem_servico_id: "os-1",
      ordem_servico: { id: "os-1", numero: 1, cliente: null, itens: [] },
    });
    const r = resumirDiaDoCaixa(
      [venda, movimento({ id: "s", tipo: "saida", valor: 100, forma_pagamento: "dinheiro" })],
      (ordemId) => (ordemId === "os-1" ? 320 : 0),
    );

    // 500 − 100 − 320 = 80.
    expect(r.lucro).toBe(80);
    expect(r.saldo).toBe(400);
  });
});

describe("saidasDoMes (as despesas do mês do dia escolhido)", () => {
  it("soma as saídas do mesmo mês, por categoria; outro mês e entrada ficam de fora", () => {
    const movimentos = [
      movimento({ id: "1", tipo: "saida", valor: 1200, data: noDia(2026, 11, 3), categoria: { nome: "Aluguel" } }),
      movimento({ id: "2", tipo: "saida", valor: 80.1, data: noDia(2026, 11, 25, 22), categoria: { nome: "Luz" } }),
      movimento({ id: "3", tipo: "saida", valor: 0.2, data: noDia(2026, 11, 1, 0, 30), categoria: { nome: "Luz" } }),
      // Outro mês: o último minuto de outubro e o primeiro de dezembro.
      movimento({ id: "4", tipo: "saida", valor: 999, data: noDia(2026, 10, 31, 23, 59), categoria: { nome: "Aluguel" } }),
      movimento({ id: "5", tipo: "saida", valor: 999, data: noDia(2026, 12, 1, 0, 1), categoria: { nome: "Aluguel" } }),
      // Entrada do mesmo mês: não é despesa.
      movimento({ id: "6", tipo: "entrada", valor: 5000, data: noDia(2026, 11, 10), categoria: { nome: "Vendas" } }),
    ];

    expect(saidasDoMes(movimentos, "2026-11-25")).toEqual({
      total: 1280.3,
      porCategoria: [
        ["Aluguel", 1200],
        ["Luz", 80.3],
      ],
    });
  });

  it("a devolução da correção de OS (#1182) conta como saída; a entrada da OS não", () => {
    const movimentos = [
      movimento({ id: "d", tipo: "saida", valor: 30, ordem_servico_id: "os-1", data: noDia(2026, 11, 5), categoria: { nome: "Devolução ao cliente" } }),
      movimento({ id: "v", tipo: "entrada", valor: 300, ordem_servico_id: "os-1", data: noDia(2026, 11, 5) }),
    ];

    expect(saidasDoMes(movimentos, "2026-11-30")).toEqual({
      total: 30,
      porCategoria: [["Devolução ao cliente", 30]],
    });
  });

  it("mês sem saída dá zero e lista vazia", () => {
    expect(saidasDoMes([], "2026-11-25")).toEqual({ total: 0, porCategoria: [] });
  });
});

// A promessa do fechamento em uma frase: o "esperado na gaveta" conta SÓ o
// que passa pela gaveta, fecha no centavo, e depois de fechado passa a bater
// com o contado sozinho (porque a diferença vira lançamento em dinheiro).
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MovimentoCaixa } from "@/types/caixa";
import {
  diferencaDoFechamento,
  ehDinheiro,
  fundoSugerido,
  lancamentosDepoisDoFechamento,
  momentoDoLancamento,
  resumirDiaParaFechamento,
  situacaoDaDiferenca,
  somarDiferencas,
  totaisParaGravar,
  totaisPorFormaDePagamento,
} from "./fechamentoCaixa";

let proximo = 0;
function mov(tipo: "entrada" | "saida", valor: number, forma: string | null, data = "2026-09-20T15:00:00Z"): MovimentoCaixa {
  proximo++;
  return {
    id: `m${proximo}`,
    loja_id: "l",
    data,
    ordem_servico_id: null,
    tipo,
    forma_pagamento: forma,
    valor,
    descricao: null,
    categoria_id: null,
  };
}

describe("ehDinheiro", () => {
  it("aceita a chave gravada e os jeitos comuns de escrever no lançamento manual", () => {
    for (const f of ["dinheiro", "Dinheiro", " DINHEIRO ", "espécie", "Em espécie", "din"]) {
      expect(ehDinheiro(f), f).toBe(true);
    }
    for (const f of ["pix", "cartao_credito", "Cartão de débito", "", null, undefined, "dinheiro e pix"]) {
      expect(ehDinheiro(f), String(f)).toBe(false);
    }
  });
});

describe("resumirDiaParaFechamento", () => {
  it("esperado = fundo + entradas em dinheiro − saídas em dinheiro; Pix e cartão ficam de fora", () => {
    const r = resumirDiaParaFechamento(
      [
        mov("entrada", 150, "dinheiro"),
        mov("entrada", 300, "pix"),
        mov("entrada", 89.9, "Dinheiro"),
        mov("saida", 40, "dinheiro"),
        mov("entrada", 1200, "cartao_credito"),
        mov("saida", 500, "pix"),
      ],
      100,
    );
    expect(r.entradasDinheiro).toBe(239.9);
    expect(r.saidasDinheiro).toBe(40);
    expect(r.esperado).toBe(299.9);
    expect(r.outrasFormas).toEqual([
      { forma: "cartao_credito", rotulo: "Cartão de crédito", entradas: 1200, saidas: 0 },
      { forma: "pix", rotulo: "Pix", entradas: 300, saidas: 500 },
    ]);
    expect(r.semForma.quantidade).toBe(0);
  });

  it("'Pix', 'PIX' e 'pix' são a mesma forma; 'Cartão de crédito' é a chave cartao_credito", () => {
    const r = resumirDiaParaFechamento(
      [
        mov("entrada", 10, "pix"),
        mov("entrada", 20, "Pix"),
        mov("entrada", 30, " PIX "),
        mov("entrada", 40, "cartao_credito"),
        mov("entrada", 50, "Cartão de crédito"),
      ],
      0,
    );
    expect(r.outrasFormas).toEqual([
      { forma: "cartao_credito", rotulo: "Cartão de crédito", entradas: 90, saidas: 0 },
      { forma: "pix", rotulo: "Pix", entradas: 60, saidas: 0 },
    ]);
  });

  it("lançamento SEM forma não entra na conta, mas aparece à parte", () => {
    const r = resumirDiaParaFechamento([mov("saida", 25, null), mov("entrada", 10, "  ")], 50);
    expect(r.esperado).toBe(50);
    expect(r.semForma).toEqual({ quantidade: 2, entradas: 10, saidas: 25 });
  });

  it("fundo negativo ou vazio vira zero (não dá pra ter menos que nada na gaveta)", () => {
    expect(resumirDiaParaFechamento([], -30).esperado).toBe(0);
    expect(resumirDiaParaFechamento([], Number.NaN).esperado).toBe(0);
  });

  it("fecha no centavo, sem cauda de ponto flutuante, com qualquer mistura de lançamentos", () => {
    const centavos = fc.integer({ min: 1, max: 5_000_00 }).map((c) => c / 100);
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.constantFrom("entrada", "saida"), centavos, fc.constantFrom("dinheiro", "pix", null)), {
          maxLength: 40,
        }),
        centavos,
        (linhas, fundo) => {
          const movimentos = linhas.map(([t, v, f]) => mov(t as "entrada" | "saida", v, f));
          const r = resumirDiaParaFechamento(movimentos, fundo);
          // o esperado é exatamente um número de centavos
          expect(Math.round(r.esperado * 100) / 100).toBe(r.esperado);
          // e só depende das linhas em dinheiro
          const soDinheiro = resumirDiaParaFechamento(
            movimentos.filter((m) => m.forma_pagamento === "dinheiro"),
            fundo,
          );
          expect(r.esperado).toBe(soDinheiro.esperado);
        },
      ),
    );
  });

  it("depois de fechado, a quebra (em dinheiro) faz o esperado bater com o contado", () => {
    const dia = [mov("entrada", 850, "dinheiro")];
    const antes = resumirDiaParaFechamento(dia, 0);
    const contado = 830;
    const dif = diferencaDoFechamento(antes.esperado, contado);
    expect(dif).toBe(-20);
    // é o lançamento que fechar_caixa() grava
    const depois = resumirDiaParaFechamento([...dia, mov("saida", Math.abs(dif), "dinheiro")], 0);
    expect(depois.esperado).toBe(contado);
  });
});

describe("totaisParaGravar", () => {
  it("guarda o líquido de cada forma, dinheiro incluído", () => {
    const r = resumirDiaParaFechamento([mov("entrada", 100, "dinheiro"), mov("entrada", 50, "pix"), mov("saida", 20, "pix")], 0);
    expect(totaisParaGravar(r)).toEqual({ dinheiro: 100, pix: 30 });
  });
});

describe("diferença", () => {
  it("contado − esperado, no centavo", () => {
    expect(diferencaDoFechamento(0.3, 0.1 + 0.2)).toBe(0);
    expect(diferencaDoFechamento(100, 99.99)).toBe(-0.01);
    expect(situacaoDaDiferenca(0)).toBe("bateu");
    expect(situacaoDaDiferenca(-0.01)).toBe("faltou");
    expect(situacaoDaDiferenca(5)).toBe("sobrou");
  });

  it("soma as diferenças de um período", () => {
    expect(somarDiferencas([{ diferenca: -0.1 }, { diferenca: -0.2 }, { diferenca: 5 }])).toBe(4.7);
  });
});

describe("momentoDoLancamento", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("hoje: nulo (o banco usa a hora de agora)", () => {
    expect(momentoDoLancamento("2026-09-25", "2026-09-25")).toBeNull();
  });

  it("dia que passou: o fim daquele dia no fuso LOCAL, não em UTC", () => {
    const momento = momentoDoLancamento("2026-09-20", "2026-09-21");
    expect(momento).not.toBeNull();
    const d = new Date(momento as string);
    // lido de volta no fuso de quem usa, é o dia 20 às 23:59 — em qualquer fuso
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 20, 23, 59]);
  });
});

describe("lancamentosDepoisDoFechamento", () => {
  it("marca o que entrou depois de fechar, menos a própria quebra", () => {
    const antes = mov("entrada", 10, "dinheiro", "2026-09-20T18:00:00Z");
    const quebra = mov("saida", 5, "dinheiro", "2026-09-20T21:00:05Z");
    const depois = mov("entrada", 70, "dinheiro", "2026-09-20T22:30:00Z");
    const fechamento = { criado_em: "2026-09-20T21:00:00Z", caixa_movimento_id: quebra.id };
    expect(lancamentosDepoisDoFechamento([antes, quebra, depois], fechamento).map((m) => m.id)).toEqual([depois.id]);
    expect(lancamentosDepoisDoFechamento([antes, depois], null)).toEqual([]);
  });
});

describe("fundoSugerido", () => {
  it("o fundo do fechamento mais recente ANTES do dia", () => {
    const fechamentos = [
      { data: "2026-09-18", fundo_troco: 80 },
      { data: "2026-09-19", fundo_troco: 100 },
      { data: "2026-09-21", fundo_troco: 150 },
    ];
    expect(fundoSugerido(fechamentos, "2026-09-20")).toBe(100);
    expect(fundoSugerido(fechamentos, "2026-09-10")).toBe(0);
    expect(fundoSugerido([], "2026-09-20")).toBe(0);
  });
});

describe("totaisPorFormaDePagamento (Caixa → Diário, #875)", () => {
  it("só entradas; junta chave e texto livre da mesma forma; do maior pro menor", () => {
    const movimentos = [
      mov("entrada", 50, "pix"),
      mov("entrada", 20.5, "Pix"),
      mov("entrada", 100, "cartao_debito"),
      mov("saida", 999, "pix"),
      mov("entrada", 7, null),
    ];
    expect(totaisPorFormaDePagamento(movimentos)).toEqual([
      ["Cartão de débito", 100],
      ["Pix", 70.5],
      ["Não informado", 7],
    ]);
  });

  it("o rótulo é o do primeiro lançamento daquela forma", () => {
    expect(totaisPorFormaDePagamento([mov("entrada", 1, "Dinheiro vivo")])).toEqual([
      ["Dinheiro vivo", 1],
    ]);
  });

  it("sem entrada, lista vazia", () => {
    expect(totaisPorFormaDePagamento([mov("saida", 5, "pix")])).toEqual([]);
  });
});

// A promessa do fechamento em uma frase: o "esperado na gaveta" conta SÓ o
// que passa pela gaveta, fecha no centavo, e depois de fechado passa a bater
// com o contado sozinho (porque a diferença vira lançamento em dinheiro).
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MovimentoCaixa } from "@/types/caixa";
import {
  diferencaDoFechamento,
  ehPrimeiroFechamento,
  fraseDaDiferenca,
  NOTAS_DA_GAVETA,
  somarAGaveta,
  ehDinheiro,
  fundoSugerido,
  lancamentosDepoisDoFechamento,
  momentoDoLancamento,
  resumirDiaParaFechamento,
  rotuloDaForma,
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

describe("rotuloDaForma", () => {
  it("dá nome às seis formas da lista do lançamento manual (#1089)", () => {
    expect(rotuloDaForma("dinheiro")).toBe("Dinheiro");
    expect(rotuloDaForma("pix")).toBe("Pix");
    expect(rotuloDaForma("cartao_debito")).toBe("Cartão de débito");
    expect(rotuloDaForma("cartao_credito")).toBe("Cartão de crédito");
    expect(rotuloDaForma("transferencia")).toBe("Transferência");
    expect(rotuloDaForma("outro")).toBe("Outro");
  });

  it("o texto livre antigo aparece como foi escrito; o que tem chave conhecida ganha o nome certo", () => {
    expect(rotuloDaForma("Vale da loja")).toBe("Vale da loja");
    expect(rotuloDaForma("PIX")).toBe("Pix");
    expect(rotuloDaForma("Transferência")).toBe("Transferência");
  });
});

describe("resumirDiaParaFechamento", () => {
  it("a devolução em dinheiro ligada a uma OS (#1182) sai da gaveta no esperado", () => {
    const devolucao = { ...mov("saida", 50, "dinheiro"), ordem_servico_id: "os-1" };
    const r = resumirDiaParaFechamento([mov("entrada", 200, "dinheiro"), devolucao], 100);
    expect(r.saidasDinheiro).toBe(50);
    expect(r.esperado).toBe(250);
  });

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

// #1090 — o fechamento passo a passo: a ajuda pra contar as notas e a
// diferença em palavras. A conta do fechamento não muda; estas só ajudam a
// chegar no "contado" e a dizer o resultado.
describe("somarAGaveta (a ajuda pra contar as notas)", () => {
  it("soma quantas notas de cada valor mais as moedas, no centavo", () => {
    const r = somarAGaveta({ "100": "2", "50": "1", "20": "3", "2": "4" }, "3,75");
    expect(r.total).toBe(321.75); // 200 + 50 + 60 + 8 + 3,75
    expect(r.linhas.find((l) => l.nota === 100)).toEqual({ nota: 100, quantidade: 2, valor: 200 });
    expect(r.linhas.find((l) => l.nota === 5)).toEqual({ nota: 5, quantidade: 0, valor: 0 });
    expect(r.moedas).toBe(3.75);
  });

  it("traz as notas que existem, da maior pra menor", () => {
    expect(somarAGaveta({}, "").linhas.map((l) => l.nota)).toEqual([200, 100, 50, 20, 10, 5, 2]);
    expect(NOTAS_DA_GAVETA).toEqual([200, 100, 50, 20, 10, 5, 2]);
  });

  it("campo vazio, negativo ou com letra conta zero; quantidade quebrada vira a parte inteira", () => {
    const r = somarAGaveta({ "100": "", "50": "-2", "20": "abc", "10": "1.9" }, "-5");
    expect(r.total).toBe(10);
    expect(r.moedas).toBe(0);
  });

  it("moedas aceitam vírgula ou ponto e fecham no centavo", () => {
    expect(somarAGaveta({}, "0,1").total).toBe(0.1);
    expect(somarAGaveta({}, "0.35").total).toBe(0.35);
    // 0,1 + 0,2 no ponto flutuante daria 0,30000000000000004
    expect(somarAGaveta({ "2": "1" }, "0,3").total).toBe(2.3);
  });
});

describe("fraseDaDiferenca (o resultado em palavras)", () => {
  it("falta, sobra e bateu, com o valor sem sinal", () => {
    expect(fraseDaDiferenca(-69)).toEqual({ situacao: "faltou", frase: "Faltam R$ 69,00" });
    expect(fraseDaDiferenca(5)).toEqual({ situacao: "sobrou", frase: "Sobram R$ 5,00" });
    expect(fraseDaDiferenca(0)).toEqual({ situacao: "bateu", frase: "Bateu certinho" });
  });

  it("um centavo já é falta (não arredonda pra 'bateu')", () => {
    expect(fraseDaDiferenca(diferencaDoFechamento(100, 99.99)).frase).toBe("Faltam R$ 0,01");
  });
});

describe("ehPrimeiroFechamento (a frase do troco da primeira vez)", () => {
  it("sem fechamento antes do dia: é o primeiro", () => {
    expect(ehPrimeiroFechamento([], "2026-11-25")).toBe(true);
    // um fechamento DEPOIS (fechando um dia antigo) não conta como anterior
    expect(ehPrimeiroFechamento([{ data: "2026-11-26" }], "2026-11-25")).toBe(true);
    // o próprio dia também não
    expect(ehPrimeiroFechamento([{ data: "2026-11-25" }], "2026-11-25")).toBe(true);
  });

  it("com algum fechamento antes: não é", () => {
    expect(ehPrimeiroFechamento([{ data: "2026-11-24" }], "2026-11-25")).toBe(false);
  });
});

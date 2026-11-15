import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DIAS_MINIMOS_PARA_O_FIO, serieDoMesPorDia } from "./serieDoMes";
import { janelaDoMesAteODia, metricasDoPeriodo, valoresPorCartao } from "./painelInicio";
import type { CustoDaOrdem } from "./metricasCaixa";
import type { CartaoMetrica } from "@/types/configuracao";
import type { MovimentoCaixa } from "@/types/caixa";

/*
 * Portas testadas (teste-primeiro):
 * - serieDoMesPorDia: o fio de cada cartão. Pega: último ponto diferente do
 *   cartão, dia errado por fuso, lançamento de outro mês, custo/ticket de OS
 *   dividida contado duas vezes, regra do "não dá pra desenhar" (null).
 *   Não pega: o desenho do fio na tela (isso é da tela).
 *
 * As datas são montadas no fuso da máquina (new Date(ano, mês, dia, hora)),
 * que é o fuso de quem usa o sistema. O `npm run test:fusos` roda isto em
 * America/Sao_Paulo e em UTC.
 */

const CARTOES_COM_SERIE: CartaoMetrica[] = [
  "vendas_mes",
  "custos_mes",
  "lucro_mes",
  "ticket_medio_mes",
];

let contador = 0;

function lancamento(
  tipo: "entrada" | "saida",
  data: Date,
  valor: number,
  ordemId: string | null = null,
  balcao = false,
): MovimentoCaixa {
  contador += 1;
  return {
    id: `mov-${contador}`,
    loja_id: "loja",
    data: data.toISOString(),
    ordem_servico_id: ordemId,
    tipo,
    forma_pagamento: null,
    valor,
    descricao: null,
    categoria_id: null,
    ordem_servico: ordemId
      ? {
          id: ordemId,
          numero: 1,
          tipo: balcao ? "venda_balcao" : "os",
          cliente: null,
          itens: [],
        }
      : null,
  } as MovimentoCaixa;
}

const entrada = (data: Date, valor: number, ordemId: string | null = null, balcao = false) =>
  lancamento("entrada", data, valor, ordemId, balcao);
const saida = (data: Date, valor: number) => lancamento("saida", data, valor);

function custoFixo(custos: Record<string, number>): CustoDaOrdem {
  return (ordemId) => custos[ordemId] ?? 0;
}

/** O número que o cartão mostra hoje, pela conta que a tela já usa. */
function valorDoCartao(
  movimentos: MovimentoCaixa[],
  referencia: Date,
  custo: CustoDaOrdem,
  cartao: CartaoMetrica,
): number {
  const metricas = metricasDoPeriodo(movimentos, janelaDoMesAteODia(referencia), custo);
  return valoresPorCartao(metricas, 0)[cartao];
}

describe("serieDoMesPorDia — o último ponto é o número do cartão", () => {
  // Novembro de 2026; referência dia 10 às 15h.
  const referencia = new Date(2026, 10, 10, 15, 0);
  const custo = custoFixo({ os1: 120.37, os2: 55.1 });
  const movimentos = [
    entrada(new Date(2026, 10, 2, 9, 0), 300.1, "os1"),
    entrada(new Date(2026, 10, 2, 9, 5), 99.9, "os1"),
    saida(new Date(2026, 10, 4, 11, 0), 80.33),
    entrada(new Date(2026, 10, 7, 16, 0), 210.2, "os2"),
    entrada(new Date(2026, 10, 8, 10, 0), 45, "bal1", true),
    entrada(new Date(2026, 10, 10, 14, 0), 12.5),
  ];

  for (const cartao of CARTOES_COM_SERIE) {
    it(`${cartao}: um ponto por dia e o último igual ao cartão`, () => {
      const serie = serieDoMesPorDia(movimentos, referencia, custo, cartao);
      expect(serie).not.toBeNull();
      expect(serie).toHaveLength(10);
      expect(serie![9]).toBe(valorDoCartao(movimentos, referencia, custo, cartao));
    });

    it(`${cartao}: cada dia D é o que o cartão mostraria se hoje fosse D`, () => {
      const serie = serieDoMesPorDia(movimentos, referencia, custo, cartao)!;
      serie.forEach((valor, i) => {
        const diaD = new Date(2026, 10, i + 1, 12, 0);
        expect(valor).toBe(valorDoCartao(movimentos, diaD, custo, cartao));
      });
    });
  }

  it("dia sem lançamento repete o acumulado anterior", () => {
    const serie = serieDoMesPorDia(movimentos, referencia, custo, "vendas_mes")!;
    expect(serie[0]).toBe(0); // dia 1, nada ainda
    expect(serie[2]).toBe(serie[1]); // dia 3 repete o 2
    expect(serie[5]).toBe(serie[4]); // dia 6 repete o 5
  });
});

describe("serieDoMesPorDia — propriedade: bate com o cartão em qualquer mês", () => {
  it("o último ponto é === ao cartão e todo ponto é o cartão daquele dia", () => {
    const umLancamento = fc.record({
      tipo: fc.constantFrom("entrada" as const, "saida" as const),
      // Mês -1, 0 (o da referência) e +1, pra lançamento de fora também entrar no sorteio.
      deslocamentoDoMes: fc.integer({ min: -1, max: 1 }),
      dia: fc.integer({ min: 1, max: 31 }),
      hora: fc.integer({ min: 0, max: 23 }),
      minuto: fc.integer({ min: 0, max: 59 }),
      centavos: fc.integer({ min: 1, max: 500_000 }),
      ordem: fc.option(fc.constantFrom("a", "b", "c", "d"), { nil: null }),
      balcao: fc.boolean(),
    });

    fc.assert(
      fc.property(
        fc.integer({ min: 2024, max: 2027 }),
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 1, max: 31 }),
        fc.array(umLancamento, { maxLength: 25 }),
        fc.constantFrom(...CARTOES_COM_SERIE),
        (ano, mes, diaPedido, sorteados, cartao) => {
          const ultimoDia = new Date(ano, mes + 1, 0).getDate();
          const dia = Math.min(diaPedido, ultimoDia);
          const referencia = new Date(ano, mes, dia, 18, 0);
          const movimentos = sorteados.map((s) => {
            const ultimoDoMes = new Date(ano, mes + s.deslocamentoDoMes + 1, 0).getDate();
            const data = new Date(
              ano,
              mes + s.deslocamentoDoMes,
              Math.min(s.dia, ultimoDoMes),
              s.hora,
              s.minuto,
            );
            const valor = s.centavos / 100;
            return s.tipo === "saida"
              ? saida(data, valor)
              : entrada(data, valor, s.ordem, s.ordem !== null && s.balcao);
          });
          const custo = custoFixo({ a: 10.1, b: 33.33, c: 0.07, d: 250 });

          const serie = serieDoMesPorDia(movimentos, referencia, custo, cartao);
          if (serie === null) return; // as regras do null têm teste próprio

          expect(serie).toHaveLength(dia);
          expect(serie[dia - 1]).toBe(valorDoCartao(movimentos, referencia, custo, cartao));
          serie.forEach((valor, i) => {
            expect(valor).toBe(
              valorDoCartao(movimentos, new Date(ano, mes, i + 1, 9, 0), custo, cartao),
            );
          });
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("serieDoMesPorDia — o dia de cada lançamento", () => {
  it("23:30 do dia 31 cai no dia 31, e 00:10 do dia 1 cai no dia 1 do mês seguinte", () => {
    // Outubro de 2026 tem 31 dias.
    const noFimDoDia31 = entrada(new Date(2026, 9, 31, 23, 30), 100);
    const noComecoDoDia1 = entrada(new Date(2026, 10, 1, 0, 10), 7);
    const outrosDeOutubro = [entrada(new Date(2026, 9, 2, 10, 0), 50)];

    const outubro = serieDoMesPorDia(
      [...outrosDeOutubro, noFimDoDia31, noComecoDoDia1],
      new Date(2026, 9, 31, 23, 59),
      custoFixo({}),
      "vendas_mes",
    )!;
    expect(outubro).toHaveLength(31);
    expect(outubro[29]).toBe(50); // dia 30: os 100 ainda não entraram
    expect(outubro[30]).toBe(150); // dia 31: entraram; os 7 de novembro não

    const novembro = serieDoMesPorDia(
      [noFimDoDia31, noComecoDoDia1],
      new Date(2026, 10, 3, 8, 0),
      custoFixo({}),
      "vendas_mes",
    )!;
    expect(novembro).toEqual([7, 7, 7]); // os 100 do dia 31/10 ficam fora
  });

  it("lançamento do mesmo mês em outro ano não entra", () => {
    const serie = serieDoMesPorDia(
      [entrada(new Date(2025, 10, 2, 10, 0), 999), entrada(new Date(2026, 10, 2, 10, 0), 1)],
      new Date(2026, 10, 3),
      custoFixo({}),
      "vendas_mes",
    );
    expect(serie).toEqual([0, 1, 1]);
  });

  it("lançamento depois da referência (mesmo mês) não entra", () => {
    const serie = serieDoMesPorDia(
      [entrada(new Date(2026, 10, 2, 10, 0), 1), entrada(new Date(2026, 10, 20, 10, 0), 500)],
      new Date(2026, 10, 3),
      custoFixo({}),
      "vendas_mes",
    );
    expect(serie).toEqual([0, 1, 1]);
  });

  it.each([
    [2026, 1, 28], // fevereiro comum
    [2028, 1, 29], // fevereiro bissexto
    [2026, 3, 30], // abril
    [2026, 11, 31], // dezembro
  ])("no último dia de %i-%i a série tem %i pontos", (ano, mes, dias) => {
    const serie = serieDoMesPorDia(
      [entrada(new Date(ano, mes, dias, 23, 30), 10)],
      new Date(ano, mes, dias, 23, 45),
      custoFixo({}),
      "vendas_mes",
    )!;
    expect(serie).toHaveLength(dias);
    expect(serie[dias - 1]).toBe(10);
    expect(serie[dias - 2]).toBe(0);
  });
});

describe("serieDoMesPorDia — quando não há fio honesto (null)", () => {
  const movimentos = [entrada(new Date(2026, 10, 1, 10, 0), 100)];

  it("o mínimo de dias é 3", () => {
    expect(DIAS_MINIMOS_PARA_O_FIO).toBe(3);
  });

  it("dia 1 e dia 2 → null; dia 3 → três pontos", () => {
    const custo = custoFixo({});
    expect(serieDoMesPorDia(movimentos, new Date(2026, 10, 1, 20), custo, "vendas_mes")).toBeNull();
    expect(serieDoMesPorDia(movimentos, new Date(2026, 10, 2, 20), custo, "vendas_mes")).toBeNull();
    expect(serieDoMesPorDia(movimentos, new Date(2026, 10, 3, 20), custo, "vendas_mes")).toEqual([
      100, 100, 100,
    ]);
  });

  it("sem nenhum lançamento no mês até a referência → null", () => {
    // Dia 5 de outubro: o dia é menor que o da referência, só o mês é outro.
    const deOutroMes = [entrada(new Date(2026, 9, 5, 10, 0), 100)];
    const depoisDaReferencia = [entrada(new Date(2026, 10, 25, 10, 0), 100)];
    for (const cartao of CARTOES_COM_SERIE) {
      expect(serieDoMesPorDia([], new Date(2026, 10, 10), custoFixo({}), cartao)).toBeNull();
      expect(serieDoMesPorDia(deOutroMes, new Date(2026, 10, 10), custoFixo({}), cartao)).toBeNull();
      expect(
        serieDoMesPorDia(depoisDaReferencia, new Date(2026, 10, 10), custoFixo({}), cartao),
      ).toBeNull();
    }
  });

  it("contas_pagar_vencendo não tem série → null", () => {
    expect(
      serieDoMesPorDia(movimentos, new Date(2026, 10, 10), custoFixo({}), "contas_pagar_vencendo"),
    ).toBeNull();
  });
});

describe("serieDoMesPorDia — as armadilhas do Caixa", () => {
  it("OS paga em duas formas, em dias diferentes: custo uma vez, ticket de uma OS", () => {
    const movimentos = [
      entrada(new Date(2026, 10, 2, 10, 0), 300, "os1"),
      entrada(new Date(2026, 10, 4, 10, 0), 200, "os1"),
    ];
    const custo = custoFixo({ os1: 150 });
    const referencia = new Date(2026, 10, 5);

    const custos = serieDoMesPorDia(movimentos, referencia, custo, "custos_mes")!;
    expect(custos).toEqual([0, 150, 150, 150, 150]);

    const ticket = serieDoMesPorDia(movimentos, referencia, custo, "ticket_medio_mes")!;
    expect(ticket).toEqual([0, 300, 300, 500, 500]);

    const lucro = serieDoMesPorDia(movimentos, referencia, custo, "lucro_mes")!;
    expect(lucro).toEqual([0, 150, 150, 350, 350]);
  });

  it("saída lançada à mão baixa o lucro no dia dela", () => {
    const movimentos = [
      entrada(new Date(2026, 10, 1, 10, 0), 1000),
      saida(new Date(2026, 10, 3, 10, 0), 400),
    ];
    const lucro = serieDoMesPorDia(movimentos, new Date(2026, 10, 4), custoFixo({}), "lucro_mes")!;
    expect(lucro).toEqual([1000, 1000, 600, 600]);

    const custos = serieDoMesPorDia(movimentos, new Date(2026, 10, 4), custoFixo({}), "custos_mes")!;
    expect(custos).toEqual([0, 0, 400, 400]);
  });

  it("um mês só de saídas também desenha (lançamento de saída conta)", () => {
    const serie = serieDoMesPorDia(
      [saida(new Date(2026, 10, 2, 10, 0), 30)],
      new Date(2026, 10, 3),
      custoFixo({}),
      "lucro_mes",
    );
    expect(serie).toEqual([0, -30, -30]);
  });
});

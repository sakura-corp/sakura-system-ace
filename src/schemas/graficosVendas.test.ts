import { describe, expect, it } from "vitest";
import {
  seriesVendasCustosLucro,
  totaisRecebidos,
  totaisRecebidosPorDia,
  type MovimentoDoGrafico,
} from "./graficosVendas";

// Datas montadas no horário LOCAL e passadas a ISO, como o banco devolve: o
// teste roda nos dois fusos (npm run test:fusos) e tem que dar igual.
function em(ano: number, mes: number, dia: number, hora = 12): string {
  return new Date(ano, mes - 1, dia, hora).toISOString();
}

function entrada(data: string, valor: number, ordem: string | null = null): MovimentoDoGrafico {
  return { data, tipo: "entrada", valor, ordem_servico_id: ordem };
}

function saida(data: string, valor: number): MovimentoDoGrafico {
  return { data, tipo: "saida", valor, ordem_servico_id: null };
}

// Quinta-feira, 05/11/2026: a semana começa na segunda, 02/11.
const HOJE = new Date(2026, 10, 5, 15);

describe("totaisRecebidosPorDia", () => {
  it("soma as entradas de cada dia local, do dia mais novo pro mais velho", () => {
    const entradas = [
      entrada(em(2026, 11, 3), 10),
      entrada(em(2026, 11, 5, 9), 20.5),
      entrada(em(2026, 11, 5, 22), 4.5),
    ];
    expect(totaisRecebidosPorDia(entradas)).toEqual([
      ["2026-11-05", 25],
      ["2026-11-03", 10],
    ]);
  });
});

describe("totaisRecebidos", () => {
  it("hoje, semana (desde segunda), mês e ano", () => {
    const entradas = [
      entrada(em(2026, 11, 5, 8), 100), // hoje
      entrada(em(2026, 11, 2, 1), 50), // segunda, entra na semana
      entrada(em(2026, 11, 1, 23), 30), // domingo: mês, não semana
      entrada(em(2026, 10, 31), 7), // outubro: só ano
      entrada(em(2025, 12, 31), 1000), // ano passado: nada
    ];
    expect(totaisRecebidos(entradas, HOJE)).toEqual({
      hoje: 100,
      semana: 150,
      mes: 180,
      ano: 187,
    });
  });

  it("sem entrada nenhuma, tudo zero", () => {
    expect(totaisRecebidos([], HOJE)).toEqual({ hoje: 0, semana: 0, mes: 0, ano: 0 });
  });
});

describe("seriesVendasCustosLucro", () => {
  const custoPorOrdem = new Map([["os-1", 40]]);

  it("mensal: 6 colunas; o custo da OS entra uma vez por período mesmo com pagamento dividido", () => {
    const movimentos = [
      entrada(em(2026, 11, 3), 60, "os-1"),
      entrada(em(2026, 11, 3), 40, "os-1"), // mesma OS, outra forma de pagamento
      saida(em(2026, 11, 4), 15),
      entrada(em(2026, 10, 10), 25),
    ];
    const r = seriesVendasCustosLucro(movimentos, "mensal", HOJE, custoPorOrdem);
    expect(r.categorias).toEqual(["Jun/26", "Jul/26", "Ago/26", "Set/26", "Out/26", "Nov/26"]);
    expect(r.vendas).toEqual([0, 0, 0, 0, 25, 100]);
    expect(r.custos).toEqual([0, 0, 0, 0, 0, 55]);
    expect(r.lucro).toEqual([0, 0, 0, 0, 25, 45]);
  });

  it("anual: 5 anos, o último é o de hoje", () => {
    const r = seriesVendasCustosLucro([entrada(em(2024, 3, 1), 9)], "anual", HOJE, new Map());
    expect(r.categorias).toEqual(["2022", "2023", "2024", "2025", "2026"]);
    expect(r.vendas).toEqual([0, 0, 9, 0, 0]);
  });

  it("diário: 14 colunas, terminando hoje", () => {
    const r = seriesVendasCustosLucro([entrada(em(2026, 11, 5), 3)], "diario", HOJE, new Map());
    expect(r.categorias).toHaveLength(14);
    expect(r.categorias[13]).toBe("05/11");
    expect(r.vendas[13]).toBe(3);
  });

  it("semanal: 8 colunas, rotuladas pela segunda-feira", () => {
    const r = seriesVendasCustosLucro([entrada(em(2026, 11, 4), 8)], "semanal", HOJE, new Map());
    expect(r.categorias).toHaveLength(8);
    expect(r.categorias[7]).toBe("02/11");
    expect(r.vendas[7]).toBe(8);
  });
});

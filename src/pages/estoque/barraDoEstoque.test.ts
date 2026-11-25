import { describe, expect, it } from "vitest";
import { lerBarraDoEstoque, ultimaSaidaPorPeca } from "./barraDoEstoque";
import type { MovimentoEstoque } from "@/types/estoque";

describe("lerBarraDoEstoque — a barra do estoque contra o mínimo (#1093)", () => {
  it("abaixo do mínimo: vermelho, 'falta N' e precisa comprar", () => {
    const barra = lerBarraDoEstoque(7, 10);
    expect(barra.tom).toBe("falta");
    expect(barra.palavra).toBe("falta 3");
    expect(barra.precisaComprar).toBe(true);
    expect(barra.preenchido).toBeCloseTo(0.35);
  });

  it("igual ao mínimo: ainda é hora de comprar ('no mínimo')", () => {
    const barra = lerBarraDoEstoque(10, 10);
    expect(barra.tom).toBe("falta");
    expect(barra.palavra).toBe("no mínimo");
    expect(barra.precisaComprar).toBe(true);
  });

  it("zerado com mínimo: falta o mínimo inteiro", () => {
    const barra = lerBarraDoEstoque(0, 4);
    expect(barra.tom).toBe("falta");
    expect(barra.palavra).toBe("falta 4");
    expect(barra.preenchido).toBe(0);
  });

  it("perto do mínimo (até 1,5 vez): amarelo, sem 'Comprar'", () => {
    const barra = lerBarraDoEstoque(14, 10);
    expect(barra.tom).toBe("perto");
    expect(barra.palavra).toBe("perto do mínimo");
    expect(barra.precisaComprar).toBe(false);
  });

  it("folgado: verde 'ok', e a barra não passa de cheia", () => {
    const barra = lerBarraDoEstoque(40, 10);
    expect(barra.tom).toBe("ok");
    expect(barra.palavra).toBe("ok");
    expect(barra.preenchido).toBe(1);
  });

  it("sem mínimo cadastrado: sem barra e sem alarme", () => {
    const barra = lerBarraDoEstoque(5, null);
    expect(barra.tom).toBe("sem_minimo");
    expect(barra.preenchido).toBeNull();
    expect(barra.precisaComprar).toBe(false);
  });

  it("zerado sem mínimo: 'sem estoque' (atenção), mas não manda comprar", () => {
    const barra = lerBarraDoEstoque(0, null);
    expect(barra.tom).toBe("sem_estoque");
    expect(barra.palavra).toBe("sem estoque");
    expect(barra.precisaComprar).toBe(false);
  });

  it("negativo: erro de lançamento, manda pra Contagem e não pra compra", () => {
    const barra = lerBarraDoEstoque(-2, 10);
    expect(barra.tom).toBe("negativo");
    expect(barra.palavra).toBe("negativo");
    expect(barra.precisaComprar).toBe(false);
  });

  it("negativo sem mínimo: sem barra (não há risquinho de mínimo pra mostrar)", () => {
    expect(lerBarraDoEstoque(-1, null).preenchido).toBeNull();
    expect(lerBarraDoEstoque(-1, 4).preenchido).toBe(0);
  });

  it("quantidade quebrada sai com vírgula: 'falta 1,5'", () => {
    expect(lerBarraDoEstoque(2.5, 4).palavra).toBe("falta 1,5");
  });
});

function mov(extra: Partial<MovimentoEstoque>): MovimentoEstoque {
  return {
    id: "m",
    loja_id: "l",
    deposito_id: "d",
    peca_id: "a",
    tipo: "saida",
    quantidade: 1,
    motivo: "uso_em_os",
    referencia: null,
    criado_em: "2026-11-01T12:00:00.000Z",
    ...extra,
  };
}

describe("ultimaSaidaPorPeca", () => {
  it("guarda a saída mais nova de cada peça, ignorando entradas", () => {
    const mapa = ultimaSaidaPorPeca([
      mov({ id: "1", criado_em: "2026-11-01T12:00:00.000Z" }),
      mov({ id: "2", criado_em: "2026-11-20T12:00:00.000Z" }),
      mov({ id: "3", tipo: "entrada", criado_em: "2026-11-24T12:00:00.000Z" }),
      mov({ id: "4", peca_id: "b", criado_em: "2026-10-05T12:00:00.000Z" }),
    ]);
    expect(mapa.get("a")).toBe("2026-11-20T12:00:00.000Z");
    expect(mapa.get("b")).toBe("2026-10-05T12:00:00.000Z");
  });

  it("peça só com entradas não aparece", () => {
    expect(ultimaSaidaPorPeca([mov({ tipo: "entrada" })]).has("a")).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// #897: categorizar muitos lançamentos de uma vez (atalho "aplicar a todos os
// vazios"). O banco de mentira faz o que o Supabase faz: recusa uma lista de
// ids grande demais no endereço (aqui, acima de 200) e corta a resposta em
// 1.000 linhas.
const LIMITE_DE_LINHAS = 1000;
const LIMITE_DE_IDS = 200;

let movimentos: { id: string; categoria_id: string | null }[] = [];
const pedidos: number[] = [];

function construtor() {
  let dados: { categoria_id: string } | null = null;
  let ids: string[] = [];
  const q = {
    update(d: { categoria_id: string }) {
      dados = d;
      return q;
    },
    in(_coluna: string, valores: string[]) {
      ids = valores;
      return q;
    },
    select: () => q,
    then(ok: (v: unknown) => unknown, falhou?: (e: unknown) => unknown) {
      pedidos.push(ids.length);
      if (ids.length > LIMITE_DE_IDS) {
        return Promise.resolve({ data: null, error: { message: "414 URI Too Long" } }).then(ok, falhou);
      }
      const alvo = new Set(ids);
      const mudados = movimentos.filter((m) => alvo.has(m.id));
      for (const m of mudados) m.categoria_id = dados!.categoria_id;
      const data = mudados.slice(0, LIMITE_DE_LINHAS).map((m) => ({ id: m.id }));
      return Promise.resolve({ data, error: null }).then(ok, falhou);
    },
  };
  return q;
}

vi.mock("./supabase", () => ({ supabase: { from: () => construtor() } }));

const { definirCategoriaDosMovimentos } = await import("./caixa");

function ids(n: number) {
  return Array.from({ length: n }, (_, i) => `mov-${String(i).padStart(5, "0")}`);
}

beforeEach(() => {
  pedidos.length = 0;
});

describe("definirCategoriaDosMovimentos com muitos lançamentos (#897)", () => {
  it("categoriza 1.500 lançamentos sem erro e sem pular nenhum", async () => {
    movimentos = ids(1500).map((id) => ({ id, categoria_id: null }));
    await definirCategoriaDosMovimentos(ids(1500), "cat-1");
    expect(movimentos.filter((m) => m.categoria_id !== "cat-1")).toHaveLength(0);
    expect(Math.max(...pedidos)).toBeLessThanOrEqual(LIMITE_DE_IDS);
  });

  it("ainda avisa quando o banco não grava todos (RLS filtra em silêncio)", async () => {
    // só 250 dos 300 existem pra quem está gravando
    movimentos = ids(250).map((id) => ({ id, categoria_id: null }));
    await expect(definirCategoriaDosMovimentos(ids(300), "cat-1")).rejects.toThrow(
      "Só 250 de 300 lançamentos",
    );
  });

  it("lista vazia não vai ao banco", async () => {
    await definirCategoriaDosMovimentos([], "cat-1");
    expect(pedidos).toHaveLength(0);
  });
});

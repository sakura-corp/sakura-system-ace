import { describe, expect, it, vi } from "vitest";

// O Supabase corta toda resposta em 1.000 linhas (`max_rows`), sem avisar. Este
// "banco de mentira" faz o mesmo: guarda N linhas por tabela e, a cada consulta,
// devolve no máximo 1.000 — respeitando `.range(de, ate)` quando houver.
const LIMITE = 1000;
const tabelas: Record<string, { id: string }[]> = {};
const consultas: string[] = [];

function construtor(tabela: string) {
  let de = 0;
  let ate = Infinity;
  const q = {
    select: () => q,
    neq: () => q,
    eq: () => q,
    order: () => q,
    range(a: number, b: number) {
      de = a;
      ate = b;
      return q;
    },
    then(ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) {
      consultas.push(`${tabela}:${de}-${ate}`);
      const fatia = (tabelas[tabela] ?? []).slice(de, Math.min(ate + 1, de + LIMITE));
      return Promise.resolve({ data: fatia, error: null }).then(ok, erro);
    },
  };
  return q;
}

vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));
vi.mock("./caixa", () => ({ criarMovimentoCaixa: async () => undefined }));
vi.mock("./contasReceber", () => ({ criarContaReceber: async () => undefined }));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "deposito-1" }));

import { listarClientes } from "./clientes";
import { listarOrdens } from "./ordensServico";

function linhas(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, itens: [] }));
}

describe("listas grandes (o Supabase corta em 1.000 linhas)", () => {
  it("listarClientes traz todos os clientes, não só os 1.000 primeiros", async () => {
    tabelas.clientes = linhas(2500);
    consultas.length = 0;
    const clientes = await listarClientes();
    expect(clientes).toHaveLength(2500);
    expect(new Set(clientes.map((c) => c.id)).size).toBe(2500);
  });

  it("listarClientes com exatamente 1.000 clientes termina (a última página vem vazia)", async () => {
    tabelas.clientes = linhas(1000);
    const clientes = await listarClientes();
    expect(clientes).toHaveLength(1000);
  });

  it("listarClientes com poucos clientes faz uma consulta só", async () => {
    tabelas.clientes = linhas(3);
    consultas.length = 0;
    expect(await listarClientes()).toHaveLength(3);
    expect(consultas).toHaveLength(1);
  });

  it("listarOrdens traz todas as ordens da loja, não só as 1.000 primeiras", async () => {
    tabelas.ordens_servico = linhas(2500);
    const ordens = await listarOrdens("loja-1");
    expect(ordens).toHaveLength(2500);
  });
});

describe("buscarTudoEmPaginas", () => {
  it("repassa o erro do Supabase em vez de devolver a lista pela metade", async () => {
    const { buscarTudoEmPaginas } = await import("./paginacao");
    let chamada = 0;
    await expect(
      buscarTudoEmPaginas(async () => {
        chamada++;
        return chamada === 1
          ? { data: linhas(1000), error: null }
          : { data: null, error: { message: "caiu" } };
      }),
    ).rejects.toMatchObject({ message: "caiu" });
  });
});

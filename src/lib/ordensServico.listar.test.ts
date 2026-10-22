import { beforeEach, describe, expect, it, vi } from "vitest";

// Consulta de mentira que anota cada filtro pedido: o que importa aqui é o
// que a lib manda o BANCO filtrar (e não o que filtra depois, na tela).
const chamadas = vi.hoisted(() => ({
  filtros: [] as [string, unknown[]][],
  tabelas: [] as string[],
  linhas: {} as Record<string, unknown[]>,
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: (tabela: string) => {
      chamadas.tabelas.push(tabela);
      const q: Record<string, unknown> = {};
      for (const metodo of ["select", "eq", "in", "order", "not"]) {
        q[metodo] = (...args: unknown[]) => {
          chamadas.filtros.push([metodo, args]);
          return q;
        };
      }
      q.range = (...args: unknown[]) => {
        chamadas.filtros.push(["range", args]);
        return q;
      };
      q.then = (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) =>
        Promise.resolve({ data: chamadas.linhas[tabela] ?? [], error: null }).then(ok, erro);
      return q;
    },
  },
}));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "d" }));
vi.mock("./caixa", () => ({ criarMovimentoCaixa: async () => undefined }));
vi.mock("./contasReceber", () => ({ criarContaReceber: async () => undefined }));

const { listarOrcamentos, listarOrdensDoVeiculo } = await import("./ordensServico");

beforeEach(() => {
  chamadas.filtros.length = 0;
  chamadas.tabelas.length = 0;
  chamadas.linhas = {};
});

describe("listarOrcamentos", () => {
  it("pede ao banco só orçamento e recusado, da loja, e traz os itens", async () => {
    chamadas.linhas.ordens_servico = [{ id: "o1", status: "orcamento", itens: [] }];

    const lista = await listarOrcamentos("loja-1");

    expect(lista).toHaveLength(1);
    expect(chamadas.filtros).toContainEqual(["eq", ["loja_id", "loja-1"]]);
    expect(chamadas.filtros).toContainEqual(["in", ["status", ["orcamento", "recusado"]]]);
    const select = chamadas.filtros.find(([m]) => m === "select")![1][0] as string;
    expect(select).toContain("itens:ordens_servico_itens(*)");
  });
});

describe("listarOrdensDoVeiculo", () => {
  it("busca só as colunas do aviso de KM, só daquele veículo", async () => {
    chamadas.linhas.ordens_servico = [
      { id: "o1", veiculo_id: "v1", km_entrada: 1000, data_abertura: "2026-01-01", status: "faturada" },
    ];

    const lista = await listarOrdensDoVeiculo("v1");

    expect(lista).toHaveLength(1);
    expect(chamadas.filtros).toContainEqual(["eq", ["veiculo_id", "v1"]]);
    expect(chamadas.filtros).toContainEqual([
      "select",
      ["id, veiculo_id, km_entrada, data_abertura, status"],
    ]);
  });
});

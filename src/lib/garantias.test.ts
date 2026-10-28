import { describe, expect, it, vi } from "vitest";

// Garantia é da peça VENDIDA (OS fechada). Orçamento (#379) não vendeu nada:
// aberto ou recusado, a peça dele não está na garantia de ninguém.

const linhas = vi.hoisted(() => ({ dados: [] as unknown[] }));
vi.mock("./paginacao", () => ({
  buscarTudoEmPaginas: async (consultar: (de: number, ate: number) => unknown) => {
    consultar(0, 999);
    return linhas.dados;
  },
}));
const consultas = vi.hoisted(() => ({ tabelas: [] as string[] }));
vi.mock("./supabase", () => ({
  supabase: {
    from: (t: string) => {
      consultas.tabelas.push(t);
      const q: Record<string, unknown> = {};
      for (const m of ["select", "order", "range"]) q[m] = () => q;
      return q;
    },
  },
}));

const { listarItensComGarantia } = await import("./garantias");

// A janela `ordens_servico_garantias` (migration 0075, #367) traz uma linha por
// item de peça, já com peça, prazo, cliente e placa; o programa monta o mesmo
// formato de antes (`peca`, `ordem.cliente.nome`, `ordem.veiculo`).
const linha = (
  id: string,
  ordemId: string,
  status: string,
  dataFechamento: string | null,
  extra: Record<string, unknown> = {},
) => ({
  id,
  quantidade: 4,
  peca_id: "p1",
  peca_descricao: "Pneu",
  prazo_garantia_dias: 90,
  ordem_servico_id: ordemId,
  ordem_status: status,
  ordem_data_fechamento: dataFechamento,
  cliente_nome: "Cliente",
  veiculo_id: null,
  veiculo_placa: null,
  ...extra,
});

describe("listarItensComGarantia", () => {
  it("só peça de OS fechada; orçamento fica de fora", async () => {
    linhas.dados = [
      linha("i-os", "os-17", "faturada", "2026-10-10T12:00:00Z"),
      linha("i-aberta", "os-18", "em_andamento", null),
      linha("i-orc", "orc-1", "orcamento", null),
      // Recusado nunca tem data de fechamento hoje; se um dia ganhar, a
      // garantia continua não sendo dele.
      linha("i-rec", "orc-2", "recusado", "2026-10-11T12:00:00Z"),
    ];
    const itens = await listarItensComGarantia();
    expect(itens.map((i) => i.id)).toEqual(["i-os"]);
  });

  it("lê da janela ordens_servico_garantias, não das tabelas", async () => {
    linhas.dados = [];
    consultas.tabelas.length = 0;
    await listarItensComGarantia();
    expect(consultas.tabelas).toEqual(["ordens_servico_garantias"]);
  });

  it("monta peca, cliente e veiculo no formato que a tela usa", async () => {
    linhas.dados = [
      linha("i1", "os-17", "faturada", "2026-10-10T12:00:00Z", {
        cliente_nome: "Maria",
        veiculo_id: "v1",
        veiculo_placa: "RTA4B71",
      }),
    ];
    const [item] = await listarItensComGarantia();
    expect(item.peca).toEqual({ descricao: "Pneu", prazo_garantia_dias: 90 });
    expect(item.ordem).toEqual({
      id: "os-17",
      status: "faturada",
      data_fechamento: "2026-10-10T12:00:00Z",
      cliente: { nome: "Maria" },
      veiculo: { id: "v1", placa: "RTA4B71" },
    });
  });

  it("peça sem prazo, ou apagada (sem descrição), não entra na garantia", async () => {
    linhas.dados = [
      linha("i-sem-prazo", "os-1", "faturada", "2026-10-10T12:00:00Z", { prazo_garantia_dias: null }),
      linha("i-apagada", "os-2", "faturada", "2026-10-10T12:00:00Z", {
        peca_id: null,
        peca_descricao: null,
        prazo_garantia_dias: null,
      }),
    ];
    expect(await listarItensComGarantia()).toEqual([]);
  });
});

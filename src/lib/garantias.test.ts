import { describe, expect, it, vi } from "vitest";

// Garantia é da peça VENDIDA (OS fechada). Orçamento (#379) não vendeu nada:
// aberto ou recusado, a peça dele não está na garantia de ninguém.

const linhas = vi.hoisted(() => ({ dados: [] as unknown[] }));
vi.mock("./paginacao", () => ({ buscarTudoEmPaginas: async () => linhas.dados }));
vi.mock("./supabase", () => ({ supabase: {} }));

const { listarItensComGarantia } = await import("./garantias");

const peca = { descricao: "Pneu", prazo_garantia_dias: 90 };
const ordem = (id: string, status: string, data_fechamento: string | null) => ({
  id,
  status,
  data_fechamento,
  cliente: { nome: "Cliente" },
  veiculo: null,
});

describe("listarItensComGarantia", () => {
  it("só peça de OS fechada; orçamento fica de fora", async () => {
    linhas.dados = [
      { id: "i-os", quantidade: 4, peca, ordem: ordem("os-17", "faturada", "2026-10-10T12:00:00Z") },
      { id: "i-aberta", quantidade: 1, peca, ordem: ordem("os-18", "em_andamento", null) },
      { id: "i-orc", quantidade: 4, peca, ordem: ordem("orc-1", "orcamento", null) },
      // Recusado nunca tem data de fechamento hoje; se um dia ganhar, a
      // garantia continua não sendo dele.
      { id: "i-rec", quantidade: 4, peca, ordem: ordem("orc-2", "recusado", "2026-10-11T12:00:00Z") },
    ];
    const itens = await listarItensComGarantia();
    expect(itens.map((i) => i.id)).toEqual(["i-os"]);
  });
});

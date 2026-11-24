// @vitest-environment jsdom
/** Cartão a receber (#387): total por dia, parcela N de M, vazio e troca de loja. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { RecebivelCartao } from "@/lib/taxasMaquininha";

const listarCartaoAReceber = vi.hoisted(() => vi.fn());
vi.mock("@/lib/taxasMaquininha", () => ({ listarCartaoAReceber }));

const { CartaoAReceberSection } = await import("./CartaoAReceberSection");

function item(p: Partial<RecebivelCartao> & Pick<RecebivelCartao, "id" | "data_prevista" | "valor">): RecebivelCartao {
  return {
    movimento_id: "m", numero: 1, forma: "cartao_credito", parcelas: 3, total_parcelas: 3,
    descricao: "Faturamento da OS 10", ...p,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Cartão a receber", () => {
  it("agrupa por dia, com o total de cada dia e a parcela N de M", async () => {
    listarCartaoAReceber.mockResolvedValue([
      item({ id: "1", data_prevista: "2026-12-01", valor: 100.5, numero: 1 }),
      item({ id: "2", data_prevista: "2026-12-01", valor: 49.5, forma: "cartao_debito", parcelas: 1, total_parcelas: 1, descricao: "Venda balcão" }),
      item({ id: "3", data_prevista: "2026-12-31", valor: 100.5, numero: 2 }),
    ]);
    renderizar(<CartaoAReceberSection lojaId="loja-a" />);

    const dia1 = (await screen.findByRole("heading", { name: "01/12/2026" })).closest("section")!;
    expect(within(dia1).getByText(/R\$\s*150,00/)).toBeInTheDocument(); // total do dia
    expect(within(dia1).getByText("Crédito 3x · parcela 1 de 3")).toBeInTheDocument();
    expect(within(dia1).getByText("Débito")).toBeInTheDocument();
    const dia2 = screen.getByRole("heading", { name: "31/12/2026" }).closest("section")!;
    expect(within(dia2).getAllByText(/R\$\s*100,50/)).toHaveLength(2); // total e lançamento
    expect(within(dia2).getByText("Crédito 3x · parcela 2 de 3")).toBeInTheDocument();
    expect(listarCartaoAReceber).toHaveBeenCalledWith("loja-a", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("vazio: explica quando a lista aparece", async () => {
    listarCartaoAReceber.mockResolvedValue([]);
    renderizar(<CartaoAReceberSection lojaId="loja-a" />);
    expect(await screen.findByText(/informar as taxas em Configurações e faturar/)).toBeInTheDocument();
  });

  it("erro do banco aparece na tela", async () => {
    listarCartaoAReceber.mockRejectedValue(new Error("Sem conexão de teste"));
    renderizar(<CartaoAReceberSection lojaId="loja-a" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Sem conexão de teste/);
  });

  it("trocar de loja busca de novo", async () => {
    listarCartaoAReceber.mockResolvedValue([]);
    const { rerender } = renderizar(<CartaoAReceberSection lojaId="loja-a" />);
    await screen.findByText(/informar as taxas/);
    rerender(<CartaoAReceberSection lojaId="loja-b" />);
    await vi.waitFor(() => expect(listarCartaoAReceber).toHaveBeenCalledWith("loja-b", expect.any(String)));
  });
});

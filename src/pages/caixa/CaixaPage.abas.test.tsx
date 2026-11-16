// @vitest-environment jsdom
/**
 * As abas do Caixa no visual novo (tarefa 10, #990): o leitor de tela anuncia
 * "aba 1 de 4", então as setas, Home e End têm de andar entre elas, e só a
 * escolhida entra no Tab.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true, permissoes: [] }, lojaAtual: { id: "l", nome: "Loja" } }),
}));
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixa: async () => [],
  buscarCustoDasOrdens: async () => new Map(),
  criarMovimentoCaixa: vi.fn(),
}));
vi.mock("@/lib/categoriasCaixa", () => ({ listarCategoriasCaixa: async () => [] }));
vi.mock("@/lib/fechamentoCaixa", () => ({ listarFechamentosCaixa: async () => [] }));
vi.mock("./DiarioSection", () => ({ DiarioSection: () => <p>parte: diário</p> }));
vi.mock("./FechamentoSection", () => ({ FechamentoSection: () => <p>parte: fechamento</p> }));
vi.mock("./EntradaSaidaSection", () => ({
  EntradaSaidaSection: ({ tipo }: { tipo: string }) => <p>parte: {tipo}</p>,
}));

const { CaixaPage } = await import("./CaixaPage");

describe("Caixa: as abas no teclado", () => {
  it("setas, Home e End trocam de aba e levam o foco junto", async () => {
    const { user } = renderizar(<CaixaPage />);
    expect(await screen.findByText("parte: diário")).toBeInTheDocument();

    const diario = screen.getByRole("tab", { name: "Diário" });
    expect(diario).toHaveAttribute("aria-selected", "true");
    expect(diario).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Entradas" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Diário");

    diario.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Entradas" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Entradas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("parte: entrada")).toBeInTheDocument();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Fechamento" })).toHaveFocus();
    expect(screen.getByText("parte: fechamento")).toBeInTheDocument();

    // Da última, a seta pra direita volta pra primeira.
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Diário" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Fechamento" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Diário" })).toHaveFocus();
    expect(screen.getByText("parte: diário")).toBeInTheDocument();
  });
});

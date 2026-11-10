// @vitest-environment jsdom
/**
 * Teste de TELA da página de Fornecedores (#382): a aba "Sugestão de compra"
 * só existe pra quem tem o módulo Estoque (nunca uma lista vazia no lugar), e
 * a Central do dia abre direto nela.
 */
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { Operador } from "@/types/operador";

let operador: Partial<Operador> | null = null;
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ lojaAtual: { id: "loja-1" }, operador }),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/fornecedores", () => ({ listarFornecedores: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/depositos", () => ({ listarDepositos: vi.fn().mockResolvedValue([]) }));
const listarPedidos = vi.fn().mockResolvedValue([]);
vi.mock("@/lib/pedidosCompra", () => ({ listarPedidos: (...a: unknown[]) => listarPedidos(...a) }));
vi.mock("./SugestaoCompraSection", () => ({
  SugestaoCompraSection: ({ onPedidosCriados }: { onPedidosCriados: () => void }) => (
    <div>
      <p>tela da sugestão</p>
      <button onClick={onPedidosCriados}>simular pedido criado</button>
    </div>
  ),
}));

const { FornecedoresPage } = await import("./FornecedoresPage");

function montar(state?: unknown) {
  return renderizar(<FornecedoresPage />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[{ pathname: "/fornecedores", state }]}>{children}</MemoryRouter>
    ),
  });
}

beforeEach(() => {
  listarPedidos.mockClear();
  operador = { id: "op-1", admin: false, permissoes: ["fornecedores", "estoque"] };
});

describe("FornecedoresPage — aba Sugestão de compra", () => {
  it("com Estoque, mostra a aba e abre a tela da sugestão ao clicar", async () => {
    const { user } = montar();
    await user.click(await screen.findByRole("button", { name: "Sugestão de compra" }));
    expect(await screen.findByText("tela da sugestão")).toBeInTheDocument();
  });

  it("pedido criado recarrega os pedidos sem tirar a sugestão da tela", async () => {
    const { user } = montar({ aba: "sugestao" });
    await user.click(await screen.findByRole("button", { name: "simular pedido criado" }));
    await waitFor(() => expect(listarPedidos).toHaveBeenCalledTimes(2));
    expect(screen.getByText("tela da sugestão")).toBeInTheDocument();
  });

  it("sem Estoque, a aba não aparece", async () => {
    operador = { id: "op-1", admin: false, permissoes: ["fornecedores"] };
    montar();
    await screen.findByRole("button", { name: "Pedidos de compra" });
    expect(screen.queryByRole("button", { name: "Sugestão de compra" })).toBeNull();
  });

  it("vindo da Central do dia (state.aba), abre direto na sugestão", async () => {
    montar({ aba: "sugestao" });
    expect(await screen.findByText("tela da sugestão")).toBeInTheDocument();
  });

  it("vindo da Central do dia SEM Estoque, não abre a sugestão", async () => {
    operador = { id: "op-1", admin: false, permissoes: ["fornecedores"] };
    montar({ aba: "sugestao" });
    await screen.findByRole("button", { name: "Cadastro" });
    expect(screen.queryByText("tela da sugestão")).toBeNull();
  });
});

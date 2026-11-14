// @vitest-environment jsdom
/**
 * #927: trocar de loja com a carga anterior ainda buscando. Os pedidos de
 * compra são da loja: a resposta da loja antiga não pode ficar na tela por
 * cima da nova, e a loja nova dando erro mostra só o erro (sem os pedidos da
 * anterior). Fornecedores e peças são globais, não entram na regra.
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { PedidoCompra } from "@/types/pedidoCompra";

const lojaA = { id: "loja-a", nome: "Loja A" };
const lojaB = { id: "loja-b", nome: "Loja B" };
const auth = vi.hoisted(() => ({ lojaAtual: null as { id: string; nome: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    lojaAtual: auth.lojaAtual,
    operador: { id: "op", admin: true, permissoes: ["fornecedores"] },
  }),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/fornecedores", () => ({ listarFornecedores: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/depositos", () => ({ listarDepositos: vi.fn().mockResolvedValue([]) }));
const listarPedidos = vi.fn();
vi.mock("@/lib/pedidosCompra", () => ({ listarPedidos: (...a: unknown[]) => listarPedidos(...a) }));
vi.mock("./FornecedoresSection", () => ({ FornecedoresSection: () => null }));
vi.mock("./SugestaoCompraSection", () => ({ SugestaoCompraSection: () => null }));
vi.mock("./PedidosCompraSection", () => ({
  PedidosCompraSection: ({ pedidos }: { pedidos: PedidoCompra[] }) => (
    <ul>
      {pedidos.map((p) => (
        <li key={p.id}>{p.observacao}</li>
      ))}
    </ul>
  ),
}));
vi.mock("@/components/BotaoVoltar", () => ({ BotaoVoltar: () => null }));

const { FornecedoresPage } = await import("./FornecedoresPage");

const pedido = (id: string, observacao: string) => ({ id, observacao }) as unknown as PedidoCompra;

function adiada<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

beforeEach(() => {
  listarPedidos.mockReset();
  auth.lojaAtual = lojaA;
});

describe("FornecedoresPage — troca de loja (#927)", () => {
  it("a carga da loja A que chega depois da B não sobrescreve a tela", async () => {
    const a = adiada<PedidoCompra[]>();
    listarPedidos.mockImplementation((loja: string) =>
      loja === "loja-a" ? a.promessa : Promise.resolve([pedido("b", "Pedido da loja B")]),
    );
    const { user, rerender } = renderizar(<FornecedoresPage />);
    auth.lojaAtual = lojaB;
    rerender(<FornecedoresPage />);
    await user.click(await screen.findByRole("button", { name: "Pedidos de compra" }));
    expect(await screen.findByText("Pedido da loja B")).toBeInTheDocument();

    await act(async () => {
      a.resolver([pedido("a", "Pedido da loja A")]);
      await a.promessa;
    });

    expect(screen.getByText("Pedido da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Pedido da loja A")).not.toBeInTheDocument();
  });

  it("a loja B dá erro depois da A carregar: só o erro, sem os pedidos da A", async () => {
    const b = adiada<PedidoCompra[]>();
    listarPedidos.mockImplementation((loja: string) =>
      loja === "loja-a" ? Promise.resolve([pedido("a", "Pedido da loja A")]) : b.promessa,
    );
    const { user, rerender } = renderizar(<FornecedoresPage />);
    await user.click(await screen.findByRole("button", { name: "Pedidos de compra" }));
    expect(await screen.findByText("Pedido da loja A")).toBeInTheDocument();

    auth.lojaAtual = lojaB;
    rerender(<FornecedoresPage />);
    await act(async () => {
      b.rejeitar(new Error("Falhou ao buscar a loja B"));
      await b.promessa.catch(() => undefined);
    });

    expect(await screen.findByText(/Falhou ao buscar a loja B/)).toBeInTheDocument();
    expect(screen.queryByText("Pedido da loja A")).not.toBeInTheDocument();
  });
});

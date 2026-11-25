// @vitest-environment jsdom
/**
 * #927: trocar de loja com a carga anterior ainda buscando. A resposta da
 * loja antiga não pode ficar na tela por cima da nova, e quando a carga da
 * loja nova dá erro a tela mostra só o erro (não os movimentos da anterior).
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { MovimentoEstoque } from "@/types/estoque";

const lojaA = { id: "loja-a", nome: "Loja A" };
const lojaB = { id: "loja-b", nome: "Loja B" };
const auth = vi.hoisted(() => ({ lojaAtual: null as { id: string; nome: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ lojaAtual: auth.lojaAtual, operador: { id: "op", admin: true } }),
}));
vi.mock("@/lib/pecas", () => ({
  listarPecas: vi.fn(),
  resumoPecaParaJuntar: vi.fn(),
  juntarPecas: vi.fn(),
  buscarPecasPorIds: vi.fn(),
}));
vi.mock("@/lib/estoque", () => ({
  listarMovimentos: vi.fn(),
  calcularSaldoPorPeca: () => new Map(),
  calcularSaldoPorPecaEDeposito: () => new Map(),
}));
vi.mock("@/lib/categorias", () => ({ listarCategorias: vi.fn() }));
vi.mock("@/lib/depositos", () => ({ listarDepositos: vi.fn() }));
vi.mock("@/lib/configuracoes", () => ({ buscarConfiguracaoFiscal: vi.fn() }));
vi.mock("./ProdutosSection", () => ({ ProdutosSection: () => null }));
vi.mock("./MovimentacoesSection", () => ({
  MovimentacoesSection: ({ movimentos }: { movimentos: MovimentoEstoque[] }) => (
    <ul>
      {movimentos.map((m) => (
        <li key={m.id}>{m.referencia}</li>
      ))}
    </ul>
  ),
}));
vi.mock("./ContagemSection", () => ({ ContagemSection: () => null }));
vi.mock("./RelatoriosEstoqueSection", () => ({ RelatoriosEstoqueSection: () => null }));
vi.mock("@/components/BotaoVoltar", () => ({ BotaoVoltar: () => null }));

import { listarMovimentos } from "@/lib/estoque";
import { listarPecas } from "@/lib/pecas";
import { listarCategorias } from "@/lib/categorias";
import { listarDepositos } from "@/lib/depositos";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { EstoquePage } from "./EstoquePage";

const mov = (id: string, observacao: string) => ({ id, referencia: observacao }) as unknown as MovimentoEstoque;

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
  vi.clearAllMocks();
  auth.lojaAtual = lojaA;
  vi.mocked(listarPecas).mockResolvedValue([]);
  vi.mocked(listarCategorias).mockResolvedValue([]);
  vi.mocked(listarDepositos).mockResolvedValue([]);
  vi.mocked(buscarConfiguracaoFiscal).mockResolvedValue(null);
});

describe("EstoquePage — troca de loja (#927)", () => {
  it("a carga da loja A que chega depois da B não sobrescreve a tela", async () => {
    const a = adiada<MovimentoEstoque[]>();
    vi.mocked(listarMovimentos).mockImplementation((loja: string) =>
      loja === "loja-a" ? a.promessa : Promise.resolve([mov("b", "Movimento da loja B")]),
    );
    const { user, rerender } = renderizar(<EstoquePage />);
    auth.lojaAtual = lojaB;
    rerender(<EstoquePage />);
    await user.click(await screen.findByRole("button", { name: "Movimentações" }));
    expect(await screen.findByText("Movimento da loja B")).toBeInTheDocument();

    await act(async () => {
      a.resolver([mov("a", "Movimento da loja A")]);
      await a.promessa;
    });

    expect(screen.getByText("Movimento da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Movimento da loja A")).not.toBeInTheDocument();
  });

  it("a loja B dá erro depois da A carregar: só o erro, sem os movimentos da A", async () => {
    const b = adiada<MovimentoEstoque[]>();
    vi.mocked(listarMovimentos).mockImplementation((loja: string) =>
      loja === "loja-a" ? Promise.resolve([mov("a", "Movimento da loja A")]) : b.promessa,
    );
    const { user, rerender } = renderizar(<EstoquePage />);
    await user.click(await screen.findByRole("button", { name: "Movimentações" }));
    expect(await screen.findByText("Movimento da loja A")).toBeInTheDocument();

    auth.lojaAtual = lojaB;
    rerender(<EstoquePage />);
    await act(async () => {
      b.rejeitar(new Error("Falhou ao buscar a loja B"));
      await b.promessa.catch(() => undefined);
    });

    expect(await screen.findByText(/Falhou ao buscar a loja B/)).toBeInTheDocument();
    expect(screen.queryByText("Movimento da loja A")).not.toBeInTheDocument();
  });
});

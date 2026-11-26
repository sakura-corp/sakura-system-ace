// @vitest-environment jsdom
/**
 * #1017: Estoque → Produtos sem internet. A busca que falhou mostra só o erro
 * e o "Tentar de novo" (nunca o "Nenhum produto cadastrado ainda." junto, que
 * faz parecer que os cadastros sumiram), e a lista no erro busca de novo
 * sozinha quando a internet volta.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Peca } from "@/types/peca";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ lojaAtual: { id: "l1", nome: "Matriz" }, operador: { id: "op", admin: false, permissoes: ["estoque"] } }),
}));
const listarPecas = vi.fn();
vi.mock("@/lib/pecas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pecas")>()),
  listarPecas: (...a: unknown[]) => listarPecas(...a),
}));
vi.mock("@/lib/estoque", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/estoque")>()),
  listarMovimentos: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categorias", () => ({ listarCategorias: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/depositos", () => ({ listarDepositos: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/configuracoes", () => ({ buscarConfiguracaoFiscal: vi.fn().mockResolvedValue(null) }));
vi.mock("@/components/BotaoVoltar", () => ({ BotaoVoltar: () => null }));
// A rede de mentira: o teste liga e desliga o "sem conexão".
const conexao = vi.hoisted(() => ({ semConexao: false }));
vi.mock("@/hooks/useConexao", () => ({ useConexao: () => ({ semConexao: conexao.semConexao }) }));

const { EstoquePage } = await import("./EstoquePage");

const ERRO_DE_REDE = new TypeError("Failed to fetch");
const PECA = {
  id: "p1",
  descricao: "Pneu 175/70 R13",
  codigo_barras: null,
  codigo_interno: null,
  medida: null,
  ativo: true,
  estoque_minimo: 0,
  preco_venda: 100,
  preco_custo: 50,
  categoria_id: null,
  criado_em: "2026-01-01T00:00:00Z",
} as unknown as Peca;

beforeEach(() => {
  vi.clearAllMocks();
  conexao.semConexao = false;
  Element.prototype.scrollIntoView = vi.fn();
});

describe("EstoquePage — Produtos sem internet (#1017)", () => {
  it("a busca falhou: só o erro e o 'Tentar de novo', sem o 'Nenhum produto cadastrado'", async () => {
    listarPecas.mockRejectedValue(ERRO_DE_REDE);
    renderizar(<EstoquePage />);
    expect(await screen.findByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(/conex/i);
    expect(screen.queryByText(/Nenhum produto/)).not.toBeInTheDocument();
  });

  it("a busca deu certo e voltou vazia: 'Nenhum produto cadastrado ainda.'", async () => {
    listarPecas.mockResolvedValue([]);
    renderizar(<EstoquePage />);
    expect(await screen.findByText("Nenhum produto cadastrado ainda.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("'Tentar de novo' busca de novo e mostra a lista", async () => {
    listarPecas.mockRejectedValueOnce(ERRO_DE_REDE).mockResolvedValue([PECA]);
    const tela = renderizar(<EstoquePage />);
    await tela.user.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Pneu 175/70 R13")).toBeInTheDocument();
  });

  it("a internet voltou: a lista no erro busca de novo sozinha", async () => {
    listarPecas.mockRejectedValueOnce(ERRO_DE_REDE).mockResolvedValue([PECA]);
    const tela = renderizar(<EstoquePage />);
    await screen.findByRole("button", { name: "Tentar de novo" });
    conexao.semConexao = true;
    tela.rerender(<EstoquePage />);
    conexao.semConexao = false;
    tela.rerender(<EstoquePage />);
    expect(await screen.findByText("Pneu 175/70 R13")).toBeInTheDocument();
  });

  it("a internet caiu e voltou com a lista funcionando: não busca de novo", async () => {
    listarPecas.mockResolvedValue([PECA]);
    const tela = renderizar(<EstoquePage />);
    await screen.findByText("Pneu 175/70 R13");
    const chamadas = listarPecas.mock.calls.length;
    conexao.semConexao = true;
    tela.rerender(<EstoquePage />);
    conexao.semConexao = false;
    tela.rerender(<EstoquePage />);
    await new Promise((r) => setTimeout(r, 20));
    expect(listarPecas.mock.calls.length).toBe(chamadas);
  });
});

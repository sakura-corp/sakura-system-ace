// @vitest-environment jsdom
/**
 * Teste de TELA: o "Editar produto" do perfil da peça (#1093), com a tela de
 * Estoque de verdade em volta.
 *
 * Achado da revisão final: o pedido de editar ficava guardado na tela. Cada
 * recarga (que troca a seção por "Carregando..." e monta de novo) reabria o
 * formulário com a peça de antes da edição, e um segundo "Salvar" gravava os
 * valores velhos por cima.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { Peca } from "@/types/peca";

const auth = vi.hoisted(() => ({ lojaAtual: { id: "l1", nome: "Matriz" } }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ lojaAtual: auth.lojaAtual, operador: { id: "op", admin: false, permissoes: ["estoque"] } }),
}));
const listarPecas = vi.fn();
const atualizarStatusPeca = vi.fn();
vi.mock("@/lib/pecas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pecas")>()),
  listarPecas: (...a: unknown[]) => listarPecas(...a),
  atualizarStatusPeca: (...a: unknown[]) => atualizarStatusPeca(...a),
}));
vi.mock("@/lib/estoque", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/estoque")>()),
  listarMovimentos: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categorias", () => ({ listarCategorias: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/depositos", () => ({ listarDepositos: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/configuracoes", () => ({ buscarConfiguracaoFiscal: vi.fn().mockResolvedValue(null) }));
vi.mock("@/components/BotaoVoltar", () => ({
  BotaoVoltar: ({ onClick }: { onClick?: () => void }) => (onClick ? <button onClick={onClick}>Voltar</button> : null),
}));

const { EstoquePage } = await import("./EstoquePage");

function umaPeca(extra: Partial<Peca>): Peca {
  return {
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
    ...extra,
  } as unknown as Peca;
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  // A lista demora, como na rede de verdade: sem isso o React junta o
  // "Carregando..." e a volta num desenho só, e o defeito não aparece.
  listarPecas.mockImplementation(
    () =>
      new Promise((resolver) =>
        setTimeout(() => resolver([umaPeca({}), umaPeca({ id: "p2", descricao: "Palheta 22" })]), 30),
      ),
  );
  atualizarStatusPeca.mockResolvedValue(undefined);
});

describe("EstoquePage — o Editar do perfil da peça abre uma vez só (#1093)", { timeout: 20_000 }, () => {
  it("cancelar e depois recarregar (inativar outra peça) não reabre o formulário", async () => {
    const { user, container } = renderizar(<EstoquePage />);
    await user.click(await screen.findByRole("button", { name: /^Pneu 175\/70 R13/ }));
    await user.click(await screen.findByRole("button", { name: "Editar produto" }));
    expect(container.querySelector("form")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(container.querySelector("form")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Mais ações — o produto Palheta 22" }));
    await user.click(screen.getByRole("menuitem", { name: "Inativar" }));
    await waitFor(() => expect(listarPecas).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText("Carregando...")).toBeNull());
    expect(container.querySelector("form")).toBeNull();
  });
});

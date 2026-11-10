// @vitest-environment jsdom
/**
 * Teste de TELA da lista de Serviços (#969): abrir o formulário (canetinha ou
 * "+ Novo serviço") rola a tela até ele e põe o cursor no primeiro campo. Antes,
 * com a lista rolada, o formulário abria fora da vista e parecia que o clique
 * não tinha feito nada. O gancho é `hooks/useRolarAteOFormulario.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Servico } from "@/types/servico";

const listarServicos = vi.fn();
vi.mock("@/lib/servicos", () => ({
  listarServicos: () => listarServicos(),
  criarServico: vi.fn(),
  atualizarServico: vi.fn(),
  atualizarStatusServico: vi.fn(),
  excluirServico: vi.fn(),
}));
vi.mock("@/lib/categoriasServico", () => ({
  listarCategoriasServico: () => Promise.resolve([]),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { ServicosPage } = await import("./ServicosPage");

const SELETOR_CAMPO =
  "input:not([type=hidden]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled)";

const ALINHAMENTO: Servico = {
  id: "s-1",
  codigo_interno: null,
  descricao: "Alinhamento",
  preco_padrao: 80,
  custo: null,
  categoria_id: null,
  ativo: true,
  criado_em: "2026-01-01T00:00:00.000Z",
};

let rolar: ReturnType<typeof vi.fn<(opcoes?: boolean | ScrollIntoViewOptions) => void>>;
beforeEach(() => {
  vi.clearAllMocks();
  listarServicos.mockResolvedValue([ALINHAMENTO]);
  rolar = vi.fn<(opcoes?: boolean | ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = rolar;
});

describe("ServicosPage — abrir o formulário rola até ele (#969)", () => {
  it("a canetinha pede a rolagem e põe o foco no primeiro campo do formulário", async () => {
    const { user, container } = renderizar(<ServicosPage />);
    await user.click(await screen.findByRole("button", { name: /^Editar .*Alinhamento/ }));

    const formulario = container.querySelector("form")!;
    expect(formulario).toBeTruthy();
    expect(document.activeElement).toBe(formulario.querySelector(SELETOR_CAMPO));
    expect(rolar).toHaveBeenCalled();
  });

  it("o \"+ Novo serviço\" também", async () => {
    const { user, container } = renderizar(<ServicosPage />);
    await screen.findByText("Alinhamento");
    await user.click(screen.getByRole("button", { name: "+ Novo serviço" }));

    const formulario = container.querySelector("form")!;
    expect(document.activeElement).toBe(formulario.querySelector(SELETOR_CAMPO));
    expect(rolar).toHaveBeenCalled();
  });

  it("trocar de canetinha com a edição aberta abre o outro, com os dados dele", async () => {
    // A lista fica na tela com o formulário aberto. Antes, o formulário não
    // trocava os valores, e salvar gravava os dados do anterior no outro.
    listarServicos.mockResolvedValue([
      ALINHAMENTO,
      { ...ALINHAMENTO, id: "s-2", descricao: "Balanceamento" },
    ]);
    const { user } = renderizar(<ServicosPage />);
    await user.click(await screen.findByRole("button", { name: /^Editar .*Alinhamento/ }));
    await user.click(screen.getByRole("button", { name: /^Editar .*Balanceamento/ }));

    expect(document.activeElement).toBe(screen.getByDisplayValue("Balanceamento"));
    expect(screen.queryByDisplayValue("Alinhamento")).toBeNull();
  });

  it("com o \"+ Novo\" aberto, a canetinha leva o cursor pra edição, não pro Novo", async () => {
    const { user } = renderizar(<ServicosPage />);
    await screen.findByText("Alinhamento");
    await user.click(screen.getByRole("button", { name: "+ Novo serviço" }));
    // A lista continua na tela com o Novo aberto.
    await user.click(screen.getByRole("button", { name: /^Editar .*Alinhamento/ }));

    expect(document.activeElement).toBe(screen.getByDisplayValue("Alinhamento"));
  });
});

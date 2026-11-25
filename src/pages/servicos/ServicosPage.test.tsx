// @vitest-environment jsdom
/**
 * Teste de TELA da lista de Serviços: a lista no molde (busca, filtro, vazio),
 * o formulário em janela (#1093; antes #969: abrir o formulário tinha que
 * levar o cursor até ele) e o "Excluir" com a janela do programa.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Servico } from "@/types/servico";

const listarServicos = vi.fn();
const excluirServico = vi.fn();
vi.mock("@/lib/servicos", () => ({
  listarServicos: () => listarServicos(),
  criarServico: vi.fn(),
  atualizarServico: vi.fn(),
  atualizarStatusServico: vi.fn(),
  excluirServico: (id: string) => excluirServico(id),
}));
vi.mock("@/lib/categoriasServico", () => ({
  listarCategoriasServico: () => Promise.resolve([]),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { ServicosPage } = await import("./ServicosPage");

const ALINHAMENTO: Servico = {
  id: "s-1",
  codigo_interno: null,
  descricao: "Alinhamento",
  preco_padrao: 80,
  custo: null,
  categoria_id: null,
  ativo: true,
  intervalo_dias: null,
  intervalo_km: null,
  criado_em: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  listarServicos.mockResolvedValue([ALINHAMENTO]);
  excluirServico.mockResolvedValue(undefined);
});

const BALANCEAMENTO: Servico = { ...ALINHAMENTO, id: "s-2", descricao: "Balanceamento", codigo_interno: "SV-BAL-02", preco_padrao: 40 };
const INATIVO: Servico = { ...ALINHAMENTO, id: "s-3", descricao: "Cambagem", ativo: false };

describe("ServicosPage — a lista no molde", () => {
  it("a busca acha pelo nome: sobra só o serviço certo", async () => {
    listarServicos.mockResolvedValue([ALINHAMENTO, BALANCEAMENTO]);
    const { user } = renderizar(<ServicosPage />);
    await screen.findByText("Balanceamento");
    await user.type(screen.getByRole("searchbox", { name: /buscar serviço/i }), "balanc");

    expect(screen.getByText("Balanceamento")).toBeTruthy();
    expect(screen.queryByText("Alinhamento")).toBeNull();
  });

  it("a busca também acha pelo código interno, sem acento nem maiúscula", async () => {
    listarServicos.mockResolvedValue([ALINHAMENTO, BALANCEAMENTO]);
    const { user } = renderizar(<ServicosPage />);
    await screen.findByText("Balanceamento");
    await user.type(screen.getByRole("searchbox", { name: /buscar serviço/i }), "sv-bal");

    expect(screen.getByText("Balanceamento")).toBeTruthy();
    expect(screen.queryByText("Alinhamento")).toBeNull();
  });

  it("o filtro Inativos mostra só os inativos, com a palavra Inativo", async () => {
    listarServicos.mockResolvedValue([ALINHAMENTO, INATIVO]);
    const { user } = renderizar(<ServicosPage />);
    await screen.findByText("Cambagem");
    await user.click(screen.getByRole("button", { name: "Inativos" }));

    expect(screen.getByText("Cambagem")).toBeTruthy();
    expect(screen.queryByText("Alinhamento")).toBeNull();
    expect(screen.getByText(/Inativo/, { selector: "span" })).toBeTruthy();
  });

  it("a lista vazia mostra a frase e o botão pra cadastrar o primeiro, que abre o formulário", async () => {
    listarServicos.mockResolvedValue([]);
    const { user } = renderizar(<ServicosPage />);
    expect(await screen.findByText("Nenhum serviço cadastrado ainda.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cadastrar o primeiro serviço" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("o preço aparece na linha e o código junto do detalhe", async () => {
    renderizar(<ServicosPage />);
    await screen.findByText("Alinhamento");
    expect(screen.getByText(/80,00/)).toBeTruthy();
  });
});

describe("ServicosPage — o formulário abre em janela", () => {
  it("a canetinha abre a janela com o foco dentro dela e os dados do serviço", async () => {
    const { user } = renderizar(<ServicosPage />);
    await user.click(await screen.findByRole("button", { name: /^Alinhamento/ }));

    const janela = screen.getByRole("dialog");
    expect(janela.contains(document.activeElement)).toBe(true);
    expect(screen.getByDisplayValue("Alinhamento")).toBeTruthy();
  });

  it("o \"+ Novo serviço\" abre a janela e Esc fecha", async () => {
    const { user } = renderizar(<ServicosPage />);
    await screen.findByText("Alinhamento");
    await user.click(screen.getByRole("button", { name: "+ Novo serviço" }));
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("abrir a edição de outro serviço mostra os dados dele (#969)", async () => {
    listarServicos.mockResolvedValue([ALINHAMENTO, BALANCEAMENTO]);
    const { user } = renderizar(<ServicosPage />);
    await user.click(await screen.findByRole("button", { name: /^Alinhamento/ }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /^Balanceamento/ }));

    expect(screen.getByDisplayValue("Balanceamento")).toBeTruthy();
    expect(screen.queryByDisplayValue("Alinhamento")).toBeNull();
  });
});

describe("ServicosPage — excluir", () => {
  async function abrirExcluir() {
    const r = renderizar(<ServicosPage />);
    await r.user.click(await screen.findByRole("button", { name: /^Mais ações — Alinhamento/ }));
    await r.user.click(screen.getByRole("menuitem", { name: "Excluir serviço" }));
    return r;
  }

  it("abre a janela do programa com o nome do serviço; Cancelar não exclui", async () => {
    const { user } = await abrirExcluir();
    expect(screen.getByRole("dialog", { name: /Alinhamento/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(excluirServico).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("confirmar exclui", async () => {
    const { user } = await abrirExcluir();
    await user.click(screen.getByRole("button", { name: "Excluir serviço" }));

    expect(excluirServico).toHaveBeenCalledWith("s-1");
  });
});

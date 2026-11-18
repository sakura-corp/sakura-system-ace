// @vitest-environment jsdom
/**
 * Grupo do DRE nas categorias do Caixa (#386): trocar o grupo salva na hora,
 * o aviso conta as sem grupo e o tipo escolhido muda os grupos oferecidos.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import { CategoriasCaixaSection } from "./CategoriasCaixaSection";

const m = vi.hoisted(() => ({
  criarCategoriaCaixa: vi.fn(),
  excluirCategoriaCaixa: vi.fn(),
  trocarGrupoCategoriaCaixa: vi.fn(),
}));
vi.mock("@/lib/categoriasCaixa", () => m);

const cat = (id: string, nome: string, tipo: "entrada" | "saida", grupo: CategoriaCaixa["grupo"]): CategoriaCaixa => ({
  id,
  nome,
  tipo,
  grupo,
  criado_em: "2026-01-01T00:00:00.000Z",
});

const categorias = [
  cat("1", "Aluguel", "saida", "despesas_administrativas"),
  cat("2", "Internet", "saida", "a_classificar"),
  cat("3", "Venda de sucata", "entrada", "a_classificar"),
];

function opcoesDe(select: HTMLElement) {
  return within(select).getAllByRole("option").map((o) => (o as HTMLOptionElement).value);
}

beforeEach(() => {
  vi.clearAllMocks();
  m.criarCategoriaCaixa.mockResolvedValue(undefined);
  m.trocarGrupoCategoriaCaixa.mockResolvedValue(undefined);
});

describe("CategoriasCaixaSection — grupos (#386)", () => {
  it("avisa quantas categorias estão sem grupo", () => {
    renderizar(<CategoriasCaixaSection categorias={categorias} onSalvo={async () => {}} />);
    expect(screen.getByText(/2 categorias sem grupo/)).toBeInTheDocument();
  });

  it("não mostra o aviso quando todas têm grupo", () => {
    renderizar(
      <CategoriasCaixaSection categorias={[categorias[0]!]} onSalvo={async () => {}} />,
    );
    expect(screen.queryByText(/sem grupo/)).not.toBeInTheDocument();
  });

  it("trocar o grupo salva na hora com o grupo escolhido", async () => {
    const onSalvo = vi.fn().mockResolvedValue(undefined);
    const { user } = renderizar(<CategoriasCaixaSection categorias={categorias} onSalvo={onSalvo} />);
    await user.selectOptions(screen.getByLabelText("Grupo de Internet"), "custos");
    expect(m.trocarGrupoCategoriaCaixa).toHaveBeenCalledWith("2", "custos");
    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
  });

  it("o select de uma categoria de entrada só traz grupos de entrada", () => {
    renderizar(<CategoriasCaixaSection categorias={categorias} onSalvo={async () => {}} />);
    expect(opcoesDe(screen.getByLabelText("Grupo de Venda de sucata"))).toEqual([
      "outras_receitas",
      "receitas_financeiras",
      "fora_do_resultado",
      "a_classificar",
    ]);
  });

  it("mostra o erro quando o banco recusa a troca", async () => {
    m.trocarGrupoCategoriaCaixa.mockRejectedValue(new Error("falhou"));
    const { user } = renderizar(<CategoriasCaixaSection categorias={categorias} onSalvo={async () => {}} />);
    await user.selectOptions(screen.getByLabelText("Grupo de Internet"), "custos");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("ao criar, entrada só oferece grupos de entrada e o padrão é A classificar", async () => {
    const { user } = renderizar(<CategoriasCaixaSection categorias={[]} onSalvo={async () => {}} />);
    const grupo = screen.getByLabelText("Grupo da nova categoria");
    expect(grupo).toHaveValue("a_classificar");
    expect(opcoesDe(grupo)).toContain("custos");
    await user.selectOptions(screen.getByLabelText("Tipo da categoria"), "entrada");
    expect(opcoesDe(grupo)).not.toContain("custos");
    expect(opcoesDe(grupo)).toContain("outras_receitas");
  });

  it("trocar o tipo volta o grupo pra A classificar se o atual não serve", async () => {
    const { user } = renderizar(<CategoriasCaixaSection categorias={[]} onSalvo={async () => {}} />);
    await user.selectOptions(screen.getByLabelText("Grupo da nova categoria"), "custos");
    await user.selectOptions(screen.getByLabelText("Tipo da categoria"), "entrada");
    expect(screen.getByLabelText("Grupo da nova categoria")).toHaveValue("a_classificar");
  });

  it("cria a categoria com o grupo escolhido", async () => {
    const { user } = renderizar(<CategoriasCaixaSection categorias={[]} onSalvo={async () => {}} />);
    await user.type(screen.getByLabelText("Nome da categoria"), "Salários");
    await user.selectOptions(screen.getByLabelText("Grupo da nova categoria"), "despesas_pessoal");
    await user.click(screen.getByRole("button", { name: /Adicionar/ }));
    expect(m.criarCategoriaCaixa).toHaveBeenCalledWith({
      nome: "Salários",
      tipo: "saida",
      grupo: "despesas_pessoal",
    });
  });
});

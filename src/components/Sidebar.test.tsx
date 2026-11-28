// @vitest-environment jsdom
/** O menu novo (visual novo, #990, tarefa 3): grupos, ícones, abrir e encolher. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import type { Operador } from "@/types/operador";

vi.mock("@/lib/numerosDoMenu", () => ({
  buscarNumerosDoMenu: () => Promise.resolve({}),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {}, aoGravarNoBanco: () => () => {} }));

let operador: Partial<Operador> = {};
const logout = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a", nome: "Matriz" }, lojasDisponiveis, logout }),
}));
let lojasDisponiveis: { id: string; nome: string }[] = [];
vi.mock("./LojaSwitcher", () => ({
  LojaSwitcher: () => (lojasDisponiveis.length > 1 ? <select aria-label="Loja" /> : null),
}));
vi.mock("./AreaRolavel", () => ({
  AreaRolavel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { Sidebar } = await import("./Sidebar");

const ADMIN: Partial<Operador> = { id: "op", nome: "Marcos Andrade", usuario: "marcos", admin: true, permissoes: [] };
const SO_CAIXA: Partial<Operador> = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["caixa"] };

function nomesDosLinks(dentroDe: HTMLElement) {
  return within(dentroDe)
    .getAllByRole("link")
    .map((link) => link.textContent);
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.tema;
  logout.mockReset();
  operador = ADMIN;
  lojasDisponiveis = [];
});

describe("Sidebar — os grupos", () => {
  it("o administrador vê os quatro grupos, com os 14 itens na ordem das regras", () => {
    renderizar(<Sidebar />);

    expect(nomesDosLinks(screen.getByRole("group", { name: "Atendimento" }))).toEqual([
      "Início",
      "Clientes",
      "Ordens de Serviço",
      "Orçamentos",
      "Garantias",
    ]);
    expect(nomesDosLinks(screen.getByRole("group", { name: "Estoque" }))).toEqual([
      "Estoque",
      "Fornecedores",
      "Serviços",
    ]);
    expect(nomesDosLinks(screen.getByRole("group", { name: "Financeiro" }))).toEqual([
      "Caixa Diário",
      "Contas a Pagar",
      "Contas a Receber",
      "Notas Fiscais",
    ]);
    expect(nomesDosLinks(screen.getByRole("group", { name: "Gestão" }))).toEqual(["Relações", "Funcionários"]);
  });

  it("um login só com Caixa vê só o grupo Financeiro, com um item", () => {
    operador = SO_CAIXA;
    renderizar(<Sidebar />);

    const grupos = screen.getAllByRole("group");
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toHaveAccessibleName("Financeiro");
    expect(nomesDosLinks(grupos[0])).toEqual(["Caixa Diário"]);
    expect(screen.queryByText("Atendimento")).not.toBeInTheDocument();
    // E no rodapé: Diagnóstico sim (é do balcão), Auditoria e Configurações não.
    expect(screen.getByRole("link", { name: "Diagnóstico" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Auditoria" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Configurações" })).not.toBeInTheDocument();
  });

  it("sem nenhum módulo liberado, avisa em vez de mostrar um menu vazio", () => {
    operador = { ...SO_CAIXA, permissoes: [] };
    renderizar(<Sidebar />);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum módulo liberado/)).toBeInTheDocument();
  });

  it("cada item leva pra rota de sempre", () => {
    renderizar(<Sidebar />);

    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Ordens de Serviço" })).toHaveAttribute("href", "/ordens-servico");
    expect(screen.getByRole("link", { name: "Contas a Receber" })).toHaveAttribute("href", "/contas-receber");
    expect(screen.getByRole("link", { name: "Relações" })).toHaveAttribute("href", "/relatorios");
  });
});

describe("Sidebar — abrir e encolher", () => {
  it("começa aberto; o botão encolhe, e a escolha é lembrada na próxima vez", async () => {
    const { user, unmount } = renderizar(<Sidebar />);
    expect(screen.getByRole("complementary")).toHaveAttribute("data-menu", "aberto");

    await user.click(screen.getByRole("button", { name: "Encolher o menu" }));
    expect(screen.getByRole("complementary")).toHaveAttribute("data-menu", "encolhido");
    expect(screen.getByRole("button", { name: "Abrir o menu" })).toBeInTheDocument();

    unmount(); // o programa fechou e abriu
    renderizar(<Sidebar />);
    expect(screen.getByRole("complementary")).toHaveAttribute("data-menu", "encolhido");

    await user.click(screen.getByRole("button", { name: "Abrir o menu" }));
    unmount();
  });

  it("depois de abrir de novo, a próxima vez também abre", async () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    const { user, unmount } = renderizar(<Sidebar />);
    await user.click(screen.getByRole("button", { name: "Abrir o menu" }));
    unmount();

    renderizar(<Sidebar />);
    expect(screen.getByRole("complementary")).toHaveAttribute("data-menu", "aberto");
  });

  it("encolhido, o nome continua existindo pra leitor de tela e aparece como dica", async () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    const { user } = renderizar(<Sidebar />);

    // O nome não some: só deixa de ser desenhado.
    const clientes = screen.getByRole("link", { name: "Clientes" });
    expect(within(clientes).getByText("Clientes")).toHaveClass("sr-only");
    // Os grupos continuam com nome, mesmo sem o título à vista.
    expect(screen.getByRole("group", { name: "Financeiro" })).toBeInTheDocument();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.tab(); // o botão de abrir
    await user.tab(); // o primeiro item
    expect(screen.getByRole("link", { name: "Início" })).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Início");
  });

  it("aberto, o nome está à vista e não tem dica repetindo ele", async () => {
    const { user } = renderizar(<Sidebar />);

    expect(within(screen.getByRole("link", { name: "Clientes" })).getByText("Clientes")).not.toHaveClass("sr-only");
    await user.tab();
    await user.tab();
    expect(screen.getByRole("link", { name: "Início" })).toHaveFocus();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("Sidebar — o rodapé", () => {
  it("o administrador tem Diagnóstico, Auditoria, Configurações e Sair, cada um com nome", async () => {
    const { user } = renderizar(<Sidebar />);

    expect(screen.getByRole("link", { name: "Diagnóstico" })).toHaveAttribute("href", "/diagnostico");
    expect(screen.getByRole("link", { name: "Auditoria" })).toHaveAttribute("href", "/auditoria");
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/configuracoes");
    expect(screen.getByText("Marcos Andrade")).toBeInTheDocument();
    expect(screen.getByText("@marcos")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("encolhido, quem está logado continua dito (as iniciais à vista, o nome pra leitor de tela)", () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    renderizar(<Sidebar />);

    expect(screen.getByText("MA")).toBeInTheDocument();
    expect(screen.getByText("Marcos Andrade").closest(".sr-only")).not.toBeNull();
  });

  it("com mais de uma loja e o menu encolhido, o ícone da loja abre o menu e leva o foco pra lista", async () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    lojasDisponiveis = [
      { id: "loja-a", nome: "Matriz" },
      { id: "loja-b", nome: "Filial" },
    ];
    const { user } = renderizar(<Sidebar />);
    expect(screen.queryByRole("combobox", { name: "Loja" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Abrir o menu pra trocar de loja (agora: Matriz)" }));
    expect(screen.getByRole("complementary")).toHaveAttribute("data-menu", "aberto");
    expect(screen.getByRole("combobox", { name: "Loja" })).toHaveFocus();
  });

  it("com uma loja só, não aparece ícone de loja nenhum", () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    renderizar(<Sidebar />);
    expect(screen.queryByRole("button", { name: /trocar de loja/ })).not.toBeInTheDocument();
  });

  it("o atalho do tema troca entre escuro e claro, e fica guardado", async () => {
    const { user } = renderizar(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "Mudar pro tema claro" }));
    expect(document.documentElement.dataset.tema).toBe("claro");
    expect(window.localStorage.getItem("sakura.tema")).toBe("claro");

    await user.click(screen.getByRole("button", { name: "Mudar pro tema escuro" }));
    expect(document.documentElement.dataset.tema).toBe("escuro");
  });
});

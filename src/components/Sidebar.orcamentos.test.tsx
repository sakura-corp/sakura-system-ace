// @vitest-environment jsdom
/** #379 e #1092: os números do menu (Orçamentos, OS, Contas a Pagar e a Receber), sem permissão nova. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";
import type { Operador } from "@/types/operador";

const buscar = vi.fn();
vi.mock("@/lib/numerosDoMenu", () => ({
  buscarNumerosDoMenu: (...a: unknown[]) => buscar(...a),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {}, aoGravarNoBanco: () => () => {} }));

let operador: Partial<Operador> = {};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a" }, lojasDisponiveis: [], logout: vi.fn() }),
}));
vi.mock("./LojaSwitcher", () => ({ LojaSwitcher: () => null }));
// A barra de rolagem própria (AreaRolavel) mede com ResizeObserver, que o jsdom não tem.
vi.mock("./AreaRolavel", () => ({
  AreaRolavel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { Sidebar } = await import("./Sidebar");

const TODOS = {
  orcamentos: { quantos: 3, cor: "perigo", dica: "3 orçamentos: 1 vencido e 2 vencendo" },
  ordens_servico: { quantos: 2, cor: "ok", dica: "2 OS prontas pra retirar" },
  contas_pagar: { quantos: 1, cor: "atencao", dica: "1 conta vencendo" },
  contas_receber: { quantos: 4, cor: "perigo", dica: "4 contas atrasadas" },
};

beforeEach(() => {
  window.localStorage.clear();
  buscar.mockReset();
  buscar.mockResolvedValue(TODOS);
});

/**
 * O item do menu, achado pelo nome EXATO: o número não entra no nome do link
 * (o teste do Electron e o leitor de tela procuram "Ordens de Serviço", não
 * "Ordens de Serviço 2 OS prontas..."). A frase vai na descrição do link.
 */
const item = (nome: string) => screen.getByRole("link", { name: nome });
const numeroDo = (nome: string) => item(nome).querySelector("[data-numero-do-menu]");

describe("Sidebar — os números do menu", () => {
  it("os quatro menus mostram o número; o nome do link não muda e a frase vai na descrição", async () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: true, permissoes: [] };
    renderizar(<Sidebar />);

    expect(item("Orçamentos")).toHaveAttribute("href", "/orcamentos");
    await waitFor(() => expect(item("Orçamentos")).toHaveAccessibleDescription("3 orçamentos: 1 vencido e 2 vencendo"));
    expect(numeroDo("Orçamentos")).toHaveTextContent("3");
    expect(numeroDo("Orçamentos")?.className).toContain("text-perigo");
    expect(numeroDo("Orçamentos")?.className).not.toContain("acao");

    expect(item("Ordens de Serviço")).toHaveAccessibleDescription("2 OS prontas pra retirar");
    expect(numeroDo("Ordens de Serviço")).toHaveTextContent("2");
    expect(numeroDo("Ordens de Serviço")?.className).toContain("text-ok");
    expect(item("Contas a Pagar")).toHaveAccessibleDescription("1 conta vencendo");
    expect(numeroDo("Contas a Pagar")?.className).toContain("text-atencao");
    expect(item("Contas a Receber")).toHaveAccessibleDescription("4 contas atrasadas");
    expect(numeroDo("Contas a Receber")).toHaveTextContent("4");
    expect(buscar).toHaveBeenCalledWith("loja-a", {
      ordens_servico: true,
      contas_pagar: true,
      contas_receber: true,
    });
  });

  it("com o menu encolhido, o número vira um ponto na cor do tipo, e a frase continua na descrição", async () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["ordens_servico"] };
    renderizar(<Sidebar />);

    await waitFor(() => expect(item("Orçamentos")).toHaveAccessibleDescription("3 orçamentos: 1 vencido e 2 vencendo"));
    const ponto = numeroDo("Orçamentos");
    expect(ponto).toBeEmptyDOMElement();
    expect(ponto?.className).toContain("bg-perigo");
  });

  it("zero não mostra nada: só o menu que tem número ganha a bolinha", async () => {
    buscar.mockResolvedValue({
      orcamentos: null,
      ordens_servico: TODOS.ordens_servico,
      contas_pagar: null,
      contas_receber: null,
    });
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: true, permissoes: [] };
    const { container } = renderizar(<Sidebar />);

    // Espera a resposta chegar à tela (o número da OS aparece) antes de conferir os zeros.
    await waitFor(() => expect(numeroDo("Ordens de Serviço")).not.toBeNull());
    expect(container.querySelectorAll("[data-numero-do-menu]")).toHaveLength(1);
    expect(item("Orçamentos")).not.toHaveAccessibleDescription();
  });

  it("quem não tem o módulo não vê o número nem busca a lista dele", async () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["ordens_servico"] };
    buscar.mockResolvedValue({ orcamentos: TODOS.orcamentos, ordens_servico: TODOS.ordens_servico });
    renderizar(<Sidebar />);

    await waitFor(() => expect(item("Ordens de Serviço")).toHaveAccessibleDescription("2 OS prontas pra retirar"));
    expect(buscar).toHaveBeenCalledWith("loja-a", {
      ordens_servico: true,
      contas_pagar: false,
      contas_receber: false,
    });
    expect(screen.queryByRole("link", { name: /Contas a Pagar/ })).not.toBeInTheDocument();
  });

  it("quem não tem Ordens de Serviço não vê Orçamentos nem busca nada (nenhuma permissão nova)", () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["estoque"] };
    renderizar(<Sidebar />);

    expect(screen.queryByRole("link", { name: /Orçamentos/ })).not.toBeInTheDocument();
    expect(buscar).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
/** #379: "Orçamentos" no menu, com o número dos abertos, e sem permissão nova. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Operador } from "@/types/operador";

const contar = vi.fn();
vi.mock("@/lib/ordensServico", () => ({
  contarOrcamentosAbertosDaLoja: (...a: unknown[]) => contar(...a),
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

let operador: Partial<Operador> = {};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a" }, logout: vi.fn() }),
}));
vi.mock("./LojaSwitcher", () => ({ LojaSwitcher: () => null }));
// A barra de rolagem própria (AreaRolavel) mede com ResizeObserver, que o jsdom não tem.
vi.mock("./AreaRolavel", () => ({
  AreaRolavel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { Sidebar } = await import("./Sidebar");

beforeEach(() => {
  contar.mockReset();
  contar.mockResolvedValue(3);
});

describe("Sidebar — Orçamentos", () => {
  it("quem tem Ordens de Serviço vê Orçamentos com o número dos abertos", async () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["ordens_servico"] };
    renderizar(<Sidebar />);

    expect(screen.getByRole("link", { name: /Orçamentos/ })).toHaveAttribute("href", "/orcamentos");
    expect(await screen.findByLabelText("3 em aberto")).toBeInTheDocument();
    expect(contar).toHaveBeenCalledWith("loja-a");
  });

  it("com o menu encolhido, o número vira um ponto, que continua dizendo quantos são", async () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["ordens_servico"] };
    renderizar(<Sidebar />);

    const ponto = await screen.findByLabelText("3 em aberto");
    expect(ponto).toBeEmptyDOMElement();
    window.localStorage.clear();
  });

  it("sem nenhum orçamento aberto, não mostra número", async () => {
    contar.mockResolvedValue(0);
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["ordens_servico"] };
    renderizar(<Sidebar />);

    await screen.findByRole("link", { name: "Orçamentos" });
    expect(screen.queryByLabelText(/em aberto/)).not.toBeInTheDocument();
  });

  it("quem não tem Ordens de Serviço não vê Orçamentos (nenhuma permissão nova)", () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["estoque"] };
    renderizar(<Sidebar />);

    expect(screen.queryByRole("link", { name: /Orçamentos/ })).not.toBeInTheDocument();
    expect(contar).not.toHaveBeenCalled();
  });
});

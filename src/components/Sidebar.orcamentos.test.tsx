// @vitest-environment jsdom
/** #379 e #1092: os números do menu (Orçamentos, OS, Contas a Pagar e a Receber), sem permissão nova. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
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
  contas_pagar: { quantos: 1, cor: "atencao", dica: "1 conta vencendo hoje" },
  contas_receber: { quantos: 4, cor: "perigo", dica: "4 contas atrasadas" },
};

beforeEach(() => {
  window.localStorage.clear();
  buscar.mockReset();
  buscar.mockResolvedValue(TODOS);
});

describe("Sidebar — os números do menu", () => {
  it("os quatro menus mostram o número, com a dica em palavras no aria-label", async () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: true, permissoes: [] };
    renderizar(<Sidebar />);

    expect(screen.getByRole("link", { name: /Orçamentos/ })).toHaveAttribute("href", "/orcamentos");
    const orcamentos = await screen.findByLabelText("3 orçamentos: 1 vencido e 2 vencendo");
    expect(orcamentos).toHaveTextContent("3");
    expect(orcamentos.className).toContain("text-perigo");
    expect(orcamentos.className).not.toContain("acao");
    expect(await screen.findByLabelText("2 OS prontas pra retirar")).toHaveTextContent("2");
    expect((await screen.findByLabelText("2 OS prontas pra retirar")).className).toContain("text-ok");
    expect((await screen.findByLabelText("1 conta vencendo hoje")).className).toContain("text-atencao");
    expect(await screen.findByLabelText("4 contas atrasadas")).toHaveTextContent("4");
    expect(buscar).toHaveBeenCalledWith("loja-a", {
      ordens_servico: true,
      contas_pagar: true,
      contas_receber: true,
    });
  });

  it("com o menu encolhido, o número vira um ponto na cor do tipo, com a dica", async () => {
    window.localStorage.setItem("sakura.menu", "encolhido");
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["ordens_servico"] };
    renderizar(<Sidebar />);

    const ponto = await screen.findByLabelText("3 orçamentos: 1 vencido e 2 vencendo");
    expect(ponto).toBeEmptyDOMElement();
    expect(ponto.className).toContain("bg-perigo");
  });

  it("zero não mostra nada: só o menu que tem número ganha a bolinha", async () => {
    buscar.mockResolvedValue({
      orcamentos: null,
      ordens_servico: TODOS.ordens_servico,
      contas_pagar: null,
      contas_receber: null,
    });
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: true, permissoes: [] };
    renderizar(<Sidebar />);

    // Espera a resposta chegar à tela (o número da OS aparece) antes de conferir os zeros.
    await screen.findByLabelText(TODOS.ordens_servico.dica);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("quem não tem o módulo não vê o número nem busca a lista dele", async () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["ordens_servico"] };
    buscar.mockResolvedValue({ orcamentos: TODOS.orcamentos, ordens_servico: TODOS.ordens_servico });
    renderizar(<Sidebar />);

    await screen.findByLabelText("2 OS prontas pra retirar");
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

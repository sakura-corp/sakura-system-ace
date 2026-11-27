// @vitest-environment jsdom
/**
 * #1016: login sem o Início nunca cai em "sem permissão" pelos caminhos do
 * programa. Quem tem pelo menos um módulo vai pro primeiro dele (a ordem do
 * menu); quem não tem nenhum vê a mensagem pra falar com quem administra a
 * loja; e nenhum caminho abre uma tela que o login não tem.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, userEvent } from "@/testes/tela";
import type { Operador } from "@/types/operador";

vi.mock("@/lib/supabase", () => ({ supabase: {}, isSupabaseConfigured: false }));
vi.mock("@/pages/painel/PainelPage", () => ({ PainelPage: () => <h1>Tela do Início</h1> }));

let operador: Operador | null = null;
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador }),
}));

const { PaginaInicial } = await import("./App");
const { PermissaoRoute } = await import("./components/PermissaoRoute");
const { BotaoVoltar } = await import("./components/BotaoVoltar");

function login(permissoes: Operador["permissoes"], admin = false): Operador {
  return {
    id: "op",
    usuario: "balcao",
    nome: "Balcão",
    admin,
    permissoes,
    ativo: true,
    deve_trocar_senha: false,
    criado_em: "2026-11-26T12:00:00Z",
  };
}

function OndeEstou() {
  return <span data-testid="rota">{useLocation().pathname}</span>;
}

// As rotas de verdade usam a mesma dupla: "/" → PaginaInicial, e cada módulo
// dentro do PermissaoRoute. A tela de cada módulo tem o BotaoVoltar das listas.
function montar(rotaInicial: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <Routes>
        <Route path="/" element={<PaginaInicial />} />
        <Route
          path="/relatorios"
          element={
            <PermissaoRoute modulo="relatorios">
              <BotaoVoltar />
              <h1>Tela de Relações</h1>
            </PermissaoRoute>
          }
        />
        <Route
          path="/caixa"
          element={
            <PermissaoRoute modulo="caixa">
              <h1>Tela do Caixa</h1>
            </PermissaoRoute>
          }
        />
      </Routes>
      <OndeEstou />
    </MemoryRouter>,
  );
  return { user };
}

const SEM_PERMISSAO = /não tem permissão/i;

beforeEach(() => {
  operador = null;
});

describe("PaginaInicial — pra onde vai quem abre o programa (#1016)", () => {
  it("login sem o Início e com Relações abre em Relações", async () => {
    operador = login(["relatorios"]);
    montar("/");
    expect(await screen.findByRole("heading", { name: "Tela de Relações" })).toBeInTheDocument();
    expect(screen.getByTestId("rota")).toHaveTextContent("/relatorios");
    expect(screen.queryByText(SEM_PERMISSAO)).not.toBeInTheDocument();
  });

  it("login sem nenhum módulo vê a mensagem pra falar com quem administra a loja", () => {
    operador = login([]);
    montar("/");
    expect(screen.getByText(/nenhum módulo liberado/i)).toBeInTheDocument();
    expect(screen.getByText(/fale com quem administra a loja/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("administrador abre no Início, como antes", () => {
    operador = login([], true);
    montar("/");
    expect(screen.getByRole("heading", { name: "Tela do Início" })).toBeInTheDocument();
  });

  it("o botão de voltar ao Início, sem o Início, volta pro primeiro módulo (não 'sem permissão')", async () => {
    operador = login(["relatorios"]);
    const { user } = montar("/relatorios");
    await user.click(screen.getByRole("button", { name: "Início" }));
    expect(await screen.findByRole("heading", { name: "Tela de Relações" })).toBeInTheDocument();
    expect(screen.getByTestId("rota")).toHaveTextContent("/relatorios");
    expect(screen.queryByText(SEM_PERMISSAO)).not.toBeInTheDocument();
  });
});

describe("PermissaoRoute — nenhum caminho abre tela que o login não tem (#1016)", () => {
  it("login só de Relações, numa tela do Caixa: não mostra o Caixa", () => {
    operador = login(["relatorios"]);
    montar("/caixa");
    expect(screen.queryByRole("heading", { name: "Tela do Caixa" })).not.toBeInTheDocument();
    expect(screen.getByText(SEM_PERMISSAO)).toBeInTheDocument();
  });

  it("login sem nenhum módulo, numa tela qualquer: a mesma mensagem do Início", () => {
    operador = login([]);
    montar("/caixa");
    expect(screen.queryByRole("heading", { name: "Tela do Caixa" })).not.toBeInTheDocument();
    expect(screen.getByText(/fale com quem administra a loja/i)).toBeInTheDocument();
  });

  it("perfil ainda não carregado (sem operador): não mostra a tela", () => {
    operador = null;
    montar("/caixa");
    expect(screen.queryByRole("heading", { name: "Tela do Caixa" })).not.toBeInTheDocument();
  });
});

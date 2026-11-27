// @vitest-environment jsdom
/**
 * #1191: depois de entrar, a pessoa cai no Início ("/"). Antes, ao trocar de
 * login no mesmo computador, o programa abria na última tela do login
 * anterior (o HashRouter guarda a rota) e, sem o módulo, aparecia
 * "Você não tem permissão para acessar este módulo". Quem não tem o Início
 * vai pro primeiro módulo dele pela `PaginaInicial` do App.
 */
import { render } from "@testing-library/react";
import { screen, userEvent, waitFor } from "@/testes/tela";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const login = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login }),
}));

function OndeEstou() {
  return <span data-testid="rota">{useLocation().pathname}</span>;
}

function montar(rotaInicial: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <LoginPage onConfigurarConexao={() => {}} />
      <OndeEstou />
    </MemoryRouter>,
  );
  return { user };
}

async function entrar(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Usuário"), "balcao");
  await user.type(screen.getByLabelText("Senha"), "segredo");
  await user.click(screen.getByRole("button", { name: /Entrar/ }));
}

beforeEach(() => {
  login.mockReset();
  vi.restoreAllMocks();
});

describe("LoginPage — depois de entrar vai pro Início (#1191)", () => {
  it("o login anterior estava no Caixa: entrar leva pra /", async () => {
    login.mockResolvedValue(undefined);
    const { user } = montar("/caixa");
    expect(screen.getByTestId("rota")).toHaveTextContent("/caixa");

    await entrar(user);

    expect(login).toHaveBeenCalledWith("balcao", "segredo");
    await waitFor(() => expect(screen.getByTestId("rota")).toHaveTextContent(/^\/$/));
  });

  it("senha errada não muda a rota (continua na tela de entrar, com o erro)", async () => {
    // A tela registra o erro no console (é o que vai pro erros.log).
    vi.spyOn(console, "error").mockImplementation(() => {});
    login.mockRejectedValue(new Error("Usuário ou senha inválidos"));
    const { user } = montar("/caixa");

    await entrar(user);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("rota")).toHaveTextContent("/caixa");
  });
});

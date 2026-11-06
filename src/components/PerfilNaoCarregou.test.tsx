// @vitest-environment jsdom
/**
 * #752: com o login feito mas sem o perfil do operador, a tela antiga ficava
 * sem o "Sair" e culpava o administrador. Agora diz o que houve e sempre dá
 * uma saída.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";

const logout = vi.fn();
const tentarCarregarPerfil = vi.fn();
let perfilFalhou = true;
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ perfilFalhou, logout, tentarCarregarPerfil }),
}));

const recarregar = vi.fn();
vi.mock("@/lib/janela", () => ({ recarregarJanela: () => recarregar() }));

const { PerfilNaoCarregou } = await import("./PerfilNaoCarregou");

beforeEach(() => {
  logout.mockReset().mockResolvedValue(undefined);
  tentarCarregarPerfil.mockReset();
  recarregar.mockReset();
});

describe("PerfilNaoCarregou", () => {
  it("perfil que falhou ao carregar: diz isso e oferece Tentar de novo e Sair", async () => {
    perfilFalhou = true;
    const { user } = renderizar(<PerfilNaoCarregou />);

    expect(screen.getByText(/Não consegui carregar o seu perfil/)).toBeInTheDocument();
    expect(screen.queryByText(/Fale com o administrador/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(tentarCarregarPerfil).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("login sem cadastro de operador (sem erro): fala do administrador, e o Sair continua", async () => {
    perfilFalhou = false;
    const { user } = renderizar(<PerfilNaoCarregou />);

    expect(screen.getByText(/Não achei o perfil de operador/)).toBeInTheDocument();
    expect(screen.getByText(/Fale com o administrador/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("o Sair do servidor falhou (login vencido e sem internet): recarrega a janela, que apaga o login da memória", async () => {
    perfilFalhou = true;
    logout.mockRejectedValue(new Error("Failed to fetch"));
    const { user } = renderizar(<PerfilNaoCarregou />);

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("enquanto sai: \"Saindo…\", e os botões não aceitam outro clique", async () => {
    perfilFalhou = true;
    logout.mockReturnValue(new Promise(() => {}));
    const { user } = renderizar(<PerfilNaoCarregou />);

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(screen.getByRole("button", { name: "Saindo…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Saindo…" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

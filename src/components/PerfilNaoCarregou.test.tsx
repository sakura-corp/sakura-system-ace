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

const sairSoNesteComputador = vi.fn();
vi.mock("@/lib/auth", () => ({ sairSoNesteComputador: () => sairSoNesteComputador() }));

const { PerfilNaoCarregou } = await import("./PerfilNaoCarregou");

beforeEach(() => {
  logout.mockReset().mockResolvedValue(undefined);
  tentarCarregarPerfil.mockReset();
  sairSoNesteComputador.mockReset().mockResolvedValue(undefined);
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

    expect(screen.getByText(/Fale com o administrador/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("sem internet, o Sair do servidor falha: sai só neste computador, nunca fica preso", async () => {
    perfilFalhou = true;
    logout.mockRejectedValue(new Error("Failed to fetch"));
    const { user } = renderizar(<PerfilNaoCarregou />);

    await user.click(screen.getByRole("button", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(sairSoNesteComputador).toHaveBeenCalledTimes(1);
  });
});

// @vitest-environment jsdom
/**
 * #752: quando buscar o perfil do operador dá erro (rede, banco), o contexto
 * avisa (`perfilFalhou`), e o "Tentar de novo" busca outra vez sem precisar
 * fechar o programa.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";

const buscarOperadorAtual = vi.fn();
vi.mock("@/lib/auth", () => ({
  buscarOperadorAtual: (...a: unknown[]) => buscarOperadorAtual(...a),
  entrar: vi.fn(),
  sair: vi.fn(),
}));
vi.mock("@/lib/lojas", () => ({ listarLojasDoOperador: vi.fn().mockResolvedValue([]) }));
const sessao = { user: { id: "u1" } };
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: sessao } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

const { AuthProvider, useAuth } = await import("./AuthContext");

function Mostra() {
  const { carregando, operador, perfilFalhou, tentarCarregarPerfil } = useAuth();
  if (carregando) return <p>carregando</p>;
  return (
    <>
      <p>{operador ? `operador ${operador.usuario}` : "sem operador"}</p>
      <p>{perfilFalhou ? "falhou" : "não falhou"}</p>
      <button onClick={tentarCarregarPerfil}>de novo</button>
    </>
  );
}

beforeEach(() => {
  buscarOperadorAtual.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("AuthContext — o perfil que não carregou (#752)", () => {
  it("erro ao buscar o perfil: perfilFalhou; Tentar de novo busca outra vez e limpa o erro", async () => {
    buscarOperadorAtual.mockRejectedValueOnce(new Error("rede")).mockResolvedValue({ id: "u1", usuario: "amigao" });
    const { user } = renderizar(
      <AuthProvider>
        <Mostra />
      </AuthProvider>,
    );

    expect(await screen.findByText("falhou")).toBeInTheDocument();
    expect(screen.getByText("sem operador")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "de novo" }));
    await waitFor(() => expect(screen.getByText("operador amigao")).toBeInTheDocument());
    expect(screen.getByText("não falhou")).toBeInTheDocument();
  });

  it("sem cadastro de operador (resposta vazia, sem erro): não é falha", async () => {
    buscarOperadorAtual.mockResolvedValue(null);
    renderizar(
      <AuthProvider>
        <Mostra />
      </AuthProvider>,
    );
    expect(await screen.findByText("não falhou")).toBeInTheDocument();
    expect(screen.getByText("sem operador")).toBeInTheDocument();
  });
});

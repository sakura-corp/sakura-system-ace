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
      // Como o de verdade: quem assina recebe logo um INITIAL_SESSION.
      onAuthStateChange: (callback: (evento: string, s: unknown) => void) => {
        queueMicrotask(() => callback("INITIAL_SESSION", sessao));
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
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
    // As duas buscas da abertura (getSession e INITIAL_SESSION) falham.
    buscarOperadorAtual
      .mockRejectedValueOnce(new Error("rede"))
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValue({ id: "u1", usuario: "amigao" });
    const { user } = renderizar(
      <AuthProvider>
        <Mostra />
      </AuthProvider>,
    );

    expect(await screen.findByText("falhou")).toBeInTheDocument();
    expect(screen.getByText("sem operador")).toBeInTheDocument();

    const antes = buscarOperadorAtual.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "de novo" }));
    await waitFor(() => expect(screen.getByText("operador amigao")).toBeInTheDocument());
    expect(screen.getByText("não falhou")).toBeInTheDocument();
    // Uma busca por clique (antes, refazer o efeito assinava de novo e buscava duas vezes).
    expect(buscarOperadorAtual.mock.calls.length - antes).toBe(1);
  });

  it("uma busca antiga que falha depois não apaga o perfil que a mais nova já carregou", async () => {
    let falharAntiga: (e: Error) => void = () => {};
    buscarOperadorAtual
      .mockImplementationOnce(() => new Promise((_, rejeitar) => (falharAntiga = rejeitar)))
      .mockResolvedValue({ id: "u1", usuario: "amigao" });
    renderizar(
      <AuthProvider>
        <Mostra />
      </AuthProvider>,
    );
    expect(await screen.findByText("operador amigao")).toBeInTheDocument();

    falharAntiga(new Error("rede"));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText("operador amigao")).toBeInTheDocument();
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

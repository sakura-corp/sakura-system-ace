import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, conexaoAtual } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ auth: {} })),
  conexaoAtual: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("./conexao", () => ({ conexaoAtual }));
vi.mock("./supabase", () => ({ supabase: {} }));

import { criarClienteTemporario } from "./operadores";

describe("criarClienteTemporario", () => {
  beforeEach(() => {
    createClient.mockClear();
    conexaoAtual.mockReset();
  });

  it("usa a conexão salva neste computador, sem guardar sessão", () => {
    conexaoAtual.mockReturnValue({ url: "https://empresa.supabase.co", chave: "chave-da-empresa" });
    criarClienteTemporario();
    expect(createClient).toHaveBeenCalledWith("https://empresa.supabase.co", "chave-da-empresa", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("dá erro claro em português quando não há conexão, sem cair no endereço de mentira", () => {
    conexaoAtual.mockReturnValue(null);
    expect(() => criarClienteTemporario()).toThrow(/não está ligado a nenhuma empresa/);
    expect(createClient).not.toHaveBeenCalled();
  });
});

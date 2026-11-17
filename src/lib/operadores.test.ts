import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, conexaoAtual, modoDemonstracao } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ auth: {} })),
  conexaoAtual: vi.fn(),
  modoDemonstracao: vi.fn(() => false),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("./conexao", () => ({ conexaoAtual, modoDemonstracao }));
vi.mock("./supabase", () => ({ supabase: {} }));

import { fetchDemo } from "@/demo/fetchDemo";
import { criarClienteTemporario } from "./operadores";

describe("criarClienteTemporario", () => {
  beforeEach(() => {
    createClient.mockClear();
    conexaoAtual.mockReset();
    modoDemonstracao.mockReturnValue(false);
  });

  it("usa a conexão salva neste computador, sem guardar sessão", () => {
    conexaoAtual.mockReturnValue({ url: "https://empresa.supabase.co", chave: "chave-da-empresa" });
    criarClienteTemporario();
    expect(createClient).toHaveBeenCalledWith("https://empresa.supabase.co", "chave-da-empresa", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  // #384: na demonstração o cadastro de operador também responde da memória;
  // sem isto ele ia pra rede e a tela dizia "sem conexão".
  it("na demonstração usa o fetch de mentira (nada sai do computador)", () => {
    modoDemonstracao.mockReturnValue(true);
    conexaoAtual.mockReturnValue({ url: "https://demonstracao.invalid", chave: "demo" });
    criarClienteTemporario();
    expect(createClient).toHaveBeenCalledWith("https://demonstracao.invalid", "demo", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchDemo },
    });
  });

  it("dá erro claro em português quando não há conexão, sem cair no endereço de mentira", () => {
    conexaoAtual.mockReturnValue(null);
    expect(() => criarClienteTemporario()).toThrow(/não está ligado a nenhuma empresa/);
    expect(createClient).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarVersaoDoBanco } from "@/lib/schemaVersao";
import { reiniciarConexaoParaTeste } from "@/hooks/useConexao";
import { renderizar, screen } from "@/testes/tela";
import { FaixaSemConexao } from "./FaixaSemConexao";

vi.mock("@/lib/schemaVersao", () => ({ buscarVersaoDoBanco: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ aoMudarARede: () => () => {} }));

describe("FaixaSemConexao", () => {
  beforeEach(() => {
    reiniciarConexaoParaTeste();
    vi.mocked(buscarVersaoDoBanco).mockReset();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("não aparece com conexão", () => {
    const { container } = renderizar(<FaixaSemConexao />);
    expect(container).toBeEmptyDOMElement();
  });

  it("aparece com offline e some com a volta", async () => {
    vi.mocked(buscarVersaoDoBanco).mockResolvedValue(82);
    renderizar(<FaixaSemConexao />);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    const faixa = screen.getByRole("status");
    expect(faixa).toHaveTextContent(
      "Sem conexão com o banco: o que você digitar agora não vai ser salvo.",
    );
    expect(faixa.querySelector("button, input")).toBeNull();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});

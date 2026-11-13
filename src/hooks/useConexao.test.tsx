// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buscarVersaoDoBanco } from "@/lib/schemaVersao";
import {
  INTERVALO_CONFERIR_CONEXAO_MS,
  reiniciarConexaoParaTeste,
  useConexao,
} from "./useConexao";

vi.mock("@/lib/schemaVersao", () => ({ buscarVersaoDoBanco: vi.fn() }));

// `aoMudarARede` de mentira: guarda o ouvinte pra o teste poder disparar.
const rede = vi.hoisted(() => ({
  ouvinte: null as null | ((e: "falhou" | "respondeu") => void),
}));
vi.mock("@/lib/supabase", () => ({
  aoMudarARede: (o: (e: "falhou" | "respondeu") => void) => {
    rede.ouvinte = o;
    return () => {
      if (rede.ouvinte === o) rede.ouvinte = null;
    };
  },
}));

const buscar = vi.mocked(buscarVersaoDoBanco);

function cair() {
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
}

describe("useConexao", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarConexaoParaTeste();
    buscar.mockReset();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("começa com conexão", () => {
    const { result } = renderHook(() => useConexao());
    expect(result.current.semConexao).toBe(false);
  });

  it("liga com o evento offline", () => {
    const { result } = renderHook(() => useConexao());
    cair();
    expect(result.current.semConexao).toBe(true);
  });

  it("liga se o navegador já começa offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { result } = renderHook(() => useConexao());
    expect(result.current.semConexao).toBe(true);
  });

  it("online + banco respondeu: some", async () => {
    buscar.mockResolvedValue(82);
    const { result } = renderHook(() => useConexao());
    cair();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(result.current.semConexao).toBe(false);
  });

  it("online + banco sem resposta (null): continua", async () => {
    buscar.mockResolvedValue(null);
    const { result } = renderHook(() => useConexao());
    cair();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.semConexao).toBe(true);
  });

  it("'falhou' do fetch liga e 'respondeu' desliga", () => {
    const { result } = renderHook(() => useConexao());
    act(() => rede.ouvinte?.("falhou"));
    expect(result.current.semConexao).toBe(true);
    act(() => rede.ouvinte?.("respondeu"));
    expect(result.current.semConexao).toBe(false);
  });

  it("confere a cada 30 s enquanto caído e para quando volta", async () => {
    buscar.mockResolvedValue(null);
    const { result } = renderHook(() => useConexao());
    cair();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_CONFERIR_CONEXAO_MS);
    });
    expect(buscar).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_CONFERIR_CONEXAO_MS);
    });
    expect(buscar).toHaveBeenCalledTimes(2);

    buscar.mockResolvedValue(82);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_CONFERIR_CONEXAO_MS);
    });
    expect(result.current.semConexao).toBe(false);
    const chamadas = buscar.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_CONFERIR_CONEXAO_MS * 3);
    });
    expect(buscar).toHaveBeenCalledTimes(chamadas);
  });

  it("não começa conferência sobreposta", async () => {
    let soltar: (v: number | null) => void = () => {};
    buscar.mockImplementation(() => new Promise((r) => (soltar = r)));
    renderHook(() => useConexao());
    cair();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_CONFERIR_CONEXAO_MS * 3);
    });
    expect(buscar).toHaveBeenCalledTimes(1);
    await act(async () => soltar(null));
  });

  it("dois componentes dividem o mesmo estado e a mesma verificação", async () => {
    buscar.mockResolvedValue(null);
    const a = renderHook(() => useConexao());
    const b = renderHook(() => useConexao());
    cair();
    expect(a.result.current.semConexao).toBe(true);
    expect(b.result.current.semConexao).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_CONFERIR_CONEXAO_MS);
    });
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("tela principal sai e volta com a faixa ligada: a conferência volta a rodar (revisão final)", async () => {
    buscar.mockResolvedValue(82);
    const primeira = renderHook(() => useConexao());
    cair();
    primeira.unmount();
    const { result } = renderHook(() => useConexao());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INTERVALO_CONFERIR_CONEXAO_MS);
    });
    expect(buscar).toHaveBeenCalled();
    expect(result.current.semConexao).toBe(false);
  });
});

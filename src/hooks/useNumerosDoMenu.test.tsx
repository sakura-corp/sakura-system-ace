// @vitest-environment jsdom
// #1092: o número do menu muda logo depois de uma gravação (pagar, receber,
// concluir, faturar), sem a pessoa trocar de tela, e nunca mostra o número de
// uma loja em cima de outra.
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ESPERA_DEPOIS_DE_GRAVAR_MS, useNumerosDoMenu } from "./useNumerosDoMenu";

const buscar = vi.fn();
vi.mock("@/lib/numerosDoMenu", () => ({
  buscarNumerosDoMenu: (...a: unknown[]) => buscar(...a),
}));

// `aoGravarNoBanco` de mentira: guarda o ouvinte pra o teste disparar.
const banco = vi.hoisted(() => ({ ouvinte: null as null | (() => void) }));
vi.mock("@/lib/supabase", () => ({
  aoGravarNoBanco: (o: () => void) => {
    banco.ouvinte = o;
    return () => {
      if (banco.ouvinte === o) banco.ouvinte = null;
    };
  },
}));

const TODOS = { ordens_servico: true, contas_pagar: true, contas_receber: true };
const comRota = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;
const um = (dica: string) => ({ contas_pagar: { quantos: 1, cor: "perigo" as const, dica } });

beforeEach(() => {
  buscar.mockReset();
  banco.ouvinte = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useNumerosDoMenu", () => {
  it("depois de uma gravação no banco, busca de novo (uma vez só, mesmo com várias gravações juntas)", async () => {
    buscar.mockResolvedValueOnce(um("1 conta atrasada")).mockResolvedValue({});
    const { result } = renderHook(() => useNumerosDoMenu("loja-a", TODOS), { wrapper: comRota });
    await waitFor(() => expect(result.current.contas_pagar?.quantos).toBe(1));
    expect(buscar).toHaveBeenCalledTimes(1);

    // Pagou a conta: o faturamento/pagamento grava mais de uma vez em seguida.
    vi.useFakeTimers();
    act(() => {
      banco.ouvinte?.();
      banco.ouvinte?.();
      banco.ouvinte?.();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_DEPOIS_DE_GRAVAR_MS);
    });
    vi.useRealTimers();

    await waitFor(() => expect(result.current.contas_pagar).toBeUndefined());
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("ao trocar de loja, o número da loja anterior some na hora, antes de a nova responder", async () => {
    buscar.mockResolvedValueOnce(um("1 conta atrasada"));
    const { result, rerender } = renderHook(({ loja }) => useNumerosDoMenu(loja, TODOS), {
      wrapper: comRota,
      initialProps: { loja: "loja-a" },
    });
    await waitFor(() => expect(result.current.contas_pagar?.quantos).toBe(1));

    // A loja B ainda não respondeu.
    buscar.mockReturnValueOnce(new Promise(() => {}));
    rerender({ loja: "loja-b" });
    expect(result.current.contas_pagar).toBeUndefined();
  });

  it("sem os módulos, não busca nem ouve", () => {
    const { result } = renderHook(
      () => useNumerosDoMenu("loja-a", { ordens_servico: false, contas_pagar: false, contas_receber: false }),
      { wrapper: comRota },
    );
    expect(buscar).not.toHaveBeenCalled();
    expect(result.current).toEqual({});
  });
});

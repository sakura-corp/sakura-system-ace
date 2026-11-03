// @vitest-environment jsdom
/** #372: a busca geral do Ctrl+K, vista pela tela montada. */
import { act, fireEvent } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { useEnterParaProximoCampo } from "@/hooks/useEnterParaProximoCampo";
import type { ResultadoBusca } from "@/schemas/buscaGlobal";
import { renderizar, screen } from "@/testes/tela";
import type { Operador } from "@/types/operador";

const buscar = vi.fn();
vi.mock("@/lib/buscaGlobal", () => ({
  buscarGlobal: (...a: unknown[]) => buscar(...a),
}));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {} }));

let operador: Partial<Operador> = {};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a" } }),
}));

const { BuscaGlobal } = await import("./BuscaGlobal");

const placa: ResultadoBusca = { tipo: "veiculo", id: "v1", titulo: "ABC1D23", detalhe: "Gol - Ana", veiculo_id: null };
const peca: ResultadoBusca = { tipo: "peca", id: "p1", titulo: "Pneu aro 15", detalhe: null, veiculo_id: null };

function Local() {
  const l = useLocation();
  return <div data-testid="local">{l.pathname}</div>;
}

/** O app de verdade liga o "Enter pula de campo" pra tela inteira (App.tsx). */
function Tela() {
  useEnterParaProximoCampo();
  return (
    <form>
      <BuscaGlobal />
      <input aria-label="Outro campo" />
      <Routes>
        <Route path="*" element={<Local />} />
      </Routes>
    </form>
  );
}

beforeEach(() => {
  buscar.mockReset();
  buscar.mockResolvedValue([placa]);
  operador = { id: "op", nome: "Ana", usuario: "ana", admin: true, permissoes: [] };
});
afterEach(() => {
  vi.useRealTimers();
});

describe("BuscaGlobal", () => {
  it("Ctrl+K abre a caixa e foca o campo de busca", async () => {
    const { user } = renderizar(<Tela />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("Esc fecha e devolve o foco a quem tinha", async () => {
    const { user } = renderizar(<Tela />);
    screen.getByLabelText("Outro campo").focus();
    await user.keyboard("{Control>}k{/Control}");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Outro campo")).toHaveFocus();
  });

  it("espera 250 ms depois da última tecla e busca uma vez só", () => {
    vi.useFakeTimers();
    renderizar(<Tela />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const campo = screen.getByRole("combobox");

    fireEvent.change(campo, { target: { value: "ab" } });
    act(() => void vi.advanceTimersByTime(200));
    fireEvent.change(campo, { target: { value: "abc" } });
    act(() => void vi.advanceTimersByTime(200));
    expect(buscar).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(60));
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar.mock.calls[0][0]).toBe("abc");
    expect(buscar.mock.calls[0][1]).toBe("loja-a");
  });

  it("não busca com menos de 2 letras", () => {
    vi.useFakeTimers();
    renderizar(<Tela />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a" } });
    act(() => void vi.advanceTimersByTime(1000));
    expect(buscar).not.toHaveBeenCalled();
  });

  it("digitar de novo cancela a busca anterior", () => {
    vi.useFakeTimers();
    buscar.mockReturnValue(new Promise(() => {}));
    renderizar(<Tela />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const campo = screen.getByRole("combobox");

    fireEvent.change(campo, { target: { value: "ab" } });
    act(() => void vi.advanceTimersByTime(250));
    const primeiroSinal = buscar.mock.calls[0][2] as AbortSignal;
    expect(primeiroSinal.aborted).toBe(false);

    fireEvent.change(campo, { target: { value: "abc" } });
    act(() => void vi.advanceTimersByTime(250));
    expect(primeiroSinal.aborted).toBe(true);
    expect((buscar.mock.calls[1][2] as AbortSignal).aborted).toBe(false);
  });

  it("seta pra baixo + Enter abre o item, sem o Enter pular de campo", async () => {
    // jsdom não calcula layout: sem simular `offsetParent`, o atalho global
    // nunca faria nada e este teste passaria à toa (licoes.md, item 77).
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return this.parentNode;
      },
    });
    onTestFinished(() => {
      if (original) Object.defineProperty(HTMLElement.prototype, "offsetParent", original);
    });

    const { user } = renderizar(<Tela />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("combobox"), "abc1d23");
    const opcao = await screen.findByRole("option", { name: /ABC1D23/ });
    expect(opcao).toHaveAttribute("aria-selected", "false");

    await user.keyboard("{ArrowDown}");
    expect(opcao).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("local")).toHaveTextContent("/veiculos/v1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Outro campo")).not.toHaveFocus();
  });

  it("quem não tem Estoque não vê Peças, mesmo se o banco devolver uma peça", async () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["clientes"] };
    buscar.mockResolvedValue([placa, peca]);
    const { user } = renderizar(<Tela />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("combobox"), "pneu");

    expect(await screen.findByRole("option", { name: /ABC1D23/ })).toBeInTheDocument();
    expect(screen.queryByText("Peças")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Pneu aro 15/ })).not.toBeInTheDocument();
  });

  it("sem nenhum módulo de busca, nem mostra o campo", () => {
    operador = { id: "op", nome: "Ana", usuario: "ana", admin: false, permissoes: ["caixa"] };
    renderizar(<Tela />);
    expect(screen.queryByRole("button", { name: /Buscar/ })).not.toBeInTheDocument();
  });

  it("mostra Nada encontrado e o erro de verdade", async () => {
    buscar.mockResolvedValueOnce([]);
    const { user } = renderizar(<Tela />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("combobox"), "zzz");
    expect(await screen.findByText("Nada encontrado")).toBeInTheDocument();

    buscar.mockRejectedValueOnce(new Error("rede caiu"));
    await user.type(screen.getByRole("combobox"), "y");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("banco ainda sem a migration 0077: aviso calmo, não erro", async () => {
    buscar.mockRejectedValueOnce({ code: "PGRST202", message: "Could not find the function public.buscar_global" });
    const { user } = renderizar(<Tela />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("combobox"), "abc");
    expect(await screen.findByText(/começa a funcionar quando o banco/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Nada encontrado")).not.toBeInTheDocument();
  });
});

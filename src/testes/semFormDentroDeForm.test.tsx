// @vitest-environment jsdom
/**
 * O teste da trava de `<form>` dentro de `<form>` (#1130): ela reprova de
 * verdade quando alguém aninha um formulário, e fica quieta quando não.
 *
 * Usa a vigia "solta" (`criarVigia`) e o `render` direto, sem o
 * `@/testes/tela`: lá a trava já vem ligada, e um teste que aninha de
 * propósito reprovaria sozinho.
 */
import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { acharFormDentroDeForm, criarVigia } from "./semFormDentroDeForm";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Roda a vigia em volta de `montar` e devolve a mensagem do erro (ou null). */
function vigiar(montar: () => void): string | null {
  // O React escreve o aviso dele no console: aqui ele é esperado, e só polui.
  vi.spyOn(console, "error").mockImplementation(() => {});
  const vigia = criarVigia();
  vigia.comecar();
  montar();
  try {
    vigia.terminar();
    return null;
  } catch (erro) {
    return (erro as Error).message;
  }
}

describe("a trava de <form> dentro de <form> (#1130)", () => {
  it("reprova quando uma janela com formulário é desenhada dentro de outro formulário", () => {
    const mensagem = vigiar(() => {
      render(
        <form aria-label="Ordem de serviço">
          <div role="dialog">
            <form aria-label="Cadastrar peça">
              <button type="submit">Salvar peça</button>
            </form>
          </div>
        </form>,
      );
    });
    expect(mensagem).toContain('<form "Cadastrar peça"> está dentro de <form "Ordem de serviço">');
    // O aviso do próprio React também foi pego (React 19 escreve
    // "In HTML, <form> cannot be a descendant of <form>").
    expect(mensagem).toContain("aviso do React");
  });

  it("reprova mesmo se a janela abre e fecha no meio do teste", async () => {
    let alternar = () => {};
    function Tela() {
      const [aberta, setAberta] = useState(false);
      alternar = () => setAberta((a) => !a);
      return <form aria-label="Venda">{aberta && <form aria-label="Novo cliente" />}</form>;
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    const vigia = criarVigia();
    vigia.comecar();
    render(<Tela />);
    act(() => alternar());
    // Deixa o observador da tela ver a mudança antes de a janela fechar.
    await Promise.resolve();
    act(() => alternar());
    expect(acharFormDentroDeForm()).toEqual([]);
    expect(() => vigia.terminar()).toThrow(/<form "Novo cliente"> está dentro de <form "Venda">/);
  });

  it("não reprova formulários lado a lado (a janela FORA do <form>)", () => {
    const mensagem = vigiar(() => {
      render(
        <div>
          <form aria-label="Ordem de serviço">
            <button type="submit">Salvar OS</button>
          </form>
          <div role="dialog">
            <form aria-label="Cadastrar peça">
              <button type="submit">Salvar peça</button>
            </form>
          </div>
        </div>,
      );
    });
    expect(mensagem).toBeNull();
  });

  it("devolve o console.error de antes ao terminar", () => {
    const antes = console.error;
    const vigia = criarVigia();
    vigia.comecar();
    expect(console.error).not.toBe(antes);
    vigia.terminar();
    expect(console.error).toBe(antes);
  });
});

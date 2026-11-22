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
  });

  it("pega também o aviso do React, mesmo sem nada aninhado na tela", () => {
    // Do jeito que o React 19 escreve (o texto com %s e as palavras soltas).
    // Chamado direto, e não montando um <form> aninhado, porque o React só
    // avisa uma vez por arquivo: dependeria da ordem dos testes.
    const mensagem = vigiar(() => {
      console.error(
        "In HTML, %s cannot be a descendant of <%s>.\nThis will cause a hydration error.%s",
        "<form>",
        "form",
        "",
      );
    });
    expect(mensagem).toContain("aviso do React");
  });

  it("não confunde outro aviso do React com o do <form>", () => {
    const mensagem = vigiar(() => {
      console.error("In HTML, %s cannot be a descendant of <%s>.", "<div>", "p");
    });
    expect(mensagem).toBeNull();
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

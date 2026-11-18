// @vitest-environment jsdom
//
// A janela que troca o `confirm()` do navegador (#1132; #1079, item 1): diz o
// nome do que vai ser apagado, o foco começa no "Cancelar", Esc e clicar fora
// cancelam, e o `await confirmar(...)` devolve sim ou não.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JanelaDeConfirmar, useConfirmar } from "./JanelaDeConfirmar";
import { Modal } from "./Modal";

// O jsdom não calcula layout: sem isto, o Modal acharia que nenhum botão
// aparece na tela e não teria o que focar.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {} as DOMRect,
  ] as unknown as DOMRectList);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function abrirJanela(extra: Partial<Parameters<typeof JanelaDeConfirmar>[0]> = {}) {
  const aoConfirmar = vi.fn();
  const aoCancelar = vi.fn();
  render(
    <div>
      <button type="button">Botão da tela de trás</button>
      <JanelaDeConfirmar
        pergunta="Excluir o produto"
        item="Pneu 175/70 R13"
        aoConfirmar={aoConfirmar}
        aoCancelar={aoCancelar}
        {...extra}
      />
    </div>,
  );
  return { aoConfirmar, aoCancelar };
}

describe("JanelaDeConfirmar", () => {
  it("mostra o nome do item na pergunta", () => {
    abrirJanela();
    expect(
      screen.getByRole("dialog", { name: "Excluir o produto Pneu 175/70 R13?" }),
    ).toBeTruthy();
  });

  it("começa com o foco no Cancelar (um Enter no automático não apaga nada)", () => {
    abrirJanela();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
  });

  it("Esc cancela", () => {
    const { aoConfirmar, aoCancelar } = abrirJanela();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it("clicar fora da janela cancela", () => {
    const { aoCancelar } = abrirJanela();
    const fundo = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.click(fundo);
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });

  it("o botão de perigo diz o verbo e confirma", () => {
    const { aoConfirmar, aoCancelar } = abrirJanela();
    const botao = screen.getByRole("button", { name: "Excluir" });
    expect(botao.className).toContain("bg-red-600");
    fireEvent.click(botao);
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    expect(aoCancelar).not.toHaveBeenCalled();
  });

  it("clicar 2 vezes no Excluir confirma uma vez só", () => {
    const { aoConfirmar, aoCancelar } = abrirJanela();
    const botao = screen.getByRole("button", { name: "Excluir" });
    fireEvent.click(botao);
    fireEvent.click(botao);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    expect(aoCancelar).not.toHaveBeenCalled();
  });

  it("aceita outro verbo e o botão principal quando não é apagar", () => {
    abrirJanela({ pergunta: "Fechar o caixa de", item: "hoje", textoDoBotao: "Fechar caixa", perigo: false });
    const botao = screen.getByRole("button", { name: "Fechar caixa" });
    expect(botao.className).toContain("bg-acao");
    expect(botao.className).not.toContain("bg-red-600");
  });

  it("mostra a consequência quando ela é dita", () => {
    abrirJanela({ consequencia: "Os produtos dela ficam sem categoria." });
    expect(screen.getByText("Os produtos dela ficam sem categoria.")).toBeTruthy();
  });
});

describe("JanelaDeConfirmar em cima de outra janela", () => {
  // O faturar da OS é uma janela, e o confirm() dele vira esta janela por cima.
  function MontarSobreModal({ dentro }: { dentro: boolean }) {
    const aoFecharDeTras = vi.fn();
    const aoCancelar = vi.fn();
    // Como na vida: o faturar já está aberto, e a confirmação abre depois.
    const tela = (aberta: boolean) => {
      const confirmacao = aberta && (
        <JanelaDeConfirmar pergunta="Excluir o pagamento" item="Pix" aoConfirmar={() => {}} aoCancelar={aoCancelar} />
      );
      return (
        <div>
          <Modal titulo="Faturar a OS" onFechar={aoFecharDeTras}>
            <input aria-label="Valor" />
            {dentro && confirmacao}
          </Modal>
          {!dentro && confirmacao}
        </div>
      );
    };
    const { rerender } = render(tela(false));
    rerender(tela(true));
    return { aoFecharDeTras, aoCancelar };
  }

  for (const dentro of [true, false]) {
    it(`Esc cancela a confirmação, e não fecha a janela de trás (${dentro ? "dentro" : "ao lado"} dela)`, () => {
      const { aoFecharDeTras, aoCancelar } = MontarSobreModal({ dentro });
      fireEvent.keyDown(screen.getByRole("button", { name: "Cancelar" }), { key: "Escape" });
      expect(aoCancelar).toHaveBeenCalledTimes(1);
      expect(aoFecharDeTras).not.toHaveBeenCalled();
    });

    it(`Tab anda entre os botões da confirmação (${dentro ? "dentro" : "ao lado"} da outra janela)`, () => {
      MontarSobreModal({ dentro });
      const cancelar = screen.getByRole("button", { name: "Cancelar" });
      expect(document.activeElement).toBe(cancelar);
      fireEvent.keyDown(cancelar, { key: "Tab" });
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Excluir" }));
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Tab" });
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Fechar");
      expect(screen.getByRole("dialog", { name: "Excluir o pagamento Pix?" }).contains(document.activeElement)).toBe(true);
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Tab", shiftKey: true });
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Excluir" }));
    });
  }
});

describe("JanelaDeConfirmar pro leitor de tela", () => {
  it("anuncia a consequência junto com o título", () => {
    abrirJanela({ consequencia: "Os produtos dela ficam sem categoria." });
    const dialogo = screen.getByRole("dialog");
    const id = dialogo.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toContain(
      "Os produtos dela ficam sem categoria.",
    );
  });
});

describe("useConfirmar", () => {
  function TelaDeExemplo({ aoResponder }: { aoResponder: (sim: boolean) => void }) {
    const { confirmar, janela } = useConfirmar();
    const [contagem, setContagem] = useState(0);
    return (
      <div>
        <button
          type="button"
          onClick={async () => {
            const sim = await confirmar({ pergunta: "Excluir o cliente", item: "Maria" });
            aoResponder(sim);
            setContagem((c) => c + 1);
          }}
        >
          Excluir Maria
        </button>
        <span>respostas: {contagem}</span>
        {janela}
      </div>
    );
  }

  it("o await devolve true no botão de excluir e fecha a janela", async () => {
    const aoResponder = vi.fn();
    render(<TelaDeExemplo aoResponder={aoResponder} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Maria" }));
    expect(screen.getByRole("dialog", { name: "Excluir o cliente Maria?" })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    });
    expect(aoResponder).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o await devolve false no Esc", async () => {
    const aoResponder = vi.fn();
    render(<TelaDeExemplo aoResponder={aoResponder} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Maria" }));
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(aoResponder).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clicar 2 vezes no excluir responde uma vez só", async () => {
    const aoResponder = vi.fn();
    render(<TelaDeExemplo aoResponder={aoResponder} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir Maria" }));
    const botao = screen.getByRole("button", { name: "Excluir" });
    await act(async () => {
      fireEvent.click(botao);
      fireEvent.click(botao);
    });
    expect(aoResponder).toHaveBeenCalledTimes(1);
  });

  it("o foco volta pro botão que abriu", async () => {
    render(<TelaDeExemplo aoResponder={() => {}} />);
    const abriu = screen.getByRole("button", { name: "Excluir Maria" });
    abriu.focus();
    fireEvent.click(abriu);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });
    expect(document.activeElement).toBe(abriu);
  });
});

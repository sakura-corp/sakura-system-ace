// @vitest-environment jsdom
//
// A JanelaDeConfirmar (#1132, parte 1/5 da #1085): troca o `confirm()` do
// navegador. O que estes testes guardam é o combinado na tarefa: a janela diz
// o NOME do que vai ser apagado, o foco começa no "Cancelar" (um Enter no
// automático nunca apaga), Esc e clicar fora cancelam, e o `await confirmar()`
// devolve sim ou não uma vez só (clicar 2 vezes não apaga 2 vezes).

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JanelaDeConfirmar, useConfirmar, type PedidoDeConfirmar } from "./JanelaDeConfirmar";

// O jsdom não calcula layout: sem isto, o Modal acharia que nenhum botão
// aparece na tela e não teria o que focar (o mesmo do Modal.test.tsx).
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {} as DOMRect,
  ] as unknown as DOMRectList);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const EXCLUIR_PNEU: PedidoDeConfirmar = {
  acao: "Excluir o produto",
  item: "Pneu 175/70 R13",
  explicacao: "Ele sai da lista de peças. As OS antigas continuam com ele.",
  botao: "Excluir produto",
};

function abrirJanela(pedido: PedidoDeConfirmar = EXCLUIR_PNEU) {
  const aoConfirmar = vi.fn();
  const aoCancelar = vi.fn();
  const { container } = render(
    <div>
      <button type="button">Botão da tela de trás</button>
      <JanelaDeConfirmar pedido={pedido} aoConfirmar={aoConfirmar} aoCancelar={aoCancelar} />
    </div>,
  );
  return { aoConfirmar, aoCancelar, container };
}

describe("JanelaDeConfirmar", () => {
  it("mostra o nome do item na pergunta", () => {
    abrirJanela();
    const janela = screen.getByRole("dialog", { name: "Excluir o produto Pneu 175/70 R13?" });
    expect(janela).toBeTruthy();
    expect(janela.textContent).toContain("Ele sai da lista de peças.");
  });

  it("o foco começa no Cancelar (Enter no automático não apaga)", () => {
    abrirJanela();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
  });

  it("Esc cancela", () => {
    const { aoConfirmar, aoCancelar } = abrirJanela();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(aoConfirmar).not.toHaveBeenCalled();
  });

  it("clicar fora cancela; clicar dentro não", () => {
    const { aoCancelar, container } = abrirJanela();
    fireEvent.click(screen.getByRole("dialog"));
    expect(aoCancelar).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector(".sakura-modal-fundo")!);
    expect(aoCancelar).toHaveBeenCalledTimes(1);
  });

  it("o botão de apagar é o vermelho e diz o verbo; o Cancelar não é", () => {
    const { aoConfirmar, aoCancelar } = abrirJanela();
    const apagar = screen.getByRole("button", { name: "Excluir produto" });
    expect(apagar.className).toContain("bg-red-600");
    expect(screen.getByRole("button", { name: "Cancelar" }).className).not.toContain("bg-red-600");
    fireEvent.click(apagar);
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    expect(aoCancelar).not.toHaveBeenCalled();
  });

  it("clicar 2 vezes no botão de apagar chama aoConfirmar uma vez só (e o Esc depois não cancela)", () => {
    const { aoConfirmar, aoCancelar } = abrirJanela();
    const apagar = screen.getByRole("button", { name: "Excluir produto" });
    fireEvent.click(apagar);
    fireEvent.click(apagar);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(aoConfirmar).toHaveBeenCalledTimes(1);
    expect(aoCancelar).not.toHaveBeenCalled();
  });

  it("sem perigo (fechar o caixa), o botão é o laranja", () => {
    abrirJanela({ acao: "Fechar o caixa de", item: "hoje", botao: "Fechar caixa", tom: "normal" });
    const botao = screen.getByRole("button", { name: "Fechar caixa" });
    expect(botao.className).toContain("bg-acao");
    expect(botao.className).not.toContain("bg-red-600");
  });
});

/** Uma tela de mentira que usa o jeito de trocar o `confirm()`. */
function TelaDeTeste({ aoResponder }: { aoResponder: (resposta: boolean) => void }) {
  const { confirmar, janela } = useConfirmar();
  const [vezes, setVezes] = useState(0);
  async function excluir() {
    const sim = await confirmar(EXCLUIR_PNEU);
    aoResponder(sim);
    setVezes((v) => v + 1);
  }
  return (
    <div>
      <button type="button" onClick={excluir}>
        Excluir
      </button>
      <p>respostas: {vezes}</p>
      {janela}
    </div>
  );
}

describe("useConfirmar (o await que troca o confirm)", () => {
  it("devolve true no botão de apagar, e a janela some", async () => {
    const aoResponder = vi.fn();
    render(<TelaDeTeste aoResponder={aoResponder} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Excluir produto" }));
    });
    expect(aoResponder).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("devolve false no Esc", async () => {
    const aoResponder = vi.fn();
    render(<TelaDeTeste aoResponder={aoResponder} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(aoResponder).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clicar 2 vezes no botão de apagar responde uma vez só", async () => {
    const aoResponder = vi.fn();
    render(<TelaDeTeste aoResponder={aoResponder} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    const apagar = screen.getByRole("button", { name: "Excluir produto" });
    await act(async () => {
      fireEvent.click(apagar);
      fireEvent.click(apagar);
    });
    expect(aoResponder).toHaveBeenCalledTimes(1);
    expect(screen.getByText("respostas: 1")).toBeTruthy();
  });

  it("a tela que sai com a janela aberta responde false (ninguém fica esperando)", async () => {
    const aoResponder = vi.fn();
    const { unmount } = render(<TelaDeTeste aoResponder={aoResponder} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await act(async () => {
      unmount();
    });
    expect(aoResponder).toHaveBeenCalledWith(false);
  });

  it("duas perguntas seguidas: a segunda janela também responde", async () => {
    const respostas: boolean[] = [];
    function DuasPerguntas() {
      const { confirmar, janela } = useConfirmar();
      async function fazer() {
        respostas.push(await confirmar({ ...EXCLUIR_PNEU, item: "Pneu A" }));
        respostas.push(await confirmar({ ...EXCLUIR_PNEU, item: "Pneu B" }));
      }
      return (
        <div>
          <button type="button" onClick={fazer}>
            Fazer
          </button>
          {janela}
        </div>
      );
    }
    render(<DuasPerguntas />);
    fireEvent.click(screen.getByRole("button", { name: "Fazer" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Excluir produto" }));
    });
    expect(screen.getByRole("dialog", { name: "Excluir o produto Pneu B?" })).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Excluir produto" }));
    });
    expect(respostas).toEqual([true, true]);
  });
});

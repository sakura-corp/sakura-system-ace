// @vitest-environment jsdom
//
// A Dica do visual novo (#990, tarefa 2): o texto que aparece ao passar o
// mouse. Ela entra no lugar do `title` do navegador, que demora, não aparece
// pra quem usa só o teclado e não segue a aparência do programa. O balcão é
// operado no teclado: a dica TEM que aparecer no foco também.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dica } from "./Dica";
import { Modal } from "./Modal";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function montar(texto = "Abrir a ficha do veículo") {
  render(
    <Dica texto={texto}>
      <button type="button">RTA-4B71</button>
    </Dica>,
  );
  return screen.getByRole("button", { name: "RTA-4B71" });
}

const passarTempo = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

/** Chegar num botão com o Tab: a tecla, e depois o foco. */
function chegarPeloTeclado(elemento: HTMLElement) {
  fireEvent.keyDown(document, { key: "Tab" });
  elemento.focus();
  fireEvent.focus(elemento);
}

describe("Dica", () => {
  it("aparece um instante depois de o mouse parar em cima, e some quando ele sai", () => {
    const botao = montar();
    fireEvent.mouseEnter(botao);
    // Não na hora: cruzar a tela com o mouse não pode acender dica por dica.
    expect(screen.queryByRole("tooltip")).toBeNull();

    passarTempo(400);
    expect(screen.getByRole("tooltip").textContent).toBe("Abrir a ficha do veículo");

    fireEvent.mouseLeave(botao);
    passarTempo(200);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("no teclado aparece na hora, e o leitor de tela lê a dica junto do botão", () => {
    const botao = montar();
    chegarPeloTeclado(botao);
    const dica = screen.getByRole("tooltip");
    expect(dica.textContent).toBe("Abrir a ficha do veículo");
    expect(botao.getAttribute("aria-describedby")).toBe(dica.id);

    fireEvent.blur(botao);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(botao.getAttribute("aria-describedby")).toBeNull();
  });

  it("Esc fecha a dica sem tirar o foco do botão", () => {
    const botao = montar();
    chegarPeloTeclado(botao);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(document.activeElement).toBe(botao);
  });

  it("clicar não acende a dica: ela não pode ficar na frente do que o clique abriu", () => {
    const botao = montar();
    fireEvent.mouseEnter(botao);
    fireEvent.pointerDown(botao);
    // O clique do mouse também dá foco no botão; esse foco não conta.
    fireEvent.focus(botao);
    passarTempo(1000);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  // Achado ao fotografar a mostra das peças num navegador de verdade: chegar
  // com o Tab num botão fora da vista faz a tela ROLAR até ele, e a dica, que
  // fechava em qualquer rolagem, sumia no mesmo instante em que aparecia.
  it("a tela rolar não fecha a dica: ela acompanha o botão", () => {
    const botao = montar();
    const retangulo = (top: number) =>
      ({ top, bottom: top + 32, left: 200, right: 280, width: 80, height: 32, x: 200, y: top }) as DOMRect;
    const medida = vi.spyOn(botao, "getBoundingClientRect").mockReturnValue(retangulo(400));

    chegarPeloTeclado(botao);
    const dica = screen.getByRole("tooltip");
    const antes = dica.style.top;

    medida.mockReturnValue(retangulo(300));
    fireEvent.scroll(window);
    expect(screen.getByRole("tooltip")).toBe(dica);
    expect(dica.style.top).not.toBe(antes);
  });

  // Com a barra própria da janela (tarefa 6), os três botões do Windows ficam
  // por cima do programa, no topo: a dica de um botão logo abaixo da barra
  // não pode subir pra trás deles. Vai pra baixo do botão.
  it("com a barra da janela, a dica de um botão colado nela vai pra baixo, e não pra trás da barra", () => {
    document.documentElement.dataset.barra = "propria";
    document.documentElement.style.setProperty("--barra-janela", "40px");
    try {
      const botao = montar();
      vi.spyOn(botao, "getBoundingClientRect").mockReturnValue({
        top: 46, bottom: 78, left: 200, right: 280, width: 80, height: 32, x: 200, y: 46,
      } as DOMRect);
      chegarPeloTeclado(botao);
      expect(parseFloat(screen.getByRole("tooltip").style.top)).toBeGreaterThanOrEqual(78);
    } finally {
      delete document.documentElement.dataset.barra;
      document.documentElement.style.removeProperty("--barra-janela");
    }
  });

  it("se o botão saiu da vista com a rolagem, aí sim a dica fecha", () => {
    const botao = montar();
    const medida = vi.spyOn(botao, "getBoundingClientRect").mockReturnValue({
      top: 400, bottom: 432, left: 200, right: 280, width: 80, height: 32, x: 200, y: 400,
    } as DOMRect);
    chegarPeloTeclado(botao);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    medida.mockReturnValue({
      top: -500, bottom: -468, left: 200, right: 280, width: 80, height: 32, x: 200, y: -500,
    } as DOMRect);
    fireEvent.scroll(window);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("sem texto, não existe dica nenhuma (nem caixinha vazia)", () => {
    const botao = montar("  ");
    chegarPeloTeclado(botao);
    passarTempo(1000);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  // Os testes daqui pra baixo vieram da revisão de código do PR (15/11).

  it("foco devolvido por código depois de um clique não acende a dica (a janela que fecha e devolve o foco)", () => {
    const botao = montar();
    // A pessoa clicou em outro lugar da tela (o "Cancelar" de uma janela)...
    fireEvent.pointerDown(document.body);
    // ...e o programa devolveu o foco pro botão, sem ninguém apertar tecla.
    botao.focus();
    fireEvent.focus(botao);
    passarTempo(1000);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("apertar o mouse em cima da dica não estraga o próximo Tab", () => {
    const botao = montar();
    chegarPeloTeclado(botao);
    fireEvent.pointerDown(screen.getByRole("tooltip"));
    fireEvent.blur(botao);
    expect(screen.queryByRole("tooltip")).toBeNull();

    chegarPeloTeclado(botao);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("não apaga a descrição que o elemento já tinha (o erro do campo): soma a dica a ela", () => {
    render(
      <Dica texto="Só números">
        <input aria-label="Telefone" aria-describedby="erro-do-telefone" />
      </Dica>,
    );
    const campo = screen.getByLabelText("Telefone");
    chegarPeloTeclado(campo);
    const dica = screen.getByRole("tooltip");
    expect(campo.getAttribute("aria-describedby")).toBe(`erro-do-telefone ${dica.id}`);

    fireEvent.blur(campo);
    expect(campo.getAttribute("aria-describedby")).toBe("erro-do-telefone");
  });

  it("abrir com o botão fora da vista não deixa uma dica escondida pendurada", () => {
    const botao = montar();
    vi.spyOn(botao, "getBoundingClientRect").mockReturnValue({
      top: -500, bottom: -468, left: 200, right: 280, width: 80, height: 32, x: 200, y: -500,
    } as DOMRect);
    chegarPeloTeclado(botao);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(botao.getAttribute("aria-describedby")).toBeNull();
  });

  it("dentro de uma janela, o Esc fecha só a dica; a janela fica, com o que foi preenchido", () => {
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{} as DOMRect] as unknown as DOMRectList);
    const onFechar = vi.fn();
    render(
      <Modal titulo="Faturar" onFechar={onFechar}>
        <Dica texto="Abrir a ficha do veículo">
          <button type="button">RTA-4B71</button>
        </Dica>
      </Modal>,
    );
    chegarPeloTeclado(screen.getByRole("button", { name: "RTA-4B71" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();

    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(onFechar).not.toHaveBeenCalled();

    // Sem dica aberta, o Esc volta a ser da janela.
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    expect(onFechar).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});

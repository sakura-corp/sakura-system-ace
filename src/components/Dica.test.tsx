// @vitest-environment jsdom
//
// A Dica do visual novo (#990, tarefa 2): o texto que aparece ao passar o
// mouse. Ela entra no lugar do `title` do navegador, que demora, não aparece
// pra quem usa só o teclado e não segue a aparência do programa. O balcão é
// operado no teclado: a dica TEM que aparecer no foco também.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dica } from "./Dica";

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
    fireEvent.focus(botao);
    const dica = screen.getByRole("tooltip");
    expect(dica.textContent).toBe("Abrir a ficha do veículo");
    expect(botao.getAttribute("aria-describedby")).toBe(dica.id);

    fireEvent.blur(botao);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(botao.getAttribute("aria-describedby")).toBeNull();
  });

  it("Esc fecha a dica sem tirar o foco do botão", () => {
    const botao = montar();
    botao.focus();
    fireEvent.focus(botao);
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

  it("sem texto, não existe dica nenhuma (nem caixinha vazia)", () => {
    const botao = montar("  ");
    fireEvent.focus(botao);
    passarTempo(1000);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

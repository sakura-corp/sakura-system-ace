// @vitest-environment jsdom
//
// Os Passos (#1132, parte 1/5 da #1085): a trilha 1-2-3 do fechar o caixa e
// do fechar a OS. O que estes testes guardam: cada passo tem nome, o atual é
// anunciado (`aria-current="step"`) e os feitos têm ✓ e a PALAVRA "feito" pro
// leitor de tela, porque cor sozinha não avisa (regra 4 do visual novo).

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Passos } from "./Passos";

afterEach(() => {
  cleanup();
});

const FECHAR_CAIXA = [
  { nome: "Contar a gaveta" },
  { nome: "Conferir" },
  { nome: "Explicar a diferença" },
  { nome: "Fechar" },
];

describe("Passos", () => {
  it("mostra o nome de cada passo, em ordem, numa lista", () => {
    render(<Passos rotulo="Fechar o caixa" passos={FECHAR_CAIXA} atual={0} />);
    const lista = screen.getByRole("list", { name: "Fechar o caixa" });
    const itens = lista.querySelectorAll("li");
    expect(itens).toHaveLength(4);
    expect(itens[0].textContent).toContain("Contar a gaveta");
    expect(itens[3].textContent).toContain("Fechar");
  });

  it("o atual é anunciado, e só ele", () => {
    const { container } = render(<Passos rotulo="Fechar o caixa" passos={FECHAR_CAIXA} atual={2} />);
    const atuais = container.querySelectorAll('[aria-current="step"]');
    expect(atuais).toHaveLength(1);
    expect(atuais[0].textContent).toContain("Explicar a diferença");
  });

  it("os feitos têm ✓ e a palavra 'feito'; os de depois, não", () => {
    const { container } = render(<Passos rotulo="Fechar o caixa" passos={FECHAR_CAIXA} atual={2} />);
    const itens = container.querySelectorAll("li");
    for (const i of [0, 1]) {
      expect(itens[i].querySelector("[data-passo-feito]")).not.toBeNull();
      expect(itens[i].textContent).toContain("feito");
    }
    for (const i of [2, 3]) {
      expect(itens[i].querySelector("[data-passo-feito]")).toBeNull();
      expect(itens[i].textContent).not.toContain("feito");
    }
    // O atual e os de depois mostram o número, não o ✓.
    expect(itens[2].textContent).toContain("3");
    expect(itens[3].textContent).toContain("4");
  });

  it("com aoVoltar, um passo feito vira botão; o atual e os de depois, não", () => {
    const aoVoltar = vi.fn();
    render(<Passos rotulo="Fechar o caixa" passos={FECHAR_CAIXA} atual={2} aoVoltar={aoVoltar} />);
    // O leitor de tela ouve que o botão VOLTA pro passo, não só o nome dele.
    fireEvent.click(screen.getByRole("button", { name: /Conferir.*voltar pra este passo/ }));
    expect(aoVoltar).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("button", { name: /Explicar a diferença/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Fechar/ })).toBeNull();
  });

  it("sem aoVoltar, nenhum passo é botão", () => {
    render(<Passos rotulo="Fechar o caixa" passos={FECHAR_CAIXA} atual={3} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("atual além do último = todos feitos (a tarefa terminou)", () => {
    const { container } = render(<Passos rotulo="Fechar o caixa" passos={FECHAR_CAIXA} atual={4} />);
    expect(container.querySelectorAll("[data-passo-feito]")).toHaveLength(4);
    expect(container.querySelector('[aria-current="step"]')).toBeNull();
  });
});

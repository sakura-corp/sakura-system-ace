// @vitest-environment jsdom
//
// O aviso que some sozinho (#990, tarefa 2): "OS 148 faturada", embaixo, no
// meio da tela. É a confirmação de que o clique deu certo; some sem ninguém
// precisar fechar, e não empurra nada da tela.

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avisar, limparAvisos } from "@/lib/avisoQueSome";
import { AvisosQueSomem } from "./AvisoQueSome";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  act(() => limparAvisos());
  vi.useRealTimers();
});

const passarTempo = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("aviso que some sozinho", () => {
  it("aparece quando alguém avisa, de qualquer lugar do programa", () => {
    render(<AvisosQueSomem />);
    expect(screen.queryByText("OS 148 faturada")).toBeNull();

    act(() => avisar("OS 148 faturada"));
    expect(screen.getByText("OS 148 faturada")).toBeTruthy();
  });

  it("some sozinho depois de uns segundos", () => {
    render(<AvisosQueSomem />);
    act(() => avisar("OS 148 faturada"));

    passarTempo(3000);
    expect(screen.getByText("OS 148 faturada")).toBeTruthy();

    passarTempo(2000);
    expect(screen.queryByText("OS 148 faturada")).toBeNull();
  });

  it("o leitor de tela anuncia sem interromper (é um status, não um alerta)", () => {
    render(<AvisosQueSomem />);
    act(() => avisar("Conta paga"));
    const regiao = screen.getByRole("status");
    expect(regiao.getAttribute("aria-live")).toBe("polite");
    expect(regiao.textContent).toContain("Conta paga");
  });

  it("a região do leitor de tela existe ANTES do primeiro aviso, senão ele não é anunciado", () => {
    render(<AvisosQueSomem />);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("nada cresce sem limite: no máximo três à vista, os mais novos", () => {
    render(<AvisosQueSomem />);
    act(() => {
      avisar("Primeiro");
      avisar("Segundo");
      avisar("Terceiro");
      avisar("Quarto");
    });
    expect(screen.queryByText("Primeiro")).toBeNull();
    expect(screen.getByText("Segundo")).toBeTruthy();
    expect(screen.getByText("Terceiro")).toBeTruthy();
    expect(screen.getByText("Quarto")).toBeTruthy();
  });

  it("cada aviso tem o seu tempo: o segundo não some junto com o primeiro", () => {
    render(<AvisosQueSomem />);
    act(() => avisar("Primeiro"));
    passarTempo(3000);
    act(() => avisar("Segundo"));
    passarTempo(2000);
    expect(screen.queryByText("Primeiro")).toBeNull();
    expect(screen.getByText("Segundo")).toBeTruthy();
  });

  it("aviso em branco não aparece (nem uma caixa vazia)", () => {
    render(<AvisosQueSomem />);
    act(() => avisar("   "));
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

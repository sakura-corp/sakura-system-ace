// @vitest-environment jsdom
//
// A trilha 1-2-3 (#1132): o nome de cada passo, o atual marcado, os feitos
// com ✓. O estado de cada passo tem que dar pra ler sem a cor (WCAG 1.4.1):
// o feito troca o número pelo ✓, e o leitor de tela ouve "feito"/"agora".

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Passos } from "./Passos";

afterEach(cleanup);

const NOMES = ["Contar o dinheiro", "Conferir", "Fechar o caixa"];

describe("Passos", () => {
  it("lista os passos na ordem, com o nome de cada um", () => {
    render(<Passos rotulo="Fechar o caixa" passos={NOMES} atual={1} />);
    const lista = screen.getByRole("list", { name: "Fechar o caixa" });
    const itens = within(lista).getAllByRole("listitem");
    expect(itens).toHaveLength(3);
    expect(itens[0].textContent).toContain("Contar o dinheiro");
    expect(itens[2].textContent).toContain("Fechar o caixa");
  });

  it("marca só o passo atual com aria-current=step", () => {
    render(<Passos rotulo="Fechar o caixa" passos={NOMES} atual={1} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens.map((item) => item.getAttribute("aria-current"))).toEqual([null, "step", null]);
  });

  it("o feito troca o número pelo ✓, e o que falta mostra o número", () => {
    render(<Passos rotulo="Fechar o caixa" passos={NOMES} atual={1} />);
    const [feito, agora, falta] = screen.getAllByRole("listitem");
    expect(feito.querySelector("[data-passo-feito]")).not.toBeNull();
    expect(feito.textContent).not.toContain("1");
    expect(agora.textContent).toContain("2");
    expect(falta.textContent).toContain("3");
  });

  it("diz o estado em palavra pro leitor de tela (não só a cor)", () => {
    render(<Passos rotulo="Fechar o caixa" passos={NOMES} atual={1} />);
    const [feito, agora, falta] = screen.getAllByRole("listitem");
    expect(feito.textContent).toContain("feito");
    expect(agora.textContent).toContain("agora");
    expect(falta.textContent).not.toMatch(/feito|agora/);
  });

  it("aceita dois passos com o mesmo nome sem o aviso de chave repetida", () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Passos rotulo="Conferir" passos={["Conferir", "Pagar", "Conferir"]} atual={1} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });

  it("com atual depois do último, todos estão feitos", () => {
    render(<Passos rotulo="Fechar a OS" passos={NOMES} atual={3} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens.every((item) => item.querySelector("[data-passo-feito]"))).toBe(true);
    expect(itens.some((item) => item.getAttribute("aria-current"))).toBe(false);
  });
});

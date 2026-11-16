// @vitest-environment jsdom
//
// O número grande do Início conta de zero até o valor (#990, tarefa 5, regras
// seção 8). É SÓ aparência: o que importa aqui é que (1) conta mesmo, (2) termina
// exatamente no valor de sempre, (3) com "reduzir movimento" ligado nem começa,
// e (4) fora do cartão de número (tabelas, listas) o `Valor` nunca conta.

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartaoNumero } from "./CartaoNumero";
import { DURACAO_DA_CONTAGEM_MS, valorDaContagem } from "./contagem";
import { Valor } from "./Valor";

function ligarMovimento(reduzir: boolean) {
  vi.stubGlobal("matchMedia", (consulta: string) => ({
    matches: reduzir && consulta.includes("prefers-reduced-motion"),
    media: consulta,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// O formatador do dinheiro usa espaço que não quebra; no teste vira espaço comum.
const limpo = (t?: string | null) => t?.replace(/\u00a0/g, " ");
const textoDoNumero = (c: HTMLElement) => limpo(c.querySelector("[data-cartao-numero] p.font-titulo")?.textContent);

describe("valorDaContagem", () => {
  it("começa em zero, só sobe e termina exatamente no valor (sem conta no fim)", () => {
    expect(valorDaContagem(24815.37, 0)).toBe(0);
    let anterior = 0;
    for (let p = 0.1; p < 1; p += 0.1) {
      const v = valorDaContagem(24815.37, p);
      expect(v).toBeGreaterThanOrEqual(anterior);
      expect(v).toBeLessThanOrEqual(24815.37);
      anterior = v;
    }
    expect(valorDaContagem(24815.37, 1)).toBe(24815.37);
    expect(valorDaContagem(0.1 + 0.2, 1)).toBe(0.1 + 0.2);
  });
});

describe("a contagem no cartão de número", () => {
  it("conta de R$ 0,00 até o valor e termina exatamente nele", () => {
    ligarMovimento(false);
    const { container } = render(
      <CartaoNumero titulo="Recebido no mês">
        <Valor valor={24815.37} />
      </CartaoNumero>,
    );
    expect(textoDoNumero(container)).toBe("R$ 0,00");
    act(() => {
      vi.advanceTimersByTime(DURACAO_DA_CONTAGEM_MS / 3);
    });
    const meio = textoDoNumero(container) ?? "";
    expect(meio).not.toBe("R$ 0,00");
    expect(meio).not.toContain("24.815,37");
    act(() => {
      vi.advanceTimersByTime(DURACAO_DA_CONTAGEM_MS);
    });
    expect(textoDoNumero(container)).toBe("R$ 24.815,37");
  });

  it("prejuízo conta o valor sem o sinal, e o sinal e a seta ficam parados", () => {
    ligarMovimento(false);
    const { container } = render(
      <CartaoNumero titulo="Lucro do mês">
        <Valor valor={-8368} />
      </CartaoNumero>,
    );
    expect(textoDoNumero(container)).toBe("▼−R$ 0,00");
    act(() => {
      vi.advanceTimersByTime(DURACAO_DA_CONTAGEM_MS * 2);
    });
    expect(textoDoNumero(container)).toBe("▼−R$ 8.368,00");
  });

  it("com 'reduzir movimento' ligado o número já nasce pronto, sem contar", () => {
    ligarMovimento(true);
    const { container } = render(
      <CartaoNumero titulo="Recebido no mês">
        <Valor valor={24815.37} />
      </CartaoNumero>,
    );
    expect(textoDoNumero(container)).toBe("R$ 24.815,37");
  });

  it("fora do cartão de número, o Valor nunca conta", () => {
    ligarMovimento(false);
    const { container } = render(<Valor valor={1200} />);
    expect(limpo(container.textContent)).toBe("R$ 1.200,00");
  });

  it("se o valor muda no meio da contagem, termina no valor novo", () => {
    ligarMovimento(false);
    const { container, rerender } = render(
      <CartaoNumero titulo="Recebido no mês">
        <Valor valor={1000} />
      </CartaoNumero>,
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender(
      <CartaoNumero titulo="Recebido no mês">
        <Valor valor={2500} />
      </CartaoNumero>,
    );
    act(() => {
      vi.advanceTimersByTime(DURACAO_DA_CONTAGEM_MS * 2);
    });
    expect(textoDoNumero(container)).toBe("R$ 2.500,00");
  });
});

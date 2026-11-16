// @vitest-environment jsdom
//
// O cartão de número do visual novo (#990, tarefa 2): o rótulo com o "?", o
// número grande e a variação embaixo, e (tarefa 4) o fio de gráfico à direita.

import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartaoNumero } from "./CartaoNumero";
import { Valor, Variacao } from "./Valor";

// Estes testes olham o número JÁ PRONTO. A contagem de zero até o valor (tarefa
// 5) tem teste próprio em `ContagemDoNumero.test.tsx`; aqui "reduzir movimento"
// fica ligado, que é o jeito de o número aparecer direto.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: consulta.includes("reduce"), media: consulta }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CartaoNumero", () => {
  it("mostra o rótulo, o número e a variação, com o '?' que explica a conta", () => {
    render(
      <CartaoNumero
        titulo="Recebido no mês"
        explicacao="O que entrou no caixa neste mês."
        variacao={<Variacao percentual={16} subirEBom comparadoCom="o mês passado" contra="outubro" />}
      >
        <Valor valor={24815} />
      </CartaoNumero>,
    );
    const cartao = screen.getByText("Recebido no mês").closest("[data-cartao-numero]") as HTMLElement;
    expect(cartao.textContent).toContain("24.815,00");
    expect(cartao.textContent).toContain("+16%");
    // A variação diz COM O QUE compara, escrito, e não só num balão do mouse.
    expect(cartao.textContent).toContain("contra outubro");
    expect(within(cartao).getByRole("button", { name: "O que é Recebido no mês?" })).toBeTruthy();
  });

  it("sem acesso ao módulo, mostra '—' e o motivo, e nunca um R$ 0,00 com cara de número", () => {
    render(
      <CartaoNumero titulo="Custos do mês" semAcesso="Sem acesso a Contas a Pagar">
        <Valor valor={0} />
      </CartaoNumero>,
    );
    const cartao = screen.getByText("Custos do mês").closest("[data-cartao-numero]") as HTMLElement;
    expect(cartao.textContent).toContain("—");
    expect(cartao.textContent).toContain("Sem acesso a Contas a Pagar");
    expect(cartao.textContent).not.toContain("R$");
  });

  it("sem destino, não é clicável: nenhum link aparece", () => {
    render(
      <MemoryRouter>
        <CartaoNumero titulo="Ticket médio">
          <Valor valor={655.84} />
        </CartaoNumero>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("com destino, o cartão inteiro leva pra lá, e o '?' NÃO fica dentro do link", () => {
    render(
      <MemoryRouter>
        <CartaoNumero titulo="Lucro do mês" explicacao="Recebido menos os custos." para="/relatorios">
          <Valor valor={3344} />
        </CartaoNumero>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Lucro do mês" });
    expect(link.getAttribute("href")).toBe("/relatorios");
    // O link se estica por cima do cartão inteiro (é o que faz o clique em
    // qualquer ponto funcionar)...
    expect(link.className).toContain("after:absolute");
    expect(link.className).toContain("after:inset-0");
    // ...e o "?" é irmão dele, nunca filho: botão dentro de link é HTML
    // inválido, e o clique no "?" navegaria em vez de explicar.
    const ajuda = screen.getByRole("button", { name: "O que é Lucro do mês?" });
    expect(link.contains(ajuda)).toBe(false);
    expect(ajuda.closest("[data-acima-do-link]")).not.toBeNull();
  });

  describe("o fio de gráfico", () => {
    it("com os valores do mês, desenha o fio, com a ponta marcada", () => {
      render(
        <CartaoNumero titulo="Recebido no mês" fio={[10, 30, 20, 50]}>
          <Valor valor={50} />
        </CartaoNumero>,
      );
      const cartao = screen.getByText("Recebido no mês").closest("[data-cartao-numero]") as HTMLElement;
      const fio = cartao.querySelector("[data-fio-de-grafico]");
      expect(fio).not.toBeNull();
      // Decoração: o número é quem informa, e o leitor de tela não lê o desenho.
      expect(fio?.getAttribute("aria-hidden")).toBe("true");
      expect(fio?.querySelectorAll("circle")).toHaveLength(1);
    });

    it("sem dados (null) ou com menos de 2 pontos, o cartão fica sem o fio e o número continua", () => {
      for (const fio of [null, undefined, [], [5]]) {
        const { unmount } = render(
          <CartaoNumero titulo="Recebido no mês" fio={fio}>
            <Valor valor={5} />
          </CartaoNumero>,
        );
        const cartao = screen.getByText("Recebido no mês").closest("[data-cartao-numero]") as HTMLElement;
        expect(cartao.querySelector("[data-fio-de-grafico]")).toBeNull();
        expect(cartao.textContent).toContain("5,00");
        unmount();
      }
    });

    it("sem acesso ao módulo, não desenha fio nenhum, mesmo recebendo valores", () => {
      render(
        <CartaoNumero titulo="Custos do mês" semAcesso="Sem acesso a Contas a Pagar" fio={[1, 2, 3]}>
          <Valor valor={0} />
        </CartaoNumero>,
      );
      expect(document.querySelector("[data-fio-de-grafico]")).toBeNull();
    });
  });
});

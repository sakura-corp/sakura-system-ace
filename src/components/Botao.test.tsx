// @vitest-environment jsdom
//
// O Botao do visual novo (#990, tarefa 2). O que estes testes guardam é o
// COMPORTAMENTO que as telas vão herdar ao trocar o botão delas por este:
// não enviar formulário sem querer, não clicar desligado, e a regra 3 das
// cores (letra em cima do laranja é escura, nunca branca).

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Botao, LinkBotao } from "./Botao";

afterEach(cleanup);

function classesDe(elemento: Element): string[] {
  return (elemento.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

describe("Botao", () => {
  it("não envia o formulário em volta, a não ser que peçam", () => {
    const aoEnviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={aoEnviar}>
        <Botao>Cancelar</Botao>
        <Botao type="submit" variante="principal">
          Salvar
        </Botao>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(aoEnviar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoEnviar).toHaveBeenCalledTimes(1);
  });

  it("o principal é laranja com a letra ESCURA, nunca branca (regra 3)", () => {
    render(<Botao variante="principal">Faturar</Botao>);
    const classes = classesDe(screen.getByRole("button", { name: "Faturar" }));
    expect(classes).toContain("bg-acao");
    expect(classes).toContain("text-sobre-acao");
    expect(classes).not.toContain("text-white");
    expect(classes).not.toContain("text-texto");
  });

  it("sem dizer a variante, sai o secundário: laranja é um por tela, e é escolha", () => {
    render(<Botao>Venda de balcão</Botao>);
    const classes = classesDe(screen.getByRole("button", { name: "Venda de balcão" }));
    expect(classes).not.toContain("bg-acao");
    expect(classes).toContain("border-linha-forte");
  });

  it("os três tamanhos têm as alturas das regras: 32, 40 e 48", () => {
    render(
      <>
        <Botao tamanho="pequeno">Pequeno</Botao>
        <Botao>Normal</Botao>
        <Botao tamanho="grande">Grande</Botao>
      </>,
    );
    expect(classesDe(screen.getByRole("button", { name: "Pequeno" }))).toContain("h-8");
    expect(classesDe(screen.getByRole("button", { name: "Normal" }))).toContain("h-10");
    expect(classesDe(screen.getByRole("button", { name: "Grande" }))).toContain("h-12");
  });

  it("ocupado: não clica de novo e avisa o leitor de tela", () => {
    const aoClicar = vi.fn();
    render(
      <Botao ocupado onClick={aoClicar}>
        Salvando
      </Botao>,
    );
    const botao = screen.getByRole("button", { name: "Salvando" });
    fireEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
    expect(botao.getAttribute("aria-busy")).toBe("true");
  });

  it("só com ícone, o nome pro leitor de tela vem do aria-label", () => {
    render(<Botao soIcone aria-label="Mais ações" icone={<svg data-testid="icone" />} />);
    const botao = screen.getByRole("button", { name: "Mais ações" });
    expect(botao.querySelector('[data-testid="icone"]')).not.toBeNull();
  });

  it("o ícone vem antes do texto e não é lido duas vezes", () => {
    render(<Botao icone={<svg data-testid="icone" />}>Nova ordem de serviço</Botao>);
    const botao = screen.getByRole("button", { name: "Nova ordem de serviço" });
    const envelope = botao.querySelector('[data-testid="icone"]')?.parentElement;
    expect(envelope?.getAttribute("aria-hidden")).toBe("true");
    expect(botao.firstElementChild).toBe(envelope);
  });
});

describe("LinkBotao", () => {
  it("é um link de verdade (abre com Ctrl+clique), com a cara do botão", () => {
    render(
      <MemoryRouter>
        <LinkBotao to="/ordens-servico/nova" variante="principal">
          Nova ordem de serviço
        </LinkBotao>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Nova ordem de serviço" });
    expect(link.getAttribute("href")).toBe("/ordens-servico/nova");
    expect(classesDe(link)).toContain("bg-acao");
    expect(classesDe(link)).toContain("text-sobre-acao");
  });
});

// @vitest-environment jsdom
/**
 * O cartão do "Comparativo do período" (#990, tarefa 13): só aparência. Os
 * dois valores chegam prontos; o que se confere aqui é que aparecem escritos,
 * que o % usa a cor certa (gastar mais é ruim) e que as barras têm o tamanho
 * proporcional ao maior dos dois.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { screen } from "@/testes/tela";
import { CartaoDeComparacao } from "./CartaoDeComparacao";

function barras(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[aria-hidden="true"] [style*="width"]')].map(
    (b) => b.style.width,
  );
}

describe("CartaoDeComparacao", () => {
  it("escreve o valor de agora, o anterior e a diferença contra o período anterior", () => {
    render(
      <CartaoDeComparacao
        titulo="Vendas"
        explicacao="o que entrou"
        atual={150}
        anterior={100}
        subirEBom
        contra="dia anterior"
      />,
    );
    expect(screen.getByText(/150,00/)).toBeInTheDocument();
    expect(screen.getByText(/Anterior:/)).toHaveTextContent(/100,00/);
    expect(screen.getByText("+50%")).toBeInTheDocument();
    expect(screen.getByText("contra dia anterior")).toBeInTheDocument();
  });

  it("as barras são proporcionais ao maior dos dois", () => {
    const { container } = render(
      <CartaoDeComparacao titulo="Vendas" explicacao="x" atual={50} anterior={200} subirEBom contra="mês anterior" />,
    );
    expect(barras(container)).toEqual(["25%", "100%"]);
  });

  it("lucro negativo não tem barra, e o número negativo continua escrito", () => {
    const { container } = render(
      <CartaoDeComparacao titulo="Lucro" explicacao="x" atual={-80} anterior={100} subirEBom contra="dia anterior" />,
    );
    expect(barras(container)).toEqual(["0%", "100%"]);
    expect(screen.getAllByText(/80,00/).length).toBeGreaterThan(0);
  });

  it("gastar mais é ruim: o custo que subiu fica na cor de problema", () => {
    render(
      <CartaoDeComparacao titulo="Custos" explicacao="x" atual={120} anterior={100} subirEBom={false} contra="dia anterior" />,
    );
    expect(screen.getByText("+20%").parentElement).toHaveClass("text-perigo");
  });

  it("sem nada no período anterior não inventa porcentagem", () => {
    render(
      <CartaoDeComparacao titulo="Vendas" explicacao="x" atual={100} anterior={0} subirEBom contra="dia anterior" />,
    );
    expect(screen.queryByText(/%/)).toBeNull();
  });
});

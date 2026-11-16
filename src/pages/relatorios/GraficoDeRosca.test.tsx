// @vitest-environment jsdom
/**
 * A rosca (#990, tarefa 13): desenha uma divisão que a tela já calculou. Não
 * faz conta de dinheiro; o que se confere é o que entra e o que fica de fora.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { screen } from "@/testes/tela";
import { GraficoDeRosca, type FatiaDaRosca } from "./GraficoDeRosca";

function fatia(nome: string, valor: number): FatiaDaRosca {
  return { nome, valor, cor: "var(--color-ok)", texto: `${valor} itens` };
}

describe("GraficoDeRosca", () => {
  it("escreve cada fatia na legenda, com o valor", () => {
    render(<GraficoDeRosca descricao="itens por curva" fatias={[fatia("Curva A", 3), fatia("Curva B", 2)]} />);
    expect(screen.getByRole("group", { name: "itens por curva" })).toBeInTheDocument();
    expect(screen.getByText("Curva A")).toBeInTheDocument();
    expect(screen.getByText("3 itens")).toBeInTheDocument();
    expect(screen.getByText("2 itens")).toBeInTheDocument();
  });

  it("fatia zerada não aparece", () => {
    render(<GraficoDeRosca descricao="d" fatias={[fatia("Curva A", 3), fatia("Curva C", 0)]} />);
    expect(screen.queryByText("Curva C")).toBeNull();
  });

  it("mostra no máximo 5 fatias", () => {
    const seis = ["a", "b", "c", "d", "e", "f"].map((n, i) => fatia(`Fatia ${n}`, i + 1));
    render(<GraficoDeRosca descricao="d" fatias={seis} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByText("Fatia f")).toBeNull();
  });

  it("sem nada pra dividir, não desenha nada", () => {
    const { container } = render(<GraficoDeRosca descricao="d" fatias={[fatia("A", 0), fatia("B", 0)]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("o arco de cada fatia é proporcional ao valor", () => {
    const { container } = render(<GraficoDeRosca descricao="d" fatias={[fatia("A", 1), fatia("B", 3)]} />);
    const arcos = [...container.querySelectorAll("circle")].slice(1); // o primeiro é o fundo
    const tamanho = (c: Element) => Number(c.getAttribute("stroke-dasharray")!.split(" ")[0]);
    // Com o vão de 2 entre elas, B (3/4) é pouco mais que o triplo de A (1/4).
    expect(tamanho(arcos[1])).toBeGreaterThan(tamanho(arcos[0]) * 2.9);
    expect(tamanho(arcos[1])).toBeLessThan(tamanho(arcos[0]) * 3.2);
  });
});

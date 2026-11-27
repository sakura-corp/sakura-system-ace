// @vitest-environment jsdom
//
// O desenho dos 5 tipos de veículo (#1096). A Sofia pediu que dê pra
// distinguir de relance e que a carroceria leve a cor do carro.

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { corVeiculoParaHex } from "@/lib/corVeiculo";
import type { TipoVeiculo } from "@/types/cliente";
import { VeiculoIcone } from "./VeiculoIcone";

afterEach(cleanup);

const TIPOS: TipoVeiculo[] = ["hatch", "sedan", "suv", "picape", "moto"];

function svgDe(container: HTMLElement) {
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("sem svg");
  return svg;
}

describe("VeiculoIcone", () => {
  it.each(TIPOS)("o tipo %s desenha o seu, no mesmo quadro de todos", (tipo) => {
    const { container } = render(<VeiculoIcone tipo={tipo} cor="vermelho" />);
    const svg = svgDe(container);
    expect(svg.getAttribute("data-tipo")).toBe(tipo);
    expect(svg.getAttribute("viewBox")).toBe("0 0 160 80");
  });

  it("tipo vazio ou desconhecido desenha o hatch", () => {
    const { container, rerender } = render(<VeiculoIcone tipo={null} />);
    expect(svgDe(container).getAttribute("data-tipo")).toBe("hatch");
    rerender(<VeiculoIcone tipo={"nave" as unknown as TipoVeiculo} />);
    expect(svgDe(container).getAttribute("data-tipo")).toBe("hatch");
  });

  it.each(TIPOS)("a carroceria do %s leva a cor do carro", (tipo) => {
    const { container } = render(<VeiculoIcone tipo={tipo} cor="vermelho" />);
    const hex = corVeiculoParaHex("vermelho");
    const pintados = container.querySelectorAll(`[fill="${hex}"]`);
    expect(pintados.length).toBeGreaterThan(0);
  });

  it("outra cor pinta diferente", () => {
    const { container } = render(<VeiculoIcone tipo="sedan" cor="azul" />);
    expect(container.querySelectorAll(`[fill="${corVeiculoParaHex("azul")}"]`).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(`[fill="${corVeiculoParaHex("vermelho")}"]`).length).toBe(0);
  });

  it("com rotulo vira imagem com o nome", () => {
    const { getByRole } = render(<VeiculoIcone tipo="suv" rotulo="SUV" />);
    expect(getByRole("img", { name: "SUV" })).toBeTruthy();
  });

  it("sem rotulo fica escondido de quem lê a tela", () => {
    const { container } = render(<VeiculoIcone tipo="suv" />);
    const svg = svgDe(container);
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
  });

  it("repassa a className", () => {
    const { container } = render(<VeiculoIcone tipo="moto" className="h-16 w-32" />);
    expect(container.querySelector(".h-16.w-32")).toBeTruthy();
  });
});

// @vitest-environment jsdom
/**
 * Relações → Gráficos no visual novo (#990, tarefa 13): o comparativo em três
 * cartões (no lugar do radar) usa os mesmos números da série do gráfico.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { screen, within } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { MovimentoCaixa } from "@/types/caixa";
import { GraficosSection } from "./GraficosSection";

function entrada(dia: string, valor: number): MovimentoCaixa {
  return {
    id: crypto.randomUUID(),
    loja_id: "loja",
    tipo: "entrada",
    valor,
    data: `${dia}T12:00:00`,
    ordem_servico_id: null,
  } as unknown as MovimentoCaixa;
}

function diaAntes(dias: number): string {
  const d = new Date(`${hojeLocal()}T12:00:00`);
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("GraficosSection — comparativo do período", () => {
  it("mostra Vendas, Custos e Lucro de agora e do período anterior, escritos", () => {
    render(
      <GraficosSection
        movimentos={[entrada(hojeLocal(), 300), entrada(diaAntes(1), 200)]}
        ordens={[]}
        pecas={[]}
        servicos={[]}
      />,
    );
    const titulo = screen.getByRole("heading", { name: "Comparativo do período" });
    const secao = titulo.closest("section")!;
    const vendas = within(secao).getByText("Vendas").closest("[data-cartao-comparacao]") as HTMLElement;
    expect(within(vendas).getByText(/300,00/)).toBeInTheDocument();
    expect(within(vendas).getByText(/Anterior:/)).toHaveTextContent(/200,00/);
    expect(within(vendas).getByText("+50%")).toBeInTheDocument();
    // Custos não tem nada no período anterior (zero): sem porcentagem inventada.
    expect(within(secao).getAllByText(/contra dia anterior/)).toHaveLength(2);
  });
});

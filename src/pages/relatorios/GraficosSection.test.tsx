// @vitest-environment jsdom
/**
 * Relações → Gráficos no visual novo (#990; aprovado pela Sofia em 17/11): o
 * comparativo do período virou uma tabela (Agora, Anterior, Mudou) com os
 * mesmos números da série do gráfico, e o gráfico é uma linha por série.
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

function desenhar() {
  render(
    <GraficosSection
      movimentos={[entrada(hojeLocal(), 300), entrada(diaAntes(1), 200)]}
      ordens={[]}
      pecas={[]}
      servicos={[]}
    />,
  );
}

describe("GraficosSection — comparativo do período", () => {
  it("mostra Vendas, Custos e Lucro de agora e do período anterior, escritos, com a variação", () => {
    desenhar();
    const titulo = screen.getByRole("heading", { name: "Comparativo do período" });
    const secao = titulo.closest("section")!;
    const vendas = secao.querySelector('[data-comparativo="Vendas"]') as HTMLElement;
    const [, agora, anterior, mudou] = within(vendas).getAllByRole("cell");
    expect(agora).toHaveTextContent(/300,00/);
    expect(anterior).toHaveTextContent(/200,00/);
    expect(mudou).toHaveTextContent("+50%");
    // Custos não tem nada no período anterior (zero): "sem movimento", sem porcentagem inventada.
    const custos = secao.querySelector('[data-comparativo="Custos"]') as HTMLElement;
    expect(within(custos).getAllByRole("cell")[2]).toHaveTextContent("sem movimento");
    expect(within(custos).queryByText(/%/)).toBeNull();
  });
});

describe("GraficosSection — o gráfico em linhas", () => {
  it("uma linha por série, cada uma com o total à vista, e a margem do período no lucro", () => {
    desenhar();
    const grafico = screen.getByRole("group", { name: /Vendas, custos e lucro, diário/ });
    for (const serie of ["vendas", "custos", "lucro"]) {
      expect(grafico.querySelector(`[data-linha-do-grafico="${serie}"]`)).not.toBeNull();
    }
    const vendas = grafico.querySelector('[data-linha-do-grafico="vendas"]') as HTMLElement;
    expect(vendas).toHaveTextContent("Vendas · 14 dias");
    expect(vendas).toHaveTextContent(/500,00/);
    // Sem custo nenhum, o lucro é tudo: margem de 100%.
    const lucro = grafico.querySelector('[data-linha-do-grafico="lucro"]') as HTMLElement;
    expect(lucro).toHaveTextContent("margem de 100,0%");
    // O ponto de agora vem escrito pro leitor de tela.
    expect(within(vendas).getByRole("img", { name: /Vendas: R\$\s?300,00 em Hoje/ })).toBeInTheDocument();
  });

  it("o número grande é o Recebido no mês, e os outros três continuam lá", () => {
    desenhar();
    for (const t of ["Recebido no mês", "Recebido hoje", "Recebido esta semana", "Recebido este ano"]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });
});

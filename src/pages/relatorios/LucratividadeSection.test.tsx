// @vitest-environment jsdom
/**
 * #655: peça digitada sem cadastro e sem custo não tem margem que se possa
 * calcular — a linha dela diz "custo não informado" no lugar do custo e da
 * margem, em vez de mostrar o preço cheio como se fosse lucro.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { screen, within } from "@/testes/tela";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import { hojeLocal } from "@/lib/datas";
import { LucratividadeSection } from "./LucratividadeSection";
import type { ItemOS, OrdemServico } from "@/types/os";

function item(parcial: Partial<ItemOS>): ItemOS {
  return {
    id: crypto.randomUUID(),
    ordem_servico_id: "os",
    tipo: "peca",
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao: "Peça",
    quantidade: 1,
    preco_unitario: 100,
    desconto: 0,
    ...parcial,
  };
}

const ordem: OrdemServico = {
  id: "os-1",
  numero: 1,
  loja_id: "loja",
  cliente_id: "cli",
  veiculo_id: null,
  status: "faturada",
  km_entrada: null,
  descricao_problema: null,
  forma_pagamento: null,
  parcelas: 1,
  data_abertura: `${hojeLocal()}T12:00:00`,
  data_fechamento: null,
  vendedor_id: null,
  criado_por_id: null,
  atualizado_por_id: null,
  itens: [
    item({ descricao: "Farol", preco_unitario: 500, custo_unitario: null }),
    item({ descricao: "Palheta", preco_unitario: 50, custo_unitario: 30 }),
  ],
};

describe("LucratividadeSection — peça avulsa", () => {
  it("linha sem custo informado mostra o aviso no lugar de custo e margem", () => {
    render(<LucratividadeSection ordens={[ordem]} pecas={[]} servicos={[]} />);

    const farol = screen.getByRole("row", { name: /Farol/ });
    expect(within(farol).getAllByText(TEXTO_CUSTO_NAO_INFORMADO)).toHaveLength(2);
    // A receita continua aparecendo; o preço cheio não vira margem.
    expect(within(farol).getAllByText(/500,00/)).toHaveLength(1);

    // Peça avulsa COM custo: margem de verdade (50 − 30 = 20).
    const palheta = screen.getByRole("row", { name: /Palheta/ });
    expect(within(palheta).getByText(/20,00/)).toBeInTheDocument();
    expect(within(palheta).queryByText(TEXTO_CUSTO_NAO_INFORMADO)).toBeNull();

    // E o custo e a margem do período avisam que estão por baixo.
    expect(screen.getAllByText(`Inclui item com ${TEXTO_CUSTO_NAO_INFORMADO}`)).toHaveLength(2);
  });
});

describe("LucratividadeSection — o cartão de destaque e as bolhas (visual novo, 17/11)", () => {
  const simples: OrdemServico = {
    ...ordem,
    itens: [
      item({ descricao: "Pneu", preco_unitario: 1000, custo_unitario: 700 }),
      item({ descricao: "Alinhamento", preco_unitario: 200, custo_unitario: 50 }),
    ],
  };

  it("diz quanto fica com a loja de cada R$ 100 vendidos (margem sobre o vendido)", () => {
    render(<LucratividadeSection ordens={[simples]} pecas={[]} servicos={[]} />);
    // 1200 vendidos, 450 de margem: 37,50 de cada 100.
    const capa = screen.getByRole("region", { name: "Margem do período" });
    expect(capa).toHaveTextContent(/De cada R\$ 100 vendidos,\s*R\$\s?37,50 ficam com a loja/);
  });

  it("a coluna Margem % marca, com seta, o que passa da média da loja", () => {
    render(<LucratividadeSection ordens={[simples]} pecas={[]} servicos={[]} />);
    const alinhamento = screen.getByRole("row", { name: /Alinhamento/ });
    expect(alinhamento).toHaveTextContent("75,0%");
    expect(within(alinhamento).getByLabelText("acima da média")).toBeInTheDocument();
    const pneu = screen.getByRole("row", { name: /Pneu/ });
    expect(pneu).toHaveTextContent("30,0%");
    expect(within(pneu).queryByLabelText("acima da média")).toBeNull();
  });

  it("uma bolha por item com custo; o de custo não informado fica de fora do gráfico (fica na tabela)", () => {
    const { container } = render(<LucratividadeSection ordens={[ordem]} pecas={[]} servicos={[]} />);
    const bolhas = [...container.querySelectorAll("[data-bolha]")].map((b) => b.getAttribute("data-bolha"));
    expect(bolhas).toEqual(["Palheta"]);
    expect(screen.getByRole("row", { name: /Farol/ })).toBeInTheDocument();
  });

  it("com margem negativa não mostra o \"de cada R$ 100\" (o número vermelho já diz)", () => {
    const prejuizo: OrdemServico = {
      ...ordem,
      itens: [item({ descricao: "Pneu", preco_unitario: 100, custo_unitario: 150 })],
    };
    render(<LucratividadeSection ordens={[prejuizo]} pecas={[]} servicos={[]} />);
    expect(screen.queryByText(/De cada/)).toBeNull();
    expect(screen.getByText("Margem do período")).toBeInTheDocument();
  });
});

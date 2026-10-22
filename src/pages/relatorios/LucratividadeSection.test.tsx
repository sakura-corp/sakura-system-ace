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

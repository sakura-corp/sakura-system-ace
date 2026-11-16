// @vitest-environment jsdom
/**
 * #390: a aba Curva ABC mostra três listas (peças, serviços, clientes) com a
 * letra de cada linha, troca entre "Por venda" e "Por lucro", e deixa a
 * venda de balcão sem cliente fora da curva, numa linha à parte.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { screen, within } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { ItemOS, OrdemServico } from "@/types/os";
import { CurvaABCSection } from "./CurvaABCSection";

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
    custo_unitario: 0,
    ...parcial,
  };
}

function ordem(parcial: Partial<OrdemServico>): OrdemServico {
  return {
    id: crypto.randomUUID(),
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
    itens: [],
    ...parcial,
  };
}

const ordens = [
  ordem({
    cliente_id: "joao",
    cliente: { nome: "João" },
    itens: [
      item({ descricao: "Pneu", preco_unitario: 800, custo_unitario: 600 }),
      item({ tipo: "servico", descricao: "Alinhamento", preco_unitario: 80, custo_unitario: 30 }),
    ],
  }),
  ordem({
    cliente_id: "maria",
    cliente: { nome: "Maria" },
    itens: [item({ descricao: "Palheta", preco_unitario: 50, custo_unitario: 10 })],
  }),
  ordem({
    cliente_id: CLIENTE_CONSUMIDOR_ID,
    cliente: { nome: "Consumidor" },
    itens: [item({ descricao: "Farol", preco_unitario: 500, custo_unitario: null })],
  }),
];

function lista(nome: string) {
  return screen.getByRole("region", { name: nome });
}

describe("CurvaABCSection", () => {
  it("por venda: três listas com a letra, a % e a acumulada", () => {
    render(<CurvaABCSection ordens={ordens} pecas={[]} servicos={[]} />);

    // Peças: Pneu 800, Farol 500, Palheta 50 (total 1350).
    const pecas = lista("Peças");
    const pneu = within(pecas).getByRole("row", { name: /Pneu/ });
    expect(within(pneu).getByLabelText("Curva A")).toBeInTheDocument();
    expect(within(pneu).getByText(/800,00/)).toBeInTheDocument();
    const palheta = within(pecas).getByRole("row", { name: /Palheta/ });
    // Começa em 96% (1300 de 1350): C.
    expect(within(palheta).getByLabelText("Curva C")).toBeInTheDocument();
    expect(within(palheta).getByText("100,0%")).toBeInTheDocument();
    expect(within(pecas).getByText(/A: 2/)).toBeInTheDocument();

    expect(within(lista("Serviços")).getByRole("row", { name: /Alinhamento/ })).toBeInTheDocument();

    // Clientes: o Consumidor fica fora da curva, numa linha à parte.
    const clientes = lista("Clientes");
    expect(within(clientes).getByRole("row", { name: /João/ })).toBeInTheDocument();
    expect(within(clientes).queryByRole("row", { name: /Consumidor/ })).toBeNull();
    expect(within(clientes).getByText(/Venda de balcão sem cliente/)).toHaveTextContent(/500,00/);
  });

  it("por lucro: a peça sem custo informado vai pro C, fora da conta", () => {
    render(<CurvaABCSection ordens={ordens} pecas={[]} servicos={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Por lucro" }));

    expect(screen.getByRole("button", { name: "Por lucro" })).toHaveAttribute("aria-pressed", "true");
    const farol = within(lista("Peças")).getByRole("row", { name: /Farol/ });
    expect(within(farol).getByLabelText("Curva C")).toBeInTheDocument();
    expect(within(farol).getByText(TEXTO_CUSTO_NAO_INFORMADO)).toBeInTheDocument();
    expect(within(farol).getByText("fora da conta")).toBeInTheDocument();
    // Pneu: 800 − 600 = 200 de lucro.
    const pneu = within(lista("Peças")).getByRole("row", { name: /Pneu/ });
    expect(within(pneu).getByText(/200,00/)).toBeInTheDocument();
    // O balcão por lucro: sem custo informado, não mostra lucro inventado.
    expect(within(lista("Clientes")).getByText(/Venda de balcão sem cliente/)).toHaveTextContent(
      TEXTO_CUSTO_NAO_INFORMADO,
    );
  });

  it("período sem venda: as três listas dizem que não houve", () => {
    render(<CurvaABCSection ordens={[]} pecas={[]} servicos={[]} />);
    expect(screen.getByText("Nenhuma peça vendida nesse período.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum serviço vendido nesse período.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum cliente comprou nesse período.")).toBeInTheDocument();
  });
});

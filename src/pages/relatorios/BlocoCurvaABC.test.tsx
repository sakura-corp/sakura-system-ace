// @vitest-environment jsdom
/**
 * #390 e #1086: o bloco Curva ABC mostra três listas (peças, serviços,
 * clientes) em abas, com a letra de cada linha, troca entre "Por venda" e
 * "Por lucro", e deixa a venda de balcão sem cliente fora da curva, numa linha
 * à parte. A letra é o selo cinza (laranja só no A, nunca verde nem amarelo);
 * com menos de 10 itens a frase diz que a curva ainda não diz muito.
 */
import { describe, expect, it } from "vitest";
import { renderizar, screen, within } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import { lucratividadePorItem } from "@/schemas/lucratividade";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { ItemOS, OrdemServico } from "@/types/os";
import { BlocoCurvaABC } from "./BlocoCurvaABC";

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

const periodo = { de: hojeLocal(), ate: hojeLocal() };

function desenhar(lista: OrdemServico[] = ordens) {
  const linhasPorItem = lucratividadePorItem({
    ordens: lista,
    custoPeca: mapaCustoPecas([]),
    custoServico: mapaCustoServicos([]),
    de: periodo.de,
    ate: periodo.ate,
  }).linhas;
  return renderizar(
    <BlocoCurvaABC ordens={lista} pecas={[]} servicos={[]} linhasPorItem={linhasPorItem} periodo={periodo} />,
  );
}

/** Abre o "Ver como tabela" do bloco (a tabela inteira da lista escolhida). */
async function abrirATabela(user: ReturnType<typeof renderizar>["user"]) {
  await user.click(screen.getByRole("button", { name: "Ver como tabela" }));
  return screen.getByRole("table");
}

describe("BlocoCurvaABC", () => {
  it("por venda: a tabela de peças tem a letra, a % e a acumulada de cada linha", async () => {
    const { user } = desenhar();

    // Poucos itens (3 peças): a frase avisa em vez de inventar um padrão.
    expect(screen.getByRole("heading", { name: "Poucos itens: a curva ainda não diz muito" })).toBeInTheDocument();

    // Peças: Pneu 800, Farol 500, Palheta 50 (total 1350).
    const tabela = await abrirATabela(user);
    const pneu = within(tabela).getByRole("row", { name: /Pneu/ });
    expect(within(pneu).getByLabelText("Curva A")).toBeInTheDocument();
    expect(within(pneu).getByText(/800,00/)).toBeInTheDocument();
    const palheta = within(tabela).getByRole("row", { name: /Palheta/ });
    // Começa em 96% (1300 de 1350): C.
    expect(within(palheta).getByLabelText("Curva C")).toBeInTheDocument();
    expect(within(palheta).getByText("100,0%")).toBeInTheDocument();
  });

  it("o selo da letra é laranja só no A: nunca verde nem amarelo", async () => {
    const { user } = desenhar();
    const tabela = await abrirATabela(user);
    const selo = (letra: string) => within(tabela).getAllByLabelText(`Curva ${letra}`)[0];
    expect(selo("A").className).toContain("bg-acao");
    expect(selo("C").className).not.toMatch(/\b(bg|text)-(acao|ok|atencao)\b/);
    expect(tabela.innerHTML).not.toMatch(/\b(bg|text)-(ok|atencao)\b/);
  });

  it("serviços e clientes são abas; o Consumidor fica fora da curva, numa linha à parte", async () => {
    const { user } = desenhar();

    await user.click(screen.getByRole("tab", { name: "Serviços" }));
    expect(within(await abrirATabela(user)).getByRole("row", { name: /Alinhamento/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver como gráfico" }));

    await user.click(screen.getByRole("tab", { name: "Clientes" }));
    expect(screen.getByText(/Venda de balcão sem cliente/)).toHaveTextContent(/500,00/);
    const tabela = await abrirATabela(user);
    expect(within(tabela).getByRole("row", { name: /João/ })).toBeInTheDocument();
    expect(within(tabela).queryByRole("row", { name: /Consumidor/ })).toBeNull();
  });

  it("por lucro: a peça sem custo informado vai pro C, fora da conta", async () => {
    const { user } = desenhar();
    await user.click(screen.getByRole("button", { name: "Por lucro" }));

    expect(screen.getByRole("button", { name: "Por lucro" })).toHaveAttribute("aria-pressed", "true");
    const tabela = await abrirATabela(user);
    const farol = within(tabela).getByRole("row", { name: /Farol/ });
    expect(within(farol).getByLabelText("Curva C")).toBeInTheDocument();
    expect(within(farol).getByText(TEXTO_CUSTO_NAO_INFORMADO)).toBeInTheDocument();
    expect(within(farol).getByText("fora da conta")).toBeInTheDocument();
    // Pneu: 800 − 600 = 200 de lucro.
    expect(within(within(tabela).getByRole("row", { name: /Pneu/ })).getByText(/200,00/)).toBeInTheDocument();

    // O balcão por lucro: sem custo informado, não mostra lucro inventado.
    await user.click(screen.getByRole("button", { name: "Ver como gráfico" }));
    await user.click(screen.getByRole("tab", { name: "Clientes" }));
    expect(screen.getByText(/Venda de balcão sem cliente/)).toHaveTextContent(TEXTO_CUSTO_NAO_INFORMADO);
  });

  it("com 10 ou mais itens a frase diz quantos fazem quanto; sete à vista e o resto no Ver todos", async () => {
    const muitas = ordem({
      cliente_id: "joao",
      cliente: { nome: "João" },
      itens: Array.from({ length: 12 }, (_, i) =>
        item({ descricao: `Peça ${i + 1}`, preco_unitario: 1000 - i * 50, custo_unitario: 1 }),
      ),
    });
    const { user } = desenhar([muitas]);
    expect(screen.getByRole("heading", { name: /de 12 peças fazem \d+% do que entrou/ })).toBeInTheDocument();
    expect(screen.queryByText("Peça 8")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ver os 12 peças" }));
    expect(within(screen.getByRole("dialog")).getByRole("row", { name: /Peça 12/ })).toBeInTheDocument();
  });

  it("período sem venda: as três listas dizem que não houve", async () => {
    const { user } = desenhar([]);
    expect(screen.getByText("Nenhuma peça vendida neste período.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Serviços" }));
    expect(screen.getByText("Nenhum serviço vendido neste período.")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Clientes" }));
    expect(screen.getByText("Nenhum cliente comprou neste período.")).toBeInTheDocument();
  });
});

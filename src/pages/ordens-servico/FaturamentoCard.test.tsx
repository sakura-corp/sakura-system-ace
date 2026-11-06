// @vitest-environment jsdom
/**
 * Teste de TELA do faturamento (item TR-07.2 do guia) — o primeiro do app.
 *
 * Por que este formulário vem primeiro: é onde mais dinheiro passa, e é a
 * origem de duas rejeições reais da SEFAZ (itens 31 e 32 da seção 6 do
 * PROJETO_STATUS). As contas em si já são funções puras testadas em
 * `schemas/faturamento.ts`; o que NÃO estava coberto é a ligação entre elas e
 * a tela — se o botão de confirmar realmente trava quando a soma não fecha, se
 * o parcelamento só abre no cartão de crédito, e se o que é entregue pro
 * `onConfirmar` bate com o que a pessoa viu.
 *
 * Os testes aqui são de COMPORTAMENTO, não de implementação: clicam e digitam
 * como a pessoa faria. Um teste que só confirma o caminho feliz não vale o
 * custo de manutenção — cada um abaixo guarda uma promessa que já foi
 * quebrada de verdade, ou que a tela existe pra dar.
 *
 * **Nota sobre as consultas.** Os campos deste formulário ainda não têm rótulo
 * acessível (o `<select>` de forma de pagamento não tem `<label htmlFor>` nem
 * `aria-label`), então aqui se consulta por papel e posição —
 * `getAllByRole("combobox")[0]`. Isso é uma limitação da tela, não do teste:
 * quando o item TR-02.7 (semântica) for feito, estas consultas podem virar
 * `getByRole("combobox", { name: "Forma de pagamento" })` e ficam melhores.
 */
import { describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor, within } from "@/testes/tela";
import { FaturamentoCard } from "./FaturamentoCard";
import type { JurosParcela } from "@/types/configuracao";
import type { ItemOS, OrdemServico } from "@/types/os";

// O cartão lê o Pix da loja e a loja atual. Aqui o Pix vem de `pixDaLoja`
// (null = loja sem Pix, como as lojas de hoje).
const pixDaLoja = vi.hoisted(() => ({
  atual: null as null | {
    loja_id: string;
    chave: string;
    nome_recebedor: string;
    cidade_recebedor: string;
  },
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ lojaAtual: { id: "loja-1" } }),
}));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoPix: async () => pixDaLoja.atual,
}));

const jurosParcelas: JurosParcela[] = [
  { loja_id: "loja-1", numero_parcelas: 2, juros_percentual: 3 },
  { loja_id: "loja-1", numero_parcelas: 3, juros_percentual: 5 },
];

/** OS de R$ 1.000,00: 2 peças de R$ 400 + 1 serviço de R$ 200. */
function ordemDeMil(): OrdemServico {
  const itens: ItemOS[] = [
    {
      id: "item-1",
      ordem_servico_id: "os-1",
      tipo: "peca",
      peca_id: "peca-1",
      servico_id: null,
      tecnico_id: null,
      descricao: "PNEU 175/70 R14",
      quantidade: 2,
      preco_unitario: 400,
      desconto: 0,
    },
    {
      id: "item-2",
      ordem_servico_id: "os-1",
      tipo: "servico",
      peca_id: null,
      servico_id: "servico-1",
      tecnico_id: null,
      descricao: "Alinhamento",
      quantidade: 1,
      preco_unitario: 200,
      desconto: 0,
    },
  ];

  return {
    id: "os-1",
    numero: 12,
    loja_id: "loja-1",
    cliente_id: "cliente-1",
    veiculo_id: null,
    status: "concluida",
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento: null,
    parcelas: 1,
    data_abertura: "2026-09-12T12:00:00.000Z",
    data_fechamento: null,
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    cliente: { nome: "Maria da Silva" },
    itens,
  } as OrdemServico;
}

function montar(onConfirmar = vi.fn().mockResolvedValue(undefined)) {
  const resultado = renderizar(
    <FaturamentoCard
      ordem={ordemDeMil()}
      jurosParcelas={jurosParcelas}
      onConfirmar={onConfirmar}
      onCancelar={vi.fn()}
    />,
  );
  return { ...resultado, onConfirmar };
}

const botaoConfirmar = () => screen.getByRole("button", { name: /Confirmar faturamento/ });

/** As linhas do pagamento dividido, cada uma com seus dois selects e o valor. */
function linhaDePagamento(indice: number) {
  const selects = screen.getAllByRole("combobox");
  const valores = screen.getAllByRole("spinbutton");
  return {
    forma: selects[indice * 2],
    parcelas: selects[indice * 2 + 1],
    valor: valores[indice],
  };
}

async function dividirPagamento(user: ReturnType<typeof renderizar>["user"]) {
  await user.click(screen.getByRole("checkbox", { name: /Dividir em mais de uma forma/ }));
}

describe("FaturamentoCard — pagamento dividido", () => {
  it("só habilita o confirmar quando a soma das formas fecha com o total dos itens", async () => {
    // É a trava que impede o bug do item 31: faturar por um valor diferente
    // do que a OS soma deixa o Caixa e a nota fiscal discordando.
    const { user } = montar();
    await dividirPagamento(user);

    const primeira = linhaDePagamento(0);
    await user.clear(primeira.valor);
    await user.type(primeira.valor, "600");

    // R$ 600 de R$ 1.000: ainda falta, então o botão continua travado.
    expect(botaoConfirmar()).toBeDisabled();

    const segunda = linhaDePagamento(1);
    await user.clear(segunda.valor);
    await user.type(segunda.valor, "400");

    expect(botaoConfirmar()).toBeEnabled();
  });

  it("continua travado quando a soma PASSA do total", async () => {
    // O outro lado do mesmo erro — e foi este que virou a rejeição
    // "ausência de troco" (item 32).
    const { user } = montar();
    await dividirPagamento(user);

    const primeira = linhaDePagamento(0);
    await user.clear(primeira.valor);
    await user.type(primeira.valor, "900");
    const segunda = linhaDePagamento(1);
    await user.clear(segunda.valor);
    await user.type(segunda.valor, "400");

    expect(botaoConfirmar()).toBeDisabled();
  });

  it("o parcelamento só abre no cartão de crédito", async () => {
    const { user } = montar();
    await dividirPagamento(user);

    // A primeira linha nasce no Pix, que é à vista.
    expect(linhaDePagamento(0).parcelas).toBeDisabled();

    await user.selectOptions(linhaDePagamento(0).forma, "cartao_credito");
    expect(linhaDePagamento(0).parcelas).toBeEnabled();

    // E voltar pra uma forma à vista não pode deixar um parcelamento
    // invisível sobrando da escolha anterior.
    await user.selectOptions(linhaDePagamento(0).parcelas, "3");
    await user.selectOptions(linhaDePagamento(0).forma, "dinheiro");
    expect(linhaDePagamento(0).parcelas).toBeDisabled();
    expect(linhaDePagamento(0).parcelas).toHaveValue("1");
  });

  it("o juro incide só sobre a parte do cartão, e a soma das formas continua sendo o total dos itens", async () => {
    // A regra que a usuária pediu: igual à maquininha. R$ 500 no Pix +
    // R$ 500 no cartão em 3x a 5% cobra juros só sobre os R$ 500 do cartão.
    const { user } = montar();
    await dividirPagamento(user);

    const primeira = linhaDePagamento(0);
    await user.clear(primeira.valor);
    await user.type(primeira.valor, "500");

    const segunda = linhaDePagamento(1);
    await user.selectOptions(segunda.forma, "cartao_credito");
    await user.selectOptions(segunda.parcelas, "3");
    await user.clear(segunda.valor);
    await user.type(segunda.valor, "500");

    // Fecha com o total DOS ITENS (sem juros) — é isso que destrava o botão.
    expect(botaoConfirmar()).toBeEnabled();

    // E o juro aparece à parte: 5% de 500 = 25, então o cliente paga 1.025.
    expect(screen.getByText(/Com os juros do cartão/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.025,00/)).toBeInTheDocument();
  });

  it("entrega pro onConfirmar exatamente as formas que a pessoa preencheu", async () => {
    // O que a tela mostra e o que vai pro banco precisam ser a mesma coisa —
    // é aqui que o Caixa é gravado.
    const onConfirmar = vi.fn().mockResolvedValue(undefined);
    const { user } = montar(onConfirmar);
    await dividirPagamento(user);

    const primeira = linhaDePagamento(0);
    await user.clear(primeira.valor);
    await user.type(primeira.valor, "700");
    const segunda = linhaDePagamento(1);
    await user.selectOptions(segunda.forma, "cartao_credito");
    await user.clear(segunda.valor);
    await user.type(segunda.valor, "300");

    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(botaoConfirmar());

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    const [pagamentos] = onConfirmar.mock.calls[0];
    expect(pagamentos).toEqual([
      expect.objectContaining({ formaPagamento: "pix", valor: 700 }),
      expect.objectContaining({ formaPagamento: "cartao_credito", valor: 300 }),
    ]);
  });

  it("pede confirmação antes de faturar, e desistir não fatura", async () => {
    // Faturar virou definitivo (não dá mais pra acrescentar item depois, item
    // 31), então a confirmação existe pra avisar disso. Se ela puder ser
    // ignorada, não serve pra nada.
    const onConfirmar = vi.fn().mockResolvedValue(undefined);
    const { user } = montar(onConfirmar);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(botaoConfirmar());

    expect(onConfirmar).not.toHaveBeenCalled();
  });
});

describe("FaturamentoCard — recebido agora x a receber depois", () => {
  it('"A receber depois" esconde a divisão de pagamento', async () => {
    // Dividir forma de pagamento só faz sentido no dinheiro que entra agora;
    // o que fica a receber vira UMA conta em Contas a Receber.
    const { user } = montar();
    expect(
      screen.getByRole("checkbox", { name: /Dividir em mais de uma forma/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /A receber depois/ }));

    expect(
      screen.queryByRole("checkbox", { name: /Dividir em mais de uma forma/ }),
    ).not.toBeInTheDocument();
  });
});

describe("FaturamentoCard — parcelamento sem dividir o pagamento", () => {
  it("à vista, mostra o total dos itens; parcelado no cartão, mostra a tabela com juros", async () => {
    // Sem dividir, o total em 1x sai como um valor solto na tela — e ao
    // escolher 3x no cartão (5% configurado) vira uma tabela de parcelas com
    // o total JÁ com juros: R$ 1.000 + 5% = R$ 1.050, em 3x de R$ 350.
    const { user } = montar();
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();

    const [forma, parcelas] = screen.getAllByRole("combobox");
    await user.selectOptions(forma, "cartao_credito");
    await user.selectOptions(parcelas, "3");

    const tabela = screen.getByRole("table");
    expect(within(tabela).getAllByRole("row")).toHaveLength(4); // cabeçalho + 3
    expect(screen.getByText(/Total com juros:\s*R\$\s*1\.050,00/)).toBeInTheDocument();
    expect(within(tabela).getAllByText("R$ 350,00")).toHaveLength(3);
  });

  it("forma de pagamento à vista não deixa escolher parcela", async () => {
    montar();
    const [, parcelas] = screen.getAllByRole("combobox");
    expect(parcelas).toBeDisabled();
  });
});

describe("FaturamentoCard — Pix da loja (#456)", () => {
  const PIX = {
    loja_id: "loja-1",
    chave: "pix-teste@exemplo.com.br",
    nome_recebedor: "Loja Exemplo",
    cidade_recebedor: "Araraquara",
  };

  it("sem Pix configurado, nada aparece (a tela é a de hoje)", async () => {
    pixDaLoja.atual = null;
    montar();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("qr-pix")).toBeNull();
    expect(screen.queryByRole("button", { name: "Copiar código" })).toBeNull();
  });

  it("forma única Pix com Pix configurado: mostra o QR, o código com o valor e o botão de copiar", async () => {
    pixDaLoja.atual = PIX;
    montar();
    const codigo = await screen.findByTestId("codigo-pix");
    expect(screen.getByTestId("qr-pix").querySelector("svg")).not.toBeNull();
    expect(codigo.textContent).toContain("54071000.00"); // campo 54, tamanho 07, "1000.00"
    expect(codigo.textContent).toContain("pix-teste@exemplo.com.br");
    expect(screen.getByRole("button", { name: "Copiar código" })).toBeInTheDocument();
  });

  it("trocar pra dinheiro esconde o QR", async () => {
    pixDaLoja.atual = PIX;
    const { user } = montar();
    await screen.findByTestId("qr-pix");
    await user.selectOptions(screen.getAllByRole("combobox")[0], "dinheiro");
    expect(screen.queryByTestId("qr-pix")).toBeNull();
  });

  it("dividido: o QR leva o valor da linha Pix, não o total", async () => {
    pixDaLoja.atual = PIX;
    const { user } = montar();
    await screen.findByTestId("qr-pix");
    await dividirPagamento(user);
    const primeira = linhaDePagamento(0);
    await user.clear(primeira.valor);
    await user.type(primeira.valor, "300");
    // Enquanto as linhas não fecham o total, nada de QR: o valor ainda vai mudar.
    await waitFor(() => expect(screen.queryByTestId("qr-pix")).not.toBeInTheDocument());
    const segunda = linhaDePagamento(1);
    await user.clear(segunda.valor);
    await user.type(segunda.valor, "700");
    await waitFor(() =>
      expect(screen.getByTestId("codigo-pix").textContent).toContain("5406300.00"),
    );
  });

  it('"Copiar código" copia o código e avisa "Copiado"', async () => {
    pixDaLoja.atual = PIX;
    const { user } = montar();
    const codigo = (await screen.findByTestId("codigo-pix")).textContent;
    await user.click(screen.getByRole("button", { name: "Copiar código" }));
    expect(await screen.findByText("Copiado")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(codigo);
  });
});

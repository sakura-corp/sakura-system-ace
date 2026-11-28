// @vitest-environment jsdom
/**
 * Contas a Pagar no molde de lista da leva 8 (#1094; antes, tarefa 11 da
 * #990): o cartão "Atrasadas" com a soma, o filtro por mês, os selos, o dia
 * do vencimento sem o erro de fuso (#1005), a janela de pagar com o aviso de
 * valor diferente (aviso, nunca tranca) e a forma de pagamento escolhida na
 * lista. Roda nos dois fusos (`npm run test:fusos`).
 */
import { within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { ContaPagar } from "@/types/contaPagar";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    operador: { id: "op", admin: true, permissoes: [] },
    lojaAtual: { id: "loja", nome: "Loja" },
  }),
}));

const listarContasPagar = vi.hoisted(() => vi.fn());
const pagarConta = vi.hoisted(() => vi.fn());
const desfazerPagamento = vi.hoisted(() => vi.fn());
vi.mock("@/lib/contasPagar", () => ({
  listarContasPagar,
  pagarConta,
  desfazerPagamento,
  criarContaPagar: vi.fn(),
  excluirContaPagar: vi.fn(),
}));
vi.mock("@/lib/categoriasCaixa", () => ({ listarCategoriasCaixa: async () => [] }));

const { ContasPagarPage } = await import("./ContasPagarPage");

function conta(parcial: Partial<ContaPagar> & Pick<ContaPagar, "id" | "descricao" | "vencimento">): ContaPagar {
  return {
    loja_id: "loja", valor: 100, categoria_id: null, categoria: null, recorrente: false,
    recorrente_ate: null, status: "pendente", data_pagamento: null, caixa_movimento_id: null,
    operador_id: "op", criado_em: "2026-10-01T12:00:00Z",
    ...parcial,
  } as ContaPagar;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Só o relógio é falso: 14/11/2026, 15h, no fuso de quem roda o teste.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 14, 15, 0));
  listarContasPagar.mockResolvedValue([
    conta({ id: "a", descricao: "Fornecedor de pneus", vencimento: "2026-11-13", valor: 4750 }),
    conta({ id: "b", descricao: "Internet", vencimento: "2026-11-14", valor: 129.9 }),
    conta({ id: "c", descricao: "Aluguel do galpão", vencimento: "2026-11-20", valor: 3200, recorrente: true }),
    conta({ id: "e", descricao: "Seguro", vencimento: "2026-11-16", valor: 300 }),
    conta({ id: "f", descricao: "Contador de outubro", vencimento: "2026-10-10", valor: 450 }),
    conta({
      id: "d", descricao: "Energia de outubro", vencimento: "2026-10-25", valor: 890.4,
      status: "paga", data_pagamento: "2026-10-24T13:00:00Z",
    }),
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

function linhaDe(texto: string) {
  const linha = screen.getByText(texto).closest("li");
  if (!linha) throw new Error(`sem linha pra ${texto}`);
  return within(linha);
}

/** O aviso amarelo embaixo do valor, na janela de pagar. */
function avisoDoValor() {
  return document.querySelector("[data-aviso-do-valor]");
}

function adiada() {
  let resolver!: () => void;
  const promessa = new Promise<void>((res) => {
    resolver = res;
  });
  return { promessa, resolver };
}

function nomesNaLista() {
  const lista = screen.getByRole("list", { name: "Contas a pagar" });
  return within(lista)
    .getAllByRole("listitem")
    .map((li) => li.querySelector("span")?.textContent);
}

describe("Contas a Pagar, molde de lista (#1094)", () => {
  it("o cartão Atrasadas soma as atrasadas de qualquer mês, contra o total do mês", async () => {
    renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");

    // Atrasadas: 4.750,00 (novembro) + 450,00 (outubro). A que vence hoje não entra.
    const atrasadas = screen.getByText("Atrasadas", { selector: "p" }).closest("[data-cartao-numero]") as HTMLElement;
    expect(atrasadas).toHaveTextContent("R$ 5.200,00");
    expect(atrasadas).toHaveTextContent("2 contas");

    // O mês de hoje: 4.750 + 129,90 + 3.200 + 300 = 8.379,90, tudo ainda por pagar.
    const total = screen.getByText("Total em novembro de 2026").closest("[data-cartao-numero]") as HTMLElement;
    expect(total).toHaveTextContent("R$ 8.379,90");
    const falta = screen.getByText("Falta pagar em novembro de 2026").closest("[data-cartao-numero]") as HTMLElement;
    expect(falta).toHaveTextContent("R$ 8.379,90");
  });

  it("abre no mês de hoje, o atrasado em cima, e avisa da atrasada de outro mês", async () => {
    renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");

    expect(nomesNaLista()).toEqual(["Fornecedor de pneus", "Internet", "Seguro", "Aluguel do galpão"]);
    expect(screen.queryByText("Contador de outubro")).toBeNull();
    expect(screen.getByText(/1 conta atrasada de outro mês/)).toBeInTheDocument();
  });

  it("selos e o dia do vencimento (sem o erro de fuso)", async () => {
    renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");

    expect(linhaDe("Fornecedor de pneus").getByText("Atrasada")).toBeInTheDocument();
    expect(linhaDe("Fornecedor de pneus").getByText("13/11/2026")).toBeInTheDocument();
    expect(linhaDe("Internet").getByText("Vence hoje")).toBeInTheDocument();
    expect(linhaDe("Seguro").getByText("Vence em 2 dias")).toBeInTheDocument();
    expect(linhaDe("Aluguel do galpão").getByText("A vencer")).toBeInTheDocument();
    expect(linhaDe("Aluguel do galpão").getByText("Mensal")).toBeInTheDocument();
    expect(linhaDe("Aluguel do galpão").getByText("R$ 3.200,00")).toBeInTheDocument();
  });

  it("'Ver as atrasadas' mostra só as atrasadas, de todos os meses", async () => {
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");

    await user.click(screen.getAllByRole("button", { name: "Ver as atrasadas" })[0]);
    expect(nomesNaLista()).toEqual(["Contador de outubro", "Fornecedor de pneus"]);
    expect(screen.getByRole("combobox", { name: "Mês do vencimento" })).toHaveValue("todos");
  });

  it("filtro por mês: outubro mostra a paga, com o selo verde e o desfazer no ⋯", async () => {
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");

    await user.selectOptions(screen.getByRole("combobox", { name: "Mês do vencimento" }), "2026-10");
    expect(nomesNaLista()).toEqual(["Contador de outubro", "Energia de outubro"]);
    expect(linhaDe("Energia de outubro").getByText("Paga")).toBeInTheDocument();
    expect(linhaDe("Energia de outubro").getByText(/paga em 24\/10/)).toBeInTheDocument();
    expect(linhaDe("Energia de outubro").queryByRole("button", { name: /^Pagar/ })).toBeNull();
    expect(screen.getByText("Total em outubro de 2026").closest("[data-cartao-numero]")).toHaveTextContent(
      "R$ 1.340,40",
    );
  });

  it("mês sem conta: 'Nenhuma conta neste mês' e o botão pra cadastrar abre a janela", async () => {
    listarContasPagar.mockResolvedValue([conta({ id: "x", descricao: "Antiga", vencimento: "2026-09-01", status: "paga" })]);
    const { user } = renderizar(<ContasPagarPage />);
    expect(await screen.findByText("Nenhuma conta neste mês.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cadastrar conta" }));
    expect(await screen.findByRole("dialog", { name: "Nova conta a pagar" })).toBeInTheDocument();
  });

  it("pagar com valor diferente: avisa em amarelo, NÃO tranca, e a forma vem da lista", async () => {
    pagarConta.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Internet");

    await user.click(linhaDe("Internet").getByRole("button", { name: /^Pagar/ }));
    const janela = within(await screen.findByRole("dialog"));
    expect(janela.getByText(/vence hoje/)).toBeInTheDocument();
    const valor = janela.getByLabelText("Valor pago");
    expect(valor).toHaveValue(129.9);
    expect(document.querySelector("[data-aviso-do-valor]")).toBeNull();

    await user.clear(valor);
    await user.type(valor, "159.9");
    expect(avisoDoValor()).toHaveTextContent("R$ 30,00 a mais que a conta");
    // E o leitor de tela ouve na hora (a região que fala sozinha).
    expect(janela.getByRole("status")).toHaveTextContent("R$ 30,00 a mais que a conta");
    await user.clear(valor);
    await user.type(valor, "100");
    expect(avisoDoValor()).toHaveTextContent("R$ 29,90 a menos que a conta");

    await user.click(janela.getByRole("button", { name: /Pix/ }));
    await user.click(janela.getByRole("button", { name: "Confirmar pagamento" }));
    await vi.waitFor(() => expect(pagarConta).toHaveBeenCalledTimes(1));
    expect(pagarConta).toHaveBeenCalledWith({
      conta: expect.objectContaining({ id: "b" }),
      valorPago: 100,
      formaPagamento: "pix",
      operadorId: "op",
    });
  });

  it("pagar sem mexer em nada sai igual ao de antes (valor da conta, dinheiro)", async () => {
    pagarConta.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Internet");

    await user.click(linhaDe("Internet").getByRole("button", { name: /^Pagar/ }));
    const janela = within(await screen.findByRole("dialog"));
    await user.click(janela.getByRole("button", { name: "Confirmar pagamento" }));
    await vi.waitFor(() => expect(pagarConta).toHaveBeenCalledTimes(1));
    expect(pagarConta).toHaveBeenCalledWith(
      expect.objectContaining({ valorPago: 129.9, formaPagamento: "dinheiro" }),
    );
  });

  it("clicar 2 vezes em Confirmar paga 1 vez só, e Esc no meio da gravação não fecha a janela", async () => {
    const gravacao = adiada();
    pagarConta.mockReturnValue(gravacao.promessa);
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Internet");

    await user.click(linhaDe("Internet").getByRole("button", { name: /^Pagar/ }));
    const janela = within(await screen.findByRole("dialog"));
    const confirmar = janela.getByRole("button", { name: "Confirmar pagamento" });
    await user.click(confirmar);
    await user.click(janela.getByRole("button", { name: "Confirmando..." }));
    await user.keyboard("{Escape}");

    expect(pagarConta).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    gravacao.resolver();
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(pagarConta).toHaveBeenCalledTimes(1);
  });

  it("a busca procura em todos os meses (a conta de outubro aparece buscando em novembro)", async () => {
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");

    await user.type(screen.getByRole("searchbox", { name: /Buscar conta/ }), "contador");
    expect(nomesNaLista()).toEqual(["Contador de outubro"]);
  });

  it("recarregar depois de pagar não apaga a lista (as linhas ficam no lugar)", async () => {
    pagarConta.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Internet");
    // A recarga depois de pagar fica esperando: a lista tem de continuar na tela.
    const recarga = new Promise<never>(() => {});
    listarContasPagar.mockReturnValueOnce(recarga);

    await user.click(linhaDe("Internet").getByRole("button", { name: /^Pagar/ }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirmar pagamento" }));
    await vi.waitFor(() => expect(listarContasPagar).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Fornecedor de pneus")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Contas a pagar" })).toHaveAttribute("aria-busy", "true");
  });

  it("desfazer o pagamento pede confirmação na janela do programa, com o nome da conta", async () => {
    desfazerPagamento.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");
    await user.selectOptions(screen.getByRole("combobox", { name: "Mês do vencimento" }), "2026-10");

    await user.click(linhaDe("Energia de outubro").getByRole("button", { name: /Mais ações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Desfazer pagamento" }));
    const pergunta = await screen.findByRole("dialog", { name: "Desfazer o pagamento de Energia de outubro?" });
    expect(desfazerPagamento).not.toHaveBeenCalled();

    await user.click(within(pergunta).getByRole("button", { name: "Desfazer pagamento" }));
    await vi.waitFor(() =>
      expect(desfazerPagamento).toHaveBeenCalledWith(expect.objectContaining({ id: "d" })),
    );
  });
});

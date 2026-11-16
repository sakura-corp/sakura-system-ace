// @vitest-environment jsdom
/**
 * Contas a Pagar no visual novo (tarefa 11 da #990): os selos de "Atrasada",
 * "Vence hoje", "A vencer" e "Paga", o dia do vencimento sem o erro de fuso
 * (#1005) e o pagamento chegando no `pagarConta` com o mesmo valor e a mesma
 * forma de antes. Roda nos dois fusos (`npm run test:fusos`).
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
  const linha = screen.getByText(texto).closest("tr");
  if (!linha) throw new Error(`sem linha pra ${texto}`);
  return within(linha);
}

describe("Contas a Pagar, visual novo", () => {
  it("cada pendente ganha o selo certo, e o dia é o dia gravado (sem o erro de fuso)", async () => {
    renderizar(<ContasPagarPage />);
    await screen.findByText("Fornecedor de pneus");

    expect(linhaDe("Fornecedor de pneus").getByText("Atrasada")).toBeInTheDocument();
    expect(linhaDe("Fornecedor de pneus").getByText("13/11/2026")).toBeInTheDocument();
    expect(linhaDe("Internet").getByText("Vence hoje")).toBeInTheDocument();
    expect(linhaDe("Internet").getByText("14/11/2026")).toBeInTheDocument();
    expect(linhaDe("Aluguel do galpão").getByText("A vencer")).toBeInTheDocument();
    expect(linhaDe("Aluguel do galpão").getByText("Mensal")).toBeInTheDocument();
    expect(linhaDe("Aluguel do galpão").getByText("R$ 3.200,00")).toBeInTheDocument();

    // Ao lado de "Pendentes", quantas estão atrasadas.
    expect(screen.getByRole("heading", { name: /Pendentes/ })).toHaveTextContent("1 atrasada");

    // A paga: o selo verde com o dia do pagamento, e o desfazer à vista.
    expect(linhaDe("Energia de outubro").getByText(/^Paga em /)).toBeInTheDocument();
    expect(
      linhaDe("Energia de outubro").getByRole("button", { name: /Desfazer pagamento/ }),
    ).toBeInTheDocument();
  });

  it("pagar: a janela mostra o valor e o vencimento, e o pagamento sai igual ao de antes", async () => {
    pagarConta.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Internet");

    await user.click(linhaDe("Internet").getByRole("button", { name: /Marcar como paga/ }));
    const janela = within(await screen.findByRole("dialog"));
    expect(janela.getByText(/vence hoje/)).toBeInTheDocument();
    expect(janela.getAllByText("R$ 129,90").length).toBeGreaterThan(0);
    expect(janela.getByLabelText("Valor pago")).toHaveValue(129.9);

    await user.click(janela.getByRole("button", { name: "Confirmar pagamento" }));
    await vi.waitFor(() => expect(pagarConta).toHaveBeenCalledTimes(1));
    expect(pagarConta).toHaveBeenCalledWith({
      conta: expect.objectContaining({ id: "b" }),
      valorPago: 129.9,
      formaPagamento: "dinheiro",
      operadorId: "op",
    });
  });

  it("desfazer o pagamento continua pedindo confirmação", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    desfazerPagamento.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasPagarPage />);
    await screen.findByText("Energia de outubro");

    await user.click(
      linhaDe("Energia de outubro").getByRole("button", { name: /Desfazer pagamento/ }),
    );
    expect(confirmar).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(desfazerPagamento).toHaveBeenCalledWith(expect.objectContaining({ id: "d" })),
    );
  });
});

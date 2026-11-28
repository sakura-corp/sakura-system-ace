// @vitest-environment jsdom
/**
 * Contas a Receber no molde de lista da leva 8 (#1094; antes, tarefa 11 da
 * #990): o cartão "Atrasadas" com a soma, o filtro por mês, os selos, o dia da
 * previsão e o da mensagem de cobrança sem o erro de fuso (#1005), o "Cobrar"
 * e o "Abrir a OS" no "⋯", e o recebimento com o aviso de valor diferente e a
 * forma escolhida na lista. Roda nos dois fusos (`npm run test:fusos`).
 */
import { within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { ContaReceber } from "@/types/contaReceber";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    operador: { id: "op", admin: true, permissoes: [] },
    lojaAtual: { id: "loja", nome: "Loja" },
  }),
}));

const navegar = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => navegar,
}));

const listarContasReceber = vi.hoisted(() => vi.fn());
const receberConta = vi.hoisted(() => vi.fn());
vi.mock("@/lib/contasReceber", () => ({
  listarContasReceber,
  receberConta,
  criarContaReceber: vi.fn(),
}));
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [
    { id: "c1", nome: "Eduardo Salles", telefone: "16991234567" },
  ],
}));
vi.mock("@/lib/configuracoes", () => ({ buscarConfiguracaoPix: async () => null }));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  registrarMensagemAberta: vi.fn(async () => {}),
  textoDoModelo: () => "Vence em {vencimento}, valor {valor}",
  ultimasMensagensPorReferencia: async () => new Map([["a", "2026-11-12T14:00:00Z"]]),
}));
const abrirConversaWhatsapp = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/whatsapp", () => ({ abrirConversaWhatsapp }));

const { ContasReceberPage } = await import("./ContasReceberPage");

function conta(
  parcial: Partial<ContaReceber> & Pick<ContaReceber, "id" | "descricao" | "vencimento">,
): ContaReceber {
  return {
    loja_id: "loja", cliente_id: "c1", ordem_servico_id: null, valor: 100, status: "pendente",
    data_recebimento: null, caixa_movimento_id: null, operador_id: "op",
    criado_em: "2026-10-01T12:00:00Z", cliente: { nome: "Eduardo Salles" },
    ...parcial,
  } as ContaReceber;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 14, 15, 0));
  listarContasReceber.mockResolvedValue([
    conta({ id: "a", descricao: "Serviço da frota", vencimento: "2026-11-13", valor: 1340 }),
    conta({ id: "b", descricao: "Faturamento da OS 145", vencimento: "2026-11-20", valor: 2588, ordem_servico_id: "os145" }),
    conta({ id: "e", descricao: "Acerto antigo", vencimento: "2026-10-02", valor: 200 }),
    conta({
      id: "c", descricao: "Parcela 2/2", vencimento: "2026-10-05", valor: 720,
      status: "recebido", data_recebimento: "2026-10-06T13:00:00Z",
    }),
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

function linhaDe(texto: string | RegExp) {
  const linha = screen.getByText(texto).closest("li");
  if (!linha) throw new Error(`sem linha pra ${texto}`);
  return within(linha);
}

describe("Contas a Receber, molde de lista (#1094)", () => {
  it("o cartão Atrasadas soma as atrasadas de qualquer mês, contra o total do mês", async () => {
    renderizar(<ContasReceberPage />);
    await screen.findByText(/Serviço da frota/);

    const atrasadas = screen.getByText("Atrasadas", { selector: "p" }).closest("[data-cartao-numero]") as HTMLElement;
    expect(atrasadas).toHaveTextContent("R$ 1.540,00"); // 1.340 (novembro) + 200 (outubro)
    expect(screen.getByText("Total em novembro de 2026").closest("[data-cartao-numero]")).toHaveTextContent(
      "R$ 3.928,00",
    );
    expect(screen.getByText("Falta receber em novembro de 2026").closest("[data-cartao-numero]")).toHaveTextContent(
      "R$ 3.928,00",
    );
  });

  it("selos, o dia da previsão e o 'cobrado em' na linha de baixo", async () => {
    renderizar(<ContasReceberPage />);
    await screen.findByText(/Serviço da frota/);

    expect(linhaDe(/Serviço da frota/).getByText("Atrasada")).toBeInTheDocument();
    expect(linhaDe(/Serviço da frota/).getByText("13/11/2026")).toBeInTheDocument();
    expect(linhaDe(/Serviço da frota/).getByText(/cobrado em/)).toBeInTheDocument();
    expect(linhaDe(/Faturamento da OS 145/).getByText("A vencer")).toBeInTheDocument();
    expect(linhaDe(/Faturamento da OS 145/).getByText("20/11/2026")).toBeInTheDocument();
    // A conta de outubro não aparece no mês de hoje, mas o aviso diz que ela existe.
    expect(screen.queryByText(/Acerto antigo/)).toBeNull();
    expect(screen.getByText(/1 conta atrasada de outro mês/)).toBeInTheDocument();
  });

  it("filtro por mês: outubro mostra a recebida, com o selo verde e sem o 'Receber'", async () => {
    const { user } = renderizar(<ContasReceberPage />);
    await screen.findByText(/Serviço da frota/);

    await user.selectOptions(screen.getByRole("combobox", { name: "Mês do vencimento" }), "2026-10");
    expect(linhaDe(/Parcela 2\/2/).getByText("Recebida")).toBeInTheDocument();
    expect(linhaDe(/Parcela 2\/2/).getByText(/recebida em 06\/10/)).toBeInTheDocument();
    expect(linhaDe(/Parcela 2\/2/).queryByRole("button", { name: /^Receber/ })).toBeNull();
    expect(linhaDe(/Acerto antigo/).getByText("Atrasada")).toBeInTheDocument();
  });

  it("a cobrança do WhatsApp (no ⋯) leva o dia certo do vencimento (#1005)", async () => {
    const { user } = renderizar(<ContasReceberPage />);
    await screen.findByText(/Serviço da frota/);

    await user.click(linhaDe(/Serviço da frota/).getByRole("button", { name: /Mais ações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Cobrar no WhatsApp" }));
    await vi.waitFor(() => expect(abrirConversaWhatsapp).toHaveBeenCalledTimes(1));
    expect(abrirConversaWhatsapp).toHaveBeenCalledWith(
      "16991234567",
      expect.stringContaining("Vence em 13/11/2026"),
    );
  });

  it("'Abrir a OS' fica no ⋯ só da conta que veio de uma OS", async () => {
    const { user } = renderizar(<ContasReceberPage />);
    await screen.findByText(/Faturamento da OS 145/);

    await user.click(linhaDe(/Serviço da frota/).getByRole("button", { name: /Mais ações/ }));
    expect(screen.queryByRole("menuitem", { name: "Abrir a OS" })).toBeNull();
    await user.keyboard("{Escape}");

    await user.click(linhaDe(/Faturamento da OS 145/).getByRole("button", { name: /Mais ações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Abrir a OS" }));
    expect(navegar).toHaveBeenCalledWith("/ordens-servico", { state: { abrirOrdemId: "os145" } });
  });

  it("receber com valor diferente: avisa e salva assim mesmo, com a forma da lista", async () => {
    receberConta.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasReceberPage />);
    await screen.findByText(/Serviço da frota/);

    await user.click(linhaDe(/Serviço da frota/).getByRole("button", { name: /^Receber/ }));
    const janela = within(await screen.findByRole("dialog"));
    expect(janela.getByText(/previsto para 13\/11\/2026 \(atrasada\)/)).toBeInTheDocument();
    const valor = janela.getByLabelText("Valor recebido");
    expect(valor).toHaveValue(1340);

    await user.clear(valor);
    await user.type(valor, "1000");
    expect(document.querySelector("[data-aviso-do-valor]")).toHaveTextContent("R$ 340,00 a menos que a conta");

    await user.click(janela.getByRole("button", { name: /Cartão de débito/ }));
    await user.click(janela.getByRole("button", { name: "Confirmar recebimento" }));
    await vi.waitFor(() => expect(receberConta).toHaveBeenCalledTimes(1));
    expect(receberConta).toHaveBeenCalledWith({
      conta: expect.objectContaining({ id: "a" }),
      valorRecebido: 1000,
      formaPagamento: "cartao_debito",
      operadorId: "op",
    });
  });
});

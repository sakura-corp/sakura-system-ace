// @vitest-environment jsdom
/**
 * Contas a Receber no visual novo (tarefa 11 da #990): os selos, o dia da
 * previsão e o da mensagem de cobrança sem o erro de fuso (#1005), o "Abrir a
 * OS" no "Mais ações" e o recebimento chegando no `receberConta` com o mesmo
 * valor e a mesma forma de antes. Roda nos dois fusos (`npm run test:fusos`).
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
    conta({
      id: "c", descricao: "Parcela 2/2", vencimento: "2026-10-05", valor: 720,
      status: "recebido", data_recebimento: "2026-10-06T13:00:00Z",
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

describe("Contas a Receber, visual novo", () => {
  it("selos, o dia da previsão e o 'cobrado em' embaixo do status", async () => {
    renderizar(<ContasReceberPage />);
    await screen.findByText("Serviço da frota");

    expect(linhaDe("Serviço da frota").getByText("Atrasada")).toBeInTheDocument();
    expect(linhaDe("Serviço da frota").getByText("13/11/2026")).toBeInTheDocument();
    expect(linhaDe("Serviço da frota").getByText(/cobrado em/)).toBeInTheDocument();
    expect(linhaDe("Faturamento da OS 145").getByText("A vencer")).toBeInTheDocument();
    expect(linhaDe("Faturamento da OS 145").getByText("20/11/2026")).toBeInTheDocument();
    expect(linhaDe("Parcela 2/2").getByText(/^Recebida em /)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Pendentes/ })).toHaveTextContent("1 atrasada");
  });

  it("a cobrança do WhatsApp leva o dia certo do vencimento (#1005)", async () => {
    const { user } = renderizar(<ContasReceberPage />);
    await screen.findByText("Serviço da frota");

    await user.click(linhaDe("Serviço da frota").getByRole("button", { name: /Cobrar/ }));
    await vi.waitFor(() => expect(abrirConversaWhatsapp).toHaveBeenCalledTimes(1));
    expect(abrirConversaWhatsapp).toHaveBeenCalledWith(
      "16991234567",
      expect.stringContaining("Vence em 13/11/2026"),
    );
  });

  it("'Abrir a OS' fica no Mais ações da conta que veio de uma OS", async () => {
    const { user } = renderizar(<ContasReceberPage />);
    await screen.findByText("Faturamento da OS 145");

    expect(linhaDe("Serviço da frota").queryByRole("button", { name: /Mais ações/ })).toBeNull();
    await user.click(linhaDe("Faturamento da OS 145").getByRole("button", { name: /Mais ações/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Abrir a OS" }));
    expect(navegar).toHaveBeenCalledWith("/ordens-servico", { state: { abrirOrdemId: "os145" } });
  });

  it("receber: o recebimento sai igual ao de antes", async () => {
    receberConta.mockResolvedValue(undefined);
    const { user } = renderizar(<ContasReceberPage />);
    await screen.findByText("Serviço da frota");

    await user.click(linhaDe("Serviço da frota").getByRole("button", { name: /Marcar como recebido/ }));
    const janela = within(await screen.findByRole("dialog"));
    expect(janela.getByText(/previsto para 13\/11\/2026 \(atrasada\)/)).toBeInTheDocument();
    expect(janela.getByLabelText("Valor recebido")).toHaveValue(1340);
    // A linha não abre nada por baixo da janela (a conta não tem OS).
    expect(navegar).not.toHaveBeenCalled();

    await user.click(janela.getByRole("button", { name: "Confirmar recebimento" }));
    await vi.waitFor(() => expect(receberConta).toHaveBeenCalledTimes(1));
    expect(receberConta).toHaveBeenCalledWith({
      conta: expect.objectContaining({ id: "a" }),
      valorRecebido: 1340,
      formaPagamento: "dinheiro",
      operadorId: "op",
    });
  });
});

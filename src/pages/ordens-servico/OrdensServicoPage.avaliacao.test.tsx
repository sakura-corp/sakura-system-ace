// @vitest-environment jsdom
/**
 * Tarefa #459: o botão "Avaliação" na lista de OS/vendas. Só com a OS faturada,
 * o link da loja e o módulo Clientes; falhar ao ler o link não derruba a lista.
 */
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { Operador } from "@/types/operador";

const buscarLinkAvaliacao = vi.fn();
const abrirConversaWhatsapp = vi.fn();
const registrarMensagemAberta = vi.fn();
let status = "faturada";
let tipo = "os";
let clienteId = "c1";

vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [
    { id: "c1", nome: "Cliente Exemplo", telefone: "(16) 99123-4567" },
  ],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/ordensServico", () => ({
  listarOrdens: async () => [
    {
      id: "os1",
      numero: 5,
      tipo,
      status,
      cliente_id: clienteId,
      cliente: { nome: "Cliente Exemplo" },
      veiculo: null,
      data_abertura: "2026-11-02T10:00:00Z",
      itens: [],
      parcelas: 1,
    },
  ],
  adicionarItensOrdem: vi.fn(),
  atualizarOrdem: vi.fn(),
  concluirOrdem: vi.fn(),
  criarOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  faturarOrdem: vi.fn(),
  registrarVendaBalcao: vi.fn(),
  VendaSemFaturamentoError: class extends Error {},
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: async () => new Map() }));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  listarJurosParcelas: async () => [],
  buscarTextoGarantia: async () => "",
  buscarConfiguracaoFiscal: async () => null,
  buscarLinkAvaliacao: (...a: unknown[]) => buscarLinkAvaliacao(...a),
}));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens: async () => [] }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/whatsapp", () => ({
  abrirConversaWhatsapp: (...a: unknown[]) => abrirConversaWhatsapp(...a),
}));
vi.mock("@/lib/modelosWhatsapp", async () => {
  const { modeloPorChave } = await import("@/schemas/whatsapp");
  return {
    listarModelosWhatsapp: async () => ({}),
    textoDoModelo: (m: Record<string, string>, c: never) => m[c] ?? modeloPorChave(c).padrao,
    registrarMensagemAberta: (...a: unknown[]) => registrarMensagemAberta(...a),
  };
});

let operador: Partial<Operador> = {};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a", nome: "Loja Centro" } }),
}));

const { OrdensServicoPage } = await import("./OrdensServicoPage");

function montar() {
  return render(
    <MemoryRouter>
      <OrdensServicoPage />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  status = "faturada";
  tipo = "os";
  clienteId = "c1";
  operador = { id: "op", admin: false, permissoes: ["ordens_servico", "clientes"] };
  buscarLinkAvaliacao.mockReset();
  abrirConversaWhatsapp.mockReset();
  abrirConversaWhatsapp.mockResolvedValue(undefined);
  registrarMensagemAberta.mockReset();
});

describe("OrdensServicoPage — botão Avaliação", () => {
  it("com o link e a OS faturada, abre o WhatsApp com o link e registra", async () => {
    buscarLinkAvaliacao.mockResolvedValue("https://g.page/r/abc/review");
    montar();
    await userEvent.click(await screen.findByRole("button", { name: /avaliação/i }));
    await waitFor(() => expect(abrirConversaWhatsapp).toHaveBeenCalled());
    expect(abrirConversaWhatsapp.mock.calls[0][1]).toContain("https://g.page/r/abc/review");
    expect(abrirConversaWhatsapp.mock.calls[0][1]).toContain("Cliente Exemplo");
    expect(registrarMensagemAberta).toHaveBeenCalledWith(
      "loja-a", "avaliacao", "os1", "(16) 99123-4567", "op",
    );
  });

  it("sem o link, não aparece", async () => {
    buscarLinkAvaliacao.mockResolvedValue(null);
    montar();
    await screen.findAllByText("Cliente Exemplo");
    expect(screen.queryByRole("button", { name: /avaliação/i })).toBeNull();
  });

  it("a leitura do link falhar não derruba a lista e some o botão", async () => {
    buscarLinkAvaliacao.mockRejectedValue(new Error("relation does not exist"));
    montar();
    await screen.findAllByText("Cliente Exemplo");
    expect(screen.queryByRole("button", { name: /avaliação/i })).toBeNull();
  });

  it("OS não faturada, não aparece", async () => {
    status = "concluida";
    buscarLinkAvaliacao.mockResolvedValue("https://g.page/r/abc/review");
    montar();
    await screen.findAllByText("Cliente Exemplo");
    expect(screen.queryByRole("button", { name: /avaliação/i })).toBeNull();
  });

  it("sem o módulo Clientes, não aparece", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    buscarLinkAvaliacao.mockResolvedValue("https://g.page/r/abc/review");
    montar();
    await screen.findAllByText("Cliente Exemplo");
    expect(screen.queryByRole("button", { name: /avaliação/i })).toBeNull();
  });

  it("venda de balcão faturada de cliente cadastrado: aparece na lista e no detalhe da venda", async () => {
    tipo = "venda_balcao";
    buscarLinkAvaliacao.mockResolvedValue("https://g.page/r/abc/review");
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: /vendas de balcão/i }));
    expect(await screen.findByRole("button", { name: /avaliação/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^fechamento$/i }));
    // O detalhe da venda abre em cima da lista: o botão é o do cabeçalho dele.
    const detalhe = (await screen.findByText(/venda de balcão · registrada/i)).closest(".sakura-card");
    if (!(detalhe instanceof HTMLElement)) throw new Error("o detalhe da venda não abriu");
    await userEvent.click(within(detalhe).getByRole("button", { name: /avaliação/i }));
    await waitFor(() => expect(abrirConversaWhatsapp).toHaveBeenCalled());
    expect(abrirConversaWhatsapp.mock.calls[0][1]).toContain("https://g.page/r/abc/review");
  });

  it("venda de balcão do Consumidor (sem cadastro nem telefone): não aparece", async () => {
    tipo = "venda_balcao";
    clienteId = CLIENTE_CONSUMIDOR_ID;
    buscarLinkAvaliacao.mockResolvedValue("https://g.page/r/abc/review");
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: /vendas de balcão/i }));
    await screen.findAllByText("Cliente Exemplo");
    expect(screen.queryByRole("button", { name: /avaliação/i })).toBeNull();
  });
});

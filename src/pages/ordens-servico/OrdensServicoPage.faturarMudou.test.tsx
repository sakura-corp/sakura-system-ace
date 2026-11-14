// @vitest-environment jsdom
/**
 * #803 (caso 2): alguém mexeu na OS em outro computador e o banco recusou o
 * faturamento (a lib lança `OrdemMudouError`). A tela não pode cobrar nada: tem
 * que mostrar o aviso e recarregar a OS, pra o cartão mostrar o total NOVO.
 */
import userEvent from "@testing-library/user-event";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { OrdemServico } from "@/types/os";

const listarOrdens = vi.fn();
const faturarOrdem = vi.fn();
const mensagemMudou = "A OS 50 mudou em outro computador. Nada foi cobrado: atualize a tela.";
vi.mock("@/lib/ordensServico", () => ({
  listarOrdens: (...a: unknown[]) => listarOrdens(...a),
  adicionarItensOrdem: vi.fn(),
  atualizarOrdem: vi.fn(),
  concluirOrdem: vi.fn(),
  criarOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  faturarOrdem: (...a: unknown[]) => faturarOrdem(...a),
  registrarVendaBalcao: vi.fn(),
  VendaSemFaturamentoError: class extends Error {},
  OrdemMudouError: class OrdemMudouError extends Error {
    constructor() {
      super("A OS 50 mudou em outro computador. Nada foi cobrado: atualize a tela.");
      this.name = "OrdemMudouError";
    }
  },
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: async () => new Map() }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  listarJurosParcelas: async () => [],
  buscarConfiguracaoPix: async () => null,
  buscarLinkAvaliacao: async () => null,
}));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens: async () => [] }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  textoDoModelo: () => "",
  registrarMensagemAberta: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    operador: { id: "op-1", admin: true, permissoes: [] },
    lojaAtual: { id: "loja-a", nome: "Loja A" },
  }),
}));

const { OrdensServicoPage } = await import("./OrdensServicoPage");
const { OrdemMudouError } = await import("@/lib/ordensServico");

function os(preco: number, status = "concluida") {
  return {
    id: "os-1",
    numero: 50,
    loja_id: "loja-a",
    cliente_id: "c1",
    veiculo_id: null,
    data_abertura: `${hojeLocal()}T15:00:00.000Z`,
    status,
    tipo: "os",
    cliente: { nome: "Cliente da OS" },
    itens: [
      { id: "i1", tipo: "peca", peca_id: null, descricao: "Palheta", quantidade: 1, preco_unitario: preco, desconto: 0, custo_unitario: 30 },
    ],
  } as unknown as OrdemServico;
}

async function abrirFaturamentoEConfirmar() {
  const usuario = userEvent.setup();
  render(
    <MemoryRouter>
      <OrdensServicoPage />
    </MemoryRouter>,
  );
  await usuario.click(await screen.findByRole("button", { name: "Faturar" }));
  expect(await screen.findByText(/Total dos itens: R\$\s*100,00/)).toBeInTheDocument();
  await usuario.click(screen.getByRole("button", { name: "Confirmar faturamento" }));
}

beforeEach(() => {
  localStorage.clear();
  listarOrdens.mockReset();
  faturarOrdem.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("OrdensServicoPage — a OS mudou em outro computador na hora de faturar", () => {
  it("manda o operador e o total que a tela mostrou", async () => {
    listarOrdens.mockResolvedValue([os(100)]);
    faturarOrdem.mockResolvedValue(undefined);
    await abrirFaturamentoEConfirmar();
    await waitFor(() => expect(faturarOrdem).toHaveBeenCalledTimes(1));
    const [, , , , operadorId, total] = faturarOrdem.mock.calls[0];
    expect(operadorId).toBe("op-1");
    expect(total).toBe(100);
  });

  it("mostra o aviso, recarrega a OS e o cartão passa a mostrar o total novo", async () => {
    listarOrdens.mockResolvedValueOnce([os(100)]).mockResolvedValue([os(150)]);
    faturarOrdem.mockRejectedValue(new OrdemMudouError(os(100)));
    await abrirFaturamentoEConfirmar();

    expect(await screen.findByText(mensagemMudou)).toBeInTheDocument();
    expect(await screen.findByText(/Total dos itens: R\$\s*150,00/)).toBeInTheDocument();
    expect(listarOrdens).toHaveBeenCalledTimes(2);
    expect(faturarOrdem).toHaveBeenCalledTimes(1);
  });

  it("se a OS recarregada já está faturada, fecha o cartão e avisa na página", async () => {
    listarOrdens.mockResolvedValueOnce([os(100)]).mockResolvedValue([os(100, "faturada")]);
    faturarOrdem.mockRejectedValue(new OrdemMudouError(os(100)));
    await abrirFaturamentoEConfirmar();

    expect(await screen.findByText(mensagemMudou)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar faturamento" })).not.toBeInTheDocument();
  });
});

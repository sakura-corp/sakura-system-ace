// @vitest-environment jsdom
/**
 * #379: a lista de OS mostra só OS. Orçamento (aberto ou recusado) tem a
 * lista dele (`OrcamentosPage`) e não pode aparecer aqui nem contar nas abas.
 */
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { OrdemServico } from "@/types/os";

const listarOrdens = vi.fn();
vi.mock("@/lib/ordensServico", () => ({
  listarOrdens: (...a: unknown[]) => listarOrdens(...a),
  adicionarItensOrdem: vi.fn(),
  atualizarOrdem: vi.fn(),
  concluirOrdem: vi.fn(),
  criarOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  faturarOrdem: vi.fn(),
  registrarVendaBalcao: vi.fn(),
  VendaSemFaturamentoError: class extends Error {},
}));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock("@/lib/clientes", () => ({
  listarClientes: async () => [{ id: "c1", nome: "Maria", telefone: null, veiculos: [] }],
  criarCliente: vi.fn(),
  criarVeiculo: vi.fn(),
}));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({ listarJurosParcelas: async () => [] }));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens: async () => [] }));
vi.mock("@/lib/estoque", () => ({
  listarMovimentos: async () => [],
  calcularSaldoPorPeca: () => new Map(),
}));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  textoDoModelo: () => "",
  registrarMensagemAberta: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    operador: { id: "op", admin: true, permissoes: [] },
    lojaAtual: { id: "loja-a", nome: "Loja Centro" },
  }),
}));

const { OrdensServicoPage } = await import("./OrdensServicoPage");

const base = {
  loja_id: "loja-a",
  cliente_id: "c1",
  veiculo_id: null,
  data_abertura: `${hojeLocal()}T15:00:00.000Z`,
  itens: [],
};
const ordens = [
  { ...base, id: "a", numero: 50, status: "em_andamento", cliente: { nome: "Cliente da OS" } },
  { ...base, id: "b", numero: null, numero_orcamento: 3, status: "orcamento", cliente: { nome: "Cliente do Orçamento" } },
  { ...base, id: "c", numero: null, numero_orcamento: 4, status: "recusado", cliente: { nome: "Cliente Recusado" } },
] as unknown as OrdemServico[];

beforeEach(() => {
  localStorage.clear();
  listarOrdens.mockResolvedValue(ordens);
});

describe("OrdensServicoPage — sem orçamento", () => {
  it("mostra a OS, não mostra orçamento aberto nem recusado, e a aba conta só OS", async () => {
    render(
      <MemoryRouter>
        <OrdensServicoPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Cliente da OS")).toBeInTheDocument();
    expect(screen.queryByText("Cliente do Orçamento")).not.toBeInTheDocument();
    expect(screen.queryByText("Cliente Recusado")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ordens de serviço (1)" })).toBeInTheDocument();
  });
});

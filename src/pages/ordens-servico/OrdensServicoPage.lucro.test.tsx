// @vitest-environment jsdom
/**
 * #655: peça digitada sem cadastro e sem custo não tem lucro que se possa
 * calcular — a coluna Lucro diz "custo não informado" em vez de inventar
 * um número.
 */
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@/testes/tela";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
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
  listarClientesParaEscolha: async () => [{ id: "c1", nome: "Maria", telefone: null, veiculos: [] }],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
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
  status: "em_andamento",
};
const avulsaSemCusto = { id: "i1", tipo: "peca", peca_id: null, descricao: "Palheta", quantidade: 1, preco_unitario: 100, desconto: 0, custo_unitario: null };
const ordens = [
  { ...base, id: "a", numero: 50, cliente: { nome: "Cliente sem custo" }, itens: [avulsaSemCusto] },
  { ...base, id: "b", numero: 51, cliente: { nome: "Cliente com custo" }, itens: [{ ...avulsaSemCusto, id: "i2", custo_unitario: 30 }] },
] as unknown as OrdemServico[];

beforeEach(() => {
  localStorage.clear();
  listarOrdens.mockResolvedValue(ordens);
});

describe("OrdensServicoPage — lucro com custo não informado", () => {
  it("peça avulsa sem custo mostra o texto no lugar do lucro; com custo, o número", async () => {
    render(
      <MemoryRouter>
        <OrdensServicoPage />
      </MemoryRouter>,
    );

    const linhaSemCusto = (await screen.findByText("Cliente sem custo")).closest("tr") as HTMLElement;
    expect(within(linhaSemCusto).getByText(TEXTO_CUSTO_NAO_INFORMADO)).toBeInTheDocument();

    const linhaComCusto = screen.getByText("Cliente com custo").closest("tr") as HTMLElement;
    expect(within(linhaComCusto).queryByText(TEXTO_CUSTO_NAO_INFORMADO)).not.toBeInTheDocument();
    // 100 de venda − 30 de custo.
    expect(within(linhaComCusto).getAllByText(/70,00/)).toHaveLength(1);
  });
});

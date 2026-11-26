// @vitest-environment jsdom
/**
 * #1017: Ordens de Serviço sem internet. A busca que falhou mostra só o erro
 * e o "Tentar de novo": nem o "Nenhuma ordem de serviço ainda", nem o
 * "Cadastre ao menos um cliente" (os dois fazem parecer que os cadastros
 * sumiram). E a lista no erro busca de novo sozinha quando a internet volta.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { OrdemServico } from "@/types/os";

const listarOrdens = vi.fn();
const listarClientesParaEscolha = vi.fn();
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: (...a: unknown[]) => listarClientesParaEscolha(...a),
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
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
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/caixa", () => ({ buscarCustoDasOrdens: async () => new Map() }));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  listarJurosParcelas: async () => [],
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
    operador: { id: "op", admin: true, permissoes: [] },
    lojaAtual: { id: "loja-a", nome: "Loja Centro" },
  }),
}));
// A rede de mentira: o teste liga e desliga o "sem conexão".
const conexao = vi.hoisted(() => ({ semConexao: false }));
vi.mock("@/hooks/useConexao", () => ({ useConexao: () => ({ semConexao: conexao.semConexao }) }));

const { OrdensServicoPage } = await import("./OrdensServicoPage");

const ERRO_DE_REDE = new TypeError("Failed to fetch");
const CLIENTE = { id: "c1", nome: "Maria Souza", telefone: null, veiculos: [] };
const OS = {
  id: "os1",
  numero: 7,
  loja_id: "loja-a",
  cliente_id: "c1",
  veiculo_id: null,
  cliente: { nome: "Maria Souza" },
  status: "em_andamento",
  itens: [],
  data_abertura: `${hojeLocal()}T15:00:00.000Z`,
} as unknown as OrdemServico;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  conexao.semConexao = false;
  Element.prototype.scrollIntoView = vi.fn();
  listarClientesParaEscolha.mockResolvedValue([CLIENTE]);
});

describe("OrdensServicoPage — sem internet (#1017)", () => {
  it("a busca falhou: só o erro e o 'Tentar de novo', sem 'Nenhuma ordem' nem 'Cadastre ao menos um cliente'", async () => {
    listarOrdens.mockRejectedValue(ERRO_DE_REDE);
    renderizar(<OrdensServicoPage />);
    expect(await screen.findByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/conex/i);
    expect(screen.queryByText(/Nenhuma ordem de serviço/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cadastre ao menos um cliente/)).not.toBeInTheDocument();
  });

  it("a busca deu certo e voltou vazia: 'Nenhuma ordem de serviço ainda'", async () => {
    listarOrdens.mockResolvedValue([]);
    renderizar(<OrdensServicoPage />);
    expect(await screen.findByText(/Nenhuma ordem de serviço ainda/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("a busca deu certo e não há cliente: o 'Cadastre ao menos um cliente' continua", async () => {
    listarOrdens.mockResolvedValue([]);
    listarClientesParaEscolha.mockResolvedValue([]);
    renderizar(<OrdensServicoPage />);
    expect(await screen.findByText(/Cadastre ao menos um cliente/)).toBeInTheDocument();
  });

  it("a internet voltou: a lista no erro busca de novo sozinha", async () => {
    listarOrdens.mockRejectedValueOnce(ERRO_DE_REDE).mockResolvedValue([OS]);
    const tela = renderizar(<OrdensServicoPage />);
    await screen.findByRole("button", { name: "Tentar de novo" });
    conexao.semConexao = true;
    tela.rerender(<OrdensServicoPage />);
    conexao.semConexao = false;
    tela.rerender(<OrdensServicoPage />);
    expect(await screen.findByText("Maria Souza")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("a internet caiu e voltou com a lista funcionando: não busca de novo", async () => {
    listarOrdens.mockResolvedValue([OS]);
    const tela = renderizar(<OrdensServicoPage />);
    await screen.findByText("Maria Souza");
    const chamadas = listarOrdens.mock.calls.length;
    conexao.semConexao = true;
    tela.rerender(<OrdensServicoPage />);
    conexao.semConexao = false;
    tela.rerender(<OrdensServicoPage />);
    await new Promise((r) => setTimeout(r, 20));
    expect(listarOrdens.mock.calls.length).toBe(chamadas);
  });

  it("internet oscilando durante a recarga: não recomeça a carga que ainda está buscando", async () => {
    let soltar!: (v: OrdemServico[]) => void;
    listarOrdens
      .mockRejectedValueOnce(ERRO_DE_REDE)
      .mockImplementationOnce(() => new Promise<OrdemServico[]>((r) => (soltar = r)))
      .mockResolvedValue([OS]);
    const tela = renderizar(<OrdensServicoPage />);
    await screen.findByRole("button", { name: "Tentar de novo" });
    // Voltou: começa a recarga (ainda buscando)…
    conexao.semConexao = true;
    tela.rerender(<OrdensServicoPage />);
    conexao.semConexao = false;
    tela.rerender(<OrdensServicoPage />);
    // …e a rede pisca de novo no meio dela.
    conexao.semConexao = true;
    tela.rerender(<OrdensServicoPage />);
    conexao.semConexao = false;
    tela.rerender(<OrdensServicoPage />);
    expect(listarOrdens).toHaveBeenCalledTimes(2);
    soltar([OS]);
    expect(await screen.findByText("Maria Souza")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
/**
 * Tarefa #947: ao salvar uma seção de Configurações, a página recarrega os dados
 * (`carregar`). Hoje esse recarregar tira as seções da tela (`carregando`), então
 * a seção desmonta, volta fechada e o aviso "... salvo." nunca aparece.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen, waitFor } from "@/testes/tela";

const loja = { id: "loja-a", nome: "Loja Teste", cidade: "Cidade Teste" };
const operador = { id: "op-1", nome: "Admin Teste", usuario: "admin", admin: true, ativo: true, permissoes: [] };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: loja }),
}));

const m = vi.hoisted(() => ({
  buscarConfiguracaoFiscal: vi.fn(),
  buscarTextoGarantia: vi.fn(),
  salvarConfiguracaoFiscal: vi.fn(),
  salvarTextoGarantia: vi.fn(),
}));

vi.mock("@/lib/configuracoes", async (original) => ({
  ...(await original<object>()),
  listarJurosParcelas: vi.fn().mockResolvedValue([]),
  buscarConfiguracaoPainelInicio: vi.fn().mockResolvedValue([]),
  buscarConfiguracaoPix: vi.fn().mockResolvedValue(null),
  buscarLinkAvaliacao: vi.fn().mockResolvedValue(null),
  buscarConfiguracaoFiscal: m.buscarConfiguracaoFiscal,
  buscarTextoGarantia: m.buscarTextoGarantia,
  salvarConfiguracaoFiscal: m.salvarConfiguracaoFiscal,
  salvarTextoGarantia: m.salvarTextoGarantia,
}));
vi.mock("@/lib/operadores", async (original) => ({
  ...(await original<object>()),
  listarOperadores: vi.fn().mockResolvedValue([operador]),
}));
vi.mock("@/lib/lojas", async (original) => ({
  ...(await original<object>()),
  listarLojas: vi.fn().mockResolvedValue([loja]),
  listarLojasDoOperador: vi.fn().mockResolvedValue([loja]),
}));
vi.mock("@/lib/depositos", async (original) => ({
  ...(await original<object>()),
  listarDepositos: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categorias", async (original) => ({
  ...(await original<object>()),
  listarCategorias: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categoriasCaixa", async (original) => ({
  ...(await original<object>()),
  listarCategoriasCaixa: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/categoriasServico", async (original) => ({
  ...(await original<object>()),
  listarCategoriasServico: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/modelosWhatsapp", async (original) => ({
  ...(await original<object>()),
  listarModelosWhatsapp: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/computadores", async (original) => ({
  ...(await original<object>()),
  listarComputadores: vi.fn().mockResolvedValue([]),
}));

const { ConfiguracoesPage } = await import("./ConfiguracoesPage");

// Banco de verdade demora: sem atraso real o React junta "carregando" e "pronto"
// num render só e a seção nunca chega a sumir, escondendo o defeito.
const comAtraso = <T,>(valor: T) => () => new Promise<T>((r) => setTimeout(() => r(valor), 40));

beforeEach(() => {
  vi.clearAllMocks();
  // Sem configuração fiscal e sem regime: o formulário não tem nada a validar.
  m.buscarConfiguracaoFiscal.mockImplementation(comAtraso(null));
  m.buscarTextoGarantia.mockImplementation(comAtraso("Texto antigo"));
  m.salvarConfiguracaoFiscal.mockResolvedValue(undefined);
  m.salvarTextoGarantia.mockResolvedValue(undefined);
});

describe("Configurações: salvar não pode fechar a seção nem esconder o aviso", () => {
  it("Dados fiscais: mostra 'Dados fiscais salvos.' e a seção continua aberta", async () => {
    const { user } = renderizar(<ConfiguracoesPage />);
    await user.click(await screen.findByText("Dados fiscais da loja"));
    await user.click(await screen.findByRole("button", { name: "Salvar dados fiscais" }));

    const aviso = await screen.findByText("Dados fiscais salvos.");
    const botao = screen.getByRole("button", { name: "Salvar dados fiscais" });
    // Perto do botão: o aviso e o botão Salvar ficam na mesma linha.
    expect(botao.parentElement).toBe(aviso.parentElement);
    expect(m.salvarConfiguracaoFiscal).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(m.buscarConfiguracaoFiscal).toHaveBeenCalledTimes(2));
  });

  it("Texto de garantia: mostra 'Texto de garantia salvo.' e o texto novo continua lá", async () => {
    const { user } = renderizar(<ConfiguracoesPage />);
    await user.click(await screen.findByText("Texto de garantia"));
    const caixa = await screen.findByDisplayValue("Texto antigo");
    await user.clear(caixa);
    await user.type(caixa, "Texto novo");
    m.buscarTextoGarantia.mockImplementation(comAtraso("Texto novo"));
    await user.click(screen.getByRole("button", { name: "Salvar texto" }));

    const aviso = await screen.findByText("Texto de garantia salvo.");
    expect(screen.getByRole("button", { name: "Salvar texto" }).parentElement).toBe(
      aviso.parentElement,
    );
    expect(screen.getByDisplayValue("Texto novo")).toBeInTheDocument();
    expect(m.salvarTextoGarantia).toHaveBeenCalledWith("loja-a", "Texto novo");
    await waitFor(() => expect(m.buscarTextoGarantia).toHaveBeenCalledTimes(2));

    // Fechar e abrir a seção: o texto que veio do recarregar continua lá.
    await user.click(screen.getByText("Texto de garantia"));
    expect(screen.queryByDisplayValue("Texto novo")).not.toBeInTheDocument();
    await user.click(screen.getByText("Texto de garantia"));
    expect(await screen.findByDisplayValue("Texto novo")).toBeInTheDocument();
  });
});

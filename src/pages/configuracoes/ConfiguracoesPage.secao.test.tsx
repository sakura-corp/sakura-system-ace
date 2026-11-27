// @vitest-environment jsdom
/**
 * #388: o "Classificar" do DRE leva a `/configuracoes?secao=categorias-caixa`; a
 * seção "Categorias de caixa" já tem de chegar aberta (e as outras, fechadas).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { screen } from "@/testes/tela";

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
  listarTaxasMaquininha: vi.fn(),
  salvarTaxasMaquininha: vi.fn(),
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
vi.mock("@/lib/taxasMaquininha", async (original) => ({
  ...(await original<object>()),
  listarTaxasMaquininha: m.listarTaxasMaquininha,
  salvarTaxasMaquininha: m.salvarTaxasMaquininha,
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

function naRota(endereco: string) {
  return render(
    <MemoryRouter initialEntries={[endereco]}>
      <ConfiguracoesPage />
    </MemoryRouter>,
  );
}

const TITULO = "Categorias de caixa (Entradas e Saídas)";

beforeEach(() => {
  vi.clearAllMocks();
  m.buscarConfiguracaoFiscal.mockResolvedValue(null);
  m.buscarTextoGarantia.mockResolvedValue("");
  m.listarTaxasMaquininha.mockResolvedValue([]);
});

describe("Configurações: ?secao=categorias-caixa", () => {
  it("abre a seção das categorias de caixa e deixa as outras fechadas", async () => {
    naRota("/configuracoes?secao=categorias-caixa");
    const botao = await screen.findByRole("button", { name: new RegExp(TITULO.replace(/[()]/g, "\\$&")) });
    expect(botao).toHaveAttribute("aria-expanded", "true");
    const outra = screen.getByRole("button", { name: /^Texto de garantia/ });
    expect(outra).toHaveAttribute("aria-expanded", "false");
  });

  it("sem o parâmetro, a seção continua fechada", async () => {
    naRota("/configuracoes");
    const botao = await screen.findByRole("button", { name: new RegExp(TITULO.replace(/[()]/g, "\\$&")) });
    expect(botao).toHaveAttribute("aria-expanded", "false");
  });

  it("rola até a seção quando o navegador sabe rolar", async () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    naRota("/configuracoes?secao=categorias-caixa");
    await screen.findByRole("button", { name: new RegExp(TITULO.replace(/[()]/g, "\\$&")) });
    expect(rolar).toHaveBeenCalled();
    // @ts-expect-error limpeza do que o teste pôs no jsdom
    delete Element.prototype.scrollIntoView;
  });
});

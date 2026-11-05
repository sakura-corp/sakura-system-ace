// @vitest-environment jsdom
/**
 * Teste de TELA: a ligação entre a tela de Estoque e o "Juntar peças
 * repetidas" (#721). A janela usa o catálogo que a tela carrega; achado da
 * revisão: ela não pode dizer "está tudo certo" quando a pessoa não tem loja,
 * nem travar porque OUTRA lista da tela (depósitos, configuração) falhou.
 *
 * As seções da tela (Produtos, Movimentações...) são trocadas por nada: aqui
 * só importa o catálogo que chega na janela.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Peca } from "@/types/peca";

const auth = vi.hoisted(() => ({ lojaAtual: { id: "l1", nome: "Matriz" } as { id: string; nome: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ lojaAtual: auth.lojaAtual, operador: { id: "op", admin: true } }),
}));
vi.mock("@/lib/pecas", () => ({
  listarPecas: vi.fn(),
  resumoPecaParaJuntar: vi.fn(),
  juntarPecas: vi.fn(),
  buscarPecasPorIds: vi.fn(),
}));
vi.mock("@/lib/estoque", () => ({
  listarMovimentos: vi.fn(),
  calcularSaldoPorPeca: () => new Map(),
  calcularSaldoPorPecaEDeposito: () => new Map(),
}));
vi.mock("@/lib/categorias", () => ({ listarCategorias: vi.fn() }));
vi.mock("@/lib/depositos", () => ({ listarDepositos: vi.fn() }));
vi.mock("@/lib/configuracoes", () => ({ buscarConfiguracaoFiscal: vi.fn() }));
vi.mock("./ProdutosSection", () => ({ ProdutosSection: () => null }));
vi.mock("./MovimentacoesSection", () => ({ MovimentacoesSection: () => null }));
vi.mock("./ContagemSection", () => ({ ContagemSection: () => null }));
vi.mock("./RelatoriosEstoqueSection", () => ({ RelatoriosEstoqueSection: () => null }));
vi.mock("@/components/BotaoVoltar", () => ({ BotaoVoltar: () => null }));

import { listarPecas } from "@/lib/pecas";
import { listarMovimentos } from "@/lib/estoque";
import { listarCategorias } from "@/lib/categorias";
import { listarDepositos } from "@/lib/depositos";
import { buscarConfiguracaoFiscal } from "@/lib/configuracoes";
import { EstoquePage } from "./EstoquePage";

const peca = (id: string, criado_em: string) =>
  ({ id, descricao: "Pneu 175/70 R13", codigo_barras: "789", codigo_interno: null, medida: null, ativo: true, criado_em }) as unknown as Peca;

beforeEach(() => {
  vi.clearAllMocks();
  auth.lojaAtual = { id: "l1", nome: "Matriz" };
  vi.mocked(listarPecas).mockResolvedValue([peca("a", "2026-01-01T00:00:00Z"), peca("b", "2026-02-01T00:00:00Z")]);
  vi.mocked(listarMovimentos).mockResolvedValue([]);
  vi.mocked(listarCategorias).mockResolvedValue([]);
  vi.mocked(listarDepositos).mockResolvedValue([]);
  vi.mocked(buscarConfiguracaoFiscal).mockResolvedValue(null);
});

async function abrirJanela() {
  const r = renderizar(<EstoquePage />);
  await r.user.click(await screen.findByRole("button", { name: "Juntar peças repetidas" }));
  return r;
}

describe("EstoquePage — o catálogo que chega no Juntar peças (#721)", () => {
  it("com tudo carregado, a janela acha o par", async () => {
    await abrirJanela();
    expect(await screen.findByText("Motivo: mesmo código de barras")).toBeInTheDocument();
  });

  it("outra lista da tela falhou (depósitos), mas o catálogo veio: a janela funciona", async () => {
    vi.mocked(listarDepositos).mockRejectedValue(new Error("sem permissão nos depósitos"));
    await abrirJanela();
    expect(await screen.findByText("Motivo: mesmo código de barras")).toBeInTheDocument();
  });

  it("sem loja atribuída, a janela ainda procura no catálogo (não diz 'tudo certo')", async () => {
    auth.lojaAtual = null;
    await abrirJanela();
    expect(await screen.findByText("Motivo: mesmo código de barras")).toBeInTheDocument();
    expect(screen.queryByText(/Está tudo certo/)).not.toBeInTheDocument();
  });

  it("o catálogo falhou: a janela diz isso, não 'tudo certo'", async () => {
    vi.mocked(listarPecas).mockRejectedValue(new Error("sem internet"));
    await abrirJanela();
    expect(await screen.findByText(/Não consegui carregar as peças: .*sem internet/)).toBeInTheDocument();
    expect(screen.queryByText(/Está tudo certo/)).not.toBeInTheDocument();
  });
});

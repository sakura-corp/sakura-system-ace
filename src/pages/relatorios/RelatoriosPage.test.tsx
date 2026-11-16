// @vitest-environment jsdom
/**
 * #389: a costura da aba "Fluxo de caixa" na página de Relações.
 *
 * A conta está em schemas/fluxoProjetado.test.ts e o desenho da aba em
 * FluxoProjetadoSection.test.tsx. O que só a página prova:
 * - as contas só são buscadas pra quem tem o módulo (o banco devolveria a
 *   lista vazia, calada, e a aba mostraria R$ 0,00 como se fosse verdade);
 * - um erro ao buscar as contas não apaga Gráficos e Lucratividade, e não
 *   aparece como "Sem acesso" pra quem tem o acesso.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { Operador } from "@/types/operador";

const listarContasPagar = vi.fn();
const listarContasReceber = vi.fn();
const listarMovimentosCaixa = vi.fn();

vi.mock("@/lib/contasPagar", async (original) => ({
  ...(await original<typeof import("@/lib/contasPagar")>()),
  listarContasPagar: (...a: unknown[]) => listarContasPagar(...a),
}));
vi.mock("@/lib/contasReceber", () => ({
  listarContasReceber: (...a: unknown[]) => listarContasReceber(...a),
}));
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixa: (...a: unknown[]) => listarMovimentosCaixa(...a),
}));
vi.mock("@/lib/ordensServico", () => ({ listarOrdens: async () => [] }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const LOJA = { id: "loja-a", nome: "Loja Centro", cidade: null, uf: null, ativo: true, criado_em: "" };
let operador: Partial<Operador> = { id: "op", admin: true, permissoes: [] };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: LOJA, lojasDisponiveis: [LOJA] }),
}));

const { RelatoriosPage } = await import("./RelatoriosPage");

beforeEach(() => {
  listarContasPagar.mockReset().mockResolvedValue([]);
  listarContasReceber.mockReset().mockResolvedValue([]);
  listarMovimentosCaixa.mockReset().mockResolvedValue([]);
});

async function abrirFluxo() {
  const { user: usuario } = renderizar(<RelatoriosPage />);
  await usuario.click(await screen.findByRole("button", { name: "Fluxo de caixa" }));
}

describe("RelatoriosPage — aba Fluxo de caixa (#389)", () => {
  it("só com Relações: não busca as contas e mostra os dois 'Sem acesso'", async () => {
    operador = { id: "op", admin: false, permissoes: ["relatorios"] };
    await abrirFluxo();

    expect(await screen.findByText("Sem acesso a Contas a Pagar")).toBeInTheDocument();
    expect(screen.getByText("Sem acesso a Contas a Receber")).toBeInTheDocument();
    expect(listarContasPagar).not.toHaveBeenCalled();
    expect(listarContasReceber).not.toHaveBeenCalled();
  });

  it("com Relações e Contas a Pagar: busca só as contas a pagar", async () => {
    operador = { id: "op", admin: false, permissoes: ["relatorios", "contas_pagar"] };
    await abrirFluxo();

    expect(await screen.findByText("Sem acesso a Contas a Receber")).toBeInTheDocument();
    expect(screen.queryByText("Sem acesso a Contas a Pagar")).not.toBeInTheDocument();
    expect(listarContasPagar).toHaveBeenCalledWith("loja-a");
    expect(listarContasReceber).not.toHaveBeenCalled();
  });

  it("erro ao buscar as contas: diz que não carregou, sem 'Sem acesso', e os Gráficos seguem com os dados", async () => {
    operador = { id: "op", admin: true, permissoes: [] };
    listarContasPagar.mockRejectedValue(new Error("caiu a internet"));
    const { user: usuario } = renderizar(<RelatoriosPage />);

    // Gráficos: os movimentos carregaram mesmo com as contas falhando.
    await screen.findByRole("button", { name: "Fluxo de caixa" });
    expect(listarMovimentosCaixa).toHaveBeenCalled();
    expect(screen.queryByText("caiu a internet")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Fluxo de caixa" }));
    expect(await screen.findByText(/Não deu pra carregar as contas/)).toBeInTheDocument();
    expect(screen.getByText(/caiu a internet/)).toBeInTheDocument();
    expect(screen.queryByText(/Sem acesso/)).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
/**
 * Migration 0068: o cadastro de clientes só responde a quem tem o módulo
 * Clientes. O Início usa o cadastro só pros aniversários do calendário, então
 * quem não tem o módulo nem pergunta (e o calendário fica sem aniversários).
 */
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@/testes/tela";
import type { Operador } from "@/types/operador";

const listarClientes = vi.fn();
vi.mock("@/lib/clientes", () => ({ listarClientes: (...a: unknown[]) => listarClientes(...a) }));
const listarOrdens = vi.fn();
vi.mock("@/lib/ordensServico", () => ({ listarOrdens: (...a: unknown[]) => listarOrdens(...a) }));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock("@/lib/caixa", () => ({ listarMovimentosCaixa: async () => [] }));
vi.mock("@/lib/contasPagar", () => ({ listarContasPagar: async () => [] }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => null,
  buscarConfiguracaoPainelInicio: async () => ["vendas_mes"],
  confirmarAliquotaCompetencia: vi.fn(),
}));

let operador: Partial<Operador> = {};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual: { id: "loja-a", nome: "Loja Centro" } }),
}));

const { PainelPage } = await import("./PainelPage");

function montar() {
  return render(
    <MemoryRouter>
      <PainelPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listarClientes.mockReset();
  listarClientes.mockResolvedValue([]);
  listarOrdens.mockReset();
  listarOrdens.mockResolvedValue([]);
});

describe("PainelPage — permissão pro cadastro de clientes", () => {
  it("NÃO chama listarClientes pra quem não tem o módulo Clientes", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    montar();
    await waitFor(() => expect(listarOrdens).toHaveBeenCalled());
    await screen.findByText(/Início|Painel|Calendário/i);
    expect(listarClientes).not.toHaveBeenCalled();
  });

  it("chama listarClientes pra quem tem o módulo Clientes", async () => {
    operador = { id: "op", admin: false, permissoes: ["clientes"] };
    montar();
    await waitFor(() => expect(listarClientes).toHaveBeenCalledTimes(1));
  });
});

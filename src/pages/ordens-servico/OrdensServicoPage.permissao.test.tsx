// @vitest-environment jsdom
/**
 * Migrations 0068 e 0069: quem tem OS mas não tem o módulo Clientes escolhe o cliente
 * pela janela estreita. A tela tem que dizer isso à camada de dados.
 */
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Operador } from "@/types/operador";

const listarClientesParaEscolha = vi.fn();
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: (...a: unknown[]) => listarClientesParaEscolha(...a),
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/ordensServico", () => ({
  listarOrdens: async () => [],
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
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({ listarJurosParcelas: async () => [] }));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens: async () => [] }));
vi.mock("@/lib/estoque", () => ({
  listarSaldos: async () => new Map(),
}));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  textoDoModelo: () => "",
  registrarMensagemAberta: vi.fn(),
}));

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

beforeEach(() => {
  localStorage.clear();
  listarClientesParaEscolha.mockReset();
  listarClientesParaEscolha.mockResolvedValue([]);
});

describe("OrdensServicoPage — permissão pro cadastro de clientes", () => {
  it("pede a lista pela janela estreita (false) a quem não tem o módulo Clientes", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico"] };
    montar();
    await waitFor(() => expect(listarClientesParaEscolha).toHaveBeenCalledWith(false));
    expect(listarClientesParaEscolha).not.toHaveBeenCalledWith(true);
  });

  it("pede o cadastro completo (true) a quem tem o módulo Clientes", async () => {
    operador = { id: "op", admin: false, permissoes: ["ordens_servico", "clientes"] };
    montar();
    await waitFor(() => expect(listarClientesParaEscolha).toHaveBeenCalledWith(true));
  });
});

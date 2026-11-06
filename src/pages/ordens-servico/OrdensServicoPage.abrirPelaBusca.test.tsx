// @vitest-environment jsdom
/**
 * PR #857 (busca geral): abrir uma OS pela busca (Ctrl+K) estando JÁ na tela
 * de OS. A tela só lia o pedido "abra esta OS" quando carregava; com ela já
 * aberta, a busca navegava pra mesma tela e nada abria.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { OrdemServico } from "@/types/os";
import userEvent from "@testing-library/user-event";

const listarOrdens = vi.fn();
const buscarCustoDasOrdens = vi.fn();
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
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/caixa", () => ({
  buscarCustoDasOrdens: (...a: unknown[]) => buscarCustoDasOrdens(...a),
}));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({ listarJurosParcelas: async () => [] }));
vi.mock("@/lib/notasFiscais", () => ({ listarArquivosDasOrdens: async () => [] }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  textoDoModelo: () => "",
  registrarMensagemAberta: vi.fn(),
}));
const lojaAtual = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true, permissoes: [] }, lojaAtual }),
}));

const { OrdensServicoPage } = await import("./OrdensServicoPage");

function ordem(id: string, nome: string) {
  return {
    id,
    numero: 7,
    loja_id: "loja-a",
    cliente_id: "c1",
    veiculo_id: null,
    data_abertura: `${hojeLocal()}T15:00:00.000Z`,
    status: "em_andamento",
    cliente: { nome },
    itens: [],
  } as unknown as OrdemServico;
}

// Faz o papel da busca: navega pra tela de OS pedindo pra abrir uma.
function BuscaDeMentira() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/ordens-servico", { state: { abrirOrdemId: "os-x" } })}>
      busca
    </button>
  );
}

describe("OrdensServicoPage — abrir pela busca com a tela já aberta (PR #857)", () => {
  it("abre a OS pedida sem precisar sair e voltar da tela", async () => {
    listarOrdens.mockResolvedValue([ordem("os-x", "Cliente Buscado")]);
    buscarCustoDasOrdens.mockResolvedValue(new Map());
    render(
      <MemoryRouter initialEntries={["/ordens-servico"]}>
        <BuscaDeMentira />
        <OrdensServicoPage />
      </MemoryRouter>,
    );
    // A lista carregou, nenhuma OS aberta.
    expect(await screen.findByText("Cliente Buscado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cliente Buscado" })).not.toBeInTheDocument();

    await userEvent.click(within(document.body).getByRole("button", { name: "busca" }));

    expect(await screen.findByRole("heading", { name: "Cliente Buscado" })).toBeInTheDocument();
  });
});

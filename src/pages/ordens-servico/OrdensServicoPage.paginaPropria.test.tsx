// @vitest-environment jsdom
/**
 * Visual novo (#1087, item 5): a OS e a venda de balcão abrem em página
 * própria. Enquanto uma está aberta a lista some da tela; o Voltar traz a
 * lista de volta no mesmo lugar (busca e rolagem).
 */
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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


// A busca só existe na lista (o formulário também diz o nome do cliente).
const linhaDaLista = () => screen.queryByRole("searchbox", { name: /buscar por cliente/i });

function montar() {
  listarOrdens.mockResolvedValue([ordem("os-x", "Cliente Buscado")]);
  buscarCustoDasOrdens.mockResolvedValue(new Map());
  return render(
    <MemoryRouter initialEntries={["/ordens-servico"]}>
      <div data-testid="area" style={{ overflowY: "auto" }}>
        <OrdensServicoPage />
      </div>
    </MemoryRouter>,
  );
}

describe("OrdensServicoPage — a OS abre em página própria (#1087)", () => {
  it("esconde a lista e o cabeçalho enquanto a OS está aberta, e o Voltar traz a lista com a mesma busca", async () => {
    montar();
    expect(await screen.findByText("Cliente Buscado")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox", { name: /buscar por cliente/i }), "Buscado");

    await userEvent.click(screen.getByText("Cliente Buscado"));
    expect(await screen.findByRole("heading", { name: "Cliente Buscado" })).toBeInTheDocument();
    expect(linhaDaLista()).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ordens de Serviço" })).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: /buscar por cliente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /voltar/i })[0]);
    expect(await screen.findByText("Cliente Buscado")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ordens de Serviço" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /buscar por cliente/i })).toHaveValue("Buscado");
  });

  it("a venda de balcão também abre sem a lista embaixo", async () => {
    montar();
    expect(await screen.findByText("Cliente Buscado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Venda de balcão" }));
    expect(linhaDaLista()).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /voltar/i })[0]);
    expect(await screen.findByText("Cliente Buscado")).toBeInTheDocument();
  });

  it("devolve a rolagem da área que rola e abre no topo", async () => {
    montar();
    expect(await screen.findByText("Cliente Buscado")).toBeInTheDocument();
    const area = screen.getByTestId("area");
    area.scrollTop = 340;
    fireEvent.scroll(area);

    await userEvent.click(screen.getByText("Cliente Buscado"));
    await screen.findByRole("heading", { name: "Cliente Buscado" });
    expect(area.scrollTop).toBe(0);

    await userEvent.click(screen.getAllByRole("button", { name: /voltar/i })[0]);
    await screen.findByText("Cliente Buscado");
    expect(area.scrollTop).toBe(340);
  });
});

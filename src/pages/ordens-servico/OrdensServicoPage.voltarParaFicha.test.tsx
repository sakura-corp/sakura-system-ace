// @vitest-environment jsdom
/**
 * #393: a OS aberta pela ficha do cliente (ou do veículo) volta pra ficha no
 * Voltar. Quem pede é a ficha, mandando `voltarAoFechar` junto do
 * `abrirOrdemId`; a OS aberta pela própria lista continua voltando pra lista.
 */
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@/testes/tela";
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
vi.mock("@/lib/configuracoes", () => ({
  listarJurosParcelas: async () => [],
  buscarLinkAvaliacao: async () => null,
  buscarTextoGarantia: async () => null,
}));
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

function ordem(id: string, nome: string, tipo: "os" | "venda_balcao" = "os") {
  return {
    id,
    numero: 7,
    tipo,
    loja_id: "loja-a",
    cliente_id: "c1",
    veiculo_id: null,
    data_abertura: `${hojeLocal()}T15:00:00.000Z`,
    status: tipo === "os" ? "em_andamento" : "faturada",
    cliente: { nome },
    itens: [],
  } as unknown as OrdemServico;
}

// Faz o papel da ficha: abre a OS pedindo (ou não) pra voltar no Voltar.
function FichaDeMentira({ voltarAoFechar, id }: { voltarAoFechar: boolean; id: string }) {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Ficha de mentira</h1>
      <button
        type="button"
        onClick={() =>
          navigate("/ordens-servico", {
            state: voltarAoFechar ? { abrirOrdemId: id, voltarAoFechar: true } : { abrirOrdemId: id },
          })
        }
      >
        abrir
      </button>
    </div>
  );
}

function montar(voltarAoFechar: boolean, id = "os-x") {
  render(
    <MemoryRouter initialEntries={["/ficha"]}>
      <Routes>
        <Route path="/ficha" element={<FichaDeMentira voltarAoFechar={voltarAoFechar} id={id} />} />
        <Route path="/ordens-servico" element={<OrdensServicoPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OrdensServicoPage — o Voltar da OS aberta pela ficha (#393)", () => {
  it("pela ficha: o Voltar da OS volta pra ficha", async () => {
    listarOrdens.mockResolvedValue([ordem("os-x", "Cliente da Ficha")]);
    buscarCustoDasOrdens.mockResolvedValue(new Map());
    montar(true);

    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    expect(await screen.findByRole("heading", { name: "Cliente da Ficha" })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Voltar" })[0]);
    expect(await screen.findByRole("heading", { name: "Ficha de mentira" })).toBeInTheDocument();
  });

  it("pela ficha, numa venda de balcão: o Voltar também volta pra ficha", async () => {
    listarOrdens.mockResolvedValue([ordem("venda-x", "Cliente da Venda", "venda_balcao")]);
    buscarCustoDasOrdens.mockResolvedValue(new Map());
    montar(true, "venda-x");

    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    await screen.findAllByText(/Cliente da Venda/);
    await userEvent.click(screen.getAllByRole("button", { name: "Voltar" })[0]);
    expect(await screen.findByRole("heading", { name: "Ficha de mentira" })).toBeInTheDocument();
  });

  it("sem o pedido (Início, busca, Contas a Receber): o Voltar fecha a OS e fica na lista", async () => {
    listarOrdens.mockResolvedValue([ordem("os-x", "Cliente da Lista")]);
    buscarCustoDasOrdens.mockResolvedValue(new Map());
    montar(false);

    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    expect(await screen.findByRole("heading", { name: "Cliente da Lista" })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Voltar" })[0]);
    expect(screen.queryByRole("heading", { name: "Ficha de mentira" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cliente da Lista" })).not.toBeInTheDocument();
    // continua na lista de OS
    expect(await screen.findByText("Cliente da Lista")).toBeInTheDocument();
  });
});

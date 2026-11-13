// @vitest-environment jsdom
/**
 * #927: trocar de loja com a carga anterior ainda buscando. Só a carga mais
 * nova mexe na tela; e se a carga da loja nova der erro, a tela mostra só o
 * erro, nunca os orçamentos da loja anterior.
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { OrdemServico } from "@/types/os";

const listarOrcamentos = vi.fn();
vi.mock("@/lib/ordensServico", () => ({
  listarOrcamentos: (...a: unknown[]) => listarOrcamentos(...a),
  listarOrdens: async () => [],
  listarOrdensDoVeiculo: async () => [],
  aprovarOrcamento: vi.fn(),
  recusarOrcamento: vi.fn(),
  criarOrcamento: vi.fn(),
  atualizarOrdem: vi.fn(),
  adicionarItensOrdem: vi.fn(),
  editarItemOrdem: vi.fn(),
  cadastrarPecaDoItem: vi.fn(),
  AprovadoSemEstoqueError: class extends Error {},
}));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/clientes", () => ({
  listarClientesParaEscolha: async () => [],
  cadastrarClienteRapido: vi.fn(),
  cadastrarVeiculoRapido: vi.fn(),
}));
vi.mock("@/lib/pecas", () => ({ listarPecasJanela: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/funcionarios", () => ({ listarFuncionariosPublico: async () => [] }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/modelosWhatsapp", () => ({
  listarModelosWhatsapp: async () => ({}),
  textoDoModelo: () => "",
  registrarMensagemAberta: vi.fn(),
}));
const operador = { id: "op", admin: true, permissoes: [] };
let lojaAtual = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual }),
}));

const { OrcamentosPage } = await import("./OrcamentosPage");

function orcamento(id: string, nome: string) {
  return {
    id,
    numero: null,
    numero_orcamento: 1,
    validade: "2099-01-01",
    loja_id: "x",
    cliente_id: "c1",
    veiculo_id: null,
    status: "orcamento",
    data_abertura: "2026-10-20T15:00:00.000Z",
    cliente: { nome },
    veiculo: null,
    itens: [
      { id: `i-${id}`, tipo: "servico", descricao: "Alinhamento", quantidade: 1, preco_unitario: 100, desconto: 0 },
    ],
  } as unknown as OrdemServico;
}

function adiada<T>() {
  let resolver!: (v: T) => void;
  const promessa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promessa, resolver };
}

beforeEach(() => {
  lojaAtual = { id: "loja-a", nome: "Loja A" };
  listarOrcamentos.mockReset();
});

describe("OrcamentosPage — troca de loja (#927)", () => {
  it("a carga da loja antiga que chega depois não sobrescreve a da nova", async () => {
    const cargaA = adiada<OrdemServico[]>();
    listarOrcamentos.mockImplementation((loja: string) =>
      loja === "loja-a" ? cargaA.promessa : Promise.resolve([orcamento("b", "Cliente da loja B")]),
    );
    const { rerender } = renderizar(<OrcamentosPage />);

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<OrcamentosPage />);
    expect(await screen.findByText("Cliente da loja B")).toBeInTheDocument();

    await act(async () => {
      cargaA.resolver([orcamento("a", "Cliente da loja A")]);
      await cargaA.promessa;
    });

    expect(screen.getByText("Cliente da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Cliente da loja A")).not.toBeInTheDocument();
  });

  it("a carga da loja nova dá erro: mostra o erro e não os orçamentos da loja anterior", async () => {
    listarOrcamentos.mockImplementation((loja: string) =>
      loja === "loja-a"
        ? Promise.resolve([orcamento("a", "Cliente da loja A")])
        : Promise.reject(new Error("caiu a conexão")),
    );
    const { rerender } = renderizar(<OrcamentosPage />);
    expect(await screen.findByText("Cliente da loja A")).toBeInTheDocument();

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<OrcamentosPage />);

    expect(await screen.findByText(/caiu a conexão/)).toBeInTheDocument();
    expect(screen.queryByText("Cliente da loja A")).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
/**
 * #927: trocar de loja com a carga anterior ainda buscando. Só a carga mais
 * nova mexe na tela; e se a carga da loja nova der erro, a tela mostra só o
 * erro, nunca os dados da loja anterior.
 */
import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { OrdemServico } from "@/types/os";

const listarOrdens = vi.fn();
vi.mock("@/lib/ordensServico", () => ({ listarOrdens: (...a: unknown[]) => listarOrdens(...a) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/clientes", () => ({ listarClientes: async () => [] }));
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixa: async () => [],
  buscarCustoDasOrdens: async () => new Map(),
}));
vi.mock("@/lib/contasPagar", () => ({ listarContasPagar: async () => [] }));
vi.mock("@/lib/fechamentoCaixa", () => ({ listarFechamentosCaixa: async () => [] }));
vi.mock("@/lib/whatsapp", () => ({ abrirWhatsappSemNumero: vi.fn(), abrirConversaWhatsapp: vi.fn() }));
vi.mock("@/lib/modelosWhatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/modelosWhatsapp")>()),
  listarModelosWhatsapp: async () => ({}),
  registrarMensagemAberta: vi.fn(),
}));
vi.mock("@/lib/notasFiscais", () => ({ listarNotasComErro: async () => [] }));
vi.mock("@/lib/contasReceber", () => ({ listarContasReceber: async () => [] }));
vi.mock("@/lib/estoque", () => ({ listarSaldos: async () => new Map() }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/configuracoes", () => ({
  buscarConfiguracaoFiscal: async () => null,
  buscarConfiguracaoPainelInicio: async () => ["vendas_mes"],
  confirmarAliquotaCompetencia: vi.fn(),
}));

const operador = { id: "op", admin: true, permissoes: [] };
let lojaAtual = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual }),
}));

const { PainelPage } = await import("./PainelPage");

function ordem(id: string, nome: string) {
  return {
    id,
    numero: 1,
    cliente_id: "c1",
    veiculo_id: null,
    data_abertura: `${hojeLocal()}T15:00:00.000Z`,
    status: "em_andamento",
    cliente: { nome },
    itens: [],
  } as unknown as OrdemServico;
}

function adiada<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: Error) => void;
  const promessa = new Promise<T>((r, f) => {
    resolver = r;
    rejeitar = f;
  });
  return { promessa, resolver, rejeitar };
}

function montar() {
  const tela = render(
    <MemoryRouter>
      <PainelPage />
    </MemoryRouter>,
  );
  return () =>
    tela.rerender(
      <MemoryRouter>
        <PainelPage />
      </MemoryRouter>,
    );
}

beforeEach(() => {
  lojaAtual = { id: "loja-a", nome: "Loja A" };
  listarOrdens.mockReset();
});

describe("PainelPage — troca de loja (#927)", () => {
  it("a carga da loja antiga que chega depois não sobrescreve a da nova", async () => {
    const cargaA = adiada<OrdemServico[]>();
    listarOrdens.mockImplementation((loja: string) =>
      loja === "loja-a" ? cargaA.promessa : Promise.resolve([ordem("b", "Cliente da loja B")]),
    );
    const rerender = montar();

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender();
    expect((await screen.findAllByText("Cliente da loja B")).length).toBeGreaterThan(0);

    await act(async () => {
      cargaA.resolver([ordem("a", "Cliente da loja A")]);
      await cargaA.promessa;
    });

    expect(screen.queryByText("Cliente da loja A")).not.toBeInTheDocument();
    expect(screen.getAllByText("Cliente da loja B").length).toBeGreaterThan(0);
  });

  it("a carga da loja nova dá erro: mostra o erro e não os dados da loja anterior", async () => {
    listarOrdens.mockImplementation((loja: string) =>
      loja === "loja-a"
        ? Promise.resolve([ordem("a", "Cliente da loja A")])
        : Promise.reject(new Error("caiu a conexão")),
    );
    const rerender = montar();
    expect((await screen.findAllByText("Cliente da loja A")).length).toBeGreaterThan(0);

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender();

    expect(await screen.findByText(/caiu a conexão/)).toBeInTheDocument();
    expect(screen.queryByText("Cliente da loja A")).not.toBeInTheDocument();
  });
});

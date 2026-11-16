// @vitest-environment jsdom
/**
 * #927: trocar de loja com a carga anterior ainda buscando. Só a carga mais
 * nova mexe na tela; e se a carga da loja nova der erro, a tela mostra só o
 * erro, nunca os dados da loja anterior.
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import { hojeLocal } from "@/lib/datas";
import type { OrdemServico } from "@/types/os";

const listarOrdens = vi.fn();
vi.mock("@/lib/ordensServico", () => ({ listarOrdens: (...a: unknown[]) => listarOrdens(...a) }));
vi.mock("@/lib/caixa", () => ({ listarMovimentosCaixa: async () => [] }));
vi.mock("@/lib/contasPagar", () => ({ listarContasPagar: async () => [] }));
vi.mock("@/lib/contasReceber", () => ({ listarContasReceber: async () => [] }));
vi.mock("@/lib/pecas", () => ({ listarPecas: async () => [] }));
vi.mock("@/lib/servicos", () => ({ listarServicos: async () => [] }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const operador = { id: "op", admin: true, permissoes: [] };
let lojaAtual = { id: "loja-a", nome: "Loja A" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador, lojaAtual, lojasDisponiveis: [lojaAtual] }),
}));

const { RelatoriosPage } = await import("./RelatoriosPage");

function ordem(id: string, nomeCliente: string) {
  return {
    id,
    numero: 1,
    loja_id: "x",
    cliente_id: `cli-${id}`,
    veiculo_id: null,
    status: "faturada",
    data_abertura: `${hojeLocal()}T12:00:00`,
    cliente: { nome: nomeCliente },
    itens: [
      {
        id: `i-${id}`,
        tipo: "peca",
        peca_id: null,
        servico_id: null,
        descricao: "Palheta",
        quantidade: 1,
        preco_unitario: 100,
        desconto: 0,
        custo_unitario: 30,
      },
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
  listarOrdens.mockReset();
});

describe("RelatoriosPage — troca de loja (#927)", () => {
  it("a carga da loja antiga que chega depois não sobrescreve a da nova", async () => {
    const cargaA = adiada<OrdemServico[]>();
    listarOrdens.mockImplementation((loja: string) =>
      loja === "loja-a" ? cargaA.promessa : Promise.resolve([ordem("b", "Cliente da loja B")]),
    );
    const { user, rerender } = renderizar(<RelatoriosPage />);

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<RelatoriosPage />);

    await user.click(await screen.findByRole("button", { name: "Curva ABC" }));
    expect(await screen.findByText("Cliente da loja B")).toBeInTheDocument();

    await act(async () => {
      cargaA.resolver([ordem("a", "Cliente da loja A")]);
      await cargaA.promessa;
    });

    expect(screen.getByText("Cliente da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Cliente da loja A")).not.toBeInTheDocument();
  });

  it("a carga da loja nova dá erro: mostra o erro e não os dados da loja anterior", async () => {
    listarOrdens.mockImplementation((loja: string) =>
      loja === "loja-a"
        ? Promise.resolve([ordem("a", "Cliente da loja A")])
        : Promise.reject(new Error("caiu a conexão")),
    );
    const { user, rerender } = renderizar(<RelatoriosPage />);
    await user.click(await screen.findByRole("button", { name: "Curva ABC" }));
    expect(await screen.findByText("Cliente da loja A")).toBeInTheDocument();

    lojaAtual = { id: "loja-b", nome: "Loja B" };
    rerender(<RelatoriosPage />);

    expect(await screen.findByText(/caiu a conexão/)).toBeInTheDocument();
    expect(screen.queryByText("Cliente da loja A")).not.toBeInTheDocument();
  });
});

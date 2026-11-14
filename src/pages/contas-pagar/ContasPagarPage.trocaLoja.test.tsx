// @vitest-environment jsdom
/**
 * #927: trocar de loja enquanto a carga anterior ainda busca. Só a carga mais
 * nova mexe na tela, e se a carga da loja nova der erro a tela não mostra as
 * contas da loja anterior.
 */
import type { ReactElement } from "react";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { ContaPagar } from "@/types/contaPagar";

const lojaA = { id: "loja-a", nome: "Loja A" };
const lojaB = { id: "loja-b", nome: "Loja B" };
const auth = vi.hoisted(() => ({ lojaAtual: null as unknown }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true, permissoes: [] }, lojaAtual: auth.lojaAtual }),
}));

const listarContasPagar = vi.hoisted(() => vi.fn());
vi.mock("@/lib/contasPagar", () => ({
  listarContasPagar,
  criarContaPagar: vi.fn(),
  desfazerPagamento: vi.fn(),
  excluirContaPagar: vi.fn(),
  pagarConta: vi.fn(),
}));
vi.mock("@/lib/categoriasCaixa", () => ({ listarCategoriasCaixa: async () => [] }));

const { ContasPagarPage } = await import("./ContasPagarPage");

function adiada<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

function conta(id: string, lojaId: string, descricao: string): ContaPagar {
  return {
    id, loja_id: lojaId, descricao, valor: 100, vencimento: "2099-01-01", categoria_id: null,
    recorrente: false, recorrente_ate: null, status: "pendente", data_pagamento: null,
    caixa_movimento_id: null, operador_id: null, criado_em: "2026-01-01T00:00:00Z",
  };
}

function respostas() {
  const a = adiada<ContaPagar[]>();
  const b = adiada<ContaPagar[]>();
  listarContasPagar.mockImplementation((loja: string) => (loja === "loja-a" ? a.promessa : b.promessa));
  return { a, b };
}

async function trocarPraB(rerender: (ui: ReactElement) => void) {
  auth.lojaAtual = lojaB;
  rerender(<ContasPagarPage />);
  await vi.waitFor(() => expect(listarContasPagar).toHaveBeenCalledWith("loja-b"));
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.lojaAtual = lojaA;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Contas a Pagar: troca de loja no meio da carga (#927)", () => {
  it("a loja A chega depois da B: a tela fica com as contas da B", async () => {
    const { a, b } = respostas();
    const { rerender } = renderizar(<ContasPagarPage />);
    await vi.waitFor(() => expect(listarContasPagar).toHaveBeenCalledWith("loja-a"));
    await trocarPraB(rerender);

    await act(async () => b.resolver([conta("b", "loja-b", "Conta da loja B")]));
    expect(await screen.findByText("Conta da loja B")).toBeInTheDocument();

    await act(async () => {
      a.resolver([conta("a", "loja-a", "Conta da loja A")]);
      await a.promessa;
    });
    expect(screen.getByText("Conta da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Conta da loja A")).not.toBeInTheDocument();
  });

  it("a loja A carregou e a carga da B dá erro: aparece o erro e não as contas da A", async () => {
    const { a, b } = respostas();
    const { rerender } = renderizar(<ContasPagarPage />);
    await act(async () => a.resolver([conta("a", "loja-a", "Conta da loja A")]));
    expect(await screen.findByText("Conta da loja A")).toBeInTheDocument();

    await trocarPraB(rerender);
    await act(async () => b.rejeitar(new Error("Falha da loja B")));

    expect(await screen.findByText(/Falha da loja B/)).toBeInTheDocument();
    expect(screen.queryByText("Conta da loja A")).not.toBeInTheDocument();
    expect(screen.queryByText("Total pendente")).not.toBeInTheDocument();
  });
});

// @vitest-environment jsdom
/**
 * #927: trocar de loja enquanto a carga anterior ainda busca. Só a carga mais
 * nova mexe na tela, e se a carga da loja nova der erro o Caixa não mostra os
 * lançamentos da loja anterior.
 */
import type { ReactElement } from "react";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { MovimentoCaixa } from "@/types/caixa";

const lojaA = { id: "loja-a", nome: "Loja A" };
const lojaB = { id: "loja-b", nome: "Loja B" };
const auth = vi.hoisted(() => ({ lojaAtual: null as unknown }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true, permissoes: [] }, lojaAtual: auth.lojaAtual }),
}));

const listarMovimentosCaixa = vi.hoisted(() => vi.fn());
vi.mock("@/lib/caixa", () => ({
  listarMovimentosCaixa,
  buscarCustoDasOrdens: async () => new Map(),
  criarMovimentoCaixa: vi.fn(),
}));
vi.mock("@/lib/categoriasCaixa", () => ({ listarCategoriasCaixa: async () => [] }));
vi.mock("@/lib/fechamentoCaixa", () => ({ listarFechamentosCaixa: async () => [] }));
// As seções só mostram a descrição dos lançamentos que a página entregou.
vi.mock("./DiarioSection", () => ({
  DiarioSection: ({ movimentos }: { movimentos: MovimentoCaixa[] }) => (
    <ul>{movimentos.map((m) => <li key={m.id}>{m.descricao}</li>)}</ul>
  ),
}));
vi.mock("./FechamentoSection", () => ({ FechamentoSection: () => null }));
vi.mock("./EntradaSaidaSection", () => ({ EntradaSaidaSection: () => null }));

const { CaixaPage } = await import("./CaixaPage");

function adiada<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

function mov(id: string, lojaId: string, descricao: string): MovimentoCaixa {
  return {
    id, loja_id: lojaId, data: new Date().toISOString(), ordem_servico_id: null, tipo: "entrada",
    forma_pagamento: "pix", valor: 10, descricao, categoria_id: null,
  };
}

function respostas() {
  const a = adiada<MovimentoCaixa[]>();
  const b = adiada<MovimentoCaixa[]>();
  listarMovimentosCaixa.mockImplementation((loja: string) => (loja === "loja-a" ? a.promessa : b.promessa));
  return { a, b };
}

async function trocarPraB(rerender: (ui: ReactElement) => void) {
  auth.lojaAtual = lojaB;
  rerender(<CaixaPage />);
  await vi.waitFor(() => expect(listarMovimentosCaixa).toHaveBeenCalledWith("loja-b"));
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.lojaAtual = lojaA;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Caixa: troca de loja no meio da carga (#927)", () => {
  it("a loja A chega depois da B: a tela fica com os lançamentos da B", async () => {
    const { a, b } = respostas();
    const { rerender } = renderizar(<CaixaPage />);
    await vi.waitFor(() => expect(listarMovimentosCaixa).toHaveBeenCalledWith("loja-a"));
    await trocarPraB(rerender);

    await act(async () => b.resolver([mov("b", "loja-b", "Lançamento da loja B")]));
    expect(await screen.findByText("Lançamento da loja B")).toBeInTheDocument();

    await act(async () => {
      a.resolver([mov("a", "loja-a", "Lançamento da loja A")]);
      await a.promessa;
    });
    // Dá tempo da carga velha seguir pro custo e pros fechamentos.
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText("Lançamento da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Lançamento da loja A")).not.toBeInTheDocument();
  });

  it("a loja A carregou e a carga da B dá erro: aparece o erro e não os lançamentos da A", async () => {
    const { a, b } = respostas();
    const { rerender } = renderizar(<CaixaPage />);
    await act(async () => a.resolver([mov("a", "loja-a", "Lançamento da loja A")]));
    expect(await screen.findByText("Lançamento da loja A")).toBeInTheDocument();

    await trocarPraB(rerender);
    await act(async () => b.rejeitar(new Error("Falha da loja B")));

    expect(await screen.findByText(/Falha da loja B/)).toBeInTheDocument();
    expect(screen.queryByText("Lançamento da loja A")).not.toBeInTheDocument();
  });
});

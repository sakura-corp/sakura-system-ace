// @vitest-environment jsdom
/**
 * #927: o histórico de contagens é da loja. Trocar de loja com a busca
 * anterior ainda andando não pode deixar o histórico da loja antiga na tela, e
 * a loja nova dando erro mostra só o erro.
 */
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { ContagemEstoque } from "@/types/contagem";
import type { Peca } from "@/types/peca";

const listarContagens = vi.fn();
vi.mock("@/lib/contagens", () => ({
  listarContagens: (...a: unknown[]) => listarContagens(...a),
  registrarContagem: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ operador: { id: "op", admin: true } }),
}));

const { ContagemSection } = await import("./ContagemSection");

const pecas = [{ id: "p1", descricao: "Pneu" } as unknown as Peca];
const contagem = (id: string, observacao: string) =>
  ({
    id,
    peca_id: "p1",
    deposito_id: "d1",
    quantidade_contada: 1,
    saldo_sistema: 1,
    diferenca: 0,
    observacao,
    criado_em: "2026-11-01T12:00:00Z",
  }) as unknown as ContagemEstoque;

function adiada<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

const tela = (lojaId: string) => (
  <ContagemSection
    pecas={pecas}
    depositos={[]}
    saldosPorDeposito={new Map()}
    lojaId={lojaId}
    onRecarregar={async () => undefined}
  />
);

beforeEach(() => {
  listarContagens.mockReset();
});

describe("ContagemSection — troca de loja (#927)", () => {
  it("o histórico da loja A que chega depois da B não sobrescreve a tela", async () => {
    const a = adiada<ContagemEstoque[]>();
    listarContagens.mockImplementation((loja: string) =>
      loja === "loja-a" ? a.promessa : Promise.resolve([contagem("b", "Contagem da loja B")]),
    );
    const { rerender } = renderizar(tela("loja-a"));
    rerender(tela("loja-b"));
    expect(await screen.findByText("Contagem da loja B")).toBeInTheDocument();

    await act(async () => {
      a.resolver([contagem("a", "Contagem da loja A")]);
      await a.promessa;
    });

    expect(screen.getByText("Contagem da loja B")).toBeInTheDocument();
    expect(screen.queryByText("Contagem da loja A")).not.toBeInTheDocument();
  });

  it("a loja B dá erro depois da A carregar: só o erro, sem o histórico da A", async () => {
    const b = adiada<ContagemEstoque[]>();
    listarContagens.mockImplementation((loja: string) =>
      loja === "loja-a" ? Promise.resolve([contagem("a", "Contagem da loja A")]) : b.promessa,
    );
    const { rerender } = renderizar(tela("loja-a"));
    expect(await screen.findByText("Contagem da loja A")).toBeInTheDocument();

    rerender(tela("loja-b"));
    await act(async () => {
      b.rejeitar(new Error("Falhou ao buscar a loja B"));
      await b.promessa.catch(() => undefined);
    });

    expect(await screen.findByText(/Falhou ao buscar a loja B/)).toBeInTheDocument();
    expect(screen.queryByText("Contagem da loja A")).not.toBeInTheDocument();
  });
});

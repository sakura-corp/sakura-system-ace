import { beforeEach, describe, expect, it, vi } from "vitest";

const from = vi.fn();
vi.mock("./supabase", () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }));

const { buscarNumerosDoMenu } = await import("./numerosDoMenu");

/** Uma consulta falsa que devolve `linhas` (ou erro) pra tabela e status pedidos. */
function consulta(linhas: unknown[], erro: { message: string } | null = null) {
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.order = () => q;
  q.range = () => Promise.resolve({ data: erro ? null : linhas, error: erro });
  return q;
}

const TODOS = { ordens_servico: true, contas_pagar: true, contas_receber: true };

beforeEach(() => {
  from.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("buscarNumerosDoMenu", () => {
  it("só busca as listas dos módulos que a pessoa tem", async () => {
    from.mockImplementation(() => consulta([]));
    await buscarNumerosDoMenu("loja-a", { ordens_servico: false, contas_pagar: true, contas_receber: false }, "2026-11-26");

    expect(from.mock.calls.map((c) => c[0])).toEqual(["contas_pagar"]);
  });

  it("uma busca que falha só tira o número dela; as outras seguem", async () => {
    from.mockImplementation((tabela: string) =>
      tabela === "contas_pagar"
        ? consulta([], { message: "caiu" })
        : tabela === "contas_receber"
          ? consulta([{ id: "r1", status: "pendente", vencimento: "2026-11-01" }])
          : consulta([]),
    );
    const r = await buscarNumerosDoMenu("loja-a", TODOS, "2026-11-26");

    expect("contas_pagar" in r).toBe(false);
    expect(r.contas_receber?.quantos).toBe(1);
    expect(r.orcamentos).toBeNull();
  });
});

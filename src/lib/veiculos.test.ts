import { describe, expect, it, vi } from "vitest";

// A ficha do veículo (FN-04) é a história do carro: só o que foi feito nele.
// Orçamento (#379) não é visita — aberto ou recusado, não entra na linha do
// tempo, no KM, no total gasto nem na garantia.

const respostas: Record<string, unknown> = {};
function construtor(tabela: string) {
  const q = {
    select: () => q,
    eq: () => q,
    order: () => q,
    maybeSingle: () => q,
    then(ok: (v: unknown) => unknown) {
      return Promise.resolve({ data: respostas[tabela], error: null }).then(ok);
    },
  };
  return q;
}
vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));

const { buscarFichaDoVeiculo } = await import("./veiculos");

const base = {
  loja_id: "loja",
  cliente_id: "c1",
  km_entrada: 50_000,
  data_fechamento: null,
  itens: [],
};

describe("buscarFichaDoVeiculo", () => {
  it("deixa orçamento aberto e recusado fora da ficha", async () => {
    respostas.veiculos = { id: "v1", placa: "RTA4B71", cliente: null };
    respostas.ordens_servico = [
      { ...base, id: "orc-1", numero: null, numero_orcamento: 3, status: "orcamento", km_entrada: 99_999, data_abertura: "2026-10-20T12:00:00Z" },
      { ...base, id: "os-17", numero: 17, status: "faturada", data_abertura: "2026-10-10T12:00:00Z" },
      { ...base, id: "orc-2", numero: null, numero_orcamento: 2, status: "recusado", data_abertura: "2026-10-05T12:00:00Z" },
    ];
    const ficha = await buscarFichaDoVeiculo("v1");
    expect(ficha?.ordens.map((o) => o.id)).toEqual(["os-17"]);
  });
});

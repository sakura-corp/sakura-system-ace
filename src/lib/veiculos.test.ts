import { describe, expect, it, vi } from "vitest";

// A ficha do veículo (FN-04) é a história do carro: só o que foi feito nele.
// Orçamento (#379) não é visita — aberto ou recusado, não entra na linha do
// tempo, no KM, no total gasto nem na garantia.

const respostas: Record<string, unknown> = {};
const tabelasLidas: string[] = [];
function construtor(tabela: string) {
  tabelasLidas.push(tabela);
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

// A janela `ordens_servico_clientes` (migration 0075, #367) traz o nome do
// cliente e o prazo de garantia da peça como colunas; a ficha recebe o mesmo
// formato de antes (`cliente.nome`, `peca.prazo_garantia_dias`).
const base = {
  loja_id: "loja",
  cliente_id: "c1",
  cliente_nome: "Maria",
  km_entrada: 50_000,
  data_fechamento: null,
  itens: [],
};

describe("buscarFichaDoVeiculo", () => {
  it("deixa orçamento aberto e recusado fora da ficha", async () => {
    respostas.veiculos = { id: "v1", placa: "RTA4B71", cliente: null };
    respostas.ordens_servico_clientes = [
      { ...base, id: "orc-1", numero: null, status: "orcamento", km_entrada: 99_999, data_abertura: "2026-10-20T12:00:00Z" },
      { ...base, id: "os-17", numero: 17, status: "faturada", data_abertura: "2026-10-10T12:00:00Z" },
      { ...base, id: "orc-2", numero: null, status: "recusado", data_abertura: "2026-10-05T12:00:00Z" },
    ];
    const ficha = await buscarFichaDoVeiculo("v1", true);
    expect(ficha?.ordens.map((o) => o.id)).toEqual(["os-17"]);
  });

  it("lê as OS da janela e monta cliente e garantia da peça no formato da ficha", async () => {
    tabelasLidas.length = 0;
    respostas.veiculos = { id: "v1", placa: "RTA4B71", cliente: null };
    respostas.ordens_servico_clientes = [
      {
        ...base,
        id: "os-17",
        numero: 17,
        status: "faturada",
        data_abertura: "2026-10-10T12:00:00Z",
        itens: [
          { id: "i1", tipo: "peca", peca_id: "p1", descricao: "Pneu", quantidade: 4, preco_unitario: 300, desconto: 0, prazo_garantia_dias: 90 },
          { id: "i2", tipo: "servico", peca_id: null, descricao: "Alinhamento", quantidade: 1, preco_unitario: 100, desconto: 0, prazo_garantia_dias: null },
        ],
      },
    ];
    const ficha = await buscarFichaDoVeiculo("v1", true);
    expect(tabelasLidas).toContain("ordens_servico_clientes");
    expect(tabelasLidas).not.toContain("ordens_servico");
    const [ordem] = ficha?.ordens ?? [];
    expect(ordem.cliente).toEqual({ nome: "Maria" });
    expect(ordem.itens?.[0].peca).toEqual({ prazo_garantia_dias: 90 });
    expect(ordem.itens?.[1].peca).toBeNull();
    expect(ordem.itens?.[0]).not.toHaveProperty("prazo_garantia_dias");
  });
});

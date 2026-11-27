import { beforeEach, describe, expect, it, vi } from "vitest";
import { TAMANHO_DA_PAGINA } from "./paginacao";

// #388: o que o DRE lê além de Relações (categorias com grupo e as taxas
// gravadas da maquininha). O supabase é de mentira: cada consulta guarda os
// passos pedidos e devolve o que o teste mandar.

type Passo = [string, ...unknown[]];
interface Consulta {
  tabela: string;
  passos: Passo[];
}
const consultas: Consulta[] = [];
let resposta: (c: Consulta) => { data: unknown; error: unknown } = () => ({ data: [], error: null });
const listarCategoriasCaixa = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    from: (tabela: string) => {
      const c: Consulta = { tabela, passos: [] };
      consultas.push(c);
      const q: Record<string, unknown> = {};
      for (const nome of ["select", "eq", "order", "range"]) {
        q[nome] = (...args: unknown[]) => {
          c.passos.push([nome, ...args]);
          return q;
        };
      }
      q.then = (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) =>
        Promise.resolve(resposta(c)).then(ok, erro);
      return q;
    },
  },
}));
vi.mock("./categoriasCaixa", () => ({
  listarCategoriasCaixa: (...a: unknown[]) => listarCategoriasCaixa(...a),
}));

const { carregarDadosDoDre } = await import("./relatorios");

const passos = (c: Consulta | undefined, nome: string) => c?.passos.filter((p) => p[0] === nome) ?? [];

beforeEach(() => {
  consultas.length = 0;
  resposta = () => ({ data: [], error: null });
  listarCategoriasCaixa.mockReset().mockResolvedValue([]);
});

describe("carregarDadosDoDre", () => {
  it("categorias: só id, nome e grupo", async () => {
    listarCategoriasCaixa.mockResolvedValue([
      { id: "c1", nome: "Aluguel", tipo: "saida", grupo: "despesas_operacionais", criado_em: "x" },
    ]);
    const { categorias } = await carregarDadosDoDre("loja-1");
    expect(categorias).toEqual([{ id: "c1", nome: "Aluguel", grupo: "despesas_operacionais" }]);
  });

  it("taxas: lê só a loja pedida, em ordem estável, e valor_taxa (texto) vira número", async () => {
    resposta = () => ({ data: [{ movimento_id: "m1", valor_taxa: "12.50" }, { movimento_id: "m2", valor_taxa: 3 }], error: null });
    const { taxas } = await carregarDadosDoDre("loja-1");
    expect(taxas).toEqual([
      { movimento_id: "m1", valor_taxa: 12.5 },
      { movimento_id: "m2", valor_taxa: 3 },
    ]);
    const c = consultas.find((q) => q.tabela === "caixa_taxas_cartao");
    expect(passos(c, "eq")).toEqual([["eq", "loja_id", "loja-1"]]);
    expect(passos(c, "select")).toEqual([["select", "movimento_id, valor_taxa"]]);
    expect(passos(c, "order")).toEqual([["order", "movimento_id"]]);
  });

  it("passa de 1.000 taxas: busca a página seguinte", async () => {
    const cheia = Array.from({ length: TAMANHO_DA_PAGINA }, (_, i) => ({ movimento_id: `a${i}`, valor_taxa: 1 }));
    let chamada = 0;
    resposta = () => ({ data: chamada++ === 0 ? cheia : [{ movimento_id: "z", valor_taxa: 2 }], error: null });
    const { taxas } = await carregarDadosDoDre("loja-1");
    expect(taxas).toHaveLength(TAMANHO_DA_PAGINA + 1);
    const faixas = consultas.flatMap((q) => passos(q, "range"));
    expect(faixas).toEqual([
      ["range", 0, TAMANHO_DA_PAGINA - 1],
      ["range", TAMANHO_DA_PAGINA, 2 * TAMANHO_DA_PAGINA - 1],
    ]);
  });

  it("erro do banco nas taxas sobe como veio", async () => {
    const erro = { message: "sem permissão" };
    resposta = () => ({ data: null, error: erro });
    await expect(carregarDadosDoDre("loja-1")).rejects.toBe(erro);
  });

  it("erro nas categorias sobe como veio", async () => {
    const erro = new Error("falhou");
    listarCategoriasCaixa.mockRejectedValue(erro);
    await expect(carregarDadosDoDre("loja-1")).rejects.toBe(erro);
  });
});

/**
 * Testes da leitura e do "Gerar pedidos" da Sugestão de compra (#382, FN-07).
 * Portas: `gerarPedidosDaSugestao` (um pedido por fornecedor; para no primeiro
 * erro, sem repetir) e `carregarDadosDaSugestao` (as consultas que vão ao banco).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GrupoPorFornecedor } from "@/schemas/estoque";

const criarPedido = vi.fn();
vi.mock("./pedidosCompra", () => ({ criarPedido: (...a: unknown[]) => criarPedido(...a) }));

// Banco de mentira: cada `from(tabela)` devolve um construtor que anota as
// chamadas e, no `.range()`, responde as linhas daquela tabela.
const chamadas: { tabela: string; metodo: string; args: unknown[] }[] = [];
const linhasPorTabela: Record<string, unknown[]> = {};
vi.mock("./supabase", () => ({
  supabase: {
    from(tabela: string) {
      const construtor: Record<string, unknown> = {};
      for (const metodo of ["select", "eq", "in", "gte", "order"]) {
        construtor[metodo] = (...args: unknown[]) => {
          chamadas.push({ tabela, metodo, args });
          return construtor;
        };
      }
      construtor.range = (...args: unknown[]) => {
        chamadas.push({ tabela, metodo: "range", args });
        return Promise.resolve({ data: linhasPorTabela[tabela] ?? [], error: null });
      };
      return construtor;
    },
  },
}));
const listarPecas = vi.fn();
vi.mock("./pecas", () => ({ listarPecas: () => listarPecas() }));
const listarSaldos = vi.fn();
vi.mock("./estoque", () => ({ listarSaldos: (...a: unknown[]) => listarSaldos(...a) }));

const { gerarPedidosDaSugestao, carregarDadosDaSugestao } = await import("./sugestaoCompra");

const GRUPOS: GrupoPorFornecedor[] = [
  {
    fornecedor: { id: "f1", nome: "Fornecedor A" },
    itens: [
      { peca_id: "p1", descricao: "Pneu", quantidade: 5, preco: 100, total: 500 },
      { peca_id: "p2", descricao: "Filtro", quantidade: 2, preco: 30, total: 60 },
    ],
    total: 560,
  },
  {
    fornecedor: { id: "f2", nome: "Fornecedor B" },
    itens: [{ peca_id: "p3", descricao: "Pastilha", quantidade: 1, preco: 80, total: 80 }],
    total: 80,
  },
  {
    fornecedor: { id: "f3", nome: "Fornecedor C" },
    itens: [{ peca_id: "p4", descricao: "Bateria", quantidade: 3, preco: 300, total: 900 }],
    total: 900,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  chamadas.length = 0;
  for (const k of Object.keys(linhasPorTabela)) delete linhasPorTabela[k];
});

describe("gerarPedidosDaSugestao", () => {
  it("cria um pedido por fornecedor, com os itens e preços do grupo", async () => {
    criarPedido
      .mockResolvedValueOnce({ numero: 12 })
      .mockResolvedValueOnce({ numero: 13 })
      .mockResolvedValueOnce({ numero: 14 });

    const r = await gerarPedidosDaSugestao(GRUPOS, "loja-1", "op-1");

    expect(r).toEqual({
      criados: [
        { fornecedorNome: "Fornecedor A", numero: 12 },
        { fornecedorNome: "Fornecedor B", numero: 13 },
        { fornecedorNome: "Fornecedor C", numero: 14 },
      ],
      naoCriados: [],
      erro: null,
    });
    expect(criarPedido).toHaveBeenCalledTimes(3);
    const [pedido, itens, lojaId, operadorId] = criarPedido.mock.calls[0];
    expect(pedido.fornecedor_id).toBe("f1");
    expect(pedido.observacao).toBe("Gerado pela Sugestão de compra");
    expect(pedido.data_pedido).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(itens).toEqual([
      { peca_id: "p1", quantidade_pedida: 5, preco_unitario: 100 },
      { peca_id: "p2", quantidade_pedida: 2, preco_unitario: 30 },
    ]);
    expect(lojaId).toBe("loja-1");
    expect(operadorId).toBe("op-1");
    expect(criarPedido.mock.calls[1][0].fornecedor_id).toBe("f2");
  });

  it("se o 2º falhar: o 1º fica criado, o 2º e o 3º não, e ninguém é repetido", async () => {
    criarPedido
      .mockResolvedValueOnce({ numero: 12 })
      .mockRejectedValueOnce(new Error("rede caiu"));

    const r = await gerarPedidosDaSugestao(GRUPOS, "loja-1", null);

    expect(r.criados).toEqual([{ fornecedorNome: "Fornecedor A", numero: 12 }]);
    expect(r.naoCriados).toEqual([
      { fornecedorNome: "Fornecedor B" },
      { fornecedorNome: "Fornecedor C" },
    ]);
    expect(r.erro).toBeTruthy();
    expect(criarPedido).toHaveBeenCalledTimes(2);
  });
});

describe("carregarDadosDaSugestao", () => {
  it("lê só saídas de venda/uso em OS dos últimos 90 dias da loja, e junta o resto", async () => {
    listarPecas.mockResolvedValue([
      { id: "p1", descricao: "Pneu", unidade: "UN", estoque_minimo: 4, ativo: true, custo: 1 },
    ]);
    listarSaldos.mockResolvedValue(new Map([["p1", 2]]));
    linhasPorTabela.estoque_movimentos = [
      { peca_id: "p1", tipo: "saida", motivo: "venda", quantidade: 3, criado_em: "2026-11-01T10:00:00-03:00" },
    ];
    linhasPorTabela.cotacoes_pecas = [
      { peca_id: "p1", fornecedor_id: "f1", preco: 10, criado_em: "2026-11-01T10:00:00Z", fornecedor: { nome: "A", ativo: true } },
      { peca_id: "p1", fornecedor_id: "f2", preco: 8, criado_em: "2026-11-01T10:00:00Z", fornecedor: { nome: "B", ativo: false } },
    ];
    linhasPorTabela.pedidos_compra = [
      { status: "pendente", itens: [{ peca_id: "p1", quantidade_pedida: 5, quantidade_recebida: 0 }] },
    ];

    const d = await carregarDadosDaSugestao("loja-1", "2026-11-10");

    expect(d.pecas).toEqual([
      { id: "p1", descricao: "Pneu", unidade: "UN", estoque_minimo: 4, ativo: true },
    ]);
    expect(d.saldos.get("p1")).toBe(2);
    expect(d.movimentos).toHaveLength(1);
    // Fornecedor inativo não entra nas cotações.
    expect(d.cotacoes).toEqual([
      { peca_id: "p1", fornecedor_id: "f1", fornecedor_nome: "A", preco: 10, criado_em: "2026-11-01T10:00:00Z" },
    ]);
    expect(d.pedidos).toHaveLength(1);

    const mov = chamadas.filter((c) => c.tabela === "estoque_movimentos");
    expect(mov.find((c) => c.metodo === "eq")?.args).toEqual(["loja_id", "loja-1"]);
    expect(mov.find((c) => c.metodo === "in")?.args).toEqual(["motivo", ["venda", "uso_em_os"]]);
    // 10/11 menos 89 dias = 13/08, desde a meia-noite local, com o fuso no fim.
    const gte = mov.find((c) => c.metodo === "gte")?.args as string[];
    expect(gte[0]).toBe("criado_em");
    expect(gte[1]).toMatch(/^2026-08-13T00:00:00[+-]\d{2}:\d{2}$/);
    const ped = chamadas.filter((c) => c.tabela === "pedidos_compra");
    expect(ped.find((c) => c.metodo === "in")?.args).toEqual(["status", ["pendente", "parcial"]]);
    expect(ped.find((c) => c.metodo === "eq")?.args).toEqual(["loja_id", "loja-1"]);
  });
});

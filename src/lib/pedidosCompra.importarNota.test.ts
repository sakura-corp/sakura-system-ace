import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NovaContaPagar } from "@/types/contaPagar";

// #1020: importar a nota de compra pelo XML também lança as contas a pagar.
// O banco de mentira guarda o que foi gravado em cada tabela, pra conferir o
// que entrou (e o que não entrou) depois de cada importação.
type Linha = Record<string, unknown>;
let tabelas: Record<string, Linha[]> = {};
let falharEm: string | null = null; // nome da tabela cujo insert falha
let falharBusca = false; // a conferência da nota repetida falha
let proximoNumero = 1;

function construtor(tabela: string) {
  let linhas: Linha[] = [];
  let modo: "insert" | "select" = "select";
  let filtroTexto: { coluna: string; padrao: string } | null = null;
  const q = {
    insert(dados: Linha | Linha[]) {
      modo = "insert";
      linhas = Array.isArray(dados) ? dados : [dados];
      return q;
    },
    select: () => q,
    ilike(coluna: string, padrao: string) {
      filtroTexto = { coluna, padrao };
      return q;
    },
    limit: () => q,
    single: () => q,
    then(ok: (v: unknown) => unknown, falhou?: (e: unknown) => unknown) {
      const responder = (v: unknown) => Promise.resolve(v).then(ok, falhou);
      if (modo === "select") {
        if (falharBusca) return responder({ data: null, error: { message: "caiu a internet" } });
        const trecho = filtroTexto ? filtroTexto.padrao.replaceAll("%", "") : "";
        const achados = (tabelas[tabela] ?? []).filter((l) =>
          String(l[filtroTexto?.coluna ?? ""] ?? "").includes(trecho),
        );
        return responder({ data: achados, error: null });
      }
      if (falharEm === tabela) {
        return responder({ data: null, error: { message: "new row violates row-level security policy" } });
      }
      const gravadas = linhas.map((l) =>
        tabela === "pedidos_compra" ? { id: `ped-${proximoNumero}`, numero: proximoNumero++, ...l } : l,
      );
      tabelas[tabela] = [...(tabelas[tabela] ?? []), ...gravadas];
      return responder({ data: tabela === "pedidos_compra" ? gravadas[0] : gravadas, error: null });
    },
  };
  return q;
}

vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));
vi.mock("./estoque", () => ({ registrarMovimento: vi.fn(async () => undefined) }));
vi.mock("./cotacoesPecas", () => ({ registrarCotacoes: vi.fn(async () => undefined) }));

const { importarNotaFiscalCompra, NotaJaImportadaError, buscarPedidoDaNota, observacaoDaImportacao } =
  await import("./pedidosCompra");

const CHAVE = "35261112345678000199550010000012341000012345";

const CONTAS: NovaContaPagar[] = [
  { descricao: "NF 1234 — Fornecedor Exemplo (1/3)", valor: 333.34, vencimento: "2026-12-01", categoria_id: "cat-1", recorrente: false, recorrente_ate: null },
  { descricao: "NF 1234 — Fornecedor Exemplo (2/3)", valor: 333.33, vencimento: "2026-12-31", categoria_id: "cat-1", recorrente: false, recorrente_ate: null },
  { descricao: "NF 1234 — Fornecedor Exemplo (3/3)", valor: 333.33, vencimento: "2027-01-30", categoria_id: "cat-1", recorrente: false, recorrente_ate: null },
];

function importar(contas: NovaContaPagar[], chave: string | null = CHAVE) {
  return importarNotaFiscalCompra(
    "forn-1",
    [{ pecaId: "peca-1", quantidade: 4, precoUnitario: 250 }],
    "dep-1",
    "loja-1",
    "op-1",
    observacaoDaImportacao("1234", chave),
    { chaveAcesso: chave, contas },
  );
}

beforeEach(() => {
  tabelas = {};
  falharEm = null;
  falharBusca = false;
  proximoNumero = 1;
});

describe("importarNotaFiscalCompra com as contas a pagar (#1020)", () => {
  it("com a caixa marcada (parcelas confirmadas), cria uma conta a pagar por parcela, na loja", async () => {
    const resultado = await importar(CONTAS);
    expect(resultado.contasLancadas).toBe(3);
    expect(resultado.erroContas).toBeNull();
    expect(tabelas.contas_pagar).toEqual(CONTAS.map((c) => ({ ...c, loja_id: "loja-1" })));
  });

  it("o vencimento gravado é o mesmo dia da nota, em qualquer fuso", async () => {
    await importar(CONTAS);
    expect(tabelas.contas_pagar.map((c) => c.vencimento)).toEqual([
      "2026-12-01",
      "2026-12-31",
      "2027-01-30",
    ]);
  });

  it("com a caixa desmarcada (nenhuma parcela), não cria conta nenhuma", async () => {
    const resultado = await importar([]);
    expect(resultado.contasLancadas).toBe(0);
    expect(tabelas.contas_pagar).toBeUndefined();
    expect(tabelas.pedidos_compra).toHaveLength(1);
  });

  it("a mesma nota duas vezes não duplica: a segunda recusa e não grava nada", async () => {
    await importar(CONTAS);
    await expect(importar(CONTAS)).rejects.toBeInstanceOf(NotaJaImportadaError);
    expect(tabelas.pedidos_compra).toHaveLength(1);
    expect(tabelas.pedidos_compra_itens).toHaveLength(1);
    expect(tabelas.contas_pagar).toHaveLength(3);
  });

  it("a recusa diz em que pedido a nota já entrou", async () => {
    await importar(CONTAS);
    await expect(importar(CONTAS)).rejects.toThrow(/Pedido 1\b/);
  });

  it("nota sem chave de acesso não tem como ser conferida e importa normalmente", async () => {
    await importar([], null);
    await importar([], null);
    expect(tabelas.pedidos_compra).toHaveLength(2);
  });

  it("se a conferência da nota repetida falhar, importa mesmo assim (aviso, nunca tranca)", async () => {
    falharBusca = true;
    const resultado = await importar(CONTAS);
    expect(resultado.contasLancadas).toBe(3);
  });

  it("se o pedido grava e as contas falham, devolve o pedido e diz que as contas não entraram", async () => {
    falharEm = "contas_pagar";
    const resultado = await importar(CONTAS);
    expect(resultado.pedido.numero).toBe(1);
    expect(resultado.contasLancadas).toBe(0);
    expect(resultado.erroContas).toMatch(/row-level security|permissão/i);
    expect(tabelas.pedidos_compra).toHaveLength(1);
    expect(tabelas.contas_pagar).toBeUndefined();
  });

  it("se o próprio pedido falha, nenhuma conta é lançada", async () => {
    falharEm = "pedidos_compra";
    await expect(importar(CONTAS)).rejects.toBeTruthy();
    expect(tabelas.contas_pagar).toBeUndefined();
  });
});

describe("buscarPedidoDaNota e observacaoDaImportacao", () => {
  it("a observação guarda o número e a chave da nota", () => {
    expect(observacaoDaImportacao("1234", CHAVE)).toBe(`Importado da NFe nº 1234 (chave ${CHAVE})`);
    expect(observacaoDaImportacao(null, null)).toBe("Importado de nota fiscal XML");
    expect(observacaoDaImportacao("1234", null)).toBe("Importado da NFe nº 1234");
  });

  it("acha o pedido de uma nota já importada pela chave", async () => {
    await importar([]);
    expect(await buscarPedidoDaNota(CHAVE)).toEqual({ numero: 1 });
    expect(await buscarPedidoDaNota("35261112345678000199550010000012341000099999")).toBeNull();
  });
});

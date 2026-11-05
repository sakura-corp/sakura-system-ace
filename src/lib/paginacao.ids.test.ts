import { beforeEach, describe, expect, it, vi } from "vitest";

// #498: consultas que filtram por uma lista de ids (`.in(coluna, ids)`).
// Têm dois limites, os dois sem aviso nenhum na tela:
// - a resposta é cortada em 1.000 linhas (`max_rows` do Supabase);
// - a lista de ids vai no endereço da consulta, e um endereço grande demais é
//   recusado. Aqui o "banco de mentira" recusa acima de 200 ids (200 ids de 36
//   letras já dão uns 7,9 KB de endereço, perto do teto comum de 8 KB). O
//   código usa blocos menores, de propósito, pra ter folga.
const LIMITE_DE_LINHAS = 1000;
const LIMITE_DE_IDS = 200;

type Linha = Record<string, unknown> & { id: string };
const tabelas: Record<string, Linha[]> = {};
const consultas: { tabela: string; ids: number; de: number; ate: number }[] = [];

function construtor(tabela: string) {
  let de = 0;
  let ate = Infinity;
  const filtros: ((l: Linha) => boolean)[] = [];
  let erro: { message: string } | null = null;
  let qtdIds = 0;
  const q = {
    select: () => q,
    order: () => q,
    eq(coluna: string, valor: unknown) {
      filtros.push((l) => l[coluna] === valor);
      return q;
    },
    in(coluna: string, valores: unknown[]) {
      qtdIds = valores.length;
      if (valores.length > LIMITE_DE_IDS) erro = { message: "414 URI Too Long" };
      const conjunto = new Set(valores);
      filtros.push((l) => conjunto.has(l[coluna]));
      return q;
    },
    range(a: number, b: number) {
      de = a;
      ate = b;
      return q;
    },
    maybeSingle() {
      return {
        then(ok: (v: unknown) => unknown) {
          const linha = (tabelas[tabela] ?? []).find((l) => filtros.every((f) => f(l)));
          return Promise.resolve({ data: linha ?? null, error: null }).then(ok);
        },
      };
    },
    then(ok: (v: unknown) => unknown, falhou?: (e: unknown) => unknown) {
      consultas.push({ tabela, ids: qtdIds, de, ate });
      if (erro) return Promise.resolve({ data: null, error: erro }).then(ok, falhou);
      const filtradas = (tabelas[tabela] ?? []).filter((l) => filtros.every((f) => f(l)));
      const fatia = filtradas.slice(de, Math.min(ate + 1, de + LIMITE_DE_LINHAS));
      return Promise.resolve({ data: fatia, error: null }).then(ok, falhou);
    },
  };
  return q;
}

vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));
vi.mock("./caixa", () => ({ criarMovimentoCaixa: async () => undefined }));
vi.mock("./contasReceber", () => ({ criarContaReceber: async () => undefined }));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "deposito-1" }));

const { listarArquivosDasOrdens } = await import("./notasFiscais");
const { listarOrdens } = await import("./ordensServico");
const { buscarPecasPorIds } = await import("./pecas");
const { buscarFichaDoVeiculo } = await import("./veiculos");

function ids(prefixo: string, n: number) {
  return Array.from({ length: n }, (_, i) => `${prefixo}-${String(i).padStart(5, "0")}`);
}

beforeEach(() => {
  for (const t of Object.keys(tabelas)) delete tabelas[t];
  consultas.length = 0;
});

describe("listarArquivosDasOrdens (#498)", () => {
  it("com 150 ordens e 1.500 notas, traz as 1.500 (não corta em 1.000)", async () => {
    const ordens = ids("os", 150);
    tabelas.notas_fiscais_arquivos = ordens.flatMap((os) =>
      ids(`nota-${os}`, 10).map((id) => ({ id, ordem_servico_id: os })),
    );
    const notas = await listarArquivosDasOrdens(ordens);
    expect(notas).toHaveLength(1500);
    expect(new Set(notas.map((n) => n.id)).size).toBe(1500);
  });

  it("com 650 ordens, divide em blocos pequenos e não perde nenhuma nota", async () => {
    const ordens = ids("os", 650);
    tabelas.notas_fiscais_arquivos = [
      ...ordens.flatMap((os) => ids(`nota-${os}`, 2).map((id) => ({ id, ordem_servico_id: os }))),
      // nota de outra OS, que não foi pedida: não pode vir
      { id: "nota-de-fora", ordem_servico_id: "os-que-nao-foi-pedida" },
    ];
    const notas = await listarArquivosDasOrdens(ordens);
    expect(notas).toHaveLength(1300);
    expect(new Set(notas.map((n) => n.id)).size).toBe(1300);
    expect(notas.some((n) => n.id === "nota-de-fora")).toBe(false);
    expect(Math.max(...consultas.map((c) => c.ids))).toBeLessThanOrEqual(LIMITE_DE_IDS);
  });

  it("id repetido em blocos diferentes não duplica a nota", async () => {
    tabelas.notas_fiscais_arquivos = [{ id: "n1", ordem_servico_id: "os-1" }];
    // "os-1" no começo e de novo no fim: cairia em dois blocos
    const notas = await listarArquivosDasOrdens(["os-1", ...ids("vazia", 250), "os-1"]);
    expect(notas).toHaveLength(1);
  });

  it("lista vazia não consulta o banco", async () => {
    expect(await listarArquivosDasOrdens([])).toEqual([]);
    expect(consultas).toHaveLength(0);
  });
});

describe("as outras listas por ids (#498)", () => {
  it("listarOrdens dá nome aos técnicos mesmo com mais de 200 funcionários citados", async () => {
    const tecnicos = ids("func", 450);
    tabelas.ordens_servico = tecnicos.map((t, i) => ({
      id: `os-${i}`,
      loja_id: "loja-1",
      vendedor_id: null,
      itens: [{ id: `item-${i}`, tecnico_id: t }],
    }));
    tabelas.funcionarios_publico = tecnicos.map((t) => ({ id: t, nome: `Nome ${t}` }));
    const ordens = await listarOrdens("loja-1");
    expect(ordens).toHaveLength(450);
    const semNome = ordens.filter((o) => o.itens?.[0]?.tecnico?.nome !== `Nome ${o.itens?.[0]?.tecnico_id}`);
    expect(semNome).toHaveLength(0);
  });

  it("buscarPecasPorIds traz todas as peças pedidas, mesmo mais de 200", async () => {
    const pecas = ids("peca", 320);
    tabelas.pecas = pecas.map((id) => ({ id, nome: id }));
    const achadas = await buscarPecasPorIds(pecas);
    expect(achadas).toHaveLength(320);
  });

  it("buscarFichaDoVeiculo traz as 1.500 visitas do carro, não só 1.000", async () => {
    tabelas.veiculos = [{ id: "v1", placa: "RTA4B71", cliente: null }];
    tabelas.ordens_servico_clientes = ids("os", 1500).map((id) => ({
      id,
      veiculo_id: "v1",
      status: "finalizada",
      tipo: "servico",
      itens: [],
    }));
    const ficha = await buscarFichaDoVeiculo("v1", true);
    expect(ficha?.ordens).toHaveLength(1500);
  });
});

describe("buscarPorIdsEmBlocos", () => {
  it("pede vários blocos ao mesmo tempo, sem esperar um terminar pra pedir o próximo", async () => {
    const { buscarPorIdsEmBlocos } = await import("./paginacao");
    let emAndamento = 0;
    let maximo = 0;
    const linhas = await buscarPorIdsEmBlocos(ids("os", 1000), async (bloco) => {
      emAndamento++;
      maximo = Math.max(maximo, emAndamento);
      await new Promise((r) => setTimeout(r, 5));
      emAndamento--;
      return { data: bloco.map((id) => ({ id })), error: null };
    });
    expect(linhas).toHaveLength(1000);
    expect(maximo).toBeGreaterThan(1);
    // e com teto: não dispara dezenas de consultas de uma vez
    expect(maximo).toBeLessThanOrEqual(6);
  });

  it("repassa o erro de um bloco em vez de devolver a lista pela metade", async () => {
    const { buscarPorIdsEmBlocos } = await import("./paginacao");
    await expect(
      buscarPorIdsEmBlocos(ids("os", 500), async (bloco) =>
        bloco.includes("os-00450")
          ? { data: null, error: { message: "caiu" } }
          : { data: bloco.map((id) => ({ id })), error: null },
      ),
    ).rejects.toMatchObject({ message: "caiu" });
  });
});

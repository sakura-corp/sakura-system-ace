import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NovoItemOS, OrdemServico } from "@/types/os";
import type { TaxaMaquininha } from "@/schemas/taxaMaquininha";

// #387: ao faturar, cada linha de cartão do pagamento ganha a taxa da
// maquininha e as datas em que cai. A taxa é INFORMAÇÃO: não muda nenhum
// lançamento do Caixa, e se ler a tabela ou gravar a taxa falhar, a venda
// continua faturada e volta um aviso.
//
// O supabase é de mentira, mas o `criarMovimentoCaixa` é o de verdade: o que
// se compara é exatamente o que vai pra `caixa_movimentos`.

interface Insercao {
  tabela: string;
  dados: Record<string, unknown>;
}
const insercoes: Insercao[] = [];
const leituras: string[] = [];
const rpcs: { nome: string; args: Record<string, unknown> }[] = [];
const banco = vi.hoisted(() => ({
  tabela: [] as unknown[],
  erroAoLerTabela: null as unknown,
  erroAoGravarTaxa: null as unknown,
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      let resposta: () => { data: unknown; error: unknown } = () => ({ data: null, error: null });
      q.insert = (dados: Record<string, unknown>) => {
        insercoes.push({ tabela, dados });
        return q;
      };
      q.select = () => {
        if (tabela === "configuracoes_taxas_maquininha") {
          leituras.push(tabela);
          resposta = () =>
            banco.erroAoLerTabela
              ? { data: null, error: banco.erroAoLerTabela }
              : { data: banco.tabela, error: null };
        }
        return q;
      };
      q.eq = () => q;
      q.then = (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) =>
        Promise.resolve(resposta()).then(ok, erro);
      return q;
    },
    rpc: async (nome: string, args: Record<string, unknown>) => {
      rpcs.push({ nome, args });
      if (nome === "registrar_taxa_do_cartao" && banco.erroAoGravarTaxa) {
        return { data: null, error: banco.erroAoGravarTaxa };
      }
      return { data: null, error: null };
    },
  },
}));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "deposito-1" }));
const receber = vi.hoisted(() => ({ criarContaReceber: vi.fn() }));
vi.mock("./contasReceber", () => receber);

const { faturarOrdem, registrarVendaBalcao } = await import("./ordensServico");

const os = {
  id: "ordem-1",
  loja_id: "loja-1",
  cliente_id: "cli-1",
  numero: 18,
  status: "concluida",
  tipo: "os",
} as unknown as OrdemServico;

// Taxas inventadas (nenhuma loja de verdade).
const tabelaPreenchida: TaxaMaquininha[] = [
  { forma: "cartao_debito", parcelas: 1, taxa_percentual: 2, prazo_dias: 1, recebe_tudo_de_uma_vez: false },
  { forma: "cartao_credito", parcelas: 1, taxa_percentual: 3, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
  { forma: "cartao_credito", parcelas: 3, taxa_percentual: 4, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
];

// Pagamento dividido: Pix, crédito (nas 3 parcelas da OS) e débito.
const dividido = [
  { formaPagamento: "pix", valor: 30 },
  { formaPagamento: "cartao_credito", valor: 70 },
  { formaPagamento: "cartao_debito", valor: 20 },
];

const lancamentosDoCaixa = () =>
  insercoes
    .filter((i) => i.tabela === "caixa_movimentos")
    .map(({ dados }) => {
      // O id é sorteado a cada lançamento: o resto tem que ser idêntico.
      const resto = { ...dados };
      delete resto.id;
      return resto;
    });
const idDoLancamento = (forma: string) =>
  insercoes.find((i) => i.tabela === "caixa_movimentos" && i.dados.forma_pagamento === forma)?.dados.id;
const gravacoesDeTaxa = () => rpcs.filter((r) => r.nome === "registrar_taxa_do_cartao");

beforeEach(() => {
  insercoes.length = 0;
  leituras.length = 0;
  rpcs.length = 0;
  banco.tabela = [];
  banco.erroAoLerTabela = null;
  banco.erroAoGravarTaxa = null;
  receber.criarContaReceber.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  // Meio da tarde de 18/11/2026 no fuso de quem usa.
  vi.setSystemTime(new Date(2026, 10, 18, 15, 0, 0));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("faturarOrdem: os lançamentos do Caixa não mudam", () => {
  it("com e sem a tabela preenchida, os mesmos lançamentos (antes × depois)", async () => {
    banco.tabela = [];
    await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    const semTabela = lancamentosDoCaixa();

    insercoes.length = 0;
    banco.tabela = tabelaPreenchida;
    await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    const comTabela = lancamentosDoCaixa();

    expect(semTabela).toEqual([
      { ordem_servico_id: "ordem-1", tipo: "entrada", forma_pagamento: "pix", valor: 30, descricao: "Faturamento da OS 18", categoria_id: null, loja_id: "loja-1" },
      { ordem_servico_id: "ordem-1", tipo: "entrada", forma_pagamento: "cartao_credito", valor: 70, descricao: "Faturamento da OS 18", categoria_id: null, loja_id: "loja-1" },
      { ordem_servico_id: "ordem-1", tipo: "entrada", forma_pagamento: "cartao_debito", valor: 20, descricao: "Faturamento da OS 18", categoria_id: null, loja_id: "loja-1" },
    ]);
    expect(comTabela).toEqual(semTabela);
    // E nada além do Caixa foi inserido direto (a taxa vai pela função do banco).
    expect(insercoes.every((i) => i.tabela === "caixa_movimentos")).toBe(true);
  });

  it("com a gravação da taxa falhando, os lançamentos também são os mesmos", async () => {
    banco.tabela = tabelaPreenchida;
    banco.erroAoGravarTaxa = { message: "sem rede" };
    await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    expect(lancamentosDoCaixa().map((l) => [l.forma_pagamento, l.valor])).toEqual([
      ["pix", 30],
      ["cartao_credito", 70],
      ["cartao_debito", 20],
    ]);
  });
});

describe("faturarOrdem: grava a taxa de cada linha de cartão", () => {
  it("uma gravação por linha de cartão, com o id do lançamento e os valores certos; Pix não grava", async () => {
    banco.tabela = tabelaPreenchida;
    const resultado = await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    expect(resultado).toEqual({ avisoTaxa: null });

    expect(gravacoesDeTaxa()).toEqual([
      {
        nome: "registrar_taxa_do_cartao",
        args: {
          p_movimento: idDoLancamento("cartao_credito"),
          p_forma: "cartao_credito",
          p_parcelas: 3,
          p_taxa_percentual: 4,
          p_prazo_dias: 30,
          p_recebe_tudo_de_uma_vez: false,
          p_valor_bruto: 70,
          p_valor_taxa: 2.8,
          p_valor_liquido: 67.2,
          p_recebimentos: [
            { numero: 1, data_prevista: "2026-12-18", valor: 22.4 },
            { numero: 2, data_prevista: "2027-01-17", valor: 22.4 },
            { numero: 3, data_prevista: "2027-02-16", valor: 22.4 },
          ],
        },
      },
      {
        nome: "registrar_taxa_do_cartao",
        args: {
          p_movimento: idDoLancamento("cartao_debito"),
          p_forma: "cartao_debito",
          p_parcelas: 1,
          p_taxa_percentual: 2,
          p_prazo_dias: 1,
          p_recebe_tudo_de_uma_vez: false,
          p_valor_bruto: 20,
          p_valor_taxa: 0.4,
          p_valor_liquido: 19.6,
          p_recebimentos: [{ numero: 1, data_prevista: "2026-11-19", valor: 19.6 }],
        },
      },
    ]);
    expect(idDoLancamento("cartao_credito")).toEqual(expect.any(String));
  });

  it("a tabela da loja é lida UMA vez por faturamento, mesmo com duas linhas de cartão", async () => {
    banco.tabela = tabelaPreenchida;
    await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    expect(leituras).toEqual(["configuracoes_taxas_maquininha"]);
  });

  it("a linha pode trazer as próprias parcelas: crédito com parcelas 1 usa a taxa à vista", async () => {
    banco.tabela = tabelaPreenchida;
    await faturarOrdem(os, [{ formaPagamento: "cartao_credito", valor: 100, parcelas: 1 }], 3, null, "op-1", 100);
    expect(gravacoesDeTaxa()).toHaveLength(1);
    expect(gravacoesDeTaxa()[0].args).toMatchObject({
      p_parcelas: 1,
      p_valor_taxa: 3,
      p_valor_liquido: 97,
      p_recebimentos: [{ numero: 1, data_prevista: "2026-12-18", valor: 97 }],
    });
  });

  it("só Pix ou dinheiro: nem lê a tabela", async () => {
    banco.tabela = tabelaPreenchida;
    await faturarOrdem(
      os,
      [
        { formaPagamento: "pix", valor: 50 },
        { formaPagamento: "dinheiro", valor: 50 },
      ],
      1,
      null,
      "op-1",
      100,
    );
    expect(leituras).toEqual([]);
    expect(gravacoesDeTaxa()).toEqual([]);
  });

  it("\"receber depois\" (conta a receber): não lê a tabela nem grava taxa", async () => {
    banco.tabela = tabelaPreenchida;
    const resultado = await faturarOrdem(
      os,
      [{ formaPagamento: "cartao_credito", valor: 100 }],
      1,
      "2026-12-01",
      "op-1",
      100,
    );
    expect(resultado).toEqual({ avisoTaxa: null });
    expect(receber.criarContaReceber).toHaveBeenCalledTimes(1);
    expect(leituras).toEqual([]);
    expect(gravacoesDeTaxa()).toEqual([]);
  });

  it("tabela sem a linha (o 3x não foi informado): não grava aquela, e não é aviso", async () => {
    banco.tabela = tabelaPreenchida.filter((t) => t.parcelas !== 3);
    const resultado = await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    expect(resultado).toEqual({ avisoTaxa: null });
    expect(gravacoesDeTaxa().map((g) => g.args.p_forma)).toEqual(["cartao_debito"]);
  });

  it("tabela em branco: não grava nada e não avisa", async () => {
    const resultado = await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    expect(resultado).toEqual({ avisoTaxa: null });
    expect(gravacoesDeTaxa()).toEqual([]);
  });
});

describe("faturarOrdem: a taxa falhar não derruba a venda", () => {
  it("gravar a taxa falhou: a venda fica faturada, os lançamentos todos entram e volta o aviso", async () => {
    banco.tabela = tabelaPreenchida;
    banco.erroAoGravarTaxa = { message: "a soma não fecha" };
    const resultado = await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    expect(resultado).toEqual({
      avisoTaxa: "A venda foi faturada, mas a taxa da maquininha não foi guardada: a soma não fecha",
    });
    expect(rpcs.filter((r) => r.nome === "marcar_ordem_faturada")).toHaveLength(1);
    // A falha no crédito não impediu o lançamento do débito, que vem depois.
    expect(lancamentosDoCaixa()).toHaveLength(3);
    expect(gravacoesDeTaxa()).toHaveLength(2);
    expect(console.error).toHaveBeenCalled();
  });

  it("ler a tabela falhou: a venda fica faturada, nenhuma taxa é gravada e volta o aviso (em português)", async () => {
    banco.erroAoLerTabela = { message: "TypeError: Failed to fetch" };
    const resultado = await faturarOrdem(os, dividido, 3, null, "op-1", 120);
    expect(resultado.avisoTaxa).toMatch(
      /^A venda foi faturada, mas a taxa da maquininha não foi guardada: /,
    );
    expect(resultado.avisoTaxa).not.toMatch(/Failed to fetch/);
    expect(lancamentosDoCaixa()).toHaveLength(3);
    expect(gravacoesDeTaxa()).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("registrarVendaBalcao", () => {
  const pneu: NovoItemOS = {
    tipo: "peca",
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao: "Pneu",
    quantidade: 1,
    preco_unitario: 100,
    desconto: 0,
  };

  it("devolve a venda e o aviso da taxa juntos", async () => {
    banco.tabela = tabelaPreenchida;
    banco.erroAoGravarTaxa = { message: "sem permissão" };
    const venda = { id: "venda-1", loja_id: "loja-1", cliente_id: "cli-1", numero: 5, tipo: "venda_balcao" };
    const { supabase } = await import("./supabase");
    const fromOriginal = supabase.from;
    vi.spyOn(supabase, "from").mockImplementation(((tabela: string) => {
      if (tabela !== "ordens_servico") return fromOriginal(tabela);
      return { insert: () => ({ select: () => ({ single: async () => ({ data: venda, error: null }) }) }) };
    }) as unknown as typeof supabase.from);
    const resultado = await registrarVendaBalcao(
      { cliente_id: "cli-1", vendedor_id: null },
      [pneu],
      {
        pagamentos: [{ formaPagamento: "cartao_debito", valor: 100 }],
        parcelas: 1,
        previsaoRecebimento: null,
      },
      "op-1",
      "loja-1",
    );
    expect(resultado.ordem).toBe(venda);
    expect(resultado.avisoTaxa).toBe(
      "A venda foi faturada, mas a taxa da maquininha não foi guardada: sem permissão",
    );
  });
});

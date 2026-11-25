import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalculoTaxa, TaxaMaquininha } from "@/schemas/taxaMaquininha";

// #387: ler e salvar a tabela de taxas da loja, gravar a taxa de um
// recebimento em cartão (RPC) e ler o "Cartão a receber". O supabase é de
// mentira: cada consulta guarda os passos que a lib pediu e devolve o que o
// teste mandar.

type Passo = [string, ...unknown[]];
interface Consulta {
  tabela: string;
  passos: Passo[];
}
const consultas: Consulta[] = [];
let resposta: (c: Consulta) => { data: unknown; error: unknown } = () => ({ data: [], error: null });
const rpc = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: (tabela: string) => {
      const c: Consulta = { tabela, passos: [] };
      consultas.push(c);
      const q: Record<string, unknown> = {};
      for (const nome of ["select", "eq", "in", "gte", "order", "range", "delete", "upsert", "insert", "update"]) {
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

const { listarTaxasMaquininha, salvarTaxasMaquininha, registrarTaxaDoCartao, listarCartaoAReceber } =
  await import("./taxasMaquininha");

const passos = (c: Consulta | undefined, nome: string) => c?.passos.filter((p) => p[0] === nome) ?? [];
const primeiro = (tabela: string, comando: string) =>
  consultas.find((c) => c.tabela === tabela && c.passos.some((p) => p[0] === comando));

beforeEach(() => {
  consultas.length = 0;
  rpc.mockReset();
  resposta = () => ({ data: [], error: null });
});

const debito: TaxaMaquininha = {
  forma: "cartao_debito",
  parcelas: 1,
  taxa_percentual: 2,
  prazo_dias: 1,
  recebe_tudo_de_uma_vez: false,
};
const credito3x: TaxaMaquininha = {
  forma: "cartao_credito",
  parcelas: 3,
  taxa_percentual: 4.5,
  prazo_dias: 30,
  recebe_tudo_de_uma_vez: false,
};

describe("listarTaxasMaquininha", () => {
  it("lê só a loja pedida e devolve número como número (o numeric pode vir como texto)", async () => {
    resposta = () => ({
      data: [{ ...credito3x, taxa_percentual: "4.50", prazo_dias: "30", parcelas: 3 }],
      error: null,
    });
    expect(await listarTaxasMaquininha("loja-1")).toEqual([credito3x]);
    const c = consultas[0];
    expect(c.tabela).toBe("configuracoes_taxas_maquininha");
    expect(passos(c, "eq")).toEqual([["eq", "loja_id", "loja-1"]]);
  });

  it("tabela em branco: lista vazia", async () => {
    expect(await listarTaxasMaquininha("loja-1")).toEqual([]);
  });

  it("erro do banco sobe", async () => {
    resposta = () => ({ data: null, error: { message: "permission denied" } });
    await expect(listarTaxasMaquininha("loja-1")).rejects.toMatchObject({ message: "permission denied" });
  });
});

describe("salvarTaxasMaquininha", () => {
  it("grava as linhas que ficam (com a loja) e apaga só as que saíram, conferindo que apagou", async () => {
    resposta = (c) => {
      if (passos(c, "delete").length > 0) {
        return { data: [{ forma: "cartao_debito", parcelas: 1 }], error: null };
      }
      if (passos(c, "upsert").length > 0) return { data: null, error: null };
      // a leitura do que já estava salvo
      return { data: [debito, credito3x], error: null };
    };
    await salvarTaxasMaquininha("loja-1", [credito3x]);

    const upsert = primeiro("configuracoes_taxas_maquininha", "upsert");
    const [, linhas, opcoes] = passos(upsert, "upsert")[0] as [string, Record<string, unknown>[], unknown];
    expect(linhas).toEqual([expect.objectContaining({ ...credito3x, loja_id: "loja-1" })]);
    expect(opcoes).toMatchObject({ onConflict: "loja_id,forma,parcelas" });

    const apagar = primeiro("configuracoes_taxas_maquininha", "delete");
    expect(passos(apagar, "eq")).toEqual([
      ["eq", "loja_id", "loja-1"],
      ["eq", "forma", "cartao_debito"],
    ]);
    expect(passos(apagar, "in")).toEqual([["in", "parcelas", [1]]]);
    expect(passos(apagar, "select")).toHaveLength(1);
  });

  it("apagar que a RLS barrou (zero linhas, sem erro) vira erro em português", async () => {
    resposta = (c) => {
      if (passos(c, "delete").length > 0) return { data: [], error: null };
      if (passos(c, "upsert").length > 0) return { data: null, error: null };
      return { data: [debito], error: null };
    };
    await expect(salvarTaxasMaquininha("loja-1", [])).rejects.toThrow(/não foram apagadas/);
  });

  it("nada saiu: não apaga nada; tudo em branco e nada salvo antes: não grava nada", async () => {
    resposta = () => ({ data: [], error: null });
    await salvarTaxasMaquininha("loja-1", []);
    expect(primeiro("configuracoes_taxas_maquininha", "delete")).toBeUndefined();
    expect(primeiro("configuracoes_taxas_maquininha", "upsert")).toBeUndefined();
  });

  it("erro ao gravar sobe e não apaga nada", async () => {
    resposta = (c) => {
      if (passos(c, "upsert").length > 0) return { data: null, error: { message: "sem permissão" } };
      return { data: [debito], error: null };
    };
    await expect(salvarTaxasMaquininha("loja-1", [credito3x])).rejects.toMatchObject({
      message: "sem permissão",
    });
    expect(primeiro("configuracoes_taxas_maquininha", "delete")).toBeUndefined();
  });
});

describe("registrarTaxaDoCartao", () => {
  const calculo: Extract<CalculoTaxa, { informada: true }> = {
    informada: true,
    forma: "cartao_credito",
    parcelas: 3,
    taxaPercentual: 4,
    prazoDias: 30,
    recebeTudoDeUmaVez: false,
    valorBruto: 100.1,
    valorTaxa: 4,
    valorLiquido: 96.1,
    recebimentos: [
      { numero: 1, dataPrevista: "2026-12-18", valor: 32.03 },
      { numero: 2, dataPrevista: "2027-01-17", valor: 32.03 },
      { numero: 3, dataPrevista: "2027-02-16", valor: 32.04 },
    ],
  };

  it("manda tudo numa chamada só, com os nomes do banco", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await registrarTaxaDoCartao("mov-1", calculo);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("registrar_taxa_do_cartao", {
      p_movimento: "mov-1",
      p_forma: "cartao_credito",
      p_parcelas: 3,
      p_taxa_percentual: 4,
      p_prazo_dias: 30,
      p_recebe_tudo_de_uma_vez: false,
      p_valor_bruto: 100.1,
      p_valor_taxa: 4,
      p_valor_liquido: 96.1,
      p_recebimentos: [
        { numero: 1, data_prevista: "2026-12-18", valor: 32.03 },
        { numero: 2, data_prevista: "2027-01-17", valor: 32.03 },
        { numero: 3, data_prevista: "2027-02-16", valor: 32.04 },
      ],
    });
    expect(consultas).toHaveLength(0);
  });

  it("erro do banco sobe", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "a soma não fecha" } });
    await expect(registrarTaxaDoCartao("mov-1", calculo)).rejects.toMatchObject({
      message: "a soma não fecha",
    });
  });
});

describe("listarCartaoAReceber", () => {
  it("lê o que vai cair a partir do dia, da loja, em ordem de data, com a forma e a descrição do lançamento", async () => {
    resposta = () => ({
      data: [
        {
          id: "r1",
          movimento_id: "mov-1",
          numero: 2,
          data_prevista: "2027-01-17",
          valor: "32.03",
          taxa: {
            forma: "cartao_credito",
            parcelas: 3,
            recebe_tudo_de_uma_vez: false,
            movimento: { descricao: "Faturamento da OS 18" },
          },
        },
        {
          id: "r2",
          movimento_id: "mov-2",
          numero: 1,
          data_prevista: "2027-01-20",
          valor: 570,
          // Sem leitura do Caixa, o lançamento não vem: a descrição fica vazia.
          taxa: { forma: "cartao_credito", parcelas: 6, recebe_tudo_de_uma_vez: true, movimento: null },
        },
      ],
      error: null,
    });
    expect(await listarCartaoAReceber("loja-1", "2026-11-18")).toEqual([
      {
        id: "r1",
        movimento_id: "mov-1",
        numero: 2,
        data_prevista: "2027-01-17",
        valor: 32.03,
        forma: "cartao_credito",
        parcelas: 3,
        total_parcelas: 3,
        descricao: "Faturamento da OS 18",
      },
      {
        id: "r2",
        movimento_id: "mov-2",
        numero: 1,
        data_prevista: "2027-01-20",
        valor: 570,
        forma: "cartao_credito",
        parcelas: 6,
        total_parcelas: 1,
        descricao: null,
      },
    ]);
    const c = consultas[0];
    expect(c.tabela).toBe("caixa_cartao_a_receber");
    expect(passos(c, "eq")).toEqual([["eq", "loja_id", "loja-1"]]);
    expect(passos(c, "gte")).toEqual([["gte", "data_prevista", "2026-11-18"]]);
    // Ordem total (a lista é lida por páginas): data e, no empate, o id.
    expect(passos(c, "order").map((p) => p[1])).toEqual(["data_prevista", "id"]);
    expect(passos(c, "range")).toHaveLength(1);
  });

  it("erro do banco sobe", async () => {
    resposta = () => ({ data: null, error: { message: "permission denied" } });
    await expect(listarCartaoAReceber("loja-1", "2026-11-18")).rejects.toMatchObject({
      message: "permission denied",
    });
  });
});

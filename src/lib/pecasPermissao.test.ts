import { beforeEach, describe, expect, it, vi } from "vitest";

// #366: quem não tem o módulo Estoque lê zero linhas de `pecas` e de
// `estoque_movimentos`. O programa tem que falar com o banco pelos caminhos
// que continuam abertos: a janela, as views de saldo e as funções.
const consultas: { tabela: string; passos: string[] }[] = [];
const rpcs: { nome: string; args: unknown }[] = [];
let resposta: { data: unknown; error: { message: string } | null } = { data: [], error: null };

vi.mock("./supabase", () => ({
  supabase: {
    from(tabela: string) {
      const c = { tabela, passos: [] as string[] };
      consultas.push(c);
      const q: Record<string, unknown> = {
        select: () => (c.passos.push("select"), q),
        insert: () => (c.passos.push("insert"), q),
        eq: () => q,
        order: () => q,
        range: () => Promise.resolve(resposta),
        then: (ok: (v: unknown) => unknown) => Promise.resolve(resposta).then(ok),
      };
      return q;
    },
    rpc(nome: string, args: unknown) {
      rpcs.push({ nome, args });
      return Promise.resolve(resposta);
    },
  },
}));
vi.mock("./depositos", () => ({ buscarDepositoPadraoId: async () => "dep-1" }));

const { listarPecasJanela, buscarDadosFiscaisDasPecas, cadastrarPecaRapida } = await import("./pecas");
const { listarSaldos, registrarMovimento } = await import("./estoque");

beforeEach(() => {
  consultas.length = 0;
  rpcs.length = 0;
  resposta = { data: [], error: null };
});

describe("leitura sem o módulo Estoque", () => {
  it("a lista de peças vem da janela, nunca da tabela", async () => {
    await listarPecasJanela();
    expect(consultas.map((c) => c.tabela)).toEqual(["pecas_janela"]);
  });

  it("o saldo vem da view estoque_saldos, como mapa peça → saldo", async () => {
    resposta = { data: [{ peca_id: "p1", saldo: "7.5" }, { peca_id: "p2", saldo: -2 }], error: null };
    const saldos = await listarSaldos("loja-1");
    expect(consultas.map((c) => c.tabela)).toEqual(["estoque_saldos"]);
    expect(saldos.get("p1")).toBe(7.5);
    expect(saldos.get("p2")).toBe(-2);
  });

  it("o movimento é gravado SEM pedir a linha de volta (returning exigiria leitura)", async () => {
    await registrarMovimento(
      { peca_id: "p1", tipo: "saida", quantidade: 1, motivo: "uso_em_os", referencia: "OS 1" },
      "loja-1",
    );
    expect(consultas).toEqual([{ tabela: "estoque_movimentos", passos: ["insert"] }]);
  });

  it("dados fiscais e cadastro rápido passam por função do banco", async () => {
    resposta = { data: [{ id: "p1", ncm: "1" }], error: null };
    expect(await buscarDadosFiscaisDasPecas(["p1"])).toHaveLength(1);
    expect(await buscarDadosFiscaisDasPecas([])).toEqual([]);
    resposta = { data: "id-novo", error: null };
    expect(await cadastrarPecaRapida({ descricao: "X" } as never)).toBe("id-novo");
    expect(rpcs.map((r) => r.nome)).toEqual(["dados_fiscais_das_pecas", "cadastrar_peca_rapida"]);
  });
});

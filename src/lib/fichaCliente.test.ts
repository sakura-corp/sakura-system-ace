import { beforeEach, describe, expect, it, vi } from "vitest";

// #393: a ficha do cliente só pergunta ao banco o que a pessoa pode ver.
// Perguntar o que a RLS barra devolve VAZIO sem erro — e vazio viraria
// "R$ 0,00" na tela, como se o cliente não devesse nada.
const consultas: { tabela: string; select: string; filtros: string[] }[] = [];
let respostaPorTabela: Record<string, unknown> = {};

vi.mock("./supabase", () => ({
  supabase: {
    from(tabela: string) {
      const c = { tabela, select: "", filtros: [] as string[] };
      consultas.push(c);
      const resposta = () => {
        const data = respostaPorTabela[tabela] ?? [];
        return { data, error: null };
      };
      const q: Record<string, unknown> = {
        select: (colunas: string) => ((c.select = colunas), q),
        eq: (coluna: string, valor: string) => (c.filtros.push(`${coluna}=${valor}`), q),
        order: () => q,
        range: () => Promise.resolve(resposta()),
        maybeSingle: () => {
          const data = respostaPorTabela[tabela] ?? null;
          return Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error: null });
        },
      };
      return q;
    },
  },
}));

const { buscarFichaDoCliente } = await import("./fichaCliente");

const TUDO = { clientes: true, ordens: true, contasReceber: true };

beforeEach(() => {
  consultas.length = 0;
  respostaPorTabela = {
    clientes: { id: "c1", nome: "Carlos", telefone: "(16) 99999-0000" },
    clientes_janela: { id: "c1", nome: "Carlos" },
  };
});

function tabelas() {
  return consultas.map((c) => c.tabela).sort();
}

describe("buscarFichaDoCliente: cada parte só com o módulo dela", () => {
  it("com todos os módulos: cadastro, carros, OS e contas pelas tabelas", async () => {
    const ficha = await buscarFichaDoCliente("c1", TUDO);
    expect(tabelas()).toEqual(["clientes", "contas_receber", "ordens_servico", "veiculos"]);
    expect(ficha?.contas).toEqual([]);
    // Toda consulta é deste cliente, e nenhuma é filtrada pela loja ativa.
    for (const c of consultas) {
      expect(c.filtros.some((f) => f === "cliente_id=c1" || f === "id=c1")).toBe(true);
      expect(c.filtros.some((f) => f.startsWith("loja_id"))).toBe(false);
    }
  });

  it("sem Contas a Receber: NÃO pergunta as contas e devolve null (não lista vazia)", async () => {
    const ficha = await buscarFichaDoCliente("c1", { ...TUDO, contasReceber: false });
    expect(tabelas()).not.toContain("contas_receber");
    expect(ficha?.contas).toBeNull();
  });

  it("só com Clientes: as OS vêm pela janela, sem forma de pagamento", async () => {
    respostaPorTabela.ordens_servico_clientes = [
      {
        id: "os4",
        loja_id: "loja-a",
        numero: 4,
        tipo: "os",
        status: "faturada",
        data_abertura: "2026-10-01T13:00:00.000Z",
        data_fechamento: "2026-10-01T15:00:00.000Z",
        cliente_id: "c1",
        cliente_nome: "Carlos",
        veiculo_id: "v1",
        veiculo_placa: "ABC1D23",
        km_entrada: 1000,
        itens: [],
      },
    ];
    const ficha = await buscarFichaDoCliente("c1", {
      clientes: true,
      ordens: false,
      contasReceber: false,
    });
    expect(tabelas()).toEqual(["clientes", "ordens_servico_clientes", "veiculos"]);
    const os = consultas.find((c) => c.tabela === "ordens_servico_clientes");
    expect(os?.select).not.toContain("forma_pagamento");
    expect(ficha?.ordens[0]).toMatchObject({ id: "os4", placa: "ABC1D23" });
    expect(ficha?.ordens[0].forma_pagamento).toBeUndefined();
  });

  it("só com Ordens de Serviço: cliente e carros pelas janelas estreitas, OS pela tabela", async () => {
    const ficha = await buscarFichaDoCliente("c1", {
      clientes: false,
      ordens: true,
      contasReceber: false,
    });
    expect(tabelas()).toEqual(["clientes_janela", "ordens_servico", "veiculos_janela"]);
    expect(ficha?.cliente.telefone).toBeNull();
  });

  it("com Ordens de Serviço: a placa vem pela veiculos_janela, mesmo de carro que hoje é de outro cliente", async () => {
    respostaPorTabela.ordens_servico = [
      { id: "os1", numero: 1, status: "faturada", veiculo_id: "v-vendido", veiculo: { placa: "XYZ9A88" }, data_abertura: "2026-10-01T13:00:00.000Z", itens: [] },
    ];
    const ficha = await buscarFichaDoCliente("c1", TUDO);
    const os = consultas.find((c) => c.tabela === "ordens_servico");
    expect(os?.select).toContain("veiculo:veiculos_janela(placa)");
    expect(ficha?.ordens[0].placa).toBe("XYZ9A88");
  });

  it("orçamento vindo da tabela de OS fica de fora", async () => {
    respostaPorTabela.ordens_servico = [
      { id: "orc", numero: null, status: "orcamento", data_abertura: "2026-10-01T13:00:00.000Z", itens: [] },
      { id: "os1", numero: 1, status: "faturada", data_abertura: "2026-10-01T13:00:00.000Z", itens: [] },
    ];
    const ficha = await buscarFichaDoCliente("c1", TUDO);
    expect(ficha?.ordens.map((o) => o.id)).toEqual(["os1"]);
  });

  it("cliente que não existe: null", async () => {
    respostaPorTabela.clientes = null;
    expect(await buscarFichaDoCliente("c1", TUDO)).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resumirComissoes } from "@/schemas/comissoes";
import { clientesSumidos, resumirPorCliente } from "@/schemas/clientesSumidos";
import {
  custoDaOrdemPeloBanco,
  lucroPorMovimento,
  resumirMovimentos,
} from "@/schemas/metricasCaixa";
import type { MovimentoCaixa } from "@/types/caixa";
import type { ItemOS, OrdemServico } from "@/types/os";

// Tarefa #367 (migration 0075): as telas que não são a de OS leem uma janela
// (view) cada, e o programa monta, a partir dela, o MESMO formato de antes.
// Estes testes conferem duas coisas: (1) de qual janela cada função lê e
// quais colunas pede; (2) que os números (Caixa, lucro por lançamento,
// comissões, "clientes que sumiram") saem IDÊNTICOS aos da OS inteira.

const consultas: { tabela: string; colunas: string; filtros: string[] }[] = [];
const respostas: Record<string, unknown[]> = {};

function construtor(tabela: string) {
  const consulta = { tabela, colunas: "", filtros: [] as string[] };
  consultas.push(consulta);
  const q = {
    select(colunas: string) {
      consulta.colunas = colunas;
      return q;
    },
    eq(coluna: string, valor: unknown) {
      consulta.filtros.push(`${coluna}=${String(valor)}`);
      return q;
    },
    neq: () => q,
    order: () => q,
    range: () => q,
    then(ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) {
      return Promise.resolve({ data: respostas[tabela] ?? [], error: null }).then(ok, erro);
    },
  };
  return q;
}
vi.mock("./supabase", () => ({ supabase: { from: (t: string) => construtor(t) } }));

const { listarMovimentosCaixa } = await import("./caixa");
const { listarOrdensParaComissoes } = await import("./ordensServico");
const { listarOrdensFaturadasDosClientes } = await import("./clientesSumidos");
const { listarArquivos, listarOrdensParaNotas } = await import("./notasFiscais");

beforeEach(() => {
  consultas.length = 0;
  for (const chave of Object.keys(respostas)) delete respostas[chave];
});

// Uma OS "de verdade", como a tabela devolveria, com tudo que NÃO deve vazar.
function itemCompleto(parcial: Partial<ItemOS>): ItemOS {
  return {
    id: "it-1",
    ordem_servico_id: "os-1",
    tipo: "peca",
    peca_id: "peca-pneu",
    servico_id: null,
    tecnico_id: null,
    descricao: "Pneu 175/70",
    quantidade: 4,
    preco_unitario: 300,
    desconto: 20,
    custo_unitario: null,
    ...parcial,
  };
}

const ITENS = [
  itemCompleto({ id: "it-1" }),
  itemCompleto({
    id: "it-2",
    tipo: "servico",
    peca_id: null,
    servico_id: "serv-alinhamento",
    tecnico_id: "tec",
    descricao: "Alinhamento",
    quantidade: 1,
    preco_unitario: 120.5,
    desconto: 0,
  }),
  itemCompleto({ id: "it-3", peca_id: null, descricao: "Válvula avulsa", quantidade: 2, preco_unitario: 15.35, desconto: 0.1, custo_unitario: 7 }),
];

const OS: OrdemServico = {
  id: "os-1",
  numero: 17,
  loja_id: "loja",
  tipo: "os",
  cliente_id: "cli-a",
  veiculo_id: "v1",
  status: "faturada",
  km_entrada: 50_000,
  descricao_problema: "barulho na roda",
  forma_pagamento: "Pix",
  parcelas: 1,
  data_abertura: "2026-09-02T12:00:00.000Z",
  data_fechamento: "2026-09-03T12:00:00.000Z",
  vendedor_id: "vend",
  criado_por_id: null,
  atualizado_por_id: null,
  cliente: { nome: "Maria da Silva" },
  veiculo: { placa: "RTA4B71", marca: "Fiat", modelo: "Uno", cor: "Prata", tipo: "hatch" },
  itens: ITENS,
};

// O que o banco entrega pela janela: JSON, com só as colunas da view.
function pelaJanela<T>(valor: unknown): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

describe("Caixa pela janela ordens_servico_caixa", () => {
  const entradaDe = (id: string, valor: number, ordem: unknown) => ({
    id,
    loja_id: "loja",
    data: "2026-09-03T15:00:00Z",
    ordem_servico_id: "os-1",
    tipo: "entrada",
    forma_pagamento: "Pix",
    valor,
    descricao: null,
    categoria_id: null,
    ordem_servico: ordem,
  });

  it("pede a janela do Caixa, sem custo, descrição nem veículo", async () => {
    respostas.caixa_movimentos = [];
    await listarMovimentosCaixa("loja");
    const consulta = consultas.find((c) => c.tabela === "caixa_movimentos");
    expect(consulta?.colunas).toContain("ordens_servico_caixa(id, numero, tipo, status, cliente_nome, itens)");
    expect(consulta?.colunas).not.toContain("ordens_servico(");
    expect(consulta?.colunas).not.toMatch(/descricao|veiculo|custo/);
  });

  it("monta cliente: { nome } e deixa o resumo e o lucro por lançamento IGUAIS aos da OS inteira", async () => {
    // Pagamento dividido em dois lançamentos: é o caso mais fácil de errar.
    const completa = (id: string, valor: number): MovimentoCaixa =>
      ({ ...entradaDe(id, valor, OS) }) as unknown as MovimentoCaixa;
    const daJanela = {
      id: "os-1",
      numero: 17,
      tipo: "os",
      status: "faturada",
      cliente_nome: "Maria da Silva",
      itens: ITENS.map(({ quantidade, preco_unitario, desconto }) => ({ quantidade, preco_unitario, desconto })),
    };
    respostas.caixa_movimentos = pelaJanela([
      entradaDe("m1", 700, daJanela),
      entradaDe("m2", 500, daJanela),
    ]);

    const movimentos = await listarMovimentosCaixa("loja");

    expect(movimentos[0].ordem_servico?.cliente).toEqual({ nome: "Maria da Silva" });
    expect(movimentos[0].ordem_servico?.numero).toBe(17);
    expect(movimentos[0].ordem_servico?.tipo).toBe("os");

    const custos = custoDaOrdemPeloBanco(new Map([["os-1", { custo: 733.33, completo: true }]]));
    const antes = [completa("m1", 700), completa("m2", 500)];
    expect(resumirMovimentos(movimentos, custos)).toEqual(resumirMovimentos(antes, custos));
    expect(lucroPorMovimento(movimentos, custos)).toEqual(lucroPorMovimento(antes, custos));
    // E não é um teste que passa por não ter nada pra somar.
    expect(resumirMovimentos(movimentos, custos).entradas).toBe(1200);
    expect(lucroPorMovimento(movimentos, custos).get("m1")).not.toBe(0);
  });

  it("lançamento sem OS e OS sem cliente continuam funcionando", async () => {
    respostas.caixa_movimentos = pelaJanela([
      { ...entradaDe("m1", 10, null), ordem_servico_id: null },
      entradaDe("m2", 10, { id: "os-9", numero: 3, tipo: "venda_balcao", status: "faturada", cliente_nome: null, itens: null }),
    ]);
    const [sem, balcao] = await listarMovimentosCaixa("loja");
    expect(sem.ordem_servico).toBeNull();
    expect(balcao.ordem_servico?.cliente).toBeNull();
    expect(balcao.ordem_servico?.itens).toEqual([]);
    expect(balcao.ordem_servico?.tipo).toBe("venda_balcao");
  });
});

describe("Comissões pela janela ordens_servico_comissoes", () => {
  it("lê a janela da loja e as comissões saem IGUAIS às da OS inteira", async () => {
    const linha = {
      id: OS.id,
      numero: OS.numero,
      tipo: OS.tipo,
      status: OS.status,
      data_abertura: OS.data_abertura,
      data_fechamento: OS.data_fechamento,
      vendedor_id: OS.vendedor_id,
      cliente_nome: "Maria da Silva",
      itens: ITENS.map((i) => ({
        id: i.id, tipo: i.tipo, peca_id: i.peca_id, servico_id: i.servico_id,
        quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto: i.desconto,
        custo_unitario: i.custo_unitario, tecnico_id: i.tecnico_id,
      })),
    };
    respostas.ordens_servico_comissoes = pelaJanela([linha]);

    const ordens = await listarOrdensParaComissoes("loja");

    const consulta = consultas.find((c) => c.tabela === "ordens_servico_comissoes");
    expect(consulta?.filtros).toEqual(["loja_id=loja"]);
    // As colunas são o contrato com a view da migration 0075.
    expect(consulta?.colunas).toBe(
      "id, numero, tipo, status, data_abertura, data_fechamento, vendedor_id, cliente_nome, itens",
    );
    expect(ordens[0].cliente).toEqual({ nome: "Maria da Silva" });

    const entrada = {
      funcionarios: [
        { id: "vend", nome: "Pedro", comissao: 10 },
        { id: "tec", nome: "Marcos", comissao: 5 },
      ],
      custoPeca: new Map([["peca-pneu", 100]]),
      custoServico: new Map([["serv-alinhamento", 20]]),
      ordensAReceber: new Set<string>(),
      de: "2026-09-01",
      ate: "2026-09-30",
    };
    const depois = resumirComissoes({ ...entrada, ordens });
    const antes = resumirComissoes({ ...entrada, ordens: [OS] });
    expect(depois).toEqual(antes);
    expect(depois.find((f) => f.funcionarioId === "vend")?.comissaoTotal).toBeGreaterThan(0);
    expect(depois.find((f) => f.funcionarioId === "tec")?.comoTecnico.ordens).toHaveLength(1);
  });
});

describe("Clientes que sumiram pela janela ordens_servico_clientes", () => {
  it("monta veiculo: { placa, marca, modelo } e o resultado é IGUAL ao da OS inteira", async () => {
    respostas.ordens_servico_clientes = pelaJanela([
      {
        id: OS.id,
        cliente_id: OS.cliente_id,
        tipo: OS.tipo,
        status: OS.status,
        data_abertura: OS.data_abertura,
        data_fechamento: OS.data_fechamento,
        veiculo_placa: "RTA4B71",
        veiculo_marca: "Fiat",
        veiculo_modelo: "Uno",
        itens: ITENS.map((i) => ({ ...i, prazo_garantia_dias: null })),
      },
    ]);
    const ordens = await listarOrdensFaturadasDosClientes();
    expect(consultas[0].tabela).toBe("ordens_servico_clientes");
    expect(consultas[0].colunas).toBe(
      "id, cliente_id, tipo, status, data_abertura, data_fechamento, " +
        "veiculo_placa, veiculo_marca, veiculo_modelo, itens",
    );
    expect(ordens[0].veiculo).toEqual({ placa: "RTA4B71", marca: "Fiat", modelo: "Uno" });

    const antes = resumirPorCliente([OS as never]);
    const depois = resumirPorCliente(ordens);
    expect(depois).toEqual(antes);
    expect(depois.get("cli-a")?.totalGasto).toBeGreaterThan(0);
    expect(clientesSumidos([{ id: "cli-a" }], depois, "2026-10-28", 1)).toHaveLength(1);
  });
});

describe("Notas fiscais pelas janelas", () => {
  it("o nome do cliente da nota vem de ordens_servico_notas e vira ordem_servico.cliente.nome", async () => {
    respostas.notas_fiscais_arquivos = [
      { id: "n1", ordem_servico: { cliente_nome: "Maria da Silva" } },
      { id: "n2", ordem_servico: null },
      { id: "n3", ordem_servico: { cliente_nome: null } },
    ];
    const arquivos = await listarArquivos("nfe", "loja");
    expect(consultas[0].colunas).toContain("ordens_servico_notas(cliente_nome)");
    expect(consultas[0].colunas).not.toContain("ordens_servico(");
    expect(arquivos[0].ordem_servico?.cliente?.nome).toBe("Maria da Silva");
    expect(arquivos[1].ordem_servico).toBeNull();
    expect(arquivos[2].ordem_servico?.cliente).toBeNull();
  });

  it("o seletor 'OS relacionada' lê só id, status, abertura e cliente da janela, da loja", async () => {
    respostas.ordens_servico_notas = [
      { id: "os-1", status: "faturada", data_abertura: "2026-09-02T12:00:00Z", cliente_nome: "Maria" },
    ];
    const ordens = await listarOrdensParaNotas("loja");
    expect(consultas[0].tabela).toBe("ordens_servico_notas");
    expect(consultas[0].filtros).toEqual(["loja_id=loja"]);
    expect(ordens).toEqual([
      { id: "os-1", status: "faturada", data_abertura: "2026-09-02T12:00:00Z", cliente: { nome: "Maria" } },
    ]);
  });
});

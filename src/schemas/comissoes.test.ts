import { describe, expect, it } from "vitest";
import {
  resumirComissoes,
  totaisComissoes,
  ordensDoPeriodo,
  SEM_FUNCIONARIO,
} from "./comissoes";
import type { ItemOS, OrdemServico, StatusOS } from "@/types/os";

const CUSTO_PECA = new Map([["peca-pneu", 100]]);
const CUSTO_SERVICO = new Map([["serv-alinhamento", 20]]);

function item(parcial: Partial<ItemOS>): ItemOS {
  return {
    id: crypto.randomUUID(),
    ordem_servico_id: "os",
    tipo: "peca",
    peca_id: "peca-pneu",
    servico_id: null,
    tecnico_id: null,
    descricao: "Pneu",
    quantidade: 1,
    preco_unitario: 150,
    desconto: 0,
    ...parcial,
  };
}

function ordem(parcial: Partial<OrdemServico> = {}): OrdemServico {
  return {
    id: "os-1",
    numero: 1,
    loja_id: "loja",
    cliente_id: "cli",
    veiculo_id: null,
    status: "faturada" as StatusOS,
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento: "Pix",
    parcelas: 1,
    data_abertura: "2026-09-02T12:00:00.000Z",
    data_fechamento: "2026-09-02T12:00:00.000Z",
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    cliente: { nome: "Cliente" },
    itens: [item({})],
    ...parcial,
  };
}

const FUNCIONARIOS = [
  { id: "vend", nome: "Pedro", comissao: 10 },
  { id: "tec", nome: "Marcos", comissao: 5 },
  { id: "sem-pct", nome: "João", comissao: null },
];

function resumir(ordens: OrdemServico[], aReceber: string[] = []) {
  return resumirComissoes({
    ordens,
    funcionarios: FUNCIONARIOS,
    custoPeca: CUSTO_PECA,
    custoServico: CUSTO_SERVICO,
    ordensAReceber: new Set(aReceber),
    de: "2026-09-01",
    ate: "2026-09-30",
  });
}

describe("ordensDoPeriodo", () => {
  it("ignora OS que ainda não foi faturada", () => {
    const abertas = [ordem({ status: "em_andamento" }), ordem({ status: "concluida" })];
    expect(ordensDoPeriodo(abertas, "2026-09-01", "2026-09-30")).toHaveLength(0);
  });

  it("filtra pela data do faturamento, não pela de abertura", () => {
    // Aberta em agosto, faturada em setembro: conta em setembro.
    const tardia = ordem({
      data_abertura: "2026-08-20T12:00:00.000Z",
      data_fechamento: "2026-09-03T12:00:00.000Z",
    });
    expect(ordensDoPeriodo([tardia], "2026-09-01", "2026-09-30")).toHaveLength(1);
    expect(ordensDoPeriodo([tardia], "2026-08-01", "2026-08-31")).toHaveLength(0);
  });

  it("usa a data de abertura quando a OS antiga não tem data de faturamento", () => {
    const semFechamento = ordem({
      data_abertura: "2026-09-05T12:00:00.000Z",
      data_fechamento: null,
    });
    expect(ordensDoPeriodo([semFechamento], "2026-09-01", "2026-09-30")).toHaveLength(1);
  });

  it("não perde OS faturada à noite (fuso horário)", () => {
    // 22h49 de 30/09 no Brasil (UTC-3) é 01/10 em UTC. Cortar a string do
    // timestamp pegaria o dia em UTC e jogaria essa OS pra fora do mês —
    // é o bug do item 34 da seção 6, que já fez OS sumir da lista.
    // O fuso é fixado aqui porque a máquina de teste roda em UTC, onde o
    // erro não apareceria.
    const fusoOriginal = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      const aNoite = ordem({ data_fechamento: "2026-10-01T01:49:00.000Z" });
      expect(ordensDoPeriodo([aNoite], "2026-09-01", "2026-09-30")).toHaveLength(1);
      // O corte ingênuo da string veria "2026-10-01" e perderia a OS.
      expect(aNoite.data_fechamento!.slice(0, 10)).toBe("2026-10-01");
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });
});

// Orçamento (#379) não é venda: não paga comissão, nem aberto nem recusado.
describe("orçamento no meio dos dados", () => {
  it("não entra na comissão de ninguém", () => {
    const os = ordem({ id: "os-1", vendedor_id: "vend" });
    const orcamentos = [
      ordem({
        id: "orc-1",
        numero: null,
        numero_orcamento: 45,
        status: "orcamento",
        vendedor_id: "vend",
        itens: [item({ preco_unitario: 1000, tecnico_id: "tec" })],
      }),
      ordem({
        id: "orc-2",
        numero: null,
        numero_orcamento: 46,
        status: "recusado",
        vendedor_id: "vend",
        itens: [item({ preco_unitario: 1000, tecnico_id: "tec" })],
      }),
    ];
    const linhas = resumir([os, ...orcamentos]);
    const pedro = linhas.find((l) => l.funcionarioId === "vend")!;
    // Só a OS: vendeu 150, custo 100, lucro 50, 10% = 5.
    expect(pedro.comoVendedor.vendido).toBe(150);
    expect(pedro.comissaoTotal).toBe(5);
    expect(pedro.comoVendedor.ordens.map((o) => o.ordemId)).toEqual(["os-1"]);
    expect(linhas.find((l) => l.funcionarioId === "tec")).toBeUndefined();
  });
});

describe("resumirComissoes", () => {
  it("dá ao vendedor a comissão sobre o lucro da OS inteira", () => {
    // Pneu vendido a 150 com custo 100 => lucro 50; 10% => 5.
    const linhas = resumir([ordem({ vendedor_id: "vend" })]);
    const silvio = linhas.find((l) => l.funcionarioId === "vend")!;

    expect(silvio.comoVendedor.vendido).toBe(150);
    expect(silvio.comoVendedor.custo).toBe(100);
    expect(silvio.comoVendedor.lucro).toBe(50);
    expect(silvio.comoVendedor.comissao).toBe(5);
    expect(silvio.comissaoTotal).toBe(5);
  });

  it("desconta o desconto do item antes de calcular o lucro", () => {
    const comDesconto = ordem({
      vendedor_id: "vend",
      itens: [item({ desconto: 30 })],
    });
    const silvio = resumir([comDesconto]).find((l) => l.funcionarioId === "vend")!;
    expect(silvio.comoVendedor.vendido).toBe(120);
    expect(silvio.comoVendedor.lucro).toBe(20);
    expect(silvio.comoVendedor.comissao).toBe(2);
  });

  it("dá ao técnico só os itens que ele executou, não a OS inteira", () => {
    const mista = ordem({
      vendedor_id: "vend",
      itens: [
        item({ tecnico_id: "tec" }), // pneu: lucro 50
        item({
          tipo: "servico",
          peca_id: null,
          servico_id: "serv-alinhamento",
          descricao: "Alinhamento",
          preco_unitario: 80,
          tecnico_id: null,
        }), // serviço: lucro 60, sem técnico
      ],
    });
    const linhas = resumir([mista]);
    const marcos = linhas.find((l) => l.funcionarioId === "tec")!;
    const silvio = linhas.find((l) => l.funcionarioId === "vend")!;

    // Técnico: só o pneu (lucro 50, 5% => 2,50).
    expect(marcos.comoTecnico.vendido).toBe(150);
    expect(marcos.comoTecnico.lucro).toBe(50);
    expect(marcos.comoTecnico.comissao).toBe(2.5);
    // Vendedor: a OS inteira (lucro 110, 10% => 11).
    expect(silvio.comoVendedor.lucro).toBe(110);
    expect(silvio.comoVendedor.comissao).toBe(11);
  });

  it("soma os dois papéis quando é a mesma pessoa que vendeu e executou", () => {
    const sozinho = ordem({ vendedor_id: "vend", itens: [item({ tecnico_id: "vend" })] });
    const silvio = resumir([sozinho]).find((l) => l.funcionarioId === "vend")!;
    expect(silvio.comoVendedor.comissao).toBe(5);
    expect(silvio.comoTecnico.comissao).toBe(5);
    expect(silvio.comissaoTotal).toBe(10);
    // Mas o lucro é o da OS, contado uma vez só — 50, não 100.
    expect(silvio.lucroTotal).toBe(50);
    expect(silvio.vendidoTotal).toBe(150);
  });

  it("soma o lucro de OS diferentes, mesmo quando o papel muda de uma pra outra", () => {
    const vendeu = ordem({ id: "a", numero: 1, vendedor_id: "vend" });
    const soExecutou = ordem({
      id: "b",
      numero: 2,
      vendedor_id: "tec",
      itens: [item({ tecnico_id: "vend", preco_unitario: 250 })],
    });
    const silvio = resumir([vendeu, soExecutou]).find((l) => l.funcionarioId === "vend")!;

    // OS 1 como vendedor (lucro 50) + OS 2 como técnico (lucro 150) = 200.
    // Pegar só o maior dos dois papéis perderia uma das OS.
    expect(silvio.lucroTotal).toBe(200);
    expect(silvio.vendidoTotal).toBe(400);
  });

  it("junta numa linha própria a venda sem vendedor/técnico definido", () => {
    const linhas = resumir([ordem({ vendedor_id: null })]);
    const semDono = linhas.find((l) => l.funcionarioId === SEM_FUNCIONARIO)!;
    expect(semDono.nome).toBe("Sem funcionário definido");
    expect(semDono.comoVendedor.lucro).toBe(50);
    expect(semDono.comissaoTotal).toBe(0);
    // E fica sempre por último na lista, é aviso de cadastro faltando.
    expect(linhas[linhas.length - 1].funcionarioId).toBe(SEM_FUNCIONARIO);
  });

  it("deixa a comissão zerada quando o funcionário não tem porcentagem cadastrada", () => {
    const linhas = resumir([ordem({ vendedor_id: "sem-pct" })]);
    const joao = linhas.find((l) => l.funcionarioId === "sem-pct")!;
    expect(joao.percentual).toBeNull();
    expect(joao.comoVendedor.lucro).toBe(50);
    expect(joao.comissaoTotal).toBe(0);
  });

  it("separa a comissão que veio de OS ainda não recebida", () => {
    const aPrazo = ordem({ id: "os-prazo", vendedor_id: "vend" });
    const linhas = resumir([aPrazo], ["os-prazo"]);
    const silvio = linhas.find((l) => l.funcionarioId === "vend")!;
    expect(silvio.comoVendedor.comissao).toBe(5);
    expect(silvio.comoVendedor.comissaoAReceber).toBe(5);
    expect(silvio.comoVendedor.ordens[0].aReceber).toBe(true);
  });

  it("conta os itens que entraram sem custo cadastrado", () => {
    // Peça fora do mapa de custo e serviço avulso: os dois viram lucro cheio.
    const semCusto = ordem({
      vendedor_id: "vend",
      itens: [
        item({ peca_id: "peca-nao-cadastrada" }),
        item({ tipo: "servico", peca_id: null, servico_id: null, preco_unitario: 40 }),
      ],
    });
    const silvio = resumir([semCusto]).find((l) => l.funcionarioId === "vend")!;
    expect(silvio.comoVendedor.itensSemCusto).toBe(2);
    expect(silvio.comoVendedor.custo).toBe(0);
    expect(silvio.comoVendedor.lucro).toBe(190);
  });

  // #655: peça avulsa (sem peca_id) usa o custo digitado no orçamento.
  it("peça avulsa com custo digitado entra com esse custo e não conta como sem custo", () => {
    const comCusto = ordem({
      vendedor_id: "vend",
      itens: [item({ peca_id: null, descricao: "Farol", preco_unitario: 150, custo_unitario: 60 })],
    });
    const silvio = resumir([comCusto]).find((l) => l.funcionarioId === "vend")!;
    // 150 − 60 = 90 de lucro; 10% => 9.
    expect(silvio.comoVendedor.custo).toBe(60);
    expect(silvio.comoVendedor.lucro).toBe(90);
    expect(silvio.comoVendedor.comissao).toBe(9);
    expect(silvio.comoVendedor.itensSemCusto).toBe(0);
  });

  it("peça avulsa sem custo digitado conta como sem custo", () => {
    const semCusto = ordem({
      vendedor_id: "vend",
      itens: [item({ peca_id: null, descricao: "Farol", custo_unitario: null }), item({})],
    });
    const silvio = resumir([semCusto]).find((l) => l.funcionarioId === "vend")!;
    expect(silvio.comoVendedor.itensSemCusto).toBe(1);
  });

  it("lista as OS que formaram o número, pra poder conferir", () => {
    const duas = [
      ordem({ id: "a", numero: 7, vendedor_id: "vend" }),
      ordem({ id: "b", numero: 8, vendedor_id: "vend" }),
    ];
    const silvio = resumir(duas).find((l) => l.funcionarioId === "vend")!;
    expect(silvio.comoVendedor.ordens.map((o) => o.numero)).toEqual([7, 8]);
    expect(silvio.comoVendedor.comissao).toBe(10);
  });
});

describe("totaisComissoes", () => {
  it("conta o lucro uma vez por OS, mas soma a comissão dos dois papéis", () => {
    const mesmaOrdem = ordem({ vendedor_id: "vend", itens: [item({ tecnico_id: "tec" })] });
    const totais = totaisComissoes(resumir([mesmaOrdem]));

    // Lucro da OS: 50 (não 100 — não pode contar vendedor + técnico).
    expect(totais.lucro).toBe(50);
    // Comissão: 10% do vendedor + 5% do técnico = 7,50 (dinheiro diferente).
    expect(totais.comissao).toBe(7.5);
  });

  it("soma à parte a comissão presa em OS ainda não recebida", () => {
    const linhas = resumir(
      [
        ordem({ id: "paga", vendedor_id: "vend" }),
        ordem({ id: "prazo", numero: 2, vendedor_id: "vend" }),
      ],
      ["prazo"],
    );
    const totais = totaisComissoes(linhas);
    expect(totais.comissao).toBe(10);
    expect(totais.comissaoAReceber).toBe(5);
  });
});

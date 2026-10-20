import { describe, expect, it } from "vitest";
import { clientesSumidos, resumirPorCliente, subtrairMeses } from "./clientesSumidos";
import type { OrdemDoCliente, ResumoDoCliente } from "./clientesSumidos";

type Item = NonNullable<OrdemDoCliente["itens"]>[number];

function item(campos: Partial<Item> = {}): Item {
  return { tipo: "servico", descricao: "Alinhamento", quantidade: 1, preco_unitario: 100, desconto: 0, ...campos };
}

let proximoId = 1;
function ordem(campos: Partial<OrdemDoCliente> = {}): OrdemDoCliente {
  return {
    id: `os-${proximoId++}`,
    cliente_id: "cli-a",
    tipo: "os",
    status: "faturada",
    data_abertura: "2026-03-10T13:00:00.000Z",
    data_fechamento: "2026-03-10T15:00:00.000Z",
    veiculo: { placa: "AAA1A11", marca: "Marca X", modelo: "Modelo Y" },
    itens: [item()],
    ...campos,
  };
}

describe("subtrairMeses", () => {
  it("volta os meses mantendo o dia", () => {
    expect(subtrairMeses("2026-10-30", 6)).toBe("2026-04-30");
  });

  it("atravessa a virada do ano", () => {
    expect(subtrairMeses("2026-03-15", 6)).toBe("2025-09-15");
    expect(subtrairMeses("2026-01-10", 1)).toBe("2025-12-10");
  });

  it("prende no último dia do mês quando o dia não existe lá", () => {
    expect(subtrairMeses("2026-08-31", 6)).toBe("2026-02-28");
    expect(subtrairMeses("2026-07-31", 1)).toBe("2026-06-30");
  });

  it("respeita o 29 de fevereiro do ano bissexto", () => {
    expect(subtrairMeses("2028-08-31", 6)).toBe("2028-02-29");
  });
});

describe("resumirPorCliente", () => {
  it("soma a OS e a venda de balcão faturadas, no centavo exato", () => {
    // 150,10 + 0,20 em ponto flutuante dá 150,29999999999998.
    const resumo = resumirPorCliente([
      ordem({ itens: [item({ preco_unitario: 150.1 })] }),
      ordem({
        tipo: "venda_balcao",
        veiculo: null,
        itens: [item({ tipo: "peca", descricao: "Válvula", preco_unitario: 0.2 })],
      }),
    ]).get("cli-a")!;
    expect(resumo.totalGasto).toBe(150.3);
  });

  it("desconta o desconto do item e multiplica pela quantidade", () => {
    const resumo = resumirPorCliente([
      ordem({ itens: [item({ quantidade: 4, preco_unitario: 50, desconto: 15 })] }),
    ]).get("cli-a")!;
    expect(resumo.totalGasto).toBe(185);
  });

  it("não conta ordem em andamento nem concluída (nem no total, nem na visita)", () => {
    const resumos = resumirPorCliente([
      ordem({ data_fechamento: "2026-03-10T15:00:00.000Z", itens: [item({ preco_unitario: 80 })] }),
      ordem({
        status: "em_andamento",
        data_abertura: "2026-09-01T13:00:00.000Z",
        data_fechamento: null,
        itens: [item({ preco_unitario: 1000 })],
      }),
      ordem({
        tipo: "venda_balcao",
        status: "concluida",
        data_fechamento: "2026-09-02T13:00:00.000Z",
        itens: [item({ tipo: "peca", preco_unitario: 500 })],
      }),
    ]);
    const resumo = resumos.get("cli-a")!;
    expect(resumo.totalGasto).toBe(80);
    expect(resumo.ultimaVisita).toBe("2026-03-10");
  });

  it("cliente só com ordem não faturada fica sem resumo", () => {
    const resumos = resumirPorCliente([ordem({ cliente_id: "cli-b", status: "concluida" })]);
    expect(resumos.has("cli-b")).toBe(false);
  });

  it("separa os clientes", () => {
    const resumos = resumirPorCliente([
      ordem({ cliente_id: "cli-a", itens: [item({ preco_unitario: 10 })] }),
      ordem({ cliente_id: "cli-b", itens: [item({ preco_unitario: 20 })] }),
    ]);
    expect(resumos.get("cli-a")!.totalGasto).toBe(10);
    expect(resumos.get("cli-b")!.totalGasto).toBe(20);
    expect(resumos.get("cli-b")!.clienteId).toBe("cli-b");
  });

  it("a última visita é a ordem faturada mais recente, comparando a hora também", () => {
    // Duas no mesmo dia: a das 18h (Brasília) é a última. A mais cedo vem
    // primeiro na lista de propósito: comparando só o dia, o empate ficaria
    // com ela, e o teste pega isso.
    const resumo = resumirPorCliente([
      ordem({
        data_fechamento: "2026-03-10T12:00:00.000Z",
        itens: [item({ descricao: "Rodízio" })],
      }),
      ordem({
        data_fechamento: "2026-03-10T21:00:00.000Z",
        itens: [item({ descricao: "Balanceamento" })],
      }),
    ]).get("cli-a")!;
    expect(resumo.ultimoServico).toBe("Balanceamento");
  });

  it("usa a data de abertura quando a ordem faturada não tem data de fechamento", () => {
    const resumo = resumirPorCliente([
      ordem({ data_abertura: "2026-02-03T15:00:00.000Z", data_fechamento: null }),
    ]).get("cli-a")!;
    expect(resumo.ultimaVisita).toBe("2026-02-03");
  });

  it("último serviço: só os serviços da última ordem, juntados por vírgula", () => {
    const resumo = resumirPorCliente([
      ordem({
        itens: [
          item({ descricao: "Alinhamento" }),
          item({ tipo: "peca", descricao: "Pneu" }),
          item({ descricao: "Balanceamento" }),
        ],
      }),
    ]).get("cli-a")!;
    expect(resumo.ultimoServico).toBe("Alinhamento, Balanceamento");
  });

  it("último serviço: venda de balcão sem serviço mostra as peças; sem itens, nada", () => {
    const comPeca = resumirPorCliente([
      ordem({
        tipo: "venda_balcao",
        itens: [item({ tipo: "peca", descricao: "Pneu" }), item({ tipo: "peca", descricao: "Válvula" })],
      }),
    ]).get("cli-a")!;
    expect(comPeca.ultimoServico).toBe("Pneu, Válvula");

    const semItens = resumirPorCliente([ordem({ itens: [] })]).get("cli-a")!;
    expect(semItens.ultimoServico).toBeNull();
  });

  it("veículo: o da última ordem que tem veículo, mesmo que a última seja de balcão", () => {
    const resumo = resumirPorCliente([
      ordem({
        data_fechamento: "2026-03-01T15:00:00.000Z",
        veiculo: { placa: "AAA1A11", marca: "Marca X", modelo: null },
      }),
      ordem({
        data_fechamento: "2026-02-01T15:00:00.000Z",
        veiculo: { placa: "BBB2B22", marca: "Marca Z", modelo: "Modelo W" },
      }),
      ordem({ tipo: "venda_balcao", data_fechamento: "2026-04-01T15:00:00.000Z", veiculo: null }),
    ]).get("cli-a")!;
    expect(resumo.veiculo).toBe("Marca X");
  });

  it("veículo: sem marca nem modelo vira a placa; sem veículo nenhum, nada", () => {
    const soPlaca = resumirPorCliente([
      ordem({ veiculo: { placa: "CCC3C33", marca: null, modelo: null } }),
    ]).get("cli-a")!;
    expect(soPlaca.veiculo).toBe("CCC3C33");

    const semVeiculo = resumirPorCliente([ordem({ tipo: "venda_balcao", veiculo: null })]).get("cli-a")!;
    expect(semVeiculo.veiculo).toBeNull();
  });

  it("ordem faturada às 22h30 de 30/04 no Brasil conta como visita de 30/04 (fuso)", () => {
    // 22h30 de 30/04 em Brasília (UTC-3) já é 01/05 em UTC. Cortar a string
    // daria "2026-05-01" — o erro de fuso dos itens 34 e 42 de docs/licoes.md.
    // O fuso é fixado aqui porque a máquina de teste pode rodar em UTC.
    const fusoOriginal = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      const resumo = resumirPorCliente([ordem({ data_fechamento: "2026-05-01T01:30:00.000Z" })]).get("cli-a")!;
      expect(resumo.ultimaVisita).toBe("2026-04-30");
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });
});

function resumo(clienteId: string, ultimaVisita: string, totalGasto: number): ResumoDoCliente {
  return { clienteId, ultimaVisita, totalGasto, ultimoServico: null, veiculo: null };
}

function mapa(...resumos: ResumoDoCliente[]): Map<string, ResumoDoCliente> {
  return new Map(resumos.map((r) => [r.clienteId, r]));
}

const ids = (lista: { cliente: { id: string } }[]) => lista.map((linha) => linha.cliente.id);

describe("clientesSumidos", () => {
  const clientes = [
    { id: "cli-a", nome: "Cliente A" },
    { id: "cli-b", nome: "Cliente B" },
    { id: "cli-c", nome: "Cliente C" },
  ];

  it("só entra quem veio ANTES do limite: exatamente 6 meses atrás ainda não conta", () => {
    // Hoje 30/10, 6 meses → limite 30/04. Quem veio em 30/04 faz 6 meses
    // hoje, não "mais de 6".
    const lista = clientesSumidos(
      clientes,
      mapa(resumo("cli-a", "2026-04-30", 100), resumo("cli-b", "2026-04-29", 100), resumo("cli-c", "2026-10-01", 100)),
      "2026-10-30",
      6,
    );
    expect(ids(lista)).toEqual(["cli-b"]);
  });

  it("devolve o cliente inteiro junto do resumo", () => {
    const lista = clientesSumidos(clientes, mapa(resumo("cli-b", "2025-01-01", 70)), "2026-10-30", 6);
    expect(lista).toEqual([{ cliente: { id: "cli-b", nome: "Cliente B" }, resumo: resumo("cli-b", "2025-01-01", 70) }]);
  });

  it("cliente que nunca veio (sem ordem faturada) não aparece", () => {
    const lista = clientesSumidos(clientes, mapa(resumo("cli-a", "2025-01-01", 50)), "2026-10-30", 6);
    expect(ids(lista)).toEqual(["cli-a"]);
  });

  it("ordena por quem mais gastou; no empate, quem sumiu há mais tempo primeiro", () => {
    const lista = clientesSumidos(
      [...clientes, { id: "cli-d", nome: "Cliente D" }],
      mapa(
        resumo("cli-a", "2025-06-01", 300),
        resumo("cli-b", "2025-01-01", 900.5),
        resumo("cli-c", "2025-03-01", 300),
        resumo("cli-d", "2025-03-01", 300),
      ),
      "2026-10-30",
      6,
    );
    expect(ids(lista)).toEqual(["cli-b", "cli-c", "cli-d", "cli-a"]);
  });

  it("meses inválido vira pelo menos 1, arredondado pra baixo", () => {
    const resumos = mapa(
      resumo("cli-a", "2026-09-29", 10),
      resumo("cli-b", "2026-08-29", 10),
      // Veio há 15 dias: só entraria se o 0 fosse levado ao pé da letra.
      resumo("cli-c", "2026-10-15", 10),
    );
    // 0, -3 e NaN viram 1 → limite 30/09: entram cli-a e cli-b, cli-c não.
    expect(ids(clientesSumidos(clientes, resumos, "2026-10-30", 0))).toEqual(["cli-b", "cli-a"]);
    expect(ids(clientesSumidos(clientes, resumos, "2026-10-30", -3))).toEqual(["cli-b", "cli-a"]);
    // 2,7 vira 2 → limite 30/08: só cli-b.
    expect(ids(clientesSumidos(clientes, resumos, "2026-10-30", 2.7))).toEqual(["cli-b"]);
    expect(ids(clientesSumidos(clientes, resumos, "2026-10-30", Number.NaN))).toEqual(["cli-b", "cli-a"]);
  });

  it("na fronteira do fuso: faturada às 22h30 de 30/04 (Brasília) não é sumida; às 22h30 de 29/04, é", () => {
    // Sem diaLocal, a de 30/04 à noite viraria 01/05 e a de 29/04 viraria
    // 30/04 — e nenhuma das duas entraria na lista.
    const fusoOriginal = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      const resumos = resumirPorCliente([
        ordem({ cliente_id: "cli-a", data_fechamento: "2026-05-01T01:30:00.000Z" }),
        ordem({ cliente_id: "cli-b", data_fechamento: "2026-04-30T01:30:00.000Z" }),
      ]);
      expect(ids(clientesSumidos(clientes, resumos, "2026-10-30", 6))).toEqual(["cli-b"]);
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });
});

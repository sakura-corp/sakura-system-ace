import { describe, expect, it } from "vitest";
import {
  DIAS_DE_ANTECEDENCIA,
  listaDeRetornos,
  proximoRetornoDoVeiculo,
  retornosPrevistos,
  somarDias,
} from "./retornos";
import { diasEntre } from "@/lib/datas";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { ItemParaRetorno, OrdemParaRetorno, RetornoPrevisto, ServicoComIntervalo } from "./retornos";

let proximoId = 1;

function item(campos: Partial<ItemParaRetorno> = {}): ItemParaRetorno {
  return {
    id: `item-${proximoId++}`,
    tipo: "servico",
    peca_id: null,
    descricao: "Troca de óleo",
    quantidade: 1,
    preco_unitario: 100,
    desconto: 0,
    servico_id: "oleo",
    ...campos,
  };
}

const CARRO = { placa: "ABC1D23", marca: "Fiat", modelo: "Uno" };

/** Uma OS faturada do carro "v1", da cliente "cli-a", com a troca de óleo. */
function ordem(campos: Partial<OrdemParaRetorno> = {}): OrdemParaRetorno {
  return {
    id: `os-${proximoId++}`,
    numero: proximoId,
    tipo: "os",
    loja_id: "loja-1",
    cliente_id: "cli-a",
    status: "faturada",
    km_entrada: null,
    // 15h em UTC = meio-dia no Brasil: o mesmo dia nos dois fusos.
    data_abertura: "2026-06-01T13:00:00.000Z",
    data_fechamento: "2026-06-01T15:00:00.000Z",
    veiculo_id: "v1",
    veiculo: CARRO,
    itens: [item()],
    ...campos,
  };
}

function servico(campos: Partial<ServicoComIntervalo> = {}): ServicoComIntervalo {
  return { id: "oleo", descricao: "Troca de óleo", intervalo_dias: 180, intervalo_km: null, ...campos };
}

describe("somarDias", () => {
  it("soma dentro do mês", () => {
    expect(somarDias("2026-11-10", 1)).toBe("2026-11-11");
    expect(somarDias("2026-11-10", 0)).toBe("2026-11-10");
  });

  it("atravessa a virada do mês e do ano", () => {
    expect(somarDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-11-10", 180)).toBe("2027-05-09");
  });

  it("respeita fevereiro, bissexto ou não", () => {
    expect(somarDias("2026-02-28", 1)).toBe("2026-03-01");
    expect(somarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("atravessa a mudança de horário de verão sem perder dia", () => {
    // O Brasil já teve horário de verão começando em outubro/novembro: um dia
    // de 23 horas não pode fazer a soma cair no dia errado.
    expect(somarDias("2018-11-03", 1)).toBe("2018-11-04");
    expect(somarDias("2018-11-04", 1)).toBe("2018-11-05");
  });

  it("aceita dias negativos", () => {
    expect(somarDias("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("retornosPrevistos", () => {
  it("só por dias: a última OS faturada mais o intervalo", () => {
    const os = ordem({ km_entrada: 40_000 });
    expect(retornosPrevistos([os], [servico()], "2026-11-10")).toEqual([
      {
        veiculoId: "v1",
        clienteId: "cli-a",
        placa: "ABC1D23",
        veiculo: "Fiat Uno",
        servicoId: "oleo",
        servico: "Troca de óleo",
        ordemId: os.id,
        ultimoDia: "2026-06-01",
        kmNaUltima: 40_000,
        prevista: "2026-11-28",
        estimadoPeloKm: false,
        diasDeAtraso: -18,
      },
    ]);
  });

  it("OS não faturada, orçamento e orçamento recusado nunca contam", () => {
    const ordens = [
      ordem({ status: "em_andamento" }),
      ordem({ status: "concluida" }),
      ordem({ status: "orcamento" }),
      ordem({ status: "recusado" }),
    ];
    expect(retornosPrevistos(ordens, [servico()], "2026-11-10")).toEqual([]);
  });

  it("uma OS em andamento depois não tira o retorno da faturada", () => {
    const faturada = ordem();
    const aberta = ordem({
      status: "em_andamento",
      data_abertura: "2026-10-01T13:00:00.000Z",
      data_fechamento: null,
    });
    const [retorno] = retornosPrevistos([faturada, aberta], [servico()], "2026-11-10");
    expect(retorno.ordemId).toBe(faturada.id);
  });

  it("OS sem veículo não gera retorno", () => {
    expect(retornosPrevistos([ordem({ veiculo_id: null, veiculo: null })], [servico()], "2026-11-10")).toEqual([]);
  });

  it("o Consumidor nunca entra", () => {
    expect(
      retornosPrevistos([ordem({ cliente_id: CLIENTE_CONSUMIDOR_ID })], [servico()], "2026-11-10"),
    ).toEqual([]);
  });

  it("item digitado à mão (sem servico_id) não conta, mesmo com a descrição igual", () => {
    const os = ordem({ itens: [item({ servico_id: null }), item({ servico_id: undefined })] });
    expect(retornosPrevistos([os], [servico()], "2026-11-10")).toEqual([]);
  });

  it("peça com o mesmo id de um serviço não conta", () => {
    const os = ordem({ itens: [item({ tipo: "peca", servico_id: "oleo" })] });
    expect(retornosPrevistos([os], [servico()], "2026-11-10")).toEqual([]);
  });

  it("serviço sem intervalo (nulo ou zero) não conta", () => {
    const os = ordem();
    expect(
      retornosPrevistos([os], [servico({ intervalo_dias: null, intervalo_km: null })], "2026-11-10"),
    ).toEqual([]);
    expect(retornosPrevistos([os], [servico({ intervalo_dias: 0, intervalo_km: 0 })], "2026-11-10")).toEqual(
      [],
    );
  });

  describe("pelo km rodado", () => {
    // Duas visitas com KM, 150 dias e 15.000 km uma da outra: 3.000 km por
    // mês, 100 por dia. A primeira não tem serviço com intervalo.
    const visitaAntiga = () =>
      ordem({
        km_entrada: 25_000,
        data_abertura: "2026-01-02T13:00:00.000Z",
        data_fechamento: "2026-01-02T15:00:00.000Z",
        itens: [],
      });
    const comKm = () => ordem({ km_entrada: 40_000 });

    it("só km, com rodagem estimada: 5.000 km a 100 por dia são 50 dias", () => {
      const [retorno] = retornosPrevistos(
        [visitaAntiga(), comKm()],
        [servico({ intervalo_dias: null, intervalo_km: 5_000 })],
        "2026-11-10",
      );
      expect(retorno.prevista).toBe("2026-07-21");
      expect(retorno.estimadoPeloKm).toBe(true);
      expect(retorno.kmNaUltima).toBe(40_000);
      expect(retorno.diasDeAtraso).toBe(112);
    });

    it("só km, sem rodagem (uma visita com KM só): o retorno não sai", () => {
      expect(
        retornosPrevistos([comKm()], [servico({ intervalo_dias: null, intervalo_km: 5_000 })], "2026-11-10"),
      ).toEqual([]);
    });

    it("só km, com rodagem mas a OS base sem KM: o retorno não sai", () => {
      const semKm = ordem({ km_entrada: null, data_abertura: "2026-06-01T13:00:00.000Z" });
      const meio = ordem({
        km_entrada: 33_000,
        data_abertura: "2026-03-02T13:00:00.000Z",
        data_fechamento: "2026-03-02T15:00:00.000Z",
        itens: [],
      });
      expect(
        retornosPrevistos(
          [visitaAntiga(), meio, semKm],
          [servico({ intervalo_dias: null, intervalo_km: 5_000 })],
          "2026-11-10",
        ),
      ).toEqual([]);
    });

    it("dias e km, o km vence antes: vale o km", () => {
      const [retorno] = retornosPrevistos(
        [visitaAntiga(), comKm()],
        [servico({ intervalo_dias: 180, intervalo_km: 10_000 })],
        "2026-11-10",
      );
      expect(retorno.prevista).toBe("2026-09-09");
      expect(retorno.estimadoPeloKm).toBe(true);
    });

    it("dias e km, os dias vencem antes: vale os dias", () => {
      const [retorno] = retornosPrevistos(
        [visitaAntiga(), comKm()],
        [servico({ intervalo_dias: 60, intervalo_km: 10_000 })],
        "2026-11-10",
      );
      expect(retorno.prevista).toBe("2026-07-31");
      expect(retorno.estimadoPeloKm).toBe(false);
    });

    it("dias e km no mesmo dia: conta como pelos dias", () => {
      const [retorno] = retornosPrevistos(
        [visitaAntiga(), comKm()],
        [servico({ intervalo_dias: 100, intervalo_km: 10_000 })],
        "2026-11-10",
      );
      expect(retorno.prevista).toBe("2026-09-09");
      expect(retorno.estimadoPeloKm).toBe(false);
    });

    it("dias e km com a rodagem indisponível: vale só os dias", () => {
      const [retorno] = retornosPrevistos(
        [comKm()],
        [servico({ intervalo_dias: 180, intervalo_km: 1_000 })],
        "2026-11-10",
      );
      expect(retorno.prevista).toBe("2026-11-28");
      expect(retorno.estimadoPeloKm).toBe(false);
    });

    it("sem KM anotado em nenhuma visita: vale os dias, e o KM fica vazio", () => {
      const [retorno] = retornosPrevistos(
        [ordem()],
        [servico({ intervalo_dias: 180, intervalo_km: 1_000 })],
        "2026-11-10",
      );
      expect(retorno.prevista).toBe("2026-11-28");
      expect(retorno.kmNaUltima).toBeNull();
      expect(retorno.estimadoPeloKm).toBe(false);
    });

    it("a rodagem só usa as OS faturadas do mesmo carro", () => {
      // Um orçamento com KM e a OS de outro carro não podem inventar rodagem.
      const orcamento = ordem({
        status: "orcamento",
        km_entrada: 25_000,
        data_abertura: "2026-01-02T13:00:00.000Z",
        data_fechamento: null,
        itens: [],
      });
      const outroCarro = ordem({
        veiculo_id: "v2",
        km_entrada: 25_000,
        data_abertura: "2026-01-02T13:00:00.000Z",
        data_fechamento: "2026-01-02T15:00:00.000Z",
        itens: [],
      });
      expect(
        retornosPrevistos(
          [orcamento, outroCarro, comKm()],
          [servico({ intervalo_dias: null, intervalo_km: 5_000 })],
          "2026-11-10",
        ),
      ).toEqual([]);
    });
  });

  it("uma OS faturada depois com o mesmo serviço tira o retorno antigo", () => {
    const antiga = ordem();
    const nova = ordem({
      data_abertura: "2026-09-01T13:00:00.000Z",
      data_fechamento: "2026-09-01T15:00:00.000Z",
    });
    // A nova vem antes na lista de propósito: a ordem da lista não decide.
    const retornos = retornosPrevistos([nova, antiga], [servico()], "2026-11-10");
    expect(retornos).toHaveLength(1);
    expect(retornos[0].ordemId).toBe(nova.id);
    expect(retornos[0].prevista).toBe("2027-02-28");
  });

  it("a última é pelo faturamento, não pela abertura", () => {
    // Aberta antes, mas faturada depois: é ela a última.
    const abertaAntes = ordem({
      data_abertura: "2026-05-20T13:00:00.000Z",
      data_fechamento: "2026-06-10T15:00:00.000Z",
    });
    const abertaDepois = ordem({
      data_abertura: "2026-06-01T13:00:00.000Z",
      data_fechamento: "2026-06-02T15:00:00.000Z",
    });
    const [retorno] = retornosPrevistos([abertaAntes, abertaDepois], [servico()], "2026-11-10");
    expect(retorno.ordemId).toBe(abertaAntes.id);
    expect(retorno.ultimoDia).toBe("2026-06-10");
  });

  it("um retorno por serviço e por carro", () => {
    const os = ordem({ itens: [item(), item({ servico_id: "alinhamento", descricao: "Alinhamento" })] });
    const outroCarro = ordem({ veiculo_id: "v2", veiculo: { placa: "XYZ9K87", marca: null, modelo: null } });
    const retornos = retornosPrevistos(
      [os, outroCarro],
      [servico(), servico({ id: "alinhamento", descricao: "Alinhamento", intervalo_dias: 90 })],
      "2026-11-10",
    );
    expect(retornos.map((r) => `${r.placa} ${r.servicoId} ${r.prevista}`).sort()).toEqual([
      "ABC1D23 alinhamento 2026-08-30",
      "ABC1D23 oleo 2026-11-28",
      "XYZ9K87 oleo 2026-11-28",
    ]);
    // Sem marca nem modelo, o carro é chamado pela placa.
    expect(retornos.find((r) => r.veiculoId === "v2")?.veiculo).toBe("XYZ9K87");
  });

  it("vira o ano na soma dos dias", () => {
    const os = ordem({
      data_abertura: "2026-12-20T13:00:00.000Z",
      data_fechamento: "2026-12-20T15:00:00.000Z",
    });
    const [retorno] = retornosPrevistos([os], [servico({ intervalo_dias: 15 })], "2026-12-20");
    expect(retorno.prevista).toBe("2027-01-04");
    expect(retorno.diasDeAtraso).toBe(-15);
  });

  it("OS faturada às 22h30 de 30/04 no Brasil conta a partir de 30/04 (fuso)", () => {
    // 22h30 de 30/04 em Brasília já é 01/05 em UTC: cortar a string daria
    // 01/05 e o retorno sairia um dia atrasado (itens 34 e 42 de docs/licoes.md).
    const fusoOriginal = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      const os = ordem({
        data_abertura: "2026-04-30T20:00:00.000Z",
        data_fechamento: "2026-05-01T01:30:00.000Z",
      });
      const [retorno] = retornosPrevistos([os], [servico({ intervalo_dias: 1 })], "2026-04-30");
      expect(retorno.ultimoDia).toBe("2026-04-30");
      expect(retorno.prevista).toBe("2026-05-01");
      expect(retorno.diasDeAtraso).toBe(-1);
    } finally {
      process.env.TZ = fusoOriginal;
    }
  });
});

function retorno(campos: Partial<RetornoPrevisto> = {}): RetornoPrevisto {
  return {
    veiculoId: "v1",
    clienteId: "cli-a",
    placa: "ABC1D23",
    veiculo: "Fiat Uno",
    servicoId: "oleo",
    servico: "Troca de óleo",
    ordemId: "os-1",
    ultimoDia: "2026-06-01",
    kmNaUltima: null,
    prevista: "2026-11-10",
    estimadoPeloKm: false,
    diasDeAtraso: 0,
    ...campos,
  };
}

const HOJE = "2026-11-10";
/** Um retorno com a prevista e o atraso coerentes com HOJE. */
const previsto = (prevista: string, campos: Partial<RetornoPrevisto> = {}) =>
  retorno({ prevista, diasDeAtraso: diasEntre(prevista, HOJE), ...campos });

const clientes = [
  { id: "cli-a", nome: "Ana", nao_avisar: false },
  { id: "cli-b", nome: "Bia", nao_avisar: null },
  { id: "cli-c", nome: "Caio", nao_avisar: true },
];

describe("listaDeRetornos", () => {
  it("avisa com 7 dias de antecedência", () => {
    expect(DIAS_DE_ANTECEDENCIA).toBe(7);
  });

  it("separa os atrasados dos desta semana; o que vence hoje e o do 7º dia entram na semana", () => {
    const lista = listaDeRetornos(
      [
        previsto("2026-11-09", { servicoId: "atrasado-1-dia" }),
        previsto("2026-11-10", { servicoId: "vence-hoje" }),
        previsto("2026-11-17", { servicoId: "setimo-dia" }),
        previsto("2026-11-18", { servicoId: "oitavo-dia" }),
      ],
      clientes,
      HOJE,
    );
    expect(lista.atrasados.map((l) => l.retorno.servicoId)).toEqual(["atrasado-1-dia"]);
    expect(lista.estaSemana.map((l) => l.retorno.servicoId)).toEqual(["vence-hoje", "setimo-dia"]);
    expect(lista.atrasados[0].cliente.nome).toBe("Ana");
  });

  it("aceita outra janela de dias", () => {
    const lista = listaDeRetornos([previsto("2026-11-12")], clientes, HOJE, 1);
    expect(lista.estaSemana).toEqual([]);
  });

  it("cliente que pediu pra não ser avisado some da lista", () => {
    const lista = listaDeRetornos(
      [previsto("2026-11-01", { clienteId: "cli-c" }), previsto("2026-11-12", { clienteId: "cli-c" })],
      clientes,
      HOJE,
    );
    expect(lista).toEqual({ atrasados: [], estaSemana: [] });
  });

  it("nao_avisar nulo (banco sem a coluna preenchida) conta como avisar", () => {
    const lista = listaDeRetornos([previsto("2026-11-01", { clienteId: "cli-b" })], clientes, HOJE);
    expect(lista.atrasados.map((l) => l.cliente.id)).toEqual(["cli-b"]);
  });

  it("cliente que não está na lista não entra, e o Consumidor nunca", () => {
    const lista = listaDeRetornos(
      [
        previsto("2026-11-01", { clienteId: "cli-desconhecido" }),
        previsto("2026-11-01", { clienteId: CLIENTE_CONSUMIDOR_ID }),
      ],
      [...clientes, { id: CLIENTE_CONSUMIDOR_ID, nome: "Consumidor", nao_avisar: false }],
      HOJE,
    );
    expect(lista).toEqual({ atrasados: [], estaSemana: [] });
  });

  it("do mais atrasado pro menos; empate pela placa e depois pelo serviço", () => {
    const lista = listaDeRetornos(
      [
        previsto("2026-11-05", { placa: "BBB2B22", servicoId: "oleo" }),
        previsto("2026-10-01", { placa: "ZZZ9Z99", servicoId: "oleo" }),
        previsto("2026-11-05", { placa: "AAA1A11", servicoId: "oleo" }),
        previsto("2026-11-05", { placa: "AAA1A11", servicoId: "alinhamento" }),
      ],
      clientes,
      HOJE,
    );
    expect(lista.atrasados.map((l) => `${l.retorno.placa} ${l.retorno.servicoId}`)).toEqual([
      "ZZZ9Z99 oleo",
      "AAA1A11 alinhamento",
      "AAA1A11 oleo",
      "BBB2B22 oleo",
    ]);
  });

  it("intervalo de 1 dia faturado hoje: prevista amanhã, na lista desta semana", () => {
    const os = ordem({
      data_abertura: "2026-11-10T13:00:00.000Z",
      data_fechamento: "2026-11-10T15:00:00.000Z",
    });
    const retornos = retornosPrevistos([os], [servico({ intervalo_dias: 1 })], HOJE);
    expect(retornos[0].prevista).toBe("2026-11-11");
    const lista = listaDeRetornos(retornos, clientes, HOJE);
    expect(lista.atrasados).toEqual([]);
    expect(lista.estaSemana.map((l) => l.retorno.prevista)).toEqual(["2026-11-11"]);
  });
});

describe("proximoRetornoDoVeiculo", () => {
  it("o de prevista mais cedo daquele carro", () => {
    const retornos = [
      previsto("2026-12-01", { servicoId: "oleo" }),
      previsto("2026-11-20", { servicoId: "alinhamento" }),
      previsto("2026-10-01", { veiculoId: "v2", servicoId: "oleo" }),
    ];
    expect(proximoRetornoDoVeiculo(retornos, "v1")?.servicoId).toBe("alinhamento");
  });

  it("carro sem retorno: nada", () => {
    expect(proximoRetornoDoVeiculo([previsto("2026-12-01")], "v9")).toBeNull();
  });
});

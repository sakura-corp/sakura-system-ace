import { describe, expect, it } from "vitest";
import {
  DIAS_CONTA_PAGAR_VENCENDO,
  DIAS_OS_PARADA,
  LIMITE_POR_TIPO,
  ORDEM_DAS_PENDENCIAS,
  limitarPorTipo,
  mensagemDaListaVazia,
  montarCentralDoDia,
  alcanceDaCentral,
  marcadoresDaCobranca,
  marcadoresDoCarroPronto,
  marcadoresDaContabilidade,
  mesDoPacote,
  type EntradaCentralDoDia,
} from "./centralDoDia";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import type { MovimentoCaixa } from "@/types/caixa";
import type { FechamentoCaixa } from "@/types/fechamentoCaixa";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { ModuloChave } from "@/types/operador";

// Meio-dia local: longe da meia-noite, pra o dia não mudar com o fuso.
function instante(dia: string, hora = "12:00:00"): string {
  return new Date(`${dia}T${hora}`).toISOString();
}

const todos = () => true;
const so = (...modulos: ModuloChave[]) => (m: ModuloChave) => modulos.includes(m);

function vazia(hoje: string): EntradaCentralDoDia {
  return {
    hoje,
    notasComErro: [],
    movimentos: [],
    fechamentos: [],
    contasReceber: [],
    ordens: [],
    contasPagar: [],
    pecas: [],
    saldos: new Map(),
  };
}

function ordem(parcial: Partial<OrdemServico>): OrdemServico {
  return {
    id: "os",
    numero: 1,
    tipo: "os",
    status: "em_andamento",
    data_abertura: instante("2026-11-01"),
    data_fechamento: null,
    cliente: { nome: "Cliente" },
    veiculo: { placa: "ABC1D23", marca: "Fiat", modelo: "Uno", cor: null, tipo: null },
    itens: [],
    ...parcial,
  } as unknown as OrdemServico;
}

function contaReceber(parcial: Partial<ContaReceber>): ContaReceber {
  return {
    id: "cr",
    cliente_id: "c1",
    descricao: "OS 1",
    valor: 100,
    vencimento: "2026-11-01",
    status: "pendente",
    cliente: { nome: "Cliente" },
    ...parcial,
  } as ContaReceber;
}

function contaPagar(parcial: Partial<ContaPagar>): ContaPagar {
  return {
    id: "cp",
    descricao: "Aluguel",
    valor: 1000,
    vencimento: "2026-11-05",
    status: "pendente",
    ...parcial,
  } as ContaPagar;
}

function peca(parcial: Partial<Peca>): Peca {
  return { id: "p1", descricao: "Pneu 175/70", estoque_minimo: 4, ativo: true, ...parcial } as Peca;
}

function movimento(dia: string): MovimentoCaixa {
  return { id: `m-${dia}`, data: instante(dia) } as MovimentoCaixa;
}

function fechamento(dia: string): FechamentoCaixa {
  return { id: `f-${dia}`, data: dia } as FechamentoCaixa;
}

function nota(parcial: Partial<NotaFiscalArquivo>): NotaFiscalArquivo {
  return {
    id: "n1",
    tipo: "nfe",
    origem: "automatica",
    numero: "12",
    status: "erro_autorizacao",
    criado_em: instante("2026-11-02"),
    ...parcial,
  } as NotaFiscalArquivo;
}

describe("montarCentralDoDia: a ordem", () => {
  it("põe um de cada tipo na ordem decidida pela Sofia (22/10)", () => {
    // Dia 3: ainda dentro da janela das notas (até 7) e do extrato (até 10).
    const entrada: EntradaCentralDoDia = {
      ...vazia("2026-11-03"),
      notasComErro: [nota({})],
      movimentos: [movimento("2026-11-02")],
      contasReceber: [contaReceber({ vencimento: "2026-11-01" })],
      ordens: [
        ordem({ id: "pronta", status: "concluida", data_fechamento: null }),
        ordem({ id: "parada", status: "em_andamento", data_abertura: instante("2026-10-30") }),
      ],
      contasPagar: [contaPagar({ vencimento: "2026-11-04" })],
      pecas: [peca({ estoque_minimo: 4 })],
      saldos: new Map([["p1", 2]]),
    };

    const tipos = montarCentralDoDia(entrada, todos).map((p) => p.tipo);

    expect(tipos).toEqual(ORDEM_DAS_PENDENCIAS);
    expect(ORDEM_DAS_PENDENCIAS).toEqual([
      "nota_com_erro",
      "caixa_sem_fechar",
      "conta_receber_vencida",
      "carro_pronto",
      "conta_pagar_vencendo",
      "os_parada",
      "estoque_baixo",
      "contabilidade_notas",
      "contabilidade_extrato",
    ]);
  });

  it("dentro do mesmo tipo, a mais antiga vem primeiro", () => {
    const entrada: EntradaCentralDoDia = {
      ...vazia("2026-11-20"),
      contasReceber: [
        contaReceber({ id: "nova", vencimento: "2026-11-10" }),
        contaReceber({ id: "velha", vencimento: "2026-10-01" }),
      ],
    };
    const chaves = montarCentralDoDia(entrada, todos).map((p) => p.chave);
    expect(chaves).toEqual(["conta_receber_vencida:velha", "conta_receber_vencida:nova"]);
  });

  it("lista vazia quando não há nada pendente (fora do dia 1 ao 10)", () => {
    expect(montarCentralDoDia(vazia("2026-11-20"), todos)).toEqual([]);
  });
});

describe("montarCentralDoDia: os limites", () => {
  it("OS parada: só a partir de 3 dias sem mexer", () => {
    expect(DIAS_OS_PARADA).toBe(3);
    const hoje = "2026-11-20";
    const com = (dias: number) =>
      montarCentralDoDia(
        {
          ...vazia(hoje),
          ordens: [ordem({ data_abertura: instante(`2026-11-${20 - dias}`) })],
        },
        todos,
      ).map((p) => p.tipo);
    expect(com(2)).toEqual([]);
    expect(com(3)).toEqual(["os_parada"]);
  });

  it("OS concluída ou faturada não é OS parada", () => {
    const entrada = {
      ...vazia("2026-11-20"),
      ordens: [
        ordem({ id: "f", status: "faturada", data_abertura: instante("2026-11-01") }),
        ordem({ id: "o", status: "orcamento", data_abertura: instante("2026-11-01") }),
      ],
    };
    expect(montarCentralDoDia(entrada, todos)).toEqual([]);
  });

  it("conta a pagar: entra até 3 dias pra frente, e a vencida também", () => {
    expect(DIAS_CONTA_PAGAR_VENCENDO).toBe(3);
    const entrada = {
      ...vazia("2026-11-20"),
      contasPagar: [
        contaPagar({ id: "vencida", vencimento: "2026-11-18" }),
        contaPagar({ id: "dia3", vencimento: "2026-11-23" }),
        contaPagar({ id: "dia4", vencimento: "2026-11-24" }),
        contaPagar({ id: "paga", vencimento: "2026-11-21", status: "paga" }),
      ],
    };
    expect(montarCentralDoDia(entrada, todos).map((p) => p.chave)).toEqual([
      "conta_pagar_vencendo:vencida",
      "conta_pagar_vencendo:dia3",
    ]);
  });

  it("conta a receber: só a vencida (a de hoje ainda não venceu) e só a pendente", () => {
    const entrada = {
      ...vazia("2026-11-20"),
      contasReceber: [
        contaReceber({ id: "ontem", vencimento: "2026-11-19" }),
        contaReceber({ id: "hoje", vencimento: "2026-11-20" }),
        contaReceber({ id: "recebida", vencimento: "2026-11-01", status: "recebido" }),
      ],
    };
    expect(montarCentralDoDia(entrada, todos).map((p) => p.chave)).toEqual([
      "conta_receber_vencida:ontem",
    ]);
  });

  it("pacote da contabilidade: notas do dia 1 ao 7, extrato do dia 1 ao 10", () => {
    const tipos = (dia: string) =>
      montarCentralDoDia(vazia(`2026-11-${dia}`), todos).map((p) => p.tipo);
    expect(tipos("01")).toEqual(["contabilidade_notas", "contabilidade_extrato"]);
    expect(tipos("07")).toEqual(["contabilidade_notas", "contabilidade_extrato"]);
    expect(tipos("08")).toEqual(["contabilidade_extrato"]);
    expect(tipos("10")).toEqual(["contabilidade_extrato"]);
    expect(tipos("11")).toEqual([]);
  });

  it("o pacote fala do mês anterior, inclusive na virada do ano", () => {
    const [notas] = montarCentralDoDia(vazia("2027-01-05"), todos);
    expect(notas.titulo).toContain("dezembro");
  });

  it("carro pronto: OS concluída entra; faturada e venda de balcão não", () => {
    const entrada = {
      ...vazia("2026-11-20"),
      ordens: [
        ordem({ id: "pronta", status: "concluida" }),
        ordem({ id: "faturada", status: "faturada" }),
        ordem({ id: "balcao", status: "concluida", tipo: "venda_balcao" }),
      ],
    };
    expect(montarCentralDoDia(entrada, todos).map((p) => p.chave)).toEqual([
      "carro_pronto:pronta",
    ]);
  });

  it("estoque: entra a peça no mínimo ou abaixo; sem mínimo, inativa ou negativa, não", () => {
    const entrada = {
      ...vazia("2026-11-20"),
      pecas: [
        peca({ id: "no-minimo", estoque_minimo: 4 }),
        peca({ id: "sem-saldo", estoque_minimo: 2 }),
        peca({ id: "folga", estoque_minimo: 2 }),
        peca({ id: "sem-minimo", estoque_minimo: null }),
        peca({ id: "inativa", estoque_minimo: 4, ativo: false }),
        peca({ id: "negativa", estoque_minimo: 4 }),
      ],
      saldos: new Map([
        ["no-minimo", 4],
        ["folga", 5],
        ["sem-minimo", 0],
        ["inativa", 0],
        ["negativa", -1],
      ]),
    };
    expect(montarCentralDoDia(entrada, todos).map((p) => p.chave).sort()).toEqual([
      "estoque_baixo:no-minimo",
      "estoque_baixo:sem-saldo",
    ]);
  });

  it("nota: só a que voltou com erro; autorizada, cancelada e manual não", () => {
    const entrada = {
      ...vazia("2026-11-20"),
      notasComErro: [
        nota({ id: "erro" }),
        nota({ id: "denegada", status: "denegado" }),
        nota({ id: "ok", status: "autorizado" }),
        nota({ id: "cancelada", status: "cancelado" }),
        nota({ id: "manual", origem: "manual", status: null }),
      ],
    };
    expect(montarCentralDoDia(entrada, todos).map((p) => p.chave)).toEqual([
      "nota_com_erro:erro",
      "nota_com_erro:denegada",
    ]);
  });
});

describe("montarCentralDoDia: o caixa sem fechar", () => {
  it("avisa o caixa de ontem que teve movimento e não foi fechado", () => {
    const entrada = { ...vazia("2026-11-20"), movimentos: [movimento("2026-11-19")] };
    const [pendencia] = montarCentralDoDia(entrada, todos);
    expect(pendencia.tipo).toBe("caixa_sem_fechar");
    expect(pendencia.titulo).toContain("ontem");
  });

  it("caixa fechado não aparece", () => {
    const entrada = {
      ...vazia("2026-11-20"),
      movimentos: [movimento("2026-11-19")],
      fechamentos: [fechamento("2026-11-19")],
    };
    expect(montarCentralDoDia(entrada, todos)).toEqual([]);
  });

  it("dia sem movimento não é caixa sem fechar (a loja não abriu no domingo)", () => {
    expect(montarCentralDoDia(vazia("2026-11-16"), todos)).toEqual([]);
  });

  it("na segunda, olha o sábado quando o domingo não teve movimento", () => {
    // 16/11/2026 é segunda.
    const entrada = { ...vazia("2026-11-16"), movimentos: [movimento("2026-11-14")] };
    const [pendencia] = montarCentralDoDia(entrada, todos);
    expect(pendencia?.tipo).toBe("caixa_sem_fechar");
    expect(pendencia.titulo).toContain("14/11");
  });

  it("o movimento de hoje não conta: o dia ainda não acabou", () => {
    const entrada = { ...vazia("2026-11-20"), movimentos: [movimento("2026-11-20")] };
    expect(montarCentralDoDia(entrada, todos)).toEqual([]);
  });

  it("usa o dia local, não o UTC: 22h30 do dia 19 ainda é dia 19", () => {
    // No Brasil, 22h30 do dia 19 já é dia 20 em UTC: cortando a data em UTC,
    // o movimento viraria "de hoje" e o aviso sumiria.
    const entrada = {
      ...vazia("2026-11-20"),
      movimentos: [{ id: "m", data: instante("2026-11-19", "22:30:00") } as MovimentoCaixa],
    };
    const pendencias = montarCentralDoDia(entrada, todos);
    expect(pendencias.map((p) => p.chave)).toEqual(["caixa_sem_fechar:2026-11-19"]);
  });
});

describe("montarCentralDoDia: sem o módulo, a linha não aparece", () => {
  const cheia: EntradaCentralDoDia = {
    ...vazia("2026-11-03"),
    notasComErro: [nota({})],
    movimentos: [movimento("2026-11-02")],
    contasReceber: [contaReceber({})],
    ordens: [ordem({ id: "pronta", status: "concluida" }), ordem({ data_abertura: instante("2026-10-20") })],
    contasPagar: [contaPagar({ vencimento: "2026-11-04" })],
    pecas: [peca({})],
    saldos: new Map([["p1", 0]]),
  };

  it.each([
    ["notas_fiscais", ["nota_com_erro", "contabilidade_notas"]],
    ["caixa", ["caixa_sem_fechar", "contabilidade_extrato"]],
    ["contas_receber", ["conta_receber_vencida"]],
    ["ordens_servico", ["carro_pronto", "os_parada"]],
    ["contas_pagar", ["conta_pagar_vencendo"]],
    ["estoque", ["estoque_baixo"]],
  ] as [ModuloChave, string[]][])("só com %s, só aparece %j", (modulo, esperado) => {
    const tipos = [...new Set(montarCentralDoDia(cheia, so(modulo)).map((p) => p.tipo))];
    expect(tipos).toEqual(esperado);
  });

  it("sem módulo nenhum, nada aparece", () => {
    expect(montarCentralDoDia(cheia, () => false)).toEqual([]);
  });
});

describe("alcanceDaCentral e a lista vazia", () => {
  it("quem tem todos os módulos vê tudo", () => {
    expect(alcanceDaCentral(todos)).toEqual({ mostra: true, parcial: false });
  });

  it("quem tem só alguns vê a central, marcada como parcial", () => {
    expect(alcanceDaCentral(so("caixa"))).toEqual({ mostra: true, parcial: true });
  });

  it("quem não tem nenhum não vê a central (nada de '0 pendências')", () => {
    expect(alcanceDaCentral(so("clientes")).mostra).toBe(false);
  });

  it("lista vazia diz 'nada pendente hoje', e diz quando é só do que a pessoa vê", () => {
    expect(mensagemDaListaVazia(false)).toBe("Nada pendente hoje.");
    expect(mensagemDaListaVazia(true)).toBe(
      "Nada pendente hoje nas áreas que você pode ver.",
    );
  });
});

describe("limitarPorTipo", () => {
  it(`mostra no máximo ${LIMITE_POR_TIPO} de cada tipo e conta o resto`, () => {
    const contas = Array.from({ length: LIMITE_POR_TIPO + 2 }, (_, i) =>
      contaReceber({ id: `c${i}`, vencimento: `2026-10-${String(i + 1).padStart(2, "0")}` }),
    );
    const pendencias = montarCentralDoDia(
      { ...vazia("2026-11-20"), contasReceber: contas, movimentos: [movimento("2026-11-19")] },
      todos,
    );
    const { visiveis, escondidas } = limitarPorTipo(pendencias);
    expect(visiveis).toHaveLength(LIMITE_POR_TIPO + 1);
    expect(escondidas.get("conta_receber_vencida")).toBe(2);
    expect(escondidas.has("caixa_sem_fechar")).toBe(false);
  });
});

describe("os textos das linhas", () => {
  it("carro pronto: a idade é a da abertura (a OS não guarda quando foi concluída)", () => {
    const [p] = montarCentralDoDia(
      {
        ...vazia("2026-11-20"),
        ordens: [ordem({ status: "concluida", data_abertura: instante("2026-11-10"), data_fechamento: null })],
      },
      todos,
    );
    expect(p.detalhe).toContain("OS aberta há 10 dias");
  });

  it("estoque: quantidade com vírgula", () => {
    const [p] = montarCentralDoDia(
      { ...vazia("2026-11-20"), pecas: [peca({ estoque_minimo: 2.5 })], saldos: new Map([["p1", 1.5]]) },
      todos,
    );
    expect(p.detalhe).toBe("tem 1,5, o mínimo é 2,5");
  });
});

describe("as mensagens de WhatsApp", () => {
  it("cobrança: vencimento no dia certo, sem cair no dia anterior pelo fuso", () => {
    const m = marcadoresDaCobranca(contaReceber({ vencimento: "2026-11-01", valor: 150 }), "Loja");
    expect(m.vencimento).toBe("01/11/2026");
    expect(m.cliente).toBe("Cliente");
    expect(m.loja).toBe("Loja");
  });

  it("carro pronto: total da OS pelos itens, e veículo pela marca e modelo", () => {
    const m = marcadoresDoCarroPronto(
      ordem({
        status: "concluida",
        numero: 7,
        itens: [
          { quantidade: 2, preco_unitario: 100, desconto: 10 },
        ] as unknown as OrdemServico["itens"],
      }),
      "Loja",
    );
    expect(m.veiculo).toBe("Fiat Uno");
    expect(m.placa).toBe("ABC1D23");
    expect(m.valor).toMatch(/190,00/);
  });
});

describe("mesDoPacote (#383)", () => {
  it("é o mês anterior ao de hoje, no formato AAAA-MM", () => {
    expect(mesDoPacote("2026-11-05")).toBe("2026-10");
    expect(mesDoPacote("2026-03-01")).toBe("2026-02");
  });
  it("em janeiro volta pra dezembro do ano anterior", () => {
    expect(mesDoPacote("2027-01-03")).toBe("2026-12");
  });
});

describe("marcadoresDaContabilidade (#383)", () => {
  it("troca contador, loja e mês por extenso", () => {
    expect(marcadoresDaContabilidade("Marta", "Loja Centro", "2026-10")).toEqual({
      contador: "Marta",
      loja: "Loja Centro",
      mes: "outubro de 2026",
    });
  });
});

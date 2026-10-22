import { afterEach, describe, expect, it, vi } from "vitest";
import {
  baixaEstoqueAoLancarItem,
  contarOrcamentosAbertos,
  custoUnitarioDoItem,
  lucroDaOrdem,
  TEXTO_CUSTO_NAO_INFORMADO,
  MOTIVO_RECUSA_LABEL,
  MOTIVOS_RECUSA,
  contaNosNumeros,
  ehOrcamento,
  ehPecaAvulsa,
  pecasAvulsas,
  pendenciasDaAprovacao,
  vinculosDaAprovacao,
  orcamentoVencido,
  podeAprovar,
  podeRecusar,
  transicaoPermitida,
  validadePadrao,
  VALIDADE_PADRAO_DIAS,
  valoresMensagemOrcamento,
} from "./orcamento";
import type { CaminhoAvulsa } from "./orcamento";
import { modeloPorChave, preencherModelo } from "./whatsapp";

// Orçamento é uma etapa da OS (#379): mora na mesma tabela, mas não é venda.
// `contaNosNumeros` é a regra única que todo lugar que soma ou lista OS usa.
describe("contaNosNumeros", () => {
  it("OS e venda de balcão contam, em qualquer status de OS", () => {
    expect(contaNosNumeros({ status: "em_andamento" })).toBe(true);
    expect(contaNosNumeros({ status: "concluida" })).toBe(true);
    expect(contaNosNumeros({ status: "faturada" })).toBe(true);
  });

  it("orçamento aberto e orçamento recusado não contam", () => {
    expect(contaNosNumeros({ status: "orcamento" })).toBe(false);
    expect(contaNosNumeros({ status: "recusado" })).toBe(false);
  });

  it("ehOrcamento é o contrário", () => {
    expect(ehOrcamento({ status: "orcamento" })).toBe(true);
    expect(ehOrcamento({ status: "recusado" })).toBe(true);
    expect(ehOrcamento({ status: "faturada" })).toBe(false);
  });
});

describe("estoque", () => {
  it("item lançado em orçamento não baixa estoque; em OS baixa", () => {
    expect(baixaEstoqueAoLancarItem("orcamento")).toBe(false);
    expect(baixaEstoqueAoLancarItem("recusado")).toBe(false);
    expect(baixaEstoqueAoLancarItem("em_andamento")).toBe(true);
    expect(baixaEstoqueAoLancarItem("concluida")).toBe(true);
    expect(baixaEstoqueAoLancarItem("faturada")).toBe(true);
  });
});

describe("aprovar e recusar", () => {
  it("só orçamento aberto pode ser aprovado ou recusado", () => {
    expect(podeAprovar({ status: "orcamento" })).toBe(true);
    expect(podeRecusar({ status: "orcamento" })).toBe(true);
    for (const status of ["recusado", "em_andamento", "concluida", "faturada"] as const) {
      expect(podeAprovar({ status })).toBe(false);
      expect(podeRecusar({ status })).toBe(false);
    }
  });
});

describe("transicaoPermitida", () => {
  it("orçamento aprovado vira OS em andamento; recusado vira recusado", () => {
    expect(transicaoPermitida("orcamento", "em_andamento")).toBe(true);
    expect(transicaoPermitida("orcamento", "recusado")).toBe(true);
  });

  it("orçamento não pula direto pra concluída nem faturada", () => {
    expect(transicaoPermitida("orcamento", "concluida")).toBe(false);
    expect(transicaoPermitida("orcamento", "faturada")).toBe(false);
  });

  it("recusado é o fim: não volta a orçamento nem vira OS", () => {
    for (const para of ["orcamento", "em_andamento", "concluida", "faturada"] as const) {
      expect(transicaoPermitida("recusado", para)).toBe(false);
    }
  });

  it("OS nunca volta a ser orçamento (já tem número de OS)", () => {
    for (const de of ["em_andamento", "concluida", "faturada"] as const) {
      expect(transicaoPermitida(de, "orcamento")).toBe(false);
      expect(transicaoPermitida(de, "recusado")).toBe(false);
    }
  });

  it("o caminho da OS de sempre continua valendo", () => {
    expect(transicaoPermitida("em_andamento", "concluida")).toBe(true);
    expect(transicaoPermitida("concluida", "faturada")).toBe(true);
  });
});

// Dia de calendário (#379): o orçamento vale até o fim do dia da validade,
// no fuso da loja. Pegar "hoje" com toISOString().slice daria o dia de UTC,
// e um orçamento que vale até hoje apareceria vencido das 21h em diante
// (docs/licoes.md, itens 34 e 42).
describe("validade", () => {
  const fusoOriginal = process.env.TZ;
  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = fusoOriginal;
  });

  it("o padrão é 7 dias a partir de hoje", () => {
    expect(VALIDADE_PADRAO_DIAS).toBe(7);
    expect(validadePadrao("2026-10-22")).toBe("2026-10-29");
  });

  it("atravessa mês, ano e fevereiro de ano bissexto", () => {
    expect(validadePadrao("2026-10-28")).toBe("2026-11-04");
    expect(validadePadrao("2026-12-28")).toBe("2027-01-04");
    expect(validadePadrao("2028-02-25")).toBe("2028-03-03");
  });

  it("não perde nem ganha um dia com o horário de verão", () => {
    process.env.TZ = "America/New_York";
    expect(validadePadrao("2026-03-05")).toBe("2026-03-12");
    expect(validadePadrao("2026-10-30")).toBe("2026-11-06");
  });

  it("vale até o fim do dia da validade; vence no dia seguinte", () => {
    expect(orcamentoVencido("2026-10-22", "2026-10-21")).toBe(false);
    expect(orcamentoVencido("2026-10-22", "2026-10-22")).toBe(false);
    expect(orcamentoVencido("2026-10-22", "2026-10-23")).toBe(true);
    expect(orcamentoVencido("2026-12-31", "2027-01-01")).toBe(true);
  });

  it("sem validade gravada (banco antigo), nunca aparece vencido", () => {
    expect(orcamentoVencido(null, "2026-10-23")).toBe(false);
    expect(orcamentoVencido(undefined, "2026-10-23")).toBe(false);
  });

  it("às 22h30 em São Paulo ainda é hoje: o orçamento que vale até hoje não venceu", () => {
    process.env.TZ = "America/Sao_Paulo";
    vi.useFakeTimers();
    // 22h30 do dia 22/10 em São Paulo = 01h30 do dia 23/10 em UTC.
    vi.setSystemTime(new Date("2026-10-23T01:30:00.000Z"));
    expect(orcamentoVencido("2026-10-22")).toBe(false);
    expect(validadePadrao()).toBe("2026-10-29");
  });

  it("o mesmo instante, numa máquina em UTC, já é dia 23", () => {
    process.env.TZ = "UTC";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-23T01:30:00.000Z"));
    expect(orcamentoVencido("2026-10-22")).toBe(true);
    expect(validadePadrao()).toBe("2026-10-30");
  });
});

describe("recusa", () => {
  it("os motivos são os cinco da tarefa, com o nome que aparece na tela", () => {
    expect(MOTIVOS_RECUSA.map((m) => MOTIVO_RECUSA_LABEL[m])).toEqual([
      "Preço",
      "Prazo",
      "Foi em outro lugar",
      "Desistiu",
      "Outro",
    ]);
    // O mesmo texto que o banco aceita (check da migration 0065).
    expect([...MOTIVOS_RECUSA]).toEqual(["preco", "prazo", "outro_lugar", "desistiu", "outro"]);
  });
});

describe("contarOrcamentosAbertos (o número ao lado de Orçamentos no menu)", () => {
  it("conta só orçamento aberto: nem recusado, nem OS", () => {
    expect(
      contarOrcamentosAbertos([
        { status: "orcamento" },
        { status: "orcamento" },
        { status: "recusado" },
        { status: "em_andamento" },
        { status: "faturada" },
      ]),
    ).toBe(2);
    expect(contarOrcamentosAbertos([])).toBe(0);
  });
});

// O texto aprovado na tarefa #379, preenchido do jeito que a tela vai usar.
describe("mensagem de WhatsApp do orçamento", () => {
  it("modelo padrão, preenchido, sai igual ao texto aprovado", () => {
    const texto = preencherModelo(
      modeloPorChave("orcamento").padrao,
      valoresMensagemOrcamento(
        {
          numero: null,
          numero_orcamento: 45,
          status: "orcamento",
          validade: "2026-10-29",
          cliente: { nome: "Ricardo" },
          veiculo: { placa: "RTA4B71", marca: "Volkswagen", modelo: "Gol", cor: null, tipo: null },
          itens: [
            { quantidade: 4, preco_unitario: 300, desconto: 20 },
            { quantidade: 1, preco_unitario: 80, desconto: 0 },
          ],
        },
        "Pneus Amigão",
      ),
    );
    expect(texto).toBe(
      "Olá, Ricardo! Segue o orçamento 45 da Pneus Amigão para o Volkswagen Gol: R$\u00a01.260,00. " +
        "Vale até 29/10/2026.\nQualquer dúvida, é só responder aqui.",
    );
  });

  it("sem marca e modelo, usa a placa; sem validade, a lacuna aparece", () => {
    const valores = valoresMensagemOrcamento(
      {
        numero: null,
        numero_orcamento: 7,
        status: "orcamento",
        validade: null,
        cliente: { nome: "Ana" },
        veiculo: { placa: "ABC1D23", marca: null, modelo: null, cor: null, tipo: null },
        itens: [],
      },
      "Loja",
    );
    expect(valores.veiculo).toBe("ABC1D23");
    expect(valores.validade).toBe("");
    expect(valores.valor).toBe("R$\u00a00,00");
  });
});

// Peça digitada sem cadastro no orçamento (#655): é peça e não tem peca_id.
describe("ehPecaAvulsa", () => {
  it("peça sem peca_id é avulsa; peça do cadastro e serviço não", () => {
    expect(ehPecaAvulsa({ tipo: "peca", peca_id: null })).toBe(true);
    expect(ehPecaAvulsa({ tipo: "peca", peca_id: "pneu" })).toBe(false);
    expect(ehPecaAvulsa({ tipo: "servico", peca_id: null })).toBe(false);
  });

  it("pecasAvulsas separa só as avulsas, na ordem", () => {
    const itens = [
      { id: "a", tipo: "peca" as const, peca_id: null },
      { id: "b", tipo: "peca" as const, peca_id: "pneu" },
      { id: "c", tipo: "servico" as const, peca_id: null },
      { id: "d", tipo: "peca" as const, peca_id: null },
    ];
    expect(pecasAvulsas(itens).map((i) => i.id)).toEqual(["a", "d"]);
  });
});

// Na aprovação, toda peça avulsa precisa de um caminho: existente, cadastrar
// ou sem cadastro. Nenhuma ponta solta.
const itensDoOrcamento = [
  { id: "avulsa-1", tipo: "peca" as const, peca_id: null },
  { id: "pneu", tipo: "peca" as const, peca_id: "pneu-cadastrado" },
  { id: "servico", tipo: "servico" as const, peca_id: null },
  { id: "avulsa-2", tipo: "peca" as const, peca_id: null },
];

describe("pendenciasDaAprovacao", () => {
  it("sem escolha nenhuma, as duas avulsas pendem (o serviço e a peça do cadastro não)", () => {
    expect(pendenciasDaAprovacao(itensDoOrcamento, new Map()).map((i) => i.id)).toEqual([
      "avulsa-1",
      "avulsa-2",
    ]);
  });

  it("com um caminho pra cada avulsa, a lista fica vazia e a aprovação segue", () => {
    const escolhas = new Map<string, CaminhoAvulsa>([
      ["avulsa-1", { caminho: "existente", pecaId: "pneu-cadastrado" }],
      ["avulsa-2", { caminho: "sem_cadastro" }],
    ]);
    expect(pendenciasDaAprovacao(itensDoOrcamento, escolhas)).toEqual([]);
  });

  it("existente ou cadastrar sem a peça escolhida (pecaId vazio) ainda pende", () => {
    const escolhas = new Map<string, CaminhoAvulsa>([
      ["avulsa-1", { caminho: "existente", pecaId: "" }],
      ["avulsa-2", { caminho: "cadastrar", pecaId: "  " }],
    ]);
    expect(pendenciasDaAprovacao(itensDoOrcamento, escolhas).map((i) => i.id)).toEqual([
      "avulsa-1",
      "avulsa-2",
    ]);
  });
});

describe("vinculosDaAprovacao", () => {
  it("existente e cadastrar viram vínculo item → peça; sem cadastro não", () => {
    const itens = [...itensDoOrcamento, { id: "avulsa-3", tipo: "peca" as const, peca_id: null }];
    const escolhas = new Map<string, CaminhoAvulsa>([
      ["avulsa-1", { caminho: "existente", pecaId: "pneu-cadastrado" }],
      ["avulsa-2", { caminho: "cadastrar", pecaId: "peca-nova" }],
      ["avulsa-3", { caminho: "sem_cadastro" }],
    ]);
    expect(vinculosDaAprovacao(itens, escolhas)).toEqual([
      { itemId: "avulsa-1", pecaId: "pneu-cadastrado" },
      { itemId: "avulsa-2", pecaId: "peca-nova" },
    ]);
  });

  it("escolha pra um item que não é avulso (peça do cadastro, serviço) é ignorada", () => {
    const escolhas = new Map<string, CaminhoAvulsa>([
      ["pneu", { caminho: "existente", pecaId: "outra-peca" }],
      ["servico", { caminho: "cadastrar", pecaId: "peca-nova" }],
    ]);
    expect(vinculosDaAprovacao(itensDoOrcamento, escolhas)).toEqual([]);
  });
});

// O lucro da peça avulsa usa o custo digitado no orçamento; sem ele, o custo
// é "não informado" (null), nunca zero — zero daria um lucro inventado.
const custoPeca = new Map([["pneu", 180]]);
const custoServico = new Map([["alinhamento", 20]]);

describe("custoUnitarioDoItem", () => {
  it("peça do cadastro usa o custo do cadastro (0 se o cadastro não tem)", () => {
    const item = { tipo: "peca" as const, peca_id: "pneu", servico_id: null, custo_unitario: 999 };
    expect(custoUnitarioDoItem(item, custoPeca, custoServico)).toBe(180);
    expect(custoUnitarioDoItem({ ...item, peca_id: "sem-custo" }, custoPeca, custoServico)).toBe(0);
  });

  it("peça avulsa usa o custo digitado; sem custo é null (não informado)", () => {
    const avulsa = { tipo: "peca" as const, peca_id: null, servico_id: null };
    expect(custoUnitarioDoItem({ ...avulsa, custo_unitario: 55.5 }, custoPeca, custoServico)).toBe(55.5);
    expect(custoUnitarioDoItem({ ...avulsa, custo_unitario: 0 }, custoPeca, custoServico)).toBe(0);
    expect(custoUnitarioDoItem({ ...avulsa, custo_unitario: null }, custoPeca, custoServico)).toBeNull();
    // Banco anterior à 0066: a chave nem vem.
    expect(custoUnitarioDoItem(avulsa, custoPeca, custoServico)).toBeNull();
  });

  it("serviço usa o custo do cadastro, e serviço sem cadastro continua 0 (como sempre)", () => {
    const servico = { tipo: "servico" as const, peca_id: null, servico_id: "alinhamento" };
    expect(custoUnitarioDoItem(servico, custoPeca, custoServico)).toBe(20);
    expect(custoUnitarioDoItem({ ...servico, servico_id: null }, custoPeca, custoServico)).toBe(0);
  });
});

describe("lucroDaOrdem", () => {
  const pneu = {
    tipo: "peca" as const,
    peca_id: "pneu",
    servico_id: null,
    quantidade: 4,
    preco_unitario: 300,
    desconto: 0,
  };
  const alinhamento = {
    tipo: "servico" as const,
    peca_id: null,
    servico_id: "alinhamento",
    quantidade: 1,
    preco_unitario: 80,
    desconto: 10,
  };
  const valvula = {
    tipo: "peca" as const,
    peca_id: null,
    servico_id: null,
    quantidade: 4,
    preco_unitario: 15,
    desconto: 0,
  };

  it("com todos os custos: venda menos custo (conta feita à mão)", () => {
    // Venda: 4×300 + (80−10) + 4×15 = 1.330. Custo: 4×180 + 20 + 4×6 = 764.
    expect(
      lucroDaOrdem([pneu, alinhamento, { ...valvula, custo_unitario: 6 }], custoPeca, custoServico),
    ).toEqual({ lucro: 566, custoNaoInformado: false });
  });

  it("uma peça avulsa sem custo: não mostra número nenhum, mostra 'custo não informado'", () => {
    expect(
      lucroDaOrdem([pneu, alinhamento, { ...valvula, custo_unitario: null }], custoPeca, custoServico),
    ).toEqual({ lucro: null, custoNaoInformado: true });
    expect(TEXTO_CUSTO_NAO_INFORMADO).toBe("custo não informado");
  });

  it("custo zero informado é custo de verdade (brinde), não 'não informado'", () => {
    expect(lucroDaOrdem([{ ...valvula, custo_unitario: 0 }], custoPeca, custoServico)).toEqual({
      lucro: 60,
      custoNaoInformado: false,
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  baixaEstoqueAoLancarItem,
  contarOrcamentosAbertos,
  custoUnitarioDoItem,
  lucroDaOrdem,
  lucroDaOrdemPeloBanco,
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
  podeReabrir,
  MOTIVOS_REABERTURA,
  MOTIVO_REABERTURA_LABEL,
  textoDaReabertura,
  erroDaReabertura,
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

  it("recusado só volta a orçamento aberto (reabrir, #1181); nunca vira OS direto", () => {
    expect(transicaoPermitida("recusado", "orcamento")).toBe(true);
    for (const para of ["em_andamento", "concluida", "faturada"] as const) {
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

// Na aprovação (o mesmo passo de virar OS), toda peça avulsa precisa de uma
// peça do cadastro: existente ou cadastrada agora. Não há "sem cadastro"
// desde a #1128. Nenhuma ponta solta.
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
      ["avulsa-2", { caminho: "cadastrar", pecaId: "peca-nova" }],
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
  it("existente e cadastrar viram vínculo item → peça; avulsa sem escolha não", () => {
    const itens = [...itensDoOrcamento, { id: "avulsa-3", tipo: "peca" as const, peca_id: null }];
    const escolhas = new Map<string, CaminhoAvulsa>([
      ["avulsa-1", { caminho: "existente", pecaId: "pneu-cadastrado" }],
      ["avulsa-2", { caminho: "cadastrar", pecaId: "peca-nova" }],
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

  it("pelo custo do banco: mesmo lucro que pelos mapas, e sem número se o custo é incompleto", () => {
    const itens = [pneu, alinhamento, { ...valvula, custo_unitario: 6 }];
    // O banco devolve 764 (4×180 + 20 + 4×6) e completo.
    expect(lucroDaOrdemPeloBanco(itens, { custo: 764, completo: true })).toEqual(
      lucroDaOrdem(itens, custoPeca, custoServico),
    );
    expect(lucroDaOrdemPeloBanco(itens, { custo: 740, completo: false })).toEqual({
      lucro: null,
      custoNaoInformado: true,
    });
    expect(lucroDaOrdemPeloBanco(itens, undefined)).toEqual({ lucro: null, custoNaoInformado: true });
  });
});

// Reabrir um orçamento recusado (#1181): volta pra orçamento aberto, com o
// mesmo número, motivo obrigatório e a recusa antiga no texto do histórico.
describe("reabrir orçamento recusado", () => {
  it("só o recusado pode ser reaberto", () => {
    expect(podeReabrir({ status: "recusado" })).toBe(true);
    for (const status of ["orcamento", "em_andamento", "concluida", "faturada"] as const) {
      expect(podeReabrir({ status })).toBe(false);
    }
  });

  it("os três motivos, com o 'cliente voltou' primeiro (já marcado)", () => {
    expect(MOTIVOS_REABERTURA[0]).toBe("cliente_voltou");
    expect(MOTIVOS_REABERTURA.map((m) => MOTIVO_REABERTURA_LABEL[m])).toEqual([
      "Cliente voltou e aceitou",
      "Recusado por engano",
      "Outro",
    ]);
  });

  it("o texto do histórico leva o motivo e a recusa antiga", () => {
    expect(
      textoDaReabertura("cliente_voltou", "", { recusado_em: "2026-11-23T14:00:00", motivo_recusa: "preco" }),
    ).toBe("Cliente voltou e aceitou (tinha sido recusado em 23/11, motivo: Preço)");
    expect(
      textoDaReabertura("engano", "", { recusado_em: "2026-11-23T14:00:00", motivo_recusa: null }),
    ).toBe("Recusado por engano (tinha sido recusado em 23/11, sem motivo)");
  });

  it("'Outro' usa o texto digitado, sem espaço sobrando", () => {
    expect(
      textoDaReabertura("outro", "  pediu pra trocar a marca  ", { recusado_em: null, motivo_recusa: "prazo" }),
    ).toBe("pediu pra trocar a marca (tinha sido recusado, motivo: Prazo)");
  });

  it("a recusa em dia de calendário local, não de UTC (23h no Brasil ainda é dia 23)", () => {
    // 23/11 às 23h no relógio da loja; em UTC já é 24/11.
    const recusadoEm = new Date(2026, 10, 23, 23, 0).toISOString();
    expect(textoDaReabertura("engano", "", { recusado_em: recusadoEm, motivo_recusa: null })).toContain(
      "em 23/11",
    );
  });

  it("confere antes de mandar: 'Outro' sem texto e validade vazia ou no passado", () => {
    expect(erroDaReabertura("cliente_voltou", "", "2026-12-01", "2026-11-24")).toBeNull();
    expect(erroDaReabertura("outro", " a ", "2026-12-01", "2026-11-24")).toMatch(/motivo/);
    expect(erroDaReabertura("outro", "pediu de novo", "2026-12-01", "2026-11-24")).toBeNull();
    expect(erroDaReabertura("engano", "", "", "2026-11-24")).toMatch(/validade/);
    expect(erroDaReabertura("engano", "", "2026-11-23", "2026-11-24")).toMatch(/validade/);
    expect(erroDaReabertura("engano", "", "2026-11-24", "2026-11-24")).toBeNull();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  baixaEstoqueAoLancarItem,
  contarOrcamentosAbertos,
  MOTIVO_RECUSA_LABEL,
  MOTIVOS_RECUSA,
  contaNosNumeros,
  ehOrcamento,
  orcamentoVencido,
  podeAprovar,
  podeRecusar,
  transicaoPermitida,
  validadePadrao,
  VALIDADE_PADRAO_DIAS,
  valoresMensagemOrcamento,
} from "./orcamento";
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

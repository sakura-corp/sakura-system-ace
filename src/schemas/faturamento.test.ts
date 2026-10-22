import { describe, expect, it } from "vitest";
import {
  calcularJurosPercentual,
  calcularLinhasPagamento,
  calcularListaParcelas,
  calcularValorCobrado,
  faturamentoFormVazio,
  itensQueImpedemNFCe,
  jurosDasLinhas,
  MENSAGEM_PECA_PRECISA_CADASTRO,
  MENSAGEM_PECA_SEM_NCM,
  paraPagamentos,
  parcelasDaOrdem,
  somarLinhasCobradas,
  ratearPagamentos,
  somarLinhasPagamento,
  type FaturamentoFormValues,
} from "./faturamento";
import type { JurosParcela } from "@/types/configuracao";
import type { ItemOS } from "@/types/os";

const jurosParcelas: JurosParcela[] = [
  { loja_id: "loja-1", numero_parcelas: 2, juros_percentual: 3 },
  { loja_id: "loja-1", numero_parcelas: 3, juros_percentual: 5 },
];

describe("calcularJurosPercentual", () => {
  it("acha o juros configurado pro número de parcelas", () => {
    expect(calcularJurosPercentual(jurosParcelas, 3)).toBe(5);
  });

  it("devolve 0 quando não tem juros configurado pra essa parcela (ex: 1x à vista)", () => {
    expect(calcularJurosPercentual(jurosParcelas, 1)).toBe(0);
  });

  it("devolve 0 quando o número de parcelas não está na lista", () => {
    expect(calcularJurosPercentual(jurosParcelas, 12)).toBe(0);
  });
});

describe("calcularValorCobrado", () => {
  it("sem juros, o valor cobrado é igual ao total", () => {
    expect(calcularValorCobrado(100, 0)).toBe(100);
  });

  it("aplica o percentual de juros sobre o total", () => {
    expect(calcularValorCobrado(100, 10)).toBe(110);
  });
});

describe("calcularListaParcelas", () => {
  it("divide o valor cobrado igualmente entre as parcelas", () => {
    const parcelas = calcularListaParcelas(300, 3, new Date(2026, 0, 15));
    expect(parcelas).toHaveLength(3);
    expect(parcelas.map((p) => p.valor)).toEqual([100, 100, 100]);
  });

  it("numera as parcelas a partir de 1 e vence uma por mês", () => {
    const parcelas = calcularListaParcelas(200, 2, new Date(2026, 0, 15));
    expect(parcelas[0].numero).toBe(1);
    expect(parcelas[1].numero).toBe(2);
    expect(parcelas[0].vencimento.getMonth()).toBe(1); // fevereiro
    expect(parcelas[1].vencimento.getMonth()).toBe(2); // março
  });

  it("com 1 parcela só, a 'lista' tem um item com o valor cheio e vence 1 mês depois", () => {
    const parcelas = calcularListaParcelas(150, 1, new Date(2026, 0, 15));
    expect(parcelas).toEqual([
      { numero: 1, vencimento: new Date(2026, 1, 15), valor: 150 },
    ]);
  });
});

describe("somarLinhasPagamento", () => {
  it("soma o valor de cada forma de pagamento", () => {
    const total = somarLinhasPagamento([
      { formaPagamento: "pix", valor: "50", parcelas: "1" },
      { formaPagamento: "cartao_credito", valor: "50.5", parcelas: "1" },
    ]);
    expect(total).toBe(100.5);
  });

  it("ignora campo vazio ou inválido como se fosse zero (não quebra a soma)", () => {
    const total = somarLinhasPagamento([
      { formaPagamento: "pix", valor: "", parcelas: "1" },
      { formaPagamento: "dinheiro", valor: "abc", parcelas: "1" },
      { formaPagamento: "cartao_debito", valor: "30", parcelas: "1" },
    ]);
    expect(total).toBe(30);
  });
});

describe("paraPagamentos", () => {
  const base: FaturamentoFormValues = faturamentoFormVazio(200);

  it("faturamento simples (não dividido): um pagamento só, com o valor cobrado (já com juros)", () => {
    const valores: FaturamentoFormValues = {
      ...base,
      dividirPagamento: false,
      formaPagamento: "pix",
    };
    expect(paraPagamentos(valores, 220)).toEqual([{ formaPagamento: "pix", valor: 220 }]);
  });

  it("faturamento dividido: um pagamento por linha preenchida", () => {
    const valores: FaturamentoFormValues = {
      ...base,
      dividirPagamento: true,
      linhasPagamento: [
        { formaPagamento: "pix", valor: "100", parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "100", parcelas: "1" },
      ],
    };
    expect(paraPagamentos(valores, 200)).toEqual([
      { formaPagamento: "pix", valor: 100 },
      { formaPagamento: "cartao_credito", valor: 100 },
    ]);
  });

  it("faturamento dividido: descarta linha com valor zero (ex: forma não usada)", () => {
    const valores: FaturamentoFormValues = {
      ...base,
      dividirPagamento: true,
      linhasPagamento: [
        { formaPagamento: "pix", valor: "200", parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "0", parcelas: "1" },
      ],
    };
    expect(paraPagamentos(valores, 200)).toEqual([{ formaPagamento: "pix", valor: 200 }]);
  });

  it("'a receber depois' (recebidoAgora false) sempre vira um pagamento só, mesmo se dividirPagamento estiver true", () => {
    const valores: FaturamentoFormValues = {
      ...base,
      recebidoAgora: false,
      dividirPagamento: true,
      formaPagamento: "pix",
    };
    expect(paraPagamentos(valores, 200)).toEqual([{ formaPagamento: "pix", valor: 200 }]);
  });
});

describe("calcularLinhasPagamento", () => {
  it("aplica o juro só na linha do cartão parcelado, não na OS inteira", () => {
    const linhas = calcularLinhasPagamento(
      [
        { formaPagamento: "pix", valor: "300", parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "100", parcelas: "3" },
      ],
      jurosParcelas,
    );
    expect(linhas[0].valorCobrado).toBe(300); // Pix não muda
    expect(linhas[1].jurosPercentual).toBe(5);
    expect(linhas[1].valorCobrado).toBe(105);
  });

  it("ignora parcelamento numa forma que não é cartão de crédito", () => {
    const [linha] = calcularLinhasPagamento(
      [{ formaPagamento: "pix", valor: "100", parcelas: "3" }],
      jurosParcelas,
    );
    expect(linha.parcelas).toBe(1);
    expect(linha.valorCobrado).toBe(100);
  });

  it("trata parcelas vazia/inválida como 1x", () => {
    const [linha] = calcularLinhasPagamento(
      [{ formaPagamento: "cartao_credito", valor: "100", parcelas: "" }],
      jurosParcelas,
    );
    expect(linha.parcelas).toBe(1);
    expect(linha.valorCobrado).toBe(100);
  });
});

describe("somarLinhasCobradas", () => {
  it("soma o valor já com os juros de cada linha", () => {
    const total = somarLinhasCobradas(
      [
        { formaPagamento: "pix", valor: "300", parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "100", parcelas: "2" },
      ],
      jurosParcelas,
    );
    expect(total).toBe(403); // 300 + 100 * 1.03
  });
});

describe("parcelasDaOrdem", () => {
  const base: FaturamentoFormValues = faturamentoFormVazio(400);

  it("no pagamento dividido, grava o maior parcelamento usado", () => {
    const parcelas = parcelasDaOrdem({
      ...base,
      dividirPagamento: true,
      linhasPagamento: [
        { formaPagamento: "pix", valor: "300", parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "100", parcelas: "3" },
      ],
    });
    expect(parcelas).toBe(3);
  });

  it("desconsidera linha zerada na hora de decidir o parcelamento da OS", () => {
    const parcelas = parcelasDaOrdem({
      ...base,
      dividirPagamento: true,
      linhasPagamento: [
        { formaPagamento: "pix", valor: "400", parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "0", parcelas: "6" },
      ],
    });
    expect(parcelas).toBe(1);
  });

  it("sem divisão, usa o campo de parcelas do formulário", () => {
    expect(parcelasDaOrdem({ ...base, dividirPagamento: false, parcelas: "4" })).toBe(4);
  });
});

describe("paraPagamentos com parcelamento por forma", () => {
  const base: FaturamentoFormValues = faturamentoFormVazio(400);

  it("manda pro Caixa o valor de cada forma já com os juros do cartão", () => {
    const valores: FaturamentoFormValues = {
      ...base,
      dividirPagamento: true,
      linhasPagamento: [
        { formaPagamento: "pix", valor: "300", parcelas: "1" },
        { formaPagamento: "cartao_credito", valor: "100", parcelas: "3" },
      ],
    };
    expect(paraPagamentos(valores, 400, jurosParcelas)).toEqual([
      { formaPagamento: "pix", valor: 300 },
      { formaPagamento: "cartao_credito", valor: 105 },
    ]);
  });
});

describe("ratearPagamentos", () => {
  it("divide o total da nota entre as formas, mantendo a proporção", () => {
    const rateado = ratearPagamentos(
      [
        { formaPagamento: "pix", valor: 300 },
        { formaPagamento: "cartao_credito", valor: 700 },
      ],
      500,
    );
    expect(rateado).toEqual([
      { formaPagamento: "pix", valor: 150 },
      { formaPagamento: "cartao_credito", valor: 350 },
    ]);
  });

  it("a soma bate exatamente com o total pedido, mesmo com arredondamento", () => {
    const rateado = ratearPagamentos(
      [{ valor: 1 }, { valor: 1 }, { valor: 1 }],
      100,
    );
    expect(rateado.reduce((soma, p) => soma + p.valor, 0)).toBe(100);
  });

  // Com juros de cartão, o que entrou no Caixa é maior que o total dos itens
  // — ratear pela soma das formas (e não pelo total da OS) impede que uma
  // linha estoure o total da nota e deixe a última negativa.
  it("nunca gera valor negativo quando o pago é maior que o total da nota", () => {
    const rateado = ratearPagamentos(
      [
        { formaPagamento: "cartao_credito", valor: 1188 },
        { formaPagamento: "pix", valor: 10 },
      ],
      100,
    );
    expect(rateado.every((p) => p.valor >= 0)).toBe(true);
    expect(rateado.reduce((soma, p) => soma + p.valor, 0)).toBe(100);
  });

  it("sem nenhuma forma de pagamento, devolve lista vazia (quem chama decide o fallback)", () => {
    expect(ratearPagamentos([], 100)).toEqual([]);
  });
});

describe("calcularListaParcelas", () => {
  it("faz as parcelas somarem exatamente o valor cobrado", () => {
    // R$100 em 3x: duas de R$33,33 e a última de R$33,34 — se todas fossem
    // R$33,33, a soma daria R$99,99 e o cliente veria um centavo sumindo.
    const parcelas = calcularListaParcelas(100, 3, new Date(2026, 8, 2));
    expect(parcelas.map((p) => p.valor)).toEqual([33.33, 33.33, 33.34]);
    expect(parcelas.reduce((soma, p) => soma + p.valor, 0)).toBeCloseTo(100, 10);
  });

  it("divide certinho quando não sobra centavo", () => {
    const parcelas = calcularListaParcelas(300, 3, new Date(2026, 8, 2));
    expect(parcelas.map((p) => p.valor)).toEqual([100, 100, 100]);
  });

  it("mantém uma parcela só igual ao total", () => {
    expect(calcularListaParcelas(99.99, 1, new Date(2026, 8, 2))[0].valor).toBe(99.99);
  });

  it("vence uma vez por mês, a partir do mês que vem", () => {
    const parcelas = calcularListaParcelas(300, 3, new Date(2026, 8, 2));
    expect(parcelas.map((p) => p.vencimento.getMonth())).toEqual([9, 10, 11]);
  });
});

describe("jurosDasLinhas", () => {
  it("cobra juros só sobre a parte que passou no cartão", () => {
    // R$100 no Pix à vista + R$100 no cartão em 2x a 3%: os juros são 3% de
    // 100 (a parte do cartão), não de 200 (a OS inteira).
    const linhas = [
      { formaPagamento: "pix", valor: "100", parcelas: "1" },
      { formaPagamento: "cartao_credito", valor: "100", parcelas: "2" },
    ];
    expect(jurosDasLinhas(linhas, jurosParcelas)).toBe(3);
  });

  it("não cobra nada quando nenhuma linha é cartão parcelado", () => {
    const linhas = [
      { formaPagamento: "pix", valor: "60", parcelas: "1" },
      { formaPagamento: "dinheiro", valor: "40", parcelas: "1" },
    ];
    expect(jurosDasLinhas(linhas, jurosParcelas)).toBe(0);
  });

  it("fecha no centavo", () => {
    const linhas = [{ formaPagamento: "cartao_credito", valor: "33.33", parcelas: "2" }];
    // 3% de 33,33 é 0,9999 — precisa sair fechado no centavo, não com cauda.
    const juros = jurosDasLinhas(linhas, jurosParcelas);
    expect(juros).toBe(Number(juros.toFixed(2)));
  });
});

// NFC-e precisa do NCM, que só o cadastro tem (#655): peça avulsa ou peça
// cadastrada sem NCM trava a nota até ser cadastrada/corrigida.
describe("itensQueImpedemNFCe", () => {
  const item = (id: string, sobrescrever: Partial<ItemOS>): ItemOS => ({
    id,
    ordem_servico_id: "os-1",
    tipo: "peca",
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao: id,
    quantidade: 1,
    preco_unitario: 10,
    desconto: 0,
    ...sobrescrever,
  });
  const cadastro = [
    { id: "pneu", ncm: "40111000", descricao: "Pneu" },
    { id: "valvula", ncm: null, descricao: "Válvula" },
    { id: "bico", ncm: "   ", descricao: "Bico" },
  ];

  it("aponta a avulsa, a sem NCM e a com NCM só de espaços; deixa passar o resto", () => {
    const itens = [
      item("pneu-ok", { peca_id: "pneu" }),
      item("avulsa", {}),
      item("valvula", { peca_id: "valvula" }),
      item("bico", { peca_id: "bico" }),
      item("sumida", { peca_id: "peca-que-nao-veio" }),
      item("servico", { tipo: "servico", servico_id: "alinhamento" }),
    ];
    expect(itensQueImpedemNFCe(itens, cadastro).map((p) => [p.item.id, p.motivo])).toEqual([
      ["avulsa", "avulsa"],
      ["valvula", "sem_ncm"],
      ["bico", "sem_ncm"],
      ["sumida", "avulsa"],
    ]);
  });

  it("tudo cadastrado com NCM: lista vazia, a nota pode sair", () => {
    expect(itensQueImpedemNFCe([item("pneu-ok", { peca_id: "pneu" })], cadastro)).toEqual([]);
  });

  it("as frases que a tela mostra", () => {
    expect(MENSAGEM_PECA_PRECISA_CADASTRO).toBe("Essa peça precisa ser cadastrada pra sair na nota.");
    expect(MENSAGEM_PECA_SEM_NCM).toMatch(/sem NCM.*sair na nota/);
  });
});

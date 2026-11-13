import { describe, expect, it } from "vitest";
import type { ItemOS, OrdemServico, TipoItemOS } from "@/types/os";
import { montarHtmlGarantiaOS } from "./garantiaDocumento";

/**
 * O "antes × depois" do documento de garantia (#915).
 *
 * Este teste foi escrito e visto passando contra o `garantiaDocumento.ts` de
 * ANTES da #915 (as contas feitas à mão no próprio arquivo). Os números
 * esperados abaixo são os que o documento imprimia naquela época. Depois que
 * as contas foram pra `src/schemas/`, todos continuam iguais, com uma exceção
 * decidida pela Sofia em 10/11/2026 (pergunta 1, opção A): as parcelas passam
 * a vir de `calcularListaParcelas`, que acerta o centavo pra soma fechar com o
 * total. Onde o número mudou, o comentário do caso diz o de antes.
 */

let proximoId = 0;

function item(
  tipo: TipoItemOS,
  descricao: string,
  quantidade: number,
  preco_unitario: number,
  desconto = 0,
): ItemOS {
  proximoId += 1;
  return {
    id: `item-${proximoId}`,
    ordem_servico_id: "os-1",
    tipo,
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao,
    quantidade,
    preco_unitario,
    desconto,
    tecnico: null,
  };
}

function ordem(itens: ItemOS[], forma_pagamento: string, parcelas: number): OrdemServico {
  return {
    id: "os-1",
    numero: 123,
    loja_id: "loja-1",
    cliente_id: "cliente-1",
    veiculo_id: null,
    status: "faturada",
    km_entrada: null,
    descricao_problema: null,
    forma_pagamento,
    parcelas,
    data_abertura: "2026-03-01T12:00:00Z",
    // Meio-dia UTC: o mesmo dia de calendário em São Paulo e em UTC, os dois
    // fusos do `npm run test:fusos`.
    data_fechamento: "2026-03-10T12:00:00Z",
    vendedor_id: null,
    criado_por_id: null,
    atualizado_por_id: null,
    itens,
  } as OrdemServico;
}

function documento(os: OrdemServico, valorCobrado: number | null = null): string {
  return montarHtmlGarantiaOS({
    ordem: os,
    cliente: null,
    veiculo: null,
    loja: null,
    valorCobrado,
    textoGarantia: "",
  });
}

/** Tira as tags e junta os espaços (o real vem com espaço que não quebra). */
function texto(trecho: string): string {
  return trecho
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cada linha `<tr>` de uma tabela, já como lista de células em texto. */
function linhasDaTabela(tabela: string): string[][] {
  const corpo = tabela.split("<tbody>")[1]?.split("</tbody>")[0] ?? "";
  return [...corpo.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((linha) =>
    [...linha[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => texto(c[1])),
  );
}

/** Os números que o documento mostra, na ordem em que aparecem no papel. */
function numerosDoDocumento(html: string) {
  const tabelas = html.split("<table>").slice(1);
  const itens = linhasDaTabela(tabelas[0]).map((celulas) => ({
    qtde: celulas[2],
    unitario: celulas[3],
    total: celulas[4],
  }));

  const totais = Object.fromEntries(
    [...html.matchAll(/<span>([^<]+)<strong>([^<]*)<\/strong><\/span>/g)].map((m) => [
      m[1],
      texto(m[2]),
    ]),
  );

  const totaisGerais = [...html.matchAll(/<p class="total-geral">([^<]*)<\/p>/g)].map((m) =>
    texto(m[1]),
  );

  const parcelas =
    tabelas.length > 1
      ? linhasDaTabela(tabelas[1]).map((celulas) => celulas.join(" | "))
      : [];

  const aVista = html.match(/Forma de pagamento<\/div>\s*<p class="valor">([^<]*)<\/p>/);

  return {
    itens,
    produtos: totais.Produtos,
    servicos: totais.Serviços,
    subtotal: totais.Subtotal,
    descontos: totais.Descontos,
    totaisGerais,
    parcelas,
    aVista: aVista ? texto(aVista[1]) : null,
  };
}

describe("documento de garantia: os números do papel (#915)", () => {
  it("só peça, à vista no Pix", () => {
    const os = ordem([item("peca", "Pneu 175/70 R13", 2, 150)], "pix", 1);

    expect(numerosDoDocumento(documento(os))).toEqual({
      itens: [{ qtde: "2", unitario: "R$ 150,00", total: "R$ 300,00" }],
      produtos: "R$ 300,00",
      servicos: "R$ 0,00",
      subtotal: "R$ 300,00",
      descontos: "R$ 0,00",
      totaisGerais: ["Total geral: R$ 300,00"],
      parcelas: [],
      aVista: "Pix — R$ 300,00",
    });
  });

  it("peça e serviço com desconto em linhas diferentes, no crédito em 3x", () => {
    const os = ordem(
      [
        item("peca", "Pneu 185/65 R15", 4, 89.9, 10),
        item("servico", "Alinhamento", 1, 60),
        item("servico", "Balanceamento", 1, 35.5, 5.5),
      ],
      "cartao_credito",
      3,
    );

    expect(numerosDoDocumento(documento(os))).toEqual({
      itens: [
        { qtde: "4", unitario: "R$ 89,90", total: "R$ 349,60" },
        { qtde: "1", unitario: "R$ 60,00", total: "R$ 60,00" },
        { qtde: "1", unitario: "R$ 35,50", total: "R$ 30,00" },
      ],
      produtos: "R$ 359,60",
      servicos: "R$ 95,50",
      subtotal: "R$ 455,10",
      descontos: "R$ 15,50",
      totaisGerais: ["Total geral: R$ 439,60", "Total geral: R$ 439,60"],
      // Antes da #915: 146,53 / 146,53 / 146,53 (somava 439,59).
      parcelas: [
        "1x | 10/04/2026 | Cartão de crédito | R$ 146,53",
        "2x | 10/05/2026 | Cartão de crédito | R$ 146,53",
        "3x | 10/06/2026 | Cartão de crédito | R$ 146,54",
      ],
      aVista: null,
    });
  });

  it("valores que dão dízima: 3 × 33,33 com desconto de 0,01, e 0,10 + 0,20, em 3x", () => {
    const os = ordem(
      [
        item("peca", "Válvula", 3, 33.33, 0.01),
        item("servico", "Bico", 1, 0.1),
        item("servico", "Calibragem", 1, 0.2),
      ],
      "cartao_credito",
      3,
    );

    expect(numerosDoDocumento(documento(os))).toEqual({
      itens: [
        { qtde: "3", unitario: "R$ 33,33", total: "R$ 99,98" },
        { qtde: "1", unitario: "R$ 0,10", total: "R$ 0,10" },
        { qtde: "1", unitario: "R$ 0,20", total: "R$ 0,20" },
      ],
      produtos: "R$ 99,99",
      servicos: "R$ 0,30",
      subtotal: "R$ 100,29",
      descontos: "R$ 0,01",
      totaisGerais: ["Total geral: R$ 100,28", "Total geral: R$ 100,28"],
      // Antes da #915: 33,43 / 33,43 / 33,43 (somava 100,29, um centavo A MAIS).
      // Aqui não é só a última que muda: 100,28 em 3 sobra 2 centavos, e a
      // repartição dá 33,42 / 33,43 / 33,43, igual à tela de faturamento.
      parcelas: [
        "1x | 10/04/2026 | Cartão de crédito | R$ 33,42",
        "2x | 10/05/2026 | Cartão de crédito | R$ 33,43",
        "3x | 10/06/2026 | Cartão de crédito | R$ 33,43",
      ],
      aVista: null,
    });
  });

  it("R$ 100,00 cobrado em 3x (o valor cobrado manda nas parcelas)", () => {
    const os = ordem(
      [item("servico", "Troca de óleo", 1, 80), item("peca", "Filtro", 1, 25, 5)],
      "cartao_credito",
      3,
    );

    expect(numerosDoDocumento(documento(os, 100))).toEqual({
      itens: [
        { qtde: "1", unitario: "R$ 80,00", total: "R$ 80,00" },
        { qtde: "1", unitario: "R$ 25,00", total: "R$ 20,00" },
      ],
      produtos: "R$ 25,00",
      servicos: "R$ 80,00",
      subtotal: "R$ 105,00",
      descontos: "R$ 5,00",
      totaisGerais: ["Total geral: R$ 100,00", "Total geral: R$ 100,00"],
      // Antes da #915: 33,33 / 33,33 / 33,33 (somava 99,99).
      parcelas: [
        "1x | 10/04/2026 | Cartão de crédito | R$ 33,33",
        "2x | 10/05/2026 | Cartão de crédito | R$ 33,33",
        "3x | 10/06/2026 | Cartão de crédito | R$ 33,34",
      ],
      aVista: null,
    });
  });

  it("quantidade quebrada: o Total geral é o mesmo de totalOrdem (a tela da OS)", () => {
    // Achado da revisão final da #915. Antes, o documento fazia
    // (Produtos + Serviços) − Descontos = 217,395 e imprimia R$ 217,40. Agora
    // o total é `somarValoresLiquidos` (o pedido da issue, passo 3), a mesma
    // soma da tela da OS, que dá 217,39499999999998 e imprime R$ 217,39. É o
    // único caso conhecido em que o total do papel muda, e só com quantidade
    // quebrada: num sorteio de 2 milhões de OS, 2 mudaram.
    const os = ordem(
      [item("peca", "Fita", 3.22, 9.75, 4.82), item("servico", "Revisão", 1, 190.82)],
      "pix",
      1,
    );

    const numeros = numerosDoDocumento(documento(os));
    expect(numeros.subtotal).toBe("R$ 222,22");
    expect(numeros.descontos).toBe("R$ 4,82");
    expect(numeros.totaisGerais).toEqual(["Total geral: R$ 217,39"]);
    expect(numeros.aVista).toBe("Pix — R$ 217,39");
  });
});

/**
 * Testes de PROPRIEDADE das contas que repartem um valor (item TR-06.1 do
 * guia de melhorias).
 *
 * Por que existem, além dos testes de exemplo que já havia: os bugs que mais
 * custaram neste projeto são todos da mesma família — uma soma que precisa
 * fechar EXATAMENTE. Rejeição da SEFAZ por "total dos pagamentos menor que o
 * total da nota" (seção 6, item 31), "ausência de troco" (item 32), parcela
 * somando R$ 99,99 na frente do cliente (item 45). Teste de exemplo só acha o
 * caso que quem escreveu já imaginou; estes geram mil casos por propriedade e
 * acham o que ninguém escolheria à mão.
 *
 * REGRA AO MEXER AQUI: se uma propriedade falhar, o certo é consertar a
 * FUNÇÃO, não afrouxar a propriedade — e registrar o contraexemplo como teste
 * de exemplo fixo logo abaixo, pra ele nunca mais voltar.
 *
 * Dinheiro é comparado em CENTAVOS INTEIROS de propósito: comparar soma de
 * float com `toBe` reprova por 0,0000000001 e esconde o defeito de verdade,
 * e comparar com `toBeCloseTo` deixa passar um centavo inteiro sumindo, que é
 * justamente o que estes testes existem pra pegar.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  calcularListaParcelas,
  calcularLinhasPagamento,
  jurosDasLinhas,
  ratearPagamentos,
  somarLinhasCobradas,
  somarLinhasPagamento,
  type LinhaPagamentoValues,
} from "./faturamento";
import { custoDaOrdemPelosMapas, resumirMovimentos, type MapaCusto } from "./metricasCaixa";
import { arredondarCentavo } from "./dinheiro";
import { valorLiquidoItem, type ItemParaNFCe } from "@/lib/focusNfe";
import type { JurosParcela } from "@/types/configuracao";
import type { MovimentoCaixa } from "@/types/caixa";

const CASOS = { numRuns: 1000 };

/** Em centavos: evita comparar float com float ao checar "fecha exatamente". */
// O `|| 0` troca -0 por 0: Math.round(-0.001 * 100) devolve -0, e
// `expect(-0).toBe(0)` reprova por identidade. Era defeito DESTE helper,
// não do código — a primeira rodada das propriedades acusou isso.
const centavos = (valor: number) => Math.round(valor * 100) || 0;
const somaEmCentavos = (valores: number[]) =>
  valores.reduce((total, valor) => total + centavos(valor), 0);

/** Dinheiro plausível: de R$ 0,01 a R$ 1.000.000,00, sempre com 2 casas. */
const dinheiro = (min = 1, max = 100_000_000) =>
  fc.integer({ min, max }).map((c) => c / 100);

describe("calcularListaParcelas — propriedades", () => {
  it("a soma das parcelas é exatamente o total, pra qualquer valor e nº de parcelas", () => {
    fc.assert(
      fc.property(dinheiro(), fc.integer({ min: 1, max: 12 }), (total, parcelas) => {
        const lista = calcularListaParcelas(total, parcelas, new Date(2026, 0, 15));
        expect(somaEmCentavos(lista.map((p) => p.valor))).toBe(centavos(total));
      }),
      CASOS,
    );
  });

  it("nenhuma parcela é negativa", () => {
    fc.assert(
      fc.property(dinheiro(), fc.integer({ min: 1, max: 12 }), (total, parcelas) => {
        const lista = calcularListaParcelas(total, parcelas, new Date(2026, 0, 15));
        for (const parcela of lista) expect(parcela.valor).toBeGreaterThanOrEqual(0);
      }),
      CASOS,
    );
  });

  it("nenhuma parcela difere da outra em mais de um centavo", () => {
    fc.assert(
      fc.property(dinheiro(), fc.integer({ min: 1, max: 12 }), (total, parcelas) => {
        const valores = calcularListaParcelas(total, parcelas, new Date(2026, 0, 15)).map(
          (p) => centavos(p.valor),
        );
        expect(Math.max(...valores) - Math.min(...valores)).toBeLessThanOrEqual(1);
      }),
      CASOS,
    );
  });

  it("gera exatamente o número de parcelas pedido", () => {
    fc.assert(
      fc.property(dinheiro(), fc.integer({ min: 1, max: 12 }), (total, parcelas) => {
        expect(calcularListaParcelas(total, parcelas, new Date(2026, 0, 15))).toHaveLength(
          parcelas,
        );
      }),
      CASOS,
    );
  });
});

describe("calcularListaParcelas — contraexemplos achados pelo fast-check", () => {
  // Estes três vieram da primeira rodada das propriedades acima, com a versão
  // antiga da função (que jogava toda a sobra do arredondamento na ÚLTIMA
  // parcela). Ficam como teste de exemplo fixo pra não voltarem.

  it("R$ 0,06 em 12x não gera parcela negativa", () => {
    // A versão antiga fazia arredondarCentavo(0,06/12) = R$ 0,01 e deixava a
    // última em 0,06 − 0,01×11 = −R$ 0,05. Parcela negativa na frente do
    // cliente, e valor negativo indo pro banco.
    const valores = calcularListaParcelas(0.06, 12, new Date(2026, 0, 15)).map((p) => p.valor);
    expect(valores.every((v) => v >= 0)).toBe(true);
    expect(somaEmCentavos(valores)).toBe(6);
  });

  it("R$ 1,14 em 12x não espalha mais de um centavo entre as parcelas", () => {
    // Antes: onze de R$ 0,10 e uma de R$ 0,04 — seis centavos de diferença.
    const valores = calcularListaParcelas(1.14, 12, new Date(2026, 0, 15)).map((p) =>
      centavos(p.valor),
    );
    expect(Math.max(...valores) - Math.min(...valores)).toBeLessThanOrEqual(1);
    expect(valores.reduce((a, b) => a + b, 0)).toBe(114);
  });

  it("R$ 1.000,06 em 12x fecha e não espalha centavo", () => {
    const valores = calcularListaParcelas(1000.06, 12, new Date(2026, 0, 15)).map((p) =>
      centavos(p.valor),
    );
    expect(Math.max(...valores) - Math.min(...valores)).toBeLessThanOrEqual(1);
    expect(valores.reduce((a, b) => a + b, 0)).toBe(100_006);
  });

  it("mantém o centavo que sobra NO FIM, como sempre foi", () => {
    // Não é detalhe estético: é o que o teste de exemplo antigo já fixava, e
    // é como a maquininha mostra. R$100 em 3x = 33,33 / 33,33 / 33,34.
    expect(calcularListaParcelas(100, 3, new Date(2026, 0, 15)).map((p) => p.valor)).toEqual([
      33.33, 33.33, 33.34,
    ]);
  });
});

describe("ratearPagamentos — propriedades", () => {
  const listaDePagamentos = fc
    .array(fc.record({ valor: dinheiro() }), { minLength: 1, maxLength: 5 })
    .filter((lista) => lista.reduce((s, p) => s + p.valor, 0) > 0);

  it("a soma dos rateados é exatamente o total de destino", () => {
    fc.assert(
      fc.property(listaDePagamentos, dinheiro(), (pagamentos, totalDestino) => {
        const rateados = ratearPagamentos(pagamentos, totalDestino);
        expect(somaEmCentavos(rateados.map((p) => p.valor))).toBe(centavos(totalDestino));
      }),
      CASOS,
    );
  });

  it("nenhuma linha rateada fica negativa", () => {
    // Foi exatamente este o bug do faturamento dividido com juros de cartão:
    // a última linha absorvia a diferença e podia estourar pra baixo, o que a
    // SEFAZ recusa (seção 6, item 32).
    fc.assert(
      fc.property(listaDePagamentos, dinheiro(), (pagamentos, totalDestino) => {
        for (const linha of ratearPagamentos(pagamentos, totalDestino)) {
          expect(linha.valor).toBeGreaterThanOrEqual(0);
        }
      }),
      CASOS,
    );
  });

  it("a ordem das formas de pagamento não muda o total rateado", () => {
    fc.assert(
      fc.property(listaDePagamentos, dinheiro(), (pagamentos, totalDestino) => {
        const normal = ratearPagamentos(pagamentos, totalDestino);
        const invertido = ratearPagamentos([...pagamentos].reverse(), totalDestino);
        expect(somaEmCentavos(invertido.map((p) => p.valor))).toBe(
          somaEmCentavos(normal.map((p) => p.valor)),
        );
      }),
      CASOS,
    );
  });

  it("devolve uma linha por pagamento recebido", () => {
    fc.assert(
      fc.property(listaDePagamentos, dinheiro(), (pagamentos, totalDestino) => {
        expect(ratearPagamentos(pagamentos, totalDestino)).toHaveLength(pagamentos.length);
      }),
      CASOS,
    );
  });
});

describe("calcularLinhasPagamento / somarLinhasCobradas — propriedades", () => {
  const jurosConfigurados: JurosParcela[] = Array.from({ length: 11 }, (_, i) => ({
    loja_id: "loja-1",
    numero_parcelas: i + 2,
    juros_percentual: (i + 2) * 0.5,
  }));

  const linha = (forma: string) =>
    fc.record({
      formaPagamento: fc.constant(forma),
      valor: dinheiro().map(String),
      parcelas: fc.integer({ min: 1, max: 12 }).map(String),
    });

  const linhas = fc.array(
    fc.oneof(linha("pix"), linha("dinheiro"), linha("cartao_debito"), linha("cartao_credito")),
    { minLength: 1, maxLength: 4 },
  ) as fc.Arbitrary<LinhaPagamentoValues[]>;

  it("o cobrado só difere do combinado pelo juro do cartão", () => {
    fc.assert(
      fc.property(linhas, (linhasPagamento) => {
        const combinado = somarLinhasPagamento(linhasPagamento);
        const cobrado = somarLinhasCobradas(linhasPagamento, jurosConfigurados);
        const juros = jurosDasLinhas(linhasPagamento, jurosConfigurados);
        expect(centavos(cobrado)).toBe(centavos(combinado) + centavos(juros));
      }),
      CASOS,
    );
  });

  it("sem cartão de crédito parcelado, o cobrado é igual ao combinado", () => {
    const semParcelamento = fc.array(
      fc.oneof(linha("pix"), linha("dinheiro"), linha("cartao_debito")),
      { minLength: 1, maxLength: 4 },
    ) as fc.Arbitrary<LinhaPagamentoValues[]>;

    fc.assert(
      fc.property(semParcelamento, (linhasPagamento) => {
        expect(centavos(somarLinhasCobradas(linhasPagamento, jurosConfigurados))).toBe(
          centavos(somarLinhasPagamento(linhasPagamento)),
        );
        expect(centavos(jurosDasLinhas(linhasPagamento, jurosConfigurados))).toBe(0);
      }),
      CASOS,
    );
  });

  it("o juro incide só sobre a linha do cartão, nunca sobre as outras", () => {
    fc.assert(
      fc.property(linhas, (linhasPagamento) => {
        for (const calculada of calcularLinhasPagamento(linhasPagamento, jurosConfigurados)) {
          if (calculada.formaPagamento !== "cartao_credito" || calculada.parcelas <= 1) {
            expect(centavos(calculada.valorCobrado)).toBe(centavos(calculada.valorBase));
          } else {
            expect(calculada.valorCobrado).toBeGreaterThanOrEqual(calculada.valorBase);
          }
        }
      }),
      CASOS,
    );
  });

  it("nunca cobra menos do que foi combinado", () => {
    fc.assert(
      fc.property(linhas, (linhasPagamento) => {
        expect(somarLinhasCobradas(linhasPagamento, jurosConfigurados)).toBeGreaterThanOrEqual(
          somarLinhasPagamento(linhasPagamento) - 0.005,
        );
      }),
      CASOS,
    );
  });
});

describe("resumirMovimentos — propriedades", () => {
  // O bug do item 40 da seção 6 virando invariante: uma OS paga em várias
  // formas gera VÁRIOS lançamentos de caixa, e o custo dela tem que entrar
  // uma vez só. Contar por lançamento dobrava o custo e derrubava o lucro.
  const custoPeca: MapaCusto = new Map([["peca-1", 40]]);
  const custoServico: MapaCusto = new Map([["servico-1", 10]]);

  const movimentoDaOrdem = (valor: number): MovimentoCaixa =>
    ({
      id: `mov-${Math.random()}`,
      loja_id: "loja-1",
      data: "2026-09-12T12:00:00Z",
      tipo: "entrada",
      forma_pagamento: "pix",
      valor,
      descricao: "OS 1",
      ordem_servico_id: "os-1",
      categoria_id: null,
      ordem_servico: {
        itens: [
          { tipo: "peca", peca_id: "peca-1", quantidade: 1, preco_unitario: 100, desconto: 0 },
          {
            tipo: "servico",
            servico_id: "servico-1",
            quantidade: 1,
            preco_unitario: 50,
            desconto: 0,
          },
        ],
      },
    }) as unknown as MovimentoCaixa;

  it("o custo da OS entra uma vez só, não importa em quantas formas ela foi paga", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100_000 }), { minLength: 1, maxLength: 6 }),
        (valoresEmCentavos) => {
          const movimentos = valoresEmCentavos.map((c) => movimentoDaOrdem(c / 100));
          const resumo = resumirMovimentos(movimentos, custoDaOrdemPelosMapas(custoPeca, custoServico));
          // 1 peça a R$40 + 1 serviço a R$10 = R$50, uma vez só.
          expect(centavos(resumo.custoDeAquisicao)).toBe(centavos(50));
          expect(resumo.ordensDistintas).toBe(1);
        },
      ),
      CASOS,
    );
  });

  it("o ticket médio divide por OS distinta, nunca por lançamento", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100_000 }), { minLength: 1, maxLength: 6 }),
        (valoresEmCentavos) => {
          const movimentos = valoresEmCentavos.map((c) => movimentoDaOrdem(c / 100));
          const resumo = resumirMovimentos(movimentos, custoDaOrdemPelosMapas(custoPeca, custoServico));
          const totalPago = valoresEmCentavos.reduce((a, b) => a + b, 0) / 100;
          expect(centavos(resumo.ticketMedio)).toBe(centavos(totalPago));
        },
      ),
      CASOS,
    );
  });

  it("lucro é sempre entradas − saídas − custo, pra qualquer combinação", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100_000 }), { minLength: 1, maxLength: 6 }),
        (valoresEmCentavos) => {
          const movimentos = valoresEmCentavos.map((c) => movimentoDaOrdem(c / 100));
          const r = resumirMovimentos(movimentos, custoDaOrdemPelosMapas(custoPeca, custoServico));
          expect(centavos(r.lucro)).toBe(
            centavos(r.entradas) - centavos(r.saidas) - centavos(r.custoDeAquisicao),
          );
        },
      ),
      CASOS,
    );
  });
});

describe("valorLiquidoItem — propriedades", () => {
  // O valor da linha da NFC-e. É usado em TRÊS lugares (o item, o total dos
  // produtos e a base do ICMS) e antes cada um refazia a conta — dois deles
  // esquecendo o desconto, o que fazia a nota valer mais do que o cliente
  // pagou (seção 6, item 44). A propriedade fixa que a conta é uma só.
  const item = (quantidade: number, precoUnitario: number, desconto: number) =>
    ({ peca: { id: "p1" }, quantidade, precoUnitario, desconto }) as unknown as ItemParaNFCe;

  it("com desconto dentro da linha, o valor nunca é negativo", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        dinheiro(1, 1_000_000),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (quantidade, precoUnitario, fracaoDesconto) => {
          const bruto = quantidade * precoUnitario;
          const valor = valorLiquidoItem(
            item(quantidade, precoUnitario, arredondarCentavo(bruto * fracaoDesconto)),
          );
          expect(valor).toBeGreaterThanOrEqual(0);
        },
      ),
      CASOS,
    );
  });

  it("sem desconto, é exatamente quantidade × preço", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        dinheiro(1, 1_000_000),
        (quantidade, precoUnitario) => {
          expect(centavos(valorLiquidoItem(item(quantidade, precoUnitario, 0)))).toBe(
            centavos(arredondarCentavo(quantidade * precoUnitario)),
          );
        },
      ),
      CASOS,
    );
  });

  it("o desconto abate exatamente o que foi dado", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        dinheiro(1, 1_000_000),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (quantidade, precoUnitario, fracaoDesconto) => {
          const desconto = arredondarCentavo(quantidade * precoUnitario * fracaoDesconto);
          const comDesconto = valorLiquidoItem(item(quantidade, precoUnitario, desconto));
          const semDesconto = valorLiquidoItem(item(quantidade, precoUnitario, 0));
          expect(centavos(semDesconto) - centavos(comDesconto)).toBe(centavos(desconto));
        },
      ),
      CASOS,
    );
  });

  it("desconto MAIOR que a linha produz valor negativo — e é por isso que o TR-05.1 existe", () => {
    // Documenta o limite de propósito, em vez de escondê-lo com um clamp em
    // zero: o banco hoje aceita `desconto > quantidade × preço`, e nenhuma
    // trava impede isso. Zerar aqui faria a nota sair com um valor que não
    // corresponde à OS, o que é pior que recusar. A correção certa é a
    // constraint `ck_ordens_servico_itens_desconto` do item TR-05.1 do guia,
    // que ainda não foi criada (precisa de migration e de conferir o banco
    // real antes). Se este teste um dia falhar, é porque alguém adicionou o
    // clamp — e aí a decisão precisa ser consciente.
    expect(valorLiquidoItem(item(1, 10, 15))).toBeLessThan(0);
  });
});

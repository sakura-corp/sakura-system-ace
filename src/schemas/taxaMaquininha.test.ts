import { describe, expect, it } from "vitest";
import {
  agruparCartaoAReceberPorDia,
  calcularTaxaDaMaquininha,
  paraTaxasMaquininha,
  paraValoresFormularioTaxas,
  rotuloLinhaTaxa,
  taxasMaquininhaFormSchema,
  type TaxaMaquininha,
  type TaxasMaquininhaFormValues,
} from "./taxaMaquininha";

// #387: a taxa que a maquininha cobra da LOJA e quando o dinheiro do cartão
// cai na conta. Os números de exemplo são inventados (nenhuma taxa de loja
// de verdade entra aqui). Os esperados são escritos à mão, nunca recalculados
// com a mesma conta do código.

const tabela: TaxaMaquininha[] = [
  { forma: "cartao_debito", parcelas: 1, taxa_percentual: 2, prazo_dias: 1, recebe_tudo_de_uma_vez: false },
  { forma: "cartao_credito", parcelas: 1, taxa_percentual: 3, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
  { forma: "cartao_credito", parcelas: 3, taxa_percentual: 4, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
];

describe("calcularTaxaDaMaquininha", () => {
  it("R$ 100,00 no crédito à vista com 3% e 30 dias: taxa 3,00 e cai 97,00 trinta dias depois", () => {
    expect(calcularTaxaDaMaquininha(100, "cartao_credito", 1, tabela, "2026-11-18")).toEqual({
      informada: true,
      forma: "cartao_credito",
      parcelas: 1,
      taxaPercentual: 3,
      prazoDias: 30,
      recebeTudoDeUmaVez: false,
      valorBruto: 100,
      valorTaxa: 3,
      valorLiquido: 97,
      recebimentos: [{ numero: 1, dataPrevista: "2026-12-18", valor: 97 }],
    });
  });

  it("3x com 4% e 30 dias: três datas (30, 60 e 90 dias) e o líquido fecha com o total menos a taxa, centavo na última", () => {
    const r = calcularTaxaDaMaquininha(100.1, "cartao_credito", 3, tabela, "2026-11-18");
    expect(r).toMatchObject({ informada: true, parcelas: 3, valorBruto: 100.1, valorTaxa: 4, valorLiquido: 96.1 });
    if (!r.informada) throw new Error("devia ter calculado");
    expect(r.recebimentos).toEqual([
      { numero: 1, dataPrevista: "2026-12-18", valor: 32.03 },
      { numero: 2, dataPrevista: "2027-01-17", valor: 32.03 },
      { numero: 3, dataPrevista: "2027-02-16", valor: 32.04 },
    ]);
  });

  it("\"recebo tudo de uma vez\": o parcelado cai numa data só (o prazo), com o líquido inteiro", () => {
    const tudoDeUmaVez: TaxaMaquininha[] = [
      { forma: "cartao_credito", parcelas: 6, taxa_percentual: 5, prazo_dias: 2, recebe_tudo_de_uma_vez: true },
    ];
    const r = calcularTaxaDaMaquininha(600, "cartao_credito", 6, tudoDeUmaVez, "2026-11-18");
    expect(r).toMatchObject({ informada: true, recebeTudoDeUmaVez: true, valorTaxa: 30, valorLiquido: 570 });
    if (!r.informada) throw new Error("devia ter calculado");
    expect(r.recebimentos).toEqual([{ numero: 1, dataPrevista: "2026-11-20", valor: 570 }]);
  });

  it("tabela em branco: \"não informada\", nunca taxa zero", () => {
    expect(calcularTaxaDaMaquininha(100, "cartao_credito", 1, [], "2026-11-18")).toEqual({
      informada: false,
      motivo: "nao_informada",
    });
    expect(calcularTaxaDaMaquininha(100, "cartao_debito", 1, [], "2026-11-18")).toEqual({
      informada: false,
      motivo: "nao_informada",
    });
  });

  it("tabela sem a linha daquelas parcelas (5x não foi informado): \"não informada\"", () => {
    expect(calcularTaxaDaMaquininha(100, "cartao_credito", 5, tabela, "2026-11-18")).toEqual({
      informada: false,
      motivo: "nao_informada",
    });
  });

  it("Pix e dinheiro não são cartão: não calculam, mesmo com a tabela preenchida", () => {
    for (const forma of ["pix", "dinheiro", ""]) {
      expect(calcularTaxaDaMaquininha(100, forma, 1, tabela, "2026-11-18")).toEqual({
        informada: false,
        motivo: "nao_e_cartao",
      });
    }
  });

  it("débito ignora as parcelas: usa a linha do débito e cai numa data só", () => {
    const r = calcularTaxaDaMaquininha(50, "cartao_debito", 3, tabela, "2026-11-18");
    expect(r).toEqual({
      informada: true,
      forma: "cartao_debito",
      parcelas: 1,
      taxaPercentual: 2,
      prazoDias: 1,
      recebeTudoDeUmaVez: false,
      valorBruto: 50,
      valorTaxa: 1,
      valorLiquido: 49,
      recebimentos: [{ numero: 1, dataPrevista: "2026-11-19", valor: 49 }],
    });
  });

  it("taxa quebrada arredonda no centavo, e o líquido é o total menos a taxa arredondada", () => {
    const quebrada: TaxaMaquininha[] = [
      { forma: "cartao_credito", parcelas: 1, taxa_percentual: 3.49, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
    ];
    // 99,99 × 3,49% = 3,489651 → 3,49; 99,99 − 3,49 = 96,50
    expect(calcularTaxaDaMaquininha(99.99, "cartao_credito", 1, quebrada, "2026-11-18")).toMatchObject({
      valorTaxa: 3.49,
      valorLiquido: 96.5,
    });
  });

  describe("as datas são dia de calendário, sem fuso", () => {
    const debitoUmDia: TaxaMaquininha[] = [
      { forma: "cartao_debito", parcelas: 1, taxa_percentual: 2, prazo_dias: 1, recebe_tudo_de_uma_vez: false },
    ];
    const datas = (r: ReturnType<typeof calcularTaxaDaMaquininha>) =>
      r.informada ? r.recebimentos.map((p) => p.dataPrevista) : [];

    it("vira o mês e o ano", () => {
      expect(datas(calcularTaxaDaMaquininha(10, "cartao_debito", 1, debitoUmDia, "2026-10-31"))).toEqual([
        "2026-11-01",
      ]);
      expect(datas(calcularTaxaDaMaquininha(10, "cartao_debito", 1, debitoUmDia, "2026-12-31"))).toEqual([
        "2027-01-01",
      ]);
    });

    it("fevereiro: 28 dias no ano comum, 29 no bissexto", () => {
      const doisX: TaxaMaquininha[] = [
        { forma: "cartao_credito", parcelas: 2, taxa_percentual: 4, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
      ];
      // 30/01 + 30 dias: 01/03 em 2027 (fevereiro com 28) e 29/02 em 2028.
      expect(datas(calcularTaxaDaMaquininha(10, "cartao_credito", 2, doisX, "2027-01-30"))).toEqual([
        "2027-03-01",
        "2027-03-31",
      ]);
      expect(datas(calcularTaxaDaMaquininha(10, "cartao_credito", 2, doisX, "2028-01-30"))).toEqual([
        "2028-02-29",
        "2028-03-30",
      ]);
      expect(datas(calcularTaxaDaMaquininha(10, "cartao_debito", 1, debitoUmDia, "2028-02-28"))).toEqual([
        "2028-02-29",
      ]);
    });

    it("prazo zero cai no próprio dia", () => {
      const naHora: TaxaMaquininha[] = [
        { forma: "cartao_debito", parcelas: 1, taxa_percentual: 1, prazo_dias: 0, recebe_tudo_de_uma_vez: false },
      ];
      expect(datas(calcularTaxaDaMaquininha(10, "cartao_debito", 1, naHora, "2026-11-18"))).toEqual([
        "2026-11-18",
      ]);
    });
  });

  it("valor pequeno demais pra todas as parcelas: a parcela de R$ 0,00 continua na lista (o banco quer as parcelas de 1 a N, sem buraco)", () => {
    const tresX: TaxaMaquininha[] = [
      { forma: "cartao_credito", parcelas: 3, taxa_percentual: 0, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
    ];
    const r = calcularTaxaDaMaquininha(0.02, "cartao_credito", 3, tresX, "2026-11-18");
    if (!r.informada) throw new Error("devia ter calculado");
    expect(r.valorLiquido).toBe(0.02);
    expect(r.recebimentos).toEqual([
      { numero: 1, dataPrevista: "2026-12-18", valor: 0 },
      { numero: 2, dataPrevista: "2027-01-17", valor: 0.01 },
      { numero: 3, dataPrevista: "2027-02-16", valor: 0.01 },
    ]);
  });
});

describe("agruparCartaoAReceberPorDia", () => {
  it("junta por dia, do mais cedo pro mais tarde, com o total do dia fechado no centavo", () => {
    const a = { id: "a", data_prevista: "2026-12-18", valor: 0.1 };
    const b = { id: "b", data_prevista: "2026-11-19", valor: 49 };
    const c = { id: "c", data_prevista: "2026-12-18", valor: 0.2 };
    expect(agruparCartaoAReceberPorDia([a, b, c])).toEqual([
      { data: "2026-11-19", total: 49, itens: [b] },
      { data: "2026-12-18", total: 0.3, itens: [a, c] },
    ]);
  });

  it("lista vazia: nenhum dia", () => {
    expect(agruparCartaoAReceberPorDia([])).toEqual([]);
  });
});

describe("formulário das taxas (Configurações → Taxas da maquininha)", () => {
  it("tabela em branco: as 13 linhas (débito, crédito à vista, 2x a 12x) aparecem vazias", () => {
    const valores = paraValoresFormularioTaxas([]);
    expect(valores.linhas).toHaveLength(13);
    expect(valores.linhas.map((l) => rotuloLinhaTaxa(l.forma, l.parcelas))).toEqual([
      "Débito",
      "Crédito à vista",
      "Crédito 2x",
      "Crédito 3x",
      "Crédito 4x",
      "Crédito 5x",
      "Crédito 6x",
      "Crédito 7x",
      "Crédito 8x",
      "Crédito 9x",
      "Crédito 10x",
      "Crédito 11x",
      "Crédito 12x",
    ]);
    for (const linha of valores.linhas) {
      expect(linha).toMatchObject({ taxa: "", prazo: "", recebe_tudo_de_uma_vez: false });
    }
  });

  it("o que a loja já informou volta pro campo, com vírgula", () => {
    const valores = paraValoresFormularioTaxas([
      { forma: "cartao_credito", parcelas: 3, taxa_percentual: 4.49, prazo_dias: 30, recebe_tudo_de_uma_vez: true },
      { forma: "cartao_debito", parcelas: 1, taxa_percentual: 2, prazo_dias: 1, recebe_tudo_de_uma_vez: false },
    ]);
    expect(valores.linhas[0]).toEqual({
      forma: "cartao_debito",
      parcelas: 1,
      taxa: "2",
      prazo: "1",
      recebe_tudo_de_uma_vez: false,
    });
    expect(valores.linhas[3]).toEqual({
      forma: "cartao_credito",
      parcelas: 3,
      taxa: "4,49",
      prazo: "30",
      recebe_tudo_de_uma_vez: true,
    });
    expect(valores.linhas[1]).toMatchObject({ taxa: "", prazo: "" });
  });

  it("de volta pro banco: linha com os dois em branco não existe; taxa com vírgula ou ponto vira número", () => {
    const valores = paraValoresFormularioTaxas([]);
    valores.linhas[0] = { ...valores.linhas[0], taxa: "1,99", prazo: "1" };
    valores.linhas[1] = { ...valores.linhas[1], taxa: "3.5", prazo: " 30 " };
    valores.linhas[5] = { ...valores.linhas[5], taxa: "0", prazo: "0", recebe_tudo_de_uma_vez: true };
    // Marcou "tudo de uma vez" mas deixou taxa e prazo em branco: a linha não existe.
    valores.linhas[7] = { ...valores.linhas[7], recebe_tudo_de_uma_vez: true };
    expect(paraTaxasMaquininha(valores)).toEqual([
      { forma: "cartao_debito", parcelas: 1, taxa_percentual: 1.99, prazo_dias: 1, recebe_tudo_de_uma_vez: false },
      { forma: "cartao_credito", parcelas: 1, taxa_percentual: 3.5, prazo_dias: 30, recebe_tudo_de_uma_vez: false },
      { forma: "cartao_credito", parcelas: 5, taxa_percentual: 0, prazo_dias: 0, recebe_tudo_de_uma_vez: true },
    ]);
  });

  it("\"tudo de uma vez\" só existe no parcelado: no débito e no crédito à vista é sempre falso", () => {
    const valores = paraValoresFormularioTaxas([]);
    valores.linhas[0] = { ...valores.linhas[0], taxa: "2", prazo: "1", recebe_tudo_de_uma_vez: true };
    valores.linhas[1] = { ...valores.linhas[1], taxa: "3", prazo: "30", recebe_tudo_de_uma_vez: true };
    expect(paraTaxasMaquininha(valores).map((l) => l.recebe_tudo_de_uma_vez)).toEqual([false, false]);
  });

  describe("validação", () => {
    function comLinha(i: number, taxa: string, prazo: string): TaxasMaquininhaFormValues {
      const valores = paraValoresFormularioTaxas([]);
      valores.linhas[i] = { ...valores.linhas[i], taxa, prazo };
      return valores;
    }
    function erros(valores: TaxasMaquininhaFormValues) {
      const r = taxasMaquininhaFormSchema.safeParse(valores);
      return r.success ? [] : r.error.issues.map((e) => ({ caminho: e.path.join("."), mensagem: e.message }));
    }

    it("tudo em branco é válido (a loja ainda não informou nada)", () => {
      expect(erros(paraValoresFormularioTaxas([]))).toEqual([]);
    });

    it("taxa e prazo nos limites são válidos", () => {
      expect(erros(comLinha(1, "0", "0"))).toEqual([]);
      expect(erros(comLinha(1, "99,99", "365"))).toEqual([]);
      expect(erros(comLinha(1, "3.5", "30"))).toEqual([]);
    });

    it("só a taxa preenchida: erro no prazo, dizendo o que fazer", () => {
      expect(erros(comLinha(3, "4", ""))).toEqual([
        { caminho: "linhas.3.prazo", mensagem: "Preencha o prazo do Crédito 3x, ou apague a taxa." },
      ]);
    });

    it("só o prazo preenchido: erro na taxa, dizendo o que fazer", () => {
      expect(erros(comLinha(0, "", "1"))).toEqual([
        { caminho: "linhas.0.taxa", mensagem: "Preencha a taxa do Débito, ou apague o prazo." },
      ]);
    });

    it("taxa fora de 0 a 99,99, com 3 casas ou que não é número: erro na taxa", () => {
      for (const taxa of ["100", "-1", "3,499", "abc", "1e2", "3,5%"]) {
        expect(erros(comLinha(1, taxa, "30"))).toEqual([
          {
            caminho: "linhas.1.taxa",
            mensagem: "A taxa vai de 0 a 99,99%, com até 2 casas depois da vírgula.",
          },
        ]);
      }
    });

    it("prazo fora de 0 a 365 ou quebrado: erro no prazo", () => {
      for (const prazo of ["366", "-1", "1,5", "trinta"]) {
        expect(erros(comLinha(1, "3", prazo))).toEqual([
          { caminho: "linhas.1.prazo", mensagem: "O prazo vai de 0 a 365 dias, sem casas depois da vírgula." },
        ]);
      }
    });
  });
});

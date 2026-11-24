import { describe, expect, it } from "vitest";
import {
  discriminacaoComTributos,
  LIMITE_DISCRIMINACAO_NFSE,
  resumoDosServicos,
} from "./discriminacaoNFSe";

function servico(descricao: string, quantidade: number, preco_unitario: number, desconto = 0) {
  return { descricao, quantidade, preco_unitario, desconto };
}

describe("resumoDosServicos", () => {
  it("uma linha por serviço, com o valor quando a soma bate com o da nota", () => {
    expect(
      resumoDosServicos([servico("Alinhamento", 1, 80), servico("Balanceamento", 4, 15, 10)], 130),
    ).toBe("Alinhamento - R$ 80,00\n4 x Balanceamento - R$ 50,00");
  });

  it("quantidade 1 não aparece; quantidade quebrada sai com vírgula", () => {
    expect(resumoDosServicos([servico("Mão de obra", 1.5, 100)], 150)).toBe(
      "1,5 x Mão de obra - R$ 150,00",
    );
  });

  it("se a soma das linhas não der o valor da nota, sai sem valor", () => {
    expect(
      resumoDosServicos([servico("Alinhamento", 1, 80), servico("Balanceamento", 1, 50)], 129.99),
    ).toBe("Alinhamento\nBalanceamento");
  });

  it("descrição vazia ou com espaços sobrando", () => {
    expect(resumoDosServicos([servico("  Rodízio  ", 1, 40), servico(" ", 1, 10)], 50)).toBe(
      "Rodízio - R$ 40,00\nServiço - R$ 10,00",
    );
  });

  it("resumo comprido é cortado no limite, com reticências", () => {
    const itens = Array.from({ length: 200 }, (_, i) => servico(`Serviço número ${i + 1}`, 1, 10));
    const resumo = resumoDosServicos(itens, 2000);
    expect(resumo).toHaveLength(LIMITE_DISCRIMINACAO_NFSE);
    expect(resumo.endsWith("...")).toBe(true);
    expect(resumo.startsWith("Serviço número 1 - R$ 10,00\nServiço número 2 - R$ 10,00")).toBe(true);
  });
});

describe("discriminacaoComTributos", () => {
  const LINHA = "Tributos aproximados: R$ 13,00 (6,50%). Alíquota efetiva do Simples Nacional, Lei 12.741/2012.";

  it("sem a linha dos tributos: o resumo como está", () => {
    expect(discriminacaoComTributos("Alinhamento", null)).toBe("Alinhamento");
  });

  it("com a linha: no fim, numa linha nova", () => {
    expect(discriminacaoComTributos("Alinhamento\nBalanceamento", LINHA)).toBe(
      `Alinhamento\nBalanceamento\n${LINHA}`,
    );
  });

  it("passou do limite: corta o resumo, nunca a linha dos tributos", () => {
    const resumo = "x".repeat(LIMITE_DISCRIMINACAO_NFSE);
    const texto = discriminacaoComTributos(resumo, LINHA);
    expect(texto).toHaveLength(LIMITE_DISCRIMINACAO_NFSE);
    expect(texto.endsWith(`...\n${LINHA}`)).toBe(true);
  });

  it("o limite é 2000 caracteres (descrição da NFS-e Nacional)", () => {
    expect(LIMITE_DISCRIMINACAO_NFSE).toBe(2000);
  });
});

import { describe, expect, it } from "vitest";
import {
  ehRejeicaoDeDestinatario,
  fraseRejeicaoDeDestinatario,
  textoParaCopiarOErro,
} from "./rejeicaoNFCe";

// A mensagem real de 17/11, com um CNPJ de exemplo no lugar do do cliente
// (o repositório é público). Veio em `mensagem_sefaz`, com status
// "erro_autorizacao".
const MENSAGEM_DE_17_11 =
  "Rejeição: CNPJ 12.345.678/0001-99 do destinatário não cadastrado na Receita Federal";

describe("ehRejeicaoDeDestinatario", () => {
  it("a mensagem real de 17/11 (CNPJ do destinatário não cadastrado) é reconhecida", () => {
    expect(
      ehRejeicaoDeDestinatario({ status: "erro_autorizacao", mensagem_sefaz: MENSAGEM_DE_17_11 }),
    ).toBe(true);
  });

  it("a de CPF também", () => {
    expect(
      ehRejeicaoDeDestinatario({
        status: "erro_autorizacao",
        mensagem_sefaz: "Rejeição: CPF do destinatário inválido",
      }),
    ).toBe(true);
  });

  it("sem acento e em maiúsculas também", () => {
    expect(
      ehRejeicaoDeDestinatario({
        status: "erro_autorizacao",
        mensagem_sefaz: "REJEICAO: CNPJ DO DESTINATARIO NAO CADASTRADO NA RECEITA FEDERAL",
      }),
    ).toBe(true);
  });

  it("vinda na lista de erros (sem mensagem_sefaz) também", () => {
    expect(
      ehRejeicaoDeDestinatario({
        status: "erro_autorizacao",
        erros: [{ mensagem: "CNPJ do destinatário não cadastrado na Receita Federal" }],
      }),
    ).toBe(true);
  });

  it.each([
    "Rejeição: CSOSN incompatível na operação com Não Contribuinte [nItem:1]",
    "Rejeição: CST incompatível na operação com Não Contribuinte [nItem:1]",
    "Rejeição: Total do Produto / Serviço difere do somatório dos itens",
    "Rejeição: CNPJ do emitente inválido",
  ])("rejeição de outra família não é: %s", (mensagem) => {
    expect(ehRejeicaoDeDestinatario({ status: "erro_autorizacao", mensagem_sefaz: mensagem })).toBe(
      false,
    );
  });

  it("nota autorizada nunca é rejeição", () => {
    expect(
      ehRejeicaoDeDestinatario({ status: "autorizado", mensagem_sefaz: MENSAGEM_DE_17_11 }),
    ).toBe(false);
  });

  it("coisa que não é resposta da Focus: não é", () => {
    expect(ehRejeicaoDeDestinatario(null)).toBe(false);
    expect(ehRejeicaoDeDestinatario(undefined)).toBe(false);
    expect(ehRejeicaoDeDestinatario("erro")).toBe(false);
    expect(ehRejeicaoDeDestinatario({})).toBe(false);
  });
});

describe("fraseRejeicaoDeDestinatario", () => {
  it("pessoa jurídica: fala da empresa nova e oferece emitir sem identificar", () => {
    expect(fraseRejeicaoDeDestinatario("juridica")).toBe(
      "A SEFAZ ainda não reconhece o CNPJ deste cliente. Se a empresa dele é nova, isso " +
        "costuma levar alguns dias pra aparecer lá, mesmo com o CNPJ certo e ativo na Receita. " +
        "Você pode emitir agora sem identificar o cliente.",
    );
  });

  it("pessoa física: sem a parte da empresa nova, e sugere conferir o CPF", () => {
    const frase = fraseRejeicaoDeDestinatario("fisica");
    expect(frase).toContain("A SEFAZ não reconheceu o CPF deste cliente");
    expect(frase).toContain("confira o CPF no cadastro");
    expect(frase).toContain("emitir agora sem identificar o cliente");
    expect(frase).not.toMatch(/empresa/i);
  });
});

describe("textoParaCopiarOErro", () => {
  const cliente = { nome: "Transportes Exemplo Ltda", cpf_cnpj: "12.345.678/0001-99" };

  it("leva a rejeição, o código e a referência", () => {
    const texto = textoParaCopiarOErro(
      {
        status: "erro_autorizacao",
        status_sefaz: "999",
        mensagem_sefaz: MENSAGEM_DE_17_11,
      },
      "os12-nfce-1763400000000",
      cliente,
    );
    expect(texto).toContain("do destinatário não cadastrado na Receita Federal");
    expect(texto).toContain("Código da SEFAZ: 999");
    expect(texto).toContain("Referência: os12-nfce-1763400000000");
  });

  it("não leva o nome nem o documento do cliente, nem formatado nem só números", () => {
    const comNomeEDocumento = {
      status: "erro_autorizacao",
      mensagem_sefaz:
        "Rejeição: CNPJ 12.345.678/0001-99 (12345678000199) do destinatário Transportes " +
        "Exemplo Ltda não cadastrado",
    };
    const texto = textoParaCopiarOErro(comNomeEDocumento, "os12-nfce-1", cliente);
    expect(texto).not.toContain("12.345.678/0001-99");
    expect(texto).not.toContain("12345678000199");
    expect(texto).not.toMatch(/transportes exemplo/i);
  });

  it("CPF de outro jeito escrito também sai escondido", () => {
    const texto = textoParaCopiarOErro(
      { status: "erro_autorizacao", mensagem_sefaz: "Rejeição: CPF 123.456.789-09 inválido" },
      "os12-nfce-1",
      { nome: "Maria", cpf_cnpj: null },
    );
    expect(texto).not.toContain("123.456.789-09");
    expect(texto).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  });

  it("sem código: diz que não veio, em vez de 'undefined'", () => {
    const texto = textoParaCopiarOErro(
      { status: "erro_autorizacao", mensagem_sefaz: MENSAGEM_DE_17_11 },
      "os12-nfce-1",
      null,
    );
    expect(texto).toContain("Código da SEFAZ: (não veio)");
    expect(texto).not.toContain("undefined");
  });
});

import { describe, expect, it } from "vitest";
import {
  avisoLimiteDepoisDaRecusa,
  ehRejeicaoDeDestinatario,
  fraseRejeicaoDeDestinatario,
  textoParaCopiarOErro,
} from "./rejeicaoNFCe";

// A mensagem real de 17/11, com um CNPJ de exemplo no lugar do do cliente
// (o repositório é público). Veio em `mensagem_sefaz`, com status
// "erro_autorizacao". 11.222.333/0001-81 é um CNPJ de exemplo com os dígitos
// certos; 12.345.678/0001-99 tem o dígito errado.
const CNPJ_CERTO = "11.222.333/0001-81";
const CNPJ_DIGITO_ERRADO = "12.345.678/0001-99";
const MENSAGEM_DE_17_11 = `Rejeição: CNPJ ${CNPJ_CERTO} do destinatário não cadastrado na Receita Federal`;

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

  it("recusa direta da Focus (corpo de erro, sem status) também", () => {
    expect(
      ehRejeicaoDeDestinatario({ mensagem: "CNPJ do destinatário não cadastrado na Receita Federal" }),
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

  it.each(["autorizado", "denegado", "cancelado", "processando_autorizacao"])(
    "status %s nunca é esta rejeição",
    (status) => {
      expect(ehRejeicaoDeDestinatario({ status, mensagem_sefaz: MENSAGEM_DE_17_11 })).toBe(false);
    },
  );

  it("coisa que não é resposta da Focus: não é", () => {
    expect(ehRejeicaoDeDestinatario(null)).toBe(false);
    expect(ehRejeicaoDeDestinatario(undefined)).toBe(false);
    expect(ehRejeicaoDeDestinatario("erro")).toBe(false);
    expect(ehRejeicaoDeDestinatario({})).toBe(false);
  });
});

describe("fraseRejeicaoDeDestinatario", () => {
  it("pessoa jurídica com CNPJ certo: fala da empresa nova e oferece emitir sem identificar", () => {
    expect(fraseRejeicaoDeDestinatario({ tipo_pessoa: "juridica", cpf_cnpj: CNPJ_CERTO })).toBe(
      "A SEFAZ ainda não reconhece o CNPJ deste cliente. Se a empresa dele é nova, isso " +
        "costuma levar alguns dias pra aparecer lá, mesmo com o CNPJ certo e ativo na Receita. " +
        "Você pode emitir agora sem identificar o cliente.",
    );
  });

  it("CNPJ com o dígito errado no cadastro: manda corrigir, não fala de empresa nova", () => {
    const frase = fraseRejeicaoDeDestinatario({ tipo_pessoa: "juridica", cpf_cnpj: CNPJ_DIGITO_ERRADO });
    expect(frase).toContain("O CNPJ no cadastro deste cliente tem um número errado");
    expect(frase).toContain("corrija em Clientes, feche esta janela e abra de novo");
    expect(frase).toContain("emitir agora sem identificar o cliente");
    expect(frase).not.toMatch(/empresa dele é nova/);
  });

  it("CPF com o dígito errado no cadastro: o mesmo, com CPF", () => {
    const frase = fraseRejeicaoDeDestinatario({ tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-00" });
    expect(frase).toContain("O CPF no cadastro deste cliente tem um número errado");
  });

  it("pessoa física com CPF certo: sem a parte da empresa nova, diz como tentar de novo", () => {
    const frase = fraseRejeicaoDeDestinatario({ tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09" });
    expect(frase).toContain("A SEFAZ não reconheceu o CPF deste cliente");
    expect(frase).toContain("feche esta janela e abra de novo");
    expect(frase).toContain("emitir agora sem identificar o cliente");
    expect(frase).not.toMatch(/empresa/i);
  });
});

describe("avisoLimiteDepoisDaRecusa", () => {
  it("abaixo de R$ 10.000: nada", () => {
    expect(avisoLimiteDepoisDaRecusa(9999.99)).toBeNull();
  });

  it("no limite: diz que a SEFAZ também deve recusar sem o cliente, sem mandar cadastrar o documento", () => {
    const aviso = avisoLimiteDepoisDaRecusa(10500);
    expect(aviso).toContain("R$ 10.000 ou mais");
    expect(aviso).toContain("a SEFAZ também deve recusar");
    expect(aviso).not.toMatch(/cadastre o documento/);
  });
});

describe("textoParaCopiarOErro", () => {
  const cliente = { nome: "Transportes Exemplo Ltda", cpf_cnpj: CNPJ_CERTO };
  // Sobrou algum pedaço de 3 ou mais números do documento na linha da mensagem?
  const linhaDaMensagem = (texto: string) => texto.split("\n").find((l) => l.startsWith("Mensagem:"))!;

  it("leva a rejeição, o código e a referência", () => {
    const texto = textoParaCopiarOErro(
      { status: "erro_autorizacao", status_sefaz: "999", mensagem_sefaz: MENSAGEM_DE_17_11 },
      "os12-nfce-1763400000000",
      cliente,
    );
    expect(texto).toContain("do destinatário não cadastrado na Receita Federal");
    expect(texto).toContain("Código da SEFAZ: 999");
    expect(texto).toContain("Referência: os12-nfce-1763400000000");
  });

  it.each([
    ["formatado", `Rejeição: CNPJ ${CNPJ_CERTO} do destinatário não cadastrado`],
    ["só números", "Rejeição: CNPJ 11222333000181 do destinatário não cadastrado"],
    ["os dois", `Rejeição: CNPJ ${CNPJ_CERTO} (11222333000181) do destinatário não cadastrado`],
  ])("documento %s: não sobra nenhum pedaço dele", (_caso, mensagem) => {
    // O cadastro guarda com máscara; a SEFAZ pode mandar só os números.
    const linha = linhaDaMensagem(
      textoParaCopiarOErro({ status: "erro_autorizacao", mensagem_sefaz: mensagem }, "os12-nfce-1", cliente),
    );
    expect(linha).toContain("[documento]");
    expect(linha).not.toMatch(/\d{3}/);
  });

  it("documento que não é o do cadastro (CPF, CNPJ, com ou sem máscara) também some", () => {
    const linha = linhaDaMensagem(
      textoParaCopiarOErro(
        {
          status: "erro_autorizacao",
          mensagem_sefaz: "Rejeição: CPF 123.456.789-09 / 12345678909 / CNPJ 98765432000198 inválido",
        },
        "os12-nfce-1",
        { nome: "Maria", cpf_cnpj: null },
      ),
    );
    expect(linha).not.toMatch(/\d{3}/);
  });

  it("número curto (item, código) continua: só some o que tem cara de documento", () => {
    const linha = linhaDaMensagem(
      textoParaCopiarOErro(
        { status: "erro_autorizacao", mensagem_sefaz: "Rejeição 233 do destinatário [nItem:1]" },
        "os12-nfce-1",
        null,
      ),
    );
    expect(linha).toContain("Rejeição 233 do destinatário [nItem:1]");
  });

  it("o nome do cliente some, com ou sem acento e em qualquer caixa", () => {
    const linha = linhaDaMensagem(
      textoParaCopiarOErro(
        { status: "erro_autorizacao", mensagem_sefaz: "Rejeição: destinatário JOSE DA SILVA não cadastrado" },
        "os12-nfce-1",
        { nome: "José da Silva", cpf_cnpj: null },
      ),
    );
    expect(linha).not.toMatch(/jos[eé] da silva/i);
    expect(linha).toContain("[cliente]");
    expect(linha).toContain("não cadastrado");
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

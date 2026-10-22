import { beforeEach, describe, expect, it, vi } from "vitest";
import { emitirNFCe, FocusNfeError, montarCorpoNFCe, montarCorpoNFSe } from "./focusNfe";
import type { OrdemServico } from "@/types/os";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { Cliente } from "@/types/cliente";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import type { Peca } from "@/types/peca";

// Só a checagem antes da emissão usa o porteiro; aqui ele é de mentira, pra
// provar que a nota sem NCM nem chega a ser pedida.
const invoke = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { functions: { invoke } } }));

function configuracaoFiscal(sobrescrever: Partial<ConfiguracaoFiscalLoja> = {}): ConfiguracaoFiscalLoja {
  return {
    loja_id: "loja-1",
    cnpj: "51.916.585/0001-25",
    razao_social: "Amigão Pneus",
    nome_fantasia: "Amigão Pneus",
    inscricao_estadual: "123456",
    inscricao_municipal: "12345",
    regime_tributario: "simples_nacional",
    cep: "14800-000",
    rua: "Rua Exemplo",
    numero: "100",
    bairro: "Centro",
    cidade: "Araraquara",
    uf: "SP",
    telefone: null,
    email: null,
    focus_nfe_configurado: true,
    focus_nfe_ambiente: "homologacao",
    codigo_municipio: "3503208",
    item_lista_servico: "14.01",
    aliquota_iss: 5,
    codigo_tributario_municipio: null,
    codigo_cnae: "4520-0/01",
    competencia_aliquota_confirmada: null,
    aliquota_passo_a_passo: null,
    atualizado_em: new Date().toISOString(),
    ...sobrescrever,
  };
}

function peca(sobrescrever: Partial<Peca> = {}): Peca {
  return {
    id: "peca-1",
    codigo_interno: "999",
    codigo_barras: null,
    descricao: "Pneu 175/70 R13",
    marca: null,
    modelo: null,
    aplicacao: null,
    unidade: "UN",
    preco_custo: 100,
    preco_venda: 250,
    ncm: "40111000",
    cest: null,
    cfop_padrao: "5102",
    origem: "0",
    cst_ou_csosn: "102",
    aliquota_icms: 0,
    categoria_id: null,
    prazo_garantia_dias: null,
    estoque_minimo: null,
    medida: null,
    indice_carga_velocidade: null,
    dot: null,
    ativo: true,
    criado_em: new Date().toISOString(),
    ...sobrescrever,
  };
}

function clientePessoaFisica(sobrescrever: Partial<Cliente> = {}): Cliente {
  return {
    id: "cliente-1",
    nome: "Cliente Exemplo da Silva",
    tipo_pessoa: "fisica",
    cpf_cnpj: "123.456.789-09",
    telefone: null,
    email: null,
    cep: "14800-000",
    rua: "Rua Exemplo",
    numero: "100",
    bairro: "Centro",
    cidade: "Araraquara",
    uf: "SP",
    codigo_municipio: "3503208",
    data_nascimento: null,
    criado_em: new Date().toISOString(),
    ...sobrescrever,
  };
}

describe("montarCorpoNFCe", () => {
  it("monta um item por peça, com os campos fiscais dela e valores formatados com 2 casas", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 2, precoUnitario: 250, desconto: 0 }],
      cliente: clientePessoaFisica(),
      pagamentos: [{ formaPagamento: "pix", valor: 500 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.items).toHaveLength(1);
    expect(corpo.items[0]).toMatchObject({
      numero_item: "1",
      codigo_ncm: "40111000",
      codigo_produto: "999",
      cfop: "5102",
      icms_origem: "0",
      icms_situacao_tributaria: "102",
      icms_aliquota: "0",
      icms_base_calculo: "0",
      valor_bruto: "500.00",
    });
    expect(corpo.valor_produtos).toBe("500.00");
    expect(corpo.valor_total).toBe("500.00");
    expect(corpo.forma_pagamento).toBe("0");
    expect(corpo.formas_pagamento).toEqual([{ forma_pagamento: "17", valor_pagamento: "500.00" }]);
  });

  it("abate o desconto do item, pra nota não valer mais do que o cliente pagou", () => {
    // Peça de R$250 com R$50 de desconto: a nota tem que fechar em R$200,
    // que é o que entra no Caixa e o que os pagamentos informam. Ignorar o
    // desconto (como era antes) fazia a soma dos pagamentos ficar menor que
    // o total da nota — rejeição na hora de emitir.
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 50 }],
      cliente: clientePessoaFisica(),
      pagamentos: [{ formaPagamento: "pix", valor: 200 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.items[0].valor_bruto).toBe("200.00");
    expect(corpo.valor_produtos).toBe("200.00");
    expect(corpo.valor_total).toBe("200.00");
    // A SEFAZ confere que bruto = quantidade × unitário, então o desconto
    // entra abatido no preço unitário.
    expect(Number(corpo.items[0].valor_unitario_comercial)).toBeCloseTo(200, 10);
  });

  it("divide o desconto pela quantidade quando a linha tem mais de uma peça", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 4, precoUnitario: 250, desconto: 100 }],
      cliente: clientePessoaFisica(),
      pagamentos: [{ formaPagamento: "pix", valor: 900 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.items[0].valor_bruto).toBe("900.00");
    expect(Number(corpo.items[0].valor_unitario_comercial)).toBeCloseTo(225, 10);
  });

  it("usa o valor já com desconto como base do IBS/CBS e do ICMS", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca({ aliquota_icms: 18 }), quantidade: 1, precoUnitario: 100, desconto: 20 }],
      cliente: clientePessoaFisica(),
      pagamentos: [{ formaPagamento: "pix", valor: 80 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.items[0].icms_base_calculo).toBe("80.00");
    expect(corpo.items[0].ibs_cbs_base_calculo).toBe("80.00");
    expect(corpo.items[0].cbs_valor).toBe("0.72");
    expect(corpo.icms_valor_total).toBe("14.40");
  });

  it("identifica o destinatário pessoa física pelo CPF (sem formatação) e deixa o CNPJ de fora", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
      cliente: clientePessoaFisica(),
      pagamentos: [{ formaPagamento: "dinheiro", valor: 250 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.cpf_destinatario).toBe("12345678909");
    expect(corpo.nome_destinatario).toBe("Cliente Exemplo da Silva");
    expect(corpo.cnpj_destinatario).toBeUndefined();
    expect(corpo.indicador_inscricao_estadual_destinatario).toBeUndefined();
  });

  it("identifica o destinatário pessoa jurídica pelo CNPJ, com indicador de IE 9 e sem CPF", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
      cliente: clientePessoaFisica({
        tipo_pessoa: "juridica",
        nome: "Transportadora Exemplo Ltda",
        cpf_cnpj: "66.217.744/0001-70",
      }),
      pagamentos: [{ formaPagamento: "dinheiro", valor: 250 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.cnpj_destinatario).toBe("66217744000170");
    expect(corpo.nome_destinatario).toBe("Transportadora Exemplo Ltda");
    // O suporte da Focus NFe (03/09/2026) foi explícito: 9 = não contribuinte,
    // e a inscrição estadual do destinatário não vai de jeito nenhum.
    expect(corpo.indicador_inscricao_estadual_destinatario).toBe("9");
    expect(corpo.cpf_destinatario).toBeUndefined();
    expect(corpo).not.toHaveProperty("inscricao_estadual_destinatario");
  });

  it("deixa a nota como consumidor não identificado quando a empresa está sem CNPJ no cadastro", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
      cliente: clientePessoaFisica({ tipo_pessoa: "juridica", cpf_cnpj: "66.217.744" }),
      pagamentos: [{ formaPagamento: "dinheiro", valor: 250 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    // Mandar um CNPJ pela metade faria a SEFAZ recusar a nota inteira; sem
    // identificação ela é aceita (a tela de emissão avisa antes de mandar).
    expect(corpo.cnpj_destinatario).toBeUndefined();
    expect(corpo.indicador_inscricao_estadual_destinatario).toBeUndefined();
    expect(corpo.nome_destinatario).toBe("");
  });

  it("emite como consumidor não identificado quando a OS não tem cliente", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
      cliente: null,
      pagamentos: [{ formaPagamento: "dinheiro", valor: 250 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.nome_destinatario).toBe("");
    expect(corpo.cpf_destinatario).toBe("");
    expect(corpo.cnpj_destinatario).toBeUndefined();
  });

  it("o cliente Consumidor da venda de balcão sai sempre sem identificação, mesmo com CPF gravado nele", () => {
    // Se alguém gravar um CPF no Consumidor (só dá pela API — ele não aparece
    // no cadastro), toda venda anônima da loja iria parar no CPF dessa pessoa.
    for (const tipo_pessoa of ["fisica", "juridica"] as const) {
      const corpo = montarCorpoNFCe({
        ordem: { numero: 1 } as never,
        itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
        cliente: clientePessoaFisica({
          id: CLIENTE_CONSUMIDOR_ID,
          nome: "Consumidor",
          tipo_pessoa,
          cpf_cnpj: tipo_pessoa === "fisica" ? "123.456.789-09" : "66.217.744/0001-70",
        }),
        pagamentos: [{ formaPagamento: "dinheiro", valor: 250 }],
        configuracaoFiscal: configuracaoFiscal(),
      });

      expect(corpo.nome_destinatario).toBe("");
      expect(corpo.cpf_destinatario).toBe("");
      expect(corpo.cnpj_destinatario).toBeUndefined();
      expect(corpo.indicador_inscricao_estadual_destinatario).toBeUndefined();
    }
  });

  it("calcula icms_valor_total só quando a peça tem alíquota de ICMS", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca({ aliquota_icms: 18 }), quantidade: 1, precoUnitario: 100, desconto: 0 }],
      cliente: clientePessoaFisica(),
      pagamentos: [{ formaPagamento: "dinheiro", valor: 100 }],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.icms_valor_total).toBe("18.00");
    expect(corpo.items[0].icms_base_calculo).toBe("100.00");
  });

  it("soma mais de uma forma de pagamento em formas_pagamento, cada uma com o código SEFAZ certo", () => {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
      cliente: clientePessoaFisica(),
      pagamentos: [
        { formaPagamento: "pix", valor: 125 },
        { formaPagamento: "cartao_credito", valor: 125 },
      ],
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.formas_pagamento).toEqual([
      { forma_pagamento: "17", valor_pagamento: "125.00" },
      { forma_pagamento: "03", valor_pagamento: "125.00" },
    ]);
  });
});

describe("montarCorpoNFSe", () => {
  it("monta prestador a partir da configuração fiscal da loja e tomador a partir do cliente", () => {
    const corpo = montarCorpoNFSe({
      ordem: { numero: 1 } as never,
      discriminacao: "Alinhamento e balanceamento",
      valorServicos: 150,
      cliente: clientePessoaFisica(),
      codigoMunicipioCliente: "3503208",
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.prestador).toEqual({
      cnpj: "51916585000125",
      inscricao_municipal: "12345",
      codigo_municipio: "3503208",
    });
    expect(corpo.tomador.cpf).toBe("12345678909");
    expect(corpo.tomador.razao_social).toBe("Cliente Exemplo da Silva");
    expect(corpo.servico).toMatchObject({
      aliquota: 5,
      discriminacao: "Alinhamento e balanceamento",
      item_lista_servico: "14.01",
      codigo_cnae: "4520001",
      valor_servicos: 150,
    });
  });

  it("usa CNPJ (não CPF) pra cliente pessoa jurídica", () => {
    const corpo = montarCorpoNFSe({
      ordem: { numero: 1 } as never,
      discriminacao: "Serviço",
      valorServicos: 100,
      cliente: clientePessoaFisica({ tipo_pessoa: "juridica", cpf_cnpj: "66.217.744/0001-70" }),
      codigoMunicipioCliente: "3503208",
      configuracaoFiscal: configuracaoFiscal(),
    });

    expect(corpo.tomador.cnpj).toBe("66217744000170");
    expect(corpo.tomador.cpf).toBeUndefined();
  });
});

// Nenhuma nota sai sem NCM (#655). A tela já avisa antes (itensQueImpedemNFCe),
// mas esta é a última trava: nem pede a nota à Focus.
describe("emitirNFCe — peça sem NCM", () => {
  beforeEach(() => invoke.mockReset());

  const dados = (ncm: string | null) => ({
    ordem: { id: "os-1", numero: 12, status: "faturada" } as OrdemServico,
    itens: [
      { peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 },
      {
        peca: peca({ id: "peca-2", descricao: "Válvula de bico", ncm }),
        quantidade: 4,
        precoUnitario: 15,
        desconto: 0,
      },
    ],
    cliente: null,
    pagamentos: [{ formaPagamento: "pix", valor: 310 }],
    configuracaoFiscal: configuracaoFiscal(),
  });

  it.each([null, "", "   "])("NCM %j: recusa com o nome da peça e não chama a Focus", async (ncm) => {
    const promessa = emitirNFCe(dados(ncm));
    await expect(promessa).rejects.toBeInstanceOf(FocusNfeError);
    await expect(promessa).rejects.toThrow(/Válvula de bico.*NCM/);
    expect(invoke).not.toHaveBeenCalled();
  });
});

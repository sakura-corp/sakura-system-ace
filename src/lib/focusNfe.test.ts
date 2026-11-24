import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  codigoTributacaoNacional,
  destinatarioIdentificadoNFCe,
  emitirNFCe,
  emitirNFSe,
  EsperaVencidaError,
  FocusNfeError,
  montarCorpoNFCe,
  montarCorpoNFSe,
  montarCorpoNFSeNacional,
  montarDestinatarioNFCe,
  padraoNFSe,
  valorTotalNFCe,
} from "./focusNfe";
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
    percentual_tributos_simples: null,
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
    nao_avisar: false,
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

  // #981: o CFOP sai na nota só com os números, mesmo gravado com ponto ou
  // espaço na peça (o aviso do #968 já comparava assim).
  function cfopDoItem(cfop: string | null): string {
    const corpo = montarCorpoNFCe({
      ordem: { numero: 1 } as never,
      itens: [{ peca: peca({ cfop_padrao: cfop }), quantidade: 1, precoUnitario: 250, desconto: 0 }],
      cliente: clientePessoaFisica(),
      pagamentos: [{ formaPagamento: "pix", valor: 250 }],
      configuracaoFiscal: configuracaoFiscal(),
    });
    return corpo.items[0].cfop;
  }

  it("tira o ponto do CFOP gravado na peça (\"5.405\" sai \"5405\")", () => {
    expect(cfopDoItem("5.405")).toBe("5405");
  });

  it("tira os espaços do CFOP gravado na peça (\" 5102 \" sai \"5102\")", () => {
    expect(cfopDoItem(" 5102 ")).toBe("5102");
  });

  it("peça sem CFOP continua saindo 5102, e CFOP vazio continua vazio", () => {
    expect(cfopDoItem(null)).toBe("5102");
    expect(cfopDoItem("")).toBe("");
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

// NFS-e pelo Padrão Nacional (#837). Nomes dos campos conferidos na
// documentação da Focus NFe (doc.focusnfe.com.br, "NFSe Nacional → Emitir",
// e a lista completa em campos.focusnfe.com.br/nfse_nacional) — ver
// docs/pendencias-e-futuro.md. O que ainda depende do suporte está lá também.
describe("padraoNFSe", () => {
  it("empresa do Simples Nacional emite pelo Padrão Nacional", () => {
    expect(padraoNFSe(configuracaoFiscal({ regime_tributario: "simples_nacional" }))).toBe("nacional");
  });

  it("os outros regimes (e regime em branco) continuam no caminho municipal de hoje", () => {
    expect(padraoNFSe(configuracaoFiscal({ regime_tributario: "lucro_presumido" }))).toBe("municipal");
    expect(padraoNFSe(configuracaoFiscal({ regime_tributario: null }))).toBe("municipal");
  });
});

describe("codigoTributacaoNacional", () => {
  it("o item da LC 116 vira os 6 dígitos do código nacional, com o desdobro 01", () => {
    expect(codigoTributacaoNacional("14.01")).toBe("140101");
    expect(codigoTributacaoNacional("7.02")).toBe("070201");
  });

  it("código já com o desdobro (14.01.02) é usado como está", () => {
    expect(codigoTributacaoNacional("14.01.02")).toBe("140102");
  });

  it("vazio ou fora do formato devolve vazio (quem emite recusa)", () => {
    expect(codigoTributacaoNacional(null)).toBe("");
    expect(codigoTributacaoNacional("abc")).toBe("");
  });
});

describe("montarCorpoNFSeNacional", () => {
  const agora = new Date("2026-11-02T13:15:00Z");
  const dados = (sobrescrever: Partial<Parameters<typeof montarCorpoNFSeNacional>[0]> = {}) => ({
    ordem: { numero: 1 } as never,
    discriminacao: "Alinhamento e balanceamento",
    valorServicos: 150.000000001,
    cliente: clientePessoaFisica(),
    codigoMunicipioCliente: "3503208",
    configuracaoFiscal: configuracaoFiscal(),
    ...sobrescrever,
  });

  it("monta o corpo achatado da DPS, com prestador, serviço e tributação", () => {
    const corpo = montarCorpoNFSeNacional(dados(), { agora, numeroDps: 1793632500 });
    expect(corpo).toMatchObject({
      data_competencia: "2026-11-02",
      serie_dps: 1,
      numero_dps: 1793632500,
      emitente_dps: 1,
      codigo_municipio_emissora: 3503208,
      cnpj_prestador: "51916585000125",
      codigo_opcao_simples_nacional: 3,
      regime_tributario_simples_nacional: 1,
      regime_especial_tributacao: 0,
      codigo_municipio_prestacao: 3503208,
      codigo_tributacao_nacional_iss: "140101",
      descricao_servico: "Alinhamento e balanceamento",
      valor_servico: 150,
      tributacao_iss: 1,
      tipo_retencao_iss: 1,
    });
    expect(corpo.data_emissao).toMatch(/^2026-11-02T\d{2}:15:00[+-]\d{2}:\d{2}$/);
    // Nada do formato municipal vai junto.
    expect(corpo).not.toHaveProperty("prestador");
    expect(corpo).not.toHaveProperty("servico");
  });

  // #948: o Ambiente Nacional recusa a DPS com a IM quando o município não
  // registra as informações complementares no CNC NFS-e (Araraquara, 06/11;
  // a Focus confirmou em 09/11: "remova a IM dos dados enviados"). A IM é
  // opcional no leiaute, então ela nunca vai, mesmo preenchida na loja.
  it("loja com a inscrição municipal preenchida: a IM não vai no corpo (#948)", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ inscricao_municipal: "30016580" }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo).not.toHaveProperty("inscricao_municipal_prestador");
  });

  it("tomador pessoa física: CPF, nome e endereço com os nomes _tomador", () => {
    const corpo = montarCorpoNFSeNacional(dados(), { agora, numeroDps: 1 });
    expect(corpo).toMatchObject({
      cpf_tomador: "12345678909",
      razao_social_tomador: "Cliente Exemplo da Silva",
      logradouro_tomador: "Rua Exemplo",
      numero_tomador: "100",
      bairro_tomador: "Centro",
      codigo_municipio_tomador: 3503208,
      cep_tomador: "14800000",
    });
    expect(corpo).not.toHaveProperty("cnpj_tomador");
  });

  it("tomador pessoa jurídica vai pelo CNPJ, sem CPF", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ cliente: clientePessoaFisica({ tipo_pessoa: "juridica", cpf_cnpj: "66.217.744/0001-70" }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo.cnpj_tomador).toBe("66217744000170");
    expect(corpo).not.toHaveProperty("cpf_tomador");
  });

  // No leiaute da DPS, o grupo do tomador exige CPF, CNPJ ou NIF; o nome
  // sozinho é recusado pelo esquema (revisão de 06/11). O tomador é opcional:
  // sem documento, não vai nenhum campo dele.
  it("cliente sem CPF/CNPJ: a nota sai sem tomador (nenhum campo _tomador)", () => {
    const corpo = montarCorpoNFSeNacional(dados({ cliente: clientePessoaFisica({ cpf_cnpj: null }) }), {
      agora,
      numeroDps: 1,
    });
    expect(Object.keys(corpo).filter((k) => k.endsWith("_tomador"))).toEqual([]);
  });

  // O bairro do endereço precisa ter pelo menos uma letra no leiaute da DPS.
  it("cliente sem bairro não manda endereço pela metade", () => {
    const corpo = montarCorpoNFSeNacional(dados({ cliente: clientePessoaFisica({ bairro: null }) }), {
      agora,
      numeroDps: 1,
    });
    expect(corpo).not.toHaveProperty("bairro_tomador");
    expect(corpo).not.toHaveProperty("logradouro_tomador");
    expect(corpo.cpf_tomador).toBe("12345678909");
  });

  it("loja sem o item da lista de serviços usa o 14.01, como no caminho municipal", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ item_lista_servico: null }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo.codigo_tributacao_nacional_iss).toBe("140101");
  });

  it("cliente sem rua ou CEP não manda endereço pela metade", () => {
    const corpo = montarCorpoNFSeNacional(dados({ cliente: clientePessoaFisica({ rua: null }) }), {
      agora,
      numeroDps: 1,
    });
    expect(corpo).not.toHaveProperty("logradouro_tomador");
    expect(corpo).not.toHaveProperty("cep_tomador");
  });

  // Ensaio de 03/11: sem o grupo totTrib o Ambiente Nacional recusa a DPS
  // ("Element trib: Missing child element(s). Expected is one of (tribFed, totTrib)").
  // O percentual vem dos Dados fiscais da loja (#866, migration 0078).
  it("empresa do Simples manda o percentual dos tributos do Simples cadastrado na loja (totTrib)", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ percentual_tributos_simples: 6.5 }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo.percentual_total_tributos_simples_nacional).toBe(6.5);
  });

  it("percentual com mais de duas casas sai arredondado em duas", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ percentual_tributos_simples: 6.456 }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo.percentual_total_tributos_simples_nacional).toBe(6.46);
  });

  // Vazio não trava a emissão: o grupo totTrib continua indo, com 0.
  it("empresa do Simples sem o percentual cadastrado manda 0", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ percentual_tributos_simples: null }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo.percentual_total_tributos_simples_nacional).toBe(0);
  });

  it("empresa fora do Simples não manda o percentual do Simples, mesmo cadastrado", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({
        configuracaoFiscal: configuracaoFiscal({
          regime_tributario: "lucro_presumido",
          percentual_tributos_simples: 6.5,
        }),
      }),
      { agora, numeroDps: 1 },
    );
    expect(corpo).not.toHaveProperty("percentual_total_tributos_simples_nacional");
  });

  // Recusa da OS 18 em 09/11 (#837): pro ME/EPP do Simples (opSimpNac 3,
  // ISS apurado pelo Simples) sem retenção, o Ambiente Nacional não aceita a
  // alíquota ("Não é permitido informar alíquota quando não há indicação de
  // retenção do ISSQN..."). O ISS vai dentro do DAS.
  it("loja do Simples sem retenção: a alíquota do ISS não vai, mesmo cadastrada", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ aliquota_iss: 2 }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo).not.toHaveProperty("percentual_aliquota_relativa_municipio");
  });

  it("empresa fora do Simples continua mandando a alíquota do ISS", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ regime_tributario: "lucro_presumido" }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo.percentual_aliquota_relativa_municipio).toBe(5);
  });

  it("empresa fora do Simples sai como não optante, sem o regime do Simples", () => {
    const corpo = montarCorpoNFSeNacional(
      dados({ configuracaoFiscal: configuracaoFiscal({ regime_tributario: "lucro_presumido" }) }),
      { agora, numeroDps: 1 },
    );
    expect(corpo.codigo_opcao_simples_nacional).toBe(1);
    expect(corpo).not.toHaveProperty("regime_tributario_simples_nacional");
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

// Achado na revisão da #1112: o pedido de emissão foi ACEITO, e a consulta
// seguinte falhou por rede. Antes, o erro subia como um FocusNfeError comum,
// sem a `ref`, e a tela voltava pro "Confirmar emissão" — clicar de novo dava
// DUAS notas válidas pra mesma venda. Depois do envio aceito, qualquer falha
// na consulta tem de virar EsperaVencidaError, com a `ref`.
describe("emissão aceita e a consulta falha (nota dupla)", () => {
  const aceito = { data: { ok: true, status: 202, dados: { status: "processando_autorizacao" } }, error: null };
  const semRede = { data: null, error: new Error("Failed to fetch") };
  const autorizado = { data: { ok: true, status: 200, dados: { status: "autorizado", numero: "10" } }, error: null };

  beforeEach(() => {
    invoke.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const dadosNFCe = () => ({
    ordem: { id: "os-1", numero: 12, status: "faturada" } as OrdemServico,
    itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
    cliente: null,
    pagamentos: [{ formaPagamento: "pix", valor: 250 }],
    configuracaoFiscal: configuracaoFiscal(),
  });

  const dadosNFSe = (sobrescrever: Partial<ConfiguracaoFiscalLoja> = {}) => ({
    ordem: { id: "os-1", numero: 12, status: "faturada" } as OrdemServico,
    discriminacao: "Alinhamento",
    valorServicos: 100,
    cliente: clientePessoaFisica(),
    codigoMunicipioCliente: "3503208",
    configuracaoFiscal: configuracaoFiscal(sobrescrever),
  });

  async function falhaComARef(promessa: Promise<unknown>, prefixoRef: RegExp) {
    const resultado = promessa.then(
      () => null,
      (erro: unknown) => erro,
    );
    await vi.runAllTimersAsync();
    const erro = await resultado;
    expect(erro).toBeInstanceOf(EsperaVencidaError);
    expect((erro as EsperaVencidaError).ref).toMatch(prefixoRef);
    expect((erro as Error).message).toMatch(/não emita de novo/);
  }

  it("NFC-e: a consulta sem internet vira EsperaVencidaError com a ref", async () => {
    invoke.mockResolvedValueOnce(aceito).mockResolvedValue(semRede);
    await falhaComARef(emitirNFCe(dadosNFCe()), /^os12-nfce-\d+$/);
  });

  it("NFS-e pelo Padrão Nacional (Simples): a consulta sem internet vira EsperaVencidaError com a ref", async () => {
    invoke.mockResolvedValueOnce(aceito).mockResolvedValue(semRede);
    await falhaComARef(emitirNFSe(dadosNFSe()), /^os12-nfsen-\d+$/);
  });

  it("NFS-e municipal: a consulta sem internet vira EsperaVencidaError com a ref", async () => {
    invoke.mockResolvedValueOnce(aceito).mockResolvedValue(semRede);
    await falhaComARef(
      emitirNFSe(dadosNFSe({ regime_tributario: "lucro_presumido" })),
      /^os12-nfse-\d+$/,
    );
  });

  it("a consulta que o porteiro recusa também guarda a ref", async () => {
    invoke.mockResolvedValueOnce(aceito).mockResolvedValue({
      data: { ok: false, status: 500, dados: { mensagem: "Erro interno" } },
      error: null,
    });
    await falhaComARef(emitirNFCe(dadosNFCe()), /^os12-nfce-\d+$/);
  });

  it("sem internet, o aviso não traz o \"tente de novo\" do erro de rede", async () => {
    invoke.mockResolvedValueOnce(aceito).mockResolvedValue(semRede);
    const resultado = emitirNFCe(dadosNFCe()).then(
      () => null,
      (erro: unknown) => erro,
    );
    await vi.runAllTimersAsync();
    expect(((await resultado) as Error).message).not.toMatch(/tente de novo|para emitir/);
  });

  it("recusa do porteiro na consulta não muda esperando: para na hora, com a ref", async () => {
    const recusa = () => ({
      data: null,
      error: new FunctionsHttpError(
        new Response(JSON.stringify({ erro: "Sem permissão.", motivo: "sem_permissao" }), { status: 403 }),
      ),
    });
    invoke.mockResolvedValueOnce(aceito).mockImplementation(async () => recusa());
    await falhaComARef(emitirNFCe(dadosNFCe()), /^os12-nfce-\d+$/);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("uma falha de rede no meio não derruba: a próxima consulta autorizada vale", async () => {
    invoke.mockResolvedValueOnce(aceito).mockResolvedValueOnce(semRede).mockResolvedValue(autorizado);
    const promessa = emitirNFCe(dadosNFCe());
    await vi.runAllTimersAsync();
    await expect(promessa).resolves.toMatchObject({ status: "autorizado", numero: "10" });
  });

  it("se o PRÓPRIO envio falha, o erro continua sendo o do envio (nada a conferir)", async () => {
    invoke.mockResolvedValue(semRede);
    const promessa = emitirNFCe(dadosNFCe()).then(
      () => null,
      (erro: unknown) => erro,
    );
    await vi.runAllTimersAsync();
    const erro = await promessa;
    expect(erro).toBeInstanceOf(FocusNfeError);
    expect(erro).not.toBeInstanceOf(EsperaVencidaError);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

// #861: pessoa física sem CPF (ou com CPF pela metade) mandava o nome sem o
// CPF, e a Focus recusa o `xNome` sozinho antes da SEFAZ ("Expected is one of
// CNPJ, CPF, idEstrangeiro"). A regra é a do comentário da função: documento
// faltando ou incompleto → consumidor não identificado, igual à pessoa jurídica.
describe("montarDestinatarioNFCe", () => {
  it.each([null, "", "   ", "123.456.789", "123.456.789-0", "123.456.789-091"])(
    "pessoa física com CPF %j: consumidor não identificado, sem o nome",
    (cpf) => {
      expect(montarDestinatarioNFCe(clientePessoaFisica({ cpf_cnpj: cpf }))).toEqual({
        nome_destinatario: "",
        cpf_destinatario: "",
      });
    },
  );

  it("pessoa física com CPF de 11 números: nome e CPF só com os números", () => {
    expect(
      montarDestinatarioNFCe(
        clientePessoaFisica({ nome: "Maria da Silva", cpf_cnpj: "123.456.789-09" }),
      ),
    ).toEqual({ nome_destinatario: "Maria da Silva", cpf_destinatario: "12345678909" });
  });

  it.each([null, "", "12.345.678", "12.345.678/0001-9"])(
    "pessoa jurídica com CNPJ %j: consumidor não identificado, sem o nome",
    (cnpj) => {
      expect(
        montarDestinatarioNFCe(clientePessoaFisica({ tipo_pessoa: "juridica", cpf_cnpj: cnpj })),
      ).toEqual({ nome_destinatario: "" });
    },
  );

  it("pessoa jurídica com CNPJ de 14 números: nome, CNPJ e indicador 9", () => {
    expect(
      montarDestinatarioNFCe(
        clientePessoaFisica({
          nome: "Transportes Exemplo Ltda",
          tipo_pessoa: "juridica",
          cpf_cnpj: "12.345.678/0001-99",
        }),
      ),
    ).toEqual({
      nome_destinatario: "Transportes Exemplo Ltda",
      cnpj_destinatario: "12345678000199",
      indicador_inscricao_estadual_destinatario: "9",
    });
  });
});

// O aviso do limite da NFC-e (#881) pergunta "a nota vai sair com o cliente
// identificado?". A resposta é o que `montarDestinatarioNFCe` manda pra Focus,
// e não uma regra copiada: se a regra do destinatário mudar, o aviso muda junto.
describe("destinatarioIdentificadoNFCe", () => {
  it("sem cliente: não identificado", () => {
    expect(destinatarioIdentificadoNFCe(null)).toBe(false);
  });

  it("cliente Consumidor da venda de balcão: não identificado, mesmo com documento", () => {
    expect(
      destinatarioIdentificadoNFCe(
        clientePessoaFisica({ id: CLIENTE_CONSUMIDOR_ID, cpf_cnpj: "123.456.789-09" }),
      ),
    ).toBe(false);
  });

  it("pessoa física com CPF: identificado", () => {
    expect(destinatarioIdentificadoNFCe(clientePessoaFisica({ cpf_cnpj: "123.456.789-09" }))).toBe(
      true,
    );
  });

  it("pessoa física sem CPF: não identificado", () => {
    expect(destinatarioIdentificadoNFCe(clientePessoaFisica({ cpf_cnpj: null }))).toBe(false);
  });

  it("pessoa física com CPF incompleto: não identificado (#861)", () => {
    expect(destinatarioIdentificadoNFCe(clientePessoaFisica({ cpf_cnpj: "123.456.789" }))).toBe(
      false,
    );
  });

  it("pessoa jurídica com CNPJ de 14 números: identificado", () => {
    expect(
      destinatarioIdentificadoNFCe(
        clientePessoaFisica({ tipo_pessoa: "juridica", cpf_cnpj: "12.345.678/0001-99" }),
      ),
    ).toBe(true);
  });

  it("pessoa jurídica com CNPJ incompleto: não identificado", () => {
    expect(
      destinatarioIdentificadoNFCe(
        clientePessoaFisica({ tipo_pessoa: "juridica", cpf_cnpj: "12.345.678" }),
      ),
    ).toBe(false);
  });
});

// O aviso do limite (#881) compara o MESMO total que vai na nota: cada linha
// arredondada no centavo antes de somar, como o `valor_total` da NFC-e.
describe("valorTotalNFCe", () => {
  it("arredonda cada linha antes de somar, como a nota", () => {
    const linha = { quantidade: 1, precoUnitario: 4999.995, desconto: 0 };
    expect(valorTotalNFCe([linha, linha])).toBe(10000);
  });

  it("desconta o desconto da linha", () => {
    expect(valorTotalNFCe([{ quantidade: 2, precoUnitario: 100, desconto: 15 }])).toBe(185);
  });
});

// #1112: a SEFAZ recusou o CNPJ/CPF do destinatário (CNPJ recém-aberto que a
// base dela ainda não tem). "Emitir sem identificar o cliente" manda a mesma
// nota sem o destinatário; sem a opção, o corpo é o de sempre.
describe("emitirNFCe — semDestinatario", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockImplementation(async (_nome: string, { body }: { body: { acao: string } }) => ({
      data:
        body.acao === "emitir"
          ? { ok: true, status: 202, dados: { status: "processando_autorizacao" } }
          : { ok: true, status: 200, dados: { status: "autorizado", numero: "7" } },
      error: null,
    }));
  });

  const clientePJ = clientePessoaFisica({
    nome: "Transportes Exemplo Ltda",
    tipo_pessoa: "juridica",
    cpf_cnpj: "12.345.678/0001-99",
  });
  const dados = (cliente: Cliente | null) => ({
    ordem: { id: "os-1", numero: 12, status: "faturada" } as OrdemServico,
    itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
    cliente,
    pagamentos: [{ formaPagamento: "pix", valor: 250 }],
    configuracaoFiscal: configuracaoFiscal(),
  });
  const corpoEnviado = () =>
    invoke.mock.calls.find(([, { body }]) => body.acao === "emitir")?.[1].body.corpo;

  it("com semDestinatario: o corpo sai sem CPF, CNPJ, nome e indicador de IE", async () => {
    await emitirNFCe(dados(clientePJ), { semDestinatario: true });
    const corpo = corpoEnviado();
    expect(corpo).not.toHaveProperty("cnpj_destinatario");
    expect(corpo).not.toHaveProperty("indicador_inscricao_estadual_destinatario");
    expect(corpo.cpf_destinatario ?? "").toBe("");
    expect(corpo.nome_destinatario ?? "").toBe("");
    // O mesmo resultado de montarDestinatarioNFCe(null), o consumidor não identificado.
    expect(corpo).toMatchObject(montarDestinatarioNFCe(null));
  });

  it("com semDestinatario, o resto da nota não muda", async () => {
    await emitirNFCe(dados(clientePJ), { semDestinatario: true });
    const comOpcao = corpoEnviado();
    invoke.mockClear();
    await emitirNFCe(dados(null));
    const semCliente = corpoEnviado();
    expect({ ...comOpcao, data_emissao: "" }).toEqual({ ...semCliente, data_emissao: "" });
  });

  it.each([undefined, {}, { semDestinatario: false }])(
    "sem a opção (%j): o corpo é idêntico ao de hoje, com o CNPJ do cliente",
    async (opcoes) => {
      await emitirNFCe(dados(clientePJ), opcoes);
      // A hora da emissão é a única coisa que muda de uma chamada pra outra.
      const enviado = { ...corpoEnviado(), data_emissao: "" };
      expect(enviado).toEqual({ ...montarCorpoNFCe(dados(clientePJ)), data_emissao: "" });
      expect(enviado.cnpj_destinatario).toBe("12345678000199");
      expect(enviado.nome_destinatario).toBe("Transportes Exemplo Ltda");
    },
  );
});

// #1112, teste no PC: a homologação pode não recusar o CNPJ. Só no `npm run dev`
// (import.meta.env.DEV) e com VITE_SIMULAR_RECUSA_DESTINATARIO=1, a emissão
// normal devolve a recusa de 17/11 sem pedir nada à Focus; o "Emitir sem
// identificar o cliente" vai de verdade.
describe("emitirNFCe — recusa simulada pro teste no PC", () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockImplementation(async (_nome: string, { body }: { body: { acao: string } }) => ({
      data:
        body.acao === "emitir"
          ? { ok: true, status: 202, dados: { status: "processando_autorizacao" } }
          : { ok: true, status: 200, dados: { status: "autorizado", numero: "7" } },
      error: null,
    }));
  });
  afterEach(() => vi.unstubAllEnvs());

  const dados = () => ({
    ordem: { id: "os-1", numero: 12, status: "faturada" } as OrdemServico,
    itens: [{ peca: peca(), quantidade: 1, precoUnitario: 250, desconto: 0 }],
    cliente: clientePessoaFisica({ tipo_pessoa: "juridica", cpf_cnpj: "12.345.678/0001-99" }),
    pagamentos: [{ formaPagamento: "pix", valor: 250 }],
    configuracaoFiscal: configuracaoFiscal(),
  });

  it("ligada: a emissão normal volta recusada pelo destinatário, sem chamar a Focus", async () => {
    vi.stubEnv("VITE_SIMULAR_RECUSA_DESTINATARIO", "1");
    const resposta = await emitirNFCe(dados());
    expect(resposta.status).toBe("erro_autorizacao");
    expect(resposta.mensagem_sefaz).toMatch(/destinatário não cadastrado/);
    expect(resposta.ref).toMatch(/^os12-nfce-\d+$/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("ligada: o 'sem identificar o cliente' emite de verdade", async () => {
    vi.stubEnv("VITE_SIMULAR_RECUSA_DESTINATARIO", "1");
    const resposta = await emitirNFCe(dados(), { semDestinatario: true });
    expect(resposta.status).toBe("autorizado");
    expect(invoke).toHaveBeenCalled();
  });

  it("ligada, mas fora do npm run dev (programa instalado): não simula", async () => {
    vi.stubEnv("VITE_SIMULAR_RECUSA_DESTINATARIO", "1");
    vi.stubEnv("DEV", false);
    const resposta = await emitirNFCe(dados());
    expect(resposta.status).toBe("autorizado");
  });

  it("desligada: emite normal", async () => {
    const resposta = await emitirNFCe(dados());
    expect(resposta.status).toBe("autorizado");
  });
});

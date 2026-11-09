/**
 * TESTES-OURO do corpo enviado à Focus NFe (item TR-06.3 do guia).
 *
 * ## Por que existem
 *
 * `montarItemNFCe()`, `montarCorpoNFCe()`, `montarCorpoNFSe()` e
 * `montarDestinatarioNFCe()` acumulam regras que foram conquistadas na marra,
 * cada uma custando dias de bloqueio — e o pior é que elas falham **calado**:
 * a parte fiscal quase nunca dá erro na tela, ela autoriza algo errado, ou
 * é recusada por um detalhe que a mensagem da SEFAZ não explica (seção 6,
 * item 46 do PROJETO_STATUS).
 *
 * Um snapshot congela o corpo inteiro. Uma refatoração distraída que derrube
 * qualquer um dos campos abaixo reprova aqui, em vez de virar rejeição da
 * SEFAZ — ou, muito pior, nota autorizada errada.
 *
 * ## REGRA AO MEXER: mudar um snapshot é uma DECISÃO, não uma correção
 *
 * Se um teste-ouro quebrar, não regenere o arquivo sem pensar. O PR precisa
 * dizer **qual mudança fiscal** justifica a diferença. Regenerar por reflexo
 * apaga exatamente a proteção que este arquivo existe pra dar.
 * Pra regenerar de propósito: `npx vitest run -u src/lib/focusNfe.golden.test.ts`.
 *
 * ## Por que cada campo estranho existe (é isto que impede a próxima sessão
 * de "limpar" um campo que parece redundante)
 *
 * - **`cbs_aliquota: "0.90"` / `ibs_uf_aliquota: "0.10"` / `ibs_mun_aliquota:
 *   "0.00"`** — Reforma Tributária, período de transição 2026. NÃO são
 *   decisão da contabilidade desta loja: são **fixadas por lei** (Nota
 *   Técnica NFe 2025.002 / LC 214/2025), iguais pra todo mundo no país. São
 *   simbólicas (compensadas com PIS/Cofins/ICMS/ISS já cobrados), mas a
 *   SEFAZ **rejeita a nota** se o valor não bater exatamente — foi a
 *   rejeição 1026 numa emissão real. Zerar "porque não cobra nada" quebra.
 * - **`ibs_cbs_situacao_tributaria: "000"` + `..._classificacao_tributaria:
 *   "000001"`** — tributação integral / plenamente tributada, o par que a
 *   SEFAZ aceita nesse período de transição.
 * - **`indicador_inscricao_estadual_destinatario: "9"` só na pessoa
 *   jurídica**, e **sem** mandar a inscrição estadual do destinatário — "9"
 *   é "não contribuinte, pode ou não ter IE". Confirmado pelo suporte da
 *   Focus NFe em 03/09/2026. Mandar a IE junto é o erro.
 * - **O desconto entra ABATIDO no preço unitário**, não num campo separado:
 *   a SEFAZ confere que `valor bruto = quantidade × unitário`. É por isso que
 *   `valor_unitario_comercial` tem 10 casas — ele é o resultado de uma
 *   divisão, e arredondar aqui faria a conferência falhar por centavo.
 *   Ignorar o desconto (como já foi) deixava a nota valendo mais do que o
 *   cliente pagou (seção 6, item 44).
 * - **`icms_base_calculo: "0"` quando a alíquota é zero** — Simples Nacional
 *   usa CSOSN e não destaca ICMS na nota.
 * - **`forma_pagamento: "0"` (à vista) mesmo com cartão parcelado** — esse
 *   campo é da NOTA, não do meio de pagamento; quem carrega o parcelamento
 *   é `formas_pagamento`. Venda de balcão é sempre à vista do ponto de vista
 *   da nota.
 * - **`valor_servicos` e `aliquota` da NFS-e saem como NÚMERO**, não texto —
 *   são os únicos do corpo assim, e por isso passam por `arredondar()`: soma
 *   em ponto flutuante produziria `90.00000000000001` no XML (item 46).
 *
 * ## O relógio é congelado de propósito
 *
 * `data_emissao` usa a hora atual nos dois corpos. O horário escolhido é
 * meio-dia UTC porque a suíte roda em DOIS fusos (`npm run test:fusos`) e a
 * NFS-e grava o **dia local** — num horário de madrugada os dois fusos dariam
 * datas diferentes e o snapshot ficaria instável sem que nada estivesse
 * errado.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { montarCorpoNFCe, montarCorpoNFSe, type ItemParaNFCe } from "./focusNfe";
import type { Cliente } from "@/types/cliente";
import type { Peca } from "@/types/peca";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { OrdemServico } from "@/types/os";

// Meio-dia UTC: mesmo dia de calendário em America/Sao_Paulo e em UTC.
const INSTANTE_FIXO = new Date("2026-09-12T15:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(INSTANTE_FIXO);
});
afterAll(() => vi.useRealTimers());

// --- dados falsos, mas estruturalmente iguais aos reais ---------------------

const peca = (parcial: Partial<Peca>): Peca => ({
  id: "11111111-1111-1111-1111-111111111111",
  codigo_interno: "PN-175",
  codigo_barras: "7891234567890",
  descricao: "PNEU 175/70 R14 84T",
  marca: "Marca Exemplo",
  modelo: null,
  aplicacao: null,
  unidade: "UN",
  preco_custo: 180,
  preco_venda: 320,
  ncm: "40111000",
  cest: null,
  // CSOSN 500 (ICMS já pago antes) pede CFOP 5405: com 5102 a SEFAZ recusa (#864).
  cfop_padrao: "5405",
  origem: "0",
  // Simples Nacional: CSOSN de 3 dígitos (o 500 é o que esta loja usa, e foi
  // confirmado pela contabilidade em 31/08/2026).
  cst_ou_csosn: "500",
  aliquota_icms: 0,
  categoria_id: null,
  prazo_garantia_dias: 90,
  estoque_minimo: null,
  medida: "175/70 R14",
  indice_carga_velocidade: "84T",
  dot: null,
  ativo: true,
  criado_em: "2026-01-10T12:00:00.000Z",
  ...parcial,
});

const cliente = (parcial: Partial<Cliente>): Cliente => ({
  id: "22222222-2222-2222-2222-222222222222",
  nome: "Cliente Exemplo",
  tipo_pessoa: "fisica",
  cpf_cnpj: null,
  telefone: "(16) 99999-0000",
  email: null,
  cep: null,
  rua: null,
  numero: null,
  bairro: null,
  cidade: null,
  uf: null,
  codigo_municipio: null,
  data_nascimento: null,
  criado_em: "2026-01-10T12:00:00.000Z",
  ...parcial,
});

const configuracaoFiscal: ConfiguracaoFiscalLoja = {
  loja_id: "00000000-0000-0000-0000-000000000001",
  cnpj: "12.345.678/0001-90",
  razao_social: "Loja Exemplo Ltda",
  nome_fantasia: "Loja Exemplo",
  inscricao_estadual: "123456789012",
  inscricao_municipal: "30016580",
  regime_tributario: "simples_nacional",
  cep: "14800-000",
  rua: "Rua Exemplo",
  numero: "100",
  bairro: "Centro",
  cidade: "Araraquara",
  uf: "SP",
  telefone: "(16) 3333-0000",
  email: "loja@exemplo.com.br",
  focus_nfe_configurado: true,
  focus_nfe_ambiente: "homologacao",
  codigo_municipio: "3503208",
  item_lista_servico: "14.01",
  aliquota_iss: 3,
  codigo_tributario_municipio: "452000100",
  codigo_cnae: "4520-0/01",
  competencia_aliquota_confirmada: null,
  aliquota_passo_a_passo: null,
  percentual_tributos_simples: null,
} as ConfiguracaoFiscalLoja;

const ordem = { id: "33333333-3333-3333-3333-333333333333", numero: 12 } as OrdemServico;

const item = (parcial: Partial<ItemParaNFCe> = {}): ItemParaNFCe => ({
  peca: peca({}),
  quantidade: 2,
  precoUnitario: 320,
  desconto: 0,
  ...parcial,
});

/** Guarda o corpo como JSON versionado, um arquivo por cenário. */
const ouro = (corpo: unknown, arquivo: string) =>
  expect(`${JSON.stringify(corpo, null, 2)}\n`).toMatchFileSnapshot(`./__ouro__/${arquivo}`);

describe("montarCorpoNFCe — teste-ouro", () => {
  it("1. só peça, consumidor não identificado", async () => {
    const corpo = montarCorpoNFCe({
      ordem,
      itens: [item()],
      cliente: null,
      pagamentos: [{ formaPagamento: "dinheiro", valor: 640 }],
      configuracaoFiscal,
    });
    await ouro(corpo, "nfce-1-consumidor-nao-identificado.json");
  });

  it("2. só peça, cliente pessoa física com CPF", async () => {
    const corpo = montarCorpoNFCe({
      ordem,
      itens: [item()],
      cliente: cliente({ nome: "Maria da Silva", cpf_cnpj: "123.456.789-09" }),
      pagamentos: [{ formaPagamento: "pix", valor: 640 }],
      configuracaoFiscal,
    });
    await ouro(corpo, "nfce-2-pessoa-fisica.json");
  });

  it("3. cliente pessoa jurídica — CNPJ e indicador de IE '9', sem inscrição estadual", async () => {
    const corpo = montarCorpoNFCe({
      ordem,
      itens: [item()],
      cliente: cliente({
        nome: "Transportadora Exemplo Ltda",
        tipo_pessoa: "juridica",
        cpf_cnpj: "98.765.432/0001-10",
      }),
      pagamentos: [{ formaPagamento: "cartao_credito", valor: 640 }],
      configuracaoFiscal,
    });

    // A promessa do item 1 de "O que ainda está frágil na parte fiscal", em
    // asserção explícita — o snapshot sozinho não diria qual campo importa.
    expect(corpo.cnpj_destinatario).toBe("98765432000110");
    expect(corpo.indicador_inscricao_estadual_destinatario).toBe("9");
    expect(corpo).not.toHaveProperty("inscricao_estadual_destinatario");
    expect(corpo.cpf_destinatario).toBeUndefined();

    await ouro(corpo, "nfce-3-pessoa-juridica.json");
  });

  it("4. com desconto no item — abatido no preço unitário, não em campo separado", async () => {
    const comDesconto = item({ quantidade: 2, precoUnitario: 320, desconto: 40 });
    const corpo = montarCorpoNFCe({
      ordem,
      itens: [comDesconto],
      cliente: null,
      pagamentos: [{ formaPagamento: "dinheiro", valor: 600 }],
      configuracaoFiscal,
    });

    // 2 × 320 − 40 = 600. A SEFAZ confere bruto = quantidade × unitário, e é
    // por isso que o unitário vira 300 (e não continua 320 com um desconto
    // pendurado à parte). Ver seção 6, item 44.
    expect(corpo.valor_total).toBe("600.00");
    expect(corpo.items[0].valor_bruto).toBe("600.00");
    expect(Number(corpo.items[0].valor_unitario_comercial)).toBeCloseTo(300, 10);
    expect(corpo.valor_desconto).toBe("0.00");

    await ouro(corpo, "nfce-4-com-desconto.json");
  });

  it("5. OS mista com pagamento dividido e cartão parcelado", async () => {
    // Cenário que gerou as rejeições dos itens 31, 32 e 44 da seção 6: a OS
    // tem peça E serviço, e a NFC-e cobre só a parte de peça. Os pagamentos
    // abaixo são os que chegam AQUI — já rateados sobre o total de peça por
    // `ratearPagamentos` (a repartição em si é coberta pelos testes de
    // propriedade em schemas/rateio.propriedades.test.ts).
    //
    // Repare em `forma_pagamento: "0"`: a nota é à vista mesmo com o cartão
    // parcelado, porque esse campo é da NOTA e não do meio de pagamento.
    const corpo = montarCorpoNFCe({
      ordem,
      itens: [
        item({ quantidade: 2, precoUnitario: 320, desconto: 0 }),
        item({
          peca: peca({
            id: "44444444-4444-4444-4444-444444444444",
            codigo_interno: "VAL-01",
            descricao: "VALVULA DE PNEU",
            ncm: "84818099",
            preco_venda: 12,
            medida: null,
            indice_carga_velocidade: null,
          }),
          quantidade: 4,
          precoUnitario: 12,
          desconto: 0,
        }),
      ],
      cliente: cliente({ nome: "Maria da Silva", cpf_cnpj: "123.456.789-09" }),
      pagamentos: [
        { formaPagamento: "pix", valor: 300 },
        { formaPagamento: "cartao_credito", valor: 388 },
      ],
      configuracaoFiscal,
    });

    // 2×320 + 4×12 = 688, e a soma dos pagamentos tem que fechar exatamente
    // com isso — a soma menor foi a rejeição do item 31, a maior a do 32.
    expect(corpo.valor_total).toBe("688.00");
    const somaPagamentos = corpo.formas_pagamento.reduce(
      (soma, forma) => soma + Number(forma.valor_pagamento),
      0,
    );
    expect(somaPagamentos).toBe(688);
    expect(corpo.forma_pagamento).toBe("0");

    await ouro(corpo, "nfce-5-mista-pagamento-dividido.json");
  });

  it("peça de regime normal destaca ICMS; a do Simples não", async () => {
    // Não é um dos seis cenários do item, mas é a diferença que mais
    // confunde: com alíquota zero (CSOSN) a base de cálculo sai "0", e não
    // o valor do item.
    const corpo = montarCorpoNFCe({
      ordem,
      itens: [
        item({ peca: peca({ cst_ou_csosn: "00", aliquota_icms: 18 }), quantidade: 1, precoUnitario: 100 }),
      ],
      cliente: null,
      pagamentos: [{ formaPagamento: "dinheiro", valor: 100 }],
      configuracaoFiscal,
    });
    expect(corpo.items[0].icms_base_calculo).toBe("100.00");
    expect(corpo.icms_valor_total).toBe("18.00");
  });
});

describe("montarCorpoNFSe — teste-ouro", () => {
  it("6. com alíquota, CNAE, código do município e item da LC 116", async () => {
    const corpo = montarCorpoNFSe({
      ordem,
      discriminacao: "Alinhamento e balanceamento — Ref. OS 12",
      valorServicos: 180,
      cliente: cliente({
        nome: "Maria da Silva",
        cpf_cnpj: "123.456.789-09",
        email: "maria@exemplo.com.br",
        cep: "14801-000",
        rua: "Rua das Flores",
        numero: "250",
        bairro: "Jardim Exemplo",
        cidade: "Araraquara",
        uf: "SP",
      }),
      codigoMunicipioCliente: "3503208",
      configuracaoFiscal,
    });

    // O CNAE sai só com dígitos — o cadastro guarda "4520-0/01", e a
    // prefeitura recusa com a pontuação. Foi o que faltava pra autorizar
    // (migration 0047).
    expect(corpo.servico.codigo_cnae).toBe("4520001");
    // Número, não texto — e arredondado (item 46 da seção 6).
    expect(corpo.servico.valor_servicos).toBe(180);
    expect(corpo.servico.aliquota).toBe(3);

    await ouro(corpo, "nfse-6-completa.json");
  });

  it("tomador pessoa jurídica vai com cnpj, não cpf", async () => {
    const corpo = montarCorpoNFSe({
      ordem,
      discriminacao: "Serviço — Ref. OS 12",
      valorServicos: 180,
      cliente: cliente({
        nome: "Transportadora Exemplo Ltda",
        tipo_pessoa: "juridica",
        cpf_cnpj: "98.765.432/0001-10",
      }),
      codigoMunicipioCliente: "3503208",
      configuracaoFiscal,
    });
    expect(corpo.tomador).toHaveProperty("cnpj", "98765432000110");
    expect(corpo.tomador).not.toHaveProperty("cpf");
  });
});

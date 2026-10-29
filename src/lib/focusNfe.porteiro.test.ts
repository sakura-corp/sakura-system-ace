import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";

// O caminho do programa até o porteiro da Focus NFe (TR-04.2). O que se
// testa aqui é a costura: o que vai no pedido, e como cada resposta do
// porteiro vira o que a tela mostra. O porteiro em si tem o teste dele, em
// supabase/functions/focus-nfe/index.test.ts.

const invoke = vi.fn();
vi.mock("./supabase", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

const {
  baixarArquivoNota,
  cancelarNFSe,
  consultarNFSe,
  emitirNFCe,
  emitirNFSe,
  EsperaVencidaError,
  FocusNfeError,
  montarCorpoNFCe,
  motivoDaRecusa,
  refPertenceAOrdem,
} = await import("./focusNfe");

const LOJA = "00000000-0000-0000-0000-000000000001";

const configuracaoFiscal = {
  loja_id: LOJA,
  cnpj: "12.345.678/0001-90",
  focus_nfe_configurado: true,
  focus_nfe_ambiente: "producao",
} as ConfiguracaoFiscalLoja;

const peca = {
  id: "peca-1",
  codigo_interno: "P1",
  descricao: "Pneu 175/70 R13",
  unidade: "UN",
  ncm: "40111000",
  cfop_padrao: "5102",
  origem: "0",
  cst_ou_csosn: "500",
  aliquota_icms: 0,
} as Peca;

const dadosNFCe = {
  ordem: { id: "os-1", numero: 12 } as OrdemServico,
  itens: [{ peca, quantidade: 1, precoUnitario: 250, desconto: 0 }],
  cliente: null,
  pagamentos: [{ formaPagamento: "pix", valor: 250 }],
  configuracaoFiscal,
};

// O porteiro sempre responde 200 com um envelope quando REPASSA.
const repassou = (dados: unknown, status = 200) => ({
  data: { ok: status < 400, status, dados },
  error: null,
});

// E responde outro código com { erro, motivo } quando RECUSA — que o
// supabase-js entrega como FunctionsHttpError com a Response dentro.
const recusou = (status: number, corpo: unknown) => ({
  data: null,
  error: new FunctionsHttpError(new Response(JSON.stringify(corpo), { status })),
});

beforeEach(() => invoke.mockReset());

describe("o pedido que vai pro porteiro", () => {
  it("emitir manda a loja, a ref e o corpo EXATO da nota — e nenhum token", async () => {
    invoke.mockResolvedValue(repassou({ status: "autorizado", ref: "x" }));
    await emitirNFCe(dadosNFCe);

    const [nome, { body }] = invoke.mock.calls[0];
    expect(nome).toBe("focus-nfe");
    expect(body).toMatchObject({ loja_id: LOJA, acao: "emitir", tipo: "nfce" });
    expect(body.ref).toMatch(/^os12-nfce-\d+$/);
    // O corpo é o mesmo que o teste-ouro fixa; só o instante de emissão muda
    // de uma chamada pra outra.
    expect({ ...body.corpo, data_emissao: "" }).toEqual({
      ...montarCorpoNFCe(dadosNFCe),
      data_emissao: "",
    });

    for (const [, chamada] of invoke.mock.calls) {
      expect(JSON.stringify(chamada)).not.toMatch(/token/i);
    }
  });

  it("a consulta de acompanhamento usa a mesma ref da emissão", async () => {
    invoke.mockResolvedValue(repassou({ status: "autorizado" }));
    await emitirNFCe(dadosNFCe);
    const [emissao, consulta] = invoke.mock.calls.map(([, { body }]) => body);
    expect(consulta).toEqual({ loja_id: LOJA, acao: "consultar", tipo: "nfce", ref: emissao.ref });
  });

  it("a ref volta junto mesmo se a Focus NFe não a repetir — é o que permite cancelar depois", async () => {
    invoke.mockResolvedValue(repassou({ status: "autorizado" }));
    const resposta = await emitirNFCe(dadosNFCe);
    expect(resposta.ref).toMatch(/^os12-nfce-\d+$/);
  });

  it("loja sem token nem chega a chamar o porteiro", async () => {
    await expect(
      emitirNFCe({ ...dadosNFCe, configuracaoFiscal: { ...configuracaoFiscal, focus_nfe_configurado: false } }),
    ).rejects.toThrow(/Token do Focus NFe não configurado/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("cancelar manda a justificativa e a loja", async () => {
    invoke.mockResolvedValue(repassou({ status: "cancelado" }));
    await cancelarNFSe("os12-nfse-1", "Serviço lançado em duplicidade", LOJA);
    expect(invoke.mock.calls[0][1].body).toEqual({
      loja_id: LOJA,
      acao: "cancelar",
      tipo: "nfse",
      ref: "os12-nfse-1",
      justificativa: "Serviço lançado em duplicidade",
    });
  });
});

describe("como a resposta do porteiro vira mensagem na tela", () => {
  it("erro da Focus NFe mostra a mensagem dela, como sempre mostrou", async () => {
    invoke.mockResolvedValue(repassou({ mensagem: "CSOSN inválido para o regime" }, 422));
    await expect(emitirNFCe(dadosNFCe)).rejects.toThrow("CSOSN inválido para o regime");
  });

  it("recusa do porteiro mostra a frase dele, e o motivo fica disponível pro código", async () => {
    invoke.mockResolvedValue(
      recusou(403, { erro: "Você não tem permissão para usar a emissão de nota fiscal nesta loja.", motivo: "sem_permissao" }),
    );
    const erro = await emitirNFCe(dadosNFCe).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(FocusNfeError);
    expect((erro as Error).message).toMatch(/não tem permissão/);
    expect(motivoDaRecusa(erro)).toBe("sem_permissao");
  });

  it("404 sem a resposta do porteiro = porteiro não publicado, e a mensagem diz isso", async () => {
    invoke.mockResolvedValue(recusou(404, { code: "NOT_FOUND", message: "Requested function was not found" }));
    await expect(emitirNFCe(dadosNFCe)).rejects.toThrow(/falta publicar o porteiro/);
  });

  it("sem internet vira uma frase, não um erro técnico", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Failed to send a request to the Edge Function") });
    await expect(emitirNFCe(dadosNFCe)).rejects.toThrow(/Confira a internet/);
  });
});

describe("baixar o PDF/XML", () => {
  it("pede pela ref e devolve o arquivo com o tipo que a Focus NFe informou", async () => {
    const bytes = [0x25, 0x50, 0x44, 0x46, 0xff, 0x00];
    invoke.mockResolvedValue({
      data: {
        ok: true,
        status: 200,
        tipo_conteudo: "application/pdf",
        conteudo_base64: btoa(String.fromCharCode(...bytes)),
      },
      error: null,
    });
    const blob = await baixarArquivoNota(LOJA, "nfce", "os12-nfce-1", "danfe");
    expect(invoke.mock.calls[0][1].body).toEqual({
      loja_id: LOJA,
      acao: "baixar",
      tipo: "nfce",
      ref: "os12-nfce-1",
      arquivo: "danfe",
    });
    expect(blob.type).toBe("application/pdf");
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(bytes);
  });

  it("arquivo que não veio vira erro, não um PDF vazio", async () => {
    invoke.mockResolvedValue({ data: { ok: false, status: 404, conteudo_base64: null }, error: null });
    await expect(baixarArquivoNota(LOJA, "nfse", "os12-nfse-1", "xml")).rejects.toThrow(/HTTP 404/);
  });
});

// O caso de 01/10/2026: a NFS-e saiu autorizada na Focus NFe logo depois da
// espera vencer, e a tela não tinha como registrá-la.
describe("quando a SEFAZ/prefeitura demora", () => {
  const dadosNFSe = {
    ordem: { id: "os-1", numero: 15 } as OrdemServico,
    discriminacao: "Alinhamento",
    valorServicos: 100,
    cliente: { nome: "Cliente", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09" },
    codigoMunicipioCliente: "3503208",
    configuracaoFiscal: {
      ...configuracaoFiscal,
      codigo_municipio: "3503208",
      codigo_cnae: "4520-0/04",
      aliquota_iss: 2,
    } as ConfiguracaoFiscalLoja,
  } as Parameters<typeof emitirNFSe>[0];

  afterEach(() => vi.useRealTimers());

  it("a espera vencida leva a ref junto — é com ela que a tela confere de novo", async () => {
    vi.useFakeTimers();
    invoke.mockResolvedValue(repassou({ status: "processando_autorizacao" }));

    const emissao = emitirNFSe(dadosNFSe).catch((erro: unknown) => erro);
    await vi.runAllTimersAsync();
    const erro = await emissao;

    expect(erro).toBeInstanceOf(EsperaVencidaError);
    expect(erro).toBeInstanceOf(FocusNfeError);
    expect((erro as InstanceType<typeof EsperaVencidaError>).ref).toMatch(/^os15-nfse-\d+$/);
    expect((erro as Error).message).toContain("A prefeitura está demorando");
    // A NFS-e espera o dobro da NFC-e: 1 emissão + 20 consultas.
    expect(invoke).toHaveBeenCalledTimes(21);
  });

  it("a NFC-e continua esperando 10 consultas e fala da SEFAZ", async () => {
    vi.useFakeTimers();
    invoke.mockResolvedValue(repassou({ status: "processando_autorizacao" }));

    const emissao = emitirNFCe(dadosNFCe).catch((erro: unknown) => erro);
    await vi.runAllTimersAsync();
    const erro = await emissao;

    expect(erro).toBeInstanceOf(EsperaVencidaError);
    expect((erro as Error).message).toContain("A SEFAZ está demorando");
    expect(invoke).toHaveBeenCalledTimes(11);
  });

  it("só aceita registrar pela ref uma nota daquela OS e daquele tipo", () => {
    expect(refPertenceAOrdem("os15-nfse-1790866567242", 15, "nfse")).toBe(true);
    expect(refPertenceAOrdem("  os15-nfse-1790866567242 ", 15, "nfse")).toBe(true);
    expect(refPertenceAOrdem("os15-nfce-1790866559160", 15, "nfse")).toBe(false);
    expect(refPertenceAOrdem("os150-nfse-1790866567242", 15, "nfse")).toBe(false);
    expect(refPertenceAOrdem("os13-nfse-1790710436120", 15, "nfse")).toBe(false);
    expect(refPertenceAOrdem("", 15, "nfse")).toBe(false);
    // Texto a mais antes ou depois (colado com o resto da linha do painel).
    expect(refPertenceAOrdem("2os15-nfse-1790866567242", 15, "nfse")).toBe(false);
    expect(refPertenceAOrdem("os15-nfse-1790866567242 NFSe", 15, "nfse")).toBe(false);
  });
});

// Orçamento (#379) não é venda: não tem número de OS e nunca emite nota. A
// tela não oferece o botão, mas quem emite não pode depender disso — uma nota
// "osnull" na SEFAZ não tem volta.
describe("orçamento nunca emite nota", () => {
  const orcamento = { id: "orc-1", numero: null, numero_orcamento: 45, status: "orcamento" } as OrdemServico;

  it("NFC-e: recusa antes de chamar o porteiro", async () => {
    await expect(emitirNFCe({ ...dadosNFCe, ordem: orcamento })).rejects.toThrow(/orçamento/i);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("NFS-e: recusa antes de chamar o porteiro", async () => {
    const dadosNFSe = {
      ordem: orcamento,
      discriminacao: "Alinhamento",
      valorServicos: 100,
      cliente: { nome: "Cliente", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09" },
      codigoMunicipioCliente: "3503208",
      configuracaoFiscal: {
        ...configuracaoFiscal,
        codigo_municipio: "3503208",
        codigo_cnae: "4520-0/04",
        aliquota_iss: 2,
      } as ConfiguracaoFiscalLoja,
    } as Parameters<typeof emitirNFSe>[0];
    await expect(emitirNFSe(dadosNFSe)).rejects.toThrow(/orçamento/i);
    expect(invoke).not.toHaveBeenCalled();
  });
});

// NFS-e pelo Padrão Nacional (#837). A `ref` é que diz por onde a nota saiu
// ("os12-nfsen-..." = nacional), então consultar, cancelar e baixar uma nota
// antiga do caminho municipal continua indo pro /v2/nfse — sem coluna nova.
describe("NFS-e Nacional: o pedido vai pelo tipo nfsen", () => {
  const dadosNacional = {
    ordem: { id: "os-1", numero: 15 } as OrdemServico,
    discriminacao: "Alinhamento",
    valorServicos: 100,
    cliente: { nome: "Cliente", tipo_pessoa: "fisica", cpf_cnpj: "123.456.789-09" },
    codigoMunicipioCliente: "3503208",
    configuracaoFiscal: {
      ...configuracaoFiscal,
      regime_tributario: "simples_nacional",
      codigo_municipio: "3503208",
      item_lista_servico: "14.01",
      aliquota_iss: 2,
    } as ConfiguracaoFiscalLoja,
  } as Parameters<typeof emitirNFSe>[0];

  it("loja do Simples emite com tipo nfsen, ref os15-nfsen-..., corpo nacional — e sem pedir CNAE", async () => {
    invoke.mockResolvedValue(repassou({ status: "autorizado" }));
    const resposta = await emitirNFSe(dadosNacional);
    const { body } = invoke.mock.calls[0][1];
    expect(body).toMatchObject({ loja_id: LOJA, acao: "emitir", tipo: "nfsen" });
    expect(body.ref).toMatch(/^os15-nfsen-\d+$/);
    expect(body.corpo).toMatchObject({ cnpj_prestador: "12345678000190", codigo_tributacao_nacional_iss: "140101" });
    expect(invoke.mock.calls[1][1].body).toMatchObject({ acao: "consultar", tipo: "nfsen", ref: body.ref });
    expect(resposta.ref).toBe(body.ref);
  });

  it("consultar e cancelar escolhem o caminho pela ref", async () => {
    invoke.mockResolvedValue(repassou({ status: "cancelado" }));
    await consultarNFSe("os12-nfsen-1", LOJA);
    await cancelarNFSe("os12-nfsen-1", "Serviço lançado em duplicidade", LOJA);
    await consultarNFSe("os12-nfse-1", LOJA);
    expect(invoke.mock.calls.map((c) => c[1].body.tipo)).toEqual(["nfsen", "nfsen", "nfse"]);
  });

  it("baixar uma NFS-e nacional pedida como nfse vai como nfsen", async () => {
    invoke.mockResolvedValue({ data: { ok: true, status: 200, conteudo_base64: btoa("x") }, error: null });
    await baixarArquivoNota(LOJA, "nfse", "os12-nfsen-1", "xml");
    expect(invoke.mock.calls[0][1].body).toMatchObject({ tipo: "nfsen", ref: "os12-nfsen-1" });
  });

  it("a consulta nacional devolve o PDF e a chave nos campos que o resto do programa já lê", async () => {
    invoke.mockResolvedValue(
      repassou({
        status: "autorizado",
        numero: "74798",
        url: "https://www.nfse.gov.br/consultapublica/?tpc=1&chave=42054072212345678000123000000007479826039913594189",
        url_danfse: "https://focusnfe.s3.sa-east-1.amazonaws.com/arquivos/x.pdf",
        caminho_xml_nota_fiscal: "/arquivos/x-nfse.xml",
      }),
    );
    const r = await consultarNFSe("os12-nfsen-1", LOJA);
    expect(r.caminho_danfe).toBe("https://focusnfe.s3.sa-east-1.amazonaws.com/arquivos/x.pdf");
    expect(r.chave_nfe).toBe("42054072212345678000123000000007479826039913594189");
  });

  it("a ref nacional também é reconhecida como NFS-e da OS", () => {
    expect(refPertenceAOrdem("os12-nfsen-1727200000000", 12, "nfse")).toBe(true);
    expect(refPertenceAOrdem("os12-nfsen-1727200000000", 13, "nfse")).toBe(false);
    expect(refPertenceAOrdem("os12-nfsen-1727200000000", 12, "nfce")).toBe(false);
  });
});

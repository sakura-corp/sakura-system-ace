import { describe, expect, it } from "vitest";
import { atender, enderecoDoArquivo, validarPedido, type Ambiente } from "./index";

// O porteiro da Focus NFe (TR-04.2) rodando de verdade, com um `fetch` de
// mentira no lugar do Supabase e da Focus NFe. Cada teste guarda uma
// promessa do cabeçalho do index.ts — e as que dizem "a Focus NFe nem é
// chamada" são as que importam: recusar depois de já ter repassado não
// protege nada.

const SB = "https://projeto.supabase.co";
const ANON = "chave-anon";
const SERVICE = "chave-service-role-naopodevazar";
const TOKEN = "token-da-focus-naopodevazar";
const SESSAO = "Bearer jwt-do-operador";
const LOJA = "11111111-1111-1111-1111-1111111111aa";
const CNPJ = "12345678000199";

interface Chamada {
  url: string;
  metodo: string;
  headers: Headers;
  corpo: string | undefined;
}

interface Cenario {
  pode?: boolean | "sem_login";
  token?: string | null;
  cnpj?: string | null;
  ambiente?: "producao" | "homologacao";
  notasRegistradas?: number;
  focus?: (c: Chamada) => Response;
}

function montar(cenario: Cenario = {}) {
  const chamadas: Chamada[] = [];
  const {
    pode = true,
    token = TOKEN,
    cnpj = "12.345.678/0001-99",
    ambiente = "producao",
    notasRegistradas = 1,
    focus = () => json(200, { status: "autorizado", cnpj_emitente: CNPJ }),
  } = cenario;

  const fetchFalso: typeof fetch = async (entrada, init) => {
    const c: Chamada = {
      url: String(entrada),
      metodo: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      corpo: typeof init?.body === "string" ? init.body : undefined,
    };
    chamadas.push(c);

    if (c.url === `${SB}/rest/v1/rpc/pode_usar_focus_nfe`) {
      return pode === "sem_login" ? json(401, { message: "JWT expired" }) : json(200, pode);
    }
    if (c.url.startsWith(`${SB}/rest/v1/segredos_fiscais_loja?`)) {
      return json(200, token === null ? [] : [{ focus_nfe_token: token }]);
    }
    if (c.url.startsWith(`${SB}/rest/v1/configuracoes_fiscais_loja?`)) {
      return json(200, [{ cnpj, focus_nfe_ambiente: ambiente }]);
    }
    if (c.url.startsWith(`${SB}/rest/v1/notas_fiscais_arquivos?`)) {
      return json(200, Array.from({ length: notasRegistradas }, (_, i) => ({ id: `nota-${i}` })));
    }
    if (/^https:\/\/(api|homologacao)\.focusnfe\.com\.br\//.test(c.url)) return focus(c);
    if (c.url.startsWith("https://focusnfe.s3.sa-east-1.amazonaws.com/")) return focus(c);
    throw new Error(`o porteiro chamou um endereço inesperado: ${c.url}`);
  };

  const amb: Ambiente = {
    env: (nome) =>
      ({ SUPABASE_URL: SB, SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE })[nome],
    fetch: fetchFalso,
  };

  const pedir = async (corpo: unknown, autorizacao: string | null = SESSAO) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (autorizacao) headers.Authorization = autorizacao;
    const resposta = await atender(
      new Request("https://projeto.supabase.co/functions/v1/focus-nfe", {
        method: "POST",
        headers,
        body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
      }),
      amb,
    );
    const texto = await resposta.text();
    return { status: resposta.status, texto, dados: JSON.parse(texto) as Record<string, unknown> };
  };

  const naFocus = () => chamadas.filter((c) => c.url.includes("focusnfe.com.br"));
  const noS3 = () => chamadas.filter((c) => c.url.includes("amazonaws.com"));
  const noCofre = () => chamadas.filter((c) => c.url.includes("segredos_fiscais_loja"));
  return { pedir, chamadas, naFocus, noCofre, noS3 };
}

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const corpoNFCe = { cnpj_emitente: CNPJ, natureza_operacao: "VENDA AO CONSUMIDOR", items: [{ numero_item: "1" }] };
const corpoNFSe = { prestador: { cnpj: CNPJ, inscricao_municipal: "30016580" }, servico: { valor_servicos: 60 } };
const emitir = (extra: Record<string, unknown> = {}) => ({
  loja_id: LOJA,
  acao: "emitir",
  tipo: "nfce",
  ref: "os12-nfce-1727200000000",
  corpo: corpoNFCe,
  ...extra,
});

describe("porteiro da Focus NFe — quem pede", () => {
  it("sem sessão, recusa sem consultar nada", async () => {
    const { pedir, chamadas } = montar();
    const r = await pedir(emitir(), null);
    expect(r.status).toBe(401);
    expect(chamadas).toHaveLength(0);
  });

  it("confere a permissão COMO O OPERADOR, nunca com a chave do servidor", async () => {
    const { pedir, chamadas } = montar();
    await pedir(emitir());
    const rpc = chamadas.find((c) => c.url.endsWith("/rpc/pode_usar_focus_nfe"))!;
    expect(rpc.headers.get("Authorization")).toBe(SESSAO);
    expect(rpc.headers.get("apikey")).toBe(ANON);
    expect(JSON.parse(rpc.corpo!)).toEqual({ p_loja_id: LOJA, p_acao: "emitir" });
  });

  it("sem permissão, recusa antes de abrir o cofre e sem falar com a Focus NFe", async () => {
    const { pedir, naFocus, noCofre } = montar({ pode: false });
    const r = await pedir(emitir());
    expect(r.status).toBe(403);
    expect(r.dados.motivo).toBe("sem_permissao");
    expect(noCofre()).toHaveLength(0);
    expect(naFocus()).toHaveLength(0);
  });

  it("sessão vencida vira 'faça login de novo', não erro genérico", async () => {
    const { pedir, naFocus } = montar({ pode: "sem_login" });
    const r = await pedir(emitir());
    expect(r.status).toBe(401);
    expect(r.dados.erro).toMatch(/login/);
    expect(naFocus()).toHaveLength(0);
  });

  it("cancelar sem permissão explica que precisa do módulo Notas Fiscais", async () => {
    const { pedir } = montar({ pode: false });
    const r = await pedir({
      loja_id: LOJA, acao: "cancelar", tipo: "nfce", ref: "os12-nfce-1",
      justificativa: "Cliente desistiu da compra no balcão",
    });
    expect(r.status).toBe(403);
    expect(r.dados.erro).toMatch(/Notas Fiscais/);
  });
});

describe("porteiro da Focus NFe — o pedido em si", () => {
  it.each([
    ["ref com barra", { ref: "os12/../../v2/empresas" }],
    ["ref com interrogação", { ref: "os12?x=1" }],
    ["ref vazia", { ref: "" }],
    ["loja que não é uuid", { loja_id: "loja-a" }],
    ["ação inventada", { acao: "listar_empresas" }],
    ["tipo inventado", { tipo: "nfe" }],
    ["emitir sem nota", { corpo: null }],
  ])("recusa %s sem chamar ninguém", async (_nome, extra) => {
    const { pedir, chamadas } = montar();
    const r = await pedir(emitir(extra));
    expect(r.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });

  it("corpo que não é JSON é recusado", async () => {
    const { pedir, chamadas } = montar();
    const r = await pedir("isto não é json");
    expect(r.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});

describe("porteiro da Focus NFe — emitir", () => {
  it("repassa o corpo EXATAMENTE como veio, com o token, no ambiente da loja", async () => {
    const { pedir, naFocus } = montar();
    const r = await pedir(emitir());
    expect(r.status).toBe(200);
    const [chamada] = naFocus();
    expect(chamada.metodo).toBe("POST");
    expect(chamada.url).toBe("https://api.focusnfe.com.br/v2/nfce?ref=os12-nfce-1727200000000");
    expect(chamada.headers.get("Authorization")).toBe(`Basic ${btoa(`${TOKEN}:`)}`);
    expect(JSON.parse(chamada.corpo!)).toEqual(corpoNFCe);
  });

  it("homologação vai pro host de homologação — o ambiente é da loja, não do pedido", async () => {
    const { pedir, naFocus } = montar({ ambiente: "homologacao" });
    await pedir(emitir({ ambiente: "producao" }));
    expect(naFocus()[0].url).toMatch(/^https:\/\/homologacao\.focusnfe\.com\.br\/v2\/nfce\?ref=/);
  });

  it("nota com o CNPJ de outra empresa é recusada, sem chegar na Focus NFe", async () => {
    const { pedir, naFocus } = montar();
    const r = await pedir(emitir({ corpo: { ...corpoNFCe, cnpj_emitente: "99888777000166" } }));
    expect(r.status).toBe(403);
    expect(r.dados.motivo).toBe("outra_empresa");
    expect(naFocus()).toHaveLength(0);
  });

  it("na NFS-e o CNPJ conferido é o do prestador", async () => {
    const { pedir, naFocus } = montar();
    const outro = await pedir(
      emitir({ tipo: "nfse", ref: "os12-nfse-1", corpo: { ...corpoNFSe, prestador: { cnpj: "99888777000166" } } }),
    );
    expect(outro.status).toBe(403);
    expect(naFocus()).toHaveLength(0);

    const certo = await pedir(emitir({ tipo: "nfse", ref: "os12-nfse-1", corpo: corpoNFSe }));
    expect(certo.status).toBe(200);
    expect(naFocus()[0].url).toBe("https://api.focusnfe.com.br/v2/nfse?ref=os12-nfse-1");
  });

  it("nota sem CNPJ nenhum também é recusada", async () => {
    const { pedir, naFocus } = montar();
    const r = await pedir(emitir({ corpo: { natureza_operacao: "VENDA" } }));
    expect(r.status).toBe(403);
    expect(naFocus()).toHaveLength(0);
  });

  it("loja sem token explica onde cadastrar", async () => {
    const { pedir, naFocus } = montar({ token: null });
    const r = await pedir(emitir());
    expect(r.status).toBe(409);
    expect(r.dados.erro).toMatch(/Configurações → Dados fiscais/);
    expect(naFocus()).toHaveLength(0);
  });

  it("loja sem CNPJ cadastrado não emite (não teria com o que conferir)", async () => {
    const { pedir, naFocus } = montar({ cnpj: null });
    const r = await pedir(emitir());
    expect(r.status).toBe(409);
    expect(r.dados.motivo).toBe("sem_cnpj");
    expect(naFocus()).toHaveLength(0);
  });

  it("erro da Focus NFe passa inteiro, pra a tela mostrar a mensagem dela como sempre", async () => {
    const { pedir } = montar({
      focus: () => json(422, { codigo: "requisicao_invalida", mensagem: "CSOSN inválido" }),
    });
    const r = await pedir(emitir());
    expect(r.status).toBe(200);
    expect(r.dados).toEqual({
      ok: false,
      status: 422,
      dados: { codigo: "requisicao_invalida", mensagem: "CSOSN inválido" },
    });
  });
});

describe("porteiro da Focus NFe — consultar", () => {
  it("repassa a resposta da Focus NFe", async () => {
    const { pedir, naFocus } = montar();
    const r = await pedir({ loja_id: LOJA, acao: "consultar", tipo: "nfce", ref: "os12-nfce-1" });
    expect(naFocus()[0]).toMatchObject({ metodo: "GET", url: "https://api.focusnfe.com.br/v2/nfce/os12-nfce-1" });
    expect(r.dados).toMatchObject({ ok: true, status: 200, dados: { status: "autorizado" } });
  });

  it("nota de outro CNPJ não é mostrada (conta da Focus NFe compartilhada)", async () => {
    const { pedir } = montar({ focus: () => json(200, { status: "autorizado", cnpj_emitente: "99888777000166" }) });
    const r = await pedir({ loja_id: LOJA, acao: "consultar", tipo: "nfce", ref: "os12-nfce-1" });
    expect(r.status).toBe(403);
    expect(r.texto).not.toContain("autorizado");
  });

  it("resposta sem CNPJ nenhum passa — não dá pra conferir, e a loja já foi conferida", async () => {
    const { pedir } = montar({ focus: () => json(200, { status: "processando_autorizacao" }) });
    const r = await pedir({ loja_id: LOJA, acao: "consultar", tipo: "nfse", ref: "os12-nfse-1" });
    expect(r.dados).toMatchObject({ ok: true, dados: { status: "processando_autorizacao" } });
  });
});

describe("porteiro da Focus NFe — cancelar", () => {
  const cancelar = (extra: Record<string, unknown> = {}) => ({
    loja_id: LOJA, acao: "cancelar", tipo: "nfce", ref: "os12-nfce-1",
    justificativa: "Cliente desistiu da compra no balcão", ...extra,
  });

  it("nota que não foi emitida por esta loja não é cancelada", async () => {
    const { pedir, naFocus } = montar({ notasRegistradas: 0 });
    const r = await pedir(cancelar());
    expect(r.status).toBe(404);
    expect(naFocus()).toHaveLength(0);
  });

  it("confere o registro pela loja, pela ref e pelo tipo da tabela", async () => {
    const { pedir, chamadas } = montar();
    await pedir(cancelar());
    const busca = chamadas.find((c) => c.url.includes("notas_fiscais_arquivos"))!;
    expect(busca.url).toContain(`loja_id=eq.${LOJA}`);
    expect(busca.url).toContain("focus_nfe_ref=eq.os12-nfce-1");
    expect(busca.url).toContain("tipo=eq.nfe");
    expect(busca.headers.get("apikey")).toBe(SERVICE);
  });

  it("nota registrada: DELETE com a justificativa", async () => {
    const { pedir, naFocus } = montar({ focus: () => json(200, { status: "cancelado" }) });
    const r = await pedir(cancelar());
    expect(naFocus()[0]).toMatchObject({ metodo: "DELETE", url: "https://api.focusnfe.com.br/v2/nfce/os12-nfce-1" });
    expect(JSON.parse(naFocus()[0].corpo!)).toEqual({ justificativa: "Cliente desistiu da compra no balcão" });
    expect(r.dados).toMatchObject({ ok: true, dados: { status: "cancelado" } });
  });

  it("justificativa curta é recusada aqui também — o porteiro não confia na tela", async () => {
    const { pedir, chamadas } = montar();
    const r = await pedir(cancelar({ justificativa: "erro" }));
    expect(r.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});

describe("porteiro da Focus NFe — baixar PDF/XML", () => {
  const baixar = (arquivo: string) => ({ loja_id: LOJA, acao: "baixar", tipo: "nfce", ref: "os12-nfce-1", arquivo });

  it("busca o endereço que a PRÓPRIA Focus NFe devolveu, e manda o arquivo em base64", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xff, 0x00, 0x10]);
    const { pedir, naFocus } = montar({
      focus: (c) =>
        c.url.endsWith("/v2/nfce/os12-nfce-1")
          ? json(200, { status: "autorizado", cnpj_emitente: CNPJ, caminho_danfe: "/arquivos/danfe.pdf" })
          : new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf" } }),
    });
    const r = await pedir(baixar("danfe"));
    expect(naFocus().map((c) => c.url)).toEqual([
      "https://api.focusnfe.com.br/v2/nfce/os12-nfce-1",
      "https://api.focusnfe.com.br/arquivos/danfe.pdf",
    ]);
    expect(r.dados.tipo_conteudo).toBe("application/pdf");
    const volta = Uint8Array.from(atob(r.dados.conteudo_base64 as string), (ch) => ch.charCodeAt(0));
    expect(Array.from(volta)).toEqual(Array.from(pdf));
  });

  it("arquivo que a Focus NFe não devolveu vira 'sem_arquivo'", async () => {
    const { pedir } = montar({ focus: () => json(200, { status: "autorizado" }) });
    const r = await pedir(baixar("danfe"));
    expect(r.status).toBe(404);
    expect(r.dados.motivo).toBe("sem_arquivo");
  });

  it("endereço fora da Focus NFe não é seguido — o token iria junto", async () => {
    const { pedir, naFocus } = montar({
      focus: () => json(200, { status: "autorizado", caminho_xml_nota_fiscal: "https://ladrao.example.com/x.xml" }),
    });
    const r = await pedir(baixar("xml"));
    expect(r.status).toBe(502);
    expect(naFocus()).toHaveLength(1);
  });

  it("arquivo que não é xml nem danfe é recusado", async () => {
    const { pedir, chamadas } = montar();
    const r = await pedir(baixar("../../v2/empresas"));
    expect(r.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});

// NFS-e pelo Padrão Nacional (#837): caminho `/v2/nfsen`, corpo "achatado"
// (cnpj_prestador no primeiro nível) e o PDF (DANFSe) num endereço público
// do S3 da Focus NFe. Formato conferido em doc.focusnfe.com.br (NFSe
// Nacional: Emitir, Consultar e Cancelar) — ver docs/pendencias-e-futuro.md.
describe("porteiro da Focus NFe — NFS-e Nacional (nfsen)", () => {
  const corpoNacional = { cnpj_prestador: CNPJ, valor_servico: 60, descricao_servico: "Troca de pneu" };
  const REF = "os12-nfsen-1727200000000";

  it("aceita o tipo nfsen e emite por POST em /v2/nfsen?ref=, com o token", async () => {
    const { pedir, naFocus } = montar({ focus: () => json(202, { status: "processando_autorizacao" }) });
    const r = await pedir(emitir({ tipo: "nfsen", ref: REF, corpo: corpoNacional }));
    expect(r.status).toBe(200);
    expect(naFocus()).toHaveLength(1);
    expect(naFocus()[0]).toMatchObject({ metodo: "POST", url: `https://api.focusnfe.com.br/v2/nfsen?ref=${REF}` });
    expect(naFocus()[0].headers.get("Authorization")).toBe(`Basic ${btoa(`${TOKEN}:`)}`);
    expect(JSON.parse(naFocus()[0].corpo!)).toEqual(corpoNacional);
  });

  it("confere o CNPJ do prestador no campo achatado cnpj_prestador", async () => {
    const { pedir, naFocus } = montar();
    const r = await pedir(emitir({ tipo: "nfsen", ref: REF, corpo: { ...corpoNacional, cnpj_prestador: "99888777000166" } }));
    expect(r.status).toBe(403);
    expect(r.dados.motivo).toBe("outra_empresa");
    expect(naFocus()).toHaveLength(0);
  });

  it("consulta por GET em /v2/nfsen/<ref>", async () => {
    const { pedir, naFocus } = montar({ focus: () => json(200, { status: "autorizado", cnpj_prestador: CNPJ }) });
    const r = await pedir({ loja_id: LOJA, acao: "consultar", tipo: "nfsen", ref: REF });
    expect(naFocus()[0]).toMatchObject({ metodo: "GET", url: `https://api.focusnfe.com.br/v2/nfsen/${REF}` });
    expect(r.dados).toMatchObject({ ok: true, dados: { status: "autorizado" } });
  });

  it("cancela por DELETE em /v2/nfsen/<ref>, conferindo o registro como nfse na tabela", async () => {
    const { pedir, chamadas, naFocus } = montar({ focus: () => json(200, { status: "cancelado" }) });
    await pedir({
      loja_id: LOJA, acao: "cancelar", tipo: "nfsen", ref: REF,
      justificativa: "Serviço lançado na OS errada",
    });
    const busca = chamadas.find((c) => c.url.includes("notas_fiscais_arquivos"))!;
    expect(busca.url).toContain("tipo=eq.nfse");
    expect(naFocus()[0]).toMatchObject({ metodo: "DELETE", url: `https://api.focusnfe.com.br/v2/nfsen/${REF}` });
    expect(JSON.parse(naFocus()[0].corpo!)).toEqual({ justificativa: "Serviço lançado na OS errada" });
  });

  it("o PDF (DANFSe) vem do url_danfse no S3 da Focus NFe, SEM o token junto", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const urlDanfse = "https://focusnfe.s3.sa-east-1.amazonaws.com/arquivos/x/DANFSEs/NFS1.pdf";
    const { pedir, noS3 } = montar({
      focus: (c) =>
        c.url.includes("/v2/nfsen/")
          ? json(200, { status: "autorizado", cnpj_prestador: CNPJ, url_danfse: urlDanfse })
          : new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf" } }),
    });
    const r = await pedir({ loja_id: LOJA, acao: "baixar", tipo: "nfsen", ref: REF, arquivo: "danfe" });
    expect(r.status).toBe(200);
    expect(noS3()).toHaveLength(1);
    expect(noS3()[0].url).toBe(urlDanfse);
    expect(noS3()[0].headers.get("Authorization")).toBeNull();
    expect(r.dados.tipo_conteudo).toBe("application/pdf");
  });

  it("o S3 só serve pro PDF público: XML apontando pra lá não é seguido (lá o token iria junto)", async () => {
    const { pedir, noS3 } = montar({
      focus: () =>
        json(200, {
          status: "autorizado",
          caminho_xml_nota_fiscal: "https://focusnfe.s3.sa-east-1.amazonaws.com/x.xml",
        }),
    });
    const r = await pedir({ loja_id: LOJA, acao: "baixar", tipo: "nfsen", ref: REF, arquivo: "xml" });
    expect(r.status).toBe(502);
    expect(noS3()).toHaveLength(0);
  });

  it("tipo desconhecido continua recusado", () => {
    expect(validarPedido({ loja_id: LOJA, acao: "consultar", tipo: "nfsex", ref: REF })).toBe(
      "Tipo de nota desconhecido.",
    );
  });
});

describe("porteiro da Focus NFe — o segredo não sai", () => {
  // Passa por TODO caminho de recusa, não só pelos felizes: uma mensagem de
  // erro montada com o valor errado é exatamente como segredo costuma vazar.
  // (A primeira versão deste teste cobria seis caminhos, e um token plantado
  // de propósito na mensagem de "loja sem CNPJ" passou batido.)
  it("nem o token nem a chave do servidor aparecem em resposta nenhuma", async () => {
    const consultar = { loja_id: LOJA, acao: "consultar", tipo: "nfce", ref: "os12-nfce-1" };
    const baixarXml = { loja_id: LOJA, acao: "baixar", tipo: "nfce", ref: "os12-nfce-1", arquivo: "xml" };
    const cancelar = {
      loja_id: LOJA, acao: "cancelar", tipo: "nfce", ref: "os12-nfce-1",
      justificativa: "Cliente desistiu da compra no balcão",
    };
    const cenarios: Array<[Cenario, unknown]> = [
      [{}, emitir()],
      [{}, emitir({ ref: "os12/../x" })],
      [{ pode: false }, emitir()],
      [{ pode: "sem_login" }, emitir()],
      [{ token: null }, emitir()],
      [{ cnpj: null }, emitir()],
      [{}, emitir({ corpo: { cnpj_emitente: "99888777000166" } })],
      [{ focus: () => json(500, { mensagem: "erro interno" }) }, emitir()],
      [{}, consultar],
      [{ focus: () => json(200, { cnpj_emitente: "99888777000166" }) }, consultar],
      [{}, baixarXml],
      [{ focus: () => json(200, { caminho_xml_nota_fiscal: "https://ladrao.example.com/x" }) }, baixarXml],
      [{ notasRegistradas: 0 }, cancelar],
      [{}, cancelar],
    ];
    for (const [cenario, corpo] of cenarios) {
      const { pedir } = montar(cenario);
      const r = await pedir(corpo);
      expect(r.texto).not.toContain(TOKEN);
      expect(r.texto).not.toContain(SERVICE);
      expect(r.texto).not.toContain(btoa(`${TOKEN}:`));
    }
  });

  it("a chave do servidor só vai pro próprio Supabase, nunca pra Focus NFe", async () => {
    const { pedir, naFocus } = montar();
    await pedir(emitir());
    for (const c of naFocus()) {
      expect([...c.headers.values()].join(" ")).not.toContain(SERVICE);
    }
  });
});

describe("porteiro — peças soltas", () => {
  it("enderecoDoArquivo só aceita caminho relativo ou os dois hosts da Focus NFe", () => {
    const host = "api.focusnfe.com.br";
    expect(enderecoDoArquivo("/arquivos/x.xml", host)).toBe("https://api.focusnfe.com.br/arquivos/x.xml");
    expect(enderecoDoArquivo("//ladrao.example.com/x", host)).toBeNull();
    expect(enderecoDoArquivo("https://homologacao.focusnfe.com.br/a.pdf", host)).toBe(
      "https://homologacao.focusnfe.com.br/a.pdf",
    );
    expect(enderecoDoArquivo("https://api.focusnfe.com.br.ladrao.com/a.pdf", host)).toBeNull();
    expect(enderecoDoArquivo("http://api.focusnfe.com.br/a.pdf", host)).toBeNull();
    expect(enderecoDoArquivo("", host)).toBeNull();
    expect(enderecoDoArquivo(42, host)).toBeNull();
  });

  it("validarPedido não deixa passar campo que não é da ação", () => {
    const p = validarPedido({ loja_id: LOJA, acao: "consultar", tipo: "nfce", ref: "a", corpo: { x: 1 } });
    expect(p).toEqual({ loja_id: LOJA, acao: "consultar", tipo: "nfce", ref: "a" });
  });
});

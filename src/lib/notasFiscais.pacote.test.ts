/**
 * O pacote do mês pro contador (#383): o .zip com o XML e o PDF de cada nota.
 * Por fora fica só o que sai da máquina: o Storage (XML), o porteiro da Focus
 * NFe (PDF) e o "salvar como". O pacote em si é lido de volta, arquivo por
 * arquivo, do .zip que a pessoa receberia.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

const xmlQueFalha = new Set<string>();
const pdfQueFalha = new Set<string>();
const salvos: { conteudo: Blob; nome: string }[] = [];
const consultas: string[] = [];
const filtros: string[] = [];

// Uma consulta do Supabase de mentira: anota cada filtro e devolve uma página vazia.
function consultaQueAnota(): Record<string, unknown> {
  const consulta: Record<string, unknown> = {
    then: (resolver: (resposta: unknown) => unknown) => resolver({ data: [], error: null }),
  };
  for (const metodo of ["select", "eq", "gte", "lt", "order", "range"]) {
    consulta[metodo] = (...args: unknown[]) => {
      if (metodo !== "select" && metodo !== "order" && metodo !== "range") {
        filtros.push(`${metodo} ${args.map(String).join(" ")}`);
      }
      return consulta;
    };
  }
  return consulta;
}

vi.mock("./supabase", () => ({
  supabase: {
    from: () => consultaQueAnota(),
    storage: {
      from: () => ({
        download: async (caminho: string) =>
          xmlQueFalha.has(caminho)
            ? { data: null, error: { message: "Object not found" } }
            : { data: new Blob([`<xml>${caminho}</xml>`]), error: null },
      }),
    },
  },
}));

vi.mock("./focusNfe", async (importOriginal) => {
  const original = await importOriginal<typeof import("./focusNfe")>();
  const consultar = async (ref: string) => {
    consultas.push(ref);
    return { status: "autorizado", caminho_danfe: `/danfe/${ref}.pdf` };
  };
  return {
    ...original,
    consultarNFCe: consultar,
    consultarNFSe: consultar,
    baixarArquivoNota: async (_loja: string, _tipo: string, ref: string) => {
      if (pdfQueFalha.has(ref)) {
        throw new original.FocusNfeError("A Focus NFe demorou demais pra responder.");
      }
      return new Blob([`%PDF ${ref}`]);
    },
  };
});

vi.mock("./download", () => ({
  salvarComoDownload: (conteudo: Blob, nome: string) => {
    salvos.push({ conteudo, nome });
  },
}));

const { gerarPacoteContabilidade, listarNotasDoMesParaPacote } = await import("./notasFiscais");

const LOJA = { id: "loja-1", nome: "Loja Teste" };

function nota(id: string, campos: Partial<NotaFiscalArquivo> = {}): NotaFiscalArquivo {
  return {
    id,
    loja_id: "loja-1",
    tipo: "nfe",
    competencia: "2026-10-01",
    nome_arquivo: `nfe-${id}.xml`,
    storage_path: `nfe/2026-10/${id}.xml`,
    ordem_servico_id: null,
    operador_id: null,
    criado_em: "2026-10-10T12:00:00Z",
    origem: "automatica",
    numero: id,
    chave_acesso: null,
    status: "autorizado",
    focus_nfe_ref: `ref-${id}`,
    ...campos,
  };
}

// Lê um .zip sem compressão (o que `criarZip` escreve): nome → texto.
async function lerZip(blob: Blob): Promise<Map<string, string>> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const visao = new DataView(bytes.buffer);
  const arquivos = new Map<string, string>();
  let posicao = 0;
  while (visao.getUint32(posicao, true) === 0x04034b50) {
    const tamanho = visao.getUint32(posicao + 18, true);
    const tamanhoNome = visao.getUint16(posicao + 26, true);
    const tamanhoExtra = visao.getUint16(posicao + 28, true);
    const inicioNome = posicao + 30;
    const nome = new TextDecoder().decode(bytes.slice(inicioNome, inicioNome + tamanhoNome));
    const inicio = inicioNome + tamanhoNome + tamanhoExtra;
    arquivos.set(nome, new TextDecoder().decode(bytes.slice(inicio, inicio + tamanho)));
    posicao = inicio + tamanho;
  }
  return arquivos;
}

beforeEach(() => {
  xmlQueFalha.clear();
  pdfQueFalha.clear();
  salvos.length = 0;
  consultas.length = 0;
  filtros.length = 0;
});

describe("gerarPacoteContabilidade", () => {
  it("monta o .zip com o XML e o PDF de cada nota, nas pastas certas, e o LEIA-ME", async () => {
    const resultado = await gerarPacoteContabilidade({
      loja: LOJA,
      notas: [nota("1"), nota("2", { tipo: "nfse", nome_arquivo: "nfse-2.xml" })],
      mes: "2026-10",
    });

    expect(resultado).toEqual({ semPdf: 0, baixado: true });
    expect(salvos.map((s) => s.nome)).toEqual(["pacote-contabilidade-loja-teste-2026-10.zip"]);
    const zip = await lerZip(salvos[0].conteudo);
    expect([...zip.keys()].sort()).toEqual([
      "LEIA-ME.txt",
      "nfce/nfe-1.pdf",
      "nfce/nfe-1.xml",
      "nfse/nfse-2.pdf",
      "nfse/nfse-2.xml",
    ]);
    expect(zip.get("nfce/nfe-1.xml")).toBe("<xml>nfe/2026-10/1.xml</xml>");
    expect(zip.get("nfce/nfe-1.pdf")).toBe("%PDF ref-1");
    expect(zip.get("LEIA-ME.txt")).toContain("Todas as notas estão com o XML e o PDF.");
    // A marca de UTF-8 vem antes; depois, a loja na primeira linha.
    expect(zip.get("LEIA-ME.txt")?.replace(/^\uFEFF/, "").split("\r\n")[0]).toBe("Loja: Loja Teste");
  });

  it("trocou de loja no meio dos PDFs (`aindaValido` vira false): não baixa, e diz que descartou", async () => {
    let mesmaLoja = true;
    const resultado = await gerarPacoteContabilidade({
      loja: LOJA,
      notas: [nota("1"), nota("2")],
      mes: "2026-10",
      aoProgredir: (feitos) => {
        if (feitos === 1) mesmaLoja = false;
      },
      aindaValido: () => mesmaLoja,
    });
    expect(resultado).toEqual({ semPdf: 0, baixado: false });
    expect(salvos).toEqual([]);
  });

  it("com `aindaValido` dizendo que sim, baixa normal", async () => {
    const resultado = await gerarPacoteContabilidade({
      loja: LOJA,
      notas: [nota("1")],
      mes: "2026-10",
      aindaValido: () => true,
    });
    expect(resultado).toEqual({ semPdf: 0, baixado: true });
    expect(salvos).toHaveLength(1);
  });

  it("nota de outra loja no meio: recusa com uma frase em português, sem buscar nem baixar nada", async () => {
    await expect(
      gerarPacoteContabilidade({
        loja: LOJA,
        notas: [nota("1"), nota("2", { loja_id: "loja-2" })],
        mes: "2026-10",
      }),
    ).rejects.toThrow(
      "Uma das notas não é da loja Loja Teste (a loja foi trocada no meio?). Abra a tela de novo e gere o pacote outra vez.",
    );
    expect(consultas).toEqual([]);
    expect(salvos).toEqual([]);
  });

  it("com `tipo` (botão de uma aba), o .zip leva o tipo no nome", async () => {
    await gerarPacoteContabilidade({ loja: LOJA, notas: [nota("1")], mes: "2026-10", tipo: "nfe" });
    expect(salvos.map((s) => s.nome)).toEqual(["pacote-contabilidade-loja-teste-2026-10-nfce.zip"]);
    const zip = await lerZip(salvos[0].conteudo);
    expect(zip.get("LEIA-ME.txt")).toContain("SÓ das NFC-e");
  });

  it("um PDF que falha não derruba: o .zip sai, a nota vai só com o XML e o LEIA-ME diz por quê", async () => {
    pdfQueFalha.add("ref-2");
    const resultado = await gerarPacoteContabilidade({
      loja: LOJA,
      notas: [nota("1"), nota("2"), nota("3")],
      mes: "2026-10",
    });

    expect(resultado).toEqual({ semPdf: 1, baixado: true });
    const zip = await lerZip(salvos[0].conteudo);
    expect(zip.has("nfce/nfe-2.xml")).toBe(true);
    expect(zip.has("nfce/nfe-2.pdf")).toBe(false);
    expect(zip.has("nfce/nfe-3.pdf")).toBe(true);
    expect(zip.get("LEIA-ME.txt")).toContain(
      "- NFC-e nº 2 (nfce/nfe-2.xml): A Focus NFe demorou demais pra responder.",
    );
  });

  it("um XML que falha derruba, com uma frase em português dizendo qual nota", async () => {
    xmlQueFalha.add("nfe/2026-10/2.xml");
    await expect(
      gerarPacoteContabilidade({ loja: LOJA, notas: [nota("1"), nota("2")], mes: "2026-10" }),
    ).rejects.toThrow(/^Não deu pra baixar o XML da nota nfe-2\.xml: /);
    expect(salvos).toEqual([]);
  });

  it("nota enviada à mão não pergunta à Focus NFe: vai só com o XML, e o motivo no LEIA-ME", async () => {
    const resultado = await gerarPacoteContabilidade({
      loja: LOJA,
      notas: [nota("1"), nota("9", { origem: "manual", focus_nfe_ref: null, numero: null })],
      mes: "2026-10",
    });

    expect(resultado).toEqual({ semPdf: 1, baixado: true });
    expect(consultas).toEqual(["ref-1"]);
    const zip = await lerZip(salvos[0].conteudo);
    expect(zip.get("LEIA-ME.txt")).toContain(
      "- NFC-e (nfce/nfe-9.xml): enviada à mão (upload do XML), o PDF nunca passou pelo sistema",
    );
  });

  it("avisa o progresso a cada PDF buscado, contando só os que vão à Focus NFe", async () => {
    const avisos: string[] = [];
    await gerarPacoteContabilidade({
      loja: LOJA,
      notas: [nota("1"), nota("2"), nota("3", { origem: "manual", focus_nfe_ref: null })],
      mes: "2026-10",
      aoProgredir: (feitos, total) => avisos.push(`${feitos} de ${total}`),
    });
    expect(avisos).toEqual(["0 de 2", "1 de 2", "2 de 2"]);
  });

  it("só entram as notas do mês pedido", async () => {
    await gerarPacoteContabilidade({
      loja: LOJA,
      notas: [nota("1"), nota("2", { competencia: "2026-09-01" })],
      mes: "2026-10",
    });
    const zip = await lerZip(salvos[0].conteudo);
    expect([...zip.keys()].sort()).toEqual(["LEIA-ME.txt", "nfce/nfe-1.pdf", "nfce/nfe-1.xml"]);
  });

  it("mês sem nota: avisa em português e não baixa nada", async () => {
    await expect(
      gerarPacoteContabilidade({
        loja: LOJA,
        notas: [nota("1", { competencia: "2026-09-01" })],
        mes: "2026-10",
      }),
    ).rejects.toThrow("Não há notas de outubro de 2026 pra montar o pacote.");
    expect(salvos).toEqual([]);
  });
});


describe("listarNotasDoMesParaPacote", () => {
  it("pede ao banco só as notas da loja naquele mês, do dia 1º até antes do mês seguinte", async () => {
    await listarNotasDoMesParaPacote("loja-1", "2026-12");
    expect(filtros).toEqual([
      "eq loja_id loja-1",
      "gte competencia 2026-12-01",
      "lt competencia 2027-01-01",
    ]);
  });
});

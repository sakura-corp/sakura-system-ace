import { describe, expect, it } from "vitest";
import {
  intervaloDoMes,
  motivoSemPdf,
  nomeDoPacote,
  notasDoMes,
  planejarPacoteContabilidade,
  type ResultadoPdf,
} from "./pacoteContabilidade";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

function nota(campos: Partial<NotaFiscalArquivo> = {}): NotaFiscalArquivo {
  return {
    id: "nota-1",
    loja_id: "loja-1",
    tipo: "nfe",
    competencia: "2026-10-01",
    nome_arquivo: "nfe-123.xml",
    storage_path: "nfe/2026-10/x-nfe-123.xml",
    ordem_servico_id: null,
    operador_id: null,
    criado_em: "2026-10-10T12:00:00Z",
    origem: "automatica",
    numero: "123",
    chave_acesso: null,
    status: "autorizado",
    focus_nfe_ref: "ref-123",
    ...campos,
  };
}

const PDF_OK: ResultadoPdf = { ok: true };

function caminhos(notas: NotaFiscalArquivo[], pdfs: Record<string, ResultadoPdf> = {}) {
  return planejarPacoteContabilidade({
    mes: "2026-10",
    notas,
    pdfs: new Map(Object.entries(pdfs)),
  }).entradas.map((entrada) => entrada.caminho);
}

describe("planejarPacoteContabilidade: as pastas", () => {
  it("NFC-e (tipo nfe no código) vai em nfce/ e NFS-e em nfse/, com o XML e o PDF lado a lado", () => {
    const nfce = nota({ id: "a", tipo: "nfe", nome_arquivo: "nfe-10.xml" });
    const nfse = nota({ id: "b", tipo: "nfse", nome_arquivo: "nfse-20.xml" });
    expect(caminhos([nfce, nfse], { a: PDF_OK, b: PDF_OK })).toEqual([
      "nfce/nfe-10.xml",
      "nfce/nfe-10.pdf",
      "nfse/nfse-20.xml",
      "nfse/nfse-20.pdf",
    ]);
  });
});

describe("planejarPacoteContabilidade: nomes que se repetem", () => {
  it("duas notas com o mesmo nome na mesma pasta viram dois arquivos, e o PDF segue o XML", () => {
    const primeira = nota({ id: "a", nome_arquivo: "nota.xml" });
    const segunda = nota({ id: "b", nome_arquivo: "nota.xml" });
    expect(caminhos([primeira, segunda], { a: PDF_OK, b: PDF_OK })).toEqual([
      "nfce/nota.xml",
      "nfce/nota.pdf",
      "nfce/nota (2).xml",
      "nfce/nota (2).pdf",
    ]);
  });

  it("maiúscula e minúscula contam como o mesmo nome (o Windows não separa)", () => {
    const primeira = nota({ id: "a", nome_arquivo: "Nota.xml" });
    const segunda = nota({ id: "b", nome_arquivo: "nota.XML" });
    expect(caminhos([primeira, segunda])).toEqual(["nfce/Nota.xml", "nfce/nota (2).xml"]);
  });

  it("o mesmo nome em pastas diferentes não ganha número", () => {
    const nfce = nota({ id: "a", tipo: "nfe", nome_arquivo: "nota.xml" });
    const nfse = nota({ id: "b", tipo: "nfse", nome_arquivo: "nota.xml" });
    expect(caminhos([nfce, nfse])).toEqual(["nfce/nota.xml", "nfse/nota.xml"]);
  });

  it("não reaproveita um nome que já existia com o número", () => {
    const notas = [
      nota({ id: "a", nome_arquivo: "nota.xml" }),
      nota({ id: "b", nome_arquivo: "nota (2).xml" }),
      nota({ id: "c", nome_arquivo: "nota.xml" }),
    ];
    expect(caminhos(notas)).toEqual(["nfce/nota.xml", "nfce/nota (2).xml", "nfce/nota (3).xml"]);
  });
});

describe("planejarPacoteContabilidade: nota cancelada", () => {
  it("entra no pacote, com CANCELADA- no nome do XML e do PDF", () => {
    const cancelada = nota({ id: "a", nome_arquivo: "nfe-7.xml", status: "cancelado" });
    const valendo = nota({ id: "b", nome_arquivo: "nfe-8.xml", status: "autorizado" });
    expect(caminhos([cancelada, valendo], { a: PDF_OK, b: PDF_OK })).toEqual([
      "nfce/CANCELADA-nfe-7.xml",
      "nfce/CANCELADA-nfe-7.pdf",
      "nfce/nfe-8.xml",
      "nfce/nfe-8.pdf",
    ]);
  });
});

describe("motivoSemPdf", () => {
  it("nota enviada à mão: o PDF nunca passou pelo sistema", () => {
    expect(motivoSemPdf(nota({ origem: "manual", focus_nfe_ref: null }))).toBe(
      "enviada à mão (upload do XML), o PDF nunca passou pelo sistema",
    );
  });

  it("nota emitida sem a referência da Focus NFe: não dá pra pedir o PDF de novo", () => {
    expect(motivoSemPdf(nota({ origem: "automatica", focus_nfe_ref: null }))).toBe(
      "emitida antes de o sistema guardar a referência da nota, não dá pra pedir o PDF de novo (ela continua no painel da Focus NFe)",
    );
  });

  it("nota emitida pelo sistema, com a referência: dá pra buscar o PDF", () => {
    expect(motivoSemPdf(nota())).toBeNull();
  });
});

function leiaMe(notas: NotaFiscalArquivo[], pdfs: Record<string, ResultadoPdf> = {}) {
  return planejarPacoteContabilidade({
    mes: "2026-10",
    notas,
    pdfs: new Map(Object.entries(pdfs)),
  }).leiaMe;
}

describe("planejarPacoteContabilidade: o LEIA-ME", () => {
  it("diz de que mês é e quantas notas tem de cada tipo, contando as canceladas", () => {
    const texto = leiaMe(
      [
        nota({ id: "a", tipo: "nfe", nome_arquivo: "nfe-1.xml" }),
        nota({ id: "b", tipo: "nfe", nome_arquivo: "nfe-2.xml", status: "cancelado" }),
        nota({ id: "c", tipo: "nfse", nome_arquivo: "nfse-3.xml" }),
      ],
      { a: PDF_OK, b: PDF_OK, c: PDF_OK },
    );
    expect(texto).toContain("outubro de 2026");
    expect(texto).toContain("NFC-e (pasta nfce): 2 notas, 1 cancelada");
    expect(texto).toContain("NFS-e (pasta nfse): 1 nota");
  });

  it("a nota sem PDF aparece com o número, o arquivo e o motivo", () => {
    const texto = leiaMe(
      [
        nota({ id: "a", numero: "45", nome_arquivo: "nfe-45.xml" }),
        nota({ id: "b", numero: null, origem: "manual", nome_arquivo: "fornecedor.xml" }),
      ],
      {
        a: { ok: false, motivo: "A Focus NFe não respondeu." },
        b: { ok: false, motivo: "enviada à mão (upload do XML), o PDF nunca passou pelo sistema" },
      },
    );
    expect(texto).toContain("Ficaram sem PDF (só o XML) 2 notas:");
    expect(texto).toContain("- NFC-e nº 45 (nfce/nfe-45.xml): A Focus NFe não respondeu.");
    expect(texto).toContain(
      "- NFC-e (nfce/fornecedor.xml): enviada à mão (upload do XML), o PDF nunca passou pelo sistema",
    );
  });

  it("nota sem resultado de PDF também conta como sem PDF (nunca some calada)", () => {
    const texto = leiaMe([nota({ id: "a", numero: "9", nome_arquivo: "nfe-9.xml" })]);
    expect(texto).toContain("- NFC-e nº 9 (nfce/nfe-9.xml): o PDF não foi buscado");
  });

  it("pacote de uma aba só: o LEIA-ME diz que é só daquele tipo e onde está o outro", () => {
    const texto = planejarPacoteContabilidade({
      mes: "2026-10",
      tipo: "nfe",
      notas: [nota({ id: "a" })],
      pdfs: new Map([["a", PDF_OK]]),
    }).leiaMe;
    expect(texto).toContain("SÓ das NFC-e");
    expect(texto).toContain("NFS-e");
    expect(texto).toContain("Gerar o pacote");
    expect(texto).not.toContain("o XML de cada nota do mês");
  });

  it("pacote dos dois tipos (sem `tipo`) não diz que é parcial", () => {
    const texto = leiaMe([nota({ id: "a" })], { a: PDF_OK });
    expect(texto).not.toContain("SÓ das");
  });

  it("quando todas têm PDF, diz isso", () => {
    const texto = leiaMe([nota({ id: "a" })], { a: PDF_OK });
    expect(texto).toContain("Todas as notas estão com o XML e o PDF.");
    expect(texto).not.toContain("Ficaram sem PDF");
  });
});

describe("o mês do pacote", () => {
  it("o nome do .zip leva o mês", () => {
    expect(nomeDoPacote("2026-10")).toBe("pacote-contabilidade-2026-10.zip");
  });

  it("o pacote de uma aba só leva o tipo no nome", () => {
    expect(nomeDoPacote("2026-10", "nfe")).toBe("pacote-contabilidade-2026-10-nfce.zip");
    expect(nomeDoPacote("2026-10", "nfse")).toBe("pacote-contabilidade-2026-10-nfse.zip");
  });

  it("só entram as notas daquele mês (competência no dia 1º ou no dia da emissão)", () => {
    const notas = [
      nota({ id: "set", competencia: "2026-09-01" }),
      nota({ id: "out", competencia: "2026-10-01" }),
      nota({ id: "out-antiga", competencia: "2026-10-31" }),
      nota({ id: "nov", competencia: "2026-11-01" }),
    ];
    expect(notasDoMes(notas, "2026-10").map((n) => n.id)).toEqual(["out", "out-antiga"]);
  });

  it("o intervalo pro banco vai do dia 1º até antes do dia 1º do mês seguinte, virando o ano", () => {
    expect(intervaloDoMes("2026-10")).toEqual({ de: "2026-10-01", ateAntesDe: "2026-11-01" });
    expect(intervaloDoMes("2026-12")).toEqual({ de: "2026-12-01", ateAntesDe: "2027-01-01" });
  });

  it("mês fora do formato AAAA-MM é recusado com uma frase em português", () => {
    expect(() => intervaloDoMes("10/2026")).toThrow("O mês do pacote precisa ser no formato AAAA-MM");
    expect(() => intervaloDoMes("2026-13")).toThrow("O mês do pacote precisa ser no formato AAAA-MM");
  });
});

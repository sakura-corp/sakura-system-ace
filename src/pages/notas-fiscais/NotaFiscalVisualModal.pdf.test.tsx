// @vitest-environment jsdom
/**
 * #1147: a NFS-e da Giap (Araraquara) não tem PDF na Focus NFe, e a "Versão
 * para o cliente" baixava o resumo em HTML, que abre mal no celular e no
 * WhatsApp. Agora "Baixar o PDF (pro cliente)" gera o PDF do mesmo recibo pelo
 * Electron (o gerador do #1126). Se não der, avisa e baixa o HTML (aviso,
 * nunca tranca: docs/licoes.md, item 33). Dados inventados (repositório público).
 */
import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

const buscarConteudoArquivo = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({
  baixarArquivo: vi.fn(),
  buscarConteudoArquivo: (...a: unknown[]) => buscarConteudoArquivo(...a),
}));
vi.mock("@/lib/reciboNotaFiscal", () => ({
  buscarOsDoRecibo: vi.fn().mockResolvedValue(null),
  buscarLojaDoRecibo: vi.fn().mockResolvedValue(null),
  // O valor guardado da NFS-e (#1142) não entra neste teste do botão de PDF.
  buscarValoresGuardadosDaNota: vi.fn().mockResolvedValue(null),
  comValoresGuardados: (os: unknown) => ({ os, valorDaNota: null }),
}));

import { NotaFiscalVisualModal } from "./NotaFiscalVisualModal";

const nfseGiap: NotaFiscalArquivo = {
  id: "nota-9",
  loja_id: "loja-1",
  tipo: "nfse",
  competencia: "2026-11-01",
  nome_arquivo: "nfse-12.xml",
  storage_path: "nfse/2026-11/x-nfse-12.xml",
  ordem_servico_id: null,
  operador_id: null,
  criado_em: "2026-11-20T12:00:00Z",
  origem: "automatica",
  numero: "12",
  chave_acesso: null,
  status: "autorizado",
  focus_nfe_ref: "os9-nfse-1763600000000",
};

const XML_GIAP = `<?xml version="1.0"?>
<nfeResposta><notaFiscal><numeroNota>12</numeroNota><numeroRps>3</numeroRps><codigoVerificacao>ABC123XYZ</codigoVerificacao><cnpjPrestador>00000000000000</cnpjPrestador><dataEmissaoNF>20/11/2026</dataEmissaoNF><statusEmissao>200</statusEmissao><messages>Nota emitida com sucesso!</messages></notaFiscal></nfeResposta>`;

interface Baixado {
  nome: string;
  conteudo: Blob;
}
let baixados: Baixado[] = [];
let blobs: Map<string, Blob>;
const gerarPdfDaNota = vi.fn();

beforeEach(() => {
  baixados = [];
  blobs = new Map();
  let n = 0;
  URL.createObjectURL = vi.fn((b: Blob) => {
    const url = `blob:teste-${n++}`;
    blobs.set(url, b);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    baixados.push({ nome: this.download, conteudo: blobs.get(this.getAttribute("href") ?? "")! });
  });
  buscarConteudoArquivo.mockResolvedValue(XML_GIAP);
  gerarPdfDaNota.mockReset();
  window.sakuraApp = { version: "0.0.0", salvarConexao: vi.fn(), gerarPdfDaNota };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.sakuraApp;
});

const BOTAO_PDF = /Baixar o PDF \(pro cliente\)/;

async function abrir() {
  renderizar(<NotaFiscalVisualModal arquivo={nfseGiap} onFechar={() => {}} />);
  return screen.findByRole("button", { name: BOTAO_PDF });
}

describe("Versão para o cliente: Baixar o PDF (pro cliente) (#1147)", () => {
  it("NFS-e da Giap: gera o PDF do recibo e salva NFS-e-<número>.pdf", async () => {
    gerarPdfDaNota.mockResolvedValue(new TextEncoder().encode("%PDF-1.4 recibo"));
    fireEvent.click(await abrir());

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("NFS-e-12.pdf");
    expect(baixados[0].conteudo.type).toBe("application/pdf");
    expect(gerarPdfDaNota).toHaveBeenCalledTimes(1);
    const html = gerarPdfDaNota.mock.calls[0][0] as string;
    expect(html).toContain("Recibo da NFS-e nº 12");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("não oferece mais o resumo em HTML como botão principal", async () => {
    await abrir();
    expect(screen.queryByRole("button", { name: /Baixar o resumo/ })).not.toBeInTheDocument();
  });

  it("se o PDF não sai, avisa e baixa o resumo em HTML", async () => {
    gerarPdfDaNota.mockRejectedValue(
      new Error("Error invoking remote method 'gerar-pdf-da-nota': Error: falhou ao gerar."),
    );
    fireEvent.click(await abrir());

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("nfse-12.html");
    expect(baixados[0].conteudo.type).toContain("text/html");
    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("Não deu pra gerar o PDF (falhou ao gerar)");
    expect(aviso).not.toHaveTextContent("Error invoking");
  });

  it("fora do programa instalado, avisa e baixa o HTML", async () => {
    delete window.sakuraApp;
    fireEvent.click(await abrir());

    await waitFor(() => expect(baixados).toHaveLength(1));
    expect(baixados[0].nome).toBe("nfse-12.html");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "o PDF só é gerado no programa instalado",
    );
  });
});

// @vitest-environment jsdom
/**
 * Defeito de 17/11 (loja em produção, #1113): a Focus NFe manda a nota da
 * NFC-e em HTML, e o "Baixar a nota (pro cliente)" salvava esse HTML com o
 * nome "NFC-e-<número>.pdf". O arquivo abria em branco no PC e no celular do
 * cliente. A nota baixada leva a extensão do que ela é.
 */
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderizar, screen } from "@/testes/tela";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

const buscarDanfeEmitida = vi.fn();
vi.mock("@/lib/notasFiscais", () => ({
  baixarArquivo: vi.fn(),
  buscarConteudoArquivo: vi.fn(),
  buscarDanfeEmitida: (...a: unknown[]) => buscarDanfeEmitida(...a),
}));

import { VerDanfeModal } from "./VerDanfeModal";

const nota: NotaFiscalArquivo = {
  id: "nota-1",
  loja_id: "loja-1",
  tipo: "nfe",
  competencia: "2026-11-01",
  nome_arquivo: "nfe-21.xml",
  storage_path: "nfe/2026-11/x-nfe-21.xml",
  ordem_servico_id: "os-1",
  operador_id: null,
  criado_em: "2026-11-17T12:00:00Z",
  origem: "automatica",
  numero: "21",
  chave_acesso: null,
  status: "autorizado",
  focus_nfe_ref: "os1-nfce-1763380000000",
};

let baixados: string[] = [];

beforeEach(() => {
  baixados = [];
  URL.createObjectURL = vi.fn(() => "blob:nota");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    baixados.push(this.download);
  });
});

afterEach(() => vi.restoreAllMocks());

async function baixarANota(conteudo: Blob) {
  buscarDanfeEmitida.mockResolvedValue(conteudo);
  renderizar(<VerDanfeModal arquivo={nota} onFechar={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /Baixar a nota/ }));
}

describe("Nota do cliente: Baixar a nota (pro cliente)", () => {
  it("NFC-e que a Focus manda em HTML é salva como .html, não como .pdf vazio", async () => {
    await baixarANota(new Blob(["<html><body>DANFE</body></html>"], { type: "text/html" }));
    expect(baixados).toEqual(["NFC-e-21.html"]);
  });

  it("nota em PDF continua saindo .pdf", async () => {
    await baixarANota(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    expect(baixados).toEqual(["NFC-e-21.pdf"]);
  });
});

import { describe, expect, it } from "vitest";
import { extensaoDaNota, motivoDanfeIndisponivel, nomeArquivoDanfe, podeVerDanfe } from "./danfe";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

function nota(campos: Partial<NotaFiscalArquivo> = {}): NotaFiscalArquivo {
  return {
    id: "nota-1",
    loja_id: "loja-1",
    tipo: "nfe",
    competencia: "2026-09-01",
    nome_arquivo: "nfe-123.xml",
    storage_path: "nfe/2026-09/x-nfe-123.xml",
    ordem_servico_id: "os-1",
    operador_id: null,
    criado_em: "2026-09-10T12:00:00Z",
    origem: "automatica",
    numero: "123",
    chave_acesso: null,
    status: "autorizado",
    focus_nfe_ref: "os12-nfce-1757500000000",
    ...campos,
  };
}

describe("motivoDanfeIndisponivel", () => {
  it("nota emitida pelo sistema, com referência guardada, pode reabrir o PDF", () => {
    expect(motivoDanfeIndisponivel(nota())).toBeNull();
    expect(podeVerDanfe(nota())).toBe(true);
  });

  it("nota enviada à mão explica que o PDF nunca passou pelo sistema", () => {
    const motivo = motivoDanfeIndisponivel(nota({ origem: "manual", focus_nfe_ref: null }));
    expect(motivo).toContain("enviada à mão");
    expect(podeVerDanfe(nota({ origem: "manual", focus_nfe_ref: null }))).toBe(false);
  });

  it("nota emitida antes da migration 0046 (sem referência) explica o motivo", () => {
    const motivo = motivoDanfeIndisponivel(nota({ focus_nfe_ref: null }));
    expect(motivo).toContain("versão do sistema anterior");
  });

  // Nota cancelada continua tendo PDF — o documento existe e a loja pode
  // precisar mostrar pra contabilidade o que foi cancelado.
  it("nota cancelada continua podendo abrir o PDF", () => {
    expect(motivoDanfeIndisponivel(nota({ status: "cancelado" }))).toBeNull();
  });
});

describe("nomeArquivoDanfe", () => {
  it("usa o número da nota, que é o que o cliente reconhece", () => {
    expect(nomeArquivoDanfe(nota())).toBe("NFC-e-123.pdf");
    expect(nomeArquivoDanfe(nota({ tipo: "nfse", numero: "15" }))).toBe("NFS-e-15.pdf");
  });

  it("sem número, cai na referência interna", () => {
    expect(nomeArquivoDanfe(nota({ numero: null }))).toBe("NFC-e-os12-nfce-1757500000000.pdf");
  });
});

// Defeito de 17/11 (loja em produção): a Focus NFe manda a nota da NFC-e em
// HTML, e o "Baixar a nota (pro cliente)" gravava esse HTML com o nome
// ".pdf". O arquivo (9 KB) abria em branco no PC e no celular do cliente.
describe("nota baixada com a extensão do que ela é", () => {
  it("nota em HTML (a NFC-e da Focus) sai .html, nunca .pdf", () => {
    expect(nomeArquivoDanfe(nota(), "text/html; charset=utf-8")).toBe("NFC-e-123.html");
    expect(extensaoDaNota("text/html")).toBe("html");
  });

  it("nota em PDF continua .pdf", () => {
    expect(nomeArquivoDanfe(nota({ tipo: "nfse", numero: "15" }), "application/pdf")).toBe(
      "NFS-e-15.pdf",
    );
  });

  it("sem tipo conhecido, continua .pdf como antes", () => {
    expect(nomeArquivoDanfe(nota())).toBe("NFC-e-123.pdf");
    expect(extensaoDaNota("application/octet-stream")).toBe("pdf");
  });
});

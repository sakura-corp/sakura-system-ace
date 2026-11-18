// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  extensaoDaNota,
  LIMITE_HTML_DO_PDF,
  motivoDanfeIndisponivel,
  motivoHtmlRecusadoParaPdf,
  nomeArquivoDanfe,
  nomeArquivoPdfDaNota,
  podeVerDanfe,
  semImagensDeFora,
} from "./danfe";
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

// #1115: o cliente abre PDF no celular e no WhatsApp; HTML, não. O PDF que o
// programa gera sai sempre ".pdf", com o número da nota, mesmo quando o
// arquivo da Focus era HTML.
describe("nome do PDF da nota pro cliente", () => {
  it("NFC-e e NFS-e saem com o número e .pdf", () => {
    expect(nomeArquivoPdfDaNota(nota({ numero: "21" }))).toBe("NFC-e-21.pdf");
    expect(nomeArquivoPdfDaNota(nota({ tipo: "nfse", numero: "7" }))).toBe("NFS-e-7.pdf");
  });

  it("sem número, cai na referência interna", () => {
    expect(nomeArquivoPdfDaNota(nota({ numero: null }))).toBe("NFC-e-os12-nfce-1757500000000.pdf");
  });
});

// O canal do Electron que gera o PDF só aceita o HTML já montado, como texto.
describe("motivoHtmlRecusadoParaPdf", () => {
  it("HTML em texto passa", () => {
    expect(motivoHtmlRecusadoParaPdf("<html><body>Nota</body></html>")).toBeNull();
  });

  it("o que não é texto é recusado", () => {
    for (const valor of [undefined, null, 42, { html: "<p>x</p>" }, ["<p>x</p>"], new Uint8Array(3)]) {
      expect(motivoHtmlRecusadoParaPdf(valor)).toMatch(/texto/);
    }
  });

  it("texto vazio é recusado", () => {
    expect(motivoHtmlRecusadoParaPdf("   ")).toMatch(/vazio/);
  });

  it("HTML grande demais é recusado", () => {
    expect(motivoHtmlRecusadoParaPdf("x".repeat(LIMITE_HTML_DO_PDF + 1))).toMatch(/grande/);
    expect(motivoHtmlRecusadoParaPdf("x".repeat(LIMITE_HTML_DO_PDF))).toBeNull();
  });
});

// A imagem quebrada no topo da prévia: o HTML da Focus aponta pra imagens de
// fora, que a regra de segurança da janela não carrega (e não vai carregar).
describe("semImagensDeFora", () => {
  it("tira a imagem que vem da internet e mantém o resto da nota", () => {
    const html =
      '<html><body><img src="https://exemplo.invalid/logo.png" alt="logo">' +
      '<img src="//exemplo.invalid/x.png"><p>Total R$ 10,00</p></body></html>';
    const limpo = semImagensDeFora(html);
    expect(limpo).not.toContain("exemplo.invalid");
    expect(limpo).not.toContain("<img");
    expect(limpo).toContain("Total R$ 10,00");
  });

  it("mantém a imagem que vem dentro do próprio arquivo (o QR code em data:)", () => {
    const html = '<html><body><img id="qr" src="data:image/png;base64,AAAA"></body></html>';
    expect(semImagensDeFora(html)).toContain('src="data:image/png;base64,AAAA"');
  });

  it("HTML sem imagem de fora volta igual por dentro", () => {
    const limpo = semImagensDeFora("<html><head><style>p{color:red}</style></head><body><p>Oi</p></body></html>");
    expect(limpo).toContain("<style>p{color:red}</style>");
    expect(limpo).toContain("<p>Oi</p>");
  });
});

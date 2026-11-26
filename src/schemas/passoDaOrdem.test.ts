import { describe, expect, it } from "vitest";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { ItemOS, OrdemServico, StatusOS } from "@/types/os";
import { indiceDoPasso, PASSOS_DA_OS, passoDaOrdem, podeVerPasso } from "./passoDaOrdem";

// O passo em que a OS parou sai SÓ do que já está gravado (#1088): o status
// da OS, as notas ligadas a ela e se o "carro pronto" já foi aberto no
// WhatsApp. Nada de coluna nova no banco.

function item(tipo: "peca" | "servico"): ItemOS {
  return { id: `i-${tipo}`, tipo, descricao: tipo, quantidade: 1, preco_unitario: 100 } as unknown as ItemOS;
}

function ordem(status: StatusOS, itens: ItemOS[] = [item("peca"), item("servico")]) {
  return { status, itens } as Pick<OrdemServico, "status" | "itens">;
}

function nota(tipo: "nfe" | "nfse", status = "autorizado"): NotaFiscalArquivo {
  return { id: `n-${tipo}`, tipo, status, origem: "automatica" } as NotaFiscalArquivo;
}

const AMBAS = [nota("nfe"), nota("nfse")];

describe("passoDaOrdem (#1088)", () => {
  it("orçamento e recusado não têm trilha (ainda não são OS)", () => {
    expect(passoDaOrdem(ordem("orcamento"), [], null)).toBeNull();
    expect(passoDaOrdem(ordem("recusado"), [], null)).toBeNull();
  });

  it("status desconhecido (banco mais novo): sem trilha", () => {
    expect(passoDaOrdem(ordem("arquivada" as StatusOS), [], null)).toBeNull();
  });

  it("aberta (em andamento): conferir peças e serviços", () => {
    expect(passoDaOrdem(ordem("em_andamento"), [], null)).toBe("conferir");
  });

  it("concluída (falta faturar): receber", () => {
    expect(passoDaOrdem(ordem("concluida"), [], null)).toBe("receber");
  });

  it("faturada sem nota: nota fiscal", () => {
    expect(passoDaOrdem(ordem("faturada"), [], null)).toBe("nota");
  });

  it("faturada com só uma das duas notas: continua na nota fiscal", () => {
    expect(passoDaOrdem(ordem("faturada"), [nota("nfe")], null)).toBe("nota");
  });

  it("nota cancelada não conta: volta pra nota fiscal", () => {
    expect(passoDaOrdem(ordem("faturada"), [nota("nfe"), nota("nfse", "cancelado")], null)).toBe("nota");
  });

  it("nota emitida (todas): garantia e avisar", () => {
    expect(passoDaOrdem(ordem("faturada"), AMBAS, null)).toBe("garantia");
  });

  it("OS só de serviço precisa só da NFS-e", () => {
    expect(passoDaOrdem(ordem("faturada", [item("servico")]), [nota("nfse")], null)).toBe("garantia");
  });

  it("com garantia (cliente já avisado): pronto", () => {
    expect(passoDaOrdem(ordem("faturada"), AMBAS, "2026-11-24T15:00:00Z")).toBe("pronto");
  });

  it("aviso aberto antes da nota não pula a nota", () => {
    expect(passoDaOrdem(ordem("faturada"), [], "2026-11-24T15:00:00Z")).toBe("nota");
  });

  it("aviso aberto com a OS ainda concluída não pula o receber", () => {
    expect(passoDaOrdem(ordem("concluida"), [], "2026-11-24T15:00:00Z")).toBe("receber");
  });

  it("faturada sem item nenhum não pede nota: vai pra garantia", () => {
    expect(passoDaOrdem(ordem("faturada", []), [], null)).toBe("garantia");
  });
});

describe("indiceDoPasso", () => {
  it("os 4 passos na ordem da conversa do balcão, e o pronto depois do último", () => {
    expect(PASSOS_DA_OS.map((p) => p.nome)).toEqual([
      "Conferir peças e serviços",
      "Receber",
      "Nota fiscal",
      "Garantia e avisar",
    ]);
    expect(indiceDoPasso("conferir")).toBe(0);
    expect(indiceDoPasso("receber")).toBe(1);
    expect(indiceDoPasso("nota")).toBe(2);
    expect(indiceDoPasso("garantia")).toBe(3);
    expect(indiceDoPasso("pronto")).toBe(4);
  });
});

describe("podeVerPasso", () => {
  it("o atual e os feitos podem ser vistos; os de depois, não", () => {
    expect(podeVerPasso("conferir", "receber")).toBe(true);
    expect(podeVerPasso("receber", "receber")).toBe(true);
    expect(podeVerPasso("nota", "receber")).toBe(false);
    expect(podeVerPasso("garantia", "receber")).toBe(false);
  });

  it("nota pendente não trava a garantia e o aviso (#1203)", () => {
    expect(podeVerPasso("garantia", "nota")).toBe(true);
    expect(podeVerPasso("pronto", "nota")).toBe(false);
  });
});

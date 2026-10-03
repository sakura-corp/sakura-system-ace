import { describe, expect, it } from "vitest";
import {
  agruparNotasPorOrdem,
  notasNecessarias,
  ordemEstaFinalizada,
  situacaoDaNota,
  situacaoFiscalOrdem,
} from "./situacaoFiscal";
import type { NotaFiscalArquivo, TipoNotaFiscal } from "@/types/notaFiscal";
import type { ItemOS } from "@/types/os";

function item(tipo: "peca" | "servico"): ItemOS {
  return {
    id: crypto.randomUUID(),
    ordem_servico_id: "os-1",
    tipo,
    peca_id: null,
    servico_id: null,
    tecnico_id: null,
    descricao: tipo,
    quantidade: 1,
    preco_unitario: 100,
    desconto: 0,
  };
}

function nota(
  tipo: TipoNotaFiscal,
  status: string | null = "autorizado",
  ordemId = "os-1",
): NotaFiscalArquivo {
  return {
    id: crypto.randomUUID(),
    loja_id: "loja-1",
    tipo,
    competencia: "2026-08-01",
    nome_arquivo: "nota.xml",
    storage_path: "x",
    ordem_servico_id: ordemId,
    operador_id: null,
    criado_em: "2026-08-01",
    origem: "automatica",
    numero: "1",
    chave_acesso: null,
    status,
    focus_nfe_ref: "ref",
  };
}

describe("notasNecessarias", () => {
  it("OS só com peça precisa só de NFC-e", () => {
    expect(notasNecessarias([item("peca")])).toEqual({ nfce: true, nfse: false });
  });

  it("OS só com serviço precisa só de NFS-e", () => {
    expect(notasNecessarias([item("servico")])).toEqual({ nfce: false, nfse: true });
  });

  it("OS com peça e serviço precisa das duas", () => {
    expect(notasNecessarias([item("peca"), item("servico")])).toEqual({
      nfce: true,
      nfse: true,
    });
  });
});

describe("situacaoFiscalOrdem", () => {
  it("aponta a nota que ainda falta pelo nome que aparece na tela", () => {
    const situacao = situacaoFiscalOrdem([item("peca"), item("servico")], [nota("nfe")]);
    expect(situacao.temNfce).toBe(true);
    expect(situacao.pendentes).toEqual(["NFS-e"]);
    expect(situacao.completa).toBe(false);
  });

  it("fica completa quando todas as notas necessárias saíram", () => {
    const situacao = situacaoFiscalOrdem(
      [item("peca"), item("servico")],
      [nota("nfe"), nota("nfse")],
    );
    expect(situacao.pendentes).toEqual([]);
    expect(situacao.completa).toBe(true);
  });

  it("nota cancelada volta a contar como pendente", () => {
    const situacao = situacaoFiscalOrdem([item("peca")], [nota("nfe", "cancelado")]);
    expect(situacao.temNfce).toBe(false);
    expect(situacao.pendentes).toEqual(["NFC-e"]);
  });

  // Upload manual de XML não guarda status; o que importa é a OS ter a nota.
  it("nota enviada à mão (sem status) conta como emitida", () => {
    const situacao = situacaoFiscalOrdem([item("servico")], [nota("nfse", null)]);
    expect(situacao.completa).toBe(true);
  });

  it("nota de um tipo não cobre a necessidade do outro", () => {
    const situacao = situacaoFiscalOrdem([item("peca")], [nota("nfse")]);
    expect(situacao.pendentes).toEqual(["NFC-e"]);
  });

  it("OS sem item nenhum não conta como completa", () => {
    expect(situacaoFiscalOrdem([], []).completa).toBe(false);
  });
});

describe("ordemEstaFinalizada", () => {
  it("só é finalizada depois de faturada", () => {
    const situacao = situacaoFiscalOrdem([item("peca")], [nota("nfe")]);
    expect(ordemEstaFinalizada({ status: "concluida" }, situacao)).toBe(false);
    expect(ordemEstaFinalizada({ status: "faturada" }, situacao)).toBe(true);
  });

  it("faturada com nota faltando ainda não é finalizada", () => {
    const situacao = situacaoFiscalOrdem([item("peca"), item("servico")], [nota("nfe")]);
    expect(ordemEstaFinalizada({ status: "faturada" }, situacao)).toBe(false);
  });
});

describe("agruparNotasPorOrdem", () => {
  it("junta as notas por OS e ignora nota sem OS vinculada", () => {
    const semOrdem = { ...nota("nfe"), ordem_servico_id: null };
    const grupos = agruparNotasPorOrdem([
      nota("nfe", "autorizado", "os-1"),
      nota("nfse", "autorizado", "os-1"),
      nota("nfe", "autorizado", "os-2"),
      semOrdem,
    ]);
    expect(grupos.get("os-1")).toHaveLength(2);
    expect(grupos.get("os-2")).toHaveLength(1);
    expect(grupos.size).toBe(2);
  });
});

describe("situacaoDaNota", () => {
  it("nota emitida pelo sistema e autorizada: Autorizada", () => {
    expect(situacaoDaNota({ origem: "automatica", status: "autorizado" })).toEqual({
      tom: "autorizada",
      rotulo: "Autorizada",
    });
  });

  it("nota cancelada: Cancelada, venha de onde vier", () => {
    expect(situacaoDaNota({ origem: "automatica", status: "cancelado" }).tom).toBe("cancelada");
    expect(situacaoDaNota({ origem: "manual", status: "cancelado" }).tom).toBe("cancelada");
  });

  it("XML enviado à mão: Enviada à mão, mesmo sem status", () => {
    expect(situacaoDaNota({ origem: "manual", status: null })).toEqual({
      tom: "manual",
      rotulo: "Enviada à mão",
    });
  });

  it("XML enviado à mão nunca aparece como Autorizada", () => {
    // O sistema só guardou o arquivo: não sabe o que a SEFAZ disse dele.
    expect(situacaoDaNota({ origem: "manual", status: "autorizado" }).tom).toBe("manual");
  });

  it("outro status da Focus aparece escrito como veio, sem o sublinhado", () => {
    expect(situacaoDaNota({ origem: "automatica", status: "processando_autorizacao" })).toEqual({
      tom: "outra",
      rotulo: "Processando autorizacao",
    });
  });

  it("nota do sistema sem status nenhum: Sem situação, nunca uma etiqueta vazia", () => {
    expect(situacaoDaNota({ origem: "automatica", status: null }).rotulo).toBe("Sem situação");
    expect(situacaoDaNota({ origem: "automatica", status: "  " }).rotulo).toBe("Sem situação");
  });
});

import { describe, expect, it } from "vitest";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { fraseDaEscolha, rotuloDaNota } from "./notaDoCliente";

const nota = (id: string, tipo: "nfe" | "nfse", numero: string | null = null) =>
  ({ id, tipo, numero, origem: "automatica", status: "autorizado" }) as NotaFiscalArquivo;

describe("a frase da escolha da nota do cliente (certa em cada caso)", () => {
  it("OS com uma das peças e uma do serviço", () => {
    expect(fraseDaEscolha(false, [nota("a", "nfe"), nota("b", "nfse")])).toBe(
      "Esta OS tem duas notas: a das peças (NFC-e) e a do serviço (NFS-e). Qual você quer ver, imprimir ou mandar?",
    );
  });

  it("venda com duas notas das peças", () => {
    expect(fraseDaEscolha(true, [nota("a", "nfe"), nota("b", "nfe")])).toBe(
      "Esta venda tem duas notas das peças (NFC-e). Qual você quer ver, imprimir ou mandar?",
    );
  });

  it("OS com duas do serviço", () => {
    expect(fraseDaEscolha(false, [nota("a", "nfse"), nota("b", "nfse")])).toBe(
      "Esta OS tem duas notas do serviço (NFS-e). Qual você quer ver, imprimir ou mandar?",
    );
  });

  it("OS com duas das peças e uma do serviço", () => {
    expect(fraseDaEscolha(false, [nota("a", "nfe"), nota("b", "nfe"), nota("c", "nfse")])).toBe(
      "Esta OS tem três notas: duas das peças (NFC-e) e a do serviço (NFS-e). Qual você quer ver, imprimir ou mandar?",
    );
  });
});

describe("o nome do botão de cada nota", () => {
  it("duas do mesmo tipo levam o número, pra não sair dois botões iguais", () => {
    const notas = [nota("a", "nfe", "101"), nota("b", "nfe", "102")];
    expect(rotuloDaNota(notas[0], notas)).toBe("Nota das peças (NFC-e) nº 101");
    expect(rotuloDaNota(notas[1], notas)).toBe("Nota das peças (NFC-e) nº 102");
  });

  it("uma de cada tipo: só o nome", () => {
    const notas = [nota("a", "nfe", "101"), nota("b", "nfse", "7")];
    expect(rotuloDaNota(notas[1], notas)).toBe("Nota do serviço (NFS-e)");
  });
});

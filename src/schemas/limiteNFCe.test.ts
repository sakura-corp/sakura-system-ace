import { describe, expect, it } from "vitest";
import { avisoLimiteNFCeSemDestinatario, LIMITE_NFCE_SEM_DESTINATARIO } from "./limiteNFCe";

describe("avisoLimiteNFCeSemDestinatario", () => {
  it("o limite é R$ 10.000", () => {
    expect(LIMITE_NFCE_SEM_DESTINATARIO).toBe(10000);
  });

  it("abaixo do limite, sem cliente identificado: nada", () => {
    expect(avisoLimiteNFCeSemDestinatario(9999.99, false)).toBeNull();
  });

  it("no limite, sem cliente identificado: avisa", () => {
    expect(avisoLimiteNFCeSemDestinatario(10000, false)).toContain("R$ 10.000");
  });

  it("acima do limite, sem cliente identificado: avisa", () => {
    expect(avisoLimiteNFCeSemDestinatario(15000.5, false)).toBe(
      "Esta nota é de R$ 10.000 ou mais e vai sair sem CPF/CNPJ do cliente. A partir desse valor a SEFAZ costuma exigir o cliente identificado: cadastre o documento dele antes de emitir.",
    );
  });

  it("acima do limite, com cliente identificado: nada", () => {
    expect(avisoLimiteNFCeSemDestinatario(15000.5, true)).toBeNull();
  });

  it("abaixo do limite, com cliente identificado: nada", () => {
    expect(avisoLimiteNFCeSemDestinatario(500, true)).toBeNull();
  });
});

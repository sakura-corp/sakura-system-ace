import { describe, expect, it } from "vitest";
import { pixFormSchema } from "./pixForm";

describe("pixFormSchema (#456)", () => {
  it("aceita uma chave, um nome e uma cidade de verdade", () => {
    const r = pixFormSchema.safeParse({
      chave: "pix-teste@exemplo.com.br",
      nome_recebedor: "Loja Exemplo",
      cidade_recebedor: "São Carlos",
    });
    expect(r.success).toBe(true);
  });

  it("recusa nome ou cidade que somem no QR (só símbolo ou emoji), em vez de o Pix nunca aparecer", () => {
    for (const [nome, cidade] of [
      ["🚗🚗", "Araraquara"],
      ["Loja Exemplo", "★★★"],
    ]) {
      const r = pixFormSchema.safeParse({
        chave: "pix-teste@exemplo.com.br",
        nome_recebedor: nome,
        cidade_recebedor: cidade,
      });
      expect(r.success).toBe(false);
    }
  });
});

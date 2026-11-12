import { describe, expect, it } from "vitest";
import { contatoContabilidadeSchema } from "./contatoContabilidade";

const ok = (v: object) => contatoContabilidadeSchema.safeParse({ nome: "Marta", whatsapp: "", email: "", ...v });

describe("contatoContabilidadeSchema (#383)", () => {
  it("exige o nome", () => {
    const r = ok({ nome: "  ", whatsapp: "11999990000" });
    expect(r.success).toBe(false);
  });
  it("exige WhatsApp ou e-mail", () => {
    const r = ok({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Informe o WhatsApp ou o e-mail.");
  });
  it("aceita só e-mail e só WhatsApp", () => {
    expect(ok({ email: "marta@exemplo.com" }).success).toBe(true);
    expect(ok({ whatsapp: "(11) 90000-0000" }).success).toBe(true);
  });
  it("WhatsApp precisa ter 10 a 13 dígitos", () => {
    expect(ok({ whatsapp: "123456789" }).success).toBe(false);
    expect(ok({ whatsapp: "1234567890" }).success).toBe(true);
    expect(ok({ whatsapp: "5511900000000" }).success).toBe(true);
    expect(ok({ whatsapp: "55119000000001" }).success).toBe(false);
  });
  it("recusa o WhatsApp que o Abrir conversa não abriria", () => {
    // 12 dígitos sem o 55: o botão recusa (não é DDD + 8/9 dígitos, nem 55 + isso).
    const r = ok({ whatsapp: "(16) 99123-45678" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/DDD/);
    expect(ok({ whatsapp: "(16) 99123-4567" }).success).toBe(true);
    // DDD que não existe (10 dígitos começando em 05).
    expect(ok({ whatsapp: "0512345678" }).success).toBe(false);
  });
  it("e-mail inválido é recusado", () => {
    expect(ok({ email: "sem-arroba" }).success).toBe(false);
  });
});

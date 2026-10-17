import { describe, expect, it, vi } from "vitest";
import { CHEFES, linkParaComecar, textoDaTarefa } from "./comecarComClaude";
import { copiarTexto } from "./copiarTexto";

describe("copiarTexto", () => {
  it("copia o texto certo e diz que copiou", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await copiarTexto("olá #12", { writeText })).toBe("copiado");
    expect(writeText).toHaveBeenCalledExactlyOnceWith("olá #12");
  });

  it("cai no plano B quando a área de transferência recusa", async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException("negado", "NotAllowedError"));
    expect(await copiarTexto("x", { writeText })).toBe("plano-b");
  });

  it("cai no plano B quando a API não existe", async () => {
    expect(await copiarTexto("x", undefined)).toBe("plano-b");
    expect(await copiarTexto("x", {})).toBe("plano-b");
  });
});

describe("texto copiado = texto do link", () => {
  const decodificado = (link: string) => new URL(link).searchParams.get("prompt");

  it.each([...CHEFES, undefined, "chefe-que-nao-existe"])("chefe %s: o prompt do link é o texto que o botão copia", (chefe) => {
    const link = linkParaComecar(454, chefe);
    expect(link).toBeDefined();
    expect(decodificado(link!)).toBe(textoDaTarefa(454, chefe));
  });

  it("número inválido não gera texto", () => {
    for (const n of [0, -1, 1.5, NaN, "7", undefined]) expect(textoDaTarefa(n)).toBeUndefined();
  });
});

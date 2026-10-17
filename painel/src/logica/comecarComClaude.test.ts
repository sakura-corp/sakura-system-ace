import { describe, expect, it } from "vitest";
import { CHEFES, LIMITE_DO_TEXTO, chefeDaEtiqueta, linkParaComecar, numeroValido, textoParaOClaude } from "./comecarComClaude";
import { linkDoClaude } from "./link";

const parametros = (link: string) => new URL(link).searchParams;

describe("linkParaComecar", () => {
  it("monta o link: base, prompt e repositório, sem environment", () => {
    const link = linkParaComecar(354, "frontend")!;
    expect(link.startsWith("https://claude.ai/code?prompt=")).toBe(true);
    const p = parametros(link);
    expect(p.get("repositories")).toBe("sakura-corp/sakura-system-ace");
    expect(p.has("environment")).toBe(false);
    expect(p.get("prompt")).toContain("Tarefa #354 (https://github.com/sakura-corp/sakura-system-ace/issues/354)");
    expect(p.get("prompt")).toContain("chefe de frontend");
    expect(p.get("prompt")).toContain("`chefe-frontend`");
    expect(linkDoClaude(link)).toBe(link);
  });

  it("codifica: nada de espaço, crase ou acento cru no link, e o texto volta inteiro", () => {
    const link = linkParaComecar(7, "seguranca")!;
    expect(link).not.toMatch(/[ `ãç\n]/);
    expect(parametros(link).get("prompt")).toBe(textoParaOClaude(7, "seguranca"));
  });

  it("cabe no limite, mesmo com o maior número aceito", () => {
    for (const c of CHEFES) expect(textoParaOClaude(999_999, c).length).toBeLessThanOrEqual(LIMITE_DO_TEXTO);
    expect(textoParaOClaude(999_999).length).toBeLessThanOrEqual(LIMITE_DO_TEXTO);
  });

  it("número inválido não gera link", () => {
    for (const n of [0, -1, 1.5, NaN, Infinity, 1_000_000, "354", "1&x=2", null, undefined]) {
      expect(linkParaComecar(n, "backend")).toBeUndefined();
    }
    expect(numeroValido(354)).toBe(true);
  });

  it("sem chefe ou com chefe desconhecido: texto geral, que manda perguntar à pessoa", () => {
    for (const c of [undefined, "", "gerente", "Frontend", "frontend&environment=x"]) {
      const texto = parametros(linkParaComecar(12, c)!).get("prompt")!;
      expect(texto).toContain("pergunte à pessoa");
      expect(texto).not.toContain("Você é o chefe de");
      expect(parametros(linkParaComecar(12, c)!).has("environment")).toBe(false);
    }
  });
});

describe("chefeDaEtiqueta", () => {
  it("só as 5 funções conhecidas", () => {
    expect(CHEFES.map((c) => chefeDaEtiqueta(`chefe:${c}`))).toEqual([...CHEFES]);
    for (const e of ["chefe:gerente", "chefe:", "chefe:Frontend", "leva-0", "chefe:frontend ", "x-chefe:frontend"]) {
      expect(chefeDaEtiqueta(e)).toBeUndefined();
    }
  });
});

describe("linkDoClaude", () => {
  it("só claude.ai/code", () => {
    expect(linkDoClaude("https://claude.ai/code?prompt=a")).toBeDefined();
    for (const u of ["https://claude.ai.mal.exemplo/code?x", "https://mal.exemplo/https://claude.ai/code?x", "javascript:alert(1)", "http://claude.ai/code?x", undefined]) {
      expect(linkDoClaude(u)).toBeUndefined();
    }
  });
});

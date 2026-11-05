// As regras de lint feitas pra barrar bugs que já aconteceram (o `??` no
// `import.meta.env` e o `window.prompt()`, #873) só valem se reprovam o que
// devem e deixam passar o que é certo. Este teste roda o ESLint de verdade,
// com o `eslint.config.js` do projeto, em pedacinhos de código.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();

async function regrasQueReclamam(codigo, arquivo = "src/__exemplo.ts") {
  const [resultado] = await eslint.lintText(codigo, { filePath: arquivo });
  return resultado.messages.filter((m) => m.severity === 2).map((m) => m.ruleId);
}

const ENV_DEVE_REPROVAR = [
  'export const a = import.meta.env.VITE_X ?? "y";',
  'export const a = import.meta.env["VITE_X"] ?? "y";',
  'export const a = import.meta["env"].VITE_X ?? "y";',
  'export const a = (import.meta.env.VITE_X as string) ?? "y";',
  'export const a = (import.meta.env.VITE_X as unknown as string) ?? "y";',
  'export const a = import.meta.env.VITE_X!.trim() ?? "y";',
  'export const a = import.meta.env.VITE_X?.trim() ?? "y";',
  'export const a = import.meta.env?.VITE_X ?? "y";',
  'import.meta.env.VITE_X ??= "y";',
  'const { VITE_X = "y" } = import.meta.env; export const a = VITE_X;',
  'const { VITE_X = "y" } = import.meta.env as Record<string, string>; export const a = VITE_X;',
  'let VITE_X: string; ({ VITE_X = "y" } = import.meta.env); export const a = VITE_X;',
  'export function f({ VITE_X = "y" } = import.meta.env) { return VITE_X; }',
];

const ENV_DEVE_PASSAR = [
  'export const a = import.meta.env.VITE_X || "y";',
  'export const a = (import.meta.env.VITE_X || undefined) ?? "y";',
  'const cfg: Record<string, string> = {}; export const a = cfg[import.meta.env.MODE] ?? "y";',
  'const m = new Map<string, string>(); export const a = m.get(import.meta.env.MODE) ?? "y";',
  'export const a = (import.meta.env.DEV ? "x" : undefined) ?? "y";',
  'export const a = (null as string | null) ?? "y";',
  'const { VITE_X } = import.meta.env; export const a = VITE_X || "y";',
  'const o: { X?: string } = {}; const { X = "y" } = o; export const a = X;',
];

describe("lint: ?? no import.meta.env", () => {
  it.each(ENV_DEVE_REPROVAR)("reprova: %s", async (codigo) => {
    expect(await regrasQueReclamam(codigo)).toContain("sakura/env-sem-nullish");
  });

  it.each(ENV_DEVE_PASSAR)("deixa passar: %s", async (codigo) => {
    expect(await regrasQueReclamam(codigo)).toEqual([]);
  });

  it("vale também nos dois testes que podem cortar o dia em UTC", async () => {
    const codigo =
      'export const a = import.meta.env.VITE_X ?? "y";\nexport const b = new Date().toISOString().slice(0, 10);\n';
    expect(await regrasQueReclamam(codigo, "src/lib/datas.test.ts")).toEqual(["sakura/env-sem-nullish"]);
  });
});

describe("lint: prompt()", () => {
  it.each([
    'export const a = window.prompt("x");',
    'export const a = globalThis.prompt("x");',
    'export const a = self.prompt("x");',
    'export const a = prompt("x");',
  ])("reprova: %s", async (codigo) => {
    const regras = await regrasQueReclamam(codigo);
    expect(regras.some((r) => r === "no-restricted-properties" || r === "no-restricted-globals")).toBe(true);
  });

  it("deixa passar um campo chamado prompt", async () => {
    expect(await regrasQueReclamam('const o = { prompt: "x" }; export const a = o.prompt;')).toEqual([]);
  });
});

describe("lint: corte de dia em UTC continua valendo", () => {
  it("reprova num arquivo comum e passa nos dois testes da exceção", async () => {
    const codigo = "export const d = new Date().toISOString().slice(0, 10);";
    expect(await regrasQueReclamam(codigo)).toContain("no-restricted-syntax");
    expect(await regrasQueReclamam(codigo, "src/schemas/comissoes.test.ts")).toEqual([]);
  });
});

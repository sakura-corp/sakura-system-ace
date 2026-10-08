// A promessa deste teste: o botão de faxina NUNCA apaga trabalho que não
// entrou na `main`. Apagar branch mesclada não perde nada; apagar a errada
// perde o que só existia nela.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OBSOLETAS_APROVADAS,
  classificar,
  // @ts-expect-error — script utilitário em .mjs puro, sem tipos
} from "./apagar-branches-velhas.mjs";

const NA_MAIN = new Set(["aaa"]);
const jaNaMain = (ponta: string) => NA_MAIN.has(ponta);

function decide(
  branches: Array<{ nome: string; ponta: string }>,
  prs: Array<{ branch: string; ponta: string; aberto: boolean; mesclado: boolean }>,
) {
  const { apagar, guardar } = classificar(branches, prs, jaNaMain);
  return {
    apagar: apagar.map((b: { nome: string }) => b.nome),
    guardar: guardar.map((b: { nome: string }) => b.nome),
  };
}

describe("classificar", () => {
  it("apaga a que já faz parte da main", () => {
    expect(decide([{ nome: "x", ponta: "aaa" }], []).apagar).toEqual(["x"]);
  });

  it("apaga a que está exatamente onde o PR mesclado a deixou", () => {
    const r = decide(
      [{ nome: "x", ponta: "bbb" }],
      [{ branch: "x", ponta: "bbb", aberto: false, mesclado: true }],
    );
    expect(r.apagar).toEqual(["x"]);
  });

  it("guarda a que ganhou commit depois do PR mesclado (o caso da rodinha)", () => {
    const r = decide(
      [{ nome: "x", ponta: "ccc" }],
      [{ branch: "x", ponta: "bbb", aberto: false, mesclado: true }],
    );
    expect(r.guardar).toEqual(["x"]);
  });

  it("guarda a que tem PR aberto, mesmo já tendo outro mesclado", () => {
    const r = decide(
      [{ nome: "x", ponta: "aaa" }],
      [
        { branch: "x", ponta: "zzz", aberto: false, mesclado: true },
        { branch: "x", ponta: "aaa", aberto: true, mesclado: false },
      ],
    );
    expect(r.guardar).toEqual(["x"]);
  });

  it("guarda a que tem PR fechado sem mesclar, e a que nunca teve PR", () => {
    const r = decide(
      [
        { nome: "fechada", ponta: "ddd" },
        { nome: "sem-pr", ponta: "eee" },
      ],
      [{ branch: "fechada", ponta: "ddd", aberto: false, mesclado: false }],
    );
    expect(r.guardar).toEqual(["fechada", "sem-pr"]);
  });

  it("nunca apaga a main nem a da rodinha, mesmo parecendo mescladas", () => {
    const r = decide(
      [
        { nome: "main", ponta: "aaa" },
        { nome: "claude/kind-euler-8s461d", ponta: "aaa" },
      ],
      [],
    );
    expect(r.apagar).toEqual([]);
  });

  it("as duas de 27/07 só saem se ainda estiverem na ponta que ela viu", () => {
    const [[nome, ponta]] = [...OBSOLETAS_APROVADAS.entries()];
    expect(decide([{ nome, ponta }], []).apagar).toEqual([nome]);
    expect(decide([{ nome, ponta: "mexeram-depois" }], []).guardar).toEqual([nome]);
  });
});

describe("workflow", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/apagar-branches-velhas.yml", import.meta.url),
    "utf8",
  );

  // Apagar branch é ela quem decide: só na mão, e com a aprovação dela.
  it("só roda na mão, no cofre lojas, e usa este script", () => {
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).not.toMatch(/^\s*(push|schedule|pull_request):/m);
    expect(workflow).toMatch(/^\s+environment: lojas$/m);
    expect(workflow).toMatch(/node scripts\/apagar-branches-velhas\.mjs/);
  });

  // Sem a história inteira, uma branch mesclada há tempo não pareceria
  // "parte da main", e ficaria; pior seria o contrário, que o teste acima cobre.
  it("baixa a história inteira", () => {
    expect(workflow).toMatch(/fetch-depth: 0/);
  });
});

// A promessa deste teste em uma frase: passou do limite, o aviso aparece UMA vez por
// sessão; abaixo do limite ou com entrada estranha, o gatilho fica calado e não trava nada.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  passouDoLimite,
  principal,
  tokensDaConversa,
  // @ts-expect-error — script utilitário em .mjs puro, sem tipos
} from "./aviso-conversa-comprida.mjs";

const pastas: string[] = [];
afterEach(() => {
  while (pastas.length) rmSync(pastas.pop()!, { recursive: true, force: true });
});
function pasta() {
  const p = mkdtempSync(join(tmpdir(), "aviso-"));
  pastas.push(p);
  return p;
}

const resposta = (entrada: number, cache: number) =>
  JSON.stringify({
    type: "assistant",
    message: { usage: { input_tokens: entrada, cache_read_input_tokens: cache, cache_creation_input_tokens: 0 } },
  });

function historico(tokens: number) {
  const arq = join(pasta(), "h.jsonl");
  writeFileSync(arq, [JSON.stringify({ type: "user" }), resposta(10, tokens - 10), "{lixo", ""].join("\n"));
  return arq;
}

describe("tokensDaConversa", () => {
  it("lê a última resposta do Claude e soma entrada + cache", () => {
    const texto = [resposta(5, 1000), JSON.stringify({ type: "user" }), resposta(7, 9000)].join("\n");
    expect(tokensDaConversa(texto)).toBe(9007);
  });
  it("devolve null sem resposta ou com lixo", () => {
    expect(tokensDaConversa("")).toBeNull();
    expect(tokensDaConversa("{lixo\n[1]")).toBeNull();
  });
});

describe("passouDoLimite", () => {
  const cfg = { limitePercentual: 35, janelaTokens: 200_000 };
  it("só a partir do limite", () => {
    expect(passouDoLimite(69_999, cfg)).toBe(false);
    expect(passouDoLimite(70_000, cfg)).toBe(true);
    expect(passouDoLimite(null, cfg)).toBe(false);
  });
});

describe("principal", () => {
  it("avisa uma vez só por sessão", () => {
    const marcas = pasta();
    const entrada = { session_id: "abc", transcript_path: historico(100_000) };
    const a = principal({ entrada, pastaDeMarcas: marcas, janelaTokens: 200_000 });
    expect(a).toContain("/fechar");
    expect(principal({ entrada, pastaDeMarcas: marcas, janelaTokens: 200_000 })).toBeNull();
    // outra sessão ainda recebe o seu aviso
    expect(principal({ entrada: { ...entrada, session_id: "def" }, pastaDeMarcas: marcas, janelaTokens: 200_000 })).toContain("/fechar");
  });
  it("fica calado abaixo do limite e não gasta o aviso", () => {
    const marcas = pasta();
    const curto = { session_id: "abc", transcript_path: historico(10_000) };
    expect(principal({ entrada: curto, pastaDeMarcas: marcas, janelaTokens: 200_000 })).toBeNull();
    const comprido = { session_id: "abc", transcript_path: historico(100_000) };
    expect(principal({ entrada: comprido, pastaDeMarcas: marcas, janelaTokens: 200_000 })).not.toBeNull();
  });
  it("entrada estranha: sai calado, sem estourar", () => {
    const marcas = pasta();
    expect(principal({ entrada: null, pastaDeMarcas: marcas, janelaTokens: 200_000 })).toBeNull();
    expect(principal({ entrada: { session_id: "x", transcript_path: "/nao/existe" }, pastaDeMarcas: marcas, janelaTokens: 200_000 })).toBeNull();
  });
});

describe("rodando como o Claude Code roda (processo, entrada pelo stdin)", () => {
  it("com o limite baixado: aparece na 1ª e não na 2ª", () => {
    const marcas = pasta();
    const entrada = JSON.stringify({ session_id: "proc", transcript_path: historico(30_000) });
    const rodar = () =>
      spawnSync("node", ["scripts/aviso-conversa-comprida.mjs"], {
        input: entrada,
        encoding: "utf8",
        env: { ...process.env, SSACE_AVISO_LIMITE_PERCENTUAL: "10", SSACE_AVISO_JANELA_TOKENS: "200000", SSACE_AVISO_PASTA: marcas },
      });
    const primeira = rodar();
    expect(primeira.status).toBe(0);
    expect(JSON.parse(primeira.stdout).hookSpecificOutput.additionalContext).toContain("/fechar");
    expect(rodar().stdout).toBe("");
  });
});

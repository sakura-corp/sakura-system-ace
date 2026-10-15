// A promessa deste teste em uma frase: chave com formato conhecido NUNCA sai
// escondida, e "cara de senha" NUNCA tranca o trabalho.
//
// As credenciais de mentira são montadas aqui em tempo de execução (pedaço + pedaço),
// de propósito: escritas inteiras no arquivo, o `gitleaks` do CI as acharia, com razão.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  analisarDiff,
  classificarComando,
  // @ts-expect-error — script utilitário em .mjs puro, sem tipos
} from "./checar-segredos.mjs";

const chaveAnthropic = () => "sk-ant-" + "a1b2c3d4e5".repeat(4);
const chaveSupabase = () => "sb_secret_" + "Z9y8X7w6V5".repeat(3);

/** Diff mínimo com uma linha adicionada num arquivo. */
function diffCom(arquivo: string, linha: string) {
  return `diff --git a/${arquivo} b/${arquivo}\n--- a/${arquivo}\n+++ b/${arquivo}\n@@ -0,0 +7 @@\n+${linha}\n`;
}

describe("classificarComando", () => {
  it("reconhece commit e push, inclusive no meio de uma sequência", () => {
    expect(classificarComando("git commit -m x").commit).toBe(true);
    expect(classificarComando("git push -u origin main").push).toBe(true);
    expect(classificarComando("git add . && git commit -m x").adiciona).toBe(true);
    expect(classificarComando("git -C /tmp/repo commit -m x").commit).toBe(true);
    expect(classificarComando("git commit -am x").adiciona).toBe(true);
  });

  // `echo git push` ainda conta como push, de propósito: errar pra esse lado só faz o
  // gatilho olhar o que está pendente; errar pro outro deixaria a chave passar.
  it("não confunde com outros comandos", () => {
    for (const c of ["git status", "git log --grep commit", "git diff --cached", "npm run lint"]) {
      const t = classificarComando(c);
      expect(t.commit || t.push, c).toBe(false);
    }
  });
});

describe("analisarDiff: o que barra", () => {
  it("barra as chaves do projeto e diz o arquivo e a linha, sem repetir a chave", () => {
    const a = analisarDiff(diffCom("src/x.ts", `const k = "${chaveAnthropic()}";`));
    expect(a.barrar).toHaveLength(1);
    expect(a.barrar[0]).toMatchObject({ arquivo: "src/x.ts", linha: 7, regra: "anthropic-chave-api" });
    expect(JSON.stringify(a)).not.toContain(chaveAnthropic());

    expect(analisarDiff(diffCom("a.md", chaveSupabase())).barrar[0].regra).toBe("supabase-chave-secreta");
  });

  it("barra chave privada e arquivo de certificado, mesmo binário", () => {
    expect(analisarDiff(diffCom("k.txt", "-----BEGIN RSA PRIVATE KEY-----")).barrar).toHaveLength(1);
    for (const nome of ["certificado.pfx", "pasta/empresa.P12", "supabase/conexao.json"]) {
      const binario = `diff --git a/${nome} b/${nome}\nnew file mode 100644\nBinary files /dev/null and b/${nome} differ\n`;
      expect(analisarDiff(binario).barrar[0]?.regra, nome).toBe("arquivo-de-certificado");
    }
  });

  it("só olha o que foi ADICIONADO: apagar a chave não barra", () => {
    const removida = `diff --git a/x.ts b/x.ts\n@@ -3 +3,0 @@\n-const k = "${chaveAnthropic()}";\n`;
    expect(analisarDiff(removida).barrar).toHaveLength(0);
  });

  it("respeita as mesmas liberações do .gitleaks.toml", () => {
    expect(analisarDiff(diffCom("package-lock.json", chaveAnthropic())).barrar).toHaveLength(0);
    expect(analisarDiff(diffCom("src/t.ts", `"${chaveAnthropic()}" // naoPodeVazar`)).barrar).toHaveLength(0);
  });
});

describe("analisarDiff: o que só avisa", () => {
  it("avisa de 'senha: abc123' e não barra", () => {
    const a = analisarDiff(diffCom("x.md", "senha: abc123"));
    expect(a.barrar).toHaveLength(0);
    expect(a.avisar).toEqual([{ arquivo: "x.md", linha: 7 }]);
  });

  it("não avisa de código comum nem de valor de exemplo", () => {
    for (const l of ["token: string;", "senha: process.env.SENHA1", 'const csc = "<seu-csc-1>"', "password=${SENHA1}"]) {
      expect(analisarDiff(diffCom("x.ts", l)).avisar, l).toHaveLength(0);
    }
  });
});

describe("o gatilho de ponta a ponta", () => {
  const pastas: string[] = [];
  afterEach(() => {
    for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true });
  });

  /** Repositório de mentira com um arquivo preparado; roda o gatilho como o Claude roda. */
  function rodar(conteudo: string, comando: string) {
    const pasta = mkdtempSync(join(tmpdir(), "segredos-"));
    pastas.push(pasta);
    const git = (...args: string[]) => spawnSync("git", args, { cwd: pasta });
    git("init", "-q");
    writeFileSync(join(pasta, "arquivo.txt"), conteudo);
    git("add", "arquivo.txt");
    return spawnSync("node", [join(__dirname, "checar-segredos.mjs")], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command: comando }, cwd: pasta }),
      encoding: "utf8",
    });
  }

  it("barra (exit 2) o commit com chave no formato sk-ant-...", () => {
    const r = rodar(`${chaveAnthropic()}\n`, "git commit -m teste");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("BARRADO");
    expect(r.stderr).toContain("arquivo.txt:1");
    expect(r.stderr).not.toContain(chaveAnthropic());
  });

  it("deixa seguir o commit com 'senha: abc123', mas mostra o aviso", () => {
    const r = rodar("senha: abc123\n", "git commit -m teste");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("AVISO");
  });

  it("deixa seguir o que não é commit nem push, e entrada ilegível", () => {
    expect(rodar(`${chaveAnthropic()}\n`, "git status").status).toBe(0);
    const r = spawnSync("node", [join(__dirname, "checar-segredos.mjs")], { input: "lixo", encoding: "utf8" });
    expect(r.status).toBe(0);
  });
});

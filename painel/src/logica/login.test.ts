import { describe, expect, it } from "vitest";
import { interpretarEu, mensagemDoErro, paginaPraVoltar } from "./login";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

describe("interpretarEu", () => {
  it("200 com login: dentro", async () => {
    expect(await interpretarEu(json({ login: "fulana", avatar: "https://a/1" }))).toEqual({
      tipo: "dentro",
      usuario: { login: "fulana", avatar: "https://a/1" },
    });
  });

  it("401: fora", async () => {
    expect(await interpretarEu(json({ ok: false }, 401))).toEqual({ tipo: "fora" });
  });

  it("página HTML no lugar do JSON (só o npm run dev), 503 ou resposta estranha: indisponível", async () => {
    const html = new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } });
    expect(await interpretarEu(html)).toEqual({ tipo: "indisponivel" });
    expect(await interpretarEu(json({ ok: false }, 503))).toEqual({ tipo: "indisponivel" });
    expect(await interpretarEu(json({ nada: 1 }))).toEqual({ tipo: "indisponivel" });
  });
});

describe("mensagemDoErro", () => {
  it("diz que a conta não é da Sakura Corp, ou que falhou; sem erro, nada", () => {
    expect(mensagemDoErro("?erro=nao-membro")).toBe("Esta conta não faz parte da Sakura Corp.");
    expect(mensagemDoErro("?erro=falha-login")).toBe("Não deu pra entrar. Tente de novo.");
    expect(mensagemDoErro("")).toBeNull();
    expect(mensagemDoErro("?erro=<script>")).toBeNull();
  });
});

describe("paginaPraVoltar", () => {
  it("guarda a página e os parâmetros, tirando o ?erro=", () => {
    expect(paginaPraVoltar("/", "")).toBe("/");
    expect(paginaPraVoltar("/sala", "?tv")).toBe("/sala?tv");
    expect(paginaPraVoltar("/", "?erro=nao-membro")).toBe("/");
    expect(paginaPraVoltar("/sala", "?tv&erro=falha-login")).toBe("/sala?tv");
  });
});

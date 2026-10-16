import { describe, expect, it } from "vitest";
import worker from "./index";

const ambiente = {
  ASSETS: { fetch: async () => new Response("página", { status: 200 }) },
};

function pedir(caminho: string, method = "GET") {
  return worker.fetch(new Request(`https://painel.exemplo${caminho}`, { method }), ambiente);
}

describe("worker do painel", () => {
  it("/api/saude responde { ok: true }", async () => {
    const resposta = await pedir("/api/saude");
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toContain("application/json");
    expect(await resposta.json()).toEqual({ ok: true });
  });

  it("/api/saude recusa POST", async () => {
    expect((await pedir("/api/saude", "POST")).status).toBe(405);
  });

  it("outro /api/ dá 404 em JSON, e não a página", async () => {
    const resposta = await pedir("/api/nada");
    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toMatchObject({ ok: false });
  });

  it("o resto vai pra página", async () => {
    for (const caminho of ["/", "/sala", "/sala?tv", "/escritorio", "/apis"]) {
      expect(await (await pedir(caminho)).text()).toBe("página");
    }
  });
});

import { describe, expect, it } from "vitest";
import { carregarSala } from "./salaDados";

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
const entrada = { id: "casa:ci.yml", tipo: "casa", nome: "Conferência", sinais: {} };

describe("carregarSala (#468)", () => {
  it("devolve as entradas, as falhas e a leva", async () => {
    const r = await carregarSala(async () => json({ entradas: [entrada], falhas: ["claude"], leva: 0 }));
    expect(r).toEqual({ tipo: "pronto", entradas: [entrada], falhas: ["claude"], leva: 0 });
  });
  it("sem leva (a busca das pessoas falhou) fica null", async () => {
    const r = await carregarSala(async () => json({ entradas: [], falhas: ["pessoa"], leva: null }));
    expect(r).toMatchObject({ tipo: "pronto", leva: null });
  });
  it("401 = a sessão acabou", async () => {
    expect(await carregarSala(async () => json({ ok: false }, 401))).toEqual({ tipo: "fora" });
  });
  it("502, internet fora, resposta que não é JSON ou fora do formato = erro, nunca sala vazia", async () => {
    const erro = { tipo: "erro", mensagem: expect.any(String) };
    expect(await carregarSala(async () => json({ ok: false }, 502))).toMatchObject(erro);
    expect(await carregarSala(async () => { throw new TypeError("offline"); })).toMatchObject(erro);
    expect(await carregarSala(async () => new Response("<html>", { headers: { "content-type": "text/html" } }))).toMatchObject(erro);
    expect(await carregarSala(async () => json({ entradas: "x", falhas: [] }))).toMatchObject(erro);
    expect(await carregarSala(async () => json({ entradas: [{ id: 1 }], falhas: [] }))).toMatchObject(erro);
    expect(await carregarSala(async () => json({ entradas: [], falhas: ["outro"] }))).toMatchObject(erro);
  });
});

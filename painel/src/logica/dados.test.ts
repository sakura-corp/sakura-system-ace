import { describe, expect, it } from "vitest";
import { carregarLeva, enderecoDaLeva, levaPedida } from "./dados";

const json = (corpo: unknown, status = 200) => Response.json(corpo, { status });
const tarefa = { numero: 350, titulo: "T", url: "https://github.com/sakura-corp/x", estado: "feita" };
const levas = { levas: [{ numero: 0, nome: "Leva 0", abertas: 0 }, { numero: 1, nome: "Leva 1", abertas: 2 }], atual: 1 };

/** Finge o worker e anota a ordem dos pedidos, e se algum começou antes do anterior terminar. */
function fingirWorker(respostas: Record<string, () => Response>) {
  const pedidos: string[] = [];
  let emVoo = 0;
  let juntos = false;
  const buscar = async (endereco: string) => {
    pedidos.push(endereco);
    emVoo += 1;
    if (emVoo > 1) juntos = true;
    await new Promise((r) => setTimeout(r, 1));
    emVoo -= 1;
    const r = respostas[endereco];
    return r ? r() : json({ ok: false }, 404);
  };
  return { buscar, pedidos, juntos: () => juntos };
}

describe("carregarLeva", () => {
  it("pede as levas, depois a atual, um pedido de cada vez", async () => {
    const w = fingirWorker({ "/api/levas": () => json(levas), "/api/leva/1": () => json({ numero: 1, tarefas: [tarefa], cortada: false }) });
    expect(await carregarLeva(null, w.buscar)).toEqual({ tipo: "pronto", levas: levas.levas, atual: 1, leva: { numero: 1, tarefas: [tarefa], cortada: false } });
    expect(w.pedidos).toEqual(["/api/levas", "/api/leva/1"]);
    expect(w.juntos()).toBe(false);
  });

  it("a leva pedida, se existe; se não existe, a atual", async () => {
    const w = fingirWorker({
      "/api/levas": () => json(levas),
      "/api/leva/0": () => json({ numero: 0, tarefas: [], cortada: false }),
      "/api/leva/1": () => json({ numero: 1, tarefas: [], cortada: true }),
    });
    expect(await carregarLeva(0, w.buscar)).toMatchObject({ tipo: "pronto", leva: { numero: 0 } });
    expect(await carregarLeva(9, w.buscar)).toMatchObject({ tipo: "pronto", leva: { numero: 1, cortada: true } });
  });

  it("401 em qualquer pedido: fora", async () => {
    expect(await carregarLeva(null, fingirWorker({ "/api/levas": () => json({}, 401) }).buscar)).toEqual({ tipo: "fora" });
    const w = fingirWorker({ "/api/levas": () => json(levas), "/api/leva/1": () => json({}, 401) });
    expect(await carregarLeva(null, w.buscar)).toEqual({ tipo: "fora" });
  });

  it("502, resposta que não é JSON ou formato estranho: erro com mensagem", async () => {
    for (const r of [() => json({ ok: false }, 502), () => new Response("<html>", { headers: { "content-type": "text/html" } }), () => json({ levas: "x" })]) {
      expect(await carregarLeva(null, fingirWorker({ "/api/levas": r }).buscar)).toMatchObject({ tipo: "erro", mensagem: expect.stringContaining("GitHub") });
    }
    const w = fingirWorker({ "/api/levas": () => json(levas), "/api/leva/1": () => json({ tarefas: [{ numero: "1" }] }) });
    expect(await carregarLeva(null, w.buscar)).toMatchObject({ tipo: "erro" });
  });

  it("sem internet: erro de conexão", async () => {
    const buscar = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await carregarLeva(null, buscar)).toMatchObject({ tipo: "erro", mensagem: expect.stringContaining("conexão") });
  });

  it("sem nenhuma etiqueta leva-N: sem-levas, e nem pede tarefas", async () => {
    const w = fingirWorker({ "/api/levas": () => json({ levas: [], atual: null }) });
    expect(await carregarLeva(null, w.buscar)).toEqual({ tipo: "sem-levas" });
    expect(w.pedidos).toEqual(["/api/levas"]);
  });
});

describe("levaPedida e enderecoDaLeva", () => {
  it("lê /leva/<n>; o resto é a atual", () => {
    expect(levaPedida("/leva/3")).toBe(3);
    expect(levaPedida("/leva/3/")).toBe(3);
    expect(levaPedida("/")).toBeNull();
    expect(levaPedida("/leva/x")).toBeNull();
    expect(levaPedida("/sala")).toBeNull();
  });
  it("a atual é /, as outras /leva/<n>", () => {
    expect(enderecoDaLeva(1, 1)).toBe("/");
    expect(enderecoDaLeva(0, 1)).toBe("/leva/0");
  });
});

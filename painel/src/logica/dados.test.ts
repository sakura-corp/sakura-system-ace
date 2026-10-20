import { describe, expect, it } from "vitest";
import { acaoNaTarefa, carregarLeva, carregarResumoDasLevas, enderecoDaLeva, levaPedida } from "./dados";

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

describe("carregarResumoDasLevas (#548)", () => {
  const resumo = {
    levas: [
      { numero: 0, nome: "Leva 0", abertas: 0, total: 8, feitas: 8, horas: 14, terminouEm: "2026-10-16T15:00:00Z" },
      { numero: 1, nome: "Leva 1", abertas: 2, total: 11, feitas: 9, horas: 30.5, terminouEm: null },
    ],
    atual: 1,
  };
  it("um pedido só, ao /api/levas/resumo (nem /api/levas, nem as tarefas)", async () => {
    const w = fingirWorker({ "/api/levas/resumo": () => json(resumo) });
    expect(await carregarResumoDasLevas(w.buscar)).toEqual({ tipo: "pronto", levas: resumo.levas, atual: 1 });
    expect(w.pedidos).toEqual(["/api/levas/resumo"]);
  });
  it("401: fora; sem atual ou sem levas: sem-levas", async () => {
    expect(await carregarResumoDasLevas(fingirWorker({ "/api/levas/resumo": () => json({}, 401) }).buscar)).toEqual({ tipo: "fora" });
    expect(await carregarResumoDasLevas(fingirWorker({ "/api/levas/resumo": () => json({ levas: [], atual: null }) }).buscar)).toEqual({ tipo: "sem-levas" });
    expect(await carregarResumoDasLevas(fingirWorker({ "/api/levas/resumo": () => json({ levas: resumo.levas }) }).buscar)).toEqual({ tipo: "sem-levas" });
  });
  it("502, não-JSON, formato estranho ou sem conexão: erro com mensagem", async () => {
    for (const r of [() => json({ ok: false }, 502), () => new Response("<html>", { headers: { "content-type": "text/html" } }), () => json({ levas: "x", atual: 1 })]) {
      expect(await carregarResumoDasLevas(fingirWorker({ "/api/levas/resumo": r }).buscar)).toMatchObject({ tipo: "erro", mensagem: expect.stringContaining("GitHub") });
    }
    const semRede = async () => {
      throw new TypeError("fetch failed");
    };
    expect(await carregarResumoDasLevas(semRede)).toMatchObject({ tipo: "erro", mensagem: expect.stringContaining("internet") });
  });
});

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
    for (const ruim of [{ numero: "1" }, { ...tarefa, estado: "bloqueada" }, { ...tarefa, dono: "fulana" }, { ...tarefa, url: undefined }]) {
      const w = fingirWorker({ "/api/levas": () => json(levas), "/api/leva/1": () => json({ tarefas: [ruim] }) });
      expect(await carregarLeva(null, w.buscar)).toMatchObject({ tipo: "erro" });
    }
  });

  it("a fase da leva (#645) chega na página; fase desconhecida fica de fora", async () => {
    const pedir = (fase: unknown) =>
      carregarLeva(null, fingirWorker({ "/api/levas": () => json(levas), "/api/leva/1": () => json({ numero: 1, tarefas: [tarefa], cortada: false, fase }) }).buscar);
    const r = await pedir("trabalhando");
    expect(r.tipo === "pronto" && r.leva.fase).toBe("trabalhando");
    const estranha = await pedir("inventada");
    expect(estranha.tipo === "pronto" && "fase" in estranha.leva).toBe(false);
  });
  it("só as levas (Sala e Escritório): não pede as tarefas", async () => {
    const w = fingirWorker({ "/api/levas": () => json(levas) });
    expect(await carregarLeva(null, w.buscar, true)).toEqual({ tipo: "pronto", levas: levas.levas, atual: 1, leva: { numero: 1, tarefas: [], cortada: false } });
    expect(w.pedidos).toEqual(["/api/levas"]);
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
    expect(levaPedida("/leva")).toBeNull();
    expect(levaPedida("/leva/")).toBeNull();
    expect(levaPedida("/leva/x")).toBeNull();
    expect(levaPedida("/sala")).toBeNull();
  });
  it("a atual é /leva (a / é o Início, #546), as outras /leva/<n>", () => {
    expect(enderecoDaLeva(1, 1)).toBe("/leva");
    expect(enderecoDaLeva(0, 1)).toBe("/leva/0");
  });
});

describe("acaoNaTarefa", () => {
  /** Anota o endereço e o pedido de cada chamada. */
  const anotar = (resposta: () => Response) => {
    const chamadas: { endereco: string; init?: RequestInit }[] = [];
    const buscar = async (endereco: string, init?: RequestInit) => {
      chamadas.push({ endereco, init });
      return resposta();
    };
    return { buscar, chamadas };
  };

  it("pega e larga: POST no endereço certo, ok quando o worker diz ok", async () => {
    for (const acao of ["pegar", "largar"] as const) {
      const w = anotar(() => json({ ok: true }));
      expect(await acaoNaTarefa(538, acao, w.buscar)).toEqual({ tipo: "ok" });
      expect(w.chamadas).toHaveLength(1);
      expect(w.chamadas[0].endereco).toBe(`/api/tarefa/538/${acao}`);
      expect(w.chamadas[0].init?.method).toBe("POST");
      expect(w.chamadas[0].init?.headers).toEqual({ accept: "application/json" });
    }
  });

  it("número inválido: erro e nem pede", async () => {
    for (const n of [0, -1, 2.5, NaN, Infinity, 99999999]) {
      const w = anotar(() => json({ ok: true }));
      expect(await acaoNaTarefa(n, "pegar", w.buscar)).toEqual({ tipo: "erro", mensagem: "Tarefa inválida." });
      expect(w.chamadas).toHaveLength(0);
    }
  });

  it("recusa pelo corpo, seja 409, 403 ou 400", async () => {
    for (const status of [409, 403, 400]) {
      const w = anotar(() => json({ ok: false, motivo: "alguém pegou antes" }, status));
      expect(await acaoNaTarefa(5, "pegar", w.buscar)).toEqual({ tipo: "recusado", motivo: "alguém pegou antes" });
    }
  });

  it("corta o motivo em 200 caracteres", async () => {
    const w = anotar(() => json({ ok: false, motivo: "a".repeat(500) }, 409));
    expect(await acaoNaTarefa(5, "pegar", w.buscar)).toEqual({ tipo: "recusado", motivo: "a".repeat(200) });
  });

  it("401: fora", async () => {
    expect(await acaoNaTarefa(5, "pegar", anotar(() => json({ ok: false, motivo: "x" }, 401)).buscar)).toEqual({ tipo: "fora" });
  });

  it("sem internet: erro de conexão", async () => {
    const buscar = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await acaoNaTarefa(5, "largar", buscar)).toMatchObject({ tipo: "erro", mensagem: expect.stringContaining("conexão") });
  });

  it("não JSON, 5xx sem motivo, motivo vazio ou formato estranho: erro do GitHub", async () => {
    const respostas = [
      () => new Response("<html>", { status: 502, headers: { "content-type": "text/html" } }),
      () => json({ ok: false }, 502),
      () => json({ ok: false, motivo: "   " }, 409),
      () => json({ ok: false, motivo: 5 }, 409),
      () => json({ motivo: "sem ok" }, 409),
      () => json({ ok: "true" }),
      () => json(null),
      () => json([1]),
    ];
    for (const r of respostas) {
      expect(await acaoNaTarefa(5, "pegar", anotar(r).buscar)).toEqual({ tipo: "erro", mensagem: "Não deu pra falar com o GitHub agora. Tente de novo." });
    }
  });
});

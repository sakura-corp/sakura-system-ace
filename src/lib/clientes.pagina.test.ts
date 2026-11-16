import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";

// Consulta de mentira que anota cada passo pedido: o que importa aqui é o que
// a lib manda o BANCO fazer (a página, a ordem e a busca vão pra lá, #373).
const chamadas = vi.hoisted(() => ({
  passos: [] as [string, unknown[]][],
  resposta: { data: [] as unknown[], error: null as unknown, count: 0 as number | null },
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: (tabela: string) => {
      chamadas.passos.push(["from", [tabela]]);
      const q: Record<string, unknown> = {};
      for (const metodo of ["select", "neq", "or", "order", "range"]) {
        q[metodo] = (...args: unknown[]) => {
          chamadas.passos.push([metodo, args]);
          return q;
        };
      }
      q.then = (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) =>
        Promise.resolve(chamadas.resposta).then(ok, erro);
      return q;
    },
  },
}));

const { filtroDaBuscaDeClientes, listarClientesPagina } = await import("./clientes");

beforeEach(() => {
  chamadas.passos.length = 0;
  chamadas.resposta = { data: [], error: null, count: 0 };
});

function passos(metodo: string) {
  return chamadas.passos.filter(([m]) => m === metodo).map(([, args]) => args);
}

describe("listarClientesPagina", () => {
  it("pede ao banco só a página, na ordem pedida, terminando em id, com o total", async () => {
    chamadas.resposta = { data: [{ id: "c1", nome: "Ana" }], error: null, count: 120 };

    const pagina = await listarClientesPagina({
      de: 50,
      ate: 99,
      ordem: { coluna: "nome", crescente: false },
      busca: "",
    });

    expect(pagina).toEqual({ linhas: [{ id: "c1", nome: "Ana" }], total: 120 });
    expect(passos("from")).toEqual([["clientes"]]);
    expect(passos("select")).toEqual([["*, veiculos(*)", { count: "exact" }]]);
    expect(passos("range")).toEqual([[50, 99]]);
    expect(passos("order")).toEqual([
      ["nome", { ascending: false, nullsFirst: false }],
      ["id", { ascending: true }],
    ]);
    // Sem busca, nenhum filtro a mais.
    expect(passos("or")).toEqual([]);
  });

  it("o Consumidor nunca vem (o filtro vai pro banco)", async () => {
    await listarClientesPagina({ de: 0, ate: 49, ordem: { coluna: "nome", crescente: true }, busca: "x" });
    expect(passos("neq")).toEqual([["id", CLIENTE_CONSUMIDOR_ID]]);
  });

  it("ordenar por Cidade/UF ordena por cidade, depois UF, depois id", async () => {
    await listarClientesPagina({ de: 0, ate: 49, ordem: { coluna: "cidade", crescente: true }, busca: "" });
    expect(passos("order").map(([coluna]) => coluna)).toEqual(["cidade", "uf", "id"]);
  });

  it("a busca vai pro banco, no nome, telefone e CPF/CNPJ", async () => {
    await listarClientesPagina({ de: 0, ate: 49, ordem: { coluna: "nome", crescente: true }, busca: " Silva " });
    expect(passos("or")).toEqual([
      ['nome.ilike."%Silva%",telefone.ilike."%Silva%",cpf_cnpj.ilike."%Silva%"'],
    ]);
  });

  it("erro do banco sobe", async () => {
    chamadas.resposta = { data: [], error: { message: "caiu" }, count: null };
    await expect(
      listarClientesPagina({ de: 0, ate: 49, ordem: { coluna: "nome", crescente: true }, busca: "" }),
    ).rejects.toEqual({ message: "caiu" });
  });
});

describe("filtroDaBuscaDeClientes", () => {
  it("busca vazia (ou só espaço) não filtra", () => {
    expect(filtroDaBuscaDeClientes("")).toBeNull();
    expect(filtroDaBuscaDeClientes("   ")).toBeNull();
  });

  it("% e _ viram letra comum pro LIKE (senão '50%' acharia tudo)", () => {
    const filtro = filtroDaBuscaDeClientes("50%_a")!;
    expect(filtro).toContain('nome.ilike."%50\\\\%\\\\_a%"');
  });

  it("vírgula e parênteses ficam dentro das aspas e não quebram o .or()", () => {
    const filtro = filtroDaBuscaDeClientes("Silva, (Zé)")!;
    expect(filtro).toContain('nome.ilike."%Silva, (Zé)%"');
    // Fora das aspas, só as vírgulas que separam as condições.
    const semAspas = filtro.replace(/"[^"]*"/g, "");
    expect(semAspas.split(",")).toHaveLength(3);
    expect(semAspas).not.toMatch(/[()]/);
  });

  it("aspas e barra invertida são escapadas pro PostgREST", () => {
    expect(filtroDaBuscaDeClientes('a"b')).toContain('nome.ilike."%a\\"b%"');
    // A barra vira \\ pro LIKE e cada uma ganha outra pro PostgREST.
    expect(filtroDaBuscaDeClientes("a\\b")).toContain('nome.ilike."%a\\\\\\\\b%"');
  });

  it("com número, acha o telefone e o CPF com ou sem pontuação", () => {
    const filtro = filtroDaBuscaDeClientes("16990000001")!;
    expect(filtro).toContain('telefone.ilike."%1%6%9%9%0%0%0%0%0%0%1%"');
    expect(filtro).toContain('cpf_cnpj.ilike."%1%6%9%9%0%0%0%0%0%0%1%"');
    const casa = (gravado: string, padrao: string) =>
      new RegExp(`^${padrao.replace(/%/g, ".*")}$`).test(gravado);
    expect(casa("(16) 99000-0001", "%1%6%9%9%0%0%0%0%0%0%1%")).toBe(true);
  });

  it("nome sem número não ganha a busca espalhada", () => {
    expect(filtroDaBuscaDeClientes("Ana")!.split(",")).toHaveLength(3);
  });
});

describe("filtroDaBuscaDeClientes — achados da revisão final", () => {
  it("com letra no meio ('Ana 123') não espalha os números", () => {
    expect(filtroDaBuscaDeClientes("Ana 123")!.split(",")).toHaveLength(3);
  });

  it("número curto (menos de 4 algarismos) não espalha", () => {
    expect(filtroDaBuscaDeClientes("999")!.split(",")).toHaveLength(3);
  });

  it("CPF com pontuação espalha", () => {
    expect(filtroDaBuscaDeClientes("123.456.789-09")).toContain(
      'cpf_cnpj.ilike."%1%2%3%4%5%6%7%8%9%0%9%"',
    );
  });
});

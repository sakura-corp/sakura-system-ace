// Testes do Financeiro no worker (#654). Só valores obviamente fictícios: o repositório é público.
//
// Portas testadas:
// - `tratarFinanceiro` (as rotas e o corte), com um banco em memória: pega vazamento de lançamento pra equipe,
//   quem pode escrever, os códigos de resposta e o mês dos totais. Não pega erro de SQL.
// - `repositorioD1`, num SQLite em memória com a migration de verdade: pega erro de SQL e regra do banco.
// - `worker.fetch` (index.ts): pega a ligação com a sessão (401), com o banco (503) e com DONA_DO_FINANCEIRO.
import { describe, expect, it } from "vitest";
import worker, { type Ambiente } from "./index";
import { cifrarSessao, type Sessao } from "./sessao";
import {
  repositorioD1,
  tratarFinanceiro,
  type BancoD1,
  type DeclaracaoD1,
  type Categoria,
  type ContextoFinanceiro,
  type DadosDoLancamento,
  type Lancamento,
  type RepositorioFinanceiro,
} from "./financeiro";
import MIGRACAO from "../migrations/0001_financeiro.sql?raw";

const DONA = "Dona-De-Teste";
const EQUIPE = "pessoa-da-equipe";
const ORIGEM = "https://painel.exemplo";
// 15/03/2026 às 10h em São Paulo.
const AGORA = new Date("2026-03-15T13:00:00Z");

const CATEGORIAS: Categoria[] = [
  { id: 1, nome: "Mensalidade de loja" },
  { id: 2, nome: "Servidor" },
  { id: 6, nome: "Outros" },
];

/** O banco em memória. `lancamentos` fica exposto pra o teste conferir que nada mudou. */
function bancoEmMemoria(iniciais: Omit<Lancamento, "categoria">[] = []) {
  const nomeDa = (id: number) => CATEGORIAS.find((c) => c.id === id)?.nome ?? "";
  const lancamentos: Lancamento[] = iniciais.map((l) => ({ ...l, categoria: nomeDa(l.categoriaId) }));
  let proximoId = Math.max(0, ...lancamentos.map((l) => l.id)) + 1;
  const repositorio: RepositorioFinanceiro = {
    async listarLancamentos(mes) {
      return lancamentos
        .filter((l) => !mes || l.data.startsWith(`${mes}-`))
        .sort((a, b) => (a.data === b.data ? b.id - a.id : a.data < b.data ? 1 : -1))
        .map((l) => ({ ...l }));
    },
    async listarCategorias() {
      return CATEGORIAS.map((c) => ({ ...c }));
    },
    async inserir(dados: DadosDoLancamento, lancadoPor, criadoEm) {
      const novo: Lancamento = { id: proximoId++, ...dados, categoria: nomeDa(dados.categoriaId), lancadoPor, criadoEm, atualizadoEm: null };
      lancamentos.push(novo);
      return { ...novo };
    },
    async atualizar(id, dados, atualizadoEm) {
      const l = lancamentos.find((x) => x.id === id);
      if (!l) return null;
      Object.assign(l, dados, { categoria: nomeDa(dados.categoriaId), atualizadoEm });
      return { ...l };
    },
    async apagar(id) {
      const i = lancamentos.findIndex((x) => x.id === id);
      if (i < 0) return false;
      lancamentos.splice(i, 1);
      return true;
    },
  };
  return { repositorio, lancamentos };
}

const DESCRICOES = ["teste fictício A", "teste fictício B", "teste fictício C"];

/** Três lançamentos fictícios: dois em março/2026 e um em fevereiro/2026. */
function bancoComDados() {
  return bancoEmMemoria([
    { id: 1, data: "2026-03-02", tipo: "entrada", valorCentavos: 12345, categoriaId: 1, descricao: DESCRICOES[0], lancadoPor: DONA, criadoEm: "2026-03-02T12:00:00.000Z", atualizadoEm: null },
    { id: 2, data: "2026-03-10", tipo: "saida", valorCentavos: 2000, categoriaId: 2, descricao: DESCRICOES[1], lancadoPor: DONA, criadoEm: "2026-03-10T12:00:00.000Z", atualizadoEm: null },
    { id: 3, data: "2026-02-20", tipo: "entrada", valorCentavos: 10000, categoriaId: 1, descricao: DESCRICOES[2], lancadoPor: DONA, criadoEm: "2026-02-20T12:00:00.000Z", atualizadoEm: null },
  ]);
}

function pedir(
  caminho: string,
  { method = "GET", corpo, origem = ORIGEM, login = EQUIPE, dona = DONA, repositorio, agora = AGORA }: {
    method?: string; corpo?: unknown; origem?: string | null; login?: string; dona?: string | undefined; repositorio: RepositorioFinanceiro | null; agora?: Date;
  },
) {
  const headers: Record<string, string> = {};
  if (origem) headers.origin = origem;
  if (corpo !== undefined) headers["content-type"] = "application/json";
  const request = new Request(`${ORIGEM}${caminho}`, { method, headers, body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo) });
  const contexto: ContextoFinanceiro = { login, dona, repositorio, agora };
  return tratarFinanceiro(request, contexto);
}

describe("o corte: a equipe vê só os totais", () => {
  it("GET /resumo pra quem não é dona: 200, só { resumo, podeLancar: false }, sem nenhum lançamento", async () => {
    const { repositorio } = bancoComDados();
    const r = await pedir("/api/financeiro/resumo", { repositorio });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const texto = await r.text();
    for (const d of DESCRICOES) expect(texto).not.toContain(d);
    for (const campo of ["descricao", "lancadoPor", "lancado_por", "criadoEm", "categoriaId", "\"id\"", "\"data\"", "lancamentos"]) {
      expect(texto).not.toContain(campo);
    }
    // Nenhum dia de calendário (AAAA-MM-DD) na resposta: só meses.
    expect(texto).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    const corpo = JSON.parse(texto);
    expect(Object.keys(corpo).sort()).toEqual(["podeLancar", "resumo"]);
    expect(corpo.podeLancar).toBe(false);
    expect(Object.keys(corpo.resumo).sort()).toEqual(["mesAtual", "meses", "saidasPorCategoria"]);
  });
});

const NOVO = { data: "2026-03-12", tipo: "saida", valorCentavos: 12345, categoriaId: 2, descricao: "teste fictício D" };

/** Os quatro pedidos que só a dona pode fazer. */
const PEDIDOS_DA_DONA: { caminho: string; method: string; corpo?: unknown }[] = [
  { caminho: "/api/financeiro/lancamentos", method: "GET" },
  { caminho: "/api/financeiro/lancamentos", method: "POST", corpo: NOVO },
  { caminho: "/api/financeiro/lancamentos/1", method: "PUT", corpo: NOVO },
  { caminho: "/api/financeiro/lancamentos/1", method: "DELETE" },
];

async function esperarRecusaSemDado(r: Response) {
  expect(r.status).toBe(403);
  const texto = await r.text();
  for (const d of DESCRICOES) expect(texto).not.toContain(d);
  expect(Object.keys(JSON.parse(texto)).sort()).toEqual(["erro", "ok"]);
}

describe("só a dona vê e mexe nos lançamentos", () => {
  it("a equipe leva 403, sem dado nenhum, em GET, POST, PUT e DELETE, e o banco não muda", async () => {
    const { repositorio, lancamentos } = bancoComDados();
    const antes = JSON.stringify(lancamentos);
    for (const p of PEDIDOS_DA_DONA) await esperarRecusaSemDado(await pedir(p.caminho, { ...p, repositorio }));
    expect(JSON.stringify(lancamentos)).toBe(antes);
  });

  it("DONA_DO_FINANCEIRO vazia ou faltando: ninguém é dona, nem o login de verdade dela", async () => {
    for (const dona of ["", "   ", undefined]) {
      const { repositorio, lancamentos } = bancoComDados();
      const antes = JSON.stringify(lancamentos);
      for (const login of ["caranovavidanova", "", " "]) {
        for (const p of PEDIDOS_DA_DONA) await esperarRecusaSemDado(await pedir(p.caminho, { ...p, login, dona, repositorio }));
        const resumo = await (await pedir("/api/financeiro/resumo", { login, dona, repositorio })).json();
        expect(resumo.podeLancar).toBe(false);
      }
      expect(JSON.stringify(lancamentos)).toBe(antes);
    }
  });

  it("a dona (sem diferenciar maiúscula) lista, lança, edita e apaga, e podeLancar = true", async () => {
    const { repositorio, lancamentos } = bancoComDados();
    const login = "dona-de-teste";

    const resumo = await (await pedir("/api/financeiro/resumo", { login, repositorio })).json();
    expect(resumo.podeLancar).toBe(true);

    const lista = await pedir("/api/financeiro/lancamentos", { login, repositorio });
    expect(lista.status).toBe(200);
    expect(lista.headers.get("cache-control")).toBe("no-store");
    const corpoLista = await lista.json();
    expect(Object.keys(corpoLista).sort()).toEqual(["categorias", "lancamentos"]);
    expect(corpoLista.lancamentos.map((l: Lancamento) => l.id)).toEqual([2, 1, 3]);
    expect(corpoLista.categorias).toEqual(CATEGORIAS);

    const soFevereiro = await (await pedir("/api/financeiro/lancamentos?mes=2026-02", { login, repositorio })).json();
    expect(soFevereiro.lancamentos.map((l: Lancamento) => l.descricao)).toEqual(["teste fictício C"]);

    const criado = await pedir("/api/financeiro/lancamentos", { method: "POST", corpo: NOVO, login, repositorio });
    expect(criado.status).toBe(201);
    const { lancamento } = await criado.json();
    expect(lancamento).toMatchObject({
      id: 4, data: "2026-03-12", tipo: "saida", valorCentavos: 12345, categoriaId: 2, categoria: "Servidor",
      descricao: "teste fictício D", lancadoPor: login, criadoEm: AGORA.toISOString(), atualizadoEm: null,
    });
    expect(lancamentos).toHaveLength(4);

    const editado = await pedir("/api/financeiro/lancamentos/4", { method: "PUT", corpo: { ...NOVO, valorCentavos: 500, categoriaId: 6 }, login, repositorio });
    expect(editado.status).toBe(200);
    expect((await editado.json()).lancamento).toMatchObject({ id: 4, valorCentavos: 500, categoria: "Outros", atualizadoEm: AGORA.toISOString() });

    const apagado = await pedir("/api/financeiro/lancamentos/4", { method: "DELETE", login, repositorio });
    expect(apagado.status).toBe(200);
    expect(lancamentos.map((l) => l.id)).toEqual([1, 2, 3]);
  });
});

describe("respostas de erro", () => {
  it("corpo inválido, categoria que não existe e mês errado: 400, sem gravar", async () => {
    const { repositorio, lancamentos } = bancoComDados();
    const login = DONA;
    const ruins: unknown[] = ["{não é json", { ...NOVO, valorCentavos: 0 }, { ...NOVO, valorCentavos: 12.5 }, { ...NOVO, data: "2026-02-30" }, { ...NOVO, tipo: "outro" }, { ...NOVO, categoriaId: 99 }];
    for (const corpo of ruins) {
      expect((await pedir("/api/financeiro/lancamentos", { method: "POST", corpo, login, repositorio })).status).toBe(400);
      expect((await pedir("/api/financeiro/lancamentos/1", { method: "PUT", corpo, login, repositorio })).status).toBe(400);
    }
    expect((await pedir("/api/financeiro/resumo?mes=2026-13", { repositorio })).status).toBe(400);
    expect((await pedir("/api/financeiro/lancamentos?mes=03-2026", { login, repositorio })).status).toBe(400);
    expect(lancamentos.map((l) => [l.id, l.valorCentavos])).toEqual([[1, 12345], [2, 2000], [3, 10000]]);
  });

  it("id que não existe: 404 no PUT e no DELETE; caminho que não existe: 404", async () => {
    const { repositorio } = bancoComDados();
    const login = DONA;
    expect((await pedir("/api/financeiro/lancamentos/999", { method: "PUT", corpo: NOVO, login, repositorio })).status).toBe(404);
    expect((await pedir("/api/financeiro/lancamentos/999", { method: "DELETE", login, repositorio })).status).toBe(404);
    expect((await pedir("/api/financeiro/lancamentos/abc", { method: "DELETE", login, repositorio })).status).toBe(404);
    expect((await pedir("/api/financeiro/outra", { login, repositorio })).status).toBe(404);
  });

  it("método errado: 405", async () => {
    const { repositorio } = bancoComDados();
    const login = DONA;
    expect((await pedir("/api/financeiro/resumo", { method: "POST", login, repositorio })).status).toBe(405);
    expect((await pedir("/api/financeiro/lancamentos", { method: "DELETE", login, repositorio })).status).toBe(405);
    expect((await pedir("/api/financeiro/lancamentos/1", { method: "GET", login, repositorio })).status).toBe(405);
  });

  it("escrita vinda de outro site, ou sem Origin, leva 403 e não grava (CSRF)", async () => {
    const { repositorio, lancamentos } = bancoComDados();
    const antes = JSON.stringify(lancamentos);
    for (const origem of ["https://outro.exemplo", null]) {
      for (const p of PEDIDOS_DA_DONA.filter((x) => x.method !== "GET")) {
        expect((await pedir(p.caminho, { ...p, origem, login: DONA, repositorio })).status).toBe(403);
      }
    }
    expect(JSON.stringify(lancamentos)).toBe(antes);
  });

  it("sem o banco configurado: 503 com mensagem clara", async () => {
    const r = await pedir("/api/financeiro/resumo", { repositorio: null });
    expect(r.status).toBe(503);
    expect((await r.json()).erro).toContain("banco do financeiro");
  });
});

describe("valor e mês", () => {
  it("o lançamento gravado entra no total do mês certo, em São Paulo", async () => {
    const { repositorio } = bancoComDados();
    // 31/03/2026 às 23h em São Paulo; em UTC já é 01/04.
    const agora = new Date("2026-04-01T02:00:00Z");
    const corpo = { ...NOVO, data: "2026-03-31", tipo: "entrada", valorCentavos: 12345, categoriaId: 1 };
    expect((await pedir("/api/financeiro/lancamentos", { method: "POST", corpo, login: DONA, repositorio, agora })).status).toBe(201);

    const { resumo } = await (await pedir("/api/financeiro/resumo", { repositorio, agora })).json();
    // Março: 123,45 + 123,45 de entrada; 20,00 de saída.
    expect(resumo.mesAtual).toMatchObject({ mes: "2026-03", entrouCentavos: 24690, saiuCentavos: 2000 });
    expect(resumo.meses.map((m: { mes: string; entrouCentavos: number }) => [m.mes, m.entrouCentavos])).toEqual([["2026-02", 10000], ["2026-03", 24690]]);
    expect(resumo.saidasPorCategoria).toEqual([{ categoria: "Servidor", saiuCentavos: 2000 }]);

    const fevereiro = await (await pedir("/api/financeiro/resumo?mes=2026-02", { repositorio, agora })).json();
    expect(fevereiro.resumo.mesAtual).toMatchObject({ mes: "2026-02", entrouCentavos: 10000, saiuCentavos: 0 });
  });
});

// ---- O D1 de verdade: o SQL e a migration, num SQLite em memória (node:sqlite, o mesmo motor do D1) ----


/** O pedaço do node:sqlite que o teste usa (o painel não tem os tipos do Node). */
interface SqliteMinimo {
  exec(sql: string): void;
  prepare(sql: string): { all(...v: unknown[]): unknown[]; get(...v: unknown[]): unknown; run(...v: unknown[]): { changes: number | bigint } };
}
const { DatabaseSync } = (await import("node:sqlite" as string)) as { DatabaseSync: new (caminho: string) => SqliteMinimo };

/** Um D1 de mentira em cima do SQLite, com a migration de verdade aplicada. */
function d1EmMemoria(): { banco: BancoD1; sqlite: SqliteMinimo } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec(MIGRACAO);
  const declaracao = (sql: string, valores: unknown[] = []): DeclaracaoD1 => {
    const preparada = () => sqlite.prepare(sql);
    const args = valores;
    return {
      bind: (...novos) => declaracao(sql, novos),
      all: async <T,>() => ({ results: preparada().all(...args) as T[] }),
      first: async <T,>() => (preparada().get(...args) as T | undefined) ?? null,
      run: async () => ({ meta: { changes: Number(preparada().run(...args).changes) } }),
    };
  };
  return { banco: { prepare: (sql) => declaracao(sql) }, sqlite };
}

describe("o D1 de verdade (SQL e migration)", () => {
  it("a migration roda duas vezes sem erro e traz as seis categorias na ordem", async () => {
    const { banco, sqlite } = d1EmMemoria();
    sqlite.exec(MIGRACAO);
    const categorias = await repositorioD1(banco).listarCategorias();
    expect(categorias.map((c) => c.nome)).toEqual(["Mensalidade de loja", "Servidor", "Claude", "Contabilidade", "Imposto", "Outros"]);
  });

  it("lança, lista (por mês, mais novo primeiro), edita e apaga", async () => {
    const repo = repositorioD1(d1EmMemoria().banco);
    const a = await repo.inserir({ data: "2026-03-02", tipo: "entrada", valorCentavos: 12345, categoriaId: 1, descricao: "teste fictício A" }, DONA, "2026-03-02T12:00:00.000Z");
    expect(a).toEqual({ id: 1, data: "2026-03-02", tipo: "entrada", valorCentavos: 12345, categoriaId: 1, categoria: "Mensalidade de loja", descricao: "teste fictício A", lancadoPor: DONA, criadoEm: "2026-03-02T12:00:00.000Z", atualizadoEm: null });
    await repo.inserir({ data: "2026-03-31", tipo: "saida", valorCentavos: 2000, categoriaId: 2, descricao: "" }, DONA, "x");
    await repo.inserir({ data: "2026-04-01", tipo: "saida", valorCentavos: 1, categoriaId: 6, descricao: "" }, DONA, "x");
    expect((await repo.listarLancamentos()).map((l) => l.id)).toEqual([3, 2, 1]);
    expect((await repo.listarLancamentos("2026-03")).map((l) => l.id)).toEqual([2, 1]);

    const editado = await repo.atualizar(1, { data: "2026-03-03", tipo: "saida", valorCentavos: 500, categoriaId: 6, descricao: "teste fictício B" }, "y");
    expect(editado).toMatchObject({ id: 1, data: "2026-03-03", tipo: "saida", valorCentavos: 500, categoria: "Outros", atualizadoEm: "y", lancadoPor: DONA });
    expect(await repo.atualizar(99, { data: "2026-03-03", tipo: "saida", valorCentavos: 500, categoriaId: 6, descricao: "" }, "y")).toBeNull();

    expect(await repo.apagar(1)).toBe(true);
    expect(await repo.apagar(1)).toBe(false);
    expect((await repo.listarLancamentos()).map((l) => l.id)).toEqual([3, 2]);
  });

  it("o banco recusa valor zero, quebrado ou negativo, tipo errado, dia fora do formato e categoria que não existe", async () => {
    const { sqlite } = d1EmMemoria();
    const inserir = (data: string, tipo: string, valor: number, categoria: number) =>
      sqlite.prepare("INSERT INTO lancamentos (data, tipo, valor_centavos, categoria_id, lancado_por, criado_em) VALUES (?, ?, ?, ?, 'x', 'x')").run(data, tipo, valor, categoria);
    expect(() => inserir("2026-03-01", "entrada", 0, 1)).toThrow();
    expect(() => inserir("2026-03-01", "entrada", -5, 1)).toThrow();
    expect(() => inserir("2026-03-01", "entrada", 12.5, 1)).toThrow();
    expect(() => inserir("2026-03-01", "outro", 100, 1)).toThrow();
    expect(() => inserir("01/03/2026", "entrada", 100, 1)).toThrow();
    expect(() => inserir("2026-03-01", "entrada", 100, 99)).toThrow();
    expect(() => inserir("2026-03-01", "entrada", 100, 1)).not.toThrow();
  });
});

// ---- A ligação no worker.fetch (index.ts) ----

// Outro login, diferente da DONA de cima: prova que a dona vem do ambiente, não do código.
const DONA_DO_AMBIENTE = "outra-dona-de-teste";
const CHAVE = "chave-de-teste-com-mais-de-trinta-e-dois-caracteres-0123456789";

describe("a rota no worker (index.ts)", () => {
  const ambienteBase = (extra: Partial<Ambiente> = {}): Ambiente => ({
    ASSETS: { fetch: async () => new Response("página") },
    GITHUB_APP_CLIENT_ID: "Iv-teste",
    GITHUB_APP_CLIENT_SECRET: "segredo-de-teste",
    CHAVE_DA_SESSAO: CHAVE,
    ...extra,
  });
  const cookieDe = async (login: string) => {
    const sessao: Sessao = { token: "ghu_a", refresh: "ghr_a", expiraEm: Date.now() + 3_600_000, login, avatar: "https://avatars.exemplo/f", entrouEm: Date.now() - 60_000 };
    return `sessao=${await cifrarSessao(sessao, CHAVE)}`;
  };
  const buscar = async (caminho: string, env: Ambiente, { login, method = "GET", corpo }: { login?: string; method?: string; corpo?: unknown } = {}) => {
    const headers: Record<string, string> = { origin: ORIGEM };
    if (login) headers.cookie = await cookieDe(login);
    return worker.fetch(new Request(`${ORIGEM}${caminho}`, { method, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) }), env);
  };

  it("sem sessão: 401, sem tocar no banco", async () => {
    const { banco } = d1EmMemoria();
    const r = await buscar("/api/financeiro/resumo", ambienteBase({ FINANCEIRO: banco, DONA_DO_FINANCEIRO: DONA }));
    expect(r.status).toBe(401);
  });

  it("sem o banco ligado: 503", async () => {
    expect((await buscar("/api/financeiro/resumo", ambienteBase({ DONA_DO_FINANCEIRO: DONA }), { login: EQUIPE })).status).toBe(503);
  });

  it("DONA_DO_FINANCEIRO decide quem lança; a equipe vê só os totais", async () => {
    const { banco } = d1EmMemoria();
    const env = ambienteBase({ FINANCEIRO: banco, DONA_DO_FINANCEIRO: DONA_DO_AMBIENTE });
    for (const login of [EQUIPE, DONA]) expect((await buscar("/api/financeiro/lancamentos", env, { login, method: "POST", corpo: NOVO })).status).toBe(403);
    expect((await buscar("/api/financeiro/lancamentos", env, { login: DONA_DO_AMBIENTE, method: "POST", corpo: NOVO })).status).toBe(201);
    expect((await buscar("/api/financeiro/lancamentos", env, { login: EQUIPE })).status).toBe(403);
    const resumo = await buscar("/api/financeiro/resumo", env, { login: EQUIPE });
    expect(resumo.status).toBe(200);
    const texto = await resumo.text();
    expect(texto).not.toContain("teste fictício D");
    expect(JSON.parse(texto).podeLancar).toBe(false);
  });
});

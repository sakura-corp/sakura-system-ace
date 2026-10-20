// Testes do Financeiro no worker (#654). Só valores obviamente fictícios: o repositório é público.
//
// Portas testadas:
// - `tratarFinanceiro` (as rotas e o corte), com um banco em memória: pega vazamento de lançamento pra equipe,
//   quem pode escrever, os códigos de resposta e o mês dos totais. Não pega erro de SQL.
// - `worker.fetch` (index.ts): pega a ligação com a sessão (401), com o banco (503) e com DONA_DO_FINANCEIRO.
import { describe, expect, it } from "vitest";
import {
  tratarFinanceiro,
  type Categoria,
  type ContextoFinanceiro,
  type DadosDoLancamento,
  type Lancamento,
  type RepositorioFinanceiro,
} from "./financeiro";

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

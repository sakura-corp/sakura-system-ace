import { renderToString } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERRO_SEM_ACESSO_AS_VERSOES, type Versao } from "../../worker/versoes";
import { carregarVersoes, ConteudoDasVersoes, PaginaVersoes, type EstadoDasVersoes } from "./PaginaVersoes";

// O fuso de quem usa (Brasil, UTC-3): sem isso, num computador em UTC, o teste da data não pegaria um toISOString().slice.
const ambiente = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const TZ_ANTES = ambiente.TZ;
beforeAll(() => {
  ambiente.TZ = "America/Sao_Paulo";
});
afterAll(() => {
  if (TZ_ANTES === undefined) delete ambiente.TZ;
  else ambiente.TZ = TZ_ANTES;
});

const local = (a: number, m: number, d: number, h = 12) => new Date(a, m - 1, d, h).toISOString();
const URL = "https://github.com/sakura-corp/ssace-versoes/releases/tag/";

const versao = (v: string, canal: Versao["canal"], extra: Partial<Versao> = {}): Versao => ({ versao: v, canal, publicadaEm: local(2026, 10, 18), url: `${URL}${v}`, ...extra });
const pronto = (versoes: Versao[]): EstadoDasVersoes => ({ tipo: "pronto", resposta: { versoes } });
const html = (estado: EstadoDasVersoes) => renderToString(<ConteudoDasVersoes estado={estado} tentarDeNovo={() => {}} />).replace(/<!-- -->/g, "");

describe("ConteudoDasVersoes (#649)", () => {
  it("lista vazia: 'Nenhuma versão publicada ainda.'", () => {
    const h = html(pronto([]));
    expect(h).toContain("Nenhuma versão publicada ainda.");
    expect(h).not.toContain("<ol");
  });

  it("a linha de teste mostra 'No canal de teste'; a liberada, 'Liberada'", () => {
    const t = html(pronto([versao("v0.9.60", "teste")]));
    expect(t).toContain("No canal de teste");
    expect(t).not.toContain("Liberada");
    const l = html(pronto([versao("v0.9.57", "liberada")]));
    expect(l).toContain("Liberada");
    expect(l).not.toContain("No canal de teste");
  });

  it("só a que está nas lojas mostra 'Nas lojas hoje'", () => {
    const h = html(pronto([versao("v0.9.60", "teste"), versao("v0.9.58", "liberada", { nasLojas: true }), versao("v0.9.57", "liberada")]));
    expect(h.match(/Nas lojas hoje/g)).toHaveLength(1);
    expect(h.indexOf("Nas lojas hoje")).toBeGreaterThan(h.indexOf("v0.9.58"));
    expect(h.indexOf("Nas lojas hoje")).toBeLessThan(h.indexOf("v0.9.57"));
  });

  it("a versão é link pra release, em aba nova; link fora da sakura-corp vira texto", () => {
    const h = html(pronto([versao("v0.9.60", "teste")]));
    expect(h).toContain(`href="${URL}v0.9.60"`);
    expect(h).toContain('target="_blank"');
    expect(h).toContain('rel="noopener noreferrer"');
    expect(h).toContain("(abre em aba nova)");
    const sem = html(pronto([versao("v0.9.59", "teste", { url: undefined })]));
    expect(sem).toContain("v0.9.59");
    expect(sem).not.toContain("releases/tag");
  });

  it("a data é dia/mês/ano no fuso de quem olha", () => {
    expect(html(pronto([versao("v1", "teste", { publicadaEm: local(2026, 3, 5, 23) })]))).toContain("05/03/2026");
    expect(html(pronto([versao("v1", "teste", { publicadaEm: local(2026, 3, 5, 0) })]))).toContain("05/03/2026");
    // 22h30 em Araraquara já é o dia seguinte em UTC: tem que sair o dia de quem olha.
    const h = html(pronto([versao("v1", "teste", { publicadaEm: "2026-03-06T01:30:00Z" })]));
    expect(h).toContain("05/03/2026");
    expect(h).not.toContain("06/03/2026");
  });

  it("a ordem na tela é a da lista", () => {
    const h = html(pronto([versao("v0.9.60", "teste"), versao("v0.9.55", "liberada")]));
    expect(h.indexOf("v0.9.60")).toBeLessThan(h.indexOf("v0.9.55"));
  });

  it("a versão é texto: <script> aparece escrito", () => {
    const h = html(pronto([versao("<script>x</script>", "teste", { url: undefined })]));
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
  });

  it("rodapé: 'Ver todas no GitHub'", () => {
    const h = html(pronto([versao("v1", "teste")]));
    expect(h).toContain('href="https://github.com/sakura-corp/ssace-versoes/releases"');
    expect(h).toContain("Ver todas no GitHub");
  });

  it("não tem botão nem form, e nenhuma ação de liberar ou publicar", () => {
    const h = html(pronto([versao("v0.9.60", "teste"), versao("v0.9.58", "liberada", { nasLojas: true })]));
    expect(h).not.toContain("<button");
    expect(h).not.toContain("<form");
    expect(h).not.toMatch(/Liberar|Publicar|Voltar/);
  });

  it("carregando, sessão acabada, sem acesso e erro", () => {
    expect(html({ tipo: "carregando" })).toContain('role="status"');
    expect(html({ tipo: "fora" })).toContain("A sessão acabou.");
    const sem = html({ tipo: "sem-acesso" });
    expect(sem).toContain("O login do painel não consegue ler as versões");
    expect(sem).toContain("ssace-versoes");
    // Pode ser um erro passageiro do GitHub que apagou o repositório da resposta: dá pra tentar de novo.
    expect(sem).toContain("Tentar de novo");
    const erro = html({ tipo: "erro", mensagem: "deu ruim" });
    expect(erro).toContain("deu ruim");
    expect(erro).toContain("Tentar de novo");
  });

  it("a que está nas lojas, quando ficou fora das 20, aparece acima da lista (nunca some)", () => {
    const fora = versao("v0.9.30", "liberada", { nasLojas: true, publicadaEm: local(2026, 8, 1) });
    const h = html({ tipo: "pronto", resposta: { versoes: [versao("v0.9.60", "teste")], nasLojasForaDaLista: fora } });
    expect(h.match(/Nas lojas hoje/g)).toHaveLength(1);
    expect(h).toContain("v0.9.30");
    expect(h).toContain("01/08/2026");
    expect(h.indexOf("v0.9.30")).toBeLessThan(h.indexOf("v0.9.60"));
    expect(h).toContain(`href="${URL}v0.9.30"`);
  });
});

describe("carregarVersoes (#649)", () => {
  it("passa a que está nas lojas fora da lista, com o link conferido; fora do formato, ignora", async () => {
    const v = { versao: "v0.9.30", canal: "liberada", nasLojas: true, publicadaEm: "2026-08-01T12:00:00Z", url: "https://exemplo.com/x" };
    const r = await carregarVersoes(async () => new Response(JSON.stringify({ versoes: [], nasLojasForaDaLista: v }), { status: 200 }));
    expect(r).toEqual({ tipo: "pronto", resposta: { versoes: [], nasLojasForaDaLista: { versao: "v0.9.30", canal: "liberada", nasLojas: true, publicadaEm: "2026-08-01T12:00:00Z" } } });
    const ruim = await carregarVersoes(async () => new Response(JSON.stringify({ versoes: [], nasLojasForaDaLista: { versao: 3 } }), { status: 200 }));
    expect(ruim).toEqual({ tipo: "pronto", resposta: { versoes: [] } });
  });

  const resp = (corpo: unknown, status = 200) => async () => new Response(JSON.stringify(corpo), { status });
  const ok = (versoes: unknown[]) => resp({ versoes });

  it("200 ok: pronto; link fora da sakura-corp é descartado", async () => {
    const e = await carregarVersoes(ok([
      { versao: "v0.9.60", canal: "teste", publicadaEm: local(2026, 10, 20), url: "https://exemplo.com/x" },
      { versao: "v0.9.58", canal: "liberada", nasLojas: true, publicadaEm: local(2026, 10, 18), url: `${URL}v0.9.58` },
    ]));
    if (e.tipo !== "pronto") throw new Error("devia estar pronto");
    expect(e.resposta.versoes.map((v) => v.url)).toEqual([undefined, `${URL}v0.9.58`]);
    expect(e.resposta.versoes[1].nasLojas).toBe(true);
  });
  it("busca /api/versoes", async () => {
    let visto = "";
    await carregarVersoes(async (endereco) => { visto = endereco; return new Response("{}", { status: 500 }); });
    expect(visto).toBe("/api/versoes");
  });
  it("200 fora do formato: erro", async () => {
    for (const corpo of [null, {}, { versoes: "x" }, { versoes: [{ versao: 1, canal: "teste", publicadaEm: "2026-10-01T00:00:00Z" }] }, { versoes: [{ versao: "v1", canal: "outro", publicadaEm: "2026-10-01T00:00:00Z" }] }, { versoes: [{ versao: "v1", canal: "teste", publicadaEm: "ontem" }] }]) {
      expect((await carregarVersoes(resp(corpo))).tipo, JSON.stringify(corpo)).toBe("erro");
    }
    expect((await carregarVersoes(async () => new Response("não é json", { status: 200 }))).tipo).toBe("erro");
  });
  it("401: fora", async () => {
    expect(await carregarVersoes(resp({}, 401))).toEqual({ tipo: "fora" });
  });
  it("502 com o erro de acesso: sem-acesso; 502 comum: erro com tentar de novo", async () => {
    expect(await carregarVersoes(resp({ ok: false, erro: ERRO_SEM_ACESSO_AS_VERSOES }, 502))).toEqual({ tipo: "sem-acesso" });
    const e = await carregarVersoes(resp({ ok: false, erro: "outra coisa" }, 502));
    expect(e).toEqual({ tipo: "erro", mensagem: "Não deu pra buscar as versões no GitHub agora." });
    expect((await carregarVersoes(async () => new Response("<html>", { status: 502 }))).tipo).toBe("erro");
  });
  it("fetch que lança: erro de conexão", async () => {
    const e = await carregarVersoes(async () => { throw new Error("rede"); });
    expect(e).toEqual({ tipo: "erro", mensagem: "Sem conexão com o painel. Confira a internet." });
  });
  it("reordena no cliente (a mais nova em cima)", async () => {
    const e = await carregarVersoes(ok([
      { versao: "v0.9.9", canal: "liberada", publicadaEm: local(2026, 10, 1) },
      { versao: "v0.9.60", canal: "teste", publicadaEm: local(2026, 10, 2) },
    ]));
    if (e.tipo !== "pronto") throw new Error("devia estar pronto");
    expect(e.resposta.versoes.map((v) => v.versao)).toEqual(["v0.9.60", "v0.9.9"]);
  });
});

describe("PaginaVersoes (#649)", () => {
  it("cabeçalho com a trilha, o título e a explicação; sem login não busca e avisa", () => {
    let buscou = false;
    const h = renderToString(<PaginaVersoes semLogin buscar={async () => { buscou = true; return new Response("{}"); }} />).replace(/<!-- -->/g, "");
    expect(h).toMatch(/<h1[^>]*>Versões<\/h1>/);
    expect(h).toContain("4º · Segurança e operação");
    expect(h).toContain("As últimas 20 versões do programa das lojas, a mais nova em cima.");
    expect(h).toContain("Sem login, a lista não abre. Entre pelo painel de verdade.");
    expect(buscou).toBe(false);
  });
  it("com login: começa em 'carregando'", () => {
    expect(renderToString(<PaginaVersoes buscar={async () => new Response("{}")} />)).toContain("Buscando");
  });
});

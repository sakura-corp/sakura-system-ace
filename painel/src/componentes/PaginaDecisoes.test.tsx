import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RespostaDasDecisoes } from "../../worker/decisoes";
import { carregarDecisoes, ConteudoDasDecisoes, diasAberta, ordenarDecisoes, PaginaDecisoes, prazoDoTitulo, textoDosDias, textoDoPrazo, type EstadoDasDecisoes } from "./PaginaDecisoes";

// Datas locais (o dia que a pessoa vê), em qualquer fuso do computador.
const local = (a: number, m: number, d: number, h = 12, min = 0) => new Date(a, m - 1, d, h, min);
const iso = (a: number, m: number, d: number, h = 12) => local(a, m, d, h).toISOString();
const HOJE = local(2026, 10, 21);
const URL = "https://github.com/sakura-corp/sakura-system-ace/issues/";

describe("diasAberta (#648)", () => {
  it("conta dias de calendário locais: aberta às 23h de ontem, vista à 1h de hoje, é 1 dia", () => {
    expect(diasAberta(iso(2026, 10, 20, 23), local(2026, 10, 21, 1))).toBe(1);
  });
  it("hoje é 0; há 5 dias é 5; data no futuro não fica negativa", () => {
    expect(diasAberta(iso(2026, 10, 21, 8), HOJE)).toBe(0);
    expect(diasAberta(iso(2026, 10, 16, 8), HOJE)).toBe(5);
    expect(diasAberta(iso(2026, 10, 25, 8), HOJE)).toBe(0);
  });
  it("contas longas (um mês, um ano) dão o número certo de dias", () => {
    expect(diasAberta(iso(2026, 3, 1, 0), local(2026, 3, 31, 23))).toBe(30);
    expect(diasAberta(iso(2026, 1, 1, 0), local(2026, 12, 31, 0))).toBe(364);
  });
  it("o texto: hoje, 1 dia, N dias", () => {
    expect(textoDosDias(0)).toBe("aberta hoje");
    expect(textoDosDias(1)).toBe("aberta há 1 dia");
    expect(textoDosDias(12)).toBe("aberta há 12 dias");
  });
});

describe("prazoDoTitulo (#648)", () => {
  const faltam = (titulo: string, agora = HOJE) => prazoDoTitulo(titulo, agora)?.faltam;
  it("sem prazo no título: null", () => {
    expect(prazoDoTitulo("Decidir o memorando", HOJE)).toBeNull();
    expect(prazoDoTitulo("Revisar até amanhã", HOJE)).toBeNull();
  });
  it("Até/até/ATÉ, 1 ou 2 dígitos, com ou sem ano", () => {
    expect(prazoDoTitulo("Memorando. Até 26/10", HOJE)).toEqual({ dia: 26, mes: 10, ano: 2026, faltam: 5 });
    expect(prazoDoTitulo("memorando até 26/10", HOJE)).toMatchObject({ dia: 26, mes: 10, faltam: 5 });
    expect(prazoDoTitulo("MEMORANDO ATÉ 5/11", HOJE)).toMatchObject({ dia: 5, mes: 11, faltam: 15 });
    expect(prazoDoTitulo("Até 26/10/2026", HOJE)).toEqual({ dia: 26, mes: 10, ano: 2026, faltam: 5 });
  });
  it("os casos de dias que faltam: 4, 3, 1, 0 e -2", () => {
    expect(faltam("até 25/10")).toBe(4);
    expect(faltam("até 24/10")).toBe(3);
    expect(faltam("até 22/10")).toBe(1);
    expect(faltam("até 21/10")).toBe(0);
    expect(faltam("até 19/10")).toBe(-2);
  });
  it("data que não existe: null", () => {
    for (const t of ["até 31/02", "até 32/10", "até 10/13", "até 00/10", "até 10/00", "até 29/02/2027"]) expect(prazoDoTitulo(t, HOJE), t).toBeNull();
  });
  it("só palavra inteira: 'até' dentro de outra palavra não conta", () => {
    expect(prazoDoTitulo("Atéria 10/11", HOJE)).toBeNull();
    expect(prazoDoTitulo("batéé 10/11", HOJE)).toBeNull();
  });
  it("virada de ano: sem ano, o prazo é do ano em que a issue foi aberta (ou do seguinte, se cair antes da abertura)", () => {
    const dez = local(2026, 12, 20);
    // Aberta em dezembro com "até 05/01": é janeiro do ano que vem.
    expect(prazoDoTitulo("até 05/01", dez, dez)).toEqual({ dia: 5, mes: 1, ano: 2027, faltam: 16 });
    // Aberta antes do prazo e vista depois: continua do mesmo ano, e aparece como passou do prazo.
    expect(prazoDoTitulo("até 10/12", dez, local(2026, 12, 1))).toMatchObject({ ano: 2026, faltam: -10 });
    expect(prazoDoTitulo("até 05/01", local(2026, 1, 20), local(2026, 1, 2))).toMatchObject({ ano: 2026, faltam: -15 });
  });
  it("prazo do ano passado continua passado: 'até 28/12' aberta em dezembro e vista em janeiro passou do prazo", () => {
    expect(prazoDoTitulo("até 28/12", local(2027, 1, 3), local(2026, 12, 10))).toMatchObject({ ano: 2026, faltam: -6 });
    // Vencida há 9 meses não vira "daqui a quase um ano".
    expect(prazoDoTitulo("até 05/01", local(2026, 10, 21), local(2026, 1, 2))).toMatchObject({ ano: 2026, faltam: -289 });
  });
  it("'até 29/02' sem ano vai pro próximo ano bissexto depois da abertura", () => {
    expect(prazoDoTitulo("até 29/02", local(2027, 9, 10), local(2027, 9, 1))).toMatchObject({ ano: 2028 });
  });
  it("com ano explícito, o ano não muda nunca", () => {
    expect(prazoDoTitulo("até 05/01/2026", local(2026, 12, 20))).toMatchObject({ ano: 2026, faltam: -349 });
    expect(prazoDoTitulo("até 05/01/2027", local(2026, 12, 20))).toMatchObject({ ano: 2027, faltam: 16 });
  });
  it("o horário do dia não muda a conta (às 23h59 e às 00h01)", () => {
    expect(faltam("até 24/10", local(2026, 10, 21, 0, 1))).toBe(3);
    expect(faltam("até 24/10", local(2026, 10, 21, 23, 59))).toBe(3);
  });
});

describe("textoDoPrazo e o destaque (#648)", () => {
  const t = (n: number) => textoDoPrazo(n);
  it("o texto de cada caso", () => {
    expect(t(5)).toMatchObject({ destaque: false });
    expect(t(4)).toMatchObject({ destaque: false });
    expect(t(3)).toEqual({ destaque: true, texto: "faltam 3 dias" });
    expect(t(2)).toEqual({ destaque: true, texto: "faltam 2 dias" });
    expect(t(1)).toEqual({ destaque: true, texto: "falta 1 dia" });
    expect(t(0)).toEqual({ destaque: true, texto: "vence hoje" });
    expect(t(-2)).toEqual({ destaque: true, texto: "passou do prazo" });
  });
});

describe("ordenarDecisoes (#648)", () => {
  it("a mais antiga em cima; empate pelo número", () => {
    const d = (numero: number, abertaEm: string) => ({ numero, titulo: `T${numero}`, abertaEm });
    const r = ordenarDecisoes([d(3, "2026-10-15T10:00:00Z"), d(1, "2026-09-01T10:00:00Z"), d(2, "2026-10-01T10:00:00Z"), d(4, "2026-10-01T10:00:00Z")]);
    expect(r.map((x) => x.numero)).toEqual([1, 2, 4, 3]);
  });
  it("não mexe na lista de entrada", () => {
    const entrada = [{ numero: 2, titulo: "b", abertaEm: "2026-10-02T00:00:00Z" }, { numero: 1, titulo: "a", abertaEm: "2026-10-01T00:00:00Z" }];
    ordenarDecisoes(entrada);
    expect(entrada[0].numero).toBe(2);
  });
});

// ---- O que aparece na tela ----
const pronto = (r: Partial<RespostaDasDecisoes>): EstadoDasDecisoes => ({ tipo: "pronto", resposta: { decisoes: [], total: 0, ...r } });
const html = (estado: EstadoDasDecisoes, agora = HOJE) => renderToString(<ConteudoDasDecisoes estado={estado} agora={agora} tentarDeNovo={() => {}} />).replace(/<!-- -->/g, "");
const decisao = (numero: number, titulo: string, abertaEm = iso(2026, 10, 11), url: string | null = `${URL}${numero}`) => ({ numero, titulo, abertaEm, ...(url ? { url } : {}) });
const TODAS = "https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aissue+is%3Aopen+label%3Asofia";

describe("ConteudoDasDecisoes (#648)", () => {
  it("lista vazia: 'Nada esperando a Sofia agora.'", () => {
    const h = html(pronto({}));
    expect(h).toContain("Nada esperando a Sofia agora.");
    expect(h).not.toContain("<ol");
  });

  it("a ordem na tela é a da lista: a mais antiga em cima", () => {
    const h = html(pronto({ decisoes: [decisao(10, "Velha"), decisao(20, "Nova")], total: 2 }));
    expect(h.indexOf("Velha")).toBeGreaterThan(-1);
    expect(h.indexOf("Velha")).toBeLessThan(h.indexOf("Nova"));
  });

  it("cada linha: título como link em aba nova, número, dias aberta", () => {
    const h = html(pronto({ decisoes: [decisao(10, "Escolher o banco")], total: 1 }));
    expect(h).toContain("<ol");
    expect(h).toContain(`href="${URL}10"`);
    expect(h).toContain('target="_blank"');
    expect(h).toContain('rel="noopener noreferrer"');
    expect(h).toContain("(abre em aba nova)");
    expect(h).toContain("Escolher o banco");
    expect(h).toContain("#10");
    expect(h).toContain("aberta há 10 dias");
    expect(h).toContain("min-w-0");
    expect(h).toContain("break-words");
  });

  it("sem link seguro: só o texto, sem <a> na linha", () => {
    const h = html(pronto({ decisoes: [decisao(10, "Sem link", iso(2026, 10, 11), null)], total: 1 }));
    expect(h).toContain("Sem link");
    expect(h).not.toContain(`${URL}10`);
  });

  it("prazo com 3 dias ou menos ganha o selo de revisão, com texto; com 4 dias fica discreto", () => {
    const com = html(pronto({ decisoes: [decisao(1, "Memorando até 24/10")], total: 1 }));
    expect(com).toContain("bg-revisao-fundo");
    expect(com).toContain("faltam 3 dias");
    const sem = html(pronto({ decisoes: [decisao(1, "Memorando até 25/10")], total: 1 }));
    expect(sem).not.toContain("bg-revisao-fundo");
    expect(sem).toContain("prazo 25/10");
  });

  it("vence hoje e passou do prazo aparecem destacados", () => {
    expect(html(pronto({ decisoes: [decisao(1, "X até 21/10")], total: 1 }))).toContain("vence hoje");
    const passou = html(pronto({ decisoes: [decisao(1, "X até 19/10")], total: 1 }));
    expect(passou).toContain("passou do prazo");
    expect(passou).toContain("bg-revisao-fundo");
  });

  it("título sem prazo: nada de prazo na linha", () => {
    const h = html(pronto({ decisoes: [decisao(1, "Sem data nenhuma")], total: 1 }));
    expect(h).not.toContain("prazo");
    expect(h).not.toContain("bg-revisao-fundo");
  });

  it("o título é texto: um <script> no título aparece escrito e não vira tag", () => {
    const h = html(pronto({ decisoes: [decisao(1, "<script>alert(1)</script>")], total: 1 }));
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
  });

  it("rodapé: link pra lista no GitHub; o aviso só quando tem mais do que cabe", () => {
    const h = html(pronto({ decisoes: [decisao(1, "A")], total: 1 }));
    expect(h).toContain(`href="${TODAS}"`);
    expect(h).toContain("Ver a lista no GitHub");
    expect(h).not.toContain("Mostrando as");
    const cem = Array.from({ length: 100 }, (_, i) => decisao(i + 1, `D${i + 1}`));
    const mais = html(pronto({ decisoes: cem, total: 130, maisDoQueCabe: true }));
    expect(mais).toContain("Mostrando as 100 mais antigas de 130.");
    // O número é o que veio na lista, não uma cópia do 100 da consulta.
    expect(html(pronto({ decisoes: cem.slice(0, 98), total: 130, maisDoQueCabe: true }))).toContain("Mostrando as 98 mais antigas de 130.");
  });

  it("carregando, sessão acabada e erro", () => {
    expect(html({ tipo: "carregando" })).toContain('role="status"');
    expect(html({ tipo: "fora" })).toContain("A sessão acabou.");
    const erro = html({ tipo: "erro", mensagem: "deu ruim" });
    expect(erro).toContain("deu ruim");
    expect(erro).toContain("Tentar de novo");
  });
});

describe("carregarDecisoes (#648)", () => {
  const resp = (corpo: unknown, status = 200) => async () => new Response(JSON.stringify(corpo), { status });
  it("lê a resposta e confere o formato; link fora da sakura-corp é descartado", async () => {
    const e = await carregarDecisoes(resp({ decisoes: [{ numero: 1, titulo: "A", abertaEm: iso(2026, 10, 1), url: "https://exemplo.com/1" }, { numero: 2, titulo: "B", abertaEm: iso(2026, 10, 2), url: `${URL}2` }], total: 2 }));
    expect(e.tipo).toBe("pronto");
    if (e.tipo !== "pronto") return;
    expect(e.resposta.decisoes.map((d) => d.url)).toEqual([undefined, `${URL}2`]);
  });
  it("busca /api/decisoes", async () => {
    let visto = "";
    await carregarDecisoes(async (endereco) => { visto = endereco; return new Response("{}", { status: 500 }); });
    expect(visto).toBe("/api/decisoes");
  });
  it("401: fora; erro do servidor, rede caída, corpo estranho: erro", async () => {
    expect(await carregarDecisoes(resp({}, 401))).toEqual({ tipo: "fora" });
    expect((await carregarDecisoes(resp({}, 502))).tipo).toBe("erro");
    expect((await carregarDecisoes(async () => { throw new Error("rede"); })).tipo).toBe("erro");
    expect((await carregarDecisoes(resp({ decisoes: "x", total: 1 }))).tipo).toBe("erro");
    expect((await carregarDecisoes(resp({ decisoes: [{ numero: "1", titulo: "A", abertaEm: "x" }], total: 1 }))).tipo).toBe("erro");
    expect((await carregarDecisoes(resp(null))).tipo).toBe("erro");
  });
  it("reordena no cliente também", async () => {
    const e = await carregarDecisoes(resp({ decisoes: [{ numero: 2, titulo: "B", abertaEm: iso(2026, 10, 5) }, { numero: 1, titulo: "A", abertaEm: iso(2026, 10, 1) }], total: 2 }));
    if (e.tipo !== "pronto") throw new Error("devia estar pronto");
    expect(e.resposta.decisoes.map((d) => d.numero)).toEqual([1, 2]);
  });
});

describe("PaginaDecisoes (#648)", () => {
  it("cabeçalho com a trilha, o título e a explicação; sem login não busca e avisa", () => {
    let buscou = false;
    const h = renderToString(<PaginaDecisoes semLogin buscar={async () => { buscou = true; return new Response("{}"); }} />).replace(/<!-- -->/g, "");
    expect(h).toMatch(/<h1[^>]*>Decisões da Sofia<\/h1>/);
    expect(h).toContain("Cobertura · Diretoria");
    expect(h).toContain("O que está esperando uma decisão da Sofia, a mais antiga em cima.");
    expect(h).toContain("Sem login, a lista não abre. Entre pelo painel de verdade.");
    expect(buscou).toBe(false);
  });
  it("com login: começa em 'carregando'", () => {
    expect(renderToString(<PaginaDecisoes buscar={async () => new Response("{}")} />)).toContain("Buscando");
  });
  it("não tem botão que escreva no GitHub", () => {
    const h = html(pronto({ decisoes: [decisao(1, "A")], total: 1 }));
    expect(h).not.toContain("<button");
    expect(h).not.toContain("<form");
  });
});

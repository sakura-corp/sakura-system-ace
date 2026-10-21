import { describe, expect, it } from "vitest";
import { EM_BREVE, enderecoEmBreve, idDoEmBreve, problemasDoEmBreve, textoEmBreve, type TextoEmBreve } from "./emBreve";
import { NAVEGACAO, type GrupoDaNavegacao } from "./navegacao";

const nav: GrupoDaNavegacao[] = [
  { id: "seguranca", titulo: "4º · Segurança e operação", itens: [{ id: "versoes", rotulo: "Versões", icone: "etiqueta", emBreve: true, dependeDe: "x", href: "/em-breve/versoes" }] },
  { id: "comercial", titulo: "2º · Comercial e pós-venda", itens: [{ id: "lojas", rotulo: "Lojas", icone: "loja", emBreve: true, dependeDe: "x", href: "/em-breve/lojas" }] },
  {
    id: "financeiro",
    titulo: "3º · Financeiro",
    itens: [
      { id: "financeiro", rotulo: "Financeiro", icone: "cartao", emBreve: true, dependeDe: "x", href: "/em-breve/financeiro" },
      { id: "dre", rotulo: "DRE", icone: "grafico", emBreve: true, dependeDe: "x", href: "/em-breve/dre" },
    ],
  },
];
const base = (id: TextoEmBreve["id"], titulo: string, extra: Partial<TextoEmBreve> = {}): TextoEmBreve => ({
  id,
  titulo,
  subtitulo: "s",
  resumo: "r",
  vaiMostrar: ["a"],
  dependeDe: [{ texto: "b" }],
  ...extra,
});
const bons = (): TextoEmBreve[] => [
  base("versoes", "Versões", { grupo: "4º · Segurança e operação" }),
  base("lojas", "Lojas", { grupo: "2º · Comercial e pós-venda", semDinheiro: true }),
  base("financeiro", "Financeiro", { grupo: "3º · Financeiro", semDinheiro: true }),
  base("dre", "DRE", { grupo: "3º · Financeiro", semDinheiro: true }),
];

describe("problemasDoEmBreve", () => {
  it("os textos de verdade batem com a navegação de verdade", () => {
    expect(problemasDoEmBreve(NAVEGACAO, EM_BREVE)).toEqual([]);
  });
  it("dados de mentira corretos passam", () => {
    expect(problemasDoEmBreve(nav, bons())).toEqual([]);
  });
  it("pega item em breve sem texto", () => {
    expect(problemasDoEmBreve(nav, bons().filter((t) => t.id !== "dre")).join("|")).toContain('"DRE" não tem texto');
  });
  it("pega texto sobrando", () => {
    expect(problemasDoEmBreve(nav, [...bons(), base("pessoas", "Pessoas")]).join("|")).toContain('"pessoas"');
  });
  it("pega título diferente do rótulo", () => {
    const t = bons();
    t[0].titulo = "Outro";
    expect(problemasDoEmBreve(nav, t)).toHaveLength(1);
  });
  it("pega R$ no Financeiro", () => {
    const t = bons();
    t[2].vaiMostrar = ["Saldo de R$ 10"];
    expect(problemasDoEmBreve(nav, t).join("|")).toContain("Financeiro");
  });
  it("pega número com vírgula na DRE", () => {
    const t = bons();
    t[3].resumo = "Resultado 1.234,56";
    expect(problemasDoEmBreve(nav, t).join("|")).toContain("DRE");
  });
  it("pega qualquer algarismo na Empresa, mesmo sem vírgula nem R$", () => {
    for (const frase of ["Custo de 1.500 por loja", "Margem de 30%", "500 reais"]) {
      const t = bons();
      t[2].dependeDe = [{ texto: "b", detalhe: frase }];
      expect(problemasDoEmBreve(nav, t).join("|"), frase).toContain("Financeiro");
    }
  });
  it("a proteção de dinheiro vale pelo item, não pelo andar: Lojas (2º andar) com algarismo ou sem semDinheiro reprova (#591)", () => {
    const comNumero = bons();
    comNumero[1].resumo = "Custo de 1.500 por loja";
    expect(problemasDoEmBreve(nav, comNumero).join("|")).toContain("Lojas");
    const semAviso = bons();
    delete semAviso[1].semDinheiro;
    expect(problemasDoEmBreve(nav, semAviso).join("|")).toContain("semDinheiro");
  });
  it("o Pós-venda (mesmo andar da Lojas) pode ter número no texto: a proteção não vaza pro andar inteiro", () => {
    const n: GrupoDaNavegacao[] = [{ ...nav[1], itens: [...nav[1].itens, { id: "posvenda", rotulo: "Pós-venda", icone: "suporte", emBreve: true, dependeDe: "x", href: "/em-breve/posvenda" }] }];
    const t = [bons()[1], base("posvenda", "Pós-venda", { grupo: "2º · Comercial e pós-venda", resumo: "Retorno em 30 dias" })];
    expect(problemasDoEmBreve(n, t)).toEqual([]);
  });
  it("pega trilha com o grupo errado", () => {
    const t = bons();
    t[2].grupo = "1º · Produção";
    expect(problemasDoEmBreve(nav, t).join("|")).toContain('A trilha de "Financeiro"');
  });
  it("as páginas de verdade: a trilha de cada uma é o título do andar, e a das Decisões (#648) saiu do em breve", () => {
    const trilha = (id: string) => textoEmBreve(id)?.grupo;
    expect(textoEmBreve("versoes")).toBeUndefined(); // as Versões (#649) saíram do em breve
    expect(textoEmBreve("pessoas")).toBeUndefined(); // as Pessoas (#650) saíram do em breve
    expect(trilha("lojas")).toBe("2º · Comercial e pós-venda");
    expect(trilha("dre")).toBe("3º · Financeiro");
    expect(trilha("posvenda")).toBe("2º · Comercial e pós-venda");
    expect(trilha("bancos")).toBe("4º · Segurança e operação");
    expect(textoEmBreve("decisoes")).toBeUndefined();
    expect(textoEmBreve("configuracoes")?.grupo).toBeUndefined();
  });
  it("lojas e DRE continuam com semDinheiro nos textos de verdade", () => {
    for (const id of ["lojas", "dre"]) expect(textoEmBreve(id)?.semDinheiro, id).toBe(true);
  });
  it("pega página da Empresa sem semDinheiro", () => {
    const t = bons();
    delete t[2].semDinheiro;
    expect(problemasDoEmBreve(nav, t).join("|")).toContain("semDinheiro");
  });
});

describe("idDoEmBreve e textoEmBreve", () => {
  it("lê o id do caminho", () => {
    expect(idDoEmBreve("/em-breve/financeiro")).toBe("financeiro");
    expect(idDoEmBreve("/em-breve/financeiro/")).toBe("financeiro");
    expect(idDoEmBreve("/em-breve/")).toBeNull();
    expect(idDoEmBreve("/em-breve")).toBeNull();
    expect(idDoEmBreve("/em-breve/a/b")).toBeNull();
    expect(idDoEmBreve("/sala")).toBeNull();
  });
  it("monta o endereço", () => {
    expect(enderecoEmBreve("dre")).toBe("/em-breve/dre");
  });
  it("id que não existe → undefined", () => {
    expect(textoEmBreve("nao-existe")).toBeUndefined();
    // O Financeiro já existe (#654): não tem mais texto "em breve".
    expect(textoEmBreve("financeiro")).toBeUndefined();
    expect(textoEmBreve("dre")?.titulo).toBe("DRE");
  });
});

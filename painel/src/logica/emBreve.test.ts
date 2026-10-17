import { describe, expect, it } from "vitest";
import { EM_BREVE, enderecoEmBreve, idDoEmBreve, problemasDoEmBreve, textoEmBreve, type TextoEmBreve } from "./emBreve";
import { NAVEGACAO, type GrupoDaNavegacao } from "./navegacao";

const nav: GrupoDaNavegacao[] = [
  { id: "trabalho", titulo: "Trabalho", itens: [{ id: "versoes", rotulo: "Versões", icone: "etiqueta", emBreve: true, dependeDe: "x", href: "/em-breve/versoes" }] },
  {
    id: "empresa",
    titulo: "Empresa",
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
  base("versoes", "Versões", { grupo: "Trabalho" }),
  base("financeiro", "Financeiro", { grupo: "Empresa", semDinheiro: true }),
  base("dre", "DRE", { grupo: "Empresa", semDinheiro: true }),
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
    expect(problemasDoEmBreve(nav, [...bons(), base("lojas", "Lojas")]).join("|")).toContain('"lojas"');
  });
  it("pega título diferente do rótulo", () => {
    const t = bons();
    t[0].titulo = "Outro";
    expect(problemasDoEmBreve(nav, t)).toHaveLength(1);
  });
  it("pega R$ no Financeiro", () => {
    const t = bons();
    t[1].vaiMostrar = ["Saldo de R$ 10"];
    expect(problemasDoEmBreve(nav, t).join("|")).toContain("Financeiro");
  });
  it("pega número com vírgula na DRE", () => {
    const t = bons();
    t[2].resumo = "Resultado 1.234,56";
    expect(problemasDoEmBreve(nav, t).join("|")).toContain("DRE");
  });
  it("pega qualquer algarismo na Empresa, mesmo sem vírgula nem R$", () => {
    for (const frase of ["Custo de 1.500 por loja", "Margem de 30%", "500 reais"]) {
      const t = bons();
      t[1].dependeDe = [{ texto: "b", detalhe: frase }];
      expect(problemasDoEmBreve(nav, t).join("|"), frase).toContain("Financeiro");
    }
  });
  it("pega trilha com o grupo errado", () => {
    const t = bons();
    t[1].grupo = "Equipe";
    expect(problemasDoEmBreve(nav, t).join("|")).toContain('A trilha de "Financeiro"');
  });
  it("pega página da Empresa sem semDinheiro", () => {
    const t = bons();
    delete t[1].semDinheiro;
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
    expect(textoEmBreve("financeiro")?.titulo).toBe("Financeiro");
  });
});

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarraLateral } from "./BarraLateral";

const html = (props: Parameters<typeof BarraLateral>[0]) => renderToString(<BarraLateral {...props} />).replace(/<!-- -->/g, "");

describe("BarraLateral", () => {
  it("desenha os grupos da lista; só o item da página tem aria-current", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: true }], pagina: "sala" });
    for (const t of ["Sala", "Escritório", "(exemplo)"]) expect(h).toContain(t);
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).toMatch(/<a href="\/sala" aria-current="page"/);
  });

  it("página não encontrada (#560): nenhum item da barra é a página atual", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: true }], pagina: "nao-encontrada" });
    expect(h).not.toContain("aria-current");
  });

  it("item em breve é link pra página que explica (#544), apagado, com o texto pro leitor de tela e a frase do que falta", () => {
    const h = html({ levas: [] });
    expect(h).not.toContain("aria-disabled");
    expect(h).toMatch(/<a href="\/em-breve\/versoes"[^>]*>(?:(?!<\/a>).)*Versões<span class="sr-only"> \(em breve\)<\/span>/);
    expect(h).toContain("depende da leva 2");
    // Os 4 que existem (Início, Leva atual, Sala e Escritório) e os 12 em breve (9 de antes + os 3 dos andares novos).
    expect(h.match(/<a /g)).toHaveLength(16);
    expect(h.match(/<a href="\/em-breve\//g)).toHaveLength(12);
  });

  it("os 6 andares aparecem na ordem da tabela (#591), com os itens de cada um, e os nomes antigos dos grupos somem", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: true }] });
    const andares: [string, string[]][] = [
      ["Térreo · Recepção", ["Início"]],
      ["1º · Produção", ["Leva atual", "Levas anteriores", "Fases da leva", "Relatório da leva", "Sala", "Escritório", "Pessoas"]],
      ["2º · Comercial e pós-venda", ["Lojas", "Pós-venda"]],
      ["3º · Financeiro", ["Financeiro", "DRE"]],
      ["4º · Segurança e operação", ["Versões", "Bancos e backups"]],
      ["Cobertura · Diretoria", ["Decisões da Sofia"]],
    ];
    // Tudo numa fila só: título do andar, seus itens, título do próximo andar... e por fim as Configurações.
    const fila = andares.flatMap(([titulo, itens]) => [titulo, ...itens]);
    const posicoes = fila.map((t) => h.indexOf(t));
    expect(posicoes.every((n) => n >= 0), fila.filter((t) => h.indexOf(t) < 0).join(", ")).toBe(true);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    expect(h.indexOf("Configurações")).toBeGreaterThan(posicoes.at(-1) as number);
    for (const antigo of ["Trabalho", "Equipe", "Empresa"]) expect(h, antigo).not.toContain(antigo);
  });

  it("os chefes de cada andar não aparecem na barra (ficam na página em breve)", () => {
    const h = html({ levas: [] });
    expect(h).not.toContain("quem cuida");
    expect(h).not.toContain("tester");
    expect(h).not.toContain("marketing");
  });

  it("na página em breve aberta, só ela tem aria-current", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: false }], pagina: "financeiro" });
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).toMatch(/<a href="\/em-breve\/financeiro" aria-current="page"/);
  });

  it("no Início (#546), o Início é a página e a Leva atual não", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: true }], pagina: "inicio" });
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).toMatch(/<a href="\/" aria-current="page"/);
    expect(h).toMatch(/<a href="\/leva"(?![^>]*aria-current)/);
  });

  it("leva na tela que não é a atual aparece abaixo de Leva atual; a atual deixa de ser a página", () => {
    const h = html({ levas: [{ nome: "Leva 0", href: "/leva/0", atual: true }], pagina: "leva" });
    expect(h).toMatch(/<a href="\/leva"(?![^>]*aria-current)/);
    expect(h).toMatch(/<a href="\/leva\/0" aria-current="page"/);
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
  });
});

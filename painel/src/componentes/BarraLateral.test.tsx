import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarraLateral } from "./BarraLateral";

const html = (props: Parameters<typeof BarraLateral>[0]) => renderToString(<BarraLateral {...props} />).replace(/<!-- -->/g, "");

/** O elemento <div> que começa em `inicio`, até o </div> que o fecha (conta só <div>, que é como a barra se organiza). */
function divDe(h: string, inicio: number): string {
  let fundo = 0;
  for (const m of h.slice(inicio).matchAll(/<div[\s>]|<\/div>/g)) {
    fundo += m[0] === "</div>" ? -1 : 1;
    if (fundo === 0) return h.slice(inicio, inicio + m.index! + m[0].length);
  }
  return h.slice(inicio);
}

describe("BarraLateral", () => {
  it("Configurações e o usuário ficam fora da parte que rola, então aparecem sem rolar em tela baixa (#601)", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: true }], pagina: "leva", usuario: { login: "sofia", avatar: "" } });
    const marca = h.indexOf("overflow-y-auto");
    expect(marca, "tem que existir uma parte que rola").toBeGreaterThan(-1);
    // A barra inteira não rola mais: quem rola é só a lista dos andares.
    expect(h.slice(0, h.indexOf(">")), "a própria barra").not.toContain("overflow-y-auto");
    const rolavel = divDe(h, h.lastIndexOf("<div", marca));
    // Sem o min-h-0 a lista não encolhe e empurra o rodapé pra fora da tela; a margem negativa com o mesmo
    // enchimento deixa o contorno de foco (que sai uns 4 px do link) caber dentro da parte que rola.
    const abertura = rolavel.slice(0, rolavel.indexOf(">"));
    expect(abertura).toContain("min-h-0");
    expect(abertura).toContain("flex-1");
    expect(abertura).toContain("-mx-3");
    expect(abertura).toContain("px-3");
    expect(rolavel).toContain("Leva atual");
    expect(rolavel).toContain("Decisões da Sofia");
    expect(rolavel).not.toContain("Configurações");
    expect(rolavel).not.toContain("Sair");
    const depois = h.slice(h.indexOf(rolavel) + rolavel.length);
    expect(depois).toContain("Configurações");
    expect(depois).toContain("Sair");
  });

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
    // Os 7 que existem (Início, Leva atual, Levas anteriores, Relatório da leva #647, Sala, Escritório e Financeiro #654) e os 9 em breve (as Levas anteriores, o Financeiro e o Relatório já existem).
    expect(h.match(/<a /g)).toHaveLength(16);
    expect(h.match(/<a href="\/em-breve\//g)).toHaveLength(9);
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
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: false }], pagina: "dre" });
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).toMatch(/<a href="\/em-breve\/dre" aria-current="page"/);
  });

  it("no Financeiro (#654), o item é um link de verdade (/financeiro), sem cadeado, e é a página atual", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: false }], pagina: "financeiro" });
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).toMatch(/<a href="\/financeiro" aria-current="page"/);
    expect(h).not.toContain("Financeiro<span class=\"sr-only\"> (em breve)</span>");
  });

  it("no Início (#546), o Início é a página e a Leva atual não", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: true }], pagina: "inicio" });
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).toMatch(/<a href="\/" aria-current="page"/);
    expect(h).toMatch(/<a href="\/leva"(?![^>]*aria-current)/);
  });

  it("leva antiga na tela (/leva/0): o destaque vai pras Levas anteriores, e não pra Leva atual", () => {
    const h = html({ levas: [{ nome: "Leva 0", href: "/leva/0", atual: true }], pagina: "leva" });
    expect(h).toMatch(/<a href="\/levas" aria-current="page"/);
    expect(h).toMatch(/<a href="\/leva"(?![^>]*aria-current)/);
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("as outras levas não aparecem mais abaixo de Leva atual: elas moram nas Levas anteriores", () => {
    const levas = [
      { nome: "Leva 2", href: "/leva", atual: true },
      { nome: "Leva 1", href: "/leva/1", atual: false },
      { nome: "Leva 0", href: "/leva/0", atual: false },
    ];
    const h = html({ levas, pagina: "leva" });
    expect(h).toMatch(/<a href="\/leva" aria-current="page"/);
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).not.toContain('href="/leva/1"');
    expect(h).not.toContain('href="/leva/0"');
  });
});

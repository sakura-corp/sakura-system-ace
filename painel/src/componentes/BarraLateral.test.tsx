import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarraLateral } from "./BarraLateral";

const html = (props: Parameters<typeof BarraLateral>[0]) => renderToString(<BarraLateral {...props} />).replace(/<!-- -->/g, "");

describe("BarraLateral", () => {
  it("desenha os grupos da lista; só o item da página tem aria-current", () => {
    const h = html({ levas: [{ nome: "Leva atual", href: "/leva", atual: true }], pagina: "sala" });
    for (const t of ["Trabalho", "Equipe", "Empresa", "Sala", "Escritório", "(exemplo)"]) expect(h).toContain(t);
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(h).toMatch(/<a href="\/sala" aria-current="page"/);
  });

  it("item em breve é link pra página que explica (#544), apagado, com o texto pro leitor de tela e a frase do que falta", () => {
    const h = html({ levas: [] });
    expect(h).not.toContain("aria-disabled");
    expect(h).toMatch(/<a href="\/em-breve\/versoes"[^>]*>(?:(?!<\/a>).)*Versões<span class="sr-only"> \(em breve\)<\/span>/);
    expect(h).toContain("depende da leva 2");
    // Os 4 que existem (Início, Leva atual, Sala e Escritório) e os 9 em breve.
    expect(h.match(/<a /g)).toHaveLength(13);
    expect(h.match(/<a href="\/em-breve\//g)).toHaveLength(9);
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

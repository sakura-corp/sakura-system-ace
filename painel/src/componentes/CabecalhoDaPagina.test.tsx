import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";

const html = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<!-- -->/g, "");

describe("CabecalhoDaPagina", () => {
  it("trilha, título em h1, explicação e ações", () => {
    const h = html(<CabecalhoDaPagina trilha="Equipe" titulo="Sala" explicacao="Ao vivo." acoes={<a href="/x">Ir</a>} />);
    expect(h).toContain("Equipe / ");
    expect(h).toMatch(/<b[^>]*>Sala<\/b>/);
    expect(h).toMatch(/<h1[^>]*>Sala<\/h1>/);
    expect(h).toContain("Ao vivo.");
    expect(h).toContain('<a href="/x">Ir</a>');
  });
  it("sem grupo a trilha mostra só o título; sem explicação e sem ações não sobra nada vazio", () => {
    const h = html(<CabecalhoDaPagina titulo="Página não encontrada" />);
    expect(h).not.toContain(" / ");
    expect(h).toMatch(/<b[^>]*>Página não encontrada<\/b>/);
    expect(h.match(/<p/g)?.length).toBe(1);
    expect(h).not.toContain("shrink-0");
  });
  it("o título e a coluna de texto podem encolher (min-w-0, overflow-wrap)", () => {
    const h = html(<CabecalhoDaPagina titulo="Sala" idDoTitulo="t" />);
    expect(h).toContain("min-w-0");
    expect(h).toContain("overflow-wrap:anywhere");
    expect(h).toContain('id="t"');
  });
});

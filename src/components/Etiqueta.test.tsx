import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Etiqueta } from "./Etiqueta";

/**
 * A etiqueta de situação ("Ativo", "Vencida", "Recebido parcialmente"...)
 * mora num lugar só (#932). A promessa que importa: **nunca quebra linha**.
 * Etiqueta de duas palavras numa coluna apertada (1366) quebrava, e o fundo
 * redondo saía cortado no meio — aconteceu com "Recebido parcialmente".
 */

function classesDe(html: string): string[] {
  const m = html.match(/class="([^"]*)"/);
  return m ? m[1].split(/\s+/) : [];
}

describe("Etiqueta", () => {
  it("nunca quebra linha", () => {
    const html = renderToStaticMarkup(
      <Etiqueta className="bg-emerald-50 text-emerald-700">Recebido parcialmente</Etiqueta>,
    );
    expect(classesDe(html)).toContain("whitespace-nowrap");
  });

  it("mantém a aparência de sempre e usa as cores que a tela mandou", () => {
    const html = renderToStaticMarkup(
      <Etiqueta className="bg-red-50 text-red-700">Vencida</Etiqueta>,
    );
    const classes = classesDe(html);
    for (const c of ["rounded-full", "px-2.5", "py-1", "text-rotulo", "font-medium", "bg-red-50", "text-red-700"]) {
      expect(classes).toContain(c);
    }
    expect(html).toContain(">Vencida</span>");
  });

  it("repassa o title (texto inteiro ao passar o mouse)", () => {
    const html = renderToStaticMarkup(
      <Etiqueta className="bg-red-50" title="Rejeitada pela SEFAZ">
        Rejeitada pela SEFAZ
      </Etiqueta>,
    );
    expect(html).toContain('title="Rejeitada pela SEFAZ"');
  });
});

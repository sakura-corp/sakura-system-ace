import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaginaEmBreve } from "./PaginaEmBreve";

const html = (id: string) => renderToStaticMarkup(<PaginaEmBreve id={id} />);

describe("PaginaEmBreve", () => {
  it("Financeiro: título, aviso de dinheiro e nenhum R$", () => {
    const h = html("financeiro");
    expect(h).toContain("Financeiro");
    expect(h).toContain("Ainda não está pronto");
    expect(h).toContain('role="note"');
    expect(h).toContain("Dinheiro da empresa nunca mora no GitHub");
    expect(h).not.toContain("R$");
    expect(h).not.toContain("issues/");
  });
  it("Lojas fala também de nome de cliente", () => {
    expect(html("lojas")).toContain("nome de cliente");
  });
  it("com tarefa: link da issue em aba nova", () => {
    const h = html("inicio");
    expect(h).toContain('href="https://github.com/sakura-corp/sakura-system-ace/issues/546"');
    expect(h).toContain('rel="noopener noreferrer"');
    expect(h).toContain("(abre em aba nova)");
    expect(h).not.toContain('role="note"');
  });
  it("id desconhecido: página não encontrada com volta pra leva", () => {
    const h = html("nao-existe");
    expect(h).toContain("Página não encontrada");
    expect(h).toContain("Voltar pra leva atual");
    expect(h).toContain('href="/"');
  });
});

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
    const h = html("levas");
    expect(h).toContain('href="https://github.com/sakura-corp/sakura-system-ace/issues/548"');
    expect(h).toContain('rel="noopener noreferrer"');
    expect(h).toContain("(abre em aba nova)");
    expect(h).not.toContain('role="note"');
  });
  it("quem cuida do andar: os chefes de cada um", () => {
    expect(html("posvenda")).toContain("Quem cuida deste andar: o chefe de marketing.");
    expect(html("bancos")).toContain("Quem cuida deste andar: o chefe de segurança.");
    expect(html("decisoes")).toContain("Quem cuida deste andar: ainda nenhum chefe.");
    expect(html("levas")).toContain("Quem cuida deste andar: os chefes de frontend, backend e tester.");
  });
  it("no rodapé (Configurações) não tem a linha do andar", () => {
    expect(html("configuracoes")).not.toContain("Quem cuida deste andar");
  });
  it("a trilha mostra o nome do andar", () => {
    expect(html("posvenda")).toContain("2º · Comercial e pós-venda");
    expect(html("bancos")).toContain("4º · Segurança e operação");
  });
  it("id desconhecido: página não encontrada com volta pro Início", () => {
    const h = html("nao-existe");
    expect(h).toContain("Página não encontrada");
    expect(h).toContain("Voltar pro Início");
    expect(h).toContain('href="/"');
  });
});

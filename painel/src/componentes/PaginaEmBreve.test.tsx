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
  it("id desconhecido: página não encontrada com volta pro Início", () => {
    const h = html("nao-existe");
    expect(h).toContain("Página não encontrada");
    expect(h).toContain("Voltar pro Início");
    expect(h).toContain('href="/"');
  });
  it("mostra \"quem cuida deste andar\" com os chefes do andar (#591)", () => {
    expect(html("pessoas")).toContain("Quem cuida deste andar: frontend, backend e tester");
    expect(html("posvenda")).toContain("Quem cuida deste andar: marketing");
    expect(html("bancos")).toContain("Quem cuida deste andar: segurança");
  });
  it("andar sem chefe não esconde a linha: diz que ainda não tem", () => {
    expect(html("decisoes")).toContain("Quem cuida deste andar: ainda sem chefe");
    expect(html("financeiro")).toContain("Quem cuida deste andar: ainda sem chefe");
  });
  it("as 3 páginas novas abrem, com a trilha do andar e o 'em breve'", () => {
    for (const [id, titulo, trilha] of [
      ["posvenda", "Pós-venda", "2º · Comercial e pós-venda / "],
      ["bancos", "Bancos e backups", "4º · Segurança e operação / "],
      ["decisoes", "Decisões da Sofia", "Cobertura · Diretoria / "],
    ]) {
      const h = html(id).replace(/<!-- -->/g, "");
      expect(h, id).toContain("Ainda não está pronto");
      expect(h, id).toContain("Em breve");
      expect(h, id).toContain(trilha);
      expect(h, id).toMatch(new RegExp(`<h1[^>]*>${titulo}</h1>`));
    }
  });
  it("a página sem andar (Configurações, no rodapé) não tem a linha do andar", () => {
    expect(html("configuracoes")).not.toContain("deste andar");
  });
  it("página não encontrada não tem a linha do andar", () => {
    expect(html("nao-existe")).not.toContain("deste andar");
  });
});

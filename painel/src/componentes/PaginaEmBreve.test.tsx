import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaginaEmBreve } from "./PaginaEmBreve";

const html = (id: string) => renderToStaticMarkup(<PaginaEmBreve id={id} />);

describe("PaginaEmBreve", () => {
  it("DRE: título, aviso de dinheiro e nenhum R$", () => {
    const h = html("dre");
    expect(h).toContain("DRE");
    expect(h).toContain("Ainda não está pronto");
    expect(h).toContain('role="note"');
    expect(h).toContain("Dinheiro da empresa nunca mora no GitHub");
    expect(h).not.toContain("R$");
    expect(h).not.toContain("issues/");
  });
  it("Financeiro já existe (#654): /em-breve/financeiro não é mais uma página \"em breve\"", () => {
    expect(html("financeiro")).toContain("Página não encontrada");
  });
  it("Lojas fala também de nome de cliente", () => {
    expect(html("lojas")).toContain("nome de cliente");
  });
  it("Levas anteriores já existe (#548): /em-breve/levas não é mais uma página \"em breve\"", () => {
    expect(html("levas")).toContain("Página não encontrada");
  });
  it("id desconhecido: página não encontrada com volta pro Início", () => {
    const h = html("nao-existe");
    expect(h).toContain("Página não encontrada");
    expect(h).toContain("Voltar pro Início");
    expect(h).toContain('href="/"');
  });
  const texto = (h: string) => h.replace(/<[^>]*>/g, "");
  it("sem tarefa: uma linha só, \"Quem cuida: o andar …\", com os chefes por área em português (#601)", () => {
    expect(texto(html("pessoas"))).toContain("Quem cuida: o andar das telas, dos dados e dos testes.");
    expect(texto(html("posvenda"))).toContain("Quem cuida: o andar do marketing.");
    expect(texto(html("bancos"))).toContain("Quem cuida: o andar da segurança.");
    expect(texto(html("pessoas")).match(/Quem cuida/g)).toHaveLength(1);
  });
  it("nenhum nome de chefe em inglês aparece em página nenhuma (#601)", () => {
    for (const id of ["fases", "pessoas", "lojas", "posvenda", "dre", "bancos", "configuracoes"]) {
      expect(texto(html(id)), id).not.toMatch(/\b(frontend|backend|tester)\b/);
    }
  });
  it("andar sem chefe não esconde a linha: diz que ainda não tem", () => {
    expect(texto(html("dre"))).toContain("Quem cuida: o andar ainda não tem chefe.");
  });
  it("Configurações (no rodapé, sem andar) não mostra a linha dos chefes", () => {
    expect(texto(html("configuracoes"))).not.toContain("Quem cuida");
  });
  it("as 2 páginas novas que ainda faltam abrem, com a trilha do andar e o 'em breve'", () => {
    for (const [id, titulo, trilha] of [
      ["posvenda", "Pós-venda", "2º · Comercial e pós-venda / "],
      ["bancos", "Bancos e backups", "4º · Segurança e operação / "],
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

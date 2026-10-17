import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NavegacaoDoCelular, ligarFolha, type FolhaMinima } from "./NavegacaoDoCelular";

const html = (props: Parameters<typeof NavegacaoDoCelular>[0]) => renderToString(<NavegacaoDoCelular {...props} />).replace(/<!-- -->/g, "");
const LEVA = [{ nome: "Leva atual", href: "/", atual: true }];
/** Separa a barra de baixo da folha (<dialog>). */
const partes = (h: string) => ({ barra: h.slice(0, h.indexOf("<dialog")), folha: h.slice(h.indexOf("<dialog")) });

describe("NavegacaoDoCelular", () => {
  it("barra de baixo: Início, Leva, Sala, Pessoas, Mais; só a Sala é a página atual", () => {
    const { barra } = partes(html({ levas: LEVA, pagina: "sala" }));
    const ordem = ["Início", "Leva", "Sala", "Pessoas", "Mais"].map((t) => barra.indexOf(t));
    expect(ordem.every((n) => n >= 0)).toBe(true);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
    expect(barra.match(/aria-current="page"/g)).toHaveLength(1);
    expect(barra).toMatch(/<a href="\/sala" aria-current="page"/);
    expect(barra).toContain('Início</span><span class="sr-only"> (em breve)</span>');
    expect(barra).toContain('Pessoas</span><span class="sr-only"> (em breve)</span>');
    expect(barra.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(barra.match(/<a /g)).toHaveLength(2);
    expect(barra).toContain('aria-haspopup="dialog"');
    expect(barra).toContain('aria-expanded="false"');
  });

  it("página fora da barra (Escritório): o aria-current fica na folha e o Mais ganha destaque", () => {
    const { barra, folha } = partes(html({ levas: LEVA, pagina: "escritorio" }));
    expect(barra).not.toContain("aria-current");
    expect(barra).toMatch(/<button[^>]*text-destaque/);
    expect(folha).toMatch(/<a href="\/escritorio" aria-current="page"/);
    expect(folha.match(/aria-current="page"/g)).toHaveLength(1);
    expect(folha).toContain("(exemplo)");
  });

  it("leva na tela que não é a atual: um só aria-current, no /leva/0", () => {
    const h = html({ levas: [{ nome: "Leva 0", href: "/leva/0", atual: true }], pagina: "leva" });
    const { barra, folha } = partes(h);
    expect(h.match(/aria-current="page"/g)).toHaveLength(1);
    expect(barra).not.toContain("aria-current");
    expect(folha).toMatch(/<a href="\/leva\/0" aria-current="page"/);
  });

  it("a folha tem Fechar, os grupos e não repete os itens da barra", () => {
    const { folha } = partes(html({ levas: LEVA, pagina: "leva" }));
    expect(folha).toContain('aria-labelledby="titulo-da-folha"');
    for (const t of ["Fechar", "Mais", "Trabalho", "Equipe", "Empresa", "Levas anteriores", "Escritório", "Configurações", "depende da #548"]) expect(folha).toContain(t);
    for (const t of ["Início", "Leva atual", "Sala", "Pessoas"]) expect(folha).not.toContain(t);
  });

  it("ao vivo e Sair só aparecem quando vêm as props", () => {
    expect(html({ levas: LEVA })).not.toContain("Sair");
    const h = html({ levas: LEVA, tempoReal: "aovivo", usuario: { login: "ana", avatar: "" } });
    expect(h).toContain("ao vivo");
    expect(h).toContain("Sair");
    expect(h).toContain("ana");
  });
});

type Ouvinte = (e: never) => void;
function folhaFalsa(focaveis: { focus(): void }[]) {
  const ouvintes = new Map<string, Ouvinte>();
  let fechou = 0;
  const folha: FolhaMinima = {
    open: true,
    close() {
      fechou++;
      ouvintes.get("close")?.(undefined as never);
    },
    addEventListener: (tipo, o) => void ouvintes.set(tipo, o),
    removeEventListener: (tipo) => void ouvintes.delete(tipo),
    querySelectorAll: () => focaveis,
  };
  const tecla = (key: string, alvo?: unknown, shiftKey = false) => {
    let impediu = false;
    ouvintes.get("keydown")?.({ key, shiftKey, target: alvo, preventDefault: () => (impediu = true) } as never);
    return impediu;
  };
  return { folha, ouvintes, tecla, fechou: () => fechou };
}
const elemento = (nome: string, focos: string[]) => ({ focus: () => void focos.push(nome) });

describe("ligarFolha", () => {
  it("Esc fecha a folha, avisa e devolve o foco ao botão Mais", () => {
    const focos: string[] = [];
    let avisos = 0;
    const f = folhaFalsa([elemento("a", focos)]);
    ligarFolha(f.folha, elemento("mais", focos), () => avisos++);
    expect(f.tecla("Escape")).toBe(true);
    expect(f.fechou()).toBe(1);
    expect(avisos).toBe(1);
    expect(focos).toEqual(["mais"]);
  });

  it("o evento close (ex.: Esc nativo) também avisa e devolve o foco", () => {
    const focos: string[] = [];
    let avisos = 0;
    const f = folhaFalsa([]);
    ligarFolha(f.folha, elemento("mais", focos), () => avisos++);
    f.ouvintes.get("close")?.(undefined as never);
    expect(avisos).toBe(1);
    expect(focos).toEqual(["mais"]);
  });

  it("Tab no último vai pro primeiro; Shift+Tab no primeiro vai pro último; no meio não mexe", () => {
    const focos: string[] = [];
    const a = elemento("a", focos);
    const b = elemento("b", focos);
    const c = elemento("c", focos);
    const f = folhaFalsa([a, b, c]);
    ligarFolha(f.folha, elemento("mais", focos), () => {});
    expect(f.tecla("Tab", c)).toBe(true);
    expect(f.tecla("Tab", a, true)).toBe(true);
    expect(focos).toEqual(["a", "c"]);
    expect(f.tecla("Tab", b)).toBe(false);
    expect(f.tecla("Tab", a)).toBe(false);
    expect(f.tecla("Tab", c, true)).toBe(false);
    expect(focos).toEqual(["a", "c"]);
  });

  it("a função devolvida remove os ouvintes", () => {
    const f = folhaFalsa([]);
    const desligar = ligarFolha(f.folha, elemento("mais", []), () => {});
    expect(f.ouvintes.size).toBe(2);
    desligar();
    expect(f.ouvintes.size).toBe(0);
  });
});

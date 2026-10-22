import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RespostaDoRelatorio } from "../../worker/relatorio";
import type { Leva } from "../tipos";
import { carregarRelatorio, chaveDoRelatorio, ConteudoDoRelatorio, levaDoRelatorio, linkDoRelatorio, PaginaRelatorio, type EstadoDoRelatorio } from "./PaginaRelatorio";

const pronto = (r: Partial<RespostaDoRelatorio>): EstadoDoRelatorio => ({ tipo: "pronto", relatorio: { numero: 3, situacao: "sem-relatorio", texto: null, ...r } });
const html = (estado: EstadoDoRelatorio, numero = 3) => renderToString(<ConteudoDoRelatorio numero={numero} estado={estado} tentarDeNovo={() => {}} />).replace(/<!-- -->/g, "");
const PR = "https://github.com/sakura-corp/sakura-system-ace/pull/700";

describe("ConteudoDoRelatorio: as quatro situações (#647)", () => {
  it("esperando: o selo, o link do PR em aba nova e o texto", () => {
    const h = html(pronto({ situacao: "esperando", texto: "# Relatório da 3", pr: { numero: 700, url: PR } }));
    expect(h).toContain("Esperando a aprovação da Sofia");
    expect(h).toContain(`href="${PR}"`);
    expect(h).toContain('target="_blank"');
    expect(h).toContain('rel="noopener noreferrer"');
    expect(h).toContain("Ver o PR #700 no GitHub");
    expect(h).toContain("(abre em aba nova)");
    expect(h).toContain("Relatório da 3</h2>");
  });

  it("esperando sem link seguro: o PR aparece como texto, sem link", () => {
    const h = html(pronto({ situacao: "esperando", texto: "x", pr: { numero: 700 } }));
    expect(h).toContain("PR #700");
    expect(h).not.toContain("href=");
  });

  it("esperando: diz quem abriu o PR e marca o texto como do PR", () => {
    const h = html(pronto({ situacao: "esperando", texto: "x", pr: { numero: 700, url: PR, autor: "tigasss1" } }));
    expect(h).toContain("aberto por @tigasss1");
    expect(h).toContain("Texto do PR #700");
    expect(h).not.toContain("fora da sakura-corp");
  });

  it("esperando com PR de fora: avisa que não é da equipe", () => {
    const h = html(pronto({ situacao: "esperando", texto: "x", pr: { numero: 701, url: PR, autor: "alguem", deFora: true } }));
    expect(h).toContain("aberto por @alguem");
    expect(h).toContain("fora da sakura-corp");
  });

  it("esperando com outros PRs mexendo no arquivo: avisa", () => {
    expect(html(pronto({ situacao: "esperando", texto: "x", pr: { numero: 700, url: PR }, outrosPrs: 2 }))).toContain("mais 2 PRs");
    expect(html(pronto({ situacao: "esperando", texto: "x", pr: { numero: 700, url: PR }, outrosPrs: 1 }))).toContain("mais 1 PR ");
    expect(html(pronto({ situacao: "esperando", texto: "x", pr: { numero: 700, url: PR } }))).not.toContain("mais 1 PR");
  });

  it("aprovado: diz que a Sofia aprovou e de onde vem o texto", () => {
    const h = html(pronto({ situacao: "aprovado", texto: "# Feito" }));
    expect(h).toContain("Aprovado pela Sofia");
    expect(h).toContain("Feito</h2>");
    expect(h).toContain("docs/relatorios/leva-3.md");
    expect(h).not.toContain("Esperando a aprovação");
  });

  it("antes das fases: aprovada, sem relatório", () => {
    expect(html(pronto({ numero: 0, situacao: "antes-das-fases" }), 0)).toContain("A leva 0 é de antes das fases: aprovada, sem relatório.");
  });

  it("sem relatório: diz que ainda não tem e quando aparece", () => {
    const h = html(pronto({ situacao: "sem-relatorio" }));
    expect(h).toContain("Esta leva ainda não tem relatório.");
    expect(h).toContain("docs/relatorios/leva-3.md");
  });

  it("nenhuma situação tem botão de aprovar", () => {
    for (const situacao of ["esperando", "aprovado", "antes-das-fases", "sem-relatorio"] as const) {
      const h = html(pronto({ situacao, texto: "x", pr: { numero: 1, url: PR } }));
      expect(h, situacao).not.toContain("<button");
      expect(h, situacao).not.toMatch(/>\s*Aprovar/);
    }
  });

  it("texto cortado: avisa e aponta o arquivo ou o PR", () => {
    const h = html(pronto({ situacao: "esperando", texto: "abc", textoCortado: true, pr: { numero: 700, url: PR } }));
    expect(h).toContain("só o começo aparece");
  });

  it("carregando e erro", () => {
    expect(html({ tipo: "carregando" })).toContain("Buscando o relatório");
    const erro = html({ tipo: "erro", mensagem: "Não deu pra buscar." });
    expect(erro).toContain("Não deu pra buscar.");
    expect(erro).toContain("Tentar de novo");
    expect(html({ tipo: "fora" })).toContain("A sessão acabou");
  });
});

describe("ConteudoDoRelatorio: o HTML do arquivo nunca roda (#647, #689)", () => {
  it("<script> e <img onerror> saem escapados, nunca como elemento", () => {
    const h = html(pronto({ situacao: "aprovado", texto: "# Título\n<script>alert(1)</script>\n<img src=x onerror=alert(2)>" }));
    expect(h).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(h).toContain("&lt;img src=x onerror=alert(2)&gt;");
    expect(h).not.toContain("<script");
    expect(h).not.toContain("<img");
    expect(h).not.toContain("onerror=alert(2)>");
  });

  it("HTML no meio de um parágrafo e em bloco também fica escrito", () => {
    const h = html(pronto({ situacao: "aprovado", texto: 'Olá <b onmouseover="alert(3)">oi</b>\n\n<div><iframe src="https://exemplo.com"></iframe></div>' }));
    expect(h).not.toContain("<b ");
    expect(h).not.toContain("<div><iframe");
    expect(h).not.toContain("<iframe");
    expect(h).toContain("&lt;iframe");
  });
});

describe("ConteudoDoRelatorio: o texto aparece formatado (#689)", () => {
  const h = html(
    pronto({
      situacao: "aprovado",
      texto: [
        "# Relatório da leva 1",
        "",
        "> Escrito pelo Claude. **Aprovar é mesclar**.",
        "",
        "## 1. O que entrou",
        "",
        "- uma",
        "- duas",
        "",
        "| Tarefa | O que é | PR |",
        "|---|---|---|",
        "| #536 | Painel: o cartão | #553 |",
      ].join("\n"),
    }),
  );

  it("título vira título (um nível abaixo do título da página)", () => {
    expect(h).toMatch(/<h2[^>]*>Relatório da leva 1<\/h2>/);
    expect(h).toMatch(/<h3[^>]*>1\. O que entrou<\/h3>/);
    expect(h).not.toContain("<h1");
    expect(h).not.toContain("# Relatório");
  });

  it("negrito, citação e lista", () => {
    expect(h).toContain("<strong>Aprovar é mesclar</strong>");
    expect(h).toMatch(/<blockquote[^>]*>[\s\S]*Escrito pelo Claude/);
    expect(h).toMatch(/<ul[^>]*>\s*<li>uma<\/li>\s*<li>duas<\/li>\s*<\/ul>/);
    expect(h).not.toContain("**");
  });

  it("tabela vira tabela, dentro de uma caixa que rola de lado", () => {
    expect(h).toMatch(/<div class="[^"]*overflow-x-auto[^"]*"><table/);
    expect(h).toMatch(/<th[^>]*>Tarefa<\/th>/);
    expect(h).toMatch(/<td[^>]*>#536<\/td>/);
    expect(h).not.toContain("|---|");
  });
});

describe("ConteudoDoRelatorio: links e imagens do relatório (#689)", () => {
  it("link da sakura-corp vira link em aba nova", () => {
    const h = html(pronto({ situacao: "aprovado", texto: `Veja [o PR](${PR}).` }));
    expect(h).toMatch(new RegExp(`<a href="${PR}" target="_blank" rel="noopener noreferrer"[^>]*>o PR</a>`));
  });

  it("link que não é da sakura-corp não vira link (nem escrito, nem automático, nem javascript:)", () => {
    const h = html(
      pronto({
        situacao: "aprovado",
        texto: "[fora](https://exemplo.com) e https://exemplo.com/solto e [js](javascript:alert(1)) e [outra org](https://github.com/outra/repo)\n\n[ref]: https://exemplo.com\n\n[por referência][ref]",
      }),
    );
    expect(h).not.toContain("<a");
    expect(h).not.toContain("href=");
    expect(h).toContain("fora");
    expect(h).toContain("por referência");
  });

  it("link que sai da sakura-corp com .. ou %2e%2e não vira link", () => {
    const h = html(pronto({ situacao: "aprovado", texto: "[a](https://github.com/sakura-corp/../../outra/x) e [b](https://github.com/sakura-corp/%2e%2e/outra/x)" }));
    expect(h).not.toContain("<a");
    expect(linkDoRelatorio("https://github.com/sakura-corp/../outra/x")).toBeUndefined();
    expect(linkDoRelatorio(PR)).toBe(PR);
  });

  it("nota de rodapé tem título em português", () => {
    const h = html(pronto({ situacao: "aprovado", texto: "Texto[^1]\n\n[^1]: nota" }));
    expect(h).toContain("Notas");
    expect(h).not.toContain("Footnotes");
  });

  it("imagem não aparece, nem de dentro da sakura-corp", () => {
    const h = html(pronto({ situacao: "aprovado", texto: `![foto](https://exemplo.com/x.png)\n\n![outra](${PR}.png)` }));
    expect(h).not.toContain("<img");
    expect(h).not.toContain("x.png");
  });
});

describe("carregarRelatorio (#647)", () => {
  const resposta = (corpo: unknown, status = 200) => async () => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

  it("pede /api/leva/<n>/relatorio e entrega o que veio", async () => {
    let pedido = "";
    const r = await carregarRelatorio(3, async (e) => {
      pedido = e;
      return Response.json({ numero: 3, situacao: "esperando", texto: "oi", pr: { numero: 700, url: PR }, outrosPrs: 1 });
    });
    expect(pedido).toBe("/api/leva/3/relatorio");
    expect(r).toEqual({ tipo: "pronto", relatorio: { numero: 3, situacao: "esperando", texto: "oi", pr: { numero: 700, url: PR }, outrosPrs: 1 } });
  });

  it("401 → fora; outro erro ou rede fora → erro; formato errado → erro", async () => {
    expect(await carregarRelatorio(3, resposta({}, 401))).toEqual({ tipo: "fora" });
    expect((await carregarRelatorio(3, resposta({}, 502))).tipo).toBe("erro");
    expect((await carregarRelatorio(3, async () => { throw new Error("x"); })).tipo).toBe("erro");
    expect((await carregarRelatorio(3, resposta({ numero: 3, situacao: "inventada", texto: null }))).tipo).toBe("erro");
    expect((await carregarRelatorio(3, resposta({ numero: 3, situacao: "aprovado", texto: 5 }))).tipo).toBe("erro");
    expect((await carregarRelatorio(3, async () => new Response("não é json"))).tipo).toBe("erro");
  });

  it("repassa quem abriu o PR e se é de fora; autor que não é texto é descartado", async () => {
    const r = await carregarRelatorio(3, resposta({ numero: 3, situacao: "esperando", texto: "x", pr: { numero: 9, url: PR, autor: "alguem", deFora: true } }));
    expect(r).toEqual({ tipo: "pronto", relatorio: { numero: 3, situacao: "esperando", texto: "x", pr: { numero: 9, url: PR, autor: "alguem", deFora: true } } });
    const torto = await carregarRelatorio(3, resposta({ numero: 3, situacao: "esperando", texto: "x", pr: { numero: 9, url: PR, autor: 5, deFora: "sim" } }));
    expect(torto).toEqual({ tipo: "pronto", relatorio: { numero: 3, situacao: "esperando", texto: "x", pr: { numero: 9, url: PR } } });
  });

  it("link do PR que não é da sakura-corp é descartado, e o resto passa", async () => {
    const r = await carregarRelatorio(3, resposta({ numero: 3, situacao: "esperando", texto: null, pr: { numero: 9, url: "https://exemplo.com/9" }, textoCortado: true }));
    expect(r).toEqual({ tipo: "pronto", relatorio: { numero: 3, situacao: "esperando", texto: null, textoCortado: true, pr: { numero: 9 } } });
  });
});

describe("levaDoRelatorio: qual leva a barra 'Relatório da leva' abre (#647)", () => {
  const leva = (numero: number, fase: Leva["fase"], extra: Partial<Leva> = {}): Leva => ({ numero, nome: `Leva ${numero}`, abertas: 0, fase, ...extra });
  const zero = leva(0, "aprovada", { antesDasFases: true });

  it("alguma leva na fase relatório: a de menor número delas", () => {
    expect(levaDoRelatorio([zero, leva(1, "aprovada"), leva(2, "relatorio"), leva(3, "relatorio"), leva(4, "trabalhando")], 4)).toBe(2);
  });

  it("nenhuma em relatório: a aprovada de maior número que não é a leva 0", () => {
    expect(levaDoRelatorio([zero, leva(1, "aprovada"), leva(2, "aprovada"), leva(3, "trabalhando")], 3)).toBe(2);
  });

  it("só a leva 0 aprovada: cai na atual", () => {
    expect(levaDoRelatorio([zero, leva(1, "trabalhando")], 1)).toBe(1);
  });

  it("sem levas e sem atual: null", () => {
    expect(levaDoRelatorio([], null)).toBeNull();
    expect(levaDoRelatorio([], 2)).toBe(2);
  });
});

describe("chaveDoRelatorio: a página busca de novo quando a fase da leva muda (#647)", () => {
  const leva = (numero: number, fase: Leva["fase"]): Leva => ({ numero, nome: `Leva ${numero}`, abertas: 0, fase });
  it("a Sofia mesclou (relatório → aprovada): a chave muda, mesmo com o número igual", () => {
    expect(chaveDoRelatorio(2, [leva(2, "relatorio")])).not.toBe(chaveDoRelatorio(2, [leva(2, "aprovada")]));
  });
  it("outra leva mudou de fase: a chave desta não muda", () => {
    expect(chaveDoRelatorio(2, [leva(2, "relatorio"), leva(3, "montando")])).toBe(chaveDoRelatorio(2, [leva(2, "relatorio"), leva(3, "trabalhando")]));
  });
});

describe("PaginaRelatorio sem login (#647)", () => {
  it("o título não inventa número de leva", () => {
    const h = renderToString(<PaginaRelatorio numero={null} semLogin />).replace(/<!-- -->/g, "");
    expect(h).toContain("Relatório da leva");
    expect(h).not.toMatch(/Relatório da leva (\d|null|undefined)/);
    expect(h).toContain("Sem login, o relatório não abre");
  });
});

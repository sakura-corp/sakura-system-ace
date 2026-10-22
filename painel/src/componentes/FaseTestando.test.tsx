import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RespostaDosTestes } from "../tipos";
import { AvisoDeLevaCongelada, ConteudoDaFaseTestando, carregarTestes, type EstadoDosTestes } from "./FaseTestando";

const pronto = (r: Partial<RespostaDosTestes>): EstadoDosTestes => ({ tipo: "pronto", testes: { numero: 2, texto: null, desde: null, defeitos: [], ...r } });
const html = (estado: EstadoDosTestes) => renderToString(<ConteudoDaFaseTestando numero={2} estado={estado} tentarDeNovo={() => {}} />).replace(/<!-- -->/g, "");

describe("FaseTestando: o aviso (#646)", () => {
  it("diz que a leva congelou e que não é pra pegar tarefa nova, como alerta", () => {
    const h = renderToString(<AvisoDeLevaCongelada numero={2} />);
    expect(h).toContain("Leva congelada");
    expect(h).toContain("não pegue tarefa nova");
    expect(h).toContain('role="status"');
  });
});

describe("FaseTestando: a lista do que testar (#646)", () => {
  it("o texto do arquivo aparece como texto: um <script> não vira elemento", () => {
    const h = html(pronto({ texto: "- abrir a leva\n<script>alert(1)</script>\n<img src=x onerror=alert(2)>" }));
    expect(h).toContain("- abrir a leva");
    expect(h).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(h).not.toContain("<script");
    expect(h).not.toContain("<img");
  });

  it("sem arquivo: a lista de testes ainda não foi escrita", () => {
    expect(html(pronto({ texto: null }))).toContain("A lista de testes ainda não foi escrita.");
  });

  it("texto cortado: avisa que o botão copia só o começo", () => {
    expect(html(pronto({ texto: "abc", textoCortado: true }))).toContain("copia só o começo");
    expect(html(pronto({ texto: "abc" }))).not.toContain("copia só o começo");
  });

  it("é pra levar pro Claude: diz o que fazer e tem o botão de copiar a lista inteira", () => {
    const h = html(pronto({ texto: "T1. abrir" }));
    expect(h).toContain("Leve esta lista pro seu Claude");
    expect(h).toContain("Copiar a lista inteira");
    expect(h).toContain("Ainda não entrou no banco de teste?");
  });

  it("a lista começa fechada numa janelinha, com o botão de abrir inteira", () => {
    const h = html(pronto({ texto: "T1. abrir" }));
    expect(h).toContain("max-h-56 overflow-hidden");
    expect(h).toContain('aria-expanded="false"');
    expect(h).toContain("Ver a lista inteira");
  });

  it("carregando e erro: dizem o que está acontecendo, sem a lista", () => {
    expect(html({ tipo: "carregando" })).toContain("Buscando a lista de testes");
    const erro = html({ tipo: "erro", mensagem: "Não deu pra buscar." });
    expect(erro).toContain("Não deu pra buscar.");
    expect(erro).toContain("Tentar de novo");
  });
});

describe("FaseTestando: quem já terminou", () => {
  const rodada = {
    numero: 728,
    url: "https://github.com/sakura-corp/sakura-system-ace/issues/728",
    pessoas: [
      { nome: "Gustavo", terminou: true },
      { nome: "Tiago", terminou: false },
      { nome: "Lázaro", terminou: false, semAcesso: true as const },
    ],
  };

  it("mostra cada pessoa, quantos terminaram e o link da issue", () => {
    const h = html(pronto({ rodada }));
    expect(h).toContain("Quem já terminou");
    expect(h).toContain("(1 de 3)");
    expect(h).toMatch(/Lázaro<\/span><span[^>]*>ainda sem acesso ao banco de teste/);
    expect(h).toMatch(/Gustavo<\/span><span[^>]*>terminou/);
    expect(h).toMatch(/Tiago<\/span><span[^>]*>testando/);
    expect(h).toContain('href="https://github.com/sakura-corp/sakura-system-ace/issues/728"');
  });

  it("sem a issue da rodada: a parte nem aparece", () => {
    expect(html(pronto({}))).not.toContain("Quem já terminou");
  });
});

describe("FaseTestando: os defeitos (#646)", () => {
  const defeitos = [
    { numero: 700, titulo: "O total some", url: "https://github.com/sakura-corp/sakura-system-ace/issues/700", criadaEm: "2026-10-21T09:00:00Z" },
    { numero: 701, titulo: "Sem link", criadaEm: "2026-10-21T10:00:00Z" },
  ];

  it("cada defeito com o número e o título; o link só pra github.com/sakura-corp", () => {
    const h = html(pronto({ desde: "2026-10-20T12:00:00Z", defeitos }));
    expect(h).toContain('href="https://github.com/sakura-corp/sakura-system-ace/issues/700"');
    expect(h).toContain("#700");
    expect(h).toContain("O total some");
    expect(h).toContain("#701");
    expect(h).toContain("Sem link");
    expect(h.match(/href=/g)).toHaveLength(1);
  });

  it("um link de fora que chegue mesmo assim não vira link", () => {
    const h = html(pronto({ desde: "2026-10-20T12:00:00Z", defeitos: [{ numero: 9, titulo: "x", url: "https://exemplo.com/9", criadaEm: "2026-10-21T09:00:00Z" }] }));
    expect(h).not.toContain("exemplo.com");
  });

  it("nenhum defeito: diz que nenhum foi achado ainda", () => {
    expect(html(pronto({ desde: "2026-10-20T12:00:00Z" }))).toContain("Nenhum defeito achado desde que a leva congelou.");
  });

  it("lista cortada: avisa", () => {
    expect(html(pronto({ desde: "2026-10-20T12:00:00Z", defeitos, defeitosCortados: true }))).toContain("pode haver mais");
  });
});

describe("carregarTestes (#646)", () => {
  const responder = (corpo: unknown, status = 200) => async () =>
    new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

  it("pede /api/leva/<n>/testes e devolve o que veio", async () => {
    const pedidos: string[] = [];
    const corpo = { numero: 2, texto: "oi", desde: null, defeitos: [] };
    const r = await carregarTestes(2, async (e) => {
      pedidos.push(String(e));
      return responder(corpo)();
    });
    expect(pedidos).toEqual(["/api/leva/2/testes"]);
    expect(r).toEqual({ tipo: "pronto", testes: corpo });
  });

  it("401 = fora; erro, resposta estranha ou sem rede = erro", async () => {
    expect((await carregarTestes(2, responder({}, 401))).tipo).toBe("fora");
    expect((await carregarTestes(2, responder({}, 502))).tipo).toBe("erro");
    expect((await carregarTestes(2, responder({ texto: 3, defeitos: [] }))).tipo).toBe("erro");
    expect((await carregarTestes(2, responder({ texto: null, defeitos: [{ numero: "x" }] }))).tipo).toBe("erro");
    expect(
      (
        await carregarTestes(2, async () => {
          throw new TypeError("sem rede");
        })
      ).tipo,
    ).toBe("erro");
  });

  it("um link de fora da sakura-corp é tirado já na chegada", async () => {
    const r = await carregarTestes(2, responder({ numero: 2, texto: null, desde: "x", defeitos: [{ numero: 9, titulo: "t", url: "https://exemplo.com", criadaEm: "x" }] }));
    expect(r).toEqual({ tipo: "pronto", testes: { numero: 2, texto: null, desde: "x", defeitos: [{ numero: 9, titulo: "t", criadaEm: "x" }] } });
  });
});

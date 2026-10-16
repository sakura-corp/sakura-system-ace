import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { paginaDoCaminho } from "./App";
import { TelaDeEntrada } from "./componentes/TelaDeEntrada";

const html = (caminho: string, busca = "") => renderToString(<App caminho={caminho} busca={busca} />).replace(/<!-- -->/g, "");

describe("App", () => {
  it("mostra a leva de exemplo: contador, grupos, aviso de uma por vez e o Financeiro desativado", () => {
    const h = html("/");
    expect(h).toContain("Leva 0");
    expect(h).toContain("1 de 8 tarefas feitas");
    expect(h).toContain("bruno-exemplo está com 2 tarefas em andamento");
    expect(h).toContain("em breve, depende do banco próprio da Sakura");
    expect(h).toContain('target="_blank"');
  });

  it("/escritorio mostra o Escritório, marcado como exemplo, com o que ainda não existe desativado", () => {
    const h = html("/escritorio");
    expect(h).toContain("Escritório de agentes");
    expect(h).toContain("nenhum agente de verdade está rodando");
    expect(h).toContain("15 agentes · 5 rodando");
    expect(h).toContain("O Cérebro");
    expect(h).toContain("O escritório em lista");
    expect(h).toContain("Roda em:");
    expect(h).toContain("Agenda");
    expect(h).toContain("em breve, depende de ligar os agentes de verdade");
    expect(h).toMatch(/<input[^>]*disabled/);
    expect(h).toMatch(/<button[^>]*disabled[^>]*>Aprovar/);
  });

  it("/sala mostra a sala, o aviso que leva ao 'Precisa de você', a lista e o link pro modo TV", () => {
    const h = html("/sala");
    expect(h).toContain("Leva 0 · dados de exemplo");
    expect(h).toContain('href="#precisa"');
    expect(h).toContain("2 coisas precisam de você");
    expect(h).toMatch(/<h2 id="precisa">Precisa de você \(2\)<\/h2>/);
    expect(h).toContain("Robôs da casa");
    expect(h).toContain("ao vivo · atualizado agora há pouco");
    expect(h).toContain('href="/sala?tv"');
    expect(h).toContain('aria-label="Menu do painel"');
  });

  it("na Sala, link de fora do GitHub da Sakura vira texto, e o do GitHub abre em aba nova com noopener", () => {
    const h = html("/sala");
    expect(h).not.toContain('href="https://exemplo.com');
    expect(h).toContain("https://exemplo.com/fora-do-github (fora do GitHub da Sakura: sem link)");
    expect(h).toMatch(/href="https:\/\/github\.com\/sakura-corp\/[^"]*" target="_blank" rel="noopener noreferrer"/);
  });

  it("/sala?tv mostra só a sala: sem barra lateral e sem lista", () => {
    const h = html("/sala", "?tv");
    expect(h).toContain("sala-tv");
    expect(h).not.toContain('aria-label="Menu do painel"');
    expect(h).not.toContain('id="precisa"');
    expect(h).toContain("Robôs do Claude");
  });

  it("todo link aberto da página leva só pra github.com/sakura-corp", () => {
    for (const caminho of ["/", "/sala", "/escritorio"]) {
      const links = [...html(caminho).matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith("http"));
      expect(links.length).toBeGreaterThan(0);
      for (const u of links) expect(u.startsWith("https://github.com/sakura-corp/")).toBe(true);
    }
  });

  it("escolhe a página pelo endereço", () => {
    expect(paginaDoCaminho("/escritorio")).toBe("escritorio");
    expect(paginaDoCaminho("/escritorio/")).toBe("escritorio");
    expect(paginaDoCaminho("/sala")).toBe("sala");
    expect(paginaDoCaminho("/")).toBe("leva");
    expect(paginaDoCaminho("/qualquer")).toBe("leva");
  });

  it("logada: foto, nome e Sair no canto da barra lateral; sem login, nada disso", () => {
    const logada = renderToString(<App caminho="/" busca="" usuario={{ login: "fulana", avatar: "" }} />);
    expect(logada).toContain("fulana");
    expect(logada).toMatch(/<button[^>]*>.*Sair<\/button>/);
    expect(html("/")).not.toContain("Sair");
  });
});

describe("TelaDeEntrada", () => {
  it("mostra o botão que leva ao /api/login, e a mensagem de erro quando tem", () => {
    const h = renderToString(<TelaDeEntrada erro="Esta conta não faz parte da Sakura Corp." />);
    expect(h).toContain('href="/api/login"');
    expect(h).toContain("Entrar com o GitHub");
    expect(h).toMatch(/role="alert"[^>]*>Esta conta não faz parte da Sakura Corp\.</);
    expect(renderToString(<TelaDeEntrada />)).not.toContain('role="alert"');
    expect(renderToString(<TelaDeEntrada volta="/sala?tv" />)).toContain('href="/api/login?volta=%2Fsala%3Ftv"');
  });

  it("enquanto confere, não mostra o botão", () => {
    const h = renderToString(<TelaDeEntrada carregando />);
    expect(h).toContain("Conferindo o login");
    expect(h).not.toContain("/api/login");
  });
});

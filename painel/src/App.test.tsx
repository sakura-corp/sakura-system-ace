import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { paginaDoCaminho } from "./App";
import { TelaDeEntrada } from "./componentes/TelaDeEntrada";
import type { EstadoDaLeva } from "./logica/dados";

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

  it("escolhe a página pelo endereço; /leva/<n> é a página da leva", () => {
    expect(paginaDoCaminho("/leva/2")).toBe("leva");
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

describe("App com as tarefas de verdade (#354)", () => {
  const usuario = { login: "fulana", avatar: "" };
  const de = (leva: EstadoDaLeva, caminho = "/") => renderToString(<App caminho={caminho} busca="" usuario={usuario} leva={leva} />).replace(/<!-- -->/g, "");
  const pronto: EstadoDaLeva = {
    tipo: "pronto",
    levas: [{ numero: 0, nome: "Leva 0", abertas: 0 }, { numero: 1, nome: "Leva 1", abertas: 2 }],
    atual: 1,
    leva: {
      numero: 1,
      cortada: false,
      tarefas: [
        { numero: 10, titulo: "Uma livre", url: "https://github.com/sakura-corp/sakura-system-ace/issues/10", estado: "livre", estimativaHoras: 2 },
        { numero: 11, titulo: "Uma feita", url: "https://github.com/sakura-corp/sakura-system-ace/issues/11", estado: "feita", estimativaHoras: 1.5, dono: { login: "fulana", avatar: "" } },
      ],
    },
  };

  it("pronto: a leva de verdade, o contador, o link da etiqueta e nada de exemplo", () => {
    const h = de(pronto);
    expect(h).toMatch(/<h1[^>]*>Leva 1<\/h1>/);
    expect(h).toContain("1 de 2 tarefas feitas · 1,5 h de 3,5 h");
    expect(h).toContain("Uma livre");
    expect(h).toContain("https://github.com/sakura-corp/sakura-system-ace/issues?q=label%3Aleva-1");
    expect(h).not.toContain("Dados de exemplo");
    expect(h).not.toContain("bruno-exemplo");
  });

  it("tarefa sem responsável: a livre não repete 'livre'; a feita diz 'sem responsável'", () => {
    const h = de({ ...pronto, leva: { ...pronto.leva, tarefas: [{ ...pronto.leva.tarefas[0] }, { ...pronto.leva.tarefas[1], dono: undefined }] } });
    expect(h).toContain("sem responsável");
    expect(h.match(/>livre</g)).toBeNull();
  });

  it("na barra lateral, todas as levas: a atual leva pra /, as outras pra /leva/<n>", () => {
    const h = de(pronto);
    expect(h).toMatch(/<a href="\/" aria-current="page"[^>]*>Leva 1<\/a>/);
    expect(h).toMatch(/<a href="\/leva\/0"[^>]*>Leva 0<\/a>/);
    const outra = de({ ...pronto, leva: { ...pronto.leva, numero: 0 } }, "/leva/0");
    expect(outra).toMatch(/<a href="\/leva\/0" aria-current="page"[^>]*>Leva 0<\/a>/);
  });

  it("carregando: o esqueleto, sem tarefas de exemplo", () => {
    const h = de({ tipo: "carregando" });
    expect(h).toContain('aria-busy="true"');
    expect(h).toContain("Buscando as tarefas no GitHub");
    expect(h).not.toContain("bruno-exemplo");
  });

  it("logada e sem estado dado, começa carregando (não mostra o exemplo)", () => {
    const h = renderToString(<App caminho="/" busca="" usuario={usuario} />);
    expect(h).toContain('aria-busy="true"');
    expect(h).not.toContain("bruno-exemplo");
  });

  it("erro: a mensagem e o botão Tentar de novo; a barra lateral ainda leva pra leva atual", () => {
    const h = de({ tipo: "erro", mensagem: "Não deu pra buscar as tarefas no GitHub agora." });
    expect(h).toMatch(/role="alert"/);
    expect(h).toContain("Não deu pra buscar as tarefas no GitHub agora.");
    expect(h).toMatch(/<button[^>]*>.*Tentar de novo<\/button>/);
    expect(h).toMatch(/<a href="\/"[^>]*>Leva atual<\/a>/);
    const na0 = de({ tipo: "carregando" }, "/leva/0");
    expect(na0).toMatch(/<a href="\/leva\/0" aria-current="page"[^>]*>Leva 0<\/a>/);
    expect(na0).not.toContain("Leva atual");
  });

  it("sessão acabou: a tela de entrada, voltando pra mesma página", () => {
    const h = de({ tipo: "fora" }, "/leva/0");
    expect(h).toContain("Sua sessão acabou. Entre de novo.");
    expect(h).toContain('href="/api/login?volta=%2Fleva%2F0"');
  });

  it("sem nenhuma etiqueta de leva: diz isso", () => {
    expect(de({ tipo: "sem-levas" })).toContain("Nenhuma leva ainda");
  });

  it("leva vazia: diz que não tem tarefa, sem contador", () => {
    const h = de({ ...pronto, leva: { numero: 1, cortada: false, tarefas: [] } });
    expect(h).toContain("Nenhuma tarefa nesta leva ainda.");
    expect(h).not.toContain("tarefas feitas");
  });

  it("mais de 100 tarefas: avisa que só as 100 primeiras aparecem", () => {
    expect(de({ ...pronto, leva: { ...pronto.leva, cortada: true } })).toContain("só as 100 primeiras aparecem");
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

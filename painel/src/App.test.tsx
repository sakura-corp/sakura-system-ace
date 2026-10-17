import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { paginaDoCaminho } from "./App";
import { TelaDeEntrada } from "./componentes/TelaDeEntrada";
import type { EstadoDaLeva } from "./logica/dados";
import type { Tarefa } from "./tipos";

const html = (caminho: string, busca = "") => renderToString(<App caminho={caminho} busca={busca} />).replace(/<!-- -->/g, "");

describe("App", () => {
  it("mostra a leva de exemplo: contador, grupos, aviso de uma por vez e o Financeiro desativado", () => {
    const h = html("/");
    expect(h).toContain("Leva 0");
    expect(h).toContain("1 de 8 tarefas feitas");
    expect(h).toContain("bruno-exemplo está com 2 tarefas em andamento");
    expect(h).toContain("Financeiro<span class=\"sr-only\"> (em breve)</span>");
    expect(h).toContain("depende do banco privado");
    expect(h).toContain('target="_blank"');
  });

  it("/em-breve/financeiro mostra a página que explica, sem número de dinheiro (#544)", () => {
    const h = html("/em-breve/financeiro/");
    expect(h).toContain("Empresa / ");
    expect(h).toMatch(/<h1[^>]*>Financeiro<\/h1>/);
    expect(h).toContain("Ainda não está pronto");
    expect(h).toContain("nunca mora no GitHub");
    expect(h).not.toMatch(/R\$|\d,\d/);
    expect(h).not.toContain("1 de 8 tarefas feitas");
  });

  it("/em-breve/<id que não existe> mostra 'Página não encontrada', e não a leva (#544)", () => {
    const h = html("/em-breve/nao-existe");
    expect(h).toContain("Página não encontrada");
    expect(h).not.toContain("1 de 8 tarefas feitas");
    expect(paginaDoCaminho("/em-breve/dre")).toBe("dre");
    expect(paginaDoCaminho("/em-breve/nao-existe")).toBe("leva");
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
    expect(h).toContain("Dados de exemplo");
    expect(h).toContain('href="#precisa"');
    expect(h).toContain("2 coisas precisam de você");
    expect(h).toMatch(/<h2 id="precisa">Precisa de você \(2\)<\/h2>/);
    expect(h).toContain("Robôs da casa");
    expect(h).toContain("dados de exemplo · sem ligação com o GitHub");
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

  it("todo link aberto da página leva só pra github.com/sakura-corp (ou, no botão Começar com o Claude, pro formulário de claude.ai/code)", () => {
    for (const caminho of ["/", "/sala", "/escritorio"]) {
      const links = [...html(caminho).matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith("http"));
      expect(links.length).toBeGreaterThan(0);
      for (const u of links) {
        const doBotao = u.startsWith("https://claude.ai/code?prompt=") && u.endsWith("&amp;repositories=sakura-corp/sakura-system-ace");
        expect(u.startsWith("https://github.com/sakura-corp/") || doBotao).toBe(true);
      }
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

  it("nome comprido: o nome encolhe com reticências e o Sair não desce de linha nem encolhe", () => {
    const h = renderToString(<App caminho="/" busca="" usuario={{ login: "um-nome-de-usuario-muito-comprido", avatar: "" }} />);
    const nome = h.match(/<span class="([^"]*)"[^>]*>um-nome-de-usuario-muito-comprido<\/span>/)?.[1] ?? "";
    expect(nome).toContain("truncate");
    expect(nome).toContain("min-w-0");
    expect(h.match(/<button[^>]*class="([^"]*)"[^>]*>(?:(?!<\/button>).)*Sair/)?.[1]).toContain("shrink-0");
    // a linha do nome e do Sair não pode quebrar (flex-wrap era o que jogava o Sair pra baixo)
    expect(h).not.toMatch(/class="[^"]*flex-wrap[^"]*"><img|class="[^"]*flex-wrap[^"]*"><span aria-hidden/);
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

  it("quadro Horas por pessoa: aparece com os números certos e some se ninguém tem tarefa com dono", () => {
    const base = "https://github.com/sakura-corp/sakura-system-ace/issues/";
    const com = de({
      ...pronto,
      leva: {
        ...pronto.leva,
        tarefas: [
          { numero: 20, titulo: "A", url: base + "20", estado: "feita", estimativaHoras: 1.5, dono: { login: "fulana", avatar: "" } },
          { numero: 21, titulo: "B", url: base + "21", estado: "revisao", estimativaHoras: 2, dono: { login: "fulana", avatar: "" } },
          { numero: 22, titulo: "C", url: base + "22", estado: "andamento", dono: { login: "fulana", avatar: "" } },
        ],
      },
    });
    expect(com).toMatch(/<h2 id="horas-por-pessoa"[^>]*>Horas por pessoa<\/h2>/);
    // Só o texto: cada pedaço do quadro mora num <span> próprio (pra não quebrar no meio no celular).
    const soTexto = (html: string) => html.replace(/<[^>]+>/g, "");
    expect(soTexto(com)).toContain("1,5 h entregues · 2 h segurando · 1 sem estimativa");
    const sem = de(pronto);
    expect(soTexto(sem)).toContain("1,5 h entregues · 0 h segurando");
    const ninguem = de({
      ...pronto,
      leva: { ...pronto.leva, tarefas: [{ ...pronto.leva.tarefas[0] }, { ...pronto.leva.tarefas[1], dono: undefined }] },
    });
    expect(ninguem).not.toContain("Horas por pessoa");
  });

  it("tarefa sem responsável: a livre não repete 'livre'; a feita diz 'sem responsável'", () => {
    const h = de({ ...pronto, leva: { ...pronto.leva, tarefas: [{ ...pronto.leva.tarefas[0] }, { ...pronto.leva.tarefas[1], dono: undefined }] } });
    expect(h).toContain("sem responsável");
    expect(h.match(/>livre</g)).toBeNull();
  });

  it("no exemplo (sem login), tarefa livre tem 'Pegar tarefa' desligado e ninguém ganha o botão do Claude", () => {
    const h = html("/");
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa/);
    expect(h).toContain("entre no painel pra pegar uma tarefa");
    expect(h).not.toContain("Começar com o Claude");
    expect(h).not.toContain("Largar");
  });

  describe("botões do cartão com login (#538)", () => {
    const url = (n: number) => `https://github.com/sakura-corp/sakura-system-ace/issues/${n}`;
    const comTarefas = (tarefas: Tarefa[], levaMostrada = 1): EstadoDaLeva => ({ ...pronto, leva: { numero: levaMostrada, cortada: false, tarefas } });
    const mista: Tarefa[] = [
      { numero: 30, titulo: "Minha", url: url(30), estado: "andamento", dono: { login: "Fulana", avatar: "" }, chefe: "frontend" },
      { numero: 31, titulo: "Do outro", url: url(31), estado: "andamento", dono: { login: "beltrano", avatar: "" }, chefe: "frontend" },
      { numero: 32, titulo: "Livre", url: url(32), estado: "livre", chefe: "frontend" },
      { numero: 33, titulo: "Feita", url: url(33), estado: "feita", dono: { login: "fulana", avatar: "" } },
    ];

    it("o botão Começar com o Claude e o Copiar texto aparecem só na tarefa de quem olha, e abrem em aba nova", () => {
      const h = de(comTarefas(mista));
      expect((h.match(/Começar com o Claude/g) ?? []).length).toBe(1);
      expect((h.match(/<button[^>]*>Copiar texto/g) ?? []).length).toBe(1);
      expect((h.match(/No celular, se o texto não aparecer/g) ?? []).length).toBe(1);
      const botoes = [...h.matchAll(/<a [^>]*href="https:\/\/claude\.ai\/code\?[^>]*>/g)].map((m) => m[0]);
      expect(botoes.length).toBe(1);
      expect(botoes[0]).toContain('rel="noopener noreferrer"');
      expect(botoes[0]).toContain('target="_blank"');
      expect(h).not.toContain("Copiado");
      expect(h).not.toContain("<textarea");
    });

    it("a livre ganha 'Pegar tarefa' desligado (ela já está com a #30), sem botão do Claude, e a feita fica sem botão", () => {
      const h = de(comTarefas(mista));
      expect((h.match(/Pegar tarefa<span/g) ?? []).length).toBe(1);
      expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa/);
      expect(h).toContain("você já está com a #30");
      expect((h.match(/>Largar</g) ?? []).length).toBe(1);
    });

    it("a leva mostrada que não é a atual não deixa pegar", () => {
      const h = de(comTarefas([mista[2]], 0), "/leva/0");
      expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa/);
      expect(h).toContain("esta tarefa não está na leva atual");
    });
  });

  it("na barra lateral, todas as levas: a atual leva pra /, as outras pra /leva/<n>", () => {
    const h = de(pronto);
    expect(h).toMatch(/<a href="\/" aria-current="page"[^>]*>.*?Leva atual<\/span><\/a>/);
    expect(h).not.toMatch(/<a href="\/leva\/0"/);
    const outra = de({ ...pronto, leva: { ...pronto.leva, numero: 0 } }, "/leva/0");
    expect(outra).toMatch(/<a href="\/"[^>]*>(?:(?!<\/a>).)*Leva atual<\/span><\/a>/);
    expect(outra).not.toMatch(/<a href="\/" aria-current/);
    expect(outra).toMatch(/<a href="\/leva\/0" aria-current="page"[^>]*>.*?Leva 0<\/span><\/a>/);
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
    expect(h).toMatch(/<a href="\/"[^>]*>.*?Leva atual<\/span><\/a>/);
    const na0 = de({ tipo: "carregando" }, "/leva/0");
    expect(na0).toMatch(/<a href="\/leva\/0" aria-current="page"[^>]*>.*?Leva 0<\/span><\/a>/);
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

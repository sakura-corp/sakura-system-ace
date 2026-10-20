import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App, { paginaDoCaminho } from "./App";
import paginaHtml from "../index.html?raw";
import { TelaDeEntrada } from "./componentes/TelaDeEntrada";
import type { EstadoDaLeva, EstadoDoResumo } from "./logica/dados";
import type { EstadoDaSala } from "./logica/salaDados";
import type { TotalDoMes } from "./logica/financeiro";
import type { Tarefa } from "./tipos";

const total = (mes: string, entrou: number, saiu: number): TotalDoMes => ({ mes, entrouCentavos: entrou, saiuCentavos: saiu, saldoCentavos: entrou - saiu, crescimentoPercentual: null });

const html = (caminho: string, busca = "") => renderToString(<App caminho={caminho} busca={busca} />).replace(/<!-- -->/g, "");

// Quantos <h1 a página tem: toda página tem exatamente um.
const contarH1 = (h: string) => (h.match(/<h1[\s>]/g) ?? []).length;

describe("App", () => {
  it("toda página tem um só h1, a Sala nos dois modos", () => {
    for (const caminho of ["/sala", "/escritorio", "/em-breve/dre", "/em-breve/nao-existe"]) {
      expect(contarH1(html(caminho)), caminho).toBe(1);
    }
    expect(contarH1(html("/sala", "?tv")), "/sala?tv").toBe(1);
  });

  it("na Sala o h1 é o do cabeçalho e a janela diz 'Agora'; no modo TV a janela é o h1", () => {
    const h = html("/sala");
    expect(h).toMatch(/<h1[^>]*>Sala<\/h1>/);
    expect(h).toMatch(/<h2 id="sala-titulo"[^>]*>Agora<\/h2>/);
    expect(html("/sala", "?tv")).toMatch(/<h1 id="sala-titulo">Sala<\/h1>/);
  });

  it("/sala tem a trilha e a explicação; /sala?tv não tem cabeçalho", () => {
    const h = html("/sala");
    expect(h).toContain("1º · Produção / ");
    expect(h).not.toContain("Equipe / ");
    expect(h).toContain("As pessoas e os robôs, ao vivo.");
    const tv = html("/sala", "?tv");
    expect(tv).not.toContain("1º · Produção / ");
    expect(tv).not.toContain("As pessoas e os robôs, ao vivo.");
  });

  it("mostra a leva de exemplo: contador, grupos, aviso de uma por vez e o DRE desativado", () => {
    const h = html("/leva");
    expect(h).toContain("Leva 0");
    expect(h).toContain("1 de 8 tarefas feitas");
    expect(h).toContain("bruno-exemplo está com 2 tarefas em andamento");
    expect(h).toContain("DRE<span class=\"sr-only\"> (em breve)</span>");
    expect(h).toContain("depende do Financeiro");
    // O Financeiro (#654) já existe: link de verdade, sem "em breve".
    expect(h).not.toContain("Financeiro<span class=\"sr-only\"> (em breve)</span>");
    expect(h).toContain('target="_blank"');
  });

  it("todos os endereços /em-breve/<id> de antes dos andares (#591) abrem a mesma página, e os 3 novos também", () => {
    // Escritos aqui, não importados da lista: mudar um endereço ou um título tem que reprovar.
    const paginas: [string, string][] = [
      ["versoes", "Versões"], ["fases", "Fases da leva"], ["relatorio", "Relatório da leva"],
      ["pessoas", "Pessoas"], ["dre", "DRE"], ["lojas", "Lojas"], ["configuracoes", "Configurações"],
      ["posvenda", "Pós-venda"], ["bancos", "Bancos e backups"], ["decisoes", "Decisões da Sofia"],
    ];
    for (const [id, titulo] of paginas) {
      const h = html(`/em-breve/${id}`);
      expect(h, id).toMatch(new RegExp(`<h1[^>]*>${titulo}</h1>`));
      expect(h, id).toContain("Ainda não está pronto");
    }
  });

  it("/em-breve/dre mostra a página que explica, sem número de dinheiro (#544)", () => {
    const h = html("/em-breve/dre/");
    expect(h).toContain("3º · Financeiro / ");
    expect(h).toMatch(/<h1[^>]*>DRE<\/h1>/);
    expect(h).toContain("Ainda não está pronto");
    expect(h).toContain("nunca mora no GitHub");
    // Nenhum algarismo nem "R$" na página (a barra lateral tem "#546" e fica de fora; a trilha leva o número do andar, "3º").
    const pagina = h.slice(h.indexOf("<main"), h.indexOf("</main>")).replace(/3º · Financeiro \//, "").replace(/<[^>]*>/g, " ");
    expect(pagina).toContain("DRE");
    expect(pagina).not.toMatch(/R\$|\d/);
    expect(h).not.toContain("1 de 8 tarefas feitas");
  });

  it("/financeiro (#654) é a página do Financeiro; /em-breve/financeiro não existe mais", () => {
    expect(paginaDoCaminho("/financeiro")).toBe("financeiro");
    expect(paginaDoCaminho("/financeiro/")).toBe("financeiro");
    expect(paginaDoCaminho("/em-breve/financeiro")).toBe("nao-encontrada");
    expect(html("/em-breve/financeiro")).toContain("Página não encontrada");
  });

  it("/financeiro: um só h1, a trilha do andar, e quem não é dona não recebe formulário nem lista (#654)", () => {
    const resumo = { mesAtual: total("2026-10", 1000, 400), meses: [total("2026-10", 1000, 400)], saidasPorCategoria: [] };
    const h = renderToString(
      <App caminho="/financeiro" busca="" usuario={{ login: "fulana", avatar: "" }} financeiro={{ tipo: "pronto", mes: "2026-10", resumo, podeLancar: false, lista: null }} />,
    ).replace(/<!-- -->/g, "");
    expect(contarH1(h)).toBe(1);
    expect(h).toContain("3º · Financeiro / ");
    expect(h).toContain("R$ 10,00");
    expect(h).not.toContain("<form");
    expect(h).toMatch(/<a href="\/financeiro" aria-current="page"/);
  });

  it("/financeiro com a sessão acabada (401) volta pra tela de entrada (#654)", () => {
    const h = renderToString(<App caminho="/financeiro" busca="" usuario={{ login: "fulana", avatar: "" }} financeiro={{ tipo: "fora" }} />);
    expect(h).toContain("Sua sessão acabou");
  });

  it("/em-breve/<id que não existe> mostra 'Página não encontrada', e não a leva (#544)", () => {
    const h = html("/em-breve/nao-existe");
    expect(h).toContain("Página não encontrada");
    expect(h).not.toContain("1 de 8 tarefas feitas");
    expect(paginaDoCaminho("/em-breve/dre")).toBe("dre");
    expect(paginaDoCaminho("/em-breve/nao-existe")).toBe("nao-encontrada");
  });

  it("/em-breve/xyz (#560): a barra do PC e a do celular não marcam item nenhum, e o Mais não ganha destaque", () => {
    expect(paginaDoCaminho("/em-breve/xyz")).toBe("nao-encontrada");
    const h = html("/em-breve/xyz");
    expect(h).toContain("Página não encontrada");
    expect(h).not.toContain("aria-current");
    // O "Mais" só ganha destaque quando a página aberta mora na folha; aqui não mora em lugar nenhum.
    expect(h).not.toMatch(/<button[^>]*text-destaque/);
    // As páginas que existem continuam marcando o item delas.
    expect(html("/em-breve/dre")).toContain('aria-current="page"');
  });

  it("deitado, toda tela respeita a área segura dos lados, num lugar só: o body (#561, #604)", async () => {
    // O modo TV e a tela de entrada saem do App antes do layout principal; o body vale pra todas.
    // O `?raw` de CSS chega vazio no Vitest (ele não processa CSS), então lê o arquivo direto.
    // O painel não tem os tipos do Node: daí o nome do módulo numa variável e o tipo na mão.
    const fs = "node:fs";
    const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (u: URL, c: "utf8") => string };
    const estiloCss = readFileSync(new URL("./estilo.css", import.meta.url), "utf8");
    // Um bloco body só: um segundo, mais abaixo, poderia zerar a margem sem o teste ver.
    expect(estiloCss.match(/(^|[\s,}])body\s*[{,]/g)).toHaveLength(1);
    const body = /^body\s*\{([^}]*)\}/m.exec(estiloCss);
    expect(body).not.toBeNull();
    expect(body![1]).toMatch(/padding-left:\s*env\(safe-area-inset-left\)/);
    expect(body![1]).toMatch(/padding-right:\s*env\(safe-area-inset-right\)/);
    // Sem margem dobrada: o layout principal, o modo TV e a tela de entrada não repetem a do body.
    // (A barra de baixo e a folha do celular são fixed e têm a delas: NavegacaoDoCelular.test.tsx.)
    for (const [caminho, busca] of [["/leva", ""], ["/sala", "?tv"]]) {
      const h = html(caminho, busca);
      expect(h.slice(0, h.indexOf(">")), caminho + busca).not.toContain("safe-area-inset");
    }
    expect(renderToString(<TelaDeEntrada />)).not.toContain("safe-area-inset");
  });

  it("modo TV deitado no tema claro (#604, opção B da Sofia): a faixa da franja fica com o escuro da Sala", async () => {
    // A margem do body é pintada com o fundo do body; a Sala é sempre escura (--bg da .sala-j).
    const fs = "node:fs";
    const { readFileSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (u: URL, c: "utf8") => string };
    const estiloCss = readFileSync(new URL("./estilo.css", import.meta.url), "utf8");
    const salaCss = readFileSync(new URL("./componentes/sala/sala.css", import.meta.url), "utf8");
    const fundoDaSala = /\.sala-j\s*\{[^}]*--bg:\s*(#[0-9a-f]{6})/i.exec(salaCss)?.[1];
    expect(fundoDaSala).toBeDefined();
    const regra = /body:has\(\.sala-tv\)\s*\{([^}]*)\}/.exec(estiloCss);
    expect(regra).not.toBeNull();
    expect(regra![1]).toMatch(new RegExp(`background:\\s*${fundoDaSala}`, "i"));
    expect(html("/sala", "?tv")).toContain("sala-tv");
  });

  it("a meta viewport tem viewport-fit=cover (#561): sem ele o iPhone ignora a área segura da barra de baixo", () => {
    const meta = /<meta\s+name="viewport"\s+content="([^"]*)"/.exec(paginaHtml);
    expect(meta).not.toBeNull();
    expect(meta![1]).toContain("viewport-fit=cover");
    expect(meta![1]).toContain("width=device-width");
  });

  it("/escritorio mostra o Escritório, marcado como exemplo, com o que ainda não existe desativado", () => {
    const h = html("/escritorio");
    expect(h).toContain("1º · Produção / ");
    expect(h).not.toContain("Equipe / ");
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
    for (const caminho of ["/", "/leva", "/sala", "/escritorio"]) {
      const links = [...html(caminho).matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith("http"));
      expect(links.length).toBeGreaterThan(0);
      for (const u of links) {
        const doBotao = u.startsWith("https://claude.ai/code?prompt=") && u.endsWith("&amp;repositories=sakura-corp/sakura-system-ace");
        expect(u.startsWith("https://github.com/sakura-corp/") || doBotao).toBe(true);
      }
    }
  });

  it("escolhe a página pelo endereço: / é o Início (#546); /leva e /leva/<n> são a página da leva", () => {
    expect(paginaDoCaminho("/leva/2")).toBe("leva");
    expect(paginaDoCaminho("/escritorio")).toBe("escritorio");
    expect(paginaDoCaminho("/escritorio/")).toBe("escritorio");
    expect(paginaDoCaminho("/sala")).toBe("sala");
    expect(paginaDoCaminho("/")).toBe("inicio");
    expect(paginaDoCaminho("")).toBe("inicio");
    expect(paginaDoCaminho("/leva")).toBe("leva");
    expect(paginaDoCaminho("/leva/")).toBe("leva");
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
  const de = (leva: EstadoDaLeva, caminho = "/leva") => renderToString(<App caminho={caminho} busca="" usuario={usuario} leva={leva} />).replace(/<!-- -->/g, "");
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
    const h = html("/leva");
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

    it("a leva anterior sem tarefa aberta não deixa pegar", () => {
      const h = de(comTarefas([mista[2]], 0), "/leva/0");
      expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Pegar tarefa/);
      expect(h).toContain("esta tarefa não está numa leva aberta");
    });

    it("a leva anterior que ainda tem tarefa aberta deixa pegar", () => {
      const levas = [{ numero: 0, nome: "Leva 0", abertas: 1 }, ...pronto.levas.slice(1)];
      const h = de({ ...pronto, levas, leva: { numero: 0, cortada: false, tarefas: [pronto.leva.tarefas[0]] } }, "/leva/0");
      expect(h).not.toContain("esta tarefa não está numa leva aberta");
      expect(h).toMatch(/<button type="button" class="[^"]*">Pegar tarefa/);
    });
  });

  it("na barra lateral, só a Leva atual; numa leva antiga (/leva/0), o destaque vai pras Levas anteriores", () => {
    const h = de(pronto);
    expect(h).toMatch(/<a href="\/leva" aria-current="page"[^>]*>.*?Leva atual<\/span><\/a>/);
    expect(h).not.toContain('href="/leva/0"');
    const outra = de({ ...pronto, leva: { ...pronto.leva, numero: 0 } }, "/leva/0");
    expect(outra).toMatch(/<a href="\/leva"[^>]*>(?:(?!<\/a>).)*Leva atual<\/span><\/a>/);
    expect(outra).not.toMatch(/<a href="\/leva" aria-current/);
    expect(outra).toMatch(/<a href="\/levas" aria-current="page"[^>]*>.*?Levas anteriores<\/span><\/a>/);
  });

  it("carregando: o esqueleto, sem tarefas de exemplo", () => {
    const h = de({ tipo: "carregando" });
    expect(h).toContain('aria-busy="true"');
    expect(h).toContain("Buscando as tarefas no GitHub");
    expect(h).not.toContain("bruno-exemplo");
  });

  it("logada e sem estado dado, começa carregando (não mostra o exemplo)", () => {
    const h = renderToString(<App caminho="/leva" busca="" usuario={usuario} />);
    expect(h).toContain('aria-busy="true"');
    expect(h).not.toContain("bruno-exemplo");
  });

  it("erro: a mensagem e o botão Tentar de novo; a barra lateral ainda leva pra leva atual", () => {
    const h = de({ tipo: "erro", mensagem: "Não deu pra buscar as tarefas no GitHub agora." });
    expect(h).toMatch(/role="alert"/);
    expect(h).toContain("Não deu pra buscar as tarefas no GitHub agora.");
    expect(h).toMatch(/<button[^>]*>.*Tentar de novo<\/button>/);
    expect(h).toMatch(/<a href="\/leva"[^>]*>.*?Leva atual<\/span><\/a>/);
    const na0 = de({ tipo: "carregando" }, "/leva/0");
    expect(na0).toMatch(/<a href="\/levas" aria-current="page"[^>]*>.*?Levas anteriores<\/span><\/a>/);
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

describe("Início (#546)", () => {
  const usuario = { login: "fulana", avatar: "" };
  const gh = (n: number) => `https://github.com/sakura-corp/sakura-system-ace/pull/${n}`;
  const sala: EstadoDaSala = {
    tipo: "pronto",
    falhas: [],
    leva: 1,
    entradas: [
      { id: "pr-1", tipo: "claude", nome: "PR #1", fazendo: "Revisar o PR #1", url: gh(1), sinais: { revisaoPedidaA: ["fulana"] } },
      { id: "liberar", tipo: "casa", nome: "Liberar", url: gh(2), sinais: { aprovacaoEsperadaDe: ["fulana"] } },
      { id: "pr-3", tipo: "claude", nome: "PR #3", fazendo: "Revisar o PR #3", url: gh(3), sinais: { revisaoPedidaA: ["beltrano"] } },
      { id: "beltrano", tipo: "pessoa", nome: "beltrano", sinais: { tarefaEmAndamento: true } },
    ],
  };
  const leva: EstadoDaLeva = {
    tipo: "pronto",
    levas: [{ numero: 0, nome: "Leva 0", abertas: 0 }, { numero: 1, nome: "Leva 1", abertas: 2 }],
    atual: 1,
    leva: {
      numero: 1,
      cortada: false,
      tarefas: [
        { numero: 40, titulo: "A minha", url: "https://github.com/sakura-corp/sakura-system-ace/issues/40", estado: "andamento", dono: { login: "fulana", avatar: "" }, chefe: "frontend" },
        { numero: 41, titulo: "A do outro", url: "https://github.com/sakura-corp/sakura-system-ace/issues/41", estado: "andamento", dono: { login: "beltrano", avatar: "" }, chefe: "frontend" },
      ],
    },
  };
  const de = (caminho: string, busca = "", l: EstadoDaLeva = leva, sl: EstadoDaSala = sala) =>
    renderToString(<App caminho={caminho} busca={busca} usuario={usuario} leva={l} sala={sl} />).replace(/<!-- -->/g, "");
  const soTexto = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  it("a / é o Início: um h1, o Início marcado na barra e a Leva atual em /leva", () => {
    const h = de("/");
    expect(contarH1(h)).toBe(1);
    expect(h).toMatch(/<h1[^>]*>Início<\/h1>/);
    expect(h).toMatch(/<a href="\/" aria-current="page"/);
    expect(h).toMatch(/<a href="\/leva"(?![^>]*aria-current)[^>]*>(?:(?!<\/a>).)*Leva atual/);
    expect(h).not.toContain("/em-breve/inicio");
  });

  it("o 'precisa de você' do Início é o mesmo da Sala", () => {
    const naSala = soTexto(de("/sala"));
    const noInicio = soTexto(de("/"));
    expect(naSala).toContain("2 coisas precisam de você");
    expect(noInicio).toContain("Precisa de você (2)");
    expect(noInicio).toContain("Revisar o PR #1");
    expect(noInicio).not.toContain("Revisar o PR #3");
  });

  it("A sua tarefa: só a de quem olha, com os botões da #538", () => {
    const h = soTexto(de("/"));
    expect(h).toContain("A minha");
    expect(h).not.toContain("A do outro");
    expect(h).toContain("Começar com o Claude");
    expect(h).toContain("Largar");
  });

  it("as outras páginas continuam abrindo: /leva, /leva/<n>, /sala, /sala?tv, /escritorio", () => {
    expect(de("/leva")).toMatch(/<h1[^>]*>Leva 1<\/h1>/);
    expect(de("/leva/0", "", { ...leva, leva: { ...leva.leva, numero: 0 } })).toMatch(/<h1[^>]*>Leva 0<\/h1>/);
    expect(de("/sala")).toMatch(/<h1[^>]*>Sala<\/h1>/);
    expect(de("/sala", "?tv")).toMatch(/<h1 id="sala-titulo">Sala<\/h1>/);
    expect(de("/escritorio")).toMatch(/<h1[^>]*>Escritório de agentes<\/h1>/);
    for (const c of ["/leva", "/sala", "/escritorio"]) expect(de(c)).not.toMatch(/<h1[^>]*>Início<\/h1>/);
  });

  it("sessão acabou no Início (pela leva ou pela sala): a entrada volta pra /", () => {
    for (const h of [de("/", "", { tipo: "fora" }), de("/", "", leva, { tipo: "fora" })]) {
      expect(h).toContain("Sua sessão acabou. Entre de novo.");
      expect(h).toContain('href="/api/login"');
    }
    expect(de("/sala", "?tv", leva, { tipo: "fora" })).toContain('href="/api/login?volta=%2Fsala%3Ftv"');
    expect(de("/leva/0", "", { tipo: "fora" })).toContain('href="/api/login?volta=%2Fleva%2F0"');
    expect(de("/leva", "", { tipo: "fora" })).toContain('href="/api/login?volta=%2Fleva"');
    expect(de("/sala", "", leva, { tipo: "fora" })).toContain('href="/api/login?volta=%2Fsala"');
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

describe("/levas (#548)", () => {
  const pronto: EstadoDoResumo = {
    tipo: "pronto",
    levas: [
      { numero: 0, nome: "Leva 0", abertas: 0, total: 8, feitas: 8, horas: 14, terminouEm: "2026-10-16T12:00:00Z" },
      { numero: 1, nome: "Leva 1", abertas: 2, total: 11, feitas: 9, horas: 30.5, terminouEm: null },
    ],
    atual: 1,
  };
  const usuario = { login: "sofia", avatar: "" };
  const de = (resumo: EstadoDoResumo) => renderToString(<App caminho="/levas" busca="" usuario={usuario} resumo={resumo} />).replace(/<!-- -->/g, "");
  it("abre a página das levas, e a barra usa as levas do próprio resumo", () => {
    expect(paginaDoCaminho("/levas")).toBe("levas");
    expect(paginaDoCaminho("/levas/")).toBe("levas");
    const h = de(pronto);
    expect(h).toMatch(/<h1[^>]*>Levas anteriores<\/h1>/);
    expect(h).toContain("terminou em 16/10/2026");
    expect(h).toContain("30,5 h estimadas");
    expect(h).toContain('href="/leva"');
    // A leva 0 aparece só na página: a barra e a navegação do celular não listam mais as levas antigas.
    expect(h.match(/href="\/leva\/0"/g)).toHaveLength(1);
  });
  it("carregando, erro e sem levas", () => {
    expect(de({ tipo: "carregando" })).toContain("aria-busy");
    expect(de({ tipo: "erro", mensagem: "deu ruim" })).toContain("deu ruim");
    expect(de({ tipo: "sem-levas" })).toContain("Nenhuma leva ainda.");
  });
});

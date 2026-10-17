import { writeFileSync } from "node:fs";
const OUT = new URL("./", import.meta.url).pathname; // esta pasta
const REPO = "https://github.com/sakura-corp/sakura-system-ace";

const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="i-casa" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10"/></symbol>
<symbol id="i-lista" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></symbol>
<symbol id="i-relogio" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-gente" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M18 14c2.4.3 3.8 2 3.8 4.5"/></symbol>
<symbol id="i-tela" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></symbol>
<symbol id="i-cadeado" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></symbol>
<symbol id="i-busca" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
<symbol id="i-mais" viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3" stroke-linecap="round"/></symbol>
<symbol id="i-externo" viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></symbol>
<symbol id="i-seta" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
</defs></svg>`;
const ic = (n, c = "ic") => `<svg class="${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const item = (href, icone, texto, atual, extra = "", title = "") =>
  `<a class="item" href="${href}"${atual ? ' aria-current="page"' : ""}${title ? ` title="${title}"` : ""}>${ic(icone)}<span>${texto}</span>${extra}</a>`;
const breve = (nome, dep, href, atual) => {
  const corpo = `${ic("cadeado")}<span class="duas"><span class="nome">${nome}</span><span class="dep">${dep}</span></span>`;
  return href
    ? `<a class="item breve" href="${href}"${atual ? ' aria-current="page"' : ""}>${corpo}</a>`
    : `<span class="item breve" title="Em breve">${corpo}</span>`;
};

function nav(atual, aberto = true) {
  return `
<div class="grupo"><p class="g-titulo">Painel</p>
${item("inicio.html", "casa", "Início", atual === "inicio")}
</div>
<div class="grupo"><p class="g-titulo">Trabalho</p>
${item("leva.html", "lista", "Leva atual", atual === "leva", '<span class="cont" title="6 tarefas abertas">6<span class="sr-only"> abertas</span></span>')}
${item("leva.html", "relogio", "Levas anteriores", false, "", "Fora deste desenho: só existe na lista de páginas")}
</div>
<div class="grupo"><p class="g-titulo">Equipe</p>
${item("sala.html", "gente", "Sala", atual === "sala", '<span class="cont alerta" title="2 coisas precisam de você">2<span class="sr-only"> precisam de você</span></span>')}
${item("#", "tela", "Escritório", false, '<span class="cont">exemplo</span>')}
</div>
<details class="grupo recolhivel"${aberto ? " open" : ""}><summary class="g-titulo">Em breve ${ic("seta", "ic seta")}</summary>
${breve("Versões", "depende de uma tarefa da leva 2")}
${breve("Fases da leva", "depende da conversa de desenho")}
${breve("Relatório da leva", "depende da conversa de desenho")}
${breve("Pessoas", "depende da #539")}
${breve("Financeiro", "depende do banco privado", "em-breve.html", atual === "breve")}
${breve("DRE", "depende do Financeiro")}
${breve("Lojas", "depende do banco privado")}
${breve("Configurações", "em breve")}
</details>`;
}

const lateral = (atual) => `
<div class="coluna-lateral"><aside class="lateral" aria-label="Navegação">
  <div class="espaco"><span class="mono" aria-hidden="true">S</span><span class="espaco-txt"><span class="espaco-nome">Sakura Corp<span class="aovivo"><i aria-hidden="true"></i>ao vivo</span></span><span class="espaco-sub">Painel da equipe</span></span></div>
  <button type="button" class="busca" aria-disabled="true" title="Em breve">${ic("busca")}<span>Buscar…</span><kbd>Ctrl K</kbd></button>
  <nav class="nav">${nav(atual)}</nav>
  <div class="eu"><span class="av">V</span><span class="eu-nome">voce-exemplo</span><a class="eu-sair" href="#" title="Em breve">Sair</a></div>
</aside></div>`;

const celular = (atual, titulo) => `
<header class="topo-cel">
  <p class="topo-nome">${titulo}</p>
  <details class="menu-cel"><summary aria-label="Abrir o menu">${ic("menu", "ic grande")}</summary>
    <div class="menu-painel"><nav class="nav">${nav(atual, false)}</nav></div></details>
</header>
<nav class="barra-cel" aria-label="Principal">
  <a href="inicio.html"${atual === "inicio" ? ' aria-current="page"' : ""}>${ic("casa", "ic grande")}<span>Início</span></a>
  <a href="leva.html"${atual === "leva" ? ' aria-current="page"' : ""}>${ic("lista", "ic grande")}<span>Leva</span></a>
  <a href="sala.html"${atual === "sala" ? ' aria-current="page"' : ""}>${ic("gente", "ic grande")}<span>Sala</span></a>
  <a href="em-breve.html"${atual === "breve" ? ' aria-current="page"' : ""}>${ic("mais", "ic grande")}<span>Mais</span></a>
</nav>`;

function pagina({ arquivo, titulo, atual, nomeCel, corpo, extraHead = "" }) {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Painel da Sakura (versão C)</title>
<link rel="stylesheet" href="../comum/base.css">
<link rel="stylesheet" href="../comum/sala.css">
<link rel="stylesheet" href="estilo.css">
</head>
<body>
${sprite}
<div class="faixa-referencia">Desenho de referência (versão C), dados de exemplo</div>
<div class="app">
${lateral(atual)}
<div class="coluna-principal">
${celular(atual, nomeCel).split("<nav class=\"barra-cel\"")[0]}
<main class="principal" id="conteudo">
${corpo}
</main>
<nav class="barra-cel"${celular(atual, nomeCel).split("<nav class=\"barra-cel\"")[1]}
</div>
</div>
</body>
</html>
`;
  writeFileSync(OUT + arquivo, html);
}

const selo = (e) => ({ livre: "Livre", andamento: "Em andamento", revisao: "Em revisão", feita: "Feita" })[e];
const seloHtml = (e) => `<span class="selo ${e}">${selo(e)}</span>`;
const av = (n) => `<span class="av">${n[0].toUpperCase()}</span>`;
const btn = (t, k = "") => `<button type="button" class="btn ${k}">${t}</button>`;

/* ---------- Leva ---------- */
const tarefas = [
  { g: "andamento", n: 536, t: "Painel: o cartão da tarefa lê o cabeçalho", c: "frontend", d: "voce-exemplo", h: "5 h", acao: "menu", sel: true },
  { g: "andamento", n: 510, t: "Janelas de importação no Modal", c: "frontend", d: "carla-exemplo", h: "3 h", acao: "" },
  { g: "revisao", n: 539, t: "Painel: horas por pessoa", c: "frontend", d: "ana-exemplo", h: "3 h", acao: "" },
  { g: "livre", n: 538, t: "Painel: botão “Pegar tarefa” e “Largar”", c: "backend", d: "", h: "6 h", acao: "espera" },
  { g: "livre", n: 511, t: "Testes no Windows", c: "tester", d: "", h: "2 h", acao: "pegar" },
  { g: "livre", n: 540, t: "Ajuste pequeno sem cabeçalho", c: "", d: "", h: "", acao: "incompleta" },
  { g: "feita", n: 455, t: "Clientes que sumiram", c: "backend", d: "bruno-exemplo", h: "6 h", acao: "" },
];
const grupos = [["andamento", "Em andamento"], ["revisao", "Em revisão"], ["livre", "Livres"], ["feita", "Feitas"]];
const traco = `<span class="vazio" aria-label="sem valor">—</span>`;
const acaoTxt = (a, mobile) => {
  if (a === "menu") return `<button type="button" class="btn mini-btn" aria-label="Mais ações da #536" title="Começar com o Claude, copiar texto, largar">${ic("mais")}</button>`;
  if (a === "pegar") return `<button type="button" class="btn prim mini-btn">Pegar</button>`;
  if (a === "espera") return `<span class="espera" title="Depende da #536, que ainda está aberta">Espera #536</span>`;
  if (a === "incompleta") return `<span class="incompleta" title="Falta Chefe e Estimativa no cabeçalho">incompleta</span>`;
  return mobile ? "" : traco;
};
const tabela = `
<div class="cartao tabela-caixa desk-so">
<table class="tabela">
<caption class="sr-only">Tarefas da leva 1, por estado</caption>
<colgroup><col class="c-id"><col><col class="c-chefe"><col class="c-dono"><col class="c-h"><col class="c-estado"><col class="c-acao"></colgroup>
<thead><tr><th scope="col">#</th><th scope="col">Título</th><th scope="col">Chefe</th><th scope="col">Dono</th><th scope="col" class="dir">Horas</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
${grupos.map(([g, nome]) => {
  const ls = tarefas.filter((t) => t.g === g);
  return `<tbody><tr class="cab-grupo"><th colspan="7" scope="colgroup">${nome} <span class="cont-g">${ls.length}</span></th></tr>
${ls.map((t) => `<tr class="linha${t.sel ? " sel" : ""}"><td class="id num">${t.n}</td><td class="tit"><a href="#detalhe"${t.sel ? ' aria-current="true"' : ""}>${t.t}</a></td><td>${t.c || traco}</td><td class="dono">${t.d || traco}</td><td class="dir num">${t.h || traco}</td><td>${seloHtml(t.g)}</td><td class="acao">${acaoTxt(t.acao)}</td></tr>`).join("\n")}
</tbody>`;
}).join("\n")}
</table></div>
<div class="cel-so lista-cel">
${grupos.map(([g, nome]) => {
  const ls = tarefas.filter((t) => t.g === g);
  return `<section aria-label="${nome}"><h3 class="cab-grupo-cel">${nome} <span class="cont-g">${ls.length}</span></h3>
<ul class="linhas">
${ls.map((t) => `<li class="lm${t.sel ? " sel" : ""}"><a class="lm-tit" href="#detalhe"${t.sel ? ' aria-current="true"' : ""}><span class="id num">#${t.n}</span> ${t.t}</a>
<div class="lm-meta">${seloHtml(t.g)}<span class="lm-dono">${t.d || "sem dono"}</span><span class="num">${t.h || "sem horas"}</span><span class="lm-acao">${acaoTxt(t.acao, true)}</span></div></li>`).join("\n")}
</ul></section>`;
}).join("\n")}
</div>`;

const detalhe = `
<aside class="cartao detalhe" id="detalhe" aria-labelledby="det-titulo">
  <p class="det-eyebrow">Tarefa selecionada · a sua</p>
  <h2 id="det-titulo"><span class="id num">#536</span> Painel: o cartão da tarefa lê o cabeçalho</h2>
  <p class="det-estado">${seloHtml("andamento")} <span class="sub">dono: voce-exemplo</span></p>
  <dl class="det-lista">
    <dt>Chefe</dt><dd>frontend</dd>
    <dt>Ajudantes</dt><dd>tester</dd>
    <dt>Estimativa</dt><dd class="num">5 h</dd>
    <dt>Depende de</dt><dd>nada</dd>
    <dt>Sessões filhas</dt><dd>nenhuma</dd>
  </dl>
  <div class="det-botoes">${btn("Começar com o Claude", "prim")}${btn("Copiar texto")}</div>
  <div class="det-rodape">${btn("Largar", "fantasma")}<a class="link-ext" href="${REPO}/issues/536" target="_blank" rel="noopener noreferrer">Abrir no GitHub ${ic("externo")}<span class="sr-only"> (em aba nova)</span></a></div>
</aside>`;

const horas = `
<section class="cartao horas" aria-labelledby="h-titulo">
  <h2 id="h-titulo" class="h2p">Horas por pessoa</h2>
  <table class="mini-tab">
    <thead class="sr-only"><tr><th>Pessoa</th><th>Situação</th><th>Horas</th></tr></thead>
    <tbody>
    <tr><td>${av("bruno")} bruno-exemplo</td><td>entregues</td><td class="dir num">6 h</td></tr>
    <tr><td>${av("voce")} voce-exemplo</td><td>segurando</td><td class="dir num">5 h</td></tr>
    <tr><td>${av("ana")} ana-exemplo</td><td>segurando</td><td class="dir num">3 h</td></tr>
    <tr><td>${av("carla")} carla-exemplo</td><td>segurando</td><td class="dir num">3 h</td></tr>
    </tbody>
  </table>
</section>`;

const leva = `
<header class="cab">
  <div><h1 class="h1 so-desk">Leva 1</h1><p class="sub">Leva atual · 7 tarefas · dados de exemplo</p></div>
</header>
<div class="abas" role="tablist" aria-label="Jeito de ver a leva">
  <a class="aba ativa" role="tab" aria-selected="true" href="leva.html">Lista</a>
  <span class="aba off" role="tab" aria-disabled="true" title="Em breve">Por pessoa <span class="mini">em breve</span></span>
  <span class="aba off" role="tab" aria-disabled="true" title="Em breve">Por chefe <span class="mini">em breve</span></span>
</div>
<div class="leva-grade">
  <div class="col-a">
    <div class="resumo-leva">
    <div class="num-faixa cartao" role="group" aria-label="Contagem por estado">
      <div class="n"><span class="v num">3</span><span class="r">Livres</span></div>
      <div class="n"><span class="v num">2</span><span class="r">Em andamento</span></div>
      <div class="n"><span class="v num">1</span><span class="r">Em revisão</span></div>
      <div class="n"><span class="v num">1</span><span class="r">Feita</span></div>
    </div>
    <div class="prog"><span class="prog-txt"><strong class="num">1 de 7</strong> feitas · <span class="num">6 h de 25 h</span></span><div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="24" aria-label="6 h de 25 h"><i style="width:24%"></i></div></div>
    </div>
    ${tabela}
  </div>
  <div class="col-b">${horas}${detalhe}</div>
</div>`;

pagina({ arquivo: "leva.html", titulo: "Leva atual", atual: "leva", nomeCel: "Leva 1", corpo: leva });

/* ---------- Início ---------- */
const inicio = `
<header class="cab cab-inicio">
  <h1 class="saudacao serif">Boa noite, voce-exemplo</h1>
  <p class="sub">Sábado, 17 de outubro · leva 1 em andamento · dados de exemplo</p>
</header>

<section class="cartao precisa" aria-labelledby="prec-t">
  <div class="bloco-cab"><h2 id="prec-t" class="h2p">Precisa de você</h2><span class="cont alerta">2</span></div>
  <ul class="prec-lista">
    <li><div class="prec-txt"><strong>PR #545 Horas por pessoa pede a sua revisão</strong><span class="sub">de ana-exemplo · há 40 min</span></div><a class="btn prim" href="${REPO}/pulls" target="_blank" rel="noopener noreferrer">Revisar no GitHub<span class="sr-only"> (em aba nova)</span></a></li>
    <li><div class="prec-txt"><strong>A rodada Liberar espera a sua aprovação</strong><span class="sub">robô da casa · há 12 min</span></div><a class="btn prim" href="${REPO}/actions" target="_blank" rel="noopener noreferrer">Aprovar no GitHub<span class="sr-only"> (em aba nova)</span></a></li>
  </ul>
</section>

<div class="tres">
  <section class="cartao bloco" aria-labelledby="b1">
    <div class="bloco-cab"><h2 id="b1" class="h2p">A sua tarefa</h2><a class="ver" href="leva.html">Ver na leva</a></div>
    <p class="tarefa-t"><span class="id num">#536</span> Painel: o cartão da tarefa lê o cabeçalho</p>
    <p class="det-estado">${seloHtml("andamento")} <span class="sub num">5 h · chefe frontend</span></p>
    <div class="det-botoes">${btn("Começar com o Claude", "prim")}${btn("Copiar texto")}</div>
  </section>

  <section class="cartao bloco" aria-labelledby="b2">
    <div class="bloco-cab"><h2 id="b2" class="h2p">Leva 1</h2><a class="ver" href="leva.html">Ver a lista</a></div>
    <p class="grande"><strong class="num">1 de 7</strong> feitas</p>
    <p class="sub num">6 h de 25 h</p>
    <div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="24" aria-label="6 h de 25 h"><i style="width:24%"></i></div>
    <ul class="resumo">
      <li><span>Livres</span><span class="num">3</span></li>
      <li><span>Em andamento</span><span class="num">2</span></li>
      <li><span>Em revisão</span><span class="num">1</span></li>
      <li><span>Feitas</span><span class="num">1</span></li>
    </ul>
  </section>

  <section class="cartao bloco" aria-labelledby="b3">
    <div class="bloco-cab"><h2 id="b3" class="h2p">O que mudou hoje</h2></div>
    <ol class="tempo">
      <li><span class="ponto" aria-hidden="true"></span><span>A conferência do PR #545 passou</span><span class="quando">há 35 min</span></li>
      <li><span class="ponto" aria-hidden="true"></span><span>carla-exemplo pegou a #510</span><span class="quando">há 2 h</span></li>
      <li><span class="ponto" aria-hidden="true"></span><span>bruno-exemplo entregou a #455</span><span class="quando">há 3 h</span></li>
    </ol>
  </section>
</div>`;
pagina({ arquivo: "inicio.html", titulo: "Início", atual: "inicio", nomeCel: "Início", corpo: inicio });

/* ---------- Sala ---------- */
const luz = (tipo, ini) => {
  const marca = tipo === "pessoa"
    ? `<text class="iniciais" x="29" y="34.5" text-anchor="middle">${ini}</text>`
    : tipo === "claude"
      ? `<circle class="marca" cx="23" cy="27" r="2.6"/><circle class="marca" cx="35" cy="27" r="2.6"/><path class="marca-traco" d="M23 35 Q29 39 35 35"/>`
      : `<path class="marca-traco" d="M22 23 H36 M22 29 H36 M22 35 H36"/>`;
  return `<svg class="sala-luz" viewBox="0 0 58 58" aria-hidden="true"><circle class="halo" cx="29" cy="29" r="24"/><circle class="anel" cx="29" cy="29" r="27"/><circle class="nucleo" cx="29" cy="29" r="18"/>${marca}</svg>`;
};
const ROT = { trabalhando: "trabalhando", precisa: "precisa de você", erro: "com erro", dormindo: "dormindo", livre: "livre" };
const BAL = { trabalhando: "digitando…", precisa: "!", erro: "×", dormindo: "zZ", livre: "" };
const gh = (p) => `${REPO}/${p}`;
const E = [
  { t: "pessoa", n: "ana-exemplo", f: "#454 Central do dia", e: "trabalhando", ago: "há 25 min", u: gh("issues/454"), i: "AE" },
  { t: "pessoa", n: "bruno-exemplo", f: "sem tarefa agora", e: "livre", ago: "há 5 h", i: "BE" },
  { t: "claude", n: "Clientes que sumiram", f: "PR pronto, pedindo a sua revisão", e: "precisa", ago: "há 3 h", u: gh("pulls"), l: "Revisar no GitHub" },
  { t: "claude", n: "Painel: a Sala", f: "claude/painel-sala", e: "trabalhando", ago: "há 12 min", u: gh("pulls") },
  { t: "claude", n: "Sessão esquecida", f: "claude/ajuste-antigo", e: "dormindo", ago: "há 4 dias" },
  { t: "casa", n: "Conferência", f: "rodando no PR #477", e: "trabalhando", ago: "há 3 min", u: gh("actions/workflows/ci.yml") },
  { t: "casa", n: "Publicar", f: "última rodada deu certo", e: "livre", ago: "há 20 h", u: gh("actions/workflows/release.yml") },
  { t: "casa", n: "Liberar", f: "rodada esperando a sua aprovação", e: "precisa", ago: "há 40 min", u: gh("actions/workflows/liberar-versao.yml"), l: "Aprovar no GitHub" },
  { t: "casa", n: "Atualizar bancos", f: "última rodada deu certo", e: "livre", ago: "há 2 dias" },
  { t: "casa", n: "Cópia do banco", f: "última rodada deu certo", e: "livre", ago: "há 9 h" },
  { t: "casa", n: "Aviso do Electron", f: "a última rodada falhou", e: "erro", ago: "há 6 h", fora: "https://exemplo.com/fora-do-github" },
];
const fil = [["pessoa", "Pessoas"], ["claude", "Robôs do Claude"], ["casa", "Robôs da casa"]];
const mesa = (b) => `<button type="button" class="sala-mesa s-${b.e}" aria-pressed="false" aria-label="${b.n}, ${ROT[b.e]}, ${b.f}">${luz(b.t, b.i)}<span class="nome">${b.n}</span><span class="faz">${b.f}</span>${BAL[b.e] ? `<span class="sala-balao">${BAL[b.e]}</span>` : ""}</button>`;
const grp = [["precisa", "Precisa de você", "precisa"], ["erro", "Com erro", "sala-grupo-erro"], ["trabalhando", "Trabalhando", "sala-grupo-trabalhando"], ["dormindo", "Dormindo", "sala-grupo-dormindo"], ["livre", "Livres", "sala-grupo-livre"]];
const linkB = (b) => b.u ? ` · <a class="sala-link" href="${b.u}" target="_blank" rel="noopener noreferrer">${b.l || "Abrir no GitHub"}<span class="sr-only"> (em aba nova)</span></a>` : b.fora ? ` · <span class="sala-endereco">${b.fora} (fora do GitHub da Sakura: sem link)</span>` : "";
const sala = `
<section class="sala-j" aria-labelledby="sala-titulo">
  <header class="sala-topo">
    <div><h1 id="sala-titulo">Sala</h1><p class="sala-sub">Dados de exemplo</p></div>
    <div class="sala-topo-direita"><a class="sala-pilula" href="#precisa"><i aria-hidden="true"></i>2 coisas precisam de você</a><span class="sala-conexao c-exemplo"><i aria-hidden="true"></i>dados de exemplo · sem ligação com o GitHub</span></div>
  </header>
  <div class="sala-desenho">
    <div class="sala-vidro sala-quadro" role="group" aria-label="A sala desenhada (a mesma informação está na lista)">
${fil.map(([k, tt]) => `      <div><p class="sala-fileira-titulo">${tt}</p><div class="sala-fileira">${E.filter((b) => b.t === k).map(mesa).join("")}</div></div>`).join("\n")}
    </div>
    <div class="sala-vidro sala-cartao" aria-live="polite"><p class="linha">Clique num ponto de luz (ou Enter, pelo teclado) pra ver o cartão.</p></div>
  </div>
  <div class="sala-lista">
${grp.map(([e, tt, id]) => { const ls = E.filter((b) => b.e === e); return `    <section aria-labelledby="${id}"><h2 id="${id}">${tt} (${ls.length})</h2><ul>
${ls.map((b) => `      <li class="s-${b.e}"><i aria-hidden="true"></i><span><strong>${b.n}</strong> · <span class="sala-estado">${ROT[b.e]}</span></span><span class="linha">${b.f} · ${b.ago}${linkB(b)}</span></li>`).join("\n")}
    </ul></section>`; }).join("\n")}
  </div>
  <p class="sala-tv-dica">Modo TV, pro segundo monitor: <a href="#">/sala?tv</a></p>
</section>`;
pagina({ arquivo: "sala.html", titulo: "Sala", atual: "sala", nomeCel: "Sala", corpo: sala });

/* ---------- Em breve ---------- */
const esq = (n) => Array.from({ length: n }, (_, i) => `<div class="esq-linha"><i class="esq w${(i * 37) % 3}"></i><i class="esq curto"></i><i class="esq curto"></i></div>`).join("");
const embreve = `
<header class="cab">
  <div><h1 class="h1">Financeiro <span class="selo livre">Em breve</span></h1><p class="sub">Empresa · contas da Sakura Corp</p></div>
</header>
<div class="pilha">
  <div class="esqueleto" aria-hidden="true">
    <div class="tres-esq">
      <div class="cartao esq-cartao"><p class="esq-rotulo">Entradas</p><i class="esq grande"></i><i class="esq curto"></i></div>
      <div class="cartao esq-cartao"><p class="esq-rotulo">Saídas</p><i class="esq grande"></i><i class="esq curto"></i></div>
      <div class="cartao esq-cartao"><p class="esq-rotulo">Resultado do mês</p><i class="esq grande"></i><i class="esq curto"></i></div>
    </div>
    <div class="cartao esq-grafico"><i class="esq alto"></i></div>
    <div class="cartao esq-tabela">${esq(5)}</div>
  </div>
  <section class="cartao aviso-breve" aria-labelledby="ab-t">
    <p class="det-eyebrow">${ic("cadeado")} Em breve</p>
    <h2 id="ab-t" class="h2g">Esta página ainda não existe</h2>
    <p class="ab-rot">Do que depende</p>
    <p>Escolher o banco privado (decisão da Sofia).</p>
    <p class="ab-rot">Por quê</p>
    <p>Dinheiro da empresa nunca mora no GitHub, que é público.</p>
  </section>
</div>`;
pagina({ arquivo: "em-breve.html", titulo: "Financeiro", atual: "breve", nomeCel: "Financeiro", corpo: embreve });

/* ---------- Índice ---------- */
writeFileSync(OUT + "index.html", `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Painel v2, versão C</title>
<link rel="stylesheet" href="../comum/base.css">
<style>main{max-width:520px;margin:0 auto;padding:32px 16px}h1{font-size:20px;font-weight:600;margin:0 0 4px}p{color:var(--texto-2);margin:0 0 16px}ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}a{display:block;padding:12px 14px;min-height:44px;border:1px solid var(--borda);border-radius:10px;background:var(--cartao);color:var(--texto);text-decoration:none;font-weight:500}a:hover{border-color:var(--destaque)}</style>
</head>
<body>
<div class="faixa-referencia">Desenho de referência (versão C), dados de exemplo</div>
<main><h1>Painel v2, versão C: Central</h1><p>Denso, em tabela e painel de detalhe.</p>
<ul><li><a href="inicio.html">Início</a></li><li><a href="leva.html">Leva atual</a></li><li><a href="sala.html">Sala</a></li><li><a href="em-breve.html">Em breve (Financeiro)</a></li></ul></main>
</body>
</html>
`);

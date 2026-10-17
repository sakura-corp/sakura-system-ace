import { writeFileSync } from "node:fs";
const DIR = new URL("./", import.meta.url).pathname; // esta pasta
const S = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICO = {
  inicio: S('<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>'),
  leva: S('<rect x="3.5" y="4" width="5" height="16" rx="1.2"/><rect x="10" y="4" width="5" height="10" rx="1.2"/><rect x="16.5" y="4" width="4" height="13" rx="1.2"/>'),
  levas: S('<path d="M12 3.5 3 8.5l9 5 9-5z"/><path d="m3 13 9 5 9-5"/>'),
  versoes: S('<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>'),
  fases: S('<circle cx="5.5" cy="6" r="2.2"/><circle cx="18.5" cy="18" r="2.2"/><path d="M8 6h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6"/>'),
  relatorio: S('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'),
  sala: S('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  pessoas: S('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.5c2.8 0 4.5 1.8 4.5 5"/>'),
  escritorio: S('<rect x="3.5" y="7.5" width="17" height="12.5" rx="2"/><path d="M9 7.5V4.5h6v3M3.5 13h17"/>'),
  empresa: S('<path d="M4 21V4h10v17M14 9h6v12M2.5 21h19M8 8h2M8 12h2M8 16h2"/>'),
  config: S('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  mais: S('<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>'),
  cadeado: S('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  aviso: S('<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v5M12 17.6v.4"/>'),
};
const cad = `<span class="cad">${ICO.cadeado}</span>`;
const item = ({ ic, rot, href, atual, dep }) => {
  if (dep) return `<span class="item bloqueado" aria-disabled="true" title="Em breve: ${dep}"><span class="ic">${ICO[ic]}${cad}</span>${rot}<span class="sr-only"> (em breve: ${dep})</span></span>`;
  return `<a class="item" href="${href}"${atual ? ' aria-current="page"' : ""}><span class="ic">${ICO[ic]}</span>${rot}</a>`;
};
const barra = (atual) => `<nav class="barra" aria-label="Menu do painel"><div class="barra-in">
  <a class="monograma" href="inicio.html" aria-label="Sakura Corp, início">S</a>
  <p class="aovivo" role="status"><i aria-hidden="true"></i>ao vivo</p>
  ${item({ ic: "inicio", rot: "Início", href: "inicio.html", atual: atual === "inicio" })}
  <div class="sep" role="separator"></div>
  ${item({ ic: "leva", rot: "Leva", href: "leva.html", atual: atual === "leva" })}
  ${item({ ic: "levas", rot: "Levas", href: "#" })}
  ${item({ ic: "versoes", rot: "Versões", dep: "depende de uma tarefa da leva 2" })}
  ${item({ ic: "fases", rot: "Fases", dep: "depende da conversa de desenho (leva 2)" })}
  ${item({ ic: "relatorio", rot: "Relatório", dep: "depende da conversa de desenho (leva 2)" })}
  <div class="sep" role="separator"></div>
  ${item({ ic: "sala", rot: "Sala", href: "sala.html", atual: atual === "sala" })}
  ${item({ ic: "pessoas", rot: "Pessoas", dep: "depende da tarefa #539" })}
  ${item({ ic: "escritorio", rot: "Escritório", href: "#" })}
  <div class="sep" role="separator"></div>
  ${atual === "breve" ? item({ ic: "empresa", rot: "Empresa", href: "em-breve.html", atual: true }) : item({ ic: "empresa", rot: "Empresa", href: "em-breve.html" })}
  <div class="vao"></div>
  ${item({ ic: "config", rot: "Config.", dep: "ainda sem data" })}
  <span class="item sair"><span class="ic"><span class="avatar" title="voce-exemplo">V</span></span>voce</span>
</div></nav>`;
const topoM = `<header class="topo-m"><a class="monograma" href="inicio.html" aria-label="Sakura Corp">S</a><span class="nome">Sakura Corp</span><p class="aovivo" role="status"><i aria-hidden="true"></i>ao vivo</p><span class="avatar" title="voce-exemplo">V</span></header>`;
const navM = (atual) => `<nav class="nav-m" aria-label="Menu do celular">
  ${item({ ic: "inicio", rot: "Início", href: "inicio.html", atual: atual === "inicio" })}
  ${item({ ic: "leva", rot: "Leva", href: "leva.html", atual: atual === "leva" })}
  ${item({ ic: "sala", rot: "Sala", href: "sala.html", atual: atual === "sala" })}
  ${item({ ic: "pessoas", rot: "Pessoas", dep: "depende da tarefa #539" })}
  ${item({ ic: "mais", rot: "Mais", href: "em-breve.html", atual: atual === "breve" })}
</nav>`;
const pagina = ({ titulo, atual, corpo, gaveta = "", classe = "conteudo", extraHead = "" }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Painel v2, versão B</title>
<link rel="stylesheet" href="../comum/base.css">
${extraHead}<link rel="stylesheet" href="estilo.css">
</head>
<body>
<div class="faixa-referencia">Desenho de referência (versão B, Quadro), dados de exemplo</div>
${topoM}
<div class="moldura${gaveta ? " com-gaveta" : ""}">
${barra(atual)}
${gaveta}
<main class="${classe}">
${corpo}
</main>
</div>
${navM(atual)}
</body>
</html>
`;
const w = (n, t) => writeFileSync(DIR + n, t);

/* ---------- leva ---------- */
const card = ({ n, t, chefe, aj, h, dono, extra = "", acoes = "", meu = false }) => `<article class="cartao${meu ? " meu" : ""}">
  <p class="num">#${n}</p>
  <h3>${t}</h3>
  <p class="meta"><span>Chefe <b>${chefe}</b></span><span class="num-h"><b>${h}</b></span></p>
  ${aj ? `<p class="nota">Ajudantes: ${aj}</p>` : ""}${extra}
  ${dono ? `<p class="dono"><span class="avatar" aria-hidden="true">${dono[0].toUpperCase()}</span><span>${dono}${meu ? " (você)" : ""}</span></p>` : `<p class="dono sem"><span class="avatar" aria-hidden="true"></span><span>sem dono</span></p>`}
  ${acoes}
</article>`;
const btn = (t, cls = "", dis = false) => `<${dis ? 'button type="button" disabled' : 'a href="#"'} class="btn ${cls}">${t}</${dis ? "button" : "a"}>`;
const col = (cl, est, nome, itens) => `<section class="coluna ${cl}" aria-labelledby="h-${cl}">
  <header><h2 class="estado ${est}" id="h-${cl}">${nome}</h2><span class="qtd">${itens.length}</span></header>
  ${itens.join("\n  ")}
</section>`;
const livres = [
  card({ n: 538, t: "Painel: botão “Pegar tarefa” e “Largar”", chefe: "backend", aj: "frontend, tester", h: "6 h", extra: `<p class="nota">Depende de #536 (aberta)</p>`, acoes: `<div class="acoes">${btn("Espera #536", "", true)}</div>` }),
  card({ n: 511, t: "Testes no Windows", chefe: "tester", h: "2 h", acoes: `<div class="acoes">${btn("Pegar tarefa", "forte")}</div>` }),
  card({ n: 540, t: "Ajuste pequeno sem cabeçalho", chefe: "—", h: "sem estimativa", extra: `<p class="nota">Falta Chefe e Estimativa na tarefa.</p>`, acoes: `<div class="acoes">${btn("tarefa incompleta", "", true)}</div>` }),
];
const andamento = [
  card({ n: 536, t: "Painel: o cartão da tarefa lê o cabeçalho", chefe: "frontend", aj: "tester", h: "5 h", dono: "voce-exemplo", meu: true, acoes: `<div class="acoes">${btn("Começar com o Claude", "forte")}<div class="duas">${btn("Copiar texto")}${btn("Largar")}</div></div>` }),
  card({ n: 510, t: "Janelas de importação no Modal", chefe: "frontend", aj: "tester", h: "3 h", dono: "carla-exemplo" }),
];
const revisao = [card({ n: 539, t: "Painel: horas por pessoa", chefe: "frontend", aj: "tester", h: "3 h", dono: "ana-exemplo" })];
const feitas = [card({ n: 455, t: "Clientes que sumiram", chefe: "backend", aj: "frontend", h: "6 h", dono: "bruno-exemplo" })];
const pil = (login, txt) => `<li class="pilula"><span class="avatar" aria-hidden="true">${login[0].toUpperCase()}</span><b>${login}</b><span class="h">${txt}</span></li>`;
w("leva.html", pagina({ titulo: "Leva atual", atual: "leva", corpo: `
<div class="cabeca">
  <div><p class="olho">Painel da Sakura · levas</p><h1 class="titulo">Leva 1</h1></div>
  <div class="numeros" role="group" aria-label="Resumo da leva">
    <p><strong>1 de 7</strong> tarefas feitas · <strong>6 h</strong> de 25 h</p>
    <div class="barrinha" role="progressbar" aria-label="Tarefas feitas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="14"><div style="width:14%"></div></div>
  </div>
</div>
<h2 class="rotulo-sec">Horas por pessoa</h2>
<ul class="pilulas">
  ${pil("bruno-exemplo", "6 h entregues")}${pil("ana-exemplo", "3 h segurando")}${pil("carla-exemplo", "3 h segurando")}${pil("voce-exemplo", "5 h segurando")}
</ul>
<div class="qw">
  <div class="seletor" role="radiogroup" aria-label="Mostrar tarefas por estado">
    <input type="radio" name="estado" id="r-livres"><label for="r-livres">Livres <b>3</b></label>
    <input type="radio" name="estado" id="r-andamento" checked><label for="r-andamento">Em andamento <b>2</b></label>
    <input type="radio" name="estado" id="r-revisao"><label for="r-revisao">Em revisão <b>1</b></label>
    <input type="radio" name="estado" id="r-feitas"><label for="r-feitas">Feitas <b>1</b></label>
  </div>
  <div class="quadro">
  ${col("c-livres", "e-livre", "Livres", livres)}
  ${col("c-andamento", "e-andamento", "Em andamento", andamento)}
  ${col("c-revisao", "e-revisao", "Em revisão", revisao)}
  ${col("c-feitas", "e-feita", "Feitas", feitas)}
  </div>
</div>` }));

/* ---------- início ---------- */
const pede = (t, meta, btnT) => `<li class="pede"><span class="marca" aria-hidden="true">!</span><div><b>${t}</b><small>${meta}</small></div>${btn(btnT)}</li>`;
w("inicio.html", pagina({ titulo: "Início", atual: "inicio", corpo: `
<div class="cabeca"><div><p class="olho">Sexta-feira, 17 de outubro</p><h1 class="titulo">Oi, voce-exemplo</h1></div></div>
<div class="grade">
  <div class="col">
    <section class="painel alerta" aria-labelledby="t-precisa">
      <h2 id="t-precisa">Precisa de você <span class="qtd">2</span></h2>
      <ul>
        ${pede("PR #545 Horas por pessoa pede a sua revisão", "de ana-exemplo · há 40 min", "Revisar no GitHub")}
        ${pede("A rodada Liberar espera a sua aprovação", "há 12 min", "Aprovar no GitHub")}
      </ul>
    </section>
    <section class="painel mudou" aria-labelledby="t-mudou">
      <h2 id="t-mudou">O que mudou hoje</h2>
      <ul>
        <li><span>carla-exemplo pegou a #510</span><span class="quando">há 2 h</span></li>
        <li><span>bruno-exemplo entregou a #455</span><span class="quando">há 3 h</span></li>
        <li><span>A conferência do PR #545 passou</span><span class="quando">há 35 min</span></li>
      </ul>
    </section>
  </div>
  <div class="col">
    <section class="painel sua" aria-labelledby="t-sua">
      <h2 id="t-sua">A sua tarefa</h2>
      <p class="num olho">#536 · <span class="estado e-andamento">Em andamento</span></p>
      <h3>Painel: o cartão da tarefa lê o cabeçalho</h3>
      <p class="olho">Chefe frontend · 5 h</p>
      <div class="acoes">${btn("Começar com o Claude", "forte")}</div>
    </section>
    <section class="painel resumo" aria-labelledby="t-leva">
      <h2 id="t-leva">Leva 1</h2>
      <p><span class="grande num">1</span> de 7 tarefas feitas</p>
      <p><strong>6 h</strong> de 25 h</p>
      <div class="barrinha" role="progressbar" aria-label="Tarefas feitas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="14"><div style="width:14%"></div></div>
      <a class="btn" href="leva.html">Abrir o quadro da leva</a>
    </section>
  </div>
</div>` }));

/* ---------- sala ---------- */
const luz = (tipo, ini) => {
  const m = tipo === "pessoa" ? `<text class="iniciais" x="29" y="34.5" text-anchor="middle">${ini}</text>`
    : tipo === "claude" ? `<circle class="marca" cx="23" cy="27" r="2.6"/><circle class="marca" cx="35" cy="27" r="2.6"/><path class="marca-traco" d="M23 35 Q29 39 35 35"/>`
    : `<path class="marca-traco" d="M22 23 H36 M22 29 H36 M22 35 H36"/>`;
  return `<svg class="sala-luz" viewBox="0 0 58 58" aria-hidden="true"><circle class="halo" cx="29" cy="29" r="24"/><circle class="anel" cx="29" cy="29" r="27"/><circle class="nucleo" cx="29" cy="29" r="18"/>${m}</svg>`;
};
const ROT = { trabalhando: "trabalhando", precisa: "precisa de você", erro: "com erro", dormindo: "dormindo", livre: "livre" };
const BAL = { trabalhando: "digitando…", precisa: "!", erro: "×", dormindo: "zZ", livre: "" };
const TIT = { precisa: "Precisa de você", erro: "Com erro", trabalhando: "Trabalhando", dormindo: "Dormindo", livre: "Livres" };
const B = [
  ["pessoa", "AE", "ana-exemplo", "#454 Central do dia", "trabalhando", "há 25 min", "Abrir no GitHub"],
  ["pessoa", "BE", "bruno-exemplo", "sem tarefa agora", "livre", "há 5 h", ""],
  ["claude", "", "Clientes que sumiram", "PR pronto, pedindo a sua revisão", "precisa", "há 3 h", "Revisar no GitHub"],
  ["claude", "", "Painel: a Sala", "claude/painel-sala", "trabalhando", "há 12 min", "Abrir no GitHub"],
  ["claude", "", "Sessão esquecida", "claude/ajuste-antigo", "dormindo", "há 4 dias", ""],
  ["casa", "", "Conferência", "rodando no PR #477", "trabalhando", "há 3 min", "Abrir no GitHub"],
  ["casa", "", "Publicar", "última rodada deu certo", "livre", "há 20 h", "Abrir no GitHub"],
  ["casa", "", "Liberar", "rodada esperando a sua aprovação", "precisa", "há 40 min", "Aprovar no GitHub"],
  ["casa", "", "Atualizar bancos", "última rodada deu certo", "livre", "há 2 dias", ""],
  ["casa", "", "Cópia do banco", "última rodada deu certo", "livre", "há 9 h", ""],
  ["casa", "", "Aviso do Electron", "a última rodada falhou", "erro", "há 6 h", "fora"],
];
const fil = (tipo, tit) => `<div><p class="sala-fileira-titulo">${tit}</p><div class="sala-fileira">${B.filter((b) => b[0] === tipo).map((b) => `<button type="button" class="sala-mesa s-${b[4]}" aria-pressed="false" aria-label="${b[2]}, ${ROT[b[4]]}, ${b[3]}">${luz(b[0], b[1])}<span class="nome">${b[2]}</span><span class="faz">${b[3]}</span>${BAL[b[4]] ? `<span class="sala-balao">${BAL[b[4]]}</span>` : ""}</button>`).join("")}</div></div>`;
const grupo = (e) => { const it = B.filter((b) => b[4] === e); return it.length ? `<section aria-labelledby="g-${e}"><h2 id="g-${e}">${TIT[e]} (${it.length})</h2><ul>${it.map((b) => `<li class="s-${b[4]}"><i aria-hidden="true"></i><span><strong>${b[2]}</strong> · <span class="sala-estado">${ROT[b[4]]}</span></span><span class="linha">${b[3]} · ${b[5]}${b[6] === "fora" ? " · https://exemplo.com/fora-do-github (fora do GitHub da Sakura: sem link)" : b[6] ? ` · <a class="sala-link" href="#">${b[6]}</a>` : ""}</span></li>`).join("")}</ul></section>` : ""; };
w("sala.html", pagina({ titulo: "Sala", atual: "sala", classe: "conteudo sala-pag", extraHead: `<link rel="stylesheet" href="../comum/sala.css">\n`, corpo: `
<section class="sala-j" aria-labelledby="sala-titulo">
  <header class="sala-topo">
    <div><h1 id="sala-titulo">Sala</h1><p class="sala-sub">Dados de exemplo</p></div>
    <div class="sala-topo-direita"><a class="sala-pilula" href="#g-precisa"><i aria-hidden="true"></i>2 coisas precisam de você</a><span class="sala-conexao c-exemplo"><i aria-hidden="true"></i>dados de exemplo · sem ligação com o GitHub</span></div>
  </header>
  <div class="sala-desenho">
    <div class="sala-vidro sala-quadro" role="group" aria-label="A sala desenhada (a mesma informação está na lista)">
      ${fil("pessoa", "Pessoas")}${fil("claude", "Robôs do Claude")}${fil("casa", "Robôs da casa")}
    </div>
    <div class="sala-vidro sala-cartao" aria-live="polite"><p class="linha">Clique num ponto de luz (ou Enter, pelo teclado) pra ver o cartão.</p></div>
  </div>
  <div class="sala-lista">${["precisa", "erro", "trabalhando", "dormindo", "livre"].map(grupo).join("")}</div>
  <p class="sala-tv-dica">Modo TV, pro segundo monitor: <a href="#">/sala?tv</a></p>
</section>` }));

/* ---------- em breve ---------- */
const gav = (cls) => `<ul>
  <li${cls ? "" : ' aria-current="page"'}><span class="nome">${ICO.cadeado}Financeiro</span><span class="dep">depende de escolher o banco privado</span></li>
  <li><span class="nome">${ICO.cadeado}DRE</span><span class="dep">depende do Financeiro</span></li>
  <li><span class="nome">${ICO.cadeado}Lojas</span><span class="dep">depende do banco privado</span></li>
</ul>`;
w("em-breve.html", pagina({ titulo: "Financeiro (em breve)", atual: "breve", gaveta: `<aside class="gaveta" aria-label="Grupo Empresa"><h2>Empresa</h2>${gav(false)}</aside>`, corpo: `
<div class="em-breve">
  <p class="olho">Empresa</p>
  <h1 class="titulo">Financeiro <span class="selo-breve">${ICO.cadeado}em breve</span></h1>
  <p class="lead">Entradas, saídas e contas da Sakura Corp, num lugar só, pra quem cuida da empresa.</p>
  <section class="painel so-celular" aria-label="Grupo Empresa"><h2>Empresa</h2><div class="gaveta" style="border:0;padding:0;display:block">${gav(false)}</div></section>
  <section class="painel" aria-labelledby="t-mostra">
    <h2 id="t-mostra">O que vai mostrar</h2>
    <ul class="lista-pontos">
      <li>As entradas e as saídas da empresa, mês a mês.</li>
      <li>As contas a pagar e a receber, com a data de cada uma.</li>
      <li>O caminho até o DRE, o resultado do mês.</li>
    </ul>
  </section>
  <section class="painel" aria-labelledby="t-dep">
    <h2 id="t-dep">Do que depende</h2>
    <div class="depende"><span class="marca" aria-hidden="true">1</span><div><b>Escolher o banco privado</b><p>É a decisão que falta: onde os dados da empresa vão ficar guardados. Decisão da Sofia.</p></div></div>
  </section>
  <p class="aviso" role="note">${ICO.aviso}<span>Dinheiro da empresa nunca mora no GitHub, que é público.</span></p>
</div>` }));

/* ---------- index ---------- */
w("index.html", `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Painel v2, versão B (Quadro)</title>
<link rel="stylesheet" href="../comum/base.css">
<link rel="stylesheet" href="estilo.css">
</head>
<body>
<div class="faixa-referencia">Desenho de referência (versão B, Quadro), dados de exemplo</div>
<main class="indice">
  <h1>Versão B: Quadro</h1>
  <p>A leva como um quadro de colunas, com a barra lateral estreita e, no celular, a barra de baixo.</p>
  <a href="inicio.html">Início<small>o que precisa de você e a sua tarefa</small></a>
  <a href="leva.html">Leva atual<small>o quadro com quatro colunas</small></a>
  <a href="sala.html">Sala<small>as pessoas e os robôs ao vivo</small></a>
  <a href="em-breve.html">Em breve (Financeiro)<small>o grupo Empresa aberto</small></a>
</main>
</body>
</html>
`);

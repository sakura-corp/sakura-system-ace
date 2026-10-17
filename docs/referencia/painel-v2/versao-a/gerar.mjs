import { writeFileSync } from "node:fs";
const pasta = new URL("./", import.meta.url).pathname; // esta pasta

const ICONES = {
  casa: '<path d="M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5"/>',
  leva: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  etiqueta: '<path d="M4 4h8l8 8-8 8-8-8z"/><circle cx="8.5" cy="8.5" r="1"/>',
  etapas: '<path d="M3 19h6v-5h6V9h6"/><path d="M3 5h4"/>',
  documento: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  grupo: '<circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="8" r="2.2"/><path d="M17 13c2.5 0 4 1.7 4 4"/>',
  pessoa: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
  maleta: '<rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6h6v2M4 13h16"/>',
  carteira: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
  barras: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  loja: '<path d="M4 9l1-5h14l1 5H4zM5 9v11h14V9M10 20v-5h4v5"/>',
  ajustes: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16v.5"/>',
  check: '<path d="M5 12.5l4 4 10-10"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  copiar: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  tocar: '<path d="M8 5l11 7-11 7z"/>',
  sair: '<path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4M15 8l4 4-4 4M19 12H9"/>',
  olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
};
const ic = (n, cls = "") => `<svg class="icone ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONES[n]}</svg>`;
const av = (nome, extra = "") => `<span class="avatar ${extra}" aria-hidden="true">${nome[0].toUpperCase()}</span>`;

const item = (arq, atual, icone, rotulo, ativo) =>
  `<a class="item" href="${arq}"${atual === arq ? ' aria-current="page"' : ""}>${ic(icone)}<span class="rotulo">${rotulo}</span></a>`;
const breve = (icone, rotulo, depende) =>
  `<div class="item em-breve" aria-disabled="true">${ic(icone)}<span class="rotulo">${rotulo}<span class="sr-only"> (em breve)</span></span>${ic("cadeado")}<span class="depende">${depende}</span></div>`;

function barra(atual) {
  const fin = `<a class="item em-breve" href="em-breve.html"${atual === "em-breve.html" ? ' aria-current="page"' : ""}>${ic("carteira")}<span class="rotulo">Financeiro<span class="sr-only"> (em breve)</span></span>${ic("cadeado")}<span class="depende">depende do banco privado</span></a>`;
  return `<aside class="barra" id="barra" aria-label="Menu do painel">
  <div class="barra-interna">
    <div class="barra-topo"><span class="marca">Sakura Corp</span><span class="aovivo"><i aria-hidden="true"></i>ao vivo</span><label for="abre" class="fechar-menu" aria-label="Fechar o menu">${ic("fechar")}</label></div>
    <nav aria-label="Páginas">
      ${item("inicio.html", atual, "casa", "Início")}
      <p class="grupo-titulo">Trabalho</p>
      ${item("leva.html", atual, "leva", "Leva atual")}
      ${item("#levas", atual, "relogio", "Levas anteriores")}
      ${breve("etiqueta", "Versões", "depende da leva 2")}
      ${breve("etapas", "Fases da leva", "depende do desenho")}
      ${breve("documento", "Relatório da leva", "depende do desenho")}
      <p class="grupo-titulo">Equipe</p>
      ${item("sala.html", atual, "grupo", "Sala")}
      ${breve("pessoa", "Pessoas", "depende da #539")}
      <a class="item" href="#escritorio">${ic("maleta")}<span class="rotulo">Escritório <span class="exemplo">(exemplo)</span></span></a>
      <p class="grupo-titulo">Empresa</p>
      ${fin}
      ${breve("barras", "DRE", "depende do Financeiro")}
      ${breve("loja", "Lojas", "depende do banco privado")}
    </nav>
    <div class="barra-rodape">
      ${breve("ajustes", "Configurações", "em breve")}
      <div class="pessoa">${av("voce-exemplo", "eu")}<span class="quem">voce-exemplo</span><a href="#sair">Sair</a></div>
    </div>
  </div>
</aside>`;
}

function pagina({ arq, titulo, nomeMovel, trilha, sub, acoes = "", corpo, extraHead = "" }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Sakura Corp (versão A)</title>
<link rel="stylesheet" href="../comum/base.css">
${extraHead}<link rel="stylesheet" href="estilo.css">
</head>
<body>
<div class="faixa-referencia">Desenho de referência (versão A), dados de exemplo</div>
<input type="checkbox" id="abre" aria-label="Abrir o menu">
<header class="topo-movel"><span class="nome-pagina">${nomeMovel}</span><label for="abre" class="botao-menu">${ic("menu")}Menu</label></header>
<label for="abre" class="veu" aria-hidden="true"></label>
<div class="quadro">
${barra(arq)}
<main class="principal">
<div class="miolo">
<header class="cab">
  <div class="cab-texto">
    <p class="trilha">${trilha}</p>
    <h1>${titulo}</h1>
    <p class="sub">${sub}</p>
  </div>
  ${acoes ? `<div class="cab-acoes">${acoes}</div>` : ""}
</header>
${corpo}
</div>
</main>
</div>
</body>
</html>
`;
}

const selo = (k, t) => `<span class="selo sel-${k}">${t}</span>`;
const S = { livre: selo("livre", "Livre"), and: selo("andamento", "Em andamento"), rev: selo("revisao", "Em revisão"), fei: selo("feita", "Feita") };

// ---------- LEVA ----------
const tarefa = (o) => `<li class="tarefa${o.minha ? " minha" : ""}">
  <span class="n num-tarefa">#${o.n}</span>
  <span class="titulo">${o.t}${o.sub ? `<small>${o.sub}</small>` : ""}</span>
  <span class="estado">${o.estado}</span>
  <span class="chefe">${o.chefe ?? '<span class="mudo">sem chefe<span class="sr-only"> (falta)</span></span>'}${o.aj ? `<small>com ${o.aj}</small>` : ""}</span>
  <span class="dono">${o.dono}</span>
  <span class="horas-t">${o.h}</span>
  ${o.extra ? `<div class="extra">${o.extra}</div>` : ""}
</li>`;
const pegar = (n) => `<button type="button" class="botao contorno pequeno" aria-label="Pegar a tarefa #${n}">Pegar tarefa</button>`;
const dono = (nome, eu) => `${av(nome, eu ? "eu" : "")}<span>${nome}${eu ? ' <span class="mudo">(você)</span>' : ""}</span>`;
const livreSem = '<span class="mudo">sem dono</span>';

const tarefas = [
  tarefa({ n: 536, t: "Painel: o cartão da tarefa lê o cabeçalho", estado: S.and, chefe: "frontend", aj: "tester", dono: dono("voce-exemplo", true), h: "5 h", minha: true,
    extra: `<button type="button" class="botao pequeno">${ic("tocar")}Começar com o Claude</button><button type="button" class="botao contorno pequeno">${ic("copiar")}Copiar texto</button><button type="button" class="botao discreto pequeno">Largar</button>` }),
  tarefa({ n: 538, t: "Painel: botão “Pegar tarefa” e “Largar”", sub: "Depende de #536 (aberta)", estado: S.livre, chefe: "backend", aj: "frontend, tester", dono: `<button type="button" class="botao contorno pequeno" disabled>Espera #536</button>`, h: "6 h" }),
  tarefa({ n: 539, t: "Painel: horas por pessoa", estado: S.rev, chefe: "frontend", aj: "tester", dono: dono("ana-exemplo"), h: "3 h" }),
  tarefa({ n: 510, t: "Janelas de importação no Modal", estado: S.and, chefe: "frontend", aj: "tester", dono: dono("carla-exemplo"), h: "3 h" }),
  tarefa({ n: 511, t: "Testes no Windows", estado: S.livre, chefe: "tester", dono: pegar(511), h: "2 h" }),
  tarefa({ n: 455, t: "Clientes que sumiram", estado: S.fei, chefe: "backend", aj: "frontend", dono: dono("bruno-exemplo"), h: "6 h" }),
  tarefa({ n: 540, t: "Ajuste pequeno sem cabeçalho", estado: S.livre, chefe: null, dono: livreSem, h: '<span class="mudo">—</span>',
    extra: `<span class="selo sel-alerta">${"tarefa incompleta"}</span><span class="mudo pequeno-txt">falta Chefe e Estimativa; ainda não dá pra pegar.</span>` }),
].join("\n");

const pessoaHoras = (nome, eu, valor, rot, pct, ok) => `<li>${av(nome, eu ? "eu" : "")}<span>${nome}${eu ? ' <span class="mudo">(você)</span>' : ""}</span><span class="barrinha" aria-hidden="true"><i${ok ? ' class="ok"' : ""} style="width:${pct}%"></i></span><span class="valor num">${valor} <span>${rot}</span></span></li>`;

const leva = `
<section class="cartao contador" aria-label="Andamento da leva">
  <div class="numeros">
    <div class="numero"><b>3</b><span>Livres</span></div>
    <div class="numero"><b>2</b><span>Em andamento</span></div>
    <div class="numero"><b>1</b><span>Em revisão</span></div>
    <div class="numero"><b>1</b><span>Feitas</span></div>
  </div>
  <div class="progresso">
    <p><b class="num" style="color:var(--texto);font-weight:600">1 de 7</b> tarefas feitas · <span class="num">6 h de 25 h</span> (a #540 não tem estimativa)</p>
    <div class="trilho" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="24" aria-label="Horas feitas"><i style="width:24%"></i></div>
  </div>
</section>

<section class="cartao" aria-labelledby="h-horas">
  <div class="cartao-cab"><h2 id="h-horas">Horas por pessoa</h2><p>entregues e em mãos, nesta leva; sem nota nem ranking</p></div>
  <ul class="horas">
    ${pessoaHoras("bruno-exemplo", false, "6 h", "entregues", 100, true)}
    ${pessoaHoras("ana-exemplo", false, "3 h", "segurando", 50)}
    ${pessoaHoras("carla-exemplo", false, "3 h", "segurando", 50)}
    ${pessoaHoras("voce-exemplo", true, "5 h", "segurando", 83)}
  </ul>
</section>

<section aria-labelledby="h-tarefas">
  <div class="cartao">
    <div class="cartao-cab"><h2 id="h-tarefas">Tarefas (7)</h2><p>os botões aparecem só na tarefa de quem olha</p></div>
    <div class="lista-cab" aria-hidden="true"><span>Nº</span><span>Tarefa</span><span>Estado</span><span>Chefe</span><span>Quem</span><span>Horas</span></div>
    <ul class="lista-corpo">
${tarefas}
    </ul>
  </div>
</section>`;

// ---------- INÍCIO ----------
const inicio = `
<div class="duas">
  <div class="coluna">
    <section aria-labelledby="h-precisa">
      <div class="secao-titulo"><h2 id="h-precisa">Precisa de você (2)</h2></div>
      <ul class="cartao avisos">
        <li><span class="ico" aria-hidden="true">${ic("olho")}</span><span><strong>PR #545 Horas por pessoa pede a sua revisão</strong><small>de ana-exemplo · há 40 min</small></span><a class="botao contorno pequeno" href="#revisar">Revisar</a></li>
        <li><span class="ico" aria-hidden="true">${ic("alerta")}</span><span><strong>A rodada Liberar espera a sua aprovação</strong><small>há 12 min</small></span><a class="botao contorno pequeno" href="#aprovar">Aprovar</a></li>
      </ul>
    </section>
    <section aria-labelledby="h-minha">
      <div class="secao-titulo"><h2 id="h-minha">A sua tarefa</h2></div>
      <div class="cartao cartao-pad minha-tarefa">
        <div class="meta"><span class="num-tarefa">#536</span>${S.and}<span class="num">5 h</span></div>
        <h3>Painel: o cartão da tarefa lê o cabeçalho</h3>
        <p class="meta">Chefe: frontend · Ajudante: tester · Depende de: nada</p>
        <div class="botoes"><button type="button" class="botao">${ic("tocar")}Começar com o Claude</button><button type="button" class="botao contorno">${ic("copiar")}Copiar texto</button><button type="button" class="botao discreto">Largar</button></div>
      </div>
    </section>
  </div>
  <div class="coluna">
    <section aria-labelledby="h-leva">
      <div class="secao-titulo"><h2 id="h-leva">Leva 1</h2><a href="leva.html">Ver a leva</a></div>
      <div class="cartao cartao-pad resumo-leva">
        <p class="grande num">1 <span>de 7 tarefas feitas</span></p>
        <div class="trilho" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="24" aria-label="Horas feitas"><i style="width:24%"></i></div>
        <p class="mudo num">6 h de 25 h feitas</p>
        <div class="contagens">${S.livre.replace("Livre", "3 livres")}${S.and.replace("Em andamento", "2 em andamento")}${S.rev.replace("Em revisão", "1 em revisão")}${S.fei.replace("Feita", "1 feita")}</div>
      </div>
    </section>
    <section aria-labelledby="h-mudou">
      <div class="secao-titulo"><h2 id="h-mudou">O que mudou hoje</h2></div>
      <ul class="cartao mudou">
        <li>${av("carla-exemplo")}<span><b style="font-weight:600">carla-exemplo</b> pegou a #510</span><time>há 2 h</time></li>
        <li>${av("bruno-exemplo")}<span><b style="font-weight:600">bruno-exemplo</b> entregou a #455</span><time>há 3 h</time></li>
        <li><span class="ico" aria-hidden="true">${ic("check", "")}</span><span>A conferência do PR #545 passou</span><time>há 35 min</time></li>
      </ul>
    </section>
  </div>
</div>`;

// ---------- EM BREVE ----------
const embreve = `
<section class="cartao em-breve-topo">
  <span class="cadeado-grande" aria-hidden="true">${ic("cadeado")}</span>
  <div><h2>Ainda não está pronto</h2><p>O Financeiro mostra as contas da Sakura Corp. Ele só abre quando houver um lugar seguro, e privado, pra guardar esses dados.</p></div>
</section>
<div class="listas">
  <section class="cartao cartao-pad" aria-labelledby="h-vai">
    <div class="secao-titulo"><h2 id="h-vai">O que vai mostrar</h2></div>
    <ul class="lista-calma">
      <li>${ic("check")}<span>Entradas e saídas do mês</span></li>
      <li>${ic("check")}<span>Contas a pagar e a receber da Sakura Corp</span></li>
      <li>${ic("check")}<span>O resumo do mês, que alimenta o DRE</span></li>
    </ul>
  </section>
  <section class="cartao cartao-pad" aria-labelledby="h-depende">
    <div class="secao-titulo"><h2 id="h-depende">Do que depende</h2></div>
    <ul class="lista-calma">
      <li>${ic("relogio")}<span>Escolher o banco privado<small>Decisão da Sofia.</small></span></li>
      <li>${ic("relogio")}<span>Ligar o painel a esse banco<small>Só depois da escolha.</small></span></li>
    </ul>
  </section>
</div>
<div class="aviso-dinheiro" role="note">${ic("alerta")}<p><strong>Dinheiro da empresa nunca mora no GitHub, que é público.</strong>Por isso esta página fica desligada até o banco privado existir.</p></div>`;

// ---------- SALA ----------
const luz = (tipo, ini) => {
  const marca = tipo === "pessoa" ? `<text class="iniciais" x="29" y="34.5" text-anchor="middle">${ini}</text>`
    : tipo === "claude" ? '<circle class="marca" cx="23" cy="27" r="2.6"/><circle class="marca" cx="35" cy="27" r="2.6"/><path class="marca-traco" d="M23 35 Q29 39 35 35"/>'
    : '<path class="marca-traco" d="M22 23 H36 M22 29 H36 M22 35 H36"/>';
  return `<svg class="sala-luz" viewBox="0 0 58 58" aria-hidden="true"><circle class="halo" cx="29" cy="29" r="24"/><circle class="anel" cx="29" cy="29" r="27"/><circle class="nucleo" cx="29" cy="29" r="18"/>${marca}</svg>`;
};
const ROT = { trabalhando: "trabalhando", precisa: "precisa de você", erro: "com erro", dormindo: "dormindo", livre: "livre" };
const BAL = { trabalhando: "digitando…", precisa: "!", erro: "×", dormindo: "zZ", livre: "" };
const E = [
  ["pessoa", "ana-exemplo", "AE", "#454 Central do dia", "trabalhando", "há 25 min", "Abrir no GitHub"],
  ["pessoa", "bruno-exemplo", "BE", "sem tarefa agora", "livre", "há 5 h", null],
  ["claude", "Clientes que sumiram", "", "PR pronto, pedindo a sua revisão", "precisa", "há 3 h", "Revisar no GitHub"],
  ["claude", "Painel: a Sala", "", "claude/painel-sala", "trabalhando", "há 12 min", "Abrir no GitHub"],
  ["claude", "Sessão esquecida", "", "claude/ajuste-antigo", "dormindo", "há 4 dias", null],
  ["casa", "Conferência", "", "rodando no PR #477", "trabalhando", "há 3 min", "Abrir no GitHub"],
  ["casa", "Publicar", "", "última rodada deu certo", "livre", "há 20 h", "Abrir no GitHub"],
  ["casa", "Liberar", "", "rodada esperando a sua aprovação", "precisa", "há 40 min", "Aprovar no GitHub"],
  ["casa", "Atualizar bancos", "", "última rodada deu certo", "livre", "há 2 dias", null],
  ["casa", "Cópia do banco", "", "última rodada deu certo", "livre", "há 9 h", null],
  ["casa", "Aviso do Electron", "", "a última rodada falhou", "erro", "há 6 h", "TEXTO"],
];
const fil = (tipo, titulo) => `<div><p class="sala-fileira-titulo">${titulo}</p><div class="sala-fileira">${E.filter((e) => e[0] === tipo).map((e) =>
  `<button type="button" class="sala-mesa s-${e[4]}" aria-pressed="false" aria-label="${e[1]}, ${ROT[e[4]]}, ${e[3]}">${luz(e[0], e[2])}<span class="nome">${e[1]}</span><span class="faz">${e[3]}</span>${BAL[e[4]] ? `<span class="sala-balao">${BAL[e[4]]}</span>` : ""}</button>`).join("")}</div></div>`;
const grupo = (id, titulo, estados) => {
  const l = E.filter((e) => estados === e[4]);
  return `<section aria-labelledby="g-${id}"><h2 id="g-${id}">${titulo} (${l.length})</h2><ul>${l.map((e) =>
    `<li class="s-${e[4]}"><i aria-hidden="true"></i><span><strong>${e[1]}</strong> · <span class="sala-estado">${ROT[e[4]]}</span></span><span class="linha">${e[3]} · ${e[5]}${e[6] === "TEXTO" ? " · https://exemplo.com/fora-do-github (fora do GitHub da Sakura: sem link)" : e[6] ? ` · <a class="sala-link" href="#">${e[6]}</a>` : ""}</span></li>`).join("")}</ul></section>`;
};
const sala = `
<section class="sala-j moldura-sala" aria-labelledby="sala-titulo">
  <header class="sala-topo">
    <div><h2 id="sala-titulo">Agora</h2><p class="sala-sub">Dados de exemplo</p></div>
    <div class="sala-topo-direita">
      <a class="sala-pilula" href="#precisa"><i aria-hidden="true"></i>2 coisas precisam de você</a>
      <span class="sala-conexao c-exemplo"><i aria-hidden="true"></i>dados de exemplo · sem ligação com o GitHub</span>
    </div>
  </header>
  <div class="sala-desenho">
    <div class="sala-vidro sala-quadro" role="group" aria-label="A sala desenhada (a mesma informação está na lista)">
      ${fil("pessoa", "Pessoas")}${fil("claude", "Robôs do Claude")}${fil("casa", "Robôs da casa")}
    </div>
    <div class="sala-vidro sala-cartao" aria-live="polite"><p class="linha">Clique num ponto de luz (ou Enter, pelo teclado) pra ver o cartão.</p></div>
  </div>
  <div class="sala-lista">
    ${grupo("precisa", "Precisa de você", "precisa")}${grupo("erro", "Com erro", "erro")}${grupo("trab", "Trabalhando", "trabalhando")}${grupo("dorm", "Dormindo", "dormindo")}${grupo("livre", "Livres", "livre")}
  </div>
  <p class="sala-tv-dica">Modo TV, pro segundo monitor: <a href="#tv">/sala?tv</a></p>
</section>`;

const escreve = (nome, conteudo) => writeFileSync(pasta + nome, conteudo);
escreve("inicio.html", pagina({ arq: "inicio.html", titulo: "Início", nomeMovel: "Início", trilha: "<b>Início</b>", sub: "O que precisa de você agora e como anda a leva.", acoes: `<a class="botao contorno" href="leva.html">Ver a leva atual</a>`, corpo: inicio }));
escreve("leva.html", pagina({ arq: "leva.html", titulo: "Leva 1", nomeMovel: "Leva atual", trilha: "Trabalho / <b>Leva atual</b>", sub: "7 tarefas, 25 h estimadas. Quem pega uma tarefa vira o dono dela.", acoes: `<a class="botao contorno" href="#github">Abrir no GitHub</a>`, corpo: leva }));
escreve("sala.html", pagina({ arq: "sala.html", titulo: "Sala", nomeMovel: "Sala", trilha: "Equipe / <b>Sala</b>", sub: "As pessoas e os robôs, ao vivo.", acoes: `<a class="botao contorno" href="#tv">Modo TV</a>`, corpo: sala, extraHead: '<link rel="stylesheet" href="../comum/sala.css">\n' }));
escreve("em-breve.html", pagina({ arq: "em-breve.html", titulo: "Financeiro", nomeMovel: "Financeiro", trilha: "Empresa / <b>Financeiro</b>", sub: "As contas da Sakura Corp, num lugar só.", acoes: `<span class="selo sel-livre">Em breve</span>`, corpo: embreve }));
escreve("index.html", `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Painel v2, versão A</title>
<link rel="stylesheet" href="../comum/base.css"><link rel="stylesheet" href="estilo.css"></head>
<body><div class="faixa-referencia">Desenho de referência (versão A), dados de exemplo</div>
<main class="indice"><h1>Painel v2, versão A: Calma</h1><p class="mudo">A evolução do painel de hoje. Escolha uma página.</p>
<ul>
<li><a href="inicio.html">Início<span>precisa de você, a sua tarefa, a leva e o que mudou</span></a></li>
<li><a href="leva.html">Leva atual<span>contador, horas por pessoa e a lista compacta</span></a></li>
<li><a href="sala.html">Sala<span>a janela escura dentro da moldura nova</span></a></li>
<li><a href="em-breve.html">Financeiro (em breve)<span>a página calma de quem ainda não abre</span></a></li>
</ul></main></body></html>
`);

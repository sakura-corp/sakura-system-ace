// A medição de largura que roda DENTRO da página, pelo Playwright
// (scripts/varredura-largura-telas.mjs).
//
// O defeito que ela procura (#425): conteúdo mais largo que a janela que
// fica escondido, sem barra pra rolar até ele. Na lista de OS em 1366, os
// botões "Faturar" e "Fechamento" ficavam fora da tela, e não havia como
// chegar neles.
//
// Três perguntas:
//
// 1. A área da tela (o <main>) passa do lado direito da janela? Aconteceu
//    porque, numa linha flex, um item sem `min-w-0` cresce até a largura do
//    filho mais largo em vez de ficar do tamanho da janela.
// 2. Alguma caixa tem conteúdo mais largo do que ela e CORTA o resto sem dar
//    jeito de rolar? Isso é `overflow: hidden` (o `overflow-hidden
//    sakura-card` em volta das tabelas era o caso clássico) ou rolagem com a
//    barra escondida (a AreaRolavel esconde a barra nativa, e a dela só
//    rola na vertical). Texto com reticências (`truncate`) é corte de
//    propósito e fica de fora. Num campo vazio, conta a dica (placeholder)
//    que não cabe.
// 3. Alguma janela (modal) passa do lado direito da janela? E o fundo
//    escurecido dela cobre a tela inteira? Ele é fixo, mas encolhe se
//    herdar margem (a de um space-y-*, que deixava uma faixa sem escurecer)
//    ou se algum ancestral prender elementos fixos (backdrop-filter,
//    transform, contain).
// 4. Só nas telas que pedem (`semRolar`): alguma caixa precisa rolar de lado?
//    A lista de OS tem que caber inteira em 1366, sem rolar (#425): a barra
//    de rolar de lado fica no pé da tabela, e com a lista comprida ninguém
//    chega nela.

export const MEDIR_LARGURA = ({ semRolar = false } = {}) => {
  const larguraJanela = document.documentElement.clientWidth;
  const FOLGA = 2; // arredondamento de subpixel não é defeito
  const achados = [];

  function caminho(elemento) {
    const partes = [];
    let atual = elemento;
    for (let i = 0; atual && i < 3; i++) {
      const classes = (atual.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .join(".");
      partes.unshift(atual.tagName.toLowerCase() + (classes ? "." + classes : ""));
      atual = atual.parentElement;
    }
    return partes.join(" > ");
  }

  function visivel(elemento) {
    return elemento.getClientRects().length > 0;
  }

  const main = document.querySelector("main");
  if (main) {
    const direita = Math.round(main.getBoundingClientRect().right);
    if (direita > larguraJanela + FOLGA) {
      achados.push({
        tipo: "a área da tela passa da janela",
        caminho: caminho(main),
        excesso: direita - larguraJanela,
      });
    }
  }

  for (const elemento of document.querySelectorAll("body *")) {
    if (!(elemento instanceof HTMLElement) || !visivel(elemento)) continue;
    const excesso = elemento.scrollWidth - elemento.clientWidth;
    if (excesso <= FOLGA || elemento.clientWidth <= 1) continue;

    const estilo = getComputedStyle(elemento);
    const corta = estilo.overflowX === "hidden" || estilo.overflowX === "clip";
    const rolaSemBarra =
      (estilo.overflowX === "auto" || estilo.overflowX === "scroll") &&
      estilo.scrollbarWidth === "none";
    const rolaComBarra =
      (estilo.overflowX === "auto" || estilo.overflowX === "scroll") && !rolaSemBarra;
    if (corta && estilo.textOverflow === "ellipsis") continue;
    // Só a caixa de uma TABELA conta aqui: uma lista de opções aberta
    // (overflow-y-auto, que o navegador também calcula como auto na
    // horizontal) ou um campo de texto comprido não são a tela rolando.
    const caixaDeTabela = elemento.querySelector(":scope > table") !== null;
    if (rolaComBarra && semRolar && caixaDeTabela) {
      achados.push({
        tipo: "precisa rolar de lado (esta tela tem que caber inteira)",
        caminho: caminho(elemento),
        excesso,
      });
      continue;
    }
    if (!corta && !rolaSemBarra) continue;
    // Campo de texto rola por dentro desde sempre: um nome comprido digitado
    // nele não é defeito. Defeito é a DICA (placeholder) não caber no campo
    // vazio — foi assim que o "Sem técnico definido" virava "Ser" no item da
    // OS em 1024.
    if (
      (elemento instanceof HTMLInputElement || elemento instanceof HTMLTextAreaElement) &&
      elemento.value !== ""
    ) {
      continue;
    }

    achados.push({
      tipo: corta ? "conteúdo cortado sem rolagem" : "rola de lado, mas sem barra",
      caminho: caminho(elemento),
      excesso,
    });
  }

  const alturaJanela = document.documentElement.clientHeight;
  for (const fundo of document.querySelectorAll(".sakura-modal-fundo")) {
    if (!visivel(fundo)) continue;
    const r = fundo.getBoundingClientRect();
    const cobre =
      r.left <= FOLGA &&
      r.top <= FOLGA &&
      r.right >= larguraJanela - FOLGA &&
      r.bottom >= alturaJanela - FOLGA;
    if (!cobre) {
      achados.push({
        tipo: "o fundo da janela (modal) não cobre a tela inteira",
        caminho: caminho(fundo),
        // Quantos pixels faltam, no lado em que falta mais.
        excesso: Math.round(
          Math.max(r.left, r.top, larguraJanela - r.right, alturaJanela - r.bottom),
        ),
      });
    }
  }

  for (const dialogo of document.querySelectorAll("[role='dialog'], .sakura-modal")) {
    if (!visivel(dialogo)) continue;
    const direita = Math.round(dialogo.getBoundingClientRect().right);
    if (direita > larguraJanela + FOLGA) {
      achados.push({
        tipo: "a janela (modal) passa da tela",
        caminho: caminho(dialogo),
        excesso: direita - larguraJanela,
      });
    }
  }

  return achados;
};

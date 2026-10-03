// Comparar as telas entre duas versões do Electron (#385).
//
// Roda com:
//   npm run comparar:electron -- 36          o Electron do projeto × a última 36.x
//   npm run comparar:electron -- 36 40       a última 36.x × a última 40.x
//   npm run comparar:electron -- projeto     o do projeto × ele mesmo (mede o ruído)
//
// Por que existe: subir o Electron troca o Chromium que desenha as telas, e
// isso já mudou o comportamento de campo neste projeto (docs/licoes.md, item
// 41). As varreduras de sempre (contraste:telas, largura:telas) abrem o app
// num Chromium avulso — que é o mesmo com qualquer Electron instalado, então
// elas não enxergam esse tipo de mudança. Este aqui abre o app DENTRO de cada
// Electron, visita todas as telas do catálogo e compara:
//
//   - a imagem de cada tela, ponto por ponto (com o relógio parado no mesmo
//     instante nas duas rodadas, pra "hoje" e a hora saírem iguais);
//   - o comportamento dos campos que o Chromium controla sozinho: as setas e
//     a rodinha num campo de número (o item 41 de docs/licoes.md) e a
//     digitação num campo de data;
//   - as telas que falharam e os erros de console de cada lado.
//
// O resultado fica numa pasta temporária, com um relatorio.html que mostra
// antes, depois e onde mudou, lado a lado. A suavização do contorno das
// letras muda a cada Chromium e ninguém enxerga, então cada tela tem duas
// medidas: "cru" e "a olho" (ver TOLERANCIA_CRU). Termina com erro quando
// alguma coisa mudou a olho, num campo, ou numa tela que falhou — e isso não
// quer dizer defeito: quer dizer "olhar o relatório antes de seguir". O que
// ele não alcança (a impressão de verdade, o uso do dia a dia) continua
// sendo o teste na loja.
//
// As outras versões do Electron são baixadas numa pasta temporária, fora do
// projeto — nada aqui mexe no package.json nem no node_modules.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { percorrerTelas } from "../site/ferramentas/percorrer-telas.mjs";
import { comServidorDeTelas } from "../site/ferramentas/servidor-telas.mjs";
import { carregarChromium } from "../site/ferramentas/playwright.mjs";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(os.tmpdir(), "sakura-electron");

// Duas medidas por tela, calibradas no 33 × 36 (docs/licoes.md, item 82):
//
// - "cru": um ponto conta como diferente quando alguma das três cores muda
//   mais que 16 (de 0 a 255). Pega tudo, inclusive o jeito de suavizar o
//   contorno das letras, que muda a cada versão do Chromium e ninguém
//   enxerga: no 33 × 36, TODAS as telas mudaram assim (até 0,5%).
// - "a olho": as duas imagens passam antes por um desfoque leve (1,5 ponto),
//   que apaga essa diferença de contorno e mantém o resto (coisa que mudou de
//   lugar, de cor, que sumiu ou apareceu). No 33 × 36, deu zero onde só o
//   contorno mudou, e pegou uma barra de rolagem de 6 pontos de largura.
const TOLERANCIA_CRU = 16;
const DESFOQUE_A_OLHO = "blur(1.5px)";
const TOLERANCIA_A_OLHO = 24;

const argumentos = process.argv.slice(2);
const [antesPedido, depoisPedido] =
  argumentos.length >= 2 ? argumentos : ["projeto", argumentos[0]];

if (!depoisPedido) {
  console.error(
    "Diga com qual Electron comparar. Exemplos:\n" +
      "  npm run comparar:electron -- 36        (o do projeto × a última 36.x)\n" +
      "  npm run comparar:electron -- 36 40     (a última 36.x × a última 40.x)\n" +
      "  npm run comparar:electron -- projeto   (o do projeto × ele mesmo: mede o ruído)",
  );
  process.exit(1);
}

/** Devolve { rotulo, versao, executavel } de "projeto", "36" ou "36.9.5". */
function prepararElectron(pedido) {
  const require = createRequire(import.meta.url);
  if (pedido === "projeto") {
    const versao = JSON.parse(
      fs.readFileSync(path.join(RAIZ, "node_modules/electron/package.json"), "utf8"),
    ).version;
    return { rotulo: `projeto-${versao}`, versao, executavel: require(path.join(RAIZ, "node_modules/electron")) };
  }
  if (!/^\d+(\.\d+\.\d+)?$/.test(pedido)) {
    throw new Error(`"${pedido}" não é uma versão: use "projeto", uma linha (36) ou uma versão (36.9.5).`);
  }
  const pasta = path.join(CACHE, pedido);
  const pacote = path.join(pasta, "node_modules/electron");
  if (!fs.existsSync(path.join(pacote, "package.json"))) {
    console.log(`Baixando o Electron ${pedido} (só na primeira vez)...`);
    fs.mkdirSync(pasta, { recursive: true });
    const instalacao = spawnSync(
      "npm",
      ["install", "--prefix", pasta, `electron@${pedido}`, "--no-save", "--no-package-lock",
        "--no-audit", "--no-fund", "--loglevel=error"],
      { stdio: "inherit" },
    );
    if (instalacao.status !== 0) throw new Error(`Não consegui instalar o electron@${pedido}.`);
  }
  // Da linha 42 em diante, o Electron não se baixa mais sozinho ao instalar:
  // o programa de verdade só vem na primeira vez que alguém o chama.
  if (!fs.existsSync(path.join(pacote, "path.txt"))) {
    const baixar = spawnSync("node", [path.join(pacote, "install.js")], { cwd: pacote, stdio: "inherit" });
    if (baixar.status !== 0) throw new Error(`Não consegui baixar o programa do Electron ${pedido}.`);
  }
  const versao = JSON.parse(fs.readFileSync(path.join(pacote, "package.json"), "utf8")).version;
  return { rotulo: versao, versao, executavel: require(pacote) };
}

// O que o Chromium faz sozinho num campo, sem passar pelo código do app.
// Cada sonda roda numa tela que tem o campo, depois da foto.
const SONDAS = {
  "12-produto-form": async (pagina) => {
    // Item 41: seta pra baixo num campo de número com step 0,01 virava 1,99,
    // e a rodinha também mexe no valor quando a tela não tem mais pra onde
    // rolar. O app bloqueia as duas (useNaoMexerNoNumeroSemDigitar); aqui se
    // confere que continua assim. O campo fica selecionado, como fica logo
    // depois de alguém digitar.
    const campo = pagina.locator('input[type="number"]:visible').first();
    const rolarProTopo = () =>
      campo.evaluate((el) => {
        for (let e = el.parentElement; e; e = e.parentElement) e.scrollTop = 0;
      });
    const cursorNoCampo = async () => {
      const caixa = await campo.boundingBox();
      await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    };

    await campo.fill("2");
    await campo.press("ArrowDown");
    await campo.press("ArrowDown");
    await campo.press("ArrowUp");
    const depoisDasSetas = await campo.inputValue();

    // Com a tela no topo, a rodinha pra cima não tem o que rolar.
    await rolarProTopo();
    await campo.fill("2");
    await cursorNoCampo();
    await pagina.mouse.wheel(0, -120);
    await pagina.waitForTimeout(300);
    const rodinhaNoTopo = await campo.inputValue();

    // No meio do caminho, a rodinha pra baixo rola a tela.
    await rolarProTopo();
    await campo.fill("2");
    await cursorNoCampo();
    await pagina.mouse.wheel(0, 120);
    await pagina.waitForTimeout(300);
    const rodinhaRolando = await campo.inputValue();

    return {
      "número: setas ↓↓↑ em cima do 2": depoisDasSetas,
      "número: rodinha pra cima, tela já no topo, em cima do 2": rodinhaNoTopo,
      "número: rodinha pra baixo, tela rolando, em cima do 2": rodinhaRolando,
    };
  },
  "31-conta-pagar-form": async (pagina) => {
    // Digitar a data pelo teclado, como no balcão: dia, mês e ano.
    const campo = pagina.locator('input[type="date"]:visible').first();
    await campo.click({ position: { x: 12, y: 10 } });
    await pagina.keyboard.type("15102026");
    await pagina.waitForTimeout(200);
    return { "data: digitar 15102026": await campo.inputValue() };
  },
};

async function rodada(electron, pasta, horaFixa) {
  fs.mkdirSync(pasta, { recursive: true });
  const comportamento = {};
  let chromium = "";

  async function aoChegar(cena, pagina) {
    // A sessão de mentira às vezes cai (percorrer-telas.mjs explica), e se
    // cair entre o último clique e a foto, a foto sai da tela de login. Isso
    // vira falha da cena, e a cena é repetida no fim.
    if (!cena.deslogado && !cena.trocarSenha && (await pagina.locator("aside").count()) === 0) {
      throw new Error("a sessão caiu antes da foto");
    }
    // A barra de rolagem desenhada pelo app (AreaRolavel) só se recalcula
    // quando a tela redesenha ou a janela muda de tamanho. Sem este aviso,
    // ela às vezes fica com a medida da tela ANTERIOR, e a foto passa a
    // depender da ordem em que as telas foram visitadas — foi o que fez 34
    // telas "mudarem" no primeiro 33 × 36.
    await pagina.evaluate(() => window.dispatchEvent(new Event("resize")));
    await pagina.waitForTimeout(150);
    // A versão do Chromium de verdade, pra constar no relatório.
    chromium ||= await pagina.evaluate(
      () => `Chromium ${navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? "?"}`,
    );
    await pagina.screenshot({ path: path.join(pasta, `${cena.arquivo}.png`) });
    const sonda = SONDAS[cena.arquivo];
    if (sonda) {
      try {
        Object.assign(comportamento, await sonda(pagina));
      } catch (erro) {
        comportamento[`${cena.arquivo}: a sonda falhou`] = String(erro).split("\n")[0];
      }
    }
  }

  console.log(`\n== Electron ${electron.versao} ==`);
  const primeira = await percorrerTelas(aoChegar, () => true, {
    electron: electron.executavel,
    horaFixa,
  });
  const feitas = primeira.feitas.map((c) => c.arquivo);
  let falhas = primeira.falhas;
  const errosDeConsole = [...primeira.errosDeConsole];

  // Uma segunda chance pras cenas que falharam, numa janela nova.
  if (falhas.length > 0) {
    const repetir = falhas.map(([arquivo]) => arquivo);
    console.log(`\n   repetindo ${repetir.length} tela(s): ${repetir.join(", ")}`);
    const segunda = await percorrerTelas(aoChegar, (c) => repetir.includes(c.arquivo), {
      electron: electron.executavel,
      horaFixa,
    });
    feitas.push(...segunda.feitas.map((c) => c.arquivo));
    falhas = segunda.falhas;
    errosDeConsole.push(...segunda.errosDeConsole);
  }
  return { feitas, falhas, errosDeConsole, comportamento, chromium };
}

/**
 * Compara duas imagens num Chromium comum. Devolve as duas medidas (ver
 * TOLERANCIA_CRU) e uma imagem da diferença: a tela de depois apagada, com
 * vermelho onde mudou a olho e laranja escuro onde só o cru mudou.
 */
async function compararImagens(pagina, arquivoA, arquivoB) {
  const comoDado = (arquivo) => `data:image/png;base64,${fs.readFileSync(arquivo).toString("base64")}`;
  return pagina.evaluate(
    async ({ a, b, toleranciaCru, desfoque, toleranciaOlho }) => {
      const carregar = (src) =>
        new Promise((ok, erro) => {
          const imagem = new Image();
          imagem.onload = () => ok(imagem);
          imagem.onerror = erro;
          imagem.src = src;
        });
      const [ia, ib] = await Promise.all([carregar(a), carregar(b)]);
      const largura = Math.max(ia.width, ib.width);
      const altura = Math.max(ia.height, ib.height);
      const pixels = (imagem, filtro) => {
        const tela = new OffscreenCanvas(largura, altura);
        const ctx = tela.getContext("2d");
        ctx.filter = filtro;
        ctx.drawImage(imagem, 0, 0);
        return ctx.getImageData(0, 0, largura, altura).data;
      };
      const difere = (x, y, i, t) =>
        Math.abs(x[i] - y[i]) > t || Math.abs(x[i + 1] - y[i + 1]) > t || Math.abs(x[i + 2] - y[i + 2]) > t;
      const ca = pixels(ia, "none");
      const cb = pixels(ib, "none");
      const da = pixels(ia, desfoque);
      const db = pixels(ib, desfoque);
      const tela = new OffscreenCanvas(largura, altura);
      const ctx = tela.getContext("2d");
      const saida = ctx.createImageData(largura, altura);
      let cru = 0;
      let aOlho = 0;
      for (let i = 0; i < ca.length; i += 4) {
        const mudouCru = difere(ca, cb, i, toleranciaCru);
        const mudouAOlho = difere(da, db, i, toleranciaOlho);
        if (mudouCru) cru++;
        if (mudouAOlho) aOlho++;
        if (mudouAOlho) {
          saida.data.set([255, 40, 40, 255], i);
        } else if (mudouCru) {
          saida.data.set([150, 80, 0, 255], i);
        } else {
          const cinza = (cb[i] + cb[i + 1] + cb[i + 2]) / 3;
          saida.data.set([cinza * 0.35, cinza * 0.35, cinza * 0.35, 255], i);
        }
      }
      ctx.putImageData(saida, 0, 0);
      const blob = await tela.convertToBlob({ type: "image/png" });
      const dado = await new Promise((ok) => {
        const leitor = new FileReader();
        leitor.onload = () => ok(leitor.result);
        leitor.readAsDataURL(blob);
      });
      return {
        cru,
        aOlho,
        total: largura * altura,
        mesmaMedida: ia.width === ib.width && ia.height === ib.height,
        imagem: dado,
      };
    },
    {
      a: comoDado(arquivoA),
      b: comoDado(arquivoB),
      toleranciaCru: TOLERANCIA_CRU,
      desfoque: DESFOQUE_A_OLHO,
      toleranciaOlho: TOLERANCIA_A_OLHO,
    },
  );
}

function escapar(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function relatorioHtml({ antes, depois, aOlho, soContorno, iguais, soNumLado, comportamento, falhas, erros }) {
  const linhasComportamento = comportamento
    .map(
      ([chave, a, b]) =>
        `<tr class="${a === b ? "" : "mudou"}"><td>${escapar(chave)}</td><td>${escapar(a ?? "—")}</td><td>${escapar(b ?? "—")}</td></tr>`,
    )
    .join("");
  const cartao = (m) => `<section>
  <h3>${escapar(m.cena)} <small>${porcento(m.aOlho, m.total)} a olho · ${porcento(m.cru, m.total)} no cru${m.mesmaMedida ? "" : " · tamanhos diferentes"}</small></h3>
  <div class="trio">
    <figure><img src="antes/${m.cena}.png" loading="lazy"><figcaption>Antes (${escapar(antes.versao)})</figcaption></figure>
    <figure><img src="depois/${m.cena}.png" loading="lazy"><figcaption>Depois (${escapar(depois.versao)})</figcaption></figure>
    <figure><img src="diferenca/${m.cena}.png" loading="lazy"><figcaption>Vermelho: mudou a olho · laranja: só o contorno</figcaption></figure>
  </div>
</section>`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Telas: Electron ${escapar(antes.versao)} × ${escapar(depois.versao)}</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 1500px; padding: 16px; background: #faf7fb; color: #222; }
  h1 { font-size: 20px; } h2 { font-size: 16px; margin-top: 32px; } h3 { font-size: 14px; margin: 0 0 8px; }
  small { color: #666; font-weight: normal; }
  table { border-collapse: collapse; } td, th { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
  tr.mudou td { background: #ffe1e1; }
  section { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin: 12px 0; }
  .trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .trio img { width: 100%; border: 1px solid #ccc; }
  figure { margin: 0; } figcaption { color: #666; font-size: 12px; }
  summary { cursor: pointer; }
  @media (max-width: 800px) { .trio { grid-template-columns: 1fr; } }
</style></head><body>
<h1>Telas no Electron ${escapar(antes.versao)} × ${escapar(depois.versao)}</h1>
<p>${escapar(antes.chromium)} → ${escapar(depois.chromium)}.
<b>${aOlho.length}</b> tela(s) mudaram a olho; ${soContorno.length} mudaram só no contorno das letras
(o jeito de suavizar, que muda a cada Chromium e ninguém enxerga); ${iguais.length} ficaram idênticas.</p>
<h2>Campos que o Chromium controla</h2>
<table><tr><th>O quê</th><th>Antes</th><th>Depois</th></tr>${linhasComportamento}</table>
${soNumLado.length ? `<h2>Telas que só abriram de um lado</h2><p>${escapar(soNumLado.join(", "))}</p>` : ""}
${falhas.length ? `<h2>Telas que falharam</h2><ul>${falhas.map((f) => `<li>${escapar(f)}</li>`).join("")}</ul>` : ""}
${erros.length ? `<h2>Erros de console que só aparecem depois</h2><ul>${erros.map((e) => `<li>${escapar(e)}</li>`).join("")}</ul>` : ""}
<h2>Telas que mudaram a olho</h2>
${aOlho.map(cartao).join("\n") || "<p>Nenhuma.</p>"}
<h2>Telas que mudaram só no contorno das letras</h2>
${soContorno.length ? `<details><summary>${soContorno.length} tela(s): abrir as imagens</summary>${soContorno.map(cartao).join("\n")}</details>` : "<p>Nenhuma.</p>"}
<h2>Telas idênticas</h2><p>${escapar(iguais.join(", ")) || "—"}</p>
</body></html>`;
}

function porcento(parte, total) {
  return `${((parte / total) * 100).toFixed(2)}%`;
}

process.exit(
  await comServidorDeTelas(async () => {
    const antes = prepararElectron(antesPedido);
    const depois = prepararElectron(depoisPedido);
    const saida = path.join(os.tmpdir(), "sakura-comparar-electron", `${antes.rotulo}-x-${depois.rotulo}`);
    fs.rmSync(saida, { recursive: true, force: true });

    // O mesmo instante nas duas rodadas, arredondado pro minuto.
    const horaFixa = new Date(Math.floor(Date.now() / 60_000) * 60_000);

    const ra = await rodada(antes, path.join(saida, "antes"), horaFixa);
    const rb = await rodada(depois, path.join(saida, "depois"), horaFixa);
    antes.chromium = ra.chromium;
    depois.chromium = rb.chromium;

    console.log("\nComparando as imagens...");
    const chromium = await carregarChromium();
    const navegador = await chromium.launch();
    const pagina = await navegador.newPage();
    fs.mkdirSync(path.join(saida, "diferenca"), { recursive: true });
    const aOlho = [];
    const soContorno = [];
    const iguais = [];
    const nosDois = ra.feitas.filter((c) => rb.feitas.includes(c));
    for (const cena of nosDois) {
      const r = await compararImagens(
        pagina,
        path.join(saida, "antes", `${cena}.png`),
        path.join(saida, "depois", `${cena}.png`),
      );
      if (r.cru === 0 && r.mesmaMedida) {
        iguais.push(cena);
        continue;
      }
      fs.writeFileSync(
        path.join(saida, "diferenca", `${cena}.png`),
        Buffer.from(r.imagem.split(",")[1], "base64"),
      );
      const item = { cena, cru: r.cru, aOlho: r.aOlho, total: r.total, mesmaMedida: r.mesmaMedida };
      (r.aOlho > 0 || !r.mesmaMedida ? aOlho : soContorno).push(item);
    }
    await navegador.close();
    aOlho.sort((x, y) => y.aOlho - x.aOlho);
    soContorno.sort((x, y) => y.cru - x.cru);

    const soNumLado = [
      ...ra.feitas.filter((c) => !rb.feitas.includes(c)).map((c) => `${c} (só antes)`),
      ...rb.feitas.filter((c) => !ra.feitas.includes(c)).map((c) => `${c} (só depois)`),
    ];
    const chaves = [...new Set([...Object.keys(ra.comportamento), ...Object.keys(rb.comportamento)])];
    const comportamento = chaves.map((k) => [k, ra.comportamento[k], rb.comportamento[k]]);
    const falhas = [
      ...ra.falhas.map(([c, e]) => `antes: ${c} — ${e}`),
      ...rb.falhas.map(([c, e]) => `depois: ${c} — ${e}`),
    ];
    const erros = [...new Set(rb.errosDeConsole.filter((e) => !ra.errosDeConsole.includes(e)))];

    const resultado = { antes, depois, aOlho, soContorno, iguais, soNumLado, comportamento, falhas, erros };
    fs.writeFileSync(path.join(saida, "relatorio.html"), relatorioHtml(resultado));
    fs.writeFileSync(path.join(saida, "resultado.json"), JSON.stringify(resultado, null, 2));

    console.log(`\nElectron ${antes.versao} (${ra.chromium}) × ${depois.versao} (${rb.chromium})`);
    console.log("\nCampos que o Chromium controla:");
    for (const [k, a, b] of comportamento) {
      console.log(`  ${a === b ? "igual " : "MUDOU "} ${k}: ${a ?? "—"} → ${b ?? "—"}`);
    }
    console.log(
      `\nTelas: ${aOlho.length} mudaram a olho, ${soContorno.length} só no contorno das letras, ` +
        `${iguais.length} idênticas.`,
    );
    for (const m of aOlho) console.log(`  ${porcento(m.aOlho, m.total).padStart(7)} a olho  ${m.cena}`);
    if (soNumLado.length) console.log(`\nSó abriram de um lado: ${soNumLado.join(", ")}`);
    if (falhas.length) console.log(`\nFalharam:\n  ${falhas.join("\n  ")}`);
    if (erros.length) console.log(`\nErros de console que só aparecem depois:\n  ${erros.join("\n  ")}`);
    console.log(`\nRelatório: ${path.join(saida, "relatorio.html")}`);

    const algoMudou =
      aOlho.length > 0 || soNumLado.length > 0 || falhas.length > 0 || erros.length > 0 ||
      comportamento.some(([, a, b]) => a !== b);
    if (algoMudou) {
      console.log("\nHá diferenças: olhar o relatório antes de seguir. (Diferença não é defeito por si só.)");
      return 1;
    }
    console.log("\nNada mudou a olho.");
    return 0;
  }),
);

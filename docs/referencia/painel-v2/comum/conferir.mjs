// Fotografa páginas estáticas do painel v2 e mede o contraste do que aparece na tela.
//
// Uso (da raiz do repositório):
//   node docs/referencia/painel-v2/comum/conferir.mjs <pasta> <pagina.html> [<pagina.html> ...]
// Cada página sai em 375 px e 1280 px, claro e escuro, em <pasta>/fotos/<nome>-<largura>-<tema>.jpg.
// O contraste usa a mesma medição do programa das lojas (scripts/medir-contraste.mjs, WCAG 2.2 AA).
// Também avisa rolagem lateral. Sai com código 1 se achar contraste reprovado ou rolagem lateral.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MEDIR_CONTRASTE } from "../../../../scripts/medir-contraste.mjs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require("/opt/node-tools/node_modules/playwright"); }

const [pasta, ...paginas] = process.argv.slice(2);
if (!pasta || paginas.length === 0) {
  console.error("uso: node conferir.mjs <pasta> <pagina.html> ...");
  process.exit(2);
}
const fotos = resolve(pasta, "fotos");
mkdirSync(fotos, { recursive: true });
const navegador = await playwright.chromium.launch();
let problemas = 0;
for (const pagina of paginas) {
  const nome = basename(pagina, ".html");
  for (const largura of [375, 1280]) {
    for (const tema of ["light", "dark"]) {
      const ctx = await navegador.newContext({ viewport: { width: largura, height: largura === 375 ? 812 : 860 }, colorScheme: tema, reducedMotion: "reduce" });
      const p = await ctx.newPage();
      await p.goto(pathToFileURL(resolve(pasta, pagina)).href, { waitUntil: "load" });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(250);
      const lateral = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const achados = await p.evaluate(MEDIR_CONTRASTE);
      const t = tema === "light" ? "claro" : "escuro";
      await p.screenshot({ path: `${fotos}/${nome}-${largura}-${t}.jpg`, fullPage: true, type: "jpeg", quality: 74 });
      const linha = `${nome} ${largura} ${t}:`;
      if (lateral > 0) { problemas++; console.log(linha, `ROLAGEM LATERAL de ${lateral}px`); }
      for (const a of achados) { problemas++; console.log(linha, "CONTRASTE", a.medido, "<", a.minimo, JSON.stringify(a.amostra ?? a.tipo), a.frente, "sobre", a.fundo); }
      if (lateral <= 0 && achados.length === 0) console.log(linha, "ok");
      await ctx.close();
    }
  }
}
await navegador.close();
console.log(problemas === 0 ? "TUDO OK" : `${problemas} problema(s)`);
process.exit(problemas === 0 ? 0 : 1);

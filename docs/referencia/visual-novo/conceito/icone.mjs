// Gera o ícone do programa (1024 px): a logo B num quadrado claro de canto arredondado,
// e a versão pro tema escuro. Uso: node icone.mjs
import { createRequire } from "node:module";
import { marca } from "./logo.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const aqui = new URL(".", import.meta.url).pathname;
const pagina = (fundo) => `<body style="margin:0;background:transparent"><div style="width:1024px;height:1024px;border-radius:228px;background:${fundo};display:grid;place-items:center">
<svg viewBox="-256 -256 512 512" width="720" height="720">${marca("b", { id: "g" })}</svg></div></body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
for (const [nome, fundo] of [["claro", "#F4F1EE"], ["escuro", "linear-gradient(155deg,#2A1A1E,#111116)"]]) {
  await p.setContent(pagina(fundo));
  await p.screenshot({ path: aqui + `logo/icone-programa-${nome}.png`, omitBackground: true });
}
await b.close();

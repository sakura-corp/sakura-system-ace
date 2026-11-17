// Gera o ícone do programa: a logo B num quadrado de canto arredondado, com um
// contorno fino (pra não sumir na barra de tarefas da mesma cor), nas versões
// clara e escura. Aprovado pela Sofia em 17/11/2026 (#990): a ESCURA é a do
// instalador, do atalho e do ícone fixado; a janela aberta troca entre as duas
// junto com o tema do programa (electron/main.ts, "janela:tema").
//
// Uso (da raiz do repositório): node docs/referencia/visual-novo/conceito/icone.mjs
// Escreve:
//   docs/referencia/visual-novo/conceito/logo/icone-programa-{claro,escuro}.png  (1024)
//   build/icon.png                                    (1024, a escura: instalador e atalho)
//   public/icone-janela-{claro,escuro}.png            (256, a janela aberta)
import { createRequire } from "node:module";
import { marca } from "./logo.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const aqui = new URL(".", import.meta.url).pathname;
const raiz = new URL("../../../../", import.meta.url).pathname;

/** O quadro é o mesmo da logo: 512 com o centro em (0,0). */
function icone(tema) {
  const base =
    tema === "claro"
      ? `<rect x="-256" y="-256" width="512" height="512" rx="112" fill="#F6F0EB"/>
         <rect x="-250" y="-250" width="500" height="500" rx="106" fill="none" stroke="#1B0B05" stroke-opacity=".14" stroke-width="12"/>`
      : `<defs>
           <linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1E22"/><stop offset="1" stop-color="#121217"/></linearGradient>
           <radialGradient id="brilho"><stop offset="0" stop-color="#FF5722" stop-opacity=".38"/><stop offset="1" stop-color="#FF5722" stop-opacity="0"/></radialGradient>
         </defs>
         <rect x="-256" y="-256" width="512" height="512" rx="112" fill="url(#fundo)"/>
         <circle r="230" fill="url(#brilho)"/>
         <rect x="-250" y="-250" width="500" height="500" rx="106" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="12"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-256 -256 512 512">${base}<g transform="scale(0.72)">${marca("b", { id: "g" })}</g></svg>`;
}

const b = await chromium.launch();
for (const [tam, saidas] of [
  [1024, { claro: [aqui + "logo/icone-programa-claro.png"], escuro: [aqui + "logo/icone-programa-escuro.png", raiz + "build/icon.png"] }],
  [256, { claro: [raiz + "public/icone-janela-claro.png"], escuro: [raiz + "public/icone-janela-escuro.png"] }],
]) {
  const p = await b.newPage({ viewport: { width: tam, height: tam } });
  for (const tema of ["claro", "escuro"]) {
    const svg = icone(tema).replace("<svg ", `<svg width="${tam}" height="${tam}" `);
    await p.setContent(`<body style="margin:0;background:transparent">${svg}</body>`);
    for (const caminho of saidas[tema]) await p.screenshot({ path: caminho, omitBackground: true });
  }
  await p.close();
}
await b.close();

// Tira as fotos do conceito. Uso: node fotografar.mjs [escala]
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const aqui = new URL(".", import.meta.url).pathname;
const escala = Number(process.argv[2] || 1);
const pasta = aqui + (escala === 1 ? "fotos-conferir/" : "fotos/");
mkdirSync(pasta, { recursive: true });
const url = "file://" + aqui + "conceito-local.html";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1480, height: 1000 }, deviceScaleFactor: escala, reducedMotion: "reduce" });
const p = await ctx.newPage();
const erros = [];
p.on("console", (m) => m.type() === "error" && erros.push(m.text()));
p.on("pageerror", (e) => erros.push(String(e)));

async function abrir(hash) {
  await p.goto("about:blank");
  await p.goto(url + (hash ? "#" + hash : ""));
  await p.waitForTimeout(500);
}
const janela = (nome) => p.locator("#janela").screenshot({ path: pasta + nome + ".png" });

await abrir("");
await janela("2-login");
await p.locator(".capa").screenshot({ path: pasta + "0-capa.png" });
await p.locator("#logos").screenshot({ path: pasta + "1-logos.png" });
await p.locator(".pecas").screenshot({ path: pasta + "7-pecas.png" });

await abrir("inicio");
await janela("3-inicio");
await p.locator("#rolagem").evaluate((el) => (el.scrollTop = 9999));
await janela("3b-inicio-embaixo");

await abrir("encolhido");
await p.locator('.item[data-tela="pagar"]').hover();
await p.waitForTimeout(200);
await janela("4-menu-encolhido");

await abrir("os");
await janela("5-ordens");
await p.locator(`[data-mais="146"]`).click(); await p.mouse.move(700, 300);
await p.waitForTimeout(200);
await janela("5b-ordens-mais-acoes");

await abrir("faturar");
await janela("6-faturar");

// celular, só pra conferir que nada estoura
const cel = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 1 });
const pc = await cel.newPage();
await pc.goto(url);
await pc.waitForTimeout(400);
const estouro = await pc.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (escala === 1) await pc.screenshot({ path: pasta + "celular.png", fullPage: true });
console.log("estouro no celular:", estouro, "| erros:", erros.length ? erros : "nenhum");
await b.close();

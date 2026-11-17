// Monta a página do conceito: junta o modelo (pagina.html), as logos e os ícones.
// Sai em dois arquivos: conceito.html (pra publicar, letras pelo Google Fonts) e
// conceito-local.html (pra fotografar aqui, com as letras embutidas).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { marca } from "./logo.mjs";
const aqui = new URL(".", import.meta.url).pathname;

const ic = (miolo) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${miolo}</svg>`;
const ICONES = {
  casa: ic('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  pessoas: ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/>'),
  prancheta: ic('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>'),
  orcamento: ic('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  escudo: ic('<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  caixa: ic('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  caminhao: ic('<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>'),
  chave: ic('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  carteira: ic('<path d="M19 9V6a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/><circle cx="16.5" cy="14" r="1"/>'),
  pagar: ic('<circle cx="12" cy="12" r="9"/><path d="M9 15l6-6M10 9h5v5"/>'),
  receber: ic('<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M14 15H9v-5"/>'),
  recibo: ic('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  barras: ic('<path d="M3 21h18M6 21V11M12 21V4M18 21v-7"/>'),
  cracha: ic('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M5.5 16c.6-1.6 2-2.3 3.5-2.3s2.9.7 3.5 2.3M15 10h3M15 14h3"/>'),
  chevron: ic('<path d="M15 6l-6 6 6 6"/>'),
  esq: ic('<path d="M15 6l-6 6 6 6"/>'),
  dir: ic('<path d="M9 6l6 6-6 6"/>'),
  info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'),
  auditoria: ic('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
  ajustes: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  sair: ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  busca: ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  loja: ic('<path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-6h4v6"/>'),
  zap: ic('<path d="M3.5 20.5l1.3-4.6A8.5 8.5 0 1 1 8 19.2z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.4-1.7-1-.9.8a4 4 0 0 1-1.8-1.8l.8-.9-1-1.7z"/>'),
  alerta: ic('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
  relogio: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  andando: ic('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>'),
  estrela: ic('<path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.600 19.8l1.1-6.1L3.200 9.400l6.1-.8z"/>'),
  presente: ic('<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12M12 9c-1.500-4-6-4-5-1 .5 1.300 3 1 5 1zm0 0c1.500-4 6-4 5-1-.5 1.300-3 1-5 1z"/>'),
  mais: ic('<path d="M12 5v14M5 12h14"/>'),
  colunas: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>'),
  x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
  tres: ic('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
  sobe: ic('<path d="M7 17 17 7M9 7h8v8"/>'),
};

const semDefs = (s) => s.replace(/<defs>.*?<\/defs>/s, "");
const DEFS = marca("a", { id: "mk" }).match(/<defs>.*?<\/defs>/s)[0];
const MARCAS = {};
for (const v of ["a", "b", "c", "mini"]) {
  MARCAS[v] = semDefs(marca(v, { id: "mk" }));
  MARCAS[v + "_branca"] = marca(v, { mono: "#fff" });
}

const carro = (cor, alto) => `<svg viewBox="0 0 58 30" aria-hidden="true">
  <path d="${alto ? "M4 21v-6l3-2 5-8h22l8 8 10 2v6z" : "M4 21v-4l4-2 6-7h17l9 7 12 2v4z"}" fill="${cor}"/>
  <path d="${alto ? "M14 7h8v6h-12zM24 7h9l6 6H24z" : "M16 10h7v5h-11zM25 10h6l6 5H25z"}" fill="#0E0E13" opacity=".75"/>
  <circle cx="15" cy="22" r="5" fill="#0A0A0D"/><circle cx="15" cy="22" r="2.2" fill="#8A8A94"/>
  <circle cx="44" cy="22" r="5" fill="#0A0A0D"/><circle cx="44" cy="22" r="2.2" fill="#8A8A94"/></svg>`;

let pagina = readFileSync(aqui + "pagina.html", "utf8")
  .replace("__DEFS__", DEFS)
  .replace("__MARCAS__", JSON.stringify(MARCAS))
  .replace("__ICONES__", JSON.stringify(ICONES))
  .replace("__CARRO_1__", carro("#D4D4D8", false))
  .replace("__CARRO_2__", carro("#C2362B", true))
  .replace(/__I_([a-z]+)__/g, (_, n) => {
    if (!ICONES[n]) throw new Error("ícone que não existe: " + n);
    return ICONES[n];
  });

const link =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap">';
writeFileSync(aqui + "conceito.html", pagina.replace("<!--FONTLINK-->", link).replace("/*FONTES*/", ""));
let fontes = "";
try {
  fontes = readFileSync(aqui + "fontes/fontes-local.css", "utf8");
} catch {
  // sem as letras baixadas, a versão local também busca no Google Fonts
}
writeFileSync(
  aqui + "conceito-local.html",
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' +
    pagina.replace("<!--FONTLINK-->", fontes ? "" : link).replace("/*FONTES*/", fontes) +
    "</body></html>",
);
// as logos soltas, pra abrir em qualquer programa
mkdirSync(aqui + "logo", { recursive: true });
for (const v of ["a", "b", "c", "mini"]) {
  writeFileSync(aqui + `logo/ssace-${v}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-256 -256 512 512">${marca(v, { id: "g" })}</svg>\n`);
  writeFileSync(aqui + `logo/ssace-${v}-branca.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-256 -256 512 512">${marca(v, { mono: "#fff" })}</svg>\n`);
}
console.log("ok", Math.round(pagina.length / 1024) + " KB");

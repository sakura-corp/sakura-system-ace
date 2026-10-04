// Onde achar o Playwright.
//
// Ele NÃO é dependência do projeto de propósito: `npm install playwright`
// baixa os navegadores junto (umas centenas de MB) na máquina de quem
// desenvolve o app — e quem desenvolve este app nunca roda estas
// ferramentas. Elas são de manutenção: gerar as imagens do catálogo e medir
// contraste nas telas.
//
// Então: usa o que estiver em node_modules, se alguém instalou; senão, o que
// estiver instalado globalmente (é assim no ambiente onde estas ferramentas
// costumam rodar); senão, explica o que fazer em vez de morrer com
// "Cannot find module".
export async function carregarChromium() {
  return carregar("chromium");
}

// O controle do Electron, pra abrir as telas dentro do Electron do programa
// em vez de num Chromium avulso (ver percorrer-telas.mjs).
export async function carregarElectron() {
  return carregar("_electron");
}

async function carregar(parte) {
  const tentativas = [
    "playwright",
    // Caminho do ambiente de nuvem onde estas ferramentas rodam hoje.
    "/opt/node22/lib/node_modules/playwright/index.mjs",
  ];

  for (const caminho of tentativas) {
    try {
      const modulo = await import(caminho);
      if (modulo[parte]) return modulo[parte];
    } catch {
      // tenta o próximo
    }
  }

  throw new Error(
    "Playwright não encontrado. Instale só para esta rodada, sem mexer no " +
      "package.json:\n\n  npm i --no-save playwright && npx playwright install chromium\n",
  );
}

// O processo principal mínimo pra percorrer as telas DENTRO do Electron.
//
// Por que existe: o passeio pelas telas (percorrer-telas.mjs) abria o app num
// Chromium avulso, que não é o que roda na loja. Pras varreduras de sempre
// isso basta, mas na hora de subir o Electron (#385) a pergunta é justamente
// "o Chromium NOVO desenha igual ao velho?", e um Chromium avulso responde
// igual com qualquer Electron instalado.
//
// Não é o `electron/main.ts` do programa de propósito: aquele carrega o app
// já compilado (dist/), com preload, CSP e atualizador, e o passeio precisa
// do app servido pelo vite das telas, com o Supabase de mentira. O que
// importa pra comparação é o mesmo nos dois: o Chromium e o Node do Electron
// em uso, e as mesmas travas de `webPreferences`.
//
// Quem abre este arquivo é o percorrer-telas.mjs (via Playwright). A tela
// começa em branco: quem navega é o passeio, DEPOIS de instalar o banco de
// mentira — se a janela já nascesse no endereço do app, o login iria pra
// rede de verdade antes de o banco de mentira existir (docs/licoes.md, item 56).

import { app, BrowserWindow, Menu } from "electron";

// Uma pasta de dados nova a cada abertura: sem isso, o login guardado da
// rodada anterior faria as telas "deslogadas" (login, conexão) abrirem já
// dentro do sistema.
if (process.env.TELAS_PASTA_DADOS) app.setPath("userData", process.env.TELAS_PASTA_DADOS);

// As mesmas do programa (electron/main.ts): sem elas, uma janela atrás de
// outra no servidor gráfico de mentira para de desenhar.
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  const janela = new BrowserWindow({
    width: Number(process.env.TELAS_LARGURA) || 1600,
    height: Number(process.env.TELAS_ALTURA) || 1000,
    useContentSize: true,
    backgroundColor: "#FFF7FC",
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  janela.loadURL("about:blank");
});

app.on("window-all-closed", () => app.quit());

import { app, BrowserWindow, ipcMain, Menu, session, shell } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { autoUpdater } from "electron-updater";
import {
  configuracaoDoAtualizador,
  conteudoDoArquivo,
  ehCanalAtualizacao,
  lerCanal,
  type CanalAtualizacao,
} from "../src/schemas/canalAtualizacao";
import { motivoHtmlRecusadoParaPdf } from "../src/schemas/danfe";
import {
  conteudoDaIdentidade,
  lerIdentidadeComputador,
  type IdentidadeComputador,
} from "../src/schemas/identidadeComputador";
import { podeAbrirNoNavegador } from "../src/schemas/linkExterno";
import { pastaDeDadosDoDesenvolvimento } from "../src/schemas/pastaDeDados";

// O `npm run dev` usa uma pasta de dados só dele (#1157), pra não dividir a
// conexão (e o resto) com o programa instalado no mesmo computador. Precisa
// vir antes de qualquer `app.getPath("userData")` e do `app.whenReady()`.
const pastaDoDesenvolvimento = pastaDeDadosDoDesenvolvimento(app.getPath("userData"), app.isPackaged);
if (pastaDoDesenvolvimento) app.setPath("userData", pastaDoDesenvolvimento);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");
// `app.getVersion()` funciona igual em dev e no app empacotado (diferente de
// `process.env.npm_package_version`, que só existe rodando via `npm run
// ...`) — repassado por variável de ambiente porque o preload não tem
// acesso direto ao módulo `app` do processo principal.
process.env.SAKURA_APP_VERSION = app.getVersion();
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

let mainWindow: BrowserWindow | null = null;

// --- Segurança do processo principal (item TR-04.6 do guia) ---------------
//
// Auditoria feita seguindo o checklist oficial de segurança do Electron.
// Nada aqui muda o que a pessoa vê na tela: é o que impede que um problema
// dentro de uma tela (um XSS, um texto vindo do banco que chega envenenado)
// vire acesso à máquina, requisição autenticada pra qualquer endereço, ou
// janela nova apontando pra fora do app.
//
// A regra que orienta tudo abaixo é a mesma que o `whatsapp:abrir` já usava:
// **lista de permissão, nunca lista de proibição**. O que não está escrito
// aqui como permitido não passa.

// De onde a tela do app legitimamente carrega. Em desenvolvimento é o
// servidor do Vite; no app instalado é o arquivo dentro da pasta `dist`.
// `pathToFileURL` em vez de montar "file://" + caminho na mão, porque no
// Windows o caminho é `C:\...`, que não vira URL válida por concatenação.
// `||` e não `??`, de propósito: variável de ambiente ausente costuma
// chegar como string VAZIA, não como `undefined`, e `??` só troca
// null/undefined — com `??`, esta constante virava "" e o
// `startsWith("")` lá embaixo passava a aprovar qualquer endereço, ou
// seja, a trava existiria sem travar nada. É a armadilha já registrada na
// seção 6, item 8, e foi o teste do Electron que a pegou aqui.
const ORIGEM_DA_TELA = VITE_DEV_SERVER_URL || pathToFileURL(RENDERER_DIST).href;

// Item 17 do checklist: validar o remetente de toda mensagem de IPC. Sem
// isso, qualquer coisa carregada dentro da janela (um iframe, uma página que
// tenha conseguido navegar pra fora) conversa com o processo principal como
// se fosse a tela do app — e o processo principal é justamente quem lê
// arquivo, abre endereço no sistema operacional e faz requisição autenticada.
//
// Os iframes que o app usa de verdade (garantia, recibo, DANFE) são `blob:`
// e `about:srcdoc`, que não começam com a origem da tela — ou seja, são
// recusados por este teste, e isso está certo: nenhum deles usa IPC.
function remetenteEhATelaDoApp(evento: IpcMainInvokeEvent | IpcMainEvent): boolean {
  const url = evento.senderFrame?.url;
  return typeof url === "string" && url.startsWith(ORIGEM_DA_TELA);
}

// Registra um pedido da tela que espera resposta. Existe pra que a checagem
// de remetente não dependa de alguém lembrar de repetí-la em cada handler —
// esquecer em um só já bastaria pra abrir o buraco de novo.
function aoPedidoDaTela<Resposta>(
  canal: string,
  tratador: (...argumentos: never[]) => Promise<Resposta> | Resposta,
) {
  ipcMain.handle(canal, (evento, ...argumentos) => {
    if (!remetenteEhATelaDoApp(evento)) {
      throw new Error(`Pedido recusado: "${canal}" só aceita chamada da tela do app.`);
    }
    return tratador(...(argumentos as never[]));
  });
}

// Mesma checagem, para os avisos de mão única (`send`, sem resposta).
function aoAvisoDaTela(canal: string, tratador: (...argumentos: never[]) => void) {
  ipcMain.on(canal, (evento, ...argumentos) => {
    if (!remetenteEhATelaDoApp(evento)) return;
    tratador(...(argumentos as never[]));
  });
}

// A política de segurança de conteúdo (CSP) da tela. Ela é declarada por
// **cabeçalho de resposta**, e não só por `<meta>` no HTML, porque o
// cabeçalho vale antes de o documento ser interpretado e não depende de o
// HTML chegar inteiro.
//
// Três escolhas que valem entender antes de mexer:
//
// 1. `'unsafe-inline'` em **style-src** é obrigatório aqui, e foi medido, não
//    suposto: sem ele o `style={{...}}` do React para de aplicar (some a
//    barra de rolagem customizada, o menu de ações sai do lugar, os gráficos
//    encolhem) e o `<style>` dentro do documento de garantia/recibo não vale
//    mais. Em **script-src** ele NÃO entra — é lá que ele custaria caro, e é
//    justamente o que faz um XSS virar execução de código.
// 2. `connect-src` não pode ser só o banco configurado hoje: a tela de
//    conexão testa um endereço que a pessoa acabou de digitar, e num
//    computador recém-instalado não existe banco configurado nenhum. Por
//    isso a permissão é "qualquer projeto Supabase" mais o endereço desta
//    máquina (que cobre um Supabase em domínio próprio). Travar isso no host
//    configurado repetiria o erro de deixar a pessoa do lado de fora do
//    sistema (seção 6, item 33).
// 3. `frame-src` precisa de `blob:` e `'self'`: é como a garantia, o recibo
//    do cliente e o DANFE aparecem dentro do app.
const DESTINOS_DE_REDE_DA_TELA = [
  // Qualquer projeto Supabase hospedado — ver o ponto 2 acima.
  "https://*.supabase.co",
  "https://*.supabase.in",
  // Busca de endereço por CEP (lib/viaCep.ts).
  "https://viacep.com.br",
  // Checagem de "este computador alcança a internet?" da tela de
  // Diagnóstico — é o GitHub porque é de lá que a atualização vem.
  "https://api.github.com",
];

function politicaDeSeguranca(): string {
  const destinos = [...DESTINOS_DE_REDE_DA_TELA];
  // O banco desta máquina, para o caso de um Supabase em domínio próprio.
  try {
    if (process.env.SAKURA_SUPABASE_URL) {
      destinos.push(new URL(process.env.SAKURA_SUPABASE_URL).origin);
    }
  } catch {
    // Endereço salvo inválido: a tela de conexão resolve isso, e uma CSP
    // não é lugar de reclamar de digitação.
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${destinos.join(" ")}`,
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

const VISUALIZADOR_DE_PDF = "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/";

function aplicarPoliticaDeSeguranca() {
  // Só no app empacotado: o servidor de desenvolvimento do Vite precisa de
  // script embutido e `eval` pro recarregamento automático, então uma CSP
  // restritiva em `npm run dev` quebraria a ferramenta de trabalho dela sem
  // proteger o app que vai pra loja, que é sempre o empacotado.
  if (VITE_DEV_SERVER_URL) return;
  session.defaultSession.webRequest.onHeadersReceived((detalhes, responder) => {
    // O visualizador de PDF do próprio Electron (a prévia do DANFE) é uma
    // página chrome-extension://: com a CSP do app, os scripts dele não rodam
    // e o quadro fica escuro e vazio (#965). A exceção é só pra ele (o ID é
    // o fixo do visualizador do Chromium); qualquer outra página continua com
    // a CSP. Se uma atualização do Electron trocar o ID, o test:electron reprova.
    if (detalhes.url.startsWith(VISUALIZADOR_DE_PDF)) return responder({});
    responder({
      responseHeaders: {
        ...detalhes.responseHeaders,
        "Content-Security-Policy": [politicaDeSeguranca()],
      },
    });
  });
}

// --- Conexão com o Supabase, escolhida no próprio app ---------------------
//
// Antes, a URL e a chave do Supabase eram gravadas dentro do build (secrets
// do GitHub), então um instalador só servia uma empresa. Pra vender pra uma
// segunda empresa (que precisa do banco de dados próprio, separado) sem ter
// que gerar um instalador diferente por cliente, elas passam a ser digitadas
// na primeira abertura e guardadas **neste computador**, num arquivo simples
// dentro da pasta de dados do app.
//
// A chave guardada é a "anon"/publishable do Supabase, que é feita pra ser
// pública (quem protege os dados é a RLS no banco, não o segredo da chave) —
// por isso não há problema em ela ficar num arquivo de texto na máquina.
//
// O valor é repassado pro preload por **variável de ambiente**, o mesmo
// mecanismo já usado por SAKURA_APP_VERSION acima. Isso é de propósito: o
// preload precisa desse valor de forma síncrona (o cliente do Supabase é
// criado assim que a tela carrega, antes de qualquer IPC poder responder), e
// ler arquivo direto de dentro do preload empacotado já falhou antes de um
// jeito silencioso (ver PROJETO_STATUS.md, seção 6, item 18).
interface ConexaoSalva {
  url: string;
  chave: string;
}

const CAMINHO_CONEXAO = () => path.join(app.getPath("userData"), "conexao.json");

function carregarConexaoSalva(): ConexaoSalva | null {
  try {
    const conteudo = fs.readFileSync(CAMINHO_CONEXAO(), "utf8");
    const dados = JSON.parse(conteudo) as Partial<ConexaoSalva>;
    if (!dados.url || !dados.chave) return null;
    return { url: dados.url, chave: dados.chave };
  } catch {
    // Arquivo ainda não existe (primeira abertura) ou está corrompido — nos
    // dois casos o app cai na tela de configuração, que é o certo.
    return null;
  }
}

function aplicarConexaoNoAmbiente(conexao: ConexaoSalva | null) {
  if (conexao) {
    process.env.SAKURA_SUPABASE_URL = conexao.url;
    process.env.SAKURA_SUPABASE_ANON_KEY = conexao.chave;
  } else {
    delete process.env.SAKURA_SUPABASE_URL;
    delete process.env.SAKURA_SUPABASE_ANON_KEY;
  }
}

aplicarConexaoNoAmbiente(carregarConexaoSalva());

// Grava a conexão escolhida e recarrega a tela: o cliente do Supabase é
// montado uma vez só, quando a tela carrega, então trocar de banco de dados
// sem recarregar deixaria o app falando com o banco antigo.
aoPedidoDaTela("conexao:salvar", async (conexao: ConexaoSalva) => {
  // O que chega da tela é dado de entrada, não promessa: gravar um
  // `conexao.json` com qualquer coisa dentro deixaria o app sem conseguir
  // abrir na vez seguinte, e o conserto seria achar o arquivo no %APPDATA%.
  if (
    typeof conexao?.url !== "string" ||
    typeof conexao?.chave !== "string" ||
    !conexao.url ||
    !conexao.chave
  ) {
    throw new Error("Conexão inválida: endereço e chave precisam ser texto preenchido.");
  }
  const limpa: ConexaoSalva = { url: conexao.url, chave: conexao.chave };
  fs.writeFileSync(CAMINHO_CONEXAO(), JSON.stringify(limpa, null, 2), "utf8");
  aplicarConexaoNoAmbiente(limpa);
  mainWindow?.webContents.reload();
});

// --- Canal de atualização deste computador (item TR-09.1 do guia) ---------
//
// Cada computador escolhe se recebe toda versão nova assim que ela sai
// (canal de teste) ou só depois que ela for liberada para todas as lojas
// (canal normal, o padrão). A regra e o porquê de cada detalhe estão em
// `src/schemas/canalAtualizacao.ts`.
//
// Fica num arquivo PRÓPRIO, `atualizacao.json`, e não dentro do
// `conexao.json` como o guia sugeria, de propósito: o `conexao.json` é o
// arquivo que decide se a pessoa consegue entrar no sistema, e ele é
// regravado inteiro toda vez que alguém salva a conexão. Misturar os dois
// faria cada salvamento de conexão apagar o canal, e cada mudança de canal
// mexer no arquivo que, se estragar, deixa a loja do lado de fora.
const CAMINHO_CANAL = () => path.join(app.getPath("userData"), "atualizacao.json");

function carregarCanal(): CanalAtualizacao {
  try {
    return lerCanal(fs.readFileSync(CAMINHO_CANAL(), "utf8"));
  } catch {
    // Arquivo ainda não existe: é o caso de quase todo computador.
    return lerCanal(null);
  }
}

aoPedidoDaTela("atualizacao:canal", async () => carregarCanal());

// Vale a partir da próxima vez que o programa abrir, que é quando a
// atualização é procurada. Não dispara uma busca na hora de propósito: uma
// segunda busca enquanto a primeira ainda baixa é caminho que ninguém testou.
aoPedidoDaTela("atualizacao:definirCanal", async (canal: unknown) => {
  if (!ehCanalAtualizacao(canal)) {
    throw new Error('Canal inválido: só existem "teste" e "normal".');
  }
  fs.writeFileSync(CAMINHO_CANAL(), conteudoDoArquivo(canal), "utf8");
  logAtualizacao(`Canal deste computador trocado para "${canal}".`);
});

// --- A identidade deste computador (migration 0063) -----------------------
//
// Um número aleatório criado na primeira abertura e guardado em
// `computador.json`. A tela manda esse número ao banco a cada login, junto
// com a versão e o canal, e é assim que o admin sabe em que versão está cada
// computador da loja — e que o botão de atualizar os bancos sabe quem
// esperar. O formato e o porquê de arquivo próprio estão em
// `src/schemas/identidadeComputador.ts`.
const CAMINHO_IDENTIDADE = () => path.join(app.getPath("userData"), "computador.json");

function carregarOuCriarIdentidade(): IdentidadeComputador {
  let conteudo: string | null = null;
  try {
    conteudo = fs.readFileSync(CAMINHO_IDENTIDADE(), "utf8");
  } catch {
    // Primeira abertura: o arquivo ainda não existe.
  }
  const existente = lerIdentidadeComputador(conteudo);
  if (existente) return existente;

  const nova: IdentidadeComputador = { id: randomUUID(), criadoEm: new Date().toISOString() };
  try {
    fs.writeFileSync(CAMINHO_IDENTIDADE(), conteudoDaIdentidade(nova), "utf8");
  } catch (err) {
    // Sem conseguir gravar, a identidade muda a cada abertura — ruim pra
    // lista de computadores, mas nunca motivo pra atrapalhar quem está no
    // balcão. Fica registrado pra quem for olhar o Diagnóstico.
    logErroDaTela(`Não consegui gravar computador.json: ${String(err)}`);
  }
  return nova;
}

aoPedidoDaTela("computador:identidade", async () => ({
  id: carregarOuCriarIdentidade().id,
  // O nome que o Windows dá à máquina ("DESKTOP-7GH2K1"). É o que já aparece
  // na rede da loja, e o que ajuda o admin a saber qual computador é qual
  // antes de dar um apelido.
  nomeMaquina: os.hostname(),
  versao: app.getVersion(),
  canal: carregarCanal(),
  sistema: `${osVersaoLegivel()} (${os.release()})`,
}));

// Sem isso, o Chromium detecta que a janela ficou "oculta" atrás de outra
// (ex: alt-tab, mesmo que por poucos segundos) e descarta/recarrega a tela
// pra economizar recursos — do lado da usuária isso parece a tela "resetar"
// sozinha, perdendo o que estava sendo digitado. Esses dois parâmetros
// (precisam ser setados antes de `app.whenReady()`) desligam essa otimização
// — não faz sentido pra um app de uso o dia todo, sempre em primeiro plano.
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

// Abre uma conversa no WhatsApp no navegador padrão do computador (item
// FN-03 do guia de melhorias). Precisa acontecer no processo principal: a
// tela do app não tem como pedir ao sistema operacional pra abrir nada.
//
// A URL é CONFERIDA aqui antes de sair, e não só montada com cuidado do
// outro lado: ela é construída com dado que veio do banco (telefone e texto
// de mensagem editável), e `shell.openExternal` entrega o endereço pro
// sistema operacional — que obedece esquemas bem além de http (`file:`,
// `javascript:`, e no Windows qualquer protocolo registrado por um programa
// instalado). É o item 15 do checklist de segurança do Electron, e URL
// montada com dado de banco é exatamente o caso que ele descreve.
//
// Por isso a checagem é por lista de permissão, não por lista de proibição:
// tem que ser https, tem que ser o host wa.me, e nada mais passa.
aoPedidoDaTela("whatsapp:abrir", async (url: unknown): Promise<boolean> => {
  if (typeof url !== "string") return false;
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    return false;
  }
  if (endereco.protocol !== "https:" || endereco.hostname !== "wa.me") return false;
  await shell.openExternal(endereco.toString());
  return true;
});

// Sem isso, o Electron mostra a barra de menu padrão (File/Edit/View/
// Window/Help) — itens genéricos em inglês sem função nenhuma pro app,
// que só ocupam uma faixa branca feia no topo da janela, inclusive em tela
// cheia. O app já tem sua própria navegação (Sidebar); não precisa dessa
// barra nativa.
Menu.setApplicationMenu(null);

// A barra da janela (visual novo, #990, tarefa 6). O Windows desenhava uma
// faixa branca em cima do programa; agora a barra é do programa (na cor dele,
// com a flor e o nome), e o Windows só põe por cima os três botões de verdade
// (minimizar, maximizar, fechar) — `titleBarStyle: "hidden"` com
// `titleBarOverlay`. Arrastar pelo topo, duplo clique, encaixe na lateral e
// os três botões continuam sendo do sistema. NÃO se força canto arredondado:
// no Windows 11 ele vem sozinho; no 10 exigiria janela transparente, que perde
// a sombra e o encaixe (decisão em docs/referencia/visual-novo/README.md,
// seção 12). No Mac o Electron mantém a barra de sempre (o programa é só Windows).
const ALTURA_DA_BARRA = 40;
const TEM_BARRA_PROPRIA = process.platform !== "darwin";

// Mesmos valores de `fundo` e `texto` de cada tema em src/styles/globals.css:
// a faixa dos botões é pintada pelo sistema, então precisa casar com a barra
// que o programa desenha. O fundo da janela, enquanto a tela carrega, é o
// escuro (o padrão); era o rosa-claro do tema antigo e piscava ao abrir.
const CORES_DA_BARRA = {
  escuro: { color: "#0A0A0D", symbolColor: "#FFFFFF" },
  claro: { color: "#F3F2EF", symbolColor: "#1B1B1F" },
} as const;

// O ícone da janela aberta (barra de tarefas e Alt+Tab) segue o tema do
// programa, e troca na hora (Sofia, 17/11/2026, #990). O do instalador, do
// atalho e do ícone fixado com o programa fechado é um só, o escuro
// (`build/icon.png`): esse o Windows lê do .exe, e o programa não muda. Com o
// programa fixado na barra, o Windows 11 pode continuar mostrando o do atalho.
// As imagens vêm de `public/` (geradas por
// docs/referencia/visual-novo/conceito/icone.mjs), que o Vite copia pra `dist`.
const PASTA_DOS_ICONES = VITE_DEV_SERVER_URL ? path.join(__dirname, "..", "public") : RENDERER_DIST;
const ICONE_DA_JANELA = {
  escuro: path.join(PASTA_DOS_ICONES, "icone-janela-escuro.png"),
  claro: path.join(PASTA_DOS_ICONES, "icone-janela-claro.png"),
} as const;

aoAvisoDaTela("janela:tema", (tema: unknown) => {
  if (!TEM_BARRA_PROPRIA || !mainWindow || mainWindow.isDestroyed()) return;
  if (tema !== "escuro" && tema !== "claro") return;
  try {
    mainWindow.setIcon(ICONE_DA_JANELA[tema]);
  } catch (erro) {
    logErroDaTela(`Ícone da janela: ${String(erro).slice(0, 200)}`);
  }
  try {
    mainWindow.setTitleBarOverlay({ ...CORES_DA_BARRA[tema], height: ALTURA_DA_BARRA });
    // O fundo da janela também: ao redimensionar, a borda não pisca escura no claro.
    mainWindow.setBackgroundColor(CORES_DA_BARRA[tema].color);
  } catch (erro) {
    logErroDaTela(`Barra da janela: ${String(erro).slice(0, 200)}`);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: CORES_DA_BARRA.escuro.color,
    // Nasce com o do tema padrão; a tela avisa o tema guardado logo ao abrir.
    icon: ICONE_DA_JANELA.escuro,
    ...(TEM_BARRA_PROPRIA
      ? {
          titleBarStyle: "hidden" as const,
          titleBarOverlay: { ...CORES_DA_BARRA.escuro, height: ALTURA_DA_BARRA },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      // A tela precisa saber, já na primeira pintura, se a barra é dela (o
      // preload lê isto; ver `barraDaJanela`).
      additionalArguments: [`--barra-da-janela=${TEM_BARRA_PROPRIA ? ALTURA_DA_BARRA : 0}`],
      backgroundThrottling: false,
      // Os quatro abaixo já são o padrão do Electron 33 — foram conferidos
      // ligados, rodando o app de verdade, antes de serem escritos aqui.
      // Estão declarados mesmo assim por dois motivos: quem lê este arquivo
      // não precisa ir procurar qual era o padrão da versão em uso, e uma
      // troca de padrão numa atualização futura do Electron não muda a
      // postura deste app sem alguém decidir.
      //
      // O que cada um evita, em uma linha: `contextIsolation` é o que impede
      // a tela de alcançar o que o preload enxerga; `nodeIntegration`
      // desligado é o que faz um XSS continuar sendo um XSS em vez de virar
      // leitura e escrita de arquivo na máquina; `sandbox` prende o processo
      // da tela; `webSecurity` mantém a mesma-origem valendo.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Nada navega pra fora do app. O menu lateral usa HashRouter (troca só o
  // `#`, que nem passa por aqui), então o que sobraria seria um link vindo
  // de texto cadastrado no banco levando a janela inteira pra outro site —
  // com a barra de endereço escondida, ninguém veria que saiu do sistema.
  // Link externo legítimo tem um caminho próprio e conferido: o
  // `whatsapp:abrir`, que abre no navegador do computador.
  mainWindow.webContents.on("will-navigate", (evento, url) => {
    if (!url.startsWith(ORIGEM_DA_TELA)) {
      evento.preventDefault();
      logErroDaTela(`Navegação bloqueada para ${url.slice(0, 200)}`);
    }
  });

  // E nada abre janela nova: `window.open` e `target="_blank"` viram uma
  // janela do Electron sem barra de endereço nenhuma, que é a forma mais
  // fácil de passar um site qualquer por "tela do sistema". A única exceção
  // é o portal da prefeitura (o documento oficial da NFS-e, #773), e mesmo
  // ele abre no navegador do computador, nunca numa janela do app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (podeAbrirNoNavegador(url)) {
      void shell.openExternal(url);
    } else {
      logErroDaTela(`Janela nova bloqueada para ${url.slice(0, 200)}`);
    }
    return { action: "deny" };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // DevTools só em desenvolvimento — no app instalado ele nunca abre
    // sozinho, e sem a barra de menu nativa (removida logo acima) também
    // não há atalho pra abrir sem querer no balcão.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Sem isso, o autoUpdater roda "no escuro" — não tem terminal visível num
// app instalado (aberto por duplo clique), e o Console do DevTools do
// renderer não enxerga nada do processo principal. Escreve num arquivo de
// texto simples em vez de puxar uma dependência só pra log.
const CAMINHO_LOG_ATUALIZACAO = () => path.join(app.getPath("userData"), "atualizacoes.log");

function logAtualizacao(mensagem: string) {
  const linha = `[${new Date().toISOString()}] ${mensagem}\n`;
  try {
    fs.appendFileSync(CAMINHO_LOG_ATUALIZACAO(), linha);
  } catch {
    // Se nem o log conseguir escrever, não há mais nada a fazer aqui —
    // não deixa isso derrubar a checagem de atualização.
  }
}

// Erro de JavaScript acontecido na TELA (processo renderer). Sem isso, um
// erro desses é invisível pra quem usa o app instalado: o DevTools só abre
// em modo de desenvolvimento, e um app aberto por duplo clique não tem
// terminal nenhum pra mostrar o console. É justamente o tipo de problema que
// "some ao fechar e abrir o app" — o estado quebrado morre junto com a
// janela, e sem registro não sobra nenhuma pista do que aconteceu.
const CAMINHO_LOG_ERROS = () => path.join(app.getPath("userData"), "erros.log");

function logErroDaTela(mensagem: string) {
  const linha = `[${new Date().toISOString()}] ${mensagem}\n`;
  try {
    fs.appendFileSync(CAMINHO_LOG_ERROS(), linha);
  } catch {
    // Mesma postura do log de atualização: se nem logar dá, não é motivo
    // pra atrapalhar o uso do sistema.
  }
}

aoAvisoDaTela("log:erroDaTela", (mensagem: unknown) => {
  logErroDaTela(String(mensagem).slice(0, 4000));
});

// --- Diagnóstico (item TR-08.1 do guia de melhorias) ----------------------
//
// Hoje, socorrer uma loja é pedir pra pessoa do balcão achar um arquivo
// dentro de %APPDATA% e mandar por WhatsApp. Com uma loja dá; com quatro
// empresas, não. Estes dois handlers são o que a tela de Diagnóstico não tem
// como descobrir sozinha: o que só o processo principal enxerga (versões do
// Electron/Chromium/sistema, onde ficam os arquivos) e o conteúdo dos dois
// registros em disco.
//
// **Nada aqui lê banco de dados nem chave de acesso.** A conexão que a tela
// mostra sai de `SAKURA_SUPABASE_URL`, que é só o endereço — a chave nunca
// passa por estes handlers.
aoPedidoDaTela("diagnostico:info", async () => ({
  versaoApp: app.getVersion(),
  electron: process.versions.electron,
  chromium: process.versions.chrome,
  node: process.versions.node,
  plataforma: process.platform,
  // `os.version()` dá o nome legível ("Windows 11 Pro"); `os.release()` dá o
  // número. Os dois juntos são o que serve pra reproduzir um problema.
  sistema: `${osVersaoLegivel()} (${os.release()})`,
  arquitetura: process.arch,
  pastaDados: app.getPath("userData"),
  canalAtualizacao: carregarCanal(),
}));

function osVersaoLegivel(): string {
  try {
    return os.version();
  } catch {
    return process.platform;
  }
}

// Lê o FIM de um arquivo de registro. Os dois logs crescem pra sempre (o de
// erros só quando algo quebra, o de atualização a cada abertura), então ler
// o arquivo inteiro na memória seria pedir problema com o tempo — daí o
// limite em bytes antes de cortar por linha.
const MAXIMO_BYTES_DE_LOG = 512 * 1024;

function lerFinalDoArquivo(caminho: string, linhas: number): string {
  try {
    const tamanho = fs.statSync(caminho).size;
    const inicio = Math.max(0, tamanho - MAXIMO_BYTES_DE_LOG);
    const descritor = fs.openSync(caminho, "r");
    try {
      const buffer = Buffer.alloc(tamanho - inicio);
      fs.readSync(descritor, buffer, 0, buffer.length, inicio);
      return buffer.toString("utf8").split("\n").slice(-linhas).join("\n");
    } finally {
      fs.closeSync(descritor);
    }
  } catch {
    // Arquivo ainda não existe — é o caso normal de quem nunca teve erro.
    return "";
  }
}

aoPedidoDaTela("diagnostico:logs", async (linhas: unknown) => {
  const quantas = typeof linhas === "number" && linhas > 0 ? Math.min(linhas, 2000) : 200;
  return {
    erros: lerFinalDoArquivo(CAMINHO_LOG_ERROS(), quantas),
    atualizacoes: lerFinalDoArquivo(CAMINHO_LOG_ATUALIZACAO(), quantas),
  };
});

// --- O PDF da nota pro cliente (#1115) ------------------------------------
//
// O cliente abre PDF no celular e no WhatsApp; a NFC-e da Focus vem em HTML.
// A tela monta o recibo da nota (do XML guardado) e manda só esse HTML, como
// texto; aqui ele vira PDF numa janela escondida, com o `printToPDF` do
// próprio Chromium: sem biblioteca nova e sem peso no instalador.
//
// A janela escondida é mais fechada que a do app: sem preload (nenhuma ponte),
// sem script (`javascript: false`), numa sessão só dela que não deixa sair
// nada pra rede (só o próprio `data:` do documento), sem navegar e sem abrir
// janela. A CSP e o preload da tela não mudam. A janela some no fim, dê certo
// ou não, e a tela, se isto falhar, avisa e baixa o arquivo de antes.
const SESSAO_DO_PDF = "gerar-pdf-da-nota";
let sessaoDoPdfPronta = false;

function prepararSessaoDoPdf() {
  if (sessaoDoPdfPronta) return;
  session.fromPartition(SESSAO_DO_PDF).webRequest.onBeforeRequest((detalhes, responder) => {
    responder({ cancel: !detalhes.url.startsWith("data:") });
  });
  sessaoDoPdfPronta = true;
}

async function gerarPdfDoHtml(html: string): Promise<Uint8Array> {
  prepararSessaoDoPdf();
  const janela = new BrowserWindow({
    show: false,
    width: 794, // A4 em 96 dpi: o recibo se arruma como no papel.
    height: 1123,
    webPreferences: {
      partition: SESSAO_DO_PDF,
      javascript: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  janela.webContents.on("will-navigate", (evento) => evento.preventDefault());
  janela.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  // Sem script e sem rede, travar é improvável; se travar, a tela não fica
  // em "Gerando…" pra sempre: desiste em 30 s (e a tela baixa o de antes).
  let relogio: ReturnType<typeof setTimeout> | undefined;
  const desistir = new Promise<never>((_, recusar) => {
    relogio = setTimeout(() => recusar(new Error("o PDF demorou demais")), 30_000);
  });
  try {
    const gerar = async () => {
      const conteudo = Buffer.from(html, "utf8").toString("base64");
      await janela.loadURL(`data:text/html;charset=utf-8;base64,${conteudo}`);
      return janela.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true,
        margins: { marginType: "default" },
      });
    };
    return new Uint8Array(await Promise.race([gerar(), desistir]));
  } finally {
    clearTimeout(relogio);
    janela.destroy();
  }
}

aoPedidoDaTela("gerar-pdf-da-nota", async (html: unknown) => {
  const motivo = motivoHtmlRecusadoParaPdf(html);
  if (motivo) throw new Error(motivo);
  try {
    return await gerarPdfDoHtml(html as string);
  } catch (erro) {
    logErroDaTela(`PDF da nota: ${String(erro).slice(0, 200)}`);
    throw new Error("não deu pra montar o PDF neste computador");
  }
});

app.whenReady().then(() => {
  // Antes de abrir a janela: a política precisa estar valendo já na primeira
  // resposta, senão o documento inicial carrega sem ela.
  aplicarPoliticaDeSeguranca();
  createWindow();

  if (!VITE_DEV_SERVER_URL) {
    const canal = carregarCanal();
    const { allowPrerelease, allowDowngrade } = configuracaoDoAtualizador(canal);
    autoUpdater.allowPrerelease = allowPrerelease;
    autoUpdater.allowDowngrade = allowDowngrade;
    // Registrado aqui, e não no evento "checking-for-update": fora do
    // instalador a biblioteca pula a busca sem emitir evento nenhum, e numa
    // loja a busca pode falhar antes de começar. Em qualquer dos casos,
    // "em que canal este computador estava?" continua respondido.
    logAtualizacao(`Abrindo no canal de atualização: ${canal}.`);

    autoUpdater.on("checking-for-update", () => logAtualizacao("Procurando atualização..."));
    autoUpdater.on("update-available", (info) =>
      logAtualizacao(`Atualização encontrada: v${info.version}`),
    );
    autoUpdater.on("update-not-available", () =>
      logAtualizacao("Nenhuma atualização encontrada — já está na versão mais recente."),
    );
    autoUpdater.on("download-progress", (progresso) =>
      logAtualizacao(`Baixando atualização... ${Math.round(progresso.percent)}%`),
    );
    autoUpdater.on("update-downloaded", (info) =>
      logAtualizacao(`Atualização v${info.version} baixada — será instalada ao fechar o app.`),
    );
    autoUpdater.on("error", (erro) => logAtualizacao(`ERRO ao atualizar: ${erro.message}`));

    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    mainWindow = null;
  }
});

// Teste de ponta a ponta no Electron de VERDADE (item TR-04.6 do guia).
//
// Por que isto existe como arquivo versionado, e não como script solto: o
// preload é o lugar clássico de quebrar em silêncio neste projeto — já
// aconteceu de ele parar de rodar inteiro e o sintoma ser só a versão do app
// sumindo de um canto da tela (PROJETO_STATUS.md, seção 6, item 18). Leitura
// de código não pega isso, e teste de função pura também não: só abrir o app
// pega.
//
// O que ele prova, em uma frase cada:
//   - o preload roda até o fim e a tela recebe a ponte inteira;
//   - as quatro travas de `webPreferences` estão realmente ligadas;
//   - a política de segurança (CSP) está valendo — script embutido é
//     recusado e endereço de rede fora da lista é recusado;
//   - e, do outro lado, que ela NÃO quebrou o que o app precisa: o estilo
//     que o React escreve no elemento, e os documentos de garantia/recibo/
//     DANFE, que aparecem dentro de `iframe`;
//   - a ponte antiga da Focus NFe (`fetchComAuth`) não volta a existir;
//   - o canal de atualização escolhido na tela chega no disco, e o
//     atualizador procura no canal que estava gravado (item TR-09.1);
//   - nada navega pra fora do app nem abre janela nova.
//
// Como rodar:  npm run test:electron
// Precisa de:  npm run build feito antes, e (em Linux) um servidor gráfico
//              de mentira — é por isso que o comando chama `xvfb-run`.
//
// NÃO roda no Windows dela, e não precisa: é uma checagem de CI, como a
// matriz de RLS. Nada aqui fala com o Supabase de verdade.

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function carregarElectronDoPlaywright() {
  // Mesmo motivo do site/ferramentas/playwright.mjs: o Playwright não é
  // dependência do projeto (baixaria centenas de MB de navegador na máquina
  // de quem só quer rodar o app).
  for (const caminho of ["playwright", "/opt/node22/lib/node_modules/playwright/index.mjs"]) {
    try {
      const modulo = await import(caminho);
      if (modulo._electron) return modulo._electron;
    } catch {
      // tenta o próximo
    }
  }
  throw new Error(
    "Playwright não encontrado. Instale só para esta rodada, sem mexer no package.json:\n\n" +
      "  npm i --no-save playwright\n",
  );
}

const falhas = [];
const passos = [];

function conferir(descricao, condicao, detalhe = "") {
  if (condicao) {
    passos.push(`  ok   ${descricao}`);
  } else {
    passos.push(`  FALHOU  ${descricao}${detalhe ? ` — ${detalhe}` : ""}`);
    falhas.push(descricao);
  }
}

for (const pasta of ["dist", "dist-electron"]) {
  if (!fs.existsSync(path.join(RAIZ, pasta))) {
    console.error(`Falta a pasta "${pasta}". Rode "npm run build" antes deste teste.`);
    process.exit(1);
  }
}

const electron = await carregarElectronDoPlaywright();
const app = await electron.launch({
  // Apontar para a RAIZ do app, e não para dist-electron/main.js: apontando
  // direto pro arquivo, o Electron não acha o package.json e `app.getVersion()`
  // devolve a versão do próprio Electron em vez da do Sakura System.
  executablePath: path.join(RAIZ, "node_modules/.bin/electron"),
  args: ["."],
  cwd: RAIZ,
  env: { ...process.env, VITE_DEV_SERVER_URL: "" },
});

try {
  const pagina = await app.firstWindow();

  // Recados de violação da política de segurança, recolhidos enquanto o
  // teste roda. Eles são a prova de que a CSP está valendo de verdade — e,
  // ao mesmo tempo, o alarme de que ela está atrapalhando algo que devia
  // funcionar.
  const violacoes = [];
  pagina.on("console", (mensagem) => {
    const texto = mensagem.text();
    if (/Content Security Policy|Refused to/i.test(texto)) violacoes.push(texto);
  });

  await pagina.waitForLoadState("domcontentloaded");
  await pagina.waitForTimeout(2500);

  // --- 1. O preload rodou inteiro? ---------------------------------------
  const ponte = await pagina.evaluate(() => ({
    existe: typeof window.sakuraApp === "object" && window.sakuraApp !== null,
    chaves: window.sakuraApp ? Object.keys(window.sakuraApp).sort() : [],
    versao: window.sakuraApp?.version ?? "",
  }));
  const CHAVES_ESPERADAS = [
    "abrirWhatsapp",
    "canalAtualizacao",
    "conexao",
    "diagnostico",
    "identidadeComputador",
    "lerLogs",
    "registrarErro",
    "definirCanalAtualizacao",
    "salvarConexao",
    "version",
  ];
  conferir("o preload expõe a ponte para a tela", ponte.existe);
  conferir(
    "a ponte tem todas as funções esperadas",
    CHAVES_ESPERADAS.every((chave) => ponte.chaves.includes(chave)),
    `veio: ${ponte.chaves.join(", ")}`,
  );
  // A ponte antiga da Focus NFe (`fetchComAuth`) saiu na tarefa #368: o
  // token mora no cofre e quem fala com a Focus é o porteiro (Edge Function
  // focus-nfe). Uma requisição autenticada aberta pra tela é exatamente o que
  // não pode voltar sem ninguém perceber.
  conferir(
    "a ponte antiga da Focus NFe (fetchComAuth) não existe mais",
    !ponte.chaves.includes("fetchComAuth"),
    `veio: ${ponte.chaves.join(", ")}`,
  );
  conferir(
    "a versão do app chega na tela (não é a do Electron)",
    /^\d+\.\d+\.\d+/.test(ponte.versao) && ponte.versao !== process.versions.electron,
    `veio "${ponte.versao}"`,
  );

  // --- 2. A tela montou? --------------------------------------------------
  const tela = await pagina.evaluate(() => ({
    montou: !!document.querySelector("#root")?.firstElementChild,
    temTexto: (document.body.innerText || "").trim().length > 0,
    folhasDeEstilo: document.styleSheets.length,
  }));
  conferir("o React montou a tela", tela.montou && tela.temTexto);
  conferir("a folha de estilo do app carregou", tela.folhasDeEstilo > 0);

  // --- 3. As travas de webPreferences estão ligadas? ---------------------
  const preferencias = await app.evaluate(async ({ BrowserWindow }) => {
    const janela = BrowserWindow.getAllWindows()[0];
    const p = janela.webContents.getLastWebPreferences();
    return {
      sandbox: p?.sandbox,
      contextIsolation: p?.contextIsolation,
      nodeIntegration: p?.nodeIntegration,
      webSecurity: p?.webSecurity,
    };
  });
  conferir("sandbox ligado", preferencias.sandbox === true);
  conferir("contextIsolation ligado", preferencias.contextIsolation === true);
  conferir("nodeIntegration desligado", preferencias.nodeIntegration === false);
  conferir("webSecurity ligado", preferencias.webSecurity === true);

  // --- 4. A CSP recusa script embutido? ----------------------------------
  //
  // Escrito assim, inserindo um <script> no documento, de propósito: um
  // `eval()` avaliado pelo Playwright NÃO passa pela CSP (ele entra pelo
  // canal de depuração), então testar por ali daria "passou" sempre — o
  // instrumento diria o contrário do que acontece com a tela de verdade.
  const inline = await pagina.evaluate(() => {
    const script = document.createElement("script");
    script.textContent = "window.__SCRIPT_EMBUTIDO_RODOU__ = true";
    document.head.appendChild(script);
    script.remove();
    return window.__SCRIPT_EMBUTIDO_RODOU__ === true;
  });
  conferir("script embutido na página é recusado", inline === false);

  // --- 5. A CSP recusa endereço de rede fora da lista? -------------------
  const violacoesAntes = violacoes.length;
  await pagina.evaluate(async () => {
    try {
      await fetch("https://endereco-que-nao-deveria-passar.invalid/x");
    } catch {
      // O que conta é a violação registrada, não o erro daqui.
    }
  });
  await pagina.waitForTimeout(600);
  conferir(
    "endereço de rede fora da lista é recusado pela política",
    violacoes.slice(violacoesAntes).some((v) => /connect-src|Refused to connect/i.test(v)),
    "nenhuma violação de connect-src apareceu",
  );

  // --- 6. ...e a CSP NÃO quebrou o que o app precisa ---------------------
  const aparencia = await pagina.evaluate(async () => {
    const resultado = {};
    // O estilo que o React escreve direto no elemento (`style={{...}}`): é
    // como a barra de rolagem customizada, o menu de ações e os gráficos se
    // posicionam. Sem `'unsafe-inline'` em style-src, isto vira 0px.
    const div = document.createElement("div");
    div.setAttribute("style", "height: 42px");
    document.body.appendChild(div);
    resultado.alturaDoEstiloEmbutido = getComputedStyle(div).height;
    div.remove();

    // Os documentos que aparecem dentro de um iframe: garantia e recibo do
    // cliente usam `srcdoc`; o DANFE em PDF usa `blob:`.
    async function medirIframe(preparar) {
      const quadro = document.createElement("iframe");
      preparar(quadro);
      document.body.appendChild(quadro);
      await new Promise((pronto) => {
        quadro.onload = pronto;
        setTimeout(pronto, 2000);
      });
      let saida = { texto: "(nulo)", fundo: "(nulo)" };
      try {
        saida = {
          texto: quadro.contentDocument?.getElementById("alvo")?.textContent ?? "(nulo)",
          fundo: getComputedStyle(quadro.contentDocument.body).backgroundColor,
        };
      } catch (erro) {
        saida = { texto: `ERRO ${erro.message}`, fundo: "(nulo)" };
      }
      quadro.remove();
      return saida;
    }

    const html =
      "<html><head><style>body{background:rgb(1,2,3)}</style></head>" +
      "<body><p id='alvo'>conteudo</p></body></html>";
    resultado.srcdoc = await medirIframe((quadro) => {
      quadro.srcdoc = html;
    });
    resultado.blob = await medirIframe((quadro) => {
      quadro.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    });
    return resultado;
  });
  conferir(
    "o estilo que o React escreve no elemento continua valendo",
    aparencia.alturaDoEstiloEmbutido === "42px",
    `altura medida: ${aparencia.alturaDoEstiloEmbutido}`,
  );
  conferir(
    "garantia e recibo (iframe srcdoc) aparecem com o estilo deles",
    aparencia.srcdoc.texto === "conteudo" && aparencia.srcdoc.fundo === "rgb(1, 2, 3)",
    JSON.stringify(aparencia.srcdoc),
  );
  conferir(
    "DANFE (iframe blob:) aparece com o estilo dele",
    aparencia.blob.texto === "conteudo" && aparencia.blob.fundo === "rgb(1, 2, 3)",
    JSON.stringify(aparencia.blob),
  );

  // --- 7. O IPC legítimo continua funcionando ----------------------------
  //
  // O outro lado da moeda da checagem de remetente: se ela passasse a
  // recusar a própria tela, o app chegaria na loja sem diagnóstico, sem
  // registro de erro e sem conseguir salvar a conexão do banco.
  const diagnostico = await pagina.evaluate(async () => {
    try {
      const info = await window.sakuraApp.diagnostico();
      return { deu: true, versao: info?.versaoApp ?? "", electron: info?.electron ?? "" };
    } catch (erro) {
      return { deu: false, erro: String(erro?.message ?? erro) };
    }
  });
  conferir(
    "a tela legítima continua sendo atendida pelo processo principal",
    diagnostico.deu && !!diagnostico.versao && !!diagnostico.electron,
    JSON.stringify(diagnostico),
  );

  // --- 7c. O canal de atualização deste computador (item TR-09.1) --------
  //
  // O arquivo de verdade, na pasta de dados de verdade: é o único jeito de
  // provar que a escolha feita na tela chega no disco no formato que o
  // processo principal lê na abertura seguinte. O arquivo que existia antes
  // do teste é devolvido no fim, pra rodada nenhuma mudar o computador.
  const pastaDados = await app.evaluate(({ app: electronApp }) => electronApp.getPath("userData"));
  const arquivoCanal = path.join(pastaDados, "atualizacao.json");
  const canalAntes = fs.existsSync(arquivoCanal) ? fs.readFileSync(arquivoCanal, "utf8") : null;
  const canalNaAbertura = (() => {
    try {
      const lido = JSON.parse(canalAntes ?? "{}").canal;
      return lido === "teste" ? "teste" : "normal";
    } catch {
      return "normal";
    }
  })();
  try {
    // O atualizador foi configurado com o canal que estava no disco quando
    // o programa abriu — e diz isso no registro, que é onde se olha quando
    // uma loja "não atualizou". (Fora do instalador a biblioteca pula a
    // busca em si, então é a linha da configuração que dá pra conferir.)
    const logAtualizacao = fs.existsSync(path.join(pastaDados, "atualizacoes.log"))
      ? fs.readFileSync(path.join(pastaDados, "atualizacoes.log"), "utf8")
      : "";
    const ultimaBusca = logAtualizacao
      .split("\n")
      .filter((linha) => linha.includes("Abrindo no canal de atualização"))
      .pop();
    conferir(
      "o atualizador foi configurado com o canal gravado neste computador",
      !!ultimaBusca && ultimaBusca.includes(`canal de atualização: ${canalNaAbertura}.`),
      ultimaBusca ?? "nenhuma busca registrada",
    );

    const canal = await pagina.evaluate(async () => {
      const lido = await window.sakuraApp.canalAtualizacao();
      await window.sakuraApp.definirCanalAtualizacao("teste");
      const depois = await window.sakuraApp.canalAtualizacao();
      let recusou = "";
      try {
        await window.sakuraApp.definirCanalAtualizacao("beta");
      } catch (erro) {
        recusou = String(erro?.message ?? erro);
      }
      const info = await window.sakuraApp.diagnostico();
      return { lido, depois, recusou, noDiagnostico: info?.canalAtualizacao };
    });
    conferir(
      "a tela lê o canal gravado",
      canal.lido === canalNaAbertura,
      `veio "${canal.lido}", esperado "${canalNaAbertura}"`,
    );
    conferir(
      "escolher o canal de teste grava no disco",
      canal.depois === "teste" &&
        JSON.parse(fs.readFileSync(arquivoCanal, "utf8")).canal === "teste",
    );
    conferir(
      "canal inventado é recusado e não estraga o arquivo",
      /Canal inválido/.test(canal.recusou) &&
        JSON.parse(fs.readFileSync(arquivoCanal, "utf8")).canal === "teste",
      canal.recusou,
    );
    conferir(
      "o diagnóstico mostra o canal",
      canal.noDiagnostico === "teste",
      `veio "${canal.noDiagnostico}"`,
    );
  } finally {
    if (canalAntes === null) fs.rmSync(arquivoCanal, { force: true });
    else fs.writeFileSync(arquivoCanal, canalAntes);
  }

  // --- 7d. A identidade deste computador (migration 0063) ----------------
  //
  // É ela que diz ao banco "sou o mesmo computador de ontem". O que precisa
  // ser verdade: o mesmo número a cada pedido (senão cada login vira um
  // computador novo na lista do admin), gravado no disco, e — com o arquivo
  // estragado — um número novo e válido, nunca um erro que trave a tela.
  // O arquivo que existia antes do teste é devolvido no fim.
  const arquivoIdentidade = path.join(pastaDados, "computador.json");
  const identidadeAntes = fs.existsSync(arquivoIdentidade)
    ? fs.readFileSync(arquivoIdentidade, "utf8")
    : null;
  // Ler o id gravado sem nunca estourar: com o arquivo estragado (ou não
  // gravado), a checagem tem que dizer FALHOU, não derrubar o teste inteiro.
  const idNoDisco = () => {
    try {
      return JSON.parse(fs.readFileSync(arquivoIdentidade, "utf8")).id ?? null;
    } catch {
      return null;
    }
  };
  try {
    const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const [primeira, segunda] = await pagina.evaluate(async () => [
      await window.sakuraApp.identidadeComputador(),
      await window.sakuraApp.identidadeComputador(),
    ]);
    conferir(
      "o computador tem uma identidade, e é a mesma a cada pedido",
      FORMATO_UUID.test(primeira.id) && primeira.id === segunda.id,
      `veio "${primeira.id}" e "${segunda.id}"`,
    );
    conferir(
      "a identidade fica gravada no disco",
      idNoDisco() === primeira.id,
    );
    conferir(
      "junto vão a versão do app, o nome da máquina e o canal",
      primeira.versao === ponte.versao &&
        primeira.nomeMaquina === os.hostname() &&
        (primeira.canal === "normal" || primeira.canal === "teste") &&
        typeof primeira.sistema === "string" && primeira.sistema.length > 0,
      JSON.stringify(primeira),
    );

    fs.writeFileSync(arquivoIdentidade, "{ isto não é json");
    const depoisDeEstragar = await pagina.evaluate(() => window.sakuraApp.identidadeComputador());
    conferir(
      "com o arquivo estragado, nasce uma identidade nova e válida",
      FORMATO_UUID.test(depoisDeEstragar.id) &&
        depoisDeEstragar.id !== primeira.id &&
        idNoDisco() === depoisDeEstragar.id,
      depoisDeEstragar.id,
    );
  } finally {
    if (identidadeAntes === null) fs.rmSync(arquivoIdentidade, { force: true });
    else fs.writeFileSync(arquivoIdentidade, identidadeAntes);
  }

  // --- 8. Nada abre janela nova nem navega pra fora ----------------------
  const janelasAntes = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  await pagina.evaluate(() => {
    window.open("https://exemplo.test/", "_blank");
  });
  await pagina.waitForTimeout(800);
  const janelasDepois = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  conferir("janela nova é bloqueada", janelasDepois === janelasAntes);

  const enderecoAntes = pagina.url();
  await pagina.evaluate(() => {
    window.location.href = "https://exemplo.test/";
  });
  await pagina.waitForTimeout(1200);
  const enderecoDepois = pagina.url();
  conferir(
    "navegar pra fora do app é bloqueado",
    enderecoDepois === enderecoAntes,
    `foi de ${enderecoAntes} para ${enderecoDepois}`,
  );
} finally {
  await app.close();
}

console.log("\nTeste do Electron de verdade\n");
console.log(passos.join("\n"));

if (falhas.length) {
  console.error(`\n${falhas.length} checagem(ns) falharam.\n`);
  process.exit(1);
}
console.log(`\n${passos.length} checagens, todas passaram.\n`);

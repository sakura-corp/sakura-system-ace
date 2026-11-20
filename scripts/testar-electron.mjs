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
//   - nada navega pra fora do app nem abre janela nova; só o link do portal
//     da prefeitura (documento oficial da NFS-e) abre no navegador (#773);
//   - o PDF da nota pro cliente (#1115) sai de verdade, o canal só aceita
//     HTML em texto, a janela escondida não roda script nem busca nada fora e
//     some depois;
//   - no modo demonstração nada sai do computador (nem pro Supabase, nem pra
//     Focus NFe), a CSP é a mesma e o conexao.json não muda (#384).
//
// Com FOTOS_DEMO=<pasta>, salva também as fotos da demonstração (pro PR).
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
    "barraDaJanela",
    "definirTemaDaJanela",
    "canalAtualizacao",
    "conexao",
    "diagnostico",
    "gerarPdfDaNota",
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

  // --- 6b. O DANFE em PDF aparece de verdade (#965) ----------------------
  //
  // O passo acima usa HTML, e por isso passou verde enquanto o visualizador
  // de PDF estava quebrado: a CSP do app era colada nas páginas internas dele
  // (chrome-extension://), os scripts do visualizador não rodavam e a prévia
  // do DANFSe ficava escura e vazia. Aqui vai um PDF de verdade num iframe
  // `blob:`, como na emissão, e a prova é o visualizador ter rodado: o
  // elemento `pdf-viewer` definido dentro da página dele.
  await pagina.evaluate(() => {
    const pdf =
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
      "trailer<</Root 1 0 R>>\n%%EOF";
    const quadro = document.createElement("iframe");
    quadro.id = "teste-danfe-pdf";
    quadro.src = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    document.body.appendChild(quadro);
  });
  let visualizador = { achou: false, rodou: false };
  for (let tentativa = 0; tentativa < 20 && !visualizador.rodou; tentativa++) {
    await pagina.waitForTimeout(500);
    visualizador = await app.evaluate(async ({ BrowserWindow }) => {
      const janela = BrowserWindow.getAllWindows()[0];
      const quadros = janela.webContents.mainFrame.framesInSubtree.filter((f) =>
        f.url.startsWith("chrome-extension://"),
      );
      for (const quadro of quadros) {
        try {
          if (await quadro.executeJavaScript("!!customElements.get('pdf-viewer')")) {
            return { achou: true, rodou: true };
          }
        } catch {
          // o quadro ainda está carregando: tenta de novo
        }
      }
      return { achou: quadros.length > 0, rodou: false };
    });
  }
  await pagina.evaluate(() => {
    const quadro = document.getElementById("teste-danfe-pdf");
    if (quadro) URL.revokeObjectURL(quadro.src);
    quadro?.remove();
  });
  conferir(
    "DANFE em PDF (iframe blob:) abre o visualizador de PDF e ele roda",
    visualizador.rodou,
    visualizador.achou
      ? "o visualizador abriu mas os scripts dele não rodaram (a CSP do app chegou nele? o ID dele mudou?)"
      : "o visualizador de PDF nem abriu",
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

  // --- 7e. O PDF da nota pro cliente (#1115) -----------------------------
  //
  // A tela manda o HTML do recibo já montado; o processo principal abre uma
  // janela escondida, sem script e sem rede, e devolve os bytes do PDF. O que
  // se prova: sai um PDF de verdade; o canal recusa o que não é texto (e o
  // texto grande demais); script do HTML não roda e endereço de fora não é
  // buscado; e a janela escondida não fica pra trás.
  const pedidosDeFora = [];
  await app.evaluate(({ session }) => {
    globalThis.__pedidosDoPdf = { completos: [], recusados: [] };
    // Só observa (onCompleted/onErrorOccurred não mudam nada): a trava da
    // sessão do PDF é o onBeforeRequest dela, em electron/main.ts.
    const pedidos = session.fromPartition("gerar-pdf-da-nota").webRequest;
    pedidos.onCompleted((d) => globalThis.__pedidosDoPdf.completos.push(d.url));
    pedidos.onErrorOccurred((d) =>
      globalThis.__pedidosDoPdf.recusados.push({ url: d.url, erro: d.error }),
    );
  });
  const pdfDaNota = await pagina.evaluate(async () => {
    const html =
      "<!doctype html><html><head><meta charset='utf-8'><title>t</title></head><body>" +
      "<h1>NFC-e nº 21</h1><p>Pneu de exemplo · R$ 100,00</p>" +
      "<img src='https://endereco-que-nao-deveria-passar.invalid/logo.png'>" +
      // Se script rodasse aqui, ele tentaria buscar este endereço.
      "<script>new Image().src = 'https://script-rodou.invalid/x.png'</script>" +
      "</body></html>";
    const saida = {};
    try {
      const bytes = await window.sakuraApp.gerarPdfDaNota(html);
      saida.tipo = Object.prototype.toString.call(bytes);
      saida.tamanho = bytes.length;
      saida.comeco = String.fromCharCode(...bytes.slice(0, 5));
      saida.base64 = btoa(String.fromCharCode(...bytes.slice(0, 200000)));
    } catch (erro) {
      saida.erro = String(erro?.message ?? erro);
    }
    async function recusa(valor) {
      try {
        await window.sakuraApp.gerarPdfDaNota(valor);
        return false;
      } catch {
        return true;
      }
    }
    saida.recusaNumero = await recusa(42);
    saida.recusaObjeto = await recusa({ html: "<p>x</p>" });
    saida.recusaBytes = await recusa(new Uint8Array([60, 112, 62]));
    saida.recusaVazio = await recusa("   ");
    saida.recusaGrande = await recusa("x".repeat(1_000_001));
    return saida;
  });
  const pedidosDoPdf = await app.evaluate(() => globalThis.__pedidosDoPdf);
  // Fora do computador = tudo que não é o próprio `data:` do documento. Tem
  // que ter sido barrado pela trava (ERR_BLOCKED_BY_CLIENT), e não só ter
  // falhado: o endereço de teste não existe, então "não completou" provaria
  // nada.
  pedidosDeFora.push(
    ...pedidosDoPdf.completos.filter((u) => !u.startsWith("data:")),
    ...pedidosDoPdf.recusados
      .filter((p) => !p.url.startsWith("data:") && p.erro !== "net::ERR_BLOCKED_BY_CLIENT")
      .map((p) => `${p.url} (${p.erro})`),
  );
  const tentativas = [...pedidosDoPdf.completos, ...pedidosDoPdf.recusados.map((p) => p.url)];
  const janelasDepoisDoPdf = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  conferir(
    "o PDF da nota sai de verdade (bytes de PDF, não texto)",
    !pdfDaNota.erro && pdfDaNota.comeco === "%PDF-" && pdfDaNota.tamanho > 1000,
    pdfDaNota.erro ?? `${pdfDaNota.tipo}, ${pdfDaNota.tamanho} bytes, começa com "${pdfDaNota.comeco}"`,
  );
  conferir(
    "o canal do PDF só aceita HTML em texto (número, objeto, bytes, vazio e grande demais: recusados)",
    pdfDaNota.recusaNumero &&
      pdfDaNota.recusaObjeto &&
      pdfDaNota.recusaBytes &&
      pdfDaNota.recusaVazio &&
      pdfDaNota.recusaGrande,
    JSON.stringify({
      numero: pdfDaNota.recusaNumero,
      objeto: pdfDaNota.recusaObjeto,
      bytes: pdfDaNota.recusaBytes,
      vazio: pdfDaNota.recusaVazio,
      grande: pdfDaNota.recusaGrande,
    }),
  );
  conferir(
    "o script do HTML não roda na janela do PDF",
    !tentativas.some((u) => u.includes("script-rodou")),
    tentativas.join(", "),
  );
  conferir(
    "a janela do PDF não busca nada fora do computador (a imagem de fora foi barrada)",
    pedidosDeFora.length === 0 &&
      pedidosDoPdf.recusados.some((p) => p.url.includes("endereco-que-nao-deveria-passar")),
    pedidosDeFora.join(", ") || "a imagem de fora nem foi pedida (o teste não provou a trava)",
  );
  conferir(
    "a janela escondida do PDF não fica pra trás",
    janelasDepoisDoPdf === 1,
    `${janelasDepoisDoPdf} janelas abertas`,
  );
  if (process.env.PDF_DA_NOTA && pdfDaNota.base64) {
    fs.writeFileSync(path.resolve(RAIZ, process.env.PDF_DA_NOTA), Buffer.from(pdfDaNota.base64, "base64"));
  }

  // --- 8. Nada abre janela nova nem navega pra fora ----------------------
  const janelasAntes = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  await pagina.evaluate(() => {
    window.open("https://exemplo.test/", "_blank");
  });
  await pagina.waitForTimeout(800);
  const janelasDepois = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  conferir("janela nova é bloqueada", janelasDepois === janelasAntes);

  // O link do documento oficial da NFS-e (portal do Giap, #773) abre no
  // navegador do computador; qualquer outro, não. O `openExternal` é trocado
  // por um que só anota, pra o teste não abrir navegador nenhum.
  await app.evaluate(({ shell }) => {
    globalThis.__abertosNoNavegador = [];
    shell.openExternal = async (url) => {
      globalThis.__abertosNoNavegador.push(url);
    };
  });
  // Do jeito que acontece de verdade: um link `target="_blank"` dentro do
  // `iframe` do recibo ("Versão para o cliente"), clicado com o mouse.
  await pagina.evaluate(() => {
    const quadro = document.createElement("iframe");
    quadro.id = "recibo-teste";
    // Fora de baixo da barra do programa (fixa no topo, 40 px), senão ela
    // "intercepta" o clique do teste.
    quadro.style.cssText = "position:fixed;top:80px;left:20px;z-index:100;width:300px;height:80px";
    quadro.srcdoc =
      '<a id="outro" href="https://exemplo.test/" target="_blank">outro</a> ' +
      '<a id="portal" href="https://araraquara.giap.com.br/ords/pma/f?p=616:116" target="_blank">portal</a>';
    document.body.appendChild(quadro);
  });
  const recibo = pagina.frameLocator("#recibo-teste");
  await recibo.locator("#outro").click();
  await recibo.locator("#portal").click();
  await pagina.waitForTimeout(800);
  await pagina.evaluate(() => document.getElementById("recibo-teste")?.remove());
  const abertos = await app.evaluate(() => globalThis.__abertosNoNavegador);
  const janelasComPortal = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  conferir(
    "link do portal da prefeitura abre no navegador, e só ele",
    abertos.length === 1 &&
      abertos[0] === "https://araraquara.giap.com.br/ords/pma/f?p=616:116" &&
      janelasComPortal === janelasAntes,
    JSON.stringify(abertos),
  );

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

  // --- 9. "Reduzir movimento": nenhuma animação roda (tarefa 5, #990) -------
  // Monta, com as classes de verdade, um pedaço de cada movimento da tabela da
  // seção 8 das regras (trocar de tela, abrir janela, menu de três pontos, fio
  // do gráfico) e pergunta ao navegador qual animação cada um tem. Primeiro
  // com as animações LIGADAS (precisa ter: se não tiver, o teste não prova
  // nada), depois com "reduzir movimento" ligado (tem que ser nenhuma).
  await pagina.evaluate(() => {
    const caixa = document.createElement("div");
    caixa.id = "movimento-teste";
    caixa.innerHTML =
      '<div class="sakura-tela" data-entrando><div><p id="m-bloco-1">a</p><p id="m-bloco-2">b</p>' +
      '<p>c</p><p>d</p><p>e</p><p>f</p><p>g</p><p>h</p><p>i</p><div class="sakura-modal-fundo" id="m-fundo-na-tela"></div></div></div>' +
      '<div class="sakura-modal-fundo" id="m-fundo"><div class="sakura-modal" id="m-janela"></div></div>' +
      '<div class="sakura-menu-brota" id="m-menu"></div>' +
      '<svg data-fio-de-grafico><path id="m-fio-linha" class="fio-linha" d="M0 0 L1 1"/>' +
      '<path id="m-fio-area" class="fio-area" d="M0 0 L1 1"/><circle id="m-fio-ponta" class="fio-ponta" r="1"/></svg>';
    document.body.appendChild(caixa);
  });
  const IDS_DO_MOVIMENTO = ["m-bloco-1", "m-bloco-2", "m-fundo", "m-fundo-na-tela", "m-janela", "m-menu", "m-fio-linha", "m-fio-area", "m-fio-ponta"];
  const animacoesDe = () =>
    pagina.evaluate(
      (ids) => Object.fromEntries(ids.map((id) => [id, getComputedStyle(document.getElementById(id)).animationName])),
      IDS_DO_MOVIMENTO,
    );
  await pagina.emulateMedia({ reducedMotion: "no-preference" });
  const comMovimento = await animacoesDe();
  conferir(
    "com as animações ligadas, cada movimento da tabela tem a sua animação",
    IDS_DO_MOVIMENTO.every((id) => comMovimento[id] && comMovimento[id] !== "none"),
    JSON.stringify(comMovimento),
  );
  const atrasoDaJanelaNaTela = await pagina.evaluate(
    () => getComputedStyle(document.getElementById("m-fundo-na-tela")).animationDelay,
  );
  conferir(
    "a janela que nasce dentro da tela abre sem o atraso dos blocos (senão fica invisível e clicável)",
    atrasoDaJanelaNaTela === "0s",
    atrasoDaJanelaNaTela,
  );
  const semEntrando = await pagina.evaluate(() => {
    const tela = document.querySelector("#movimento-teste .sakura-tela");
    tela.removeAttribute("data-entrando");
    return getComputedStyle(document.getElementById("m-bloco-2")).animationName;
  });
  conferir("passados os 0,8 s da troca de tela, um bloco novo não repete a entrada", semEntrando === "none", semEntrando);
  await pagina.evaluate(() => document.querySelector("#movimento-teste .sakura-tela").setAttribute("data-entrando", ""));
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  const semMovimento = await animacoesDe();
  conferir(
    "com 'reduzir movimento' ligado, NENHUMA animação roda",
    IDS_DO_MOVIMENTO.every((id) => semMovimento[id] === "none"),
    JSON.stringify(semMovimento),
  );
  await pagina.emulateMedia({ reducedMotion: "no-preference" });
  await pagina.evaluate(() => document.getElementById("movimento-teste")?.remove());
  // --- A barra da janela (visual novo, #990, tarefa 6) --------------------
  // O Windows não desenha mais a faixa branca: a barra é do programa (faixa de
  // arrastar), e os três botões vêm por cima (`titleBarOverlay`). O que dá pra
  // provar aqui, no Linux: a janela nasce escura (sem piscar o rosa-claro), a
  // barra existe no topo e é "arrastável", o programa começa ABAIXO dela (nada
  // fica embaixo dos botões) e a cor da faixa dos botões acompanha o tema.
  // Arrastar, duplo clique, encaixe e os botões de verdade: só no Windows.
  const barra = await pagina.evaluate(() => {
    const faixa = document.querySelector('[data-testid="barra-da-janela"]');
    const raiz = document.getElementById("root");
    const caixa = faixa?.getBoundingClientRect();
    const caixaRaiz = raiz?.getBoundingClientRect();
    return {
      altura: window.sakuraApp?.barraDaJanela,
      existe: Boolean(faixa),
      topo: caixa?.top,
      alturaDaFaixa: caixa?.height,
      largura: caixa?.width,
      arrastar: faixa ? getComputedStyle(faixa).getPropertyValue("-webkit-app-region") : "",
      topoDoPrograma: caixaRaiz?.top,
      fundoDoPrograma: caixaRaiz ? caixaRaiz.bottom - window.innerHeight : null,
      larguraDaJanela: window.innerWidth,
    };
  });
  conferir("a janela sabe que a barra é do programa (40 px)", barra.altura === 40, `veio ${barra.altura}`);
  conferir(
    "a barra do programa está no topo, de ponta a ponta, com 40 px",
    barra.existe && barra.topo === 0 && barra.alturaDaFaixa === 40 && barra.largura === barra.larguraDaJanela,
    JSON.stringify(barra),
  );
  conferir("a barra é a faixa de arrastar da janela", barra.arrastar === "drag", `veio "${barra.arrastar}"`);
  conferir(
    "o programa começa abaixo da barra, sem passar do pé da janela",
    barra.topoDoPrograma === 40 && barra.fundoDoPrograma <= 0,
    JSON.stringify(barra),
  );
  const fundoDasJanelas = await pagina.evaluate(() => {
    const f = document.createElement("div");
    f.className = "sakura-modal-fundo";
    document.getElementById("root").appendChild(f);
    const topo = f.getBoundingClientRect().top;
    f.remove();
    return topo;
  });
  conferir(
    "o fundo das janelas (modais) começa abaixo da barra, não embaixo dos três botões",
    fundoDasJanelas === 40,
    `veio ${fundoDasJanelas}`,
  );
  const fundoDaJanela = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].getBackgroundColor(),
  );
  conferir(
    "a janela nasce no fundo escuro (não no rosa-claro do tema antigo)",
    fundoDaJanela.toUpperCase() === "#0A0A0D",
    `veio ${fundoDaJanela}`,
  );
  // A faixa dos três botões acompanha o tema: o `setTitleBarOverlay` é
  // trocado por um que anota o que recebeu.
  await app.evaluate(({ BrowserWindow }) => {
    const janela = BrowserWindow.getAllWindows()[0];
    globalThis.__faixasDosBotoes = [];
    janela.setTitleBarOverlay = (opcoes) => globalThis.__faixasDosBotoes.push(opcoes);
    globalThis.__iconesDaJanela = [];
    const setIconDeVerdade = janela.setIcon.bind(janela);
    janela.setIcon = (icone) => {
      globalThis.__iconesDaJanela.push(icone);
      setIconDeVerdade(icone);
    };
  });
  await pagina.evaluate(() => {
    window.sakuraApp.definirTemaDaJanela("claro");
    window.sakuraApp.definirTemaDaJanela("escuro");
    window.sakuraApp.definirTemaDaJanela("roxo"); // inválido: tem que ser ignorado
  });
  await pagina.waitForTimeout(400);
  const faixas = await app.evaluate(() => globalThis.__faixasDosBotoes);
  conferir(
    "a faixa dos três botões troca de cor com o tema (e ignora tema inválido)",
    faixas.length === 2 &&
      faixas[0].color.toUpperCase() === "#F3F2EF" &&
      faixas[0].symbolColor.toUpperCase() === "#1B1B1F" &&
      faixas[1].color.toUpperCase() === "#0A0A0D" &&
      faixas[0].height === 40,
    JSON.stringify(faixas),
  );
  // O ícone da janela troca junto (Sofia, 17/11/2026, #990), e o arquivo existe
  // de verdade: um caminho errado no setIcon não dá erro, só deixa a janela sem ícone.
  const icones = (await app.evaluate(() => globalThis.__iconesDaJanela)).map((c) => ({
    c,
    existe: fs.existsSync(c),
  }));
  conferir(
    "o ícone da janela troca com o tema (claro, depois escuro) e os arquivos existem",
    icones.length === 2 &&
      icones[0].c.endsWith("icone-janela-claro.png") &&
      icones[1].c.endsWith("icone-janela-escuro.png") &&
      icones.every((i) => i.existe),
    JSON.stringify(icones),
  );

  // --- 10. Modo demonstração: nada sai do computador (#384) ---------------
  //
  // A demonstração é o programa inteiro com dados inventados, pra mostrar o
  // sistema a quem ainda não é cliente. A promessa é: nada sai do computador
  // (nem pro Supabase, nem pra Focus NFe), a política de segurança é a mesma
  // de sempre e a conexão salva deste computador não muda. Teste de função
  // não prova isso: só o programa de verdade, clicado como uma pessoa clica,
  // com tudo que ele pede pra rede anotado.
  //
  // Fica no fim de propósito: entrar e sair da demonstração recarrega a
  // janela, e as checagens de cima precisam da janela como ela abriu.
  //
  // Com FOTOS_DEMO=<pasta> (só à mão, nunca no CI), salva as fotos da
  // demonstração pra descrição do PR. Os dados nelas são todos inventados.
  const pastaFotos = process.env.FOTOS_DEMO ? path.resolve(RAIZ, process.env.FOTOS_DEMO) : null;
  if (pastaFotos) fs.mkdirSync(pastaFotos, { recursive: true });
  const fotografar = async (nome) => {
    if (pastaFotos) await pagina.screenshot({ path: path.join(pastaFotos, nome) });
  };
  // Um passo feito na tela: deu certo, "ok"; não achou o que procurava, vira
  // FALHOU com o motivo, em vez de derrubar o teste inteiro sem mostrar as
  // outras checagens.
  const tentar = async (descricao, passo) => {
    try {
      await passo();
      conferir(descricao, true);
      return true;
    } catch (erro) {
      conferir(descricao, false, String(erro?.message ?? erro).split("\n")[0]);
      return false;
    }
  };
  const ESPERA = { timeout: 10_000 };

  const arquivoConexao = path.join(pastaDados, "conexao.json");
  const conexaoAntes = fs.existsSync(arquivoConexao) ? fs.readFileSync(arquivoConexao, "utf8") : null;

  // A CSP que o documento principal recebeu em cada carga, na ordem. O
  // Playwright enxerga o cabeçalho da página `file://` (o mesmo que o
  // `onHeadersReceived` do main.ts põe), então não precisa mexer nele —
  // registrar outro `onHeadersReceived` SUBSTITUIRIA o do programa.
  const cspPorCarga = [];
  const anotarCsp = (resposta) => {
    if (resposta.request().isNavigationRequest() && resposta.frame() === pagina.mainFrame()) {
      cspPorCarga.push(
        resposta.allHeaders().then((h) => h["content-security-policy"] ?? "(sem CSP)"),
      );
    }
  };
  pagina.on("response", anotarCsp);

  // Todo pedido de rede, por dois caminhos independentes:
  //   - pela tela (Playwright): o que a página pede, inclusive WebSocket;
  //   - pelo processo principal (`onBeforeRequest`): o que chega na pilha de
  //     rede vindo de qualquer lugar. O main.ts NÃO registra `onBeforeRequest`
  //     (só `onHeadersReceived`, que é outro evento), então este não tira o
  //     lugar de nada; e é desligado no fim.
  // E um terceiro sinal: pedido que a CSP barrou antes de sair nem chega na
  // rede (nenhum dos dois vê), mas deixa o recado "Refused to connect" no
  // console — e uma tentativa de sair também conta.
  let gravando = false;
  const pedidosDaTela = [];
  const anotarPedido = (pedido) => {
    if (gravando) pedidosDaTela.push(pedido.url());
  };
  const anotarWebSocket = (ws) => {
    if (gravando) pedidosDaTela.push(ws.url());
  };
  app.context().on("request", anotarPedido);
  pagina.on("websocket", anotarWebSocket);
  await app.evaluate(({ session }) => {
    globalThis.__pedidosDaDemonstracao = [];
    globalThis.__gravandoDemonstracao = false;
    session.defaultSession.webRequest.onBeforeRequest((detalhes, seguir) => {
      if (globalThis.__gravandoDemonstracao) globalThis.__pedidosDaDemonstracao.push(detalhes.url);
      seguir({});
    });
  });
  const ligarGravacao = async (ligado) => {
    gravando = ligado;
    await app.evaluate((_, valor) => {
      globalThis.__gravandoDemonstracao = valor;
    }, ligado);
  };
  let violacoesNoInicio = violacoes.length;
  let violacoesNoFim = violacoes.length;

  try {
    // Uma carga de antes da demonstração, pra ter a CSP de comparação (a
    // primeira abertura aconteceu antes de dar pra escutar).
    await pagina.reload();
    await pagina.waitForLoadState("domcontentloaded");

    const campoEndereco = pagina.getByPlaceholder("https://xxxxxxxx.supabase.co");
    const chegouNaConexao = await tentar("chega na tela de conexão", async () => {
      // Num computador que já tem banco salvo o programa abre no login, e a
      // tela de conexão é aberta pelo link dele, como uma pessoa faria.
      const linkDoLogin = pagina.getByRole("button", { name: "Configurar a conexão" });
      await campoEndereco.or(linkDoLogin).first().waitFor(ESPERA);
      if (!(await campoEndereco.isVisible())) {
        await linkDoLogin.click();
        await campoEndereco.waitFor(ESPERA);
      }
    });

    if (chegouNaConexao) {
      await campoEndereco.click();
      await pagina.keyboard.press("Control+A");
      await pagina.keyboard.type("demo");
      const botaoEntrar = pagina.getByRole("button", { name: "Entrar na demonstração" });
      const apareceuBotao = await tentar(
        'digitar "demo" no endereço troca o botão por "Entrar na demonstração"',
        () => botaoEntrar.waitFor(ESPERA),
      );
      await fotografar("conexao-demo.png");

      if (apareceuBotao) {
        // A partir daqui, tudo que sair é anotado.
        violacoesNoInicio = violacoes.length;
        await ligarGravacao(true);
        await botaoEntrar.click();

        const faixa = pagina.getByText("MODO DEMONSTRAÇÃO · nada aqui é de verdade");
        const titulo = pagina.getByRole("heading", { level: 1 });
        await tentar("a demonstração abre logada no Início, com a faixa no topo", async () => {
          await faixa.waitFor(ESPERA);
          await pagina.getByText("@demo", { exact: true }).waitFor(ESPERA);
          await titulo.filter({ hasText: "Início" }).waitFor(ESPERA);
        });
        // Dá tempo dos quadros do Início pedirem os dados deles.
        await pagina.waitForTimeout(1500);
        await fotografar("faixa-inicio.png");

        // Anda pelo menu, como uma pessoa. Cada tela pede os dados dela
        // pelo cliente do Supabase de verdade — é isso que tem de ficar em casa.
        const telasVisitadas = [];
        for (const [menu, foto] of [
          ["Clientes", null],
          ["Ordens de Serviço", "ordens-servico.png"],
          ["Caixa Diário", "caixa.png"],
          ["Estoque", null],
        ]) {
          try {
            await pagina.getByRole("link", { name: menu, exact: true }).click(ESPERA);
            await titulo.filter({ hasText: menu }).waitFor(ESPERA);
          } catch {
            continue;
          }
          telasVisitadas.push(menu);
          await pagina.waitForTimeout(1200);
          if (foto) await fotografar(foto);
        }
        conferir(
          "anda pelo menu: Clientes, Ordens de Serviço, Caixa Diário e Estoque",
          telasVisitadas.length === 4,
          `abriram: ${telasVisitadas.join(", ") || "nenhuma"}`,
        );

        // A loja da demonstração. Com uma loja só, o nome dela não aparece
        // no menu; aparece em Configurações (botão da engrenagem).
        await tentar('está na loja "Auto Center Modelo"', async () => {
          await pagina.getByRole("link", { name: "Configurações" }).click(ESPERA);
          await titulo.filter({ hasText: "Configurações" }).waitFor(ESPERA);
          await pagina.getByText("Auto Center Modelo").first().waitFor(ESPERA);
        });

        // A nota fiscal: abrir a OS 146 (concluída), Fechamento, "Emitir
        // NFC-e". O pedido à Focus NFe vai pelo porteiro (Edge Function
        // focus-nfe), e na demonstração ele tem de responder com o aviso, sem
        // sair. É o caminho de quem está apresentando: "Confirmar emissão",
        // pelo cliente de verdade.
        await tentar('pedir a nota na demonstração mostra "No modo demonstração não sai nota."', async () => {
          await pagina.getByRole("link", { name: "Ordens de Serviço", exact: true }).click(ESPERA);
          // Visual novo (#990, tarefa 7): o "Fechamento" de uma OS concluída
          // mora no menu "Mais ações" da linha.
          await pagina.getByRole("button", { name: "Mais ações — OS 146" }).click(ESPERA);
          await pagina.getByRole("menuitem", { name: "Fechamento" }).click(ESPERA);
          await pagina.getByRole("button", { name: "Emitir NFC-e" }).click(ESPERA);
          await pagina.getByRole("button", { name: "Confirmar emissão" }).click(ESPERA);
          await pagina.getByText("No modo demonstração não sai nota.").waitFor(ESPERA);
          await fotografar("nota-aviso.png");
        });
        await pagina
          .getByRole("button", { name: "Cancelar" })
          .last()
          .click({ timeout: 3000 })
          .catch(() => {});

        // Fim da gravação: o "Sair" recarrega a janela e, num computador com
        // banco salvo, o programa de verdade volta a falar com ele — isso não
        // é a demonstração.
        await pagina.waitForTimeout(800);
        await ligarGravacao(false);
        violacoesNoFim = violacoes.length;

        // A CSP continua valendo dentro da demonstração: endereço fora da
        // lista é recusado, e a política que o documento aplica é a mesma do
        // cabeçalho. (Fora da gravação: este pedido é do teste, não da tela.)
        const politicaAplicada = await pagina.evaluate(async () => {
          let politica = null;
          const anotar = (evento) => {
            politica = evento.originalPolicy;
          };
          document.addEventListener("securitypolicyviolation", anotar);
          try {
            await fetch("https://endereco-que-nao-deveria-passar.invalid/demo");
          } catch {
            // O que conta é a violação, não o erro daqui.
          }
          await new Promise((pronto) => setTimeout(pronto, 400));
          document.removeEventListener("securitypolicyviolation", anotar);
          return politica;
        });

        // Sair da demonstração, pelo botão da faixa.
        const saiu = await tentar('"Sair da demonstração" volta pra tela de antes', async () => {
          await pagina.getByRole("button", { name: "Sair da demonstração" }).click(ESPERA);
          await pagina.waitForLoadState("domcontentloaded");
          // Sem banco salvo, volta pra tela de conexão; com banco salvo, pro login.
          if (conexaoAntes === null) await campoEndereco.waitFor(ESPERA);
          else await pagina.getByRole("button", { name: "Configurar a conexão" }).waitFor(ESPERA);
        });
        if (saiu) {
          await pagina.waitForTimeout(500);
          conferir("depois de sair, a faixa da demonstração some", !(await faixa.isVisible()));
        }

        // --- As contas ---
        const pedidosDoPrincipal = await app.evaluate(() => globalThis.__pedidosDaDemonstracao);
        const pegouAlgo = (lista) => lista.some((url) => url.startsWith("file:"));
        conferir(
          "o gravador de pedidos estava ligado (viu a tela carregar os arquivos dela)",
          pegouAlgo(pedidosDaTela) && pegouAlgo(pedidosDoPrincipal),
          `tela: ${pedidosDaTela.length} pedidos, processo principal: ${pedidosDoPrincipal.length}`,
        );
        const barradosPelaCsp = violacoes
          .slice(violacoesNoInicio, violacoesNoFim)
          .filter((v) => /connect-src|Refused to connect/i.test(v))
          // O Chromium dá dois recados por pedido barrado: fica só o endereço.
          .map((v) => `(barrado pela CSP) ${v.match(/(?:https?|wss?):\/\/[^\s'"]+/)?.[0]?.replace(/\.$/, "") ?? v}`);
        const LOCAL = /^(file|data|blob|chrome-extension|devtools|about):/i;
        const saidas = [
          ...new Set([
            ...[...pedidosDaTela, ...pedidosDoPrincipal].filter((url) => !LOCAL.test(url)),
            ...barradosPelaCsp,
          ]),
        ];
        const listar = (lista) => (lista.length ? lista.slice(0, 12).join(" | ") : "");
        const praSupabase = saidas.filter((url) => /\.supabase\.(co|in)\b/i.test(url));
        const praFocus = saidas.filter((url) => /focusnfe/i.test(url));
        const praDemo = saidas.filter((url) => /demonstracao\.invalid/i.test(url));
        conferir("na demonstração, nenhum pedido sai pro Supabase", praSupabase.length === 0, listar(praSupabase));
        conferir("na demonstração, nenhum pedido sai pra Focus NFe", praFocus.length === 0, listar(praFocus));
        conferir(
          "na demonstração, o endereço de mentira (demonstracao.invalid) nunca vai pra rede",
          praDemo.length === 0,
          listar(praDemo),
        );
        conferir(
          "na demonstração, nada sai do computador (nem tentativa barrada pela CSP)",
          saidas.length === 0,
          listar(saidas),
        );

        const [cspAntes, cspNaDemo, cspDepois] = await Promise.all(cspPorCarga);
        conferir(
          "a CSP da demonstração é a mesma de antes, e continua a mesma depois de sair",
          cspPorCarga.length >= 3 &&
            !!cspAntes &&
            cspAntes !== "(sem CSP)" &&
            cspNaDemo === cspAntes &&
            cspDepois === cspAntes,
          `${cspPorCarga.length} cargas; antes: ${cspAntes}; na demonstração: ${cspNaDemo}; depois: ${cspDepois}`,
        );
        conferir(
          "dentro da demonstração a CSP está valendo (recusa endereço fora da lista)",
          politicaAplicada === cspAntes,
          `política aplicada: ${politicaAplicada}`,
        );
      }
    }

    const conexaoDepois = fs.existsSync(arquivoConexao) ? fs.readFileSync(arquivoConexao, "utf8") : null;
    conferir(
      "a demonstração não mexe no conexao.json deste computador",
      conexaoDepois === conexaoAntes,
      `antes: ${conexaoAntes === null ? "não existia" : "existia"}; depois: ${conexaoDepois === null ? "não existe" : "existe, com outro conteúdo"}`,
    );
  } finally {
    // Devolve tudo como estava.
    await ligarGravacao(false).catch(() => {});
    await app
      .evaluate(({ session }) => session.defaultSession.webRequest.onBeforeRequest(null))
      .catch(() => {});
    app.context().off("request", anotarPedido);
    pagina.off("websocket", anotarWebSocket);
    pagina.off("response", anotarCsp);
    await pagina
      .evaluate(() => sessionStorage.removeItem("sakura_modo_demonstracao"))
      .catch(() => {});
    if (conexaoAntes === null) fs.rmSync(arquivoConexao, { force: true });
    else fs.writeFileSync(arquivoConexao, conexaoAntes);
  }
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

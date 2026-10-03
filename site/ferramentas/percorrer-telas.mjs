import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { instalarBancoFalso } from "./banco-falso.mjs";
import { carregarChromium } from "./playwright.mjs";
import { CENAS } from "./cenas.mjs";
import { TABELAS } from "./dados-demo.mjs";

// Abre o app de verdade num navegador, com o Supabase respondido por dados
// inventados, e visita as 54 telas — parando em cada uma pra quem chamou
// fazer o que quiser com ela (fotografar, medir contraste, o que vier).
//
// Existe porque dois programas precisam exatamente do mesmo passeio: o
// gerador de imagens do catálogo e a varredura de contraste no DOM. O que
// muda entre eles é só o que se faz ao CHEGAR em cada tela.
//
// PRECISA de um arquivo .env na raiz do repositório, mesmo com valores
// inventados — e a URL não pode ser qualquer invenção:
//
//   VITE_SUPABASE_URL=https://demo.supabase.co
//   VITE_SUPABASE_ANON_KEY=chave-de-mentira
//
// Sem .env, o app abre na tela de CONEXÃO em vez do login e todas as cenas
// falham no botão de entrar. Com outro hostname, o login vaza pra rede de
// verdade e 36 das 54 falham por timeout, com um erro de console
// ("ERR_TUNNEL_CONNECTION_FAILED") que não sugere a causa em nada.
// (PROJETO_STATUS.md, seção 6, itens 53 e 56.)

export const BASE = "http://localhost:5199";

// Quanto esperar por um botão antes de desistir.
//
// Eram 8s, e isso dava um resultado que enganava: rodando com o servidor JÁ
// aquecido de uma rodada anterior, as 54 telas passavam; rodando a frio —
// que é como o CI sempre roda — tudo a partir da oitava cena estourava o
// tempo, porque o servidor de desenvolvimento compila cada tela na PRIMEIRA
// visita, e as telas de formulário puxam um punhado de módulos de uma vez.
// O sintoma era um timeout que não sugere a causa em nada, e que parecia
// botão sumido.
//
// 30s é folga pra caber a compilação. Não deixa nada mais lento quando está
// tudo certo: é teto, não espera.
const ESPERA_POR_BOTAO = 30_000;

/**
 * @param {(cena: object, pagina: object) => Promise<void>} aoChegar
 *        Chamado com a tela já montada. Uma exceção aqui conta como falha
 *        daquela cena e não derruba o passeio inteiro.
 * @param {(cena: object) => boolean} [incluir]
 *        Pra visitar só algumas cenas (ex.: fotografar a tela que mudou, sem
 *        esperar o passeio inteiro). Sem ele, visita todas.
 */
export async function percorrerTelas(aoChegar, incluir = () => true) {
  const cenas = CENAS.filter(incluir);
  const chromium = await carregarChromium();
  const navegador = await chromium.launch({
    args: ["--lang=pt-BR"],
    env: { ...process.env, LANG: "pt_BR.UTF-8", LANGUAGE: "pt_BR" },
  });
  const contexto = await navegador.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });

  await instalarBancoFalso(contexto);

  const pagina = await contexto.newPage();
  const errosDeConsole = [];
  pagina.on("console", (m) => {
    if (m.type() === "error") errosDeConsole.push(m.text().slice(0, 200));
  });

  async function entrar() {
    await pagina.goto(BASE, { waitUntil: "networkidle" });
    await pagina.fill('input[type="text"], input:not([type="password"]):visible', "demo");
    await pagina.fill('input[type="password"]', "demo1234");
    await pagina.click('button[type="submit"]');
    await pagina.waitForTimeout(2500);
    return (await pagina.locator("aside").count()) > 0;
  }

  async function sair() {
    await pagina.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await pagina.goto(BASE, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(1200);
  }

  // Navegar pro mesmo endereço duas vezes seguidas não remonta a tela (muda
  // só o "#"), e aí o formulário aberto na cena anterior continua aberto.
  // Passar por uma rota neutra antes resolve.
  async function abrirRota(rota) {
    await pagina.goto(`${BASE}/#/rota-neutra-para-remontar`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(250);
    await pagina.goto(`${BASE}/#${rota}`, { waitUntil: "networkidle" });
  }

  async function executarPasso(passo) {
    if (passo.esperar) return pagina.waitForTimeout(passo.esperar);
    if (passo.rolar) {
      await pagina.mouse.move(800, 500);
      await pagina.mouse.wheel(0, passo.rolar);
      return pagina.waitForTimeout(600);
    }
    if (passo.secao) {
      // O botão das seções recolhíveis carrega o título E a descrição, então
      // não casa por texto exato — precisa casar por trecho.
      const secao = pagina.locator("button").filter({ hasText: passo.secao }).first();
      await secao.waitFor({ state: "visible", timeout: ESPERA_POR_BOTAO });
      await secao.click();
      return pagina.waitForTimeout(900);
    }
    if (passo.digitar !== undefined) {
      // Escrever num campo (ex: o código de barras na venda de balcão).
      // `enter: true` aperta Enter depois, como o leitor faz.
      const campo = pagina.locator(passo.em).first();
      await campo.waitFor({ state: "visible", timeout: ESPERA_POR_BOTAO });
      await campo.fill(passo.digitar);
      if (passo.enter) await campo.press("Enter");
      return pagina.waitForTimeout(700);
    }
    if (passo.seletor) {
      // Botão sem texto (ícone), como o "⋯" de ações da linha — não dá pra
      // casar por rótulo, só por seletor.
      const porSeletor = pagina.locator(passo.seletor).first();
      await porSeletor.waitFor({ state: "visible", timeout: ESPERA_POR_BOTAO });
      await porSeletor.click();
      return pagina.waitForTimeout(900);
    }
    const texto = passo.clicar ?? passo.aba;
    const alvo = pagina
      .locator("button, a")
      .filter({ hasText: new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) })
      .first();
    await alvo.waitFor({ state: "visible", timeout: ESPERA_POR_BOTAO });
    await alvo.click();
    await pagina.waitForTimeout(1100);
  }

  const feitas = [];
  const falhas = [];

  // Uma cena que falha vira só "TimeoutError: esperei por um botão" — o que
  // não diz NADA sobre o que estava na tela naquele instante (era a tela
  // errada? o app não carregou? o botão mudou de nome?). Guardar a imagem
  // custa nada e é a diferença entre investigar e adivinhar.
  const PASTA_FALHAS = join(tmpdir(), "sakura-telas-que-falharam");
  async function fotografarFalha(cena) {
    try {
      mkdirSync(PASTA_FALHAS, { recursive: true });
      await pagina.screenshot({ path: join(PASTA_FALHAS, `${cena.arquivo}.png`) });
    } catch {
      // Se nem a foto sai, a falha original continua sendo o que importa.
    }
  }

  /**
   * O app voltou pra tela de login no meio do passeio?
   *
   * Acontece: a sessão do Supabase de mentira cai de vez em quando, e daí em
   * diante TODA cena com clique falha — não porque o botão sumiu, mas porque
   * a tela por trás é a de login. O sintoma é um `TimeoutError` esperando por
   * um botão, que não sugere isso em nada; só ficou claro olhando a imagem da
   * tela que falhou. Entrar de novo custa 3 segundos e evita 40 falhas
   * falsas.
   */
  async function precisouEntrarDeNovo() {
    if ((await pagina.locator("aside").count()) > 0) return false;
    console.log("    (a sessão caiu — entrando de novo)");
    await entrar();
    return true;
  }

  async function visitar(cena, esperaExtra) {
    try {
      await abrirRota(cena.rota);
      await pagina.waitForTimeout(esperaExtra);
      if (!cena.deslogado && !cena.trocarSenha && (await precisouEntrarDeNovo())) {
        await abrirRota(cena.rota);
        await pagina.waitForTimeout(esperaExtra);
      }
      for (const passo of cena.passos ?? []) await executarPasso(passo);
      await pagina.waitForTimeout(700);
      await aoChegar(cena, pagina);
      feitas.push(cena);
      console.log(`  ✓ ${cena.arquivo} — ${cena.titulo}`);
    } catch (err) {
      falhas.push([cena.arquivo, String(err).split("\n")[0]]);
      console.log(`  ✗ ${cena.arquivo} — ${String(err).split("\n")[0]}`);
      await fotografarFalha(cena);
    }
  }

  // As telas de antes do login primeiro, pra não precisar deslogar no meio.
  await pagina.goto(BASE, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(1200);
  for (const cena of cenas.filter((c) => c.deslogado)) await visitar(cena, 1200);

  console.log((await entrar()) ? "login simulado: OK" : "login simulado: FALHOU");

  for (const cena of cenas.filter((c) => !c.deslogado && !c.trocarSenha)) {
    await visitar(cena, 1600);
  }

  // A tela de troca de senha obrigatória só aparece pra um operador marcado
  // como "precisa trocar a senha" — então essa resposta é trocada só no fim.
  const cenaSenha = cenas.find((c) => c.trocarSenha);
  if (cenaSenha) {
    try {
      await contexto.route("**demo.supabase.co/rest/v1/operadores**", async (rota) => {
        let linhas = TABELAS.operadores.map((o) =>
          o.usuario === "demo" ? { ...o, deve_trocar_senha: true } : o,
        );
        const filtroId = new URL(rota.request().url()).searchParams.get("id");
        if (filtroId?.startsWith("eq.")) {
          linhas = linhas.filter((o) => o.id === filtroId.slice(3));
        }
        const querObjeto = (rota.request().headers()["accept"] || "").includes("vnd.pgrst.object");
        await rota.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(querObjeto ? linhas[0] : linhas),
        });
      });
      await sair();
      await entrar();
      await pagina.waitForTimeout(1200);
      await aoChegar(cenaSenha, pagina);
      feitas.push(cenaSenha);
      console.log(`  ✓ ${cenaSenha.arquivo} — ${cenaSenha.titulo}`);
    } catch (err) {
      falhas.push([cenaSenha.arquivo, String(err).split("\n")[0]]);
      console.log(`  ✗ ${cenaSenha.arquivo} — ${String(err).split("\n")[0]}`);
      await fotografarFalha(cenaSenha);
    }
  }

  if (falhas.length > 0) {
    console.log(`\nImagens das telas que falharam: ${PASTA_FALHAS}`);
  }

  await navegador.close();
  return { feitas, falhas, errosDeConsole };
}

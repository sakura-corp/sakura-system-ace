// Grava vídeos curtos do movimento (tarefa 5 do visual novo, #990), nos dois
// temas, pra quem não está no computador ver como fica (movimento não aparece
// em foto). Roda o programa de verdade com o Supabase de mentira (como as
// varreduras de telas).
//
//   node docs/referencia/visual-novo/gravar-movimento.mjs <pasta>
//
// Sai um .webm por tema: Início abrindo (número contando, fio desenhando),
// trocar de tela várias vezes e abrir uma janela. Sobe o servidor das
// varreduras (porta 5199): não rodar junto com elas.
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { instalarBancoFalso } from "../../../site/ferramentas/banco-falso.mjs";
import { carregarChromium } from "../../../site/ferramentas/playwright.mjs";
import { BASE } from "../../../site/ferramentas/percorrer-telas.mjs";
import { comServidorDeTelas } from "../../../site/ferramentas/servidor-telas.mjs";

const pasta = process.argv[2];
if (!pasta) {
  console.error("Diga a pasta dos vídeos.");
  process.exit(1);
}
mkdirSync(pasta, { recursive: true });

async function gravar(chromium, tema) {
  const temporaria = join(pasta, `_${tema}`);
  const navegador = await chromium.launch({ args: ["--lang=pt-BR"] });
  const contexto = await navegador.newContext({
    viewport: { width: 1366, height: 768 },
    recordVideo: { dir: temporaria, size: { width: 960, height: 540 } },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  await instalarBancoFalso(contexto);
  await contexto.addInitScript((t) => window.localStorage.setItem("sakura.tema", t), tema);
  await contexto.clock.setFixedTime(new Date("2026-11-14T15:00:00-03:00"));
  const pagina = await contexto.newPage();

  // Entrar (não faz parte do vídeo que importa: a gravação começa no Início).
  await pagina.goto(BASE, { waitUntil: "networkidle" });
  await pagina.fill('input[type="text"], input:not([type="password"]):visible', "demo");
  await pagina.fill('input[type="password"]', "demo1234");
  await pagina.click('button[type="submit"]');
  await pagina.waitForSelector("aside", { timeout: 30_000 });
  await pagina.waitForTimeout(2500);

  // 1. Início abrindo de novo: número contando e fio desenhando.
  await pagina.goto(`${BASE}/#/rota-neutra`, { waitUntil: "networkidle" });
  await pagina.waitForTimeout(400);
  await pagina.evaluate(() => (window.location.hash = "#/"));
  await pagina.waitForTimeout(1800);

  // 2. Trocar de tela: os blocos sobem, um depois do outro.
  for (const nome of ["Clientes", "Ordens de Serviço", "Estoque", "Início"]) {
    await pagina.locator("aside").getByText(nome, { exact: true }).first().click();
    await pagina.waitForTimeout(1000);
  }

  // 3. Abrir uma janela: o primeiro botão "Novo..." de Clientes, se houver.
  await pagina.locator("aside").getByText("Clientes", { exact: true }).first().click();
  await pagina.waitForTimeout(900);
  const novo = pagina.locator("main button").filter({ hasText: /^(\+ )?Novo|Nova|Cadastrar/ }).first();
  if (await novo.count()) {
    await novo.click();
    await pagina.waitForTimeout(1200);
    await pagina.keyboard.press("Escape");
    await pagina.waitForTimeout(500);
  }

  await contexto.close();
  await navegador.close();
  const gravado = readdirSync(temporaria).find((f) => f.endsWith(".webm"));
  renameSync(join(temporaria, gravado), join(pasta, `movimento-${tema}.webm`));
  rmSync(temporaria, { recursive: true, force: true });
}

process.exit(
  await comServidorDeTelas(async () => {
    const chromium = await carregarChromium();
    for (const tema of ["escuro", "claro"]) await gravar(chromium, tema);
    return 0;
  }),
);

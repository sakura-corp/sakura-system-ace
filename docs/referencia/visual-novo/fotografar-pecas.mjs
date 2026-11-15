// Fotografa a mostra das peças do visual novo (pecas.html) e confere o
// contraste de cada texto dela, com a mesma medida do `npm run contraste:telas`.
//
// Rodar da RAIZ do repositório:
//   node docs/referencia/visual-novo/fotografar-pecas.mjs [pasta-de-saida]
//
// Sem a pasta, as fotos vão pra docs/referencia/visual-novo/andamento/2-pecas/.
// Sobe o mesmo servidor das varreduras de telas (porta 5199): não rodar junto
// com `contraste:telas` nem `largura:telas`.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { carregarChromium } from "../../../site/ferramentas/playwright.mjs";
import { BASE } from "../../../site/ferramentas/percorrer-telas.mjs";
import { comServidorDeTelas } from "../../../site/ferramentas/servidor-telas.mjs";
import { MEDIR_CONTRASTE } from "../../../scripts/medir-contraste.mjs";

const pasta = process.argv[2] ?? "docs/referencia/visual-novo/andamento/2-pecas";
mkdirSync(pasta, { recursive: true });

process.exit(
  await comServidorDeTelas(async () => {
    const chromium = await carregarChromium();
    const navegador = await chromium.launch();
    const pagina = await navegador.newPage({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
      locale: "pt-BR",
    });
    const erros = [];
    pagina.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 300)));
    pagina.on("pageerror", (e) => erros.push(String(e).slice(0, 300)));

    await pagina.goto(`${BASE}/docs/referencia/visual-novo/pecas.html`, { waitUntil: "networkidle" });
    await pagina.waitForSelector("h1");
    await pagina.evaluate(() => document.fonts.ready);

    let achados = await pagina.evaluate(MEDIR_CONTRASTE);
    await pagina.screenshot({ path: join(pasta, "pecas.png"), fullPage: true });

    // O campo com o foco (a borda laranja e o anel).
    await pagina.locator("input.sakura-campo").first().focus();
    await pagina.locator("section", { hasText: "Campo, select" }).screenshot({ path: join(pasta, "campo-com-foco.png") });

    // A dica, pelo teclado.
    await pagina.getByRole("button", { name: "RTA-4B71" }).focus();
    await pagina.waitForSelector('[role="tooltip"]');
    await pagina.locator("section", { hasText: "Tabela, com a placa" }).screenshot({ path: join(pasta, "tabela-com-a-dica.png") });

    // A janela, e o aviso que some depois de confirmar.
    await pagina.getByRole("button", { name: "Abrir a janela de faturar" }).click();
    await pagina.waitForSelector('[role="dialog"]');
    await pagina.evaluate(() => window.scrollTo(0, 0));
    achados = achados.concat(await pagina.evaluate(MEDIR_CONTRASTE));
    await pagina.screenshot({ path: join(pasta, "janela.png") });
    await pagina.getByRole("button", { name: "Confirmar o faturamento" }).click();
    await pagina.waitForSelector('[role="status"] >> text=OS 147 faturada');
    achados = achados.concat(await pagina.evaluate(MEDIR_CONTRASTE));
    await pagina.screenshot({ path: join(pasta, "aviso-que-some.png") });

    await navegador.close();

    if (erros.length) console.log("ERROS NO CONSOLE:\n" + [...new Set(erros)].join("\n"));
    const unicos = new Map(achados.map((a) => [`${a.tipo}|${a.caminho}|${a.frente}|${a.fundo}`, a]));
    if (unicos.size === 0) {
      console.log("Contraste: nenhum texto ou contorno abaixo do mínimo na mostra das peças.");
    } else {
      console.log(`Contraste: ${unicos.size} achado(s) na mostra das peças:`);
      for (const a of unicos.values()) console.log(JSON.stringify(a));
    }
    return erros.length || unicos.size ? 1 : 0;
  }),
);

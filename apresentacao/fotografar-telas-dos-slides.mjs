// Tira as fotos das telas usadas na apresentação comercial em slides e gera o
// PDF (apresentacao/apresentacao.pdf) a partir de apresentacao/apresentacao.html.
// As fotos são só a área principal (sem o menu lateral), com o recorte de cada
// uma. Os dados são os inventados de site/ferramentas/dados-demo.mjs (a loja
// "Auto Center Modelo"), então nenhuma foto mostra cliente de verdade.
//
// Uso (a partir da raiz do repositório, com o .env de mentira que o
// percorrer-telas.mjs pede e o vite das ferramentas já no ar):
//   npx vite --config site/ferramentas/vite.telas.config.ts
//   node apresentacao/fotografar-telas-dos-slides.mjs
//
// Só refazer o PDF, sem fotografar de novo (não precisa do vite):
//   node apresentacao/fotografar-telas-dos-slides.mjs --so-pdf
//
// O WhatsApp do slide 14 não fica neste repositório, que é público. Pra gerar
// o PDF que vai pro cliente, com o número:
//   WHATSAPP="(00) 00000-0000" node apresentacao/fotografar-telas-dos-slides.mjs --so-pdf
// Esse PDF sai FORA do repositório (na pasta do usuário), pra não ser
// commitado por engano.
//
// As datas da loja de exemplo andam com o relógio: fotografar na véspera ou
// no dia de mandar.
//
// Três telas recebem ajuste antes da foto:
// - Início: o aviso da alíquota da prefeitura é tirado da tela. Na loja ele
//   some sozinho depois de "Já cadastrei"; o banco de mentira não guarda essa
//   confirmação.
// - Faturamento: o pagamento é dividido entre Pix e cartão em 3x, pra mostrar
//   o parcelamento com juros só na parte do cartão.
// - Comissões: o recorte começa no segundo aviso. O cartão "Lucro do período"
//   fica de fora porque a coluna "Lucro gerado" soma o lucro de uma OS pro
//   vendedor e pro técnico, e os dois números não batem (item 15 de
//   apresentacao/o-que-falta-pra-apresentar.md).
//
// Duas pegadinhas dos dados de exemplo (PROJETO_STATUS.md, marco de 25/09/2026):
// o banco de mentira não filtra as notas fiscais por OS, então o recorte do
// Fechamento para antes da linha de "Ver DANFE" repetida; e o Caixa Diário de
// hoje sai com lucro igual à venda, por isso ele não está na lista. A
// Lucratividade também ficou de fora: a receita dela não bate com as vendas do
// Início (item 3 do mesmo arquivo), e o slide 9 usa a foto do Início.
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { percorrerTelas } from "../site/ferramentas/percorrer-telas.mjs";
import { carregarChromium } from "../site/ferramentas/playwright.mjs";

const PASTA = fileURLToPath(new URL(".", import.meta.url));
const FOTOS = join(PASTA, "fotos");
const soPdf = process.argv.includes("--so-pdf");

// Tela → ajuste antes da foto (null = nenhum).
const QUERO = {
  "04-inicio": async (p) => {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find(
        (x) => x.textContent.trim() === "Já cadastrei",
      );
      b?.closest("div.bg-amber-50")?.remove();
    });
    await p.waitForTimeout(600);
  },
  "06b-ficha-veiculo": null,
  "07-ordens": null,
  "09-os-faturamento": async (p) => {
    await p.getByText("Dividir em mais de uma forma de pagamento").click();
    await p.waitForTimeout(600);
    const valores = p.locator('input[type="number"]:visible');
    await valores.nth(0).fill("400");
    await valores.nth(1).fill("499.8");
    await p.locator("select:visible").nth(3).selectOption({ index: 2 });
    await p.waitForTimeout(800);
  },
  "10-os-fechamento": null,
  "11-estoque-produtos": null,
  "33-contas-receber": null,
  "46-comissoes": null,
};

// Tela → [topo, altura, largura] do recorte, dentro da área principal (até
// 1312px de largura; sem largura, a área inteira). Ordens sai só com a tabela,
// até a coluna Lucro, pra foto ficar maior no slide sem cortar botão no meio.
const RECORTE = {
  "04-inicio": [0, 755],
  "06b-ficha-veiculo": [0, 300],
  "07-ordens": [255, 455, 985],
  "09-os-faturamento": [96, 505],
  "10-os-fechamento": [96, 715],
  "11-estoque-produtos": [0, 610],
  "33-contas-receber": [0, 580],
  "46-comissoes": [430, 390],
};

if (!soPdf) {
  mkdirSync(FOTOS, { recursive: true });
  const { falhas } = await percorrerTelas(
    async (cena, pagina) => {
      const ajuste = QUERO[cena.arquivo];
      if (ajuste) await ajuste(pagina);
      const [y, altura, largura = 1312] = RECORTE[cena.arquivo];
      await pagina.screenshot({
        path: join(FOTOS, `${cena.arquivo}.png`),
        clip: { x: 288, y, width: largura, height: altura },
      });
    },
    (cena) => cena.arquivo in QUERO,
  );
  console.log(`\nFotos dos slides em ${FOTOS}`);
  if (falhas.length) {
    console.log("falharam:", falhas.map(([a]) => a).join(", "));
    process.exit(1);
  }
}

// O PDF: um slide por página, 16:9 (o tamanho vem do @page do HTML).
const whatsapp = process.env.WHATSAPP?.trim();
const destino = whatsapp
  ? join(homedir(), "apresentacao-sakura-system.pdf")
  : join(PASTA, "apresentacao.pdf");

const chromium = await carregarChromium();
const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.goto(pathToFileURL(join(PASTA, "apresentacao.html")).href, { waitUntil: "load" });
await pagina.evaluate(() => document.fonts.ready);
if (whatsapp) {
  await pagina.evaluate((numero) => {
    document.querySelectorAll("[data-whatsapp]").forEach((e) => (e.textContent = numero));
  }, whatsapp);
}
await pagina.pdf({ path: destino, preferCSSPageSize: true, printBackground: true });
await navegador.close();
console.log(`PDF em ${destino}`);

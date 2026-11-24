// Fotos da tarefa #1087 (peças e serviços na OS), em 1024 e 1600 de janela,
// com o banco de mentira do catálogo. Roda com:
//   node scripts/fotos-tarefa-1087.mjs [pasta-de-saida]
// Saem em docs/relatorios/tarefa-1087/ (ou na pasta pedida).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { percorrerTelas } from "../site/ferramentas/percorrer-telas.mjs";
import { comServidorDeTelas } from "../site/ferramentas/servidor-telas.mjs";

const SAIDA = process.argv[2] ?? "docs/relatorios/tarefa-1087";
const LARGURAS = [1024, 1600];
const QUERO = new Set(["08-os-form", "08b-os-itens", "08c-os-aberta", "10b-venda-balcao", "10g-orcamento-form"]);

mkdirSync(SAIDA, { recursive: true });

const codigo = await comServidorDeTelas(async () => {
  let falhas = 0;
  await percorrerTelas(
    async (cena, pagina) => {
      for (const largura of LARGURAS) {
        await pagina.setViewportSize({ width: largura, height: 800 });
        await pagina.waitForTimeout(600);
        const arquivo = join(SAIDA, `${cena.arquivo}-${largura}.png`);
        await pagina.screenshot({ path: arquivo, fullPage: false });
        console.log("foto:", arquivo);
      }
      await pagina.setViewportSize({ width: 1600, height: 1000 });
    },
    (cena) => QUERO.has(cena.arquivo),
  ).catch((err) => {
    falhas++;
    console.error(err);
  });
  return falhas ? 1 : 0;
});
process.exit(codigo);

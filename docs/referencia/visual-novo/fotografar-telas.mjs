// Fotografa algumas telas do programa de verdade NOS DOIS TEMAS (escuro e
// claro), lado a lado na mesma pasta, e mede o contraste de cada uma com a
// mesma medida do `npm run contraste:telas`.
//
// Rodar da RAIZ do repositório:
//   node docs/referencia/visual-novo/fotografar-telas.mjs <pasta> [prefixos]
//
// `prefixos` são os começos dos nomes das cenas (site/ferramentas/cenas.mjs),
// separados por vírgula. Sem eles: Login, Início, Clientes, OS e Configurações.
//   node docs/referencia/visual-novo/fotografar-telas.mjs docs/referencia/visual-novo/andamento/3-tema-claro 04,07
//
// Sobe o servidor das varreduras de telas (porta 5199): não rodar junto com
// `contraste:telas` nem `largura:telas`.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { percorrerTelas } from "../../../site/ferramentas/percorrer-telas.mjs";
import { comServidorDeTelas } from "../../../site/ferramentas/servidor-telas.mjs";
import { MEDIR_CONTRASTE } from "../../../scripts/medir-contraste.mjs";
import { ehDividaConhecida } from "../../../scripts/divida-de-contraste.mjs";

const pasta = process.argv[2];
if (!pasta) {
  console.error("Diga a pasta das fotos.");
  process.exit(1);
}
const prefixos = (process.argv[3] ?? "01,04,05,07,47").split(",");
mkdirSync(pasta, { recursive: true });

process.exit(
  await comServidorDeTelas(async () => {
    const achados = new Map();
    let falharam = 0;
    for (const tema of ["escuro", "claro"]) {
      const { falhas } = await percorrerTelas(
        async (cena, pagina) => {
          await pagina.screenshot({
            path: join(pasta, `${cena.arquivo}-${tema}.jpg`),
            type: "jpeg",
            quality: 82,
          });
          for (const a of await pagina.evaluate(MEDIR_CONTRASTE)) {
            if (ehDividaConhecida({ ...a, tema })) continue;
            achados.set(`${tema}|${a.tipo}|${a.frente}|${a.fundo}|${a.amostra}`, { tema, tela: cena.titulo, ...a });
          }
        },
        (cena) => prefixos.some((p) => cena.arquivo.startsWith(p)),
        // O relógio parado, pra as duas rodadas desenharem o mesmo "hoje".
        { tema, horaFixa: new Date("2026-11-14T15:00:00-03:00") },
      );
      falharam += falhas.length;
    }
    if (achados.size === 0) {
      console.log("Contraste: nada abaixo do mínimo nas telas fotografadas, nos dois temas.");
    } else {
      console.log(`Contraste: ${achados.size} achado(s):`);
      for (const a of achados.values()) {
        console.log(`  [${a.tema}] ${a.medido}:1 (mínimo ${a.minimo}) ${a.frente} sobre ${a.fundo} — ${JSON.stringify(a.amostra)} em ${a.tela}`);
      }
    }
    return achados.size || falharam ? 1 : 0;
  }),
);

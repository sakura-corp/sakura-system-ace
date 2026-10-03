import { mkdirSync, writeFileSync } from "node:fs";
import { tabelasSemDados } from "./banco-falso.mjs";
import { percorrerTelas } from "./percorrer-telas.mjs";

// Tira uma imagem de TODAS as telas do sistema — inclusive formulários, abas
// e janelas (modais) que só aparecem depois de clicar em alguma coisa. Roda o
// app DE VERDADE num navegador, com o Supabase respondido por dados-demo.mjs,
// então nada toca o banco de loja nenhuma.
//
// Uso (a partir da raiz do repositório, com o vite já rodando):
//   npx vite --config site/ferramentas/vite.telas.config.ts
//   node site/ferramentas/gerar-catalogo-telas.mjs <pasta-de-saida> [cenas]
//
// `cenas` é opcional: nomes de cena separados por vírgula (os de cenas.mjs,
// ex.: "07-ordens,42-cancelar-nota"), pra fotografar só as telas que mudaram
// em vez de esperar o passeio inteiro.
//
// Quem abre o navegador, faz login e caminha pelas telas é o
// percorrer-telas.mjs — inclusive o que é preciso ter no .env da raiz. A
// lista de telas está em cenas.mjs.
//
// Além dos .jpg, escreve um catalogo.json com o título e a explicação de cada
// tela — é o que o documento em PDF usa pra montar as legendas.

const SAIDA = process.argv[2] || "/tmp/telas-catalogo";
const SO_ESTAS = process.argv[3] ? process.argv[3].split(",") : null;
mkdirSync(SAIDA, { recursive: true });

const { feitas, falhas, errosDeConsole } = await percorrerTelas(
  async (cena, pagina) => {
    await pagina.screenshot({ path: `${SAIDA}/${cena.arquivo}.jpg`, type: "jpeg", quality: 80 });
  },
  (cena) => !SO_ESTAS || SO_ESTAS.includes(cena.arquivo),
);

feitas.sort((a, b) => a.arquivo.localeCompare(b.arquivo));
writeFileSync(
  `${SAIDA}/catalogo.json`,
  JSON.stringify(
    feitas.map(({ arquivo, modulo, titulo, descricao }) => ({
      arquivo: `${arquivo}.jpg`,
      modulo,
      titulo,
      descricao,
    })),
    null,
    2,
  ),
);

console.log(`\n${feitas.length} telas geradas em ${SAIDA}`);
if (falhas.length) console.log("falharam:", falhas.map(([a]) => a).join(", "));
const semDados = tabelasSemDados();
if (semDados.size) console.log("tabelas sem dado de demonstração:", [...semDados].join(", "));
if (errosDeConsole.length) {
  console.log("erros de console (primeiros 5):");
  [...new Set(errosDeConsole)].slice(0, 5).forEach((e) => console.log("  ", e));
}

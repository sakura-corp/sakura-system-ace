// Varredura de contraste: procura, em cada string de className do app,
// combinações de fundo + cor de texto que deixariam o texto ilegível.
// Não substitui olhar a tela — só aponta os candidatos pra revisão humana.
//
// Rodar com: npm run contraste
//
// Existe por causa de um tipo de bug que já apareceu três vezes (ver itens 10,
// 17 e a varredura desta sessão no PROJETO_STATUS.md, seção 6): sobra de
// layout do tema claro antigo em cima do tema escuro novo. O caso mais
// traiçoeiro é o token `sakura-purple-dark`, que apesar do nome virou uma cor
// CLARA (#e8d5e5) na troca de tema — todo `bg-sakura-purple-dark` que ficou
// com letra branca em cima virou texto invisível sem ninguém perceber.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZ = "src";

// Tokens do tema (src/styles/globals.css) traduzidos pra "isso é claro ou escuro?"
const FUNDO_CLARO = [
  /\bbg-white\b(?!\/)/,
  /\bbg-[a-z]+-(?:50|100|200)\b/,
  /\bbg-sakura-purple-dark\b/, // apesar do nome "dark", é a cor CLARA do texto
  // O laranja de ação (visual novo, #990). Letra branca em cima dele dá 3,2:1,
  // abaixo dos 4,5:1 do mínimo: a letra tem que ser a `sobre-acao`, escura
  // (regra 3 de docs/referencia/visual-novo/README.md). Vale também pro
  // `hover:`: passar o mouse não pode apagar o texto do botão. Com "/" (ex.:
  // bg-sakura-purple/20) é só um véu sobre o fundo escuro, e não entra.
  /\bbg-sakura-purple(?:\/(?:[7-9]\d|100))?(?![-/\w])/, // de 70% pra cima ainda é laranja
  /\bbg-sakura-pink(?:\/(?:[7-9]\d|100))?(?![-/\w])/,
  /\bbg-acao(?:-clara)?(?![-/\w])/,
  /\bbg-dica(?![-/\w])/, // a caixinha clara da Dica: a letra dela é a `sobre-dica`
];
const FUNDO_ESCURO = [
  /\bbg-sakura-bg\b/,
  /\bbg-sakura-pink-soft\b/,
  /\bbg-sakura-gray\b/,
  /\bbg-black\b/,
  /\bbg-\[#[0-1][0-9a-f]/, // hex começando bem escuro, ex: bg-[#160f16]
  // As superfícies com nome de PAPEL do visual novo (#990): todas escuras.
  /\bbg-(?:fundo|painel|cartao|passar|campo|janela|placa)(?![-/\w])/,
];
const TEXTO_CLARO = [
  /\btext-white\b(?!\/)/,
  /\btext-sakura-purple-dark\b/,
  /\btext-sakura-muted\b/,
  /\btext-[a-z]+-(?:50|100|200)\b/,
  /\btext-texto(?:-[23])?(?![-/\w])/, // os três textos com nome de papel: todos claros
];
const TEXTO_ESCURO = [
  /\btext-black\b/,
  /\btext-sakura-gray\b/,
  /\btext-sakura-bg\b/,
  /\btext-[a-z]+-(?:700|800|900)\b/,
  /\btext-sobre-(?:acao|dica)(?![-/\w])/, // as letras escuras, pra cima do laranja e da dica
];

const casa = (regras, texto) => regras.some((r) => r.test(texto));

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory()
      ? arquivos(caminho)
      : /\.tsx?$/.test(nome)
        ? [caminho]
        : [];
  });
}

const achados = [];
for (const caminho of arquivos(RAIZ)) {
  readFileSync(caminho, "utf8")
    .split("\n")
    .forEach((linha, i) => {
      // pega qualquer trecho entre aspas que pareça lista de classes Tailwind
      for (const [, classes] of linha.matchAll(/["'`]([^"'`]*\b(?:bg|text)-[^"'`]*)["'`]/g)) {
        const claroClaro = casa(FUNDO_CLARO, classes) && casa(TEXTO_CLARO, classes);
        const escuroEscuro = casa(FUNDO_ESCURO, classes) && casa(TEXTO_ESCURO, classes);
        if (claroClaro || escuroEscuro) {
          achados.push({
            caminho,
            linha: i + 1,
            tipo: claroClaro ? "fundo claro + letra clara" : "fundo escuro + letra escura",
            classes: classes.trim().slice(0, 110),
          });
        }
      }
    });
}

if (achados.length === 0) {
  console.log("Nenhuma combinação ilegível encontrada.");
} else {
  console.log(`${achados.length} combinação(ões) suspeita(s):\n`);
  for (const a of achados) {
    console.log(`${a.caminho}:${a.linha}  [${a.tipo}]\n   ${a.classes}\n`);
  }
}

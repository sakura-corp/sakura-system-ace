// Varredura de contraste: procura, em cada string de className do app,
// combinações de fundo + cor de texto que deixariam o texto ilegível.
// Não substitui olhar a tela — só aponta os candidatos pra revisão humana.
//
// Rodar com: npm run contraste
//
// Existe por causa de um tipo de bug que já apareceu três vezes (ver itens 10,
// 17 e a varredura desta sessão no PROJETO_STATUS.md, seção 6): sobra de
// layout do tema claro antigo em cima do tema escuro novo. O caso mais
// traiçoeiro foi o token antigo `sakura-purple-dark` (hoje `texto`), que
// apesar do nome virou uma cor CLARA na troca de tema — todo fundo com ele que
// ficou com letra branca em cima virou texto invisível sem ninguém perceber.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZ = "src";

// Tokens do tema (src/styles/globals.css) traduzidos pra "isso é claro ou escuro?"
//
// O programa tem DOIS temas (visual novo, #990), e os tokens trocam de lado: a
// superfície `cartao` é escura no tema escuro e branca no claro; o `texto` é
// o contrário. Então há três grupos: o que é FIXO (branco é branco nos dois),
// o que é superfície do tema e o que é texto do tema. A varredura roda uma vez
// pra cada tema, e uma string reprova se for ilegível em qualquer um.

// Fixos: valem nos dois temas.
const FUNDO_CLARO_FIXO = [
  /\bbg-white\b(?!\/)/,
  /\bbg-[a-z]+-(?:50|100|200)\b/,
  // O laranja de ação (visual novo, #990). Letra branca em cima dele dá 3,2:1,
  // abaixo dos 4,5:1 do mínimo: a letra tem que ser a `sobre-acao`, escura
  // (regra 3 de docs/referencia/visual-novo/README.md). Vale também pro
  // `hover:`: passar o mouse não pode apagar o texto do botão. Com "/" (ex.:
  // bg-acao/20) é só um véu sobre o fundo, e não entra; de 70% pra cima ainda
  // é laranja.
  /\bbg-acao(?:-clara)?(?:\/(?:[7-9]\d|100))?(?![-/\w])/,
];
const FUNDO_ESCURO_FIXO = [
  /\bbg-black\b(?!\/)/,
  /\bbg-\[#[0-1][0-9a-f]/, // hex começando bem escuro, ex: bg-[#160f16]
];
const TEXTO_CLARO_FIXO = [/\btext-white\b(?!\/)/, /\btext-[a-z]+-(?:50|100|200)\b/];
const TEXTO_ESCURO_FIXO = [
  /\btext-black\b/,
  /\btext-[a-z]+-(?:700|800|900)\b/,
  /\btext-sobre-acao(?![-/\w])/, // a letra escura de cima do laranja
];

// As superfícies do tema: escuras no escuro, claras no claro.
const SUPERFICIE = [
  /\bbg-(?:fundo|painel|cartao|passar|campo|janela|placa)(?![-/\w])/,
];
// Os textos do tema: claros no escuro, escuros no claro.
const TEXTO_DO_TEMA = [
  /\btext-texto(?:-[23])?(?![-/\w])/,
];
// O avesso do tema: a caixinha da Dica (clara no escuro, escura no claro) e o
// texto principal usado como FUNDO; e as letras que vão em cima deles.
const FUNDO_AVESSO = [/\bbg-dica(?![-/\w])/, /\bbg-texto(?![-/\w])/];
const TEXTO_AVESSO = [/\btext-sobre-dica(?![-/\w])/, /\btext-(?:fundo|cartao)(?![-/\w])/];

const REGRAS = {
  escuro: {
    fundoClaro: [...FUNDO_CLARO_FIXO, ...FUNDO_AVESSO],
    fundoEscuro: [...FUNDO_ESCURO_FIXO, ...SUPERFICIE],
    textoClaro: [...TEXTO_CLARO_FIXO, ...TEXTO_DO_TEMA],
    textoEscuro: [...TEXTO_ESCURO_FIXO, ...TEXTO_AVESSO],
  },
  claro: {
    fundoClaro: [...FUNDO_CLARO_FIXO, ...SUPERFICIE],
    fundoEscuro: [...FUNDO_ESCURO_FIXO, ...FUNDO_AVESSO],
    textoClaro: [...TEXTO_CLARO_FIXO, ...TEXTO_AVESSO],
    textoEscuro: [...TEXTO_ESCURO_FIXO, ...TEXTO_DO_TEMA],
  },
};

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
        for (const [tema, r] of Object.entries(REGRAS)) {
          const claroClaro = casa(r.fundoClaro, classes) && casa(r.textoClaro, classes);
          const escuroEscuro = casa(r.fundoEscuro, classes) && casa(r.textoEscuro, classes);
          if (claroClaro || escuroEscuro) {
            achados.push({
              caminho,
              linha: i + 1,
              tipo: `tema ${tema}: ${claroClaro ? "fundo claro + letra clara" : "fundo escuro + letra escura"}`,
              classes: classes.trim().slice(0, 110),
            });
          }
        }
      }
    });
}

if (achados.length === 0) {
  console.log("Nenhuma combinação ilegível encontrada, em nenhum dos dois temas.");
} else {
  console.log(`${achados.length} combinação(ões) suspeita(s):\n`);
  for (const a of achados) {
    console.log(`${a.caminho}:${a.linha}  [${a.tipo}]\n   ${a.classes}\n`);
  }
}

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Trava mecânica contra o bug de fuso horário que já apareceu QUATRO vezes em
// lugares diferentes (PROJETO_STATUS.md, seção 6, itens 34 e 42): OS faturada
// à noite sumindo da lista, competência de nota fiscal caindo no mês seguinte,
// data de emissão adiantada e data de pedido de compra.
//
// A causa é sempre a mesma: pegar "que dia é" de dentro de um timestamp que
// está em UTC. No Brasil (UTC-3), das 21h em diante o UTC já virou amanhã — e
// é justamente à noite que ela mexe no sistema.
//
// O que estas regras proíbem é o GESTO de cortar o dia, não o `toISOString()`
// em si: gravar um instante completo em UTC (`data_pagamento`,
// `data_fechamento`, `atualizado_em`) está certo e continua liberado. O certo
// pra pegar um dia é `hojeLocal()` / `diaLocal()`, de `src/lib/datas.ts`.
const PROIBE_CORTAR_DIA_DE_UTC = [
  {
    // `algumaCoisa.toISOString().slice(...)` e parentes (substring, substr,
    // split("T")). É a forma clássica do bug.
    selector:
      "CallExpression[callee.object.callee.property.name='toISOString'][callee.property.name=/^(slice|substr|substring|split)$/]",
    message:
      "Isto pega o dia em UTC, não o dia de quem está usando o sistema — à noite ele já virou amanhã. Use diaLocal() ou hojeLocal(), de src/lib/datas.ts. (PROJETO_STATUS.md, seção 6, itens 34 e 42)",
  },
  {
    // Cortar exatamente 10 caracteres é, na prática, sempre "pegar a parte de
    // data de um texto ISO" — inclusive quando o texto vem direto do banco,
    // sem `toISOString()` nenhum no meio. Foi essa forma
    // (`ordem.data_abertura.slice(0, 10)`) que fez a OS sumir da lista.
    selector:
      "CallExpression[callee.property.name=/^(slice|substr|substring)$/][arguments.0.value=0][arguments.1.value=10]",
    message:
      "Cortar 10 caracteres de um timestamp pega o dia em UTC, não o dia local — à noite ele já virou amanhã. Use diaLocal(), de src/lib/datas.ts. (PROJETO_STATUS.md, seção 6, itens 34 e 42)",
  },
];

// `import.meta.env.ALGO ?? "padrão"` não protege de nada: o `.env` copiado do
// exemplo traz a variável como TEXTO VAZIO, e o `??` só troca `null`/`undefined`.
// Já deu tela em branco (docs/licoes.md, item 8). O `??` no resto do código
// continua liberado; só é proibido quando o lado esquerdo LÊ o `import.meta.env`
// (direto, com `?.`, com `.trim()`, embrulhado em `as`/`!`, etc.). O valor padrão
// na desestruturação (`const { VITE_X = "y" } = import.meta.env`) tem o mesmo
// defeito e também é proibido.
//
// O que NÃO dá pra pegar por sintaxe: guardar o env numa variável antes
// (`const env = import.meta.env; env.VITE_X ?? "y"`) e o `??=` depois.
const MENSAGEM_ENV =
  "O ?? (e o valor padrão da desestruturação) não troca o texto vazio que vem do .env copiado do exemplo — dá tela em branco. Use || no lugar. (docs/licoes.md, item 8)";
const LE_O_ENV = "MemberExpression[object.type='MetaProperty'][object.meta.name='import'][property.name='env']";
const PROIBE_ENV_COM_NULLISH = [
  {
    selector: `LogicalExpression[operator='??'] > .left:matches(${LE_O_ENV}, :has(${LE_O_ENV}))`,
    message: MENSAGEM_ENV,
  },
  {
    selector: `VariableDeclarator[init.type='MemberExpression'][init.object.type='MetaProperty'][init.property.name='env'] > ObjectPattern AssignmentPattern`,
    message: MENSAGEM_ENV,
  },
];

// Tudo do `no-restricted-syntax` que NÃO é o corte de dia. O ESLint troca a
// lista inteira (não junta) quando um bloco redefine a regra; por isso a
// exceção dos dois testes lá embaixo usa esta mesma lista, e proibição nova de
// sintaxe entra AQUI, pra valer nos dois lugares.
const DEMAIS_PROIBICOES_DE_SINTAXE = [...PROIBE_ENV_COM_NULLISH];

// `window.prompt()` não funciona no Electron (não abre nada e devolve null).
const MENSAGEM_PROMPT =
  "window.prompt() não funciona no Electron. Use um modal do programa. (PROJETO_STATUS.md, seção 3)";

export default tseslint.config(
  { ignores: ["dist", "dist-electron", "release"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-restricted-syntax": [
        "error",
        ...PROIBE_CORTAR_DIA_DE_UTC,
        ...DEMAIS_PROIBICOES_DE_SINTAXE,
      ],
      "no-restricted-globals": [
        "error",
        { name: "prompt", message: MENSAGEM_PROMPT },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "prompt", message: MENSAGEM_PROMPT },
        { object: "globalThis", property: "prompt", message: MENSAGEM_PROMPT },
        { object: "self", property: "prompt", message: MENSAGEM_PROMPT },
        { object: "parent", property: "prompt", message: MENSAGEM_PROMPT },
        { object: "top", property: "prompt", message: MENSAGEM_PROMPT },
      ],
    },
  },
  {
    // As duas ÚNICAS exceções, e as duas são deliberadas: estes testes cortam
    // o dia em UTC de propósito, pra provar que o jeito errado erra mesmo.
    // Sem eles, a regra acima ficaria sem nada que demonstrasse o porquê dela.
    // A exceção é SÓ pro corte de dia: as outras proibições continuam valendo.
    files: ["src/lib/datas.test.ts", "src/schemas/comissoes.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...DEMAIS_PROIBICOES_DE_SINTAXE],
    },
  },
);

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
// Já deu tela em branco (docs/licoes.md, item 8).
//
// Uma regra pequena, daqui mesmo (seletor de texto não dava conta sem pegar
// código certo): ela segue a "corrente do valor" do lado esquerdo do `??` —
// membro (`.X`, `["X"]`, `?.X`), chamada de método (`.trim()`), `as`, `!` e
// `satisfies` — e só reclama se a corrente nasce no `import.meta.env`. Assim
// `cfg[import.meta.env.MODE] ?? x`, `f(import.meta.env.X) ?? y` e
// `(import.meta.env.X || undefined) ?? y` continuam liberados, e o `??` no resto
// do código também. Pega ainda o `??=` e o valor padrão ao desestruturar o env
// (`const { VITE_X = "y" } = import.meta.env`, inclusive com `as` e em
// parâmetro de função).
//
// O que NÃO pega: guardar o env numa variável antes
// (`const env = import.meta.env; env.VITE_X ?? "y"`) ou copiá-lo com spread
// (`{ ...import.meta.env }`). Ver o item 8.
const MENSAGEM_ENV =
  "O ?? (e o valor padrão ao desestruturar) não troca o texto vazio que vem do .env copiado do exemplo — dá tela em branco. Use || no lugar. (docs/licoes.md, item 8)";

const EMBRULHOS = new Set([
  "TSAsExpression",
  "TSTypeAssertion",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
  "ChainExpression",
]);

// Métodos de texto que devolvem texto vazio quando recebem texto vazio: o
// valor continua "o env". Outros (`.find()`, `.match()`, `.split()[n]`) podem
// devolver `undefined`/`null` de verdade, e aí o `??` está certo.
const MANTEM_O_TEXTO = new Set([
  "trim",
  "trimStart",
  "trimEnd",
  "toLowerCase",
  "toUpperCase",
  "toString",
  "replace",
  "replaceAll",
  "normalize",
]);

function desembrulhar(no) {
  while (no && EMBRULHOS.has(no.type)) no = no.expression;
  return no;
}

function ehImportMetaEnv(no) {
  if (no?.type !== "MemberExpression") return false;
  const objeto = desembrulhar(no.object);
  return (
    objeto?.type === "MetaProperty" &&
    objeto.meta.name === "import" &&
    (no.computed ? no.property.value === "env" : no.property.name === "env")
  );
}

/**
 * O valor de `no` pode ser, sem passar por nada que troque texto vazio, um
 * valor do `import.meta.env`? Segue membro, método de texto, embrulho de tipo
 * e `?.`, e entra nos ramos de `? :` e no lado direito de `??`/`||`/`&&` (que é
 * o valor quando o esquerdo não serve).
 */
function nasceNoEnv(no) {
  no = desembrulhar(no);
  if (!no) return false;
  if (ehImportMetaEnv(no)) return true;
  switch (no.type) {
    case "MemberExpression":
      return nasceNoEnv(no.object);
    case "CallExpression": {
      const callee = desembrulhar(no.callee);
      return (
        callee?.type === "MemberExpression" &&
        !callee.computed &&
        MANTEM_O_TEXTO.has(callee.property.name) &&
        nasceNoEnv(callee.object)
      );
    }
    case "ConditionalExpression":
      return nasceNoEnv(no.consequent) || nasceNoEnv(no.alternate);
    case "LogicalExpression":
      return nasceNoEnv(no.right);
    default:
      return false;
  }
}

/** `{ A = "x" } = <algo que é o import.meta.env>`: reclama de cada padrão. */
function padroesAoDesestruturar(context, padrao, valor) {
  if (padrao?.type !== "ObjectPattern" || !valor) return;
  if (!ehImportMetaEnv(desembrulhar(valor))) return;
  for (const prop of padrao.properties) {
    if (prop.type === "Property" && prop.value.type === "AssignmentPattern") {
      context.report({ node: prop.value, message: MENSAGEM_ENV });
    }
  }
}

const REGRAS_LOCAIS = {
  rules: {
    "env-sem-nullish": {
      meta: { type: "problem", schema: [] },
      create(context) {
        return {
          LogicalExpression(no) {
            if (no.operator === "??" && nasceNoEnv(no.left)) {
              context.report({ node: no, message: MENSAGEM_ENV });
            }
          },
          AssignmentExpression(no) {
            if (no.operator === "??=" && nasceNoEnv(no.left)) {
              context.report({ node: no, message: MENSAGEM_ENV });
            } else if (no.operator === "=") {
              padroesAoDesestruturar(context, no.left, no.right);
            }
          },
          VariableDeclarator(no) {
            padroesAoDesestruturar(context, no.id, no.init);
          },
          AssignmentPattern(no) {
            padroesAoDesestruturar(context, no.left, no.right);
          },
        };
      },
    },
  },
};

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
      sakura: REGRAS_LOCAIS,
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
      ],
      "sakura/env-sem-nullish": "error",
      "no-restricted-globals": [
        "error",
        { name: "prompt", message: MENSAGEM_PROMPT },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "prompt", message: MENSAGEM_PROMPT },
        { object: "globalThis", property: "prompt", message: MENSAGEM_PROMPT },
        { object: "self", property: "prompt", message: MENSAGEM_PROMPT },
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
      // Hoje o `no-restricted-syntax` só tem o corte de dia, então "off".
      // Se um dia ele ganhar outra proibição, aqui vira ["error", ...a outra]
      // (NUNCA só ["error"]: sem opções, o ESLint herda as do bloco de cima e
      // o corte de dia volta). O `??` no env e o prompt são outras regras e
      // continuam valendo nestes dois arquivos.
      "no-restricted-syntax": "off",
    },
  },
);

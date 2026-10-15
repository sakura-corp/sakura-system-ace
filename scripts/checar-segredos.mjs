// Confere, ANTES de um `git commit` ou `git push` feito pelo Claude, se o que vai
// sair do computador carrega uma credencial. É o gatilho (hook) `PreToolUse` do
// `.claude/settings.json`; o motivo e a tarefa estão em docs/licoes.md (item 50)
// e na #470.
//
// Por que existe: o CI (`gitleaks`) só roda DEPOIS que o commit chegou ao GitHub,
// e o repositório é público — nesse momento a chave já está à vista de todos e no
// histórico pra sempre (reescrever histórico é proibido: item 50).
//
// Três respostas, de propósito:
//   - chave com FORMATO reconhecível, ou arquivo de certificado → BARRA (exit 2)
//   - "cara de senha" (`senha: abc123`) → só AVISA e deixa seguir. Validação
//     incerta é aviso, nunca tranca (item 33): senha em texto comum nenhuma
//     ferramenta reconhece, então barrar daria falso alarme e ensinaria todo
//     mundo a contornar.
//   - qualquer coisa estranha (não é repositório git, git falhou, entrada ilegível)
//     → deixa seguir. Este gatilho nunca pode travar o trabalho por defeito próprio.
//
// As 3 primeiras regras são as de `.gitleaks.toml`; as outras são as de fábrica que
// valem pro que este projeto manuseia. O CI continua como rede de quem commita
// sem o Claude.
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Chave com formato reconhecível: barra. */
export const REGRAS_BARRAM = [
  {
    id: "supabase-chave-secreta",
    nome: "chave secreta do Supabase (sb_secret_...)",
    regex: /sb_secret_[A-Za-z0-9_-]{20,}/,
    oQueFazer: "Ela ignora toda a proteção do banco. O lugar dela é o painel do Supabase.",
  },
  {
    id: "anthropic-chave-api",
    nome: "chave da API da Anthropic (sk-ant-...)",
    regex: /sk-ant-[A-Za-z0-9_-]{20,}/,
    oQueFazer: "O lugar dela é o secret da Edge Function no Supabase, nunca um arquivo.",
  },
  {
    id: "supabase-jwt",
    nome: "chave do Supabase no formato antigo (JWT)",
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    oQueFazer: "A anon pode ser pública; a service_role, jamais, e as duas têm a mesma cara.",
  },
  {
    id: "chave-privada",
    nome: "chave privada (-----BEGIN ... PRIVATE KEY-----)",
    regex: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
    oQueFazer: "Chave privada nunca entra no repositório.",
  },
  {
    id: "github-token",
    nome: "token do GitHub",
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})/,
    oQueFazer: "Revogue o token no GitHub se ele já foi colado em algum lugar.",
  },
  {
    id: "aws-chave",
    nome: "chave de acesso da AWS (AKIA...)",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
    oQueFazer: "O lugar dela é o painel do serviço.",
  },
  {
    id: "slack-token",
    nome: "token do Slack",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    oQueFazer: "O lugar dele é o painel do serviço.",
  },
];

/** "Cara de senha": só avisa. O valor precisa ter um dígito pra não pegar `token: string`. */
export const REGRA_AVISA = /\b(senha|password|passwd|token|csc|secret)\b\s*[:=]\s*["']?([^\s"',;)]{4,})/i;

const VALOR_QUE_NAO_E_SENHA = /^[<$({]|\.\.\.|xxx|\*\*\*|process\.env|import\.meta|exemplo|^seu|^sua/i;

/** Certificado digital é a identidade fiscal da empresa: barra pelo nome do arquivo. */
const ARQUIVO_DE_CERTIFICADO = /(?:^|\/)(?:[^/]+\.(?:pfx|p12)|conexao\.json)$/i;

/** Mesma lista de `.gitleaks.toml`: o que parece segredo e não é. */
const CAMINHOS_LIBERADOS = [/(^|\/)package-lock\.json$/, /(^|\/)\.env\.example$/, /(^|\/)\.gitleaks\.toml$/];
const LINHA_LIBERADA = /naopodevazar/i;

/**
 * Descobre se o comando de terminal é um `git commit` ou `git push`.
 * Aceita `git -C pasta commit`, `git add . && git commit -m x`, etc.
 *
 * @param {string} comando
 * @returns {{ commit: boolean, push: boolean, adiciona: boolean }}
 */
export function classificarComando(comando) {
  const g = String.raw`(?:^|[\s;&|(])git(?:\s+-[Cc]\s+\S+)*\s+`;
  const commit = new RegExp(`${g}commit\\b`).test(comando);
  const push = new RegExp(`${g}push\\b`).test(comando);
  // `git add` ou `commit -a` no mesmo comando: o que entra no commit ainda não
  // está na área de preparo quando o gatilho roda.
  const adiciona =
    new RegExp(`${g}add\\b`).test(comando) || (commit && /\s-[a-zA-Z]*a[a-zA-Z]*(\s|$)|--all\b/.test(comando));
  return { commit, push, adiciona };
}

/**
 * Procura credenciais nas linhas ADICIONADAS de um diff no formato unificado.
 *
 * @param {string} diff saída de `git diff --unified=0`
 * @returns {{ barrar: Array<{arquivo: string, linha: number, regra: string, nome: string, oQueFazer: string}>,
 *             avisar: Array<{arquivo: string, linha: number}> }}
 */
export function analisarDiff(diff) {
  const barrar = [];
  const avisar = [];
  let arquivo = "";
  let liberado = false;
  let linha = 0;

  for (const bruta of diff.split("\n")) {
    const cabecalho = /^diff --git a\/.* b\/(.*)$/.exec(bruta);
    if (cabecalho) {
      arquivo = cabecalho[1];
      liberado = CAMINHOS_LIBERADOS.some((r) => r.test(arquivo));
      if (ARQUIVO_DE_CERTIFICADO.test(arquivo)) {
        barrar.push({
          arquivo,
          linha: 0,
          regra: "arquivo-de-certificado",
          nome: "arquivo de certificado digital",
          oQueFazer: "O certificado é a identidade fiscal da empresa. Ele fica fora do repositório.",
        });
      }
      continue;
    }
    const hunk = /^@@ -\S+ \+(\d+)(?:,\d+)? @@/.exec(bruta);
    if (hunk) {
      linha = Number(hunk[1]);
      continue;
    }
    if (bruta.startsWith("+++") || bruta.startsWith("---")) continue;
    if (!bruta.startsWith("+")) continue;

    const texto = bruta.slice(1);
    const numero = linha++;
    if (liberado || LINHA_LIBERADA.test(texto)) continue;

    const regra = REGRAS_BARRAM.find((r) => r.regex.test(texto));
    if (regra) {
      barrar.push({ arquivo, linha: numero, regra: regra.id, nome: regra.nome, oQueFazer: regra.oQueFazer });
      continue;
    }
    const m = REGRA_AVISA.exec(texto);
    if (m && /\d/.test(m[2]) && !VALOR_QUE_NAO_E_SENHA.test(m[2])) avisar.push({ arquivo, linha: numero });
  }
  return { barrar, avisar };
}

/** Roda o git; qualquer falha vira `null` (o gatilho nunca trava por defeito próprio). */
function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
}

/** Transforma arquivos novos ainda não versionados em diff, pra serem varridos igual. */
function diffDeNaoVersionados(cwd) {
  const nomes = git(["ls-files", "--others", "--exclude-standard", "-z"], cwd);
  if (!nomes) return "";
  let saida = "";
  for (const nome of nomes.split("\0").filter(Boolean)) {
    saida += `diff --git a/${nome} b/${nome}\n`;
    try {
      const caminho = join(cwd, nome);
      if (statSync(caminho).size > 1024 * 1024) continue;
      const conteudo = readFileSync(caminho, "utf8");
      if (conteudo.includes("\0")) continue;
      const linhas = conteudo.split("\n");
      saida += `@@ -0,0 +1,${linhas.length} @@\n${linhas.map((l) => `+${l}`).join("\n")}\n`;
    } catch {
      // arquivo sumiu ou não dá pra ler: ignora
    }
  }
  return saida;
}

/** O que vai sair, segundo o tipo de comando. */
function diffDoQueVaiSair(tipo, cwd) {
  let diff = "";
  if (tipo.commit) {
    diff += git(["diff", "--cached", "--unified=0", "--no-color"], cwd) ?? "";
    if (tipo.adiciona) {
      diff += git(["diff", "--unified=0", "--no-color"], cwd) ?? "";
      diff += diffDeNaoVersionados(cwd);
    }
  }
  if (tipo.push) {
    const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], cwd)?.trim();
    const base = upstream || "origin/main";
    diff += git(["diff", `${base}...HEAD`, "--unified=0", "--no-color"], cwd) ?? "";
  }
  return diff;
}

function mensagemBarrou(achados) {
  const linhas = achados.map((a) => `  - ${a.arquivo}${a.linha ? `:${a.linha}` : ""}: ${a.nome}. ${a.oQueFazer}`);
  return [
    "BARRADO antes de sair do computador: achei algo que parece credencial.",
    ...linhas,
    "O repositório é público; o que chega no GitHub fica no histórico pra sempre.",
    "O que fazer: tire isso do arquivo (a credencial mora no painel do serviço), rode o git add de novo e tente outra vez.",
    "Se já colou em algum lugar, trate como vazada e troque a credencial.",
  ].join("\n");
}

function mensagemAviso(achados) {
  const onde = achados.map((a) => `${a.arquivo}:${a.linha}`).join(", ");
  return `AVISO (não barrei): ${onde} tem cara de senha ou token escrito direto. Se for de verdade, tire do arquivo antes de seguir. A regra está no topo do PROJETO_STATUS.md.`;
}

/**
 * Modo "gancho do git" (`--staged` no pre-commit, `--push` no pre-push, em `.githooks/`).
 * Diferente do gatilho do Claude, aqui o git já montou o commit: o que está na área de
 * preparo é exatamente o que vai entrar, não importa como o comando foi escrito (inclusive
 * `echo chave > f && git add f && git commit`, que o gatilho do Claude não enxerga porque
 * roda antes do comando inteiro). Saída: 1 barra (é assim que o git entende "não"), 0 segue.
 *
 * @param {"--staged" | "--push"} modo
 * @param {string} entrada no pre-push, as linhas que o git manda: `<ref local> <sha local> <ref remota> <sha remoto>`
 */
export function modoGit(modo, entrada, cwd = process.cwd()) {
  let diff = "";
  if (modo === "--staged") {
    diff = git(["diff", "--cached", "--unified=0", "--no-color"], cwd) ?? "";
  } else {
    const zeros = /^0+$/;
    for (const linha of entrada.split("\n").filter(Boolean)) {
      const [, local, , remoto] = linha.split(" ");
      if (!local || zeros.test(local)) continue; // apagar branch não leva commit
      const faixa = remoto && !zeros.test(remoto) ? [`${remoto}..${local}`] : [local, "--not", "--remotes"];
      const commits = (git(["rev-list", "--max-count=200", ...faixa], cwd) ?? "").split("\n").filter(Boolean);
      for (const sha of commits) diff += git(["show", "--unified=0", "--no-color", "--format=", sha], cwd) ?? "";
    }
  }
  const { barrar, avisar } = analisarDiff(diff);
  if (barrar.length > 0) {
    const extra =
      modo === "--push"
        ? "Isso já está num commit local: desfaça com `git reset --soft HEAD~N`, tire a credencial e commite de novo. Nunca reescreva histórico que já foi enviado.\n"
        : "";
    process.stderr.write(`${mensagemBarrou(barrar)}\n${extra}Pra ignorar de propósito (só com certeza): --no-verify.\n`);
    return 1;
  }
  if (avisar.length > 0) process.stderr.write(`${mensagemAviso(avisar)}\n`);
  return 0;
}

/** Entrada: o JSON do gatilho na entrada padrão. Saída: exit 2 barra; exit 0 deixa seguir. */
function principal(entrada) {
  let dados;
  try {
    dados = JSON.parse(entrada);
  } catch {
    return 0;
  }
  const comando = dados?.tool_input?.command;
  if (typeof comando !== "string") return 0;

  const tipo = classificarComando(comando);
  if (!tipo.commit && !tipo.push) return 0;

  const cwd = dados.cwd || process.cwd();
  const { barrar, avisar } = analisarDiff(diffDoQueVaiSair(tipo, cwd));

  if (barrar.length > 0) {
    process.stderr.write(`${mensagemBarrou(barrar)}\n`);
    return 2;
  }
  if (avisar.length > 0) {
    const aviso = mensagemAviso(avisar);
    process.stdout.write(
      JSON.stringify({
        systemMessage: aviso,
        hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: aviso },
      }),
    );
  }
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("checar-segredos.mjs") && process.argv[2] === "--staged") {
  // O pre-commit não recebe nada na entrada padrão: não esperar por ela (travaria o commit).
  process.exitCode = modoGit("--staged", "");
} else if (process.argv[1] && process.argv[1].endsWith("checar-segredos.mjs")) {
  const pedacos = [];
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (p) => pedacos.push(p));
  process.stdin.on("end", () => {
    const modo = process.argv[2];
    process.exitCode =
      modo === "--staged" || modo === "--push" ? modoGit(modo, pedacos.join("")) : principal(pedacos.join(""));
  });
}

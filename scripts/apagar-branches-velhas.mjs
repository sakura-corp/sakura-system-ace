// Apaga do GitHub as branches que já não servem pra nada (uso único, 08/10/2026).
//
// Cada sessão do Claude cria uma branch, e ela fica parada depois que a
// mudança entra na `main`: em 08/10 eram 131. A sessão não consegue apagar
// branch (o acesso dela ao GitHub recusa), então quem aperta o botão é ela,
// pelo workflow "Apagar branches velhas (uso único)", que espera a aprovação
// dela no cofre `lojas` antes de começar.
//
// SÓ APAGA O QUE JÁ ESTÁ NA `main`. Uma branch sai se:
//   - a ponta dela já faz parte da história da `main` (foi mesclada inteira), ou
//   - a ponta dela é exatamente o que um PR já mesclado levou (os PRs entram
//     "squash", então o commit não aparece na `main`, mas o conteúdo está lá);
//     o GitHub ainda deixa restaurar essas pela página do PR ("Restore branch"), ou
//   - é uma das duas de 27/07 que ela mandou apagar, e ainda está na mesma
//     ponta que ela viu (se alguém mexeu nela depois, fica).
//
// E NUNCA APAGA: a `main`; branch com PR aberto; a do conserto da rodinha,
// guardada pra 0.9.51; nem branch com trabalho que não entrou.
//
// Depois de usado, este arquivo, o teste e o workflow podem sair do repositório
// (a opção "Automatically delete head branches" evita acumular de novo).

import { execFile } from "node:child_process";
import { appendFile } from "node:fs/promises";

/** Nunca sai, mesmo que pareça mesclada. */
export const SEMPRE_GUARDAR = new Set([
  "main",
  // O conserto da rodinha (#436), guardado pra 0.9.51.
  "claude/kind-euler-8s461d",
]);

/** As duas de 27/07 que ela mandou apagar, com a ponta que ela viu em 08/10. */
export const OBSOLETAS_APROVADAS = new Map([
  ["claude/sakura-system-autocenter-cyfuwh", "085962207f7b5f6751d96014f7ff2b2b6c3ae6da"],
  ["claude/software-visual-identity-cjr8f6", "353bf96a1c9d450bdcc81ad59bcc40680ee1130d"],
]);

/**
 * @typedef {{ nome: string, ponta: string }} Branch
 * @typedef {{ branch: string, ponta: string, aberto: boolean, mesclado: boolean }} Pr
 */

/**
 * Decide o que sai e o que fica. Não mexe em nada.
 *
 * @param {Branch[]} branches
 * @param {Pr[]} prs
 * @param {(ponta: string) => boolean} jaNaMain  a ponta já faz parte da história da `main`
 * @returns {{ apagar: Array<Branch & { motivo: string }>, guardar: Array<Branch & { motivo: string }> }}
 */
export function classificar(branches, prs, jaNaMain) {
  const apagar = [];
  const guardar = [];
  for (const branch of branches) {
    const dela = prs.filter((pr) => pr.branch === branch.nome);
    if (SEMPRE_GUARDAR.has(branch.nome)) {
      guardar.push({ ...branch, motivo: "guardada de propósito" });
    } else if (dela.some((pr) => pr.aberto)) {
      guardar.push({ ...branch, motivo: "tem PR aberto" });
    } else if (jaNaMain(branch.ponta)) {
      apagar.push({ ...branch, motivo: "já faz parte da main" });
    } else if (dela.some((pr) => pr.mesclado && pr.ponta === branch.ponta)) {
      apagar.push({ ...branch, motivo: "o PR dela já entrou" });
    } else if (OBSOLETAS_APROVADAS.get(branch.nome) === branch.ponta) {
      apagar.push({ ...branch, motivo: "obsoleta de 27/07, aprovada por ela" });
    } else {
      guardar.push({ ...branch, motivo: "tem trabalho que não entrou na main" });
    }
  }
  return { apagar, guardar };
}

// --- Rodando de verdade (no workflow) ---------------------------------------

function rodar(comando, args) {
  return new Promise((resolve, reject) => {
    execFile(comando, args, { maxBuffer: 64 * 1024 * 1024 }, (erro, saida, saidaDeErro) => {
      if (erro) reject(Object.assign(new Error(`${comando} ${args.join(" ")}: ${saidaDeErro || erro.message}`), { code: erro.code }));
      else resolve(saida);
    });
  });
}

async function jaNaMainDeVerdade(ponta) {
  try {
    await rodar("git", ["merge-base", "--is-ancestor", ponta, "origin/main"]);
    return true;
  } catch (erro) {
    // Código 1 = não é ancestral. Qualquer outro é erro de verdade.
    if (erro.code === 1) return false;
    throw erro;
  }
}

if (process.argv[1] && process.argv[1].endsWith("apagar-branches-velhas.mjs")) {
  const repositorio = process.env.GITHUB_REPOSITORY;
  const resumo = process.env.GITHUB_STEP_SUMMARY;
  if (!repositorio) throw new Error("Falta GITHUB_REPOSITORY.");

  const branches = (
    await rodar("git", ["for-each-ref", "refs/remotes/origin", "--format=%(refname:strip=3) %(objectname)"])
  )
    .split("\n")
    .map((linha) => linha.trim().split(" "))
    .filter(([nome, ponta]) => nome && ponta && nome !== "HEAD")
    .map(([nome, ponta]) => ({ nome, ponta }));

  const prs = (
    await rodar("gh", [
      "api",
      "--paginate",
      `repos/${repositorio}/pulls?state=all&per_page=100`,
      "--jq",
      '.[] | [.head.ref, .head.sha, .state, (.merged_at != null)] | @tsv',
    ])
  )
    .split("\n")
    .filter(Boolean)
    .map((linha) => {
      const [branch, ponta, estado, mesclado] = linha.split("\t");
      return { branch, ponta, aberto: estado === "open", mesclado: mesclado === "true" };
    });

  // Os comandos acima não podem ter voltado vazios por engano: sem PR nenhum,
  // toda branch "com PR aberto" viraria apagável.
  if (prs.length === 0) throw new Error("A lista de PRs veio vazia. Nada foi apagado.");

  const jaVistos = new Map();
  for (const { ponta } of branches) jaVistos.set(ponta, await jaNaMainDeVerdade(ponta));
  const { apagar, guardar } = classificar(branches, prs, (ponta) => jaVistos.get(ponta) === true);

  const apagadas = [];
  const falharam = [];
  for (const branch of apagar) {
    try {
      await rodar("gh", ["api", "-X", "DELETE", `repos/${repositorio}/git/refs/heads/${branch.nome}`]);
      apagadas.push(branch);
      console.log(`apagada: ${branch.nome} (${branch.motivo})`);
    } catch (erro) {
      falharam.push({ ...branch, motivo: erro instanceof Error ? erro.message : String(erro) });
      console.log(`::warning::não consegui apagar ${branch.nome}`);
    }
  }

  const linhas = [
    `### Branches velhas: ${apagadas.length} apagadas, ${guardar.length} guardadas`,
    "",
    "**Guardadas:**",
    ...guardar.map((b) => `- \`${b.nome}\`: ${b.motivo}`),
    "",
    `<details><summary>Apagadas (${apagadas.length})</summary>`,
    "",
    ...apagadas.map((b) => `- \`${b.nome}\`: ${b.motivo}`),
    "",
    "</details>",
  ];
  if (falharam.length > 0) {
    linhas.push("", `**Não consegui apagar (${falharam.length}):**`, ...falharam.map((b) => `- \`${b.nome}\``));
  }
  if (resumo) await appendFile(resumo, `${linhas.join("\n")}\n`);
  console.log(linhas.join("\n"));
  if (falharam.length > 0) process.exit(1);
}

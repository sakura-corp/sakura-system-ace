// Libera uma versão para TODAS as lojas (item TR-09.1 do guia).
//
// Desde o TR-09.1, toda versão publicada nasce no GitHub marcada como
// "pré-lançamento", e só os computadores do canal de teste (o dela e o da
// Pneus Amigão) a recebem. Liberar é tirar essa marca e declarar a versão
// como "a mais recente" — aí o resto das lojas passa a enxergá-la. Não refaz
// build nenhum: é a mesma release, o mesmo instalador, o mesmo latest.yml.
//
// Quem roda isto é o workflow "Liberar versão para todas as lojas"
// (.github/workflows/liberar-versao.yml), com um clique na aba Actions.
//
// POR QUE ISTO É UM ARQUIVO COM TESTE, E NÃO DUAS LINHAS DE `gh` NO WORKFLOW:
// liberar é o passo que leva uma versão até loja de outra empresa, e o jeito
// de ele dar errado é silencioso — liberar uma publicação pela metade (o
// estrago da v0.9.38, §6 item 66 do PROJETO_STATUS.md, que derrubou o canal
// de atualização de todas as lojas) ou uma release cujo latest.yml anuncia
// um instalador diferente do que está lá. Por isso, ANTES de mexer em
// qualquer coisa, ele confere:
//
//   1. a release existe e não é rascunho;
//   2. tem o instalador e o latest.yml, os dois com conteúdo;
//   3. o latest.yml anuncia exatamente esta versão e este instalador;
//   4. a impressão digital (sha512) do instalador publicado bate com a que o
//      latest.yml promete — é a conferência que fechou o caso da v0.9.38.
//
// E, DEPOIS de liberar, confere do lado de fora, pelos mesmos endereços que o
// app instalado usa, que o GitHub está mesmo respondendo a versão nova.
//
// VOLTAR ATRÁS É O MESMO COMANDO: liberar a versão boa anterior. Quando a
// versão pedida é mais velha que alguma já liberada, as mais novas voltam
// pro canal de teste — ou seja, "todas as lojas" passa a ser exatamente a
// versão pedida. Computador que já tinha atualizado continua onde está (o
// atualizador nunca instala versão mais velha); o conserto pra ele é uma
// versão nova, ver "Voltar uma versão" na seção 9 do PROJETO_STATUS.md.
//
// DOIS ENDEREÇOS (desde a 0.9.51, item 78 de docs/licoes.md): as versões
// moram no `ssace-versoes`, um repositório só de versões em que só ela
// escreve. O endereço antigo (o repositório do código) continua recebendo
// cópia enquanto existir computador numa versão até a 0.9.50, que só sabe
// procurar lá. Liberar mexe nos dois: primeiro no novo (obrigatório), depois
// no antigo, se a versão estiver lá.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const INSTALADOR = "SakuraSystem-Setup.exe";
export const ANUNCIO = "latest.yml";

/**
 * Onde o programa instalado procura atualização (o `build.publish` do
 * package.json). A equipe que escreve no código não escreve aqui: é isso que
 * impede alguém de publicar versão sem a aprovação dela.
 */
export const ENDERECO_DAS_VERSOES = "sakura-corp/ssace-versoes";
/**
 * Onde as versões moravam até a 0.9.50 — e onde os computadores nessas
 * versões ainda procuram. Recebe cópia até o código fechar. Pra parar a
 * cópia, esvaziar aqui ("") E no ENDERECO_ANTIGO do release.yml (o teste
 * confere que os dois batem).
 */
export const ENDERECO_ANTIGO = "sakura-corp/sakura-system-ace";

/** Quantas vezes a conferência pública tenta, e quanto espera entre elas. */
export const TENTATIVAS_DE_CONFERENCIA = 6;
export const ESPERA_ENTRE_TENTATIVAS_MS = 10_000;

/**
 * "0.9.40", "v0.9.40" e " v0.9.40 " viram "v0.9.40". Qualquer outra coisa é
 * recusada — inclusive sufixo tipo "-beta": neste projeto o canal é a marca
 * de pré-lançamento no GitHub, nunca o número da versão.
 *
 * @param {unknown} texto
 * @returns {string}
 */
export function normalizarTag(texto) {
  const limpo = String(texto ?? "").trim();
  const casou = /^v?(\d+\.\d+\.\d+)$/.exec(limpo);
  if (!casou) {
    throw new Error(
      `"${limpo}" não é um número de versão. Escreva como aparece na lista de Releases, por exemplo v0.9.40.`,
    );
  }
  return `v${casou[1]}`;
}

/**
 * Compara "v1.2.3" com "v1.10.0" como número, não como texto. Tag que não é
 * versão (alguma release antiga com outro nome) nunca é "mais nova".
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} negativo se a < b, zero se iguais, positivo se a > b
 */
export function compararVersoes(a, b) {
  const partes = (t) => {
    const casou = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(t);
    return casou ? casou.slice(1).map(Number) : null;
  };
  const pa = partes(a);
  const pb = partes(b);
  if (!pa || !pb) return pa ? 1 : pb ? -1 : 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/**
 * Lê só o que importa do latest.yml: as chaves do nível de cima. Não usa
 * biblioteca de YAML de propósito — o workflow roda este arquivo sem
 * `npm install`, e o formato que o electron-builder grava é fixo e simples.
 *
 * @param {string} texto
 * @returns {{ version?: string, path?: string, sha512?: string }}
 */
export function lerAnuncio(texto) {
  /** @type {Record<string, string>} */
  const chaves = {};
  for (const linha of String(texto).split(/\r?\n/)) {
    const casou = /^([A-Za-z0-9]+):\s*(.*)$/.exec(linha);
    if (!casou) continue;
    chaves[casou[1]] = casou[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return { version: chaves.version, path: chaves.path, sha512: chaves.sha512 };
}

async function sha512Base64(caminho) {
  const hash = createHash("sha512");
  for await (const pedaco of createReadStream(caminho)) hash.update(pedaco);
  return hash.digest("base64");
}

/**
 * @typedef {object} Dependencias
 * @property {(args: string[]) => Promise<string>} gh  roda o `gh`, devolve a saída
 * @property {(url: string, accept?: string) => Promise<{ status: number, texto: string }>} publico
 *   um GET anônimo, como o app instalado faz
 * @property {string} repositorio  "dono/repo"
 * @property {(ms: number) => Promise<void>} [esperar]
 * @property {(mensagem: string) => void} [log]
 */

/**
 * @param {string} pedido  o número da versão, do jeito que foi digitado
 * @param {Dependencias} dependencias
 * @returns {Promise<{ tag: string, devolvidasAoTeste: string[] }>}
 */
export async function liberarVersao(pedido, dependencias) {
  const { gh, publico, repositorio } = dependencias;
  const esperar = dependencias.esperar ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = dependencias.log ?? ((m) => console.log(m));

  const tag = normalizarTag(pedido);
  const versao = tag.slice(1);

  // --- 1. A release existe e não é rascunho -------------------------------
  let release;
  try {
    release = JSON.parse(
      await gh(["release", "view", tag, "--json", "tagName,isDraft,isPrerelease,assets"]),
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    if (/release not found/i.test(mensagem)) {
      throw new Error(
        `Não achei a versão ${tag} em ${repositorio}. Confira o número na lista de Releases — ela precisa ter sido publicada pelo workflow Release antes.`,
      );
    }
    // Chave vencida ou rede: não é número errado, e dizer que é mandaria
    // procurar o problema no lugar errado.
    throw new Error(
      `Não consegui consultar ${repositorio} no GitHub (${mensagem.trim()}). Se fala em "Bad credentials", a chave TOKEN_VERSOES venceu ou foi revogada (docs/operacao.md, "Onde as versões moram"). Nada foi liberado.`,
    );
  }
  if (release.isDraft) {
    throw new Error(`A ${tag} é um rascunho, não uma versão publicada. Nada foi liberado.`);
  }

  // --- 2. Tem os dois arquivos, com conteúdo -------------------------------
  for (const nome of [INSTALADOR, ANUNCIO]) {
    const arquivo = (release.assets ?? []).find((a) => a.name === nome);
    if (!arquivo || !(arquivo.size > 0)) {
      throw new Error(
        `A ${tag} está sem o ${nome} — é uma publicação pela metade. Rode o workflow Release de novo nessa versão e só depois libere. Nada foi liberado.`,
      );
    }
  }

  // --- 3 e 4. O anúncio bate com a versão e com o instalador ---------------
  const pasta = await mkdtemp(path.join(tmpdir(), "liberar-"));
  try {
    await gh(["release", "download", tag, "-p", ANUNCIO, "-p", INSTALADOR, "-D", pasta, "--clobber"]);
    const anuncio = lerAnuncio(await readFile(path.join(pasta, ANUNCIO), "utf8"));
    if (anuncio.version !== versao) {
      throw new Error(
        `O ${ANUNCIO} da ${tag} anuncia a versão "${anuncio.version}". Liberar assim mandaria as lojas atrás de outra versão. Nada foi liberado.`,
      );
    }
    if (anuncio.path !== INSTALADOR) {
      throw new Error(
        `O ${ANUNCIO} da ${tag} aponta para "${anuncio.path}", não para ${INSTALADOR}. Nada foi liberado.`,
      );
    }
    const digital = await sha512Base64(path.join(pasta, INSTALADOR));
    if (digital !== anuncio.sha512) {
      throw new Error(
        `A impressão digital do instalador publicado na ${tag} não bate com a que o ${ANUNCIO} promete — o arquivo pode ter subido cortado. As lojas recusariam a atualização. Rode o workflow Release de novo nessa versão. Nada foi liberado.`,
      );
    }
    log(`Conferido: ${tag} tem o instalador e o anúncio, e a impressão digital bate.`);
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }

  // --- Quais liberadas são mais novas que a pedida (voltar atrás) ----------
  const todas = JSON.parse(
    await gh(["release", "list", "--limit", "100", "--json", "tagName,isDraft,isPrerelease"]),
  );
  const maisNovasLiberadas = todas
    .filter((r) => !r.isDraft && !r.isPrerelease && compararVersoes(r.tagName, tag) > 0)
    .map((r) => r.tagName);

  // --- Liberar --------------------------------------------------------------
  // Primeiro a pedida vira "a mais recente"; só depois as mais novas voltam
  // pro teste. Nessa ordem, em nenhum instante o GitHub fica sem uma versão
  // liberada pra responder.
  await gh(["release", "edit", tag, "--prerelease=false", "--latest"]);
  log(`${tag} liberada para todas as lojas.`);
  for (const outra of maisNovasLiberadas) {
    await gh(["release", "edit", outra, "--prerelease"]);
    log(`${outra} devolvida ao canal de teste (era mais nova que ${tag}).`);
  }

  // --- Conferência de fora, pelos endereços que o app usa ------------------
  // O app instalado não usa a API autenticada: ele pergunta ao site do
  // GitHub, anonimamente. "O `gh` disse que deu certo" não é a mesma coisa
  // que "a loja está vendo" — daí conferir pelo mesmo caminho que ela usa.
  const base = `https://github.com/${repositorio}/releases`;
  let ultimaResposta = "";
  for (let tentativa = 1; tentativa <= TENTATIVAS_DE_CONFERENCIA; tentativa++) {
    try {
      const maisRecente = await publico(`${base}/latest`, "application/json");
      const tagPublica = maisRecente.status === 200 ? JSON.parse(maisRecente.texto).tag_name : null;
      const anuncioPublico = await publico(`${base}/latest/download/${ANUNCIO}`);
      const versaoPublica =
        anuncioPublico.status === 200 ? lerAnuncio(anuncioPublico.texto).version : null;
      if (tagPublica === tag && versaoPublica === versao) {
        log(`Conferido de fora: o GitHub responde ${tag} para todas as lojas.`);
        return { tag, devolvidasAoTeste: maisNovasLiberadas };
      }
      ultimaResposta = `mais recente = ${tagPublica ?? "?"}, anúncio = ${versaoPublica ?? "?"}`;
    } catch (erro) {
      ultimaResposta = erro instanceof Error ? erro.message : String(erro);
    }
    if (tentativa < TENTATIVAS_DE_CONFERENCIA) await esperar(ESPERA_ENTRE_TENTATIVAS_MS);
  }
  throw new Error(
    `A ${tag} foi marcada como liberada, mas o GitHub, visto de fora, ainda não responde ela (${ultimaResposta}). Confira a lista de Releases: a ${tag} precisa aparecer como "Latest".`,
  );
}

/**
 * @typedef {Dependencias & { obrigatorio: boolean }} Destino
 *   `obrigatorio`: a versão TEM que estar ali. Num destino não obrigatório (o
 *   endereço antigo), versão que não está lá é pulada, e não erro.
 */

/** A primeira versão publicada também no endereço novo (a de transição). */
export const PRIMEIRA_NO_ENDERECO_NOVO = "v0.9.51";

/**
 * Onde liberar cada versão, na ordem.
 *
 * - Da 0.9.51 em diante: o novo (obrigatório) e, se houver, o antigo (só se a
 *   versão estiver lá).
 * - Antes da 0.9.51: só o antigo, obrigatório. Essas versões nunca foram pro
 *   novo, e liberar uma delas no antigo é o jeito de **segurar** os
 *   computadores que ainda procuram lá, se a versão de transição sair ruim.
 *
 * @param {string} tag
 * @param {{ antigo: string }} enderecos  `antigo` vazio = a cópia parou
 * @returns {Array<{ repositorio: string, obrigatorio: boolean, chave: "versoes" | "codigo" }>}
 */
export function planejarDestinos(tag, { antigo }) {
  if (compararVersoes(tag, PRIMEIRA_NO_ENDERECO_NOVO) < 0) {
    if (!antigo) {
      throw new Error(
        `A ${tag} é de antes da ${PRIMEIRA_NO_ENDERECO_NOVO} e só existe no endereço antigo, que não recebe mais cópia. Nada foi liberado.`,
      );
    }
    return [{ repositorio: antigo, obrigatorio: true, chave: "codigo" }];
  }
  const destinos = [{ repositorio: ENDERECO_DAS_VERSOES, obrigatorio: true, chave: "versoes" }];
  if (antigo) destinos.push({ repositorio: antigo, obrigatorio: false, chave: "codigo" });
  return destinos;
}

/**
 * Libera a mesma versão em cada endereço, na ordem dada. O primeiro é o
 * obrigatório: se ele recusa, os outros nem são tocados.
 *
 * @param {string} pedido
 * @param {Destino[]} destinos
 * @returns {Promise<Array<{ repositorio: string, tag: string, devolvidasAoTeste: string[] }>>}
 */
export async function liberarNosEnderecos(pedido, destinos) {
  const tag = normalizarTag(pedido);
  const resultados = [];
  for (const destino of destinos) {
    const log = destino.log ?? ((m) => console.log(m));
    try {
      if (!destino.obrigatorio) {
        // Pela lista, e não pelo erro do `view`: um "Not Found" do
        // repositório inteiro (endereço errado, sem acesso) também diria "não
        // existe", e pular calado deixaria computador antigo sem a versão.
        const lista = JSON.parse(
          await destino.gh(["release", "list", "--limit", "1000", "--json", "tagName"]),
        );
        if (!lista.some((r) => r.tagName === tag)) {
          log(`${tag} não está em ${destino.repositorio}: nada a liberar lá.`);
          continue;
        }
      }
      const resultado = await liberarVersao(tag, destino);
      resultados.push({ repositorio: destino.repositorio, ...resultado });
    } catch (erro) {
      if (resultados.length === 0) throw erro;
      // Um endereço já mudou: dizer "nada foi liberado" seria mentira.
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      throw new Error(
        `A ${tag} JÁ FOI LIBERADA em ${resultados.map((r) => r.repositorio).join(", ")}, mas em ${destino.repositorio} deu erro: ${mensagem} Resolvido o problema, rode o Liberar de novo com a mesma versão (liberar duas vezes não estraga nada).`,
      );
    }
  }
  return resultados;
}

// --- Rodando de verdade (no workflow) ---------------------------------------

/**
 * Um `gh` preso a um repositório e a uma chave. Cada endereço tem a sua: o
 * novo usa a TOKEN_VERSOES (do cofre `lojas`), o antigo, o token automático.
 */
function ghPara(repositorio, token) {
  return (args) =>
    new Promise((resolve, reject) => {
      const comRepo = [...args, "--repo", repositorio];
      execFile(
        "gh",
        comRepo,
        { maxBuffer: 16 * 1024 * 1024, env: { ...process.env, GH_TOKEN: token } },
        (erro, saida, saidaDeErro) => {
          if (erro) reject(new Error(`gh ${comRepo.join(" ")}: ${saidaDeErro || erro.message}`));
          else resolve(saida);
        },
      );
    });
}

async function publicoDeVerdade(url, accept) {
  const resposta = await fetch(url, {
    headers: accept ? { Accept: accept } : {},
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  return { status: resposta.status, texto: await resposta.text() };
}

if (process.argv[1] && process.argv[1].endsWith("liberar-versao.mjs")) {
  const resumo = process.env.GITHUB_STEP_SUMMARY;
  try {
    const tag = normalizarTag(process.argv[2]);
    const plano = planejarDestinos(tag, { antigo: ENDERECO_ANTIGO });
    if (plano.some((d) => d.chave === "versoes") && !process.env.TOKEN_VERSOES) {
      throw new Error(
        `Falta a chave TOKEN_VERSOES no cofre "lojas": sem ela não dá pra mexer em ${ENDERECO_DAS_VERSOES}. Nada foi liberado.`,
      );
    }
    const chaves = {
      versoes: process.env.TOKEN_VERSOES ?? "",
      codigo: process.env.TOKEN_DO_CODIGO ?? "",
    };
    const resultados = await liberarNosEnderecos(
      tag,
      plano.map(({ repositorio, obrigatorio, chave }) => ({
        repositorio,
        obrigatorio,
        gh: ghPara(repositorio, chaves[chave]),
        publico: publicoDeVerdade,
      })),
    );
    if (resumo) {
      const { tag } = resultados[0];
      const linhas = [
        `### ✅ ${tag} liberada para todas as lojas`,
        "",
        "Os computadores no canal normal recebem esta versão na próxima vez que o programa for aberto.",
      ];
      for (const { repositorio, devolvidasAoTeste } of resultados) {
        linhas.push("", `- Liberada em \`${repositorio}\`.`);
        if (devolvidasAoTeste.length > 0) {
          linhas.push(`  Voltaram para o canal de teste lá: ${devolvidasAoTeste.join(", ")}.`);
        }
      }
      await appendFile(resumo, `${linhas.join("\n")}\n`);
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error(`::error::${mensagem}`);
    if (resumo) await appendFile(resumo, `### ❌ A liberação não terminou\n\n${mensagem}\n`);
    process.exit(1);
  }
}

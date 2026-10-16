// Avisa o Claude, UMA VEZ por sessão, quando a conversa passou do limite de tamanho.
// É o gatilho (hook) `UserPromptSubmit` do `.claude/settings.json` (item A3 de
// docs/jeito-de-trabalhar.md; tarefa #471).
//
// Por que existe: a cada mensagem o Claude relê a conversa inteira; sessão comprida gasta
// o limite de uso e trabalha pior. O combinado é uma sessão por assunto. Quando passa do
// limite, o aviso lembra o Claude de sugerir o `/fechar` (.claude/skills/fechar).
//
// Como mede: o Claude Code passa pelo gatilho o caminho do histórico da conversa
// (`transcript_path`). A última resposta do Claude nele traz quantos tokens a conversa
// tinha naquele momento; dividimos pelo tamanho da janela.
//
// Este gatilho nunca pode travar o trabalho: qualquer coisa estranha (entrada ilegível,
// histórico sumido, sem resposta ainda) → sai sem dizer nada e deixa seguir.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ── Pra mudar o limite, é AQUI (ou na variável de ambiente, só pra testar) ──────────────
/** A partir de quantos % da janela o aviso aparece. Combinado: começar com uns 35. */
export const LIMITE_PERCENTUAL = 35;
/** Tamanho da janela de contexto, em tokens. Se o app usar uma janela maior, mude aqui. */
export const JANELA_TOKENS = 1_000_000;

/** Tokens da conversa na última resposta do Claude (entrada + cache), ou null se não achou. */
export function tokensDaConversa(textoDoHistorico) {
  const linhas = String(textoDoHistorico).split("\n");
  for (let i = linhas.length - 1; i >= 0; i--) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    let item;
    try {
      item = JSON.parse(linha);
    } catch {
      continue;
    }
    const uso = item?.message?.usage;
    if (item?.type !== "assistant" || !uso) continue;
    const total =
      (Number(uso.input_tokens) || 0) +
      (Number(uso.cache_read_input_tokens) || 0) +
      (Number(uso.cache_creation_input_tokens) || 0);
    if (total > 0) return total;
  }
  return null;
}

export function passouDoLimite(tokens, { limitePercentual, janelaTokens }) {
  return tokens !== null && (tokens / janelaTokens) * 100 >= limitePercentual;
}

export function mensagemDeAviso(percentual) {
  return (
    `AVISO AUTOMÁTICO (gatilho de conversa comprida): esta conversa já está em cerca de ${percentual}% ` +
    `do contexto. O combinado da Sofia é uma sessão por assunto. Na sua PRÓXIMA resposta, depois de ` +
    `responder o que ela pediu, sugira em uma ou duas frases, em português simples, fechar com o ` +
    `/fechar e abrir uma sessão nova. É só uma sugestão: se ela quiser seguir, siga, e não repita o aviso.`
  );
}

function lerEntrada() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

export function principal({
  entrada,
  limitePercentual = LIMITE_PERCENTUAL,
  janelaTokens = JANELA_TOKENS,
  pastaDeMarcas = join(tmpdir(), "ssace-aviso-conversa-comprida"),
} = {}) {
  const sessao = String(entrada?.session_id ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  const caminho = entrada?.transcript_path;
  if (!sessao || typeof caminho !== "string" || !existsSync(caminho)) return null;

  const marca = join(pastaDeMarcas, sessao);
  if (existsSync(marca)) return null; // já avisou nesta sessão

  let tokens;
  try {
    tokens = tokensDaConversa(readFileSync(caminho, "utf8"));
  } catch {
    return null;
  }
  if (!passouDoLimite(tokens, { limitePercentual, janelaTokens })) return null;

  try {
    mkdirSync(pastaDeMarcas, { recursive: true });
    writeFileSync(marca, new Date().toISOString());
  } catch {
    return null; // sem como lembrar que avisou, melhor calar do que repetir a cada mensagem
  }
  return mensagemDeAviso(Math.round((tokens / janelaTokens) * 100));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Variáveis só pra testar com o limite baixado de propósito; sem elas valem as constantes.
  const limite = Number(process.env.SSACE_AVISO_LIMITE_PERCENTUAL);
  const janela = Number(process.env.SSACE_AVISO_JANELA_TOKENS);
  const texto = principal({
    entrada: lerEntrada(),
    ...(limite > 0 ? { limitePercentual: limite } : {}),
    ...(janela > 0 ? { janelaTokens: janela } : {}),
    ...(process.env.SSACE_AVISO_PASTA ? { pastaDeMarcas: process.env.SSACE_AVISO_PASTA } : {}),
  });
  if (texto) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: texto },
      }),
    );
  }
}

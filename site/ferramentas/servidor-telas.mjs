import { spawn } from "node:child_process";
import { setTimeout as esperar } from "node:timers/promises";
import { BASE } from "./percorrer-telas.mjs";

// Sobe o servidor de telas (o app num navegador comum, com o Supabase de
// mentira), roda `fazer` e derruba o servidor no fim, aconteça o que
// acontecer. É o que as varreduras que abrem o app de verdade têm em comum:
// a de contraste (scripts/varredura-contraste-dom.mjs) e a de largura
// (scripts/varredura-largura-telas.mjs).
//
// Não precisa de .env: as variáveis do Supabase de mentira vão direto pro
// processo do vite (Vite expõe qualquer VITE_* que esteja no ambiente). Sem
// isso, a varredura herdaria as duas armadilhas conhecidas do gerador de
// telas — app abrindo na tela de conexão, e hostname que vaza pra rede de
// verdade (docs/licoes.md, itens 53 e 56).

async function respondendo() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

/**
 * @param {() => Promise<number>} fazer  devolve o código de saída
 * @returns {Promise<number>} o código de saída de `fazer`, ou 1 se o servidor não subiu
 */
export async function comServidorDeTelas(fazer) {
  // Se a porta JÁ estiver ocupada, a varredura não sobe servidor nenhum (o
  // config usa strictPort) e passaria a medir as telas servidas por um
  // estranho — tipicamente um `npm run dev` esquecido aberto, ou o servidor
  // de uma rodada anterior que não morreu. Isso não dá erro em lugar nenhum:
  // as telas até abrem, mas sem as variáveis do Supabase de mentira o app
  // esconde os botões de cadastrar, e 36 das 54 cenas "falham" com um timeout
  // que não sugere a causa em nada. Aconteceu de verdade ao construir a
  // varredura de contraste — é o primo do item 56. Melhor parar e dizer o que
  // fazer.
  if (await respondendo()) {
    console.error(
      `Já tem alguma coisa respondendo em ${BASE}.\n` +
        "Feche esse servidor antes de rodar a varredura (ela precisa subir o\n" +
        "dela, com o Supabase de mentira configurado).",
    );
    return 1;
  }

  // `detached` + matar o GRUPO no fim: o `npx` é só um intermediário, e matar
  // ele deixaria o vite de verdade vivo segurando a porta pra próxima rodada.
  const servidor = spawn(
    "npx",
    ["vite", "--config", "site/ferramentas/vite.telas.config.ts", "--logLevel", "warn"],
    {
      stdio: "inherit",
      detached: true,
      env: {
        ...process.env,
        VITE_SUPABASE_URL: "https://demo.supabase.co",
        VITE_SUPABASE_ANON_KEY: "chave-de-mentira",
      },
    },
  );

  function encerrarServidor() {
    try {
      process.kill(-servidor.pid, "SIGTERM");
    } catch {
      servidor.kill();
    }
  }

  try {
    let subiu = false;
    for (let tentativa = 0; tentativa < 60 && !subiu; tentativa++) {
      subiu = await respondendo();
      if (!subiu) await esperar(500);
    }
    if (!subiu) {
      console.error("O servidor de telas não subiu em 30s.");
      return 1;
    }
    return await fazer();
  } finally {
    encerrarServidor();
  }
}

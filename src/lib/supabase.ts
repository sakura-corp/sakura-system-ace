import { createClient } from "@supabase/supabase-js";
import { conexaoAtual } from "./conexao";
import { ehErroDeRede } from "./errors";

export type EstadoDaRede = "falhou" | "respondeu";

const ouvintesDaRede = new Set<(estado: EstadoDaRede) => void>();

/**
 * Avisa quando um pedido ao Supabase desistiu por queda de rede ("falhou") ou
 * recebeu qualquer resposta do servidor, até um erro 500 ("respondeu": a rede
 * está de pé). Devolve a função que cancela o aviso.
 */
export function aoMudarARede(ouvinte: (estado: EstadoDaRede) => void): () => void {
  ouvintesDaRede.add(ouvinte);
  return () => {
    ouvintesDaRede.delete(ouvinte);
  };
}

function avisar(estado: EstadoDaRede) {
  for (const ouvinte of [...ouvintesDaRede]) {
    // Um ouvinte com defeito não pode derrubar o pedido de quem chamou.
    try {
      ouvinte(estado);
    } catch (erro) {
      console.error("Ouvinte da rede falhou:", erro);
    }
  }
}

// #374: quanto esperar antes de cada nova tentativa de uma leitura que caiu.
const ESPERAS_ENTRE_TENTATIVAS_MS = [1000, 2000, 4000];

const esperarDeVerdade = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms));

/**
 * Quanto uma LEITURA espera o servidor começar a responder antes de desistir
 * como queda de rede (#374, teste no PC em 11/11): com o cabo tirado, o
 * Windows nem sempre avisa a queda (placas de rede virtuais, de VPN ou de
 * acesso remoto, continuam "ligadas"), e o pedido ficava pendurado por
 * minutos, com a tela em "Carregando...". Conta só até chegar a resposta
 * (os cabeçalhos), não o download do corpo: um PDF grande numa internet lenta
 * não é cortado. Quando a rede já caiu, a espera é curta, pra a frase de sem
 * conexão aparecer logo (o postgrest-js tenta 4 vezes).
 */
export const TEMPO_LIMITE_LEITURA_MS = 15_000;
export const TEMPO_LIMITE_LEITURA_COM_A_REDE_CAIDA_MS = 4_000;

/**
 * Faz a leitura com tempo limite. Estourou: cancela o pedido e lança o mesmo
 * TypeError de uma queda de rede, pra quem chamou (e o postgrest-js) tratar
 * igual. Se foi QUEM CHAMOU que cancelou, o cancelamento passa como veio.
 */
async function lerComTempoLimite(
  fetchBase: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  limiteMs: number,
): Promise<Response> {
  const controle = new AbortController();
  const deQuemChamou = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  if (deQuemChamou?.aborted) controle.abort(deQuemChamou.reason);
  const repassar = () => controle.abort(deQuemChamou?.reason);
  // Fica ligado depois da resposta: quem chamou cancelando durante a leitura
  // do corpo (o `.text()` do postgrest-js, o `.blob()` do Storage) ainda corta
  // o download, como fazia antes do tempo limite (revisão da Sofia, 11/11).
  // Sai só no erro, quando não há mais corpo pra cortar.
  deQuemChamou?.addEventListener("abort", repassar, { once: true });
  let estourou = false;
  const relogio = setTimeout(() => {
    estourou = true;
    controle.abort();
  }, limiteMs);
  try {
    return await fetchBase(input, { ...init, signal: controle.signal });
  } catch (erro) {
    deQuemChamou?.removeEventListener("abort", repassar);
    if (estourou) throw new TypeError("Failed to fetch");
    throw erro;
  } finally {
    clearTimeout(relogio);
  }
}

function metodoDoPedido(input: RequestInfo | URL, init?: RequestInit): string {
  const metodo = init?.method || (input instanceof Request ? input.method : "") || "GET";
  return metodo.toUpperCase();
}

function enderecoDoPedido(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * O fetch que o cliente do Supabase usa (#374). Quando a internet da loja cai
 * por uns segundos, repete sozinho **só leitura** (GET/HEAD) que falhou por
 * rede: até 3 vezes, esperando 1 s, 2 s e 4 s.
 *
 * **Gravação nunca é repetida** (POST/PATCH/PUT/DELETE, e o `rpc`, que é
 * POST): se o pedido chegou ao banco e só a resposta se perdeu, repetir
 * gravaria de novo — uma venda ou um pagamento em dobro. Ela falha na hora e
 * a tela mostra a frase de sem conexão (`mensagemDeErro`).
 *
 * As leituras do banco (`/rest/v1/`, o `.from().select()`) também não são
 * repetidas AQUI: o postgrest-js (desde a 2.x; conferido na 2.110.9) já repete
 * sozinho GET/HEAD que caem por rede, 3 vezes com 1 s, 2 s e 4 s. Se as duas
 * camadas repetissem, cada leitura seria tentada 4 × 4 = 16 vezes, e a tela
 * ficaria quase meio minuto parada antes de avisar. Esta camada cobre o resto:
 * arquivos (storage), login (auth) e funções.
 *
 * Cancelamento (AbortError) nunca é repetido nem conta como queda.
 */
export function criarFetchDoPrograma(
  fetchBase: typeof fetch,
  esperar: (ms: number) => Promise<void> = esperarDeVerdade,
): typeof fetch {
  // A última notícia da rede, só pra escolher o tempo limite da leitura.
  let redeCaiu = false;
  return async (input, init) => {
    const ehLeitura = ["GET", "HEAD"].includes(metodoDoPedido(input, init));
    const repete = ehLeitura && !enderecoDoPedido(input).includes("/rest/v1/");
    for (let tentativa = 0; ; tentativa++) {
      try {
        // Gravação nunca tem tempo limite: cancelar no meio não desfaz o que
        // talvez já chegou ao banco, e a tela diria "não salvou" sem saber.
        const caiu = redeCaiu || (typeof navigator !== "undefined" && navigator.onLine === false);
        const resposta = ehLeitura
          ? await lerComTempoLimite(
              fetchBase,
              input,
              init,
              caiu ? TEMPO_LIMITE_LEITURA_COM_A_REDE_CAIDA_MS : TEMPO_LIMITE_LEITURA_MS,
            )
          : await fetchBase(input, init);
        redeCaiu = false;
        avisar("respondeu");
        return resposta;
      } catch (erro) {
        if (!ehErroDeRede(erro)) throw erro;
        if (!repete || tentativa >= ESPERAS_ENTRE_TENTATIVAS_MS.length) {
          redeCaiu = true;
          avisar("falhou");
          throw erro;
        }
        await esperar(ESPERAS_ENTRE_TENTATIVAS_MS[tentativa]);
      }
    }
  };
}

// Qual empresa/banco este computador usa é decidido em `conexao.ts` — em
// desenvolvimento vem do `.env`, no app instalado vem do que foi digitado na
// tela de configuração e guardado nesta máquina.
const conexao = conexaoAtual();

// Só o `AuthContext` usa isto: ele roda antes do portão do `App.tsx` (inclusive
// com a tela de Conexão aberta) e não deve tentar login sem conexão. As telas
// não precisam conferir: sem conexão, o `App.tsx` mostra só a tela de Conexão.
export const isSupabaseConfigured = conexao !== null;

// O cliente precisa existir sempre (todo `lib/*.ts` importa esse módulo), mesmo
// antes de alguém configurar a conexão — sem conexão o app mostra a tela de
// configuração e nunca chega a usar esse cliente de mentira.
export const supabase = createClient(
  conexao?.url || "https://placeholder.supabase.co",
  conexao?.chave || "placeholder-anon-key",
  {
    // Sem persistir sessão: cada vez que o app abre, pede login de novo — a
    // pedido do usuário, já que o programa costuma ficar aberto o dia
    // inteiro (não é algo que se fecha e reabre com frequência).
    auth: { persistSession: false },
    // O `fetch` global é chamado na hora de cada pedido (não guardado quando
    // o módulo carrega), pra os testes poderem trocá-lo.
    global: { fetch: criarFetchDoPrograma((...args) => fetch(...args)) },
  },
);

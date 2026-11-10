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
  return async (input, init) => {
    const ehLeitura = ["GET", "HEAD"].includes(metodoDoPedido(input, init));
    const repete = ehLeitura && !enderecoDoPedido(input).includes("/rest/v1/");
    for (let tentativa = 0; ; tentativa++) {
      try {
        const resposta = await fetchBase(input, init);
        avisar("respondeu");
        return resposta;
      } catch (erro) {
        if (!ehErroDeRede(erro)) throw erro;
        if (!repete || tentativa >= ESPERAS_ENTRE_TENTATIVAS_MS.length) {
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

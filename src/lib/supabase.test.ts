// #374: a internet da loja cai por uns segundos (o roteador reinicia) e a
// tela já mostrava erro. A regra decidida na tarefa: só LEITURA (GET/HEAD) que
// falhou por rede é repetida sozinha, até 3 vezes, esperando 1 s, 2 s e 4 s.
// GRAVAÇÃO nunca (POST/PATCH/PUT/DELETE, e o `rpc`, que é POST): se o pedido
// chegou ao banco e só a resposta se perdeu, repetir gravaria duas vezes —
// uma venda, um pagamento em dobro.
//
// O postgrest-js (2.110.9) já repete sozinho as leituras do `/rest/v1/`.
// Estes testes provam também que as duas repetições não se somam: uma
// leitura com a rede caída é tentada 4 vezes, não 16.
import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MENSAGEM_SEM_CONEXAO, mensagemDeErro } from "./errors";

const { conexaoAtual } = vi.hoisted(() => ({
  conexaoAtual: vi.fn(() => ({ url: "https://exemplo.supabase.co", chave: "chave-de-mentira" })),
}));
vi.mock("./conexao", () => ({ conexaoAtual }));

import { aoMudarARede, criarFetchDoPrograma, supabase } from "./supabase";

const URL_BASE = "https://exemplo.supabase.co";
const CHAVE = "chave-de-mentira";
const ARQUIVO = `${URL_BASE}/storage/v1/object/notas/nota.pdf`;

type FetchDeMentira = ReturnType<typeof vi.fn<typeof fetch>>;

/** Um fetch com a rede caída: toda chamada lança o TypeError do navegador. */
function redeCaida(): FetchDeMentira {
  return vi.fn<typeof fetch>(async () => {
    throw new TypeError("Failed to fetch");
  });
}

/** Anota quanto cada espera pediu, sem esperar de verdade. */
function esperasAnotadas() {
  const esperas: number[] = [];
  const esperar = async (ms: number) => {
    esperas.push(ms);
  };
  return { esperas, esperar };
}

const cancelarOuvintes: (() => void)[] = [];
function ouvir() {
  const estados: string[] = [];
  cancelarOuvintes.push(aoMudarARede((estado) => estados.push(estado)));
  return estados;
}

afterEach(() => {
  while (cancelarOuvintes.length) cancelarOuvintes.pop()?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("criarFetchDoPrograma: o que repete", () => {
  it("leitura (GET) de arquivo que falha por rede é tentada 4 vezes, esperando 1 s, 2 s e 4 s", async () => {
    const fetchBase = redeCaida();
    const { esperas, esperar } = esperasAnotadas();
    const meuFetch = criarFetchDoPrograma(fetchBase, esperar);

    await expect(meuFetch(ARQUIVO)).rejects.toThrow("Failed to fetch");
    expect(fetchBase).toHaveBeenCalledTimes(4);
    expect(esperas).toEqual([1000, 2000, 4000]);
  });

  it("HEAD também é leitura: 4 vezes", async () => {
    const fetchBase = redeCaida();
    const { esperas, esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO, { method: "HEAD" })).rejects.toThrow();
    expect(fetchBase).toHaveBeenCalledTimes(4);
    expect(esperas).toEqual([1000, 2000, 4000]);
  });

  it("o método também vem do Request, quando não vem no init", async () => {
    const leitura = redeCaida();
    const gravacao = redeCaida();
    const { esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(leitura, esperar)(new Request(ARQUIVO))).rejects.toThrow();
    await expect(
      criarFetchDoPrograma(gravacao, esperar)(new Request(ARQUIVO, { method: "POST", body: "x" })),
    ).rejects.toThrow();
    expect(leitura).toHaveBeenCalledTimes(4);
    expect(gravacao).toHaveBeenCalledTimes(1);
  });

  it.each(["POST", "PATCH", "PUT", "DELETE", "post"])("gravação (%s) nunca é repetida", async (metodo) => {
    const fetchBase = redeCaida();
    const { esperas, esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO, { method: metodo })).rejects.toThrow(
      "Failed to fetch",
    );
    expect(fetchBase).toHaveBeenCalledTimes(1);
    expect(esperas).toEqual([]);
  });

  it("leitura do /rest/v1/ não é repetida aqui: quem repete é o postgrest-js", async () => {
    const fetchBase = redeCaida();
    const { esperas, esperar } = esperasAnotadas();
    await expect(
      criarFetchDoPrograma(fetchBase, esperar)(`${URL_BASE}/rest/v1/clientes?select=*`),
    ).rejects.toThrow();
    expect(fetchBase).toHaveBeenCalledTimes(1);
    expect(esperas).toEqual([]);
  });

  it("leitura que falha 2 vezes e depois responde devolve a resposta", async () => {
    const resposta = new Response("ok", { status: 200 });
    const fetchBase = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(resposta);
    const { esperas, esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO)).resolves.toBe(resposta);
    expect(fetchBase).toHaveBeenCalledTimes(3);
    expect(esperas).toEqual([1000, 2000]);
  });

  it("cancelamento (AbortError) não é repetido", async () => {
    const cancelado = new DOMException("This operation was aborted", "AbortError");
    const fetchBase = vi.fn<typeof fetch>().mockRejectedValue(cancelado);
    const { esperas, esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO)).rejects.toBe(cancelado);
    expect(fetchBase).toHaveBeenCalledTimes(1);
    expect(esperas).toEqual([]);
  });

  it("erro que não é de rede não é repetido", async () => {
    const outro = new TypeError("Invalid URL");
    const fetchBase = vi.fn<typeof fetch>().mockRejectedValue(outro);
    const { esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO)).rejects.toBe(outro);
    expect(fetchBase).toHaveBeenCalledTimes(1);
  });

  it("resposta de erro do servidor (500) é resposta: devolve sem repetir", async () => {
    const resposta = new Response("erro", { status: 500 });
    const fetchBase = vi.fn<typeof fetch>().mockResolvedValue(resposta);
    const { esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO)).resolves.toBe(resposta);
    expect(fetchBase).toHaveBeenCalledTimes(1);
  });
});

// Ponta a ponta, com o cliente de verdade do Supabase por cima: é aqui que se
// vê a soma das duas repetições (a nossa e a do postgrest-js).
function clienteDeVerdade(fetchBase: FetchDeMentira) {
  return createClient(URL_BASE, CHAVE, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: criarFetchDoPrograma(fetchBase, async () => {}) },
  });
}

describe("com o cliente de verdade do Supabase", () => {
  let fetchBase: FetchDeMentira;
  let cliente: ReturnType<typeof clienteDeVerdade>;

  beforeEach(() => {
    // As esperas do postgrest-js (setTimeout de 1 s, 2 s e 4 s) passam no relógio de mentira.
    vi.useFakeTimers();
    fetchBase = redeCaida();
    cliente = clienteDeVerdade(fetchBase);
  });

  /** Dispara o pedido, passa o relógio de mentira e devolve o resultado. */
  async function comARedeCaida<T>(pedido: PromiseLike<T>): Promise<T> {
    const resultado = Promise.resolve(pedido);
    await vi.advanceTimersByTimeAsync(60_000);
    return resultado;
  }

  it("leitura (.select) é tentada 4 vezes no total, e não 16, e a tela lê a frase de sem conexão", async () => {
    const { error } = await comARedeCaida(cliente.from("clientes").select());
    expect(fetchBase).toHaveBeenCalledTimes(4);
    expect(mensagemDeErro(error)).toBe(MENSAGEM_SEM_CONEXAO);
  });

  it(".insert é tentado 1 vez só", async () => {
    const { error } = await comARedeCaida(cliente.from("clientes").insert({ nome: "Cliente de teste" }));
    expect(fetchBase).toHaveBeenCalledTimes(1);
    expect(mensagemDeErro(error)).toBe(MENSAGEM_SEM_CONEXAO);
  });

  it(".update é tentado 1 vez só", async () => {
    await comARedeCaida(cliente.from("clientes").update({ nome: "Outro" }).eq("id", "1"));
    expect(fetchBase).toHaveBeenCalledTimes(1);
  });

  it(".delete é tentado 1 vez só", async () => {
    await comARedeCaida(cliente.from("clientes").delete().eq("id", "1"));
    expect(fetchBase).toHaveBeenCalledTimes(1);
  });

  it(".rpc é tentado 1 vez só (é POST: pode gravar)", async () => {
    await comARedeCaida(cliente.rpc("x"));
    expect(fetchBase).toHaveBeenCalledTimes(1);
  });

  it("baixar arquivo (storage, GET) é tentado 4 vezes; enviar arquivo, 1 vez", async () => {
    const baixar = await comARedeCaida(cliente.storage.from("notas").download("nota.pdf"));
    expect(fetchBase).toHaveBeenCalledTimes(4);
    expect(mensagemDeErro(baixar.error)).toBe(MENSAGEM_SEM_CONEXAO);

    fetchBase.mockClear();
    await comARedeCaida(cliente.storage.from("notas").upload("nova.pdf", new Blob(["x"])));
    expect(fetchBase).toHaveBeenCalledTimes(1);
  });
});

describe("aoMudarARede", () => {
  it('avisa "falhou" uma vez, quando desiste da leitura', async () => {
    const estados = ouvir();
    const { esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(redeCaida(), esperar)(ARQUIVO)).rejects.toThrow();
    expect(estados).toEqual(["falhou"]);
  });

  it('avisa "falhou" quando a gravação cai (sem repetir)', async () => {
    const estados = ouvir();
    const { esperar } = esperasAnotadas();
    await expect(criarFetchDoPrograma(redeCaida(), esperar)(ARQUIVO, { method: "POST" })).rejects.toThrow();
    expect(estados).toEqual(["falhou"]);
  });

  it('avisa "respondeu" a qualquer resposta, até 500', async () => {
    const estados = ouvir();
    const { esperar } = esperasAnotadas();
    const fetchBase = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))
      .mockResolvedValueOnce(new Response("erro", { status: 500 }));
    const meuFetch = criarFetchDoPrograma(fetchBase, esperar);
    await meuFetch(ARQUIVO);
    await meuFetch(ARQUIVO, { method: "POST" });
    expect(estados).toEqual(["respondeu", "respondeu"]);
  });

  it('leitura que volta depois de cair só avisa "respondeu"', async () => {
    const estados = ouvir();
    const { esperar } = esperasAnotadas();
    const fetchBase = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("ok"));
    await criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO);
    expect(estados).toEqual(["respondeu"]);
  });

  it('cancelamento (AbortError) não avisa "falhou"', async () => {
    const estados = ouvir();
    const { esperar } = esperasAnotadas();
    const fetchBase = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("This operation was aborted", "AbortError"));
    await expect(criarFetchDoPrograma(fetchBase, esperar)(ARQUIVO)).rejects.toThrow();
    expect(estados).toEqual([]);
  });

  it("ouvinte que lança não quebra o pedido, e os outros ouvintes recebem", async () => {
    cancelarOuvintes.push(
      aoMudarARede(() => {
        throw new Error("ouvinte com defeito");
      }),
    );
    const estados = ouvir();
    const resposta = new Response("ok");
    const { esperar } = esperasAnotadas();
    await expect(
      criarFetchDoPrograma(vi.fn<typeof fetch>().mockResolvedValue(resposta), esperar)(ARQUIVO),
    ).resolves.toBe(resposta);
    expect(estados).toEqual(["respondeu"]);
  });

  it("depois de cancelar, o ouvinte não recebe mais", async () => {
    const estados: string[] = [];
    const cancelar = aoMudarARede((estado) => estados.push(estado));
    cancelar();
    const { esperar } = esperasAnotadas();
    await criarFetchDoPrograma(vi.fn<typeof fetch>().mockResolvedValue(new Response("ok")), esperar)(ARQUIVO);
    expect(estados).toEqual([]);
  });
});

// O cliente do programa (`supabase`) usa a regra, e chama o fetch global na
// hora do pedido (não guarda a referência de quando o módulo carregou).
describe("o cliente do programa", () => {
  it("repete a leitura de arquivo e não repete a gravação", async () => {
    vi.useFakeTimers();
    const fetchBase = redeCaida();
    vi.stubGlobal("fetch", fetchBase);

    const baixar = supabase.storage.from("notas").download("nota.pdf").then((r) => r);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mensagemDeErro((await baixar).error)).toBe(MENSAGEM_SEM_CONEXAO);
    expect(fetchBase).toHaveBeenCalledTimes(4);

    fetchBase.mockClear();
    const gravar = supabase.from("clientes").insert({ nome: "Cliente de teste" }).then((r) => r);
    await vi.advanceTimersByTimeAsync(60_000);
    await gravar;
    expect(fetchBase).toHaveBeenCalledTimes(1);
  });
});

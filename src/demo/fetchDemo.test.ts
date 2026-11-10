import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { ENDERECO_DEMO, fetchDemo } from "./fetchDemo";

// O modo demonstração não pode falar com rede nenhuma. Aqui o `fetch` de
// verdade é trocado por um que reprova o teste se for chamado: tudo que vai
// pro endereço de demonstração tem de ser respondido da memória.
const fetchDeVerdade = vi.fn(async (): Promise<Response> => {
  throw new Error("saiu pra rede");
});

beforeEach(() => {
  vi.stubGlobal("fetch", fetchDeVerdade);
  fetchDeVerdade.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

const novoCliente = () =>
  createClient(ENDERECO_DEMO, "demo", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchDemo },
  });

describe("fetch de demonstração", () => {
  it("o login aceita qualquer usuário", async () => {
    const { data, error } = await novoCliente().auth.signInWithPassword({ email: "x@y.z", password: "qualquer" });
    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
    expect(fetchDeVerdade).not.toHaveBeenCalled();
  });

  it("lista com filtro e ordem", async () => {
    const { data, error } = await novoCliente()
      .from("clientes")
      .select("*")
      .in("id", ["c1", "c3", "c2"])
      .order("nome", { ascending: false });
    expect(error).toBeNull();
    const nomes = (data ?? []).map((c) => c.nome as string);
    expect(nomes.length).toBe(3);
    expect(nomes).toEqual([...nomes].sort().reverse());
    expect(fetchDeVerdade).not.toHaveBeenCalled();
  });

  it("maybeSingle devolve um objeto", async () => {
    const { data } = await novoCliente().from("clientes").select("*").eq("id", "c1").maybeSingle();
    expect(data?.id).toBe("c1");
  });

  it("rpc responde", async () => {
    const { data, error } = await novoCliente().rpc("loja_tem_token_focus_nfe");
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  // Sem esta função, o "Confirmar emissão" da nota saía calado (sem cliente)
  // em vez de mostrar o aviso de que nota não sai na demonstração.
  it("rpc cliente_e_veiculo_da_ordem devolve o cliente e o veículo da OS", async () => {
    const { data: ordem } = await novoCliente()
      .from("ordens_servico")
      .select("*")
      .eq("numero", 146)
      .maybeSingle();
    const { data, error } = await novoCliente().rpc("cliente_e_veiculo_da_ordem", {
      p_ordem_id: ordem.id,
    });
    expect(error).toBeNull();
    expect(data?.cliente?.id).toBe(ordem.cliente_id);
    expect(data?.cliente?.nome).toBeTruthy();
    if (ordem.veiculo_id) expect(data?.veiculo?.id).toBe(ordem.veiculo_id);
  });

  it("a nota fiscal diz que não sai no modo demonstração", async () => {
    const { error } = await novoCliente().functions.invoke("focus-nfe", { body: {} });
    expect(error).toBeTruthy();
    const corpo = await (error as unknown as { context: Response }).context.json();
    expect(corpo.erro).toBe("No modo demonstração não sai nota.");
    expect(corpo.motivo).toBe("demonstracao");
  });

  it("o que se grava aparece na leitura seguinte", async () => {
    const c = novoCliente();
    const { error } = await c.from("clientes").insert({ nome: "Cliente de Teste Gravado" });
    expect(error).toBeNull();
    const { data } = await c.from("clientes").select("*").eq("nome", "Cliente de Teste Gravado");
    expect(data?.length).toBe(1);
    expect(data?.[0].id).toBeTruthy();
    expect(data?.[0].criado_em).toBeTruthy();
    // e dá pra alterar e apagar
    await c.from("clientes").update({ nome: "Mudou" }).eq("id", data![0].id);
    const { data: depois } = await c.from("clientes").select("*").eq("id", data![0].id).single();
    expect(depois?.nome).toBe("Mudou");
    await c.from("clientes").delete().eq("id", data![0].id);
    const { data: fim } = await c.from("clientes").select("*").eq("id", data![0].id);
    expect(fim).toEqual([]);
    // o filtro vale: só a linha apagada saiu, as outras seguem lá
    const { data: restantes } = await c.from("clientes").select("*").eq("id", "c1");
    expect(restantes?.length).toBe(1);
  });

  it("o total com head:true é o de antes da paginação", async () => {
    const c = novoCliente();
    const { count, data } = await c.from("clientes").select("*", { count: "exact", head: true });
    expect(data).toBeNull();
    const { data: pagina, count: total } = await c
      .from("clientes")
      .select("*", { count: "exact" })
      .range(0, 1);
    expect(pagina?.length).toBe(2);
    expect(count).toBeGreaterThan(2);
    expect(total).toBe(count);
  });

  it("endereço de fora vai pra rede de verdade", async () => {
    fetchDeVerdade.mockResolvedValueOnce(new Response("{}"));
    await fetchDemo("https://viacep.com.br/ws/14800000/json/");
    expect(fetchDeVerdade).toHaveBeenCalledTimes(1);
  });
});

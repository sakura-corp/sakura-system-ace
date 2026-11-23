/**
 * O atendimento e a garantia dos serviços da loja (#1033, migration 0088):
 * tudo vazio apaga a linha; senão grava (upsert por loja) e carimba a hora.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Chamada =
  | { tipo: "delete"; tabela: string; coluna: string; valor: unknown }
  | { tipo: "upsert"; tabela: string; linha: Record<string, unknown>; opcoes: unknown }
  | { tipo: "select"; tabela: string; colunas: string; coluna: string; valor: unknown };

const estado = vi.hoisted(() => ({
  chamadas: [] as Chamada[],
  resposta: { data: null as unknown, error: null as unknown },
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: (tabela: string) => ({
      delete: () => ({
        eq: async (coluna: string, valor: unknown) => {
          estado.chamadas.push({ tipo: "delete", tabela, coluna, valor });
          return { error: estado.resposta.error };
        },
      }),
      upsert: async (linha: Record<string, unknown>, opcoes: unknown) => {
        estado.chamadas.push({ tipo: "upsert", tabela, linha, opcoes });
        return { error: estado.resposta.error };
      },
      select: (colunas: string) => ({
        eq: (coluna: string, valor: unknown) => ({
          maybeSingle: async () => {
            estado.chamadas.push({ tipo: "select", tabela, colunas, coluna, valor });
            return estado.resposta;
          },
        }),
      }),
    }),
  },
}));

const { buscarConfiguracaoAtendimento, salvarConfiguracaoAtendimento } = await import("./configuracoes");

beforeEach(() => {
  estado.chamadas.length = 0;
  estado.resposta = { data: null, error: null };
});

describe("salvarConfiguracaoAtendimento", () => {
  it("grava por loja, com a hora de atualização", async () => {
    await salvarConfiguracaoAtendimento("loja-1", {
      whatsapp: "16955500199",
      horario_funcionamento: "Seg a sex, 8h às 18h",
      garantia_servico_dias: 90,
    });
    const c = estado.chamadas[0];
    expect(estado.chamadas).toHaveLength(1);
    if (c.tipo !== "upsert") throw new Error("esperava upsert");
    expect(c.tabela).toBe("configuracoes_atendimento");
    expect(c.linha).toMatchObject({
      loja_id: "loja-1",
      whatsapp: "16955500199",
      horario_funcionamento: "Seg a sex, 8h às 18h",
      garantia_servico_dias: 90,
    });
    expect(typeof c.linha.atualizado_em).toBe("string");
    expect(c.opcoes).toEqual({ onConflict: "loja_id" });
  });

  it("grava mesmo com só um dos campos", async () => {
    await salvarConfiguracaoAtendimento("loja-1", { whatsapp: null, horario_funcionamento: null, garantia_servico_dias: 30 });
    expect(estado.chamadas[0].tipo).toBe("upsert");
  });

  it("tudo vazio apaga a linha da loja", async () => {
    await salvarConfiguracaoAtendimento("loja-1", { whatsapp: null, horario_funcionamento: null, garantia_servico_dias: null });
    expect(estado.chamadas).toEqual([
      { tipo: "delete", tabela: "configuracoes_atendimento", coluna: "loja_id", valor: "loja-1" },
    ]);
  });

  it("lança o erro do banco", async () => {
    estado.resposta = { data: null, error: new Error("ruim") };
    await expect(
      salvarConfiguracaoAtendimento("loja-1", { whatsapp: null, horario_funcionamento: null, garantia_servico_dias: 5 }),
    ).rejects.toThrow("ruim");
    await expect(
      salvarConfiguracaoAtendimento("loja-1", { whatsapp: null, horario_funcionamento: null, garantia_servico_dias: null }),
    ).rejects.toThrow("ruim");
  });
});

describe("buscarConfiguracaoAtendimento", () => {
  it("lê as colunas explícitas da loja", async () => {
    const linha = { loja_id: "loja-1", whatsapp: "16955500199", horario_funcionamento: null, garantia_servico_dias: 90 };
    estado.resposta = { data: linha, error: null };
    expect(await buscarConfiguracaoAtendimento("loja-1")).toEqual(linha);
    expect(estado.chamadas[0]).toEqual({
      tipo: "select",
      tabela: "configuracoes_atendimento",
      colunas: "loja_id, whatsapp, horario_funcionamento, garantia_servico_dias",
      coluna: "loja_id",
      valor: "loja-1",
    });
  });
  it("sem linha devolve null", async () => {
    expect(await buscarConfiguracaoAtendimento("loja-1")).toBeNull();
  });
  it("lança o erro (quem chama decide)", async () => {
    estado.resposta = { data: null, error: new Error("sem rede") };
    await expect(buscarConfiguracaoAtendimento("loja-1")).rejects.toThrow("sem rede");
  });
});

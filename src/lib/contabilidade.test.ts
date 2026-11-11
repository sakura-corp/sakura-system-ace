/**
 * O contato da contabilidade da loja (#383, migration 0085). A tela manda o
 * que a pessoa digitou; a lib limpa (o WhatsApp vira só dígitos, vazio vira
 * `null`) e decide: contato que não serve pra nada (sem nome, ou sem WhatsApp
 * e sem e-mail) é linha apagada, não linha gravada pela metade.
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

const { buscarContatoContabilidade, salvarContatoContabilidade } = await import("./contabilidade");

beforeEach(() => {
  estado.chamadas.length = 0;
  estado.resposta = { data: null, error: null };
});

describe("salvarContatoContabilidade", () => {
  it("grava o WhatsApp só com os dígitos, e o resto sem espaço nas pontas", async () => {
    await salvarContatoContabilidade("loja-1", {
      nome: "  Escritório Exemplo  ",
      whatsapp: " (16) 99999-0000 ",
      email: "  contato@exemplo.com.br ",
    });
    expect(estado.chamadas).toHaveLength(1);
    const c = estado.chamadas[0];
    expect(c.tipo).toBe("upsert");
    if (c.tipo !== "upsert") return;
    expect(c.tabela).toBe("configuracoes_contabilidade");
    expect(c.linha).toMatchObject({
      loja_id: "loja-1",
      nome: "Escritório Exemplo",
      whatsapp: "16999990000",
      email: "contato@exemplo.com.br",
    });
    expect(typeof c.linha.atualizado_em).toBe("string");
    expect(c.opcoes).toEqual({ onConflict: "loja_id" });
  });

  it("WhatsApp sem dígito nenhum e e-mail em branco viram null", async () => {
    await salvarContatoContabilidade("loja-1", {
      nome: "Escritório",
      whatsapp: " - ( ) ",
      email: "contato@exemplo.com.br",
    });
    const c = estado.chamadas[0];
    if (c.tipo !== "upsert") throw new Error("esperava upsert");
    expect(c.linha.whatsapp).toBeNull();

    estado.chamadas.length = 0;
    await salvarContatoContabilidade("loja-1", { nome: "Escritório", whatsapp: "16999990000", email: "   " });
    const d = estado.chamadas[0];
    if (d.tipo !== "upsert") throw new Error("esperava upsert");
    expect(d.linha.email).toBeNull();
    expect(d.linha.whatsapp).toBe("16999990000");
  });

  it.each([
    ["contato null", null],
    ["nome em branco", { nome: "   ", whatsapp: "16999990000", email: "contato@exemplo.com.br" }],
    ["sem WhatsApp e sem e-mail", { nome: "Escritório", whatsapp: null, email: null }],
    ["WhatsApp e e-mail só com espaço", { nome: "Escritório", whatsapp: "  ", email: "  " }],
  ])("apaga a linha quando o contato não serve (%s)", async (_caso, contato) => {
    await salvarContatoContabilidade("loja-1", contato);
    expect(estado.chamadas).toEqual([
      { tipo: "delete", tabela: "configuracoes_contabilidade", coluna: "loja_id", valor: "loja-1" },
    ]);
  });

  it("repassa o erro do banco", async () => {
    estado.resposta = { data: null, error: { code: "23514", message: "ck_configuracoes_contabilidade_email" } };
    await expect(
      salvarContatoContabilidade("loja-1", { nome: "Escritório", whatsapp: null, email: "x@y" }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(salvarContatoContabilidade("loja-1", null)).rejects.toMatchObject({ code: "23514" });
  });
});

describe("buscarContatoContabilidade", () => {
  it("lê as três colunas da loja", async () => {
    estado.resposta = {
      data: { nome: "Escritório", whatsapp: "16999990000", email: null },
      error: null,
    };
    const contato = await buscarContatoContabilidade("loja-1");
    expect(contato).toEqual({ nome: "Escritório", whatsapp: "16999990000", email: null });
    expect(estado.chamadas[0]).toMatchObject({
      tipo: "select",
      tabela: "configuracoes_contabilidade",
      colunas: "nome, whatsapp, email",
      coluna: "loja_id",
      valor: "loja-1",
    });
  });

  it("sem linha, devolve null", async () => {
    expect(await buscarContatoContabilidade("loja-1")).toBeNull();
  });

  it("repassa o erro do banco", async () => {
    estado.resposta = { data: null, error: { code: "42P01", message: "relation does not exist" } };
    await expect(buscarContatoContabilidade("loja-1")).rejects.toMatchObject({ code: "42P01" });
  });
});

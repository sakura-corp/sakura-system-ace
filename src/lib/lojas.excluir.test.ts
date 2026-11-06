/**
 * Excluir loja (#459, revisão da Sofia): o link de avaliação é só
 * configuração, como o texto de garantia. Sem cascade no `loja_id`, uma loja
 * com o link salvo ficava "presa" — o delete da loja falhava com 23503 e a
 * tela dizia "essa loja ainda tem dados vinculados".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const apagadas: string[] = [];

vi.mock("./supabase", () => ({
  supabase: {
    from: (tabela: string) => ({
      delete: () => ({
        eq: async () => {
          apagadas.push(tabela);
          return { error: null };
        },
      }),
    }),
  },
}));

const { excluirLoja } = await import("./lojas");

beforeEach(() => {
  apagadas.length = 0;
});

describe("excluirLoja", () => {
  it("apaga o link de avaliação da loja antes de apagar a loja", async () => {
    await excluirLoja("loja-1");
    expect(apagadas).toContain("configuracoes_avaliacao");
    expect(apagadas.indexOf("configuracoes_avaliacao")).toBeLessThan(apagadas.indexOf("lojas"));
  });

  it("a loja é a última a sair", async () => {
    await excluirLoja("loja-1");
    expect(apagadas.at(-1)).toBe("lojas");
  });
});

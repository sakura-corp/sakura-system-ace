import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLIENTE_CONSUMIDOR_ID } from "@/types/cliente";
import {
  ORIGEM_CLIENTE_LABEL,
  ORIGENS_CLIENTE,
  TAMANHO_MAXIMO_DETALHE_ORIGEM,
  origemAoTrocarCliente,
  origemParaGravar,
  origemSugerida,
  rotuloDaOrigem,
} from "./origemCliente";

describe("a lista de origens", () => {
  it("é a lista fixa da decisão da Sofia, nessa ordem, com os rótulos dela", () => {
    expect(ORIGENS_CLIENTE.map((o) => ORIGEM_CLIENTE_LABEL[o])).toEqual([
      "Anúncio no Instagram/Facebook",
      "Google",
      "Indicação",
      "Passou na frente",
      "Parceiro",
      "Já era cliente",
      "Outro",
    ]);
  });

  // A lista mora num lugar só no código; o banco tem a dele na trava. Se uma
  // mudar sem a outra, salvar com o valor novo dá erro na loja.
  it("é exatamente a que a trava do banco aceita (migration 0093)", () => {
    const sql = readFileSync("supabase/migrations/0093_origem_do_cliente.sql", "utf8");
    for (const trava of ["ck_clientes_origem", "ck_ordens_servico_origem"]) {
      const casou = new RegExp(`add constraint ${trava}\\s+check \\(origem is null or origem in \\(([^)]*)\\)`).exec(
        sql,
      );
      expect(casou, `a trava ${trava} sumiu da migration`).not.toBeNull();
      const valores = [...casou![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
      expect(valores).toEqual([...ORIGENS_CLIENTE]);
    }
    expect(sql).toContain(`char_length(origem_detalhe) <= ${TAMANHO_MAXIMO_DETALHE_ORIGEM}`);
  });

  it("em branco (ou valor desconhecido) aparece como Não informado", () => {
    expect(rotuloDaOrigem(null)).toBe("Não informado");
    expect(rotuloDaOrigem(undefined)).toBe("Não informado");
    expect(rotuloDaOrigem("")).toBe("Não informado");
    expect(rotuloDaOrigem("tiktok")).toBe("Não informado");
    expect(rotuloDaOrigem("indicacao")).toBe("Indicação");
  });
});

describe("origemSugerida", () => {
  it("a OS nova sugere a origem do cliente", () => {
    expect(origemSugerida({ id: "c1", origem: "indicacao" })).toBe("indicacao");
  });

  it("cliente sem origem (ou sem cliente escolhido) não sugere nada", () => {
    expect(origemSugerida({ id: "c1", origem: null })).toBe("");
    expect(origemSugerida({ id: "c1" })).toBe("");
    expect(origemSugerida(undefined)).toBe("");
  });

  it("o Consumidor nunca sugere origem, nem se o banco trouxesse uma", () => {
    expect(origemSugerida({ id: CLIENTE_CONSUMIDOR_ID, origem: "google" })).toBe("");
  });

  it("valor que o programa não conhece não é sugerido", () => {
    expect(origemSugerida({ id: "c1", origem: "tiktok" })).toBe("");
  });
});

describe("origemAoTrocarCliente", () => {
  it("campo vazio recebe a sugestão do cliente escolhido", () => {
    expect(origemAoTrocarCliente("", "", "indicacao")).toBe("indicacao");
  });

  it("trocar de cliente troca a sugestão que veio do cliente anterior", () => {
    expect(origemAoTrocarCliente("indicacao", "indicacao", "google")).toBe("google");
    // ...e esvazia se o novo cliente não tem origem
    expect(origemAoTrocarCliente("indicacao", "indicacao", "")).toBe("");
  });

  it("o que a pessoa escolheu à mão fica, mesmo trocando de cliente", () => {
    expect(origemAoTrocarCliente("parceiro", "indicacao", "google")).toBe("parceiro");
    expect(origemAoTrocarCliente("parceiro", "", "google")).toBe("parceiro");
  });
});

describe("origemParaGravar", () => {
  it("em branco vai pro banco como nulo (Não informado), nunca como texto vazio", () => {
    expect(origemParaGravar("", "")).toEqual({ origem: null, origem_detalhe: null });
    expect(origemParaGravar("", "   ")).toEqual({ origem: null, origem_detalhe: null });
  });

  it("grava a origem e o detalhe sem os espaços das pontas", () => {
    expect(origemParaGravar("indicacao", "  Zé da padaria ")).toEqual({
      origem: "indicacao",
      origem_detalhe: "Zé da padaria",
    });
  });

  it("valor fora da lista vira nulo, em vez de o banco recusar o salvar inteiro", () => {
    expect(origemParaGravar("tiktok", "")).toEqual({ origem: null, origem_detalhe: null });
  });

  it("o detalhe nunca passa do tamanho que o banco aceita", () => {
    const comprido = "a".repeat(TAMANHO_MAXIMO_DETALHE_ORIGEM + 20);
    expect(origemParaGravar("outro", comprido).origem_detalhe).toHaveLength(TAMANHO_MAXIMO_DETALHE_ORIGEM);
  });
});

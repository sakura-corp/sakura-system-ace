// A promessa: toda trava do banco tem uma frase em português na tela. Sem
// este teste, a próxima migration com um `ck_...` novo faria quem esbarra
// nela ler "violates check constraint", que não diz o que fazer.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLUNAS_DA_0065,
  MENSAGEM_BANCO_DESATUALIZADO,
  MENSAGEM_DA_TRAVA,
  MENSAGEM_SEM_PERMISSAO, mensagemDeErro, traduzirTrava } from "./errors";

const PASTA = "supabase/migrations";

function travasDasMigrations(): string[] {
  const nomes = new Set<string>();
  for (const arquivo of readdirSync(PASTA)) {
    if (!arquivo.endsWith(".sql")) continue;
    const texto = readFileSync(join(PASTA, arquivo), "utf8");
    for (const casou of texto.matchAll(/\b(ck_[a-z0-9_]+)\b/g)) nomes.add(casou[1]);
  }
  return [...nomes].sort();
}

describe("MENSAGEM_DA_TRAVA", () => {
  it("toda trava ck_ das migrations tem frase", () => {
    const semFrase = travasDasMigrations().filter((nome) => !(nome in MENSAGEM_DA_TRAVA));
    expect(semFrase, "Trava nova precisa de frase em src/lib/errors.ts").toEqual([]);
  });

  it("e não sobra frase de trava que não existe mais", () => {
    const existentes = new Set(travasDasMigrations());
    expect(Object.keys(MENSAGEM_DA_TRAVA).filter((n) => !existentes.has(n))).toEqual([]);
  });
});

describe("mensagemDeErro", () => {
  it("troca a mensagem crua da trava pela frase", () => {
    const erro = {
      code: "23514",
      message: 'new row for relation "pecas" violates check constraint "ck_pecas_preco_venda"',
    };
    expect(mensagemDeErro(erro)).toBe("O preço de venda não pode ser negativo.");
  });

  it("a trava que vem do gatilho do orçamento (0065) também vira frase", () => {
    const erro = {
      code: "23514",
      message:
        'new row for relation "ordens_servico" violates check constraint "ck_ordens_servico_transicao_orcamento"',
    };
    expect(mensagemDeErro(erro)).toMatch(/recusado não muda mais/);
  });

  it("coluna que o banco ainda não tem vira o aviso de banco desatualizado", () => {
    // Programa novo num banco que ainda não recebeu a migration (ex.: criar
    // orçamento antes da 0065): o PostgREST responde em inglês técnico.
    const doPostgrest = {
      code: "PGRST204",
      message: "Could not find the 'validade' column of 'ordens_servico' in the schema cache",
    };
    const doPostgres = { code: "42703", message: 'column ordens_servico.numero_orcamento does not exist' };
    expect(mensagemDeErro(doPostgrest)).toBe(MENSAGEM_BANCO_DESATUALIZADO);
    expect(mensagemDeErro(doPostgres)).toBe(MENSAGEM_BANCO_DESATUALIZADO);
    // O Postgres também escreve o nome entre aspas.
    expect(mensagemDeErro({ message: 'column "orcado_em" of relation "ordens_servico" does not exist' }))
      .toBe(MENSAGEM_BANCO_DESATUALIZADO);
  });

  it("toda coluna da 0065 vira o aviso", () => {
    for (const coluna of COLUNAS_DA_0065) {
      const erro = { message: `Could not find the '${coluna}' column of 'ordens_servico' in the schema cache` };
      expect(mensagemDeErro(erro), coluna).toBe(MENSAGEM_BANCO_DESATUALIZADO);
    }
  });

  it("coluna que não é da 0065 passa como veio (é erro de programação, não banco atrasado)", () => {
    const doPostgrest = { message: "Could not find the 'xyz' column of 'ordens_servico' in the schema cache" };
    const doPostgres = { message: "column ordens_servico.xyz does not exist" };
    expect(mensagemDeErro(doPostgrest)).toBe(doPostgrest.message);
    expect(mensagemDeErro(doPostgres)).toBe(doPostgres.message);
  });

  it("trava desconhecida e erro comum passam como vieram", () => {
    expect(traduzirTrava('violates check constraint "algo_de_fora"')).toBeNull();
    expect(mensagemDeErro({ message: "falhou a rede" })).toBe("falhou a rede");
    expect(mensagemDeErro(new Error("x"))).toBe("x");
    expect(mensagemDeErro(null)).toMatch(/Erro desconhecido/);
  });
});

// Desde a 0056/0061 a permissão de módulo é conferida no banco. Quando ele
// recusa uma gravação, a frase crua do Postgres não diz o que fazer.
describe("recusa por permissão", () => {
  it("vira uma frase que diz a quem pedir", () => {
    const erro = {
      code: "42501",
      message: 'new row violates row-level security policy for table "contas_receber"',
    };
    expect(mensagemDeErro(erro)).toBe(MENSAGEM_SEM_PERMISSAO);
    expect(MENSAGEM_SEM_PERMISSAO).toMatch(/Configurações → Operadores/);
  });
});

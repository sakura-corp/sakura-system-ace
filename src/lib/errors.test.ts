// A promessa: toda trava do banco tem uma frase em português na tela. Sem
// este teste, a próxima migration com um `ck_...` novo faria quem esbarra
// nela ler "violates check constraint", que não diz o que fazer.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OBJETOS_NOVOS_DO_BANCO,
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

  it("view nova que o banco ainda não tem vira o aviso de banco desatualizado", () => {
    // Programa novo lendo uma view (ex.: `clientes_janela`, da 0068) num banco
    // que ainda não recebeu a migration.
    const doPostgrest = {
      code: "PGRST205",
      message: "Could not find the table 'public.clientes_janela' in the schema cache",
    };
    const doPostgres = { code: "42P01", message: 'relation "ordens_servico_caixa" does not exist' };
    const doPostgresComSchema = { message: 'relation "public.pecas_janela" does not exist' };
    expect(mensagemDeErro(doPostgrest)).toBe(MENSAGEM_BANCO_DESATUALIZADO);
    expect(mensagemDeErro(doPostgres)).toBe(MENSAGEM_BANCO_DESATUALIZADO);
    expect(mensagemDeErro(doPostgresComSchema)).toBe(MENSAGEM_BANCO_DESATUALIZADO);
  });

  it("tabela inventada que falta passa como veio (é erro de programação, não banco atrasado)", () => {
    const doPostgrest = { message: "Could not find the table 'public.tabela_inventada' in the schema cache" };
    const doPostgres = { message: 'relation "tabela_inventada" does not exist' };
    expect(mensagemDeErro(doPostgrest)).toBe(doPostgrest.message);
    expect(mensagemDeErro(doPostgres)).toBe(doPostgres.message);
  });

  it("todo objeto novo da lista vira o aviso", () => {
    for (const nome of OBJETOS_NOVOS_DO_BANCO) {
      const comoColuna = { message: `Could not find the '${nome}' column of 'ordens_servico' in the schema cache` };
      const comoView = { message: `Could not find the table 'public.${nome}' in the schema cache` };
      expect(mensagemDeErro(comoColuna), nome).toBe(MENSAGEM_BANCO_DESATUALIZADO);
      expect(mensagemDeErro(comoView), nome).toBe(MENSAGEM_BANCO_DESATUALIZADO);
    }
  });

  it("coluna que não é da lista passa como veio (é erro de programação, não banco atrasado)", () => {
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

// A lembrança vira mecanismo: toda coluna ou view nova (da 0065 em diante)
// precisa estar em OBJETOS_NOVOS_DO_BANCO, senão a versão do programa que
// chega antes da migration mostra o inglês técnico do Supabase. Quem escreve
// a próxima migration descobre aqui, no CI.
const PRIMEIRA_MIGRATION_DA_LISTA = 65;

function objetosNovosDasMigrations(): { migration: string; nome: string }[] {
  const achados: { migration: string; nome: string }[] = [];
  for (const arquivo of readdirSync(PASTA).filter((n) => n.endsWith(".sql")).sort()) {
    if (Number(arquivo.slice(0, 4)) < PRIMEIRA_MIGRATION_DA_LISTA) continue;
    // Tira os comentários de linha, pra um exemplo num comentário não contar.
    const sql = readFileSync(join(PASTA, arquivo), "utf8").replace(/--.*$/gm, "");
    const padroes = [
      /add\s+column\s+(?:if\s+not\s+exists\s+)?"?(?:\w+\.)?(\w+)"?/gi,
      /create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?"?(?:public\.)?(\w+)"?/gi,
    ];
    for (const padrao of padroes) {
      for (const casou of sql.matchAll(padrao)) achados.push({ migration: arquivo, nome: casou[1] });
    }
  }
  return achados;
}

describe("OBJETOS_NOVOS_DO_BANCO acompanha as migrations", () => {
  it("acha as colunas e views que já se sabe que existem (o leitor funciona)", () => {
    const nomes = objetosNovosDasMigrations().map((o) => o.nome);
    expect(nomes).toContain("numero_orcamento");
    expect(nomes).toContain("custo_unitario");
    expect(nomes).toContain("clientes_janela");
    expect(nomes).toContain("ordens_servico_clientes");
  });

  it("toda add column e create view da 0065 em diante está na lista", () => {
    const lista = OBJETOS_NOVOS_DO_BANCO as readonly string[];
    const faltando = objetosNovosDasMigrations()
      .filter((o) => !lista.includes(o.nome))
      .map((o) => `${o.nome} (${o.migration})`);
    expect(
      faltando,
      "Coluna ou view nova entra em OBJETOS_NOVOS_DO_BANCO (src/lib/errors.ts)",
    ).toEqual([]);
  });
});

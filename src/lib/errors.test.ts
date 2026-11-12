// A promessa: toda trava do banco tem uma frase em português na tela. Sem
// este teste, a próxima migration com um `ck_...` novo faria quem esbarra
// nela ler "violates check constraint", que não diz o que fazer.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/auth-js";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/functions-js";
import { StorageApiError, StorageUnknownError } from "@supabase/storage-js";
import { describe, expect, it } from "vitest";
import {
  OBJETOS_NOVOS_DO_BANCO,
  MENSAGEM_BANCO_DESATUALIZADO,
  MENSAGEM_DA_TRAVA,
  MENSAGEM_SEM_CONEXAO,
  MENSAGEM_SEM_PERMISSAO,
  MENSAGEM_TRAVAMENTO_MUTUO,
  ehErroDeRede,
  mensagemDeErro,
  traduzirTrava,
} from "./errors";

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

// #803: dois computadores esbarrando um no outro (juntar peças × uma OS, por
// exemplo) fazem o Postgres desfazer um dos dois. O banco desfaz direito, mas
// a frase vinha em inglês.
describe("travamento mútuo (deadlock)", () => {
  it("vira uma frase em português que manda tentar de novo", () => {
    const erro = {
      code: "40P01",
      message: "deadlock detected",
      details: "Process 123 waits for ShareLock on transaction 456; blocked by process 789.",
    };
    expect(mensagemDeErro(erro)).toBe(MENSAGEM_TRAVAMENTO_MUTUO);
    expect(MENSAGEM_TRAVAMENTO_MUTUO).toMatch(/tente de novo/i);
  });

  it("pelo código 40P01, mesmo com a frase em outro idioma", () => {
    expect(mensagemDeErro({ code: "40P01", message: "impasse détecté" })).toBe(
      MENSAGEM_TRAVAMENTO_MUTUO,
    );
  });

  it("pela frase, mesmo embrulhada por quem chamou", () => {
    expect(mensagemDeErro(new Error("O orçamento não foi aprovado: deadlock detected"))).toBe(
      MENSAGEM_TRAVAMENTO_MUTUO,
    );
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

// #374: a internet da loja cai (o roteador reinicia, o cabo solta) e a tela
// mostrava "TypeError: Failed to fetch". A queda chega de vários jeitos —
// cada biblioteca do Supabase embrulha o erro do navegador no seu próprio —,
// e nenhum deles pode ser confundido com uma recusa do banco: aí a frase
// "sem conexão" mandaria a pessoa conferir a rede à toa.
describe("ehErroDeRede", () => {
  const quedaDoNavegador = () => new TypeError("Failed to fetch");

  it("reconhece o TypeError do navegador, em cada navegador", () => {
    expect(ehErroDeRede(new TypeError("Failed to fetch"))).toBe(true); // Chromium/Electron
    expect(ehErroDeRede(new TypeError("NetworkError when attempting to fetch resource."))).toBe(true); // Firefox
    expect(ehErroDeRede(new TypeError("Load failed"))).toBe(true); // Safari
    expect(ehErroDeRede(new TypeError("Network request failed"))).toBe(true);
  });

  it("reconhece o erro do PostgREST (.from/.rpc), que vem como objeto e com o nome na frente", () => {
    // Do jeito que o postgrest-js 2.110.9 devolve em `{ error }` quando o fetch lança.
    const erro = {
      message: "TypeError: Failed to fetch",
      details: "TypeError: Failed to fetch\n    at ...",
      hint: "",
      code: "",
    };
    expect(ehErroDeRede(erro)).toBe(true);
  });

  it("reconhece o erro do login (auth), do arquivo (storage) e da função (functions)", () => {
    expect(ehErroDeRede(new AuthRetryableFetchError("Failed to fetch", 0))).toBe(true);
    expect(ehErroDeRede(new StorageUnknownError("Failed to fetch", quedaDoNavegador()))).toBe(true);
    expect(ehErroDeRede(new FunctionsFetchError(quedaDoNavegador()))).toBe(true);
  });

  it("não confunde com recusa do banco", () => {
    const rls = { code: "42501", message: 'new row violates row-level security policy for table "clientes"' };
    const trava = {
      code: "23514",
      message: 'new row for relation "pecas" violates check constraint "ck_pecas_preco_venda"',
    };
    const semTabela = { code: "42P01", message: 'relation "clientes_janela" does not exist' };
    const semTabelaNoCache = {
      code: "PGRST205",
      message: "Could not find the table 'public.clientes_janela' in the schema cache",
    };
    const deadlock = { code: "40P01", message: "deadlock detected" };
    for (const erro of [rls, trava, semTabela, semTabelaNoCache, deadlock]) {
      expect(ehErroDeRede(erro), erro.message).toBe(false);
    }
    // Código do banco preenchido manda, mesmo que a frase pareça de rede.
    expect(ehErroDeRede({ code: "08006", message: "Failed to fetch" })).toBe(false);
  });

  it("não confunde com o servidor que respondeu com erro (ele respondeu: a rede está de pé)", () => {
    expect(ehErroDeRede(new AuthRetryableFetchError("Service Unavailable", 503))).toBe(false);
    expect(ehErroDeRede(new AuthApiError("Invalid login credentials", 400, "invalid_credentials"))).toBe(false);
    expect(ehErroDeRede(new StorageApiError("Object not found", 404, "not_found"))).toBe(false);
    expect(ehErroDeRede(new FunctionsHttpError(new Response("x", { status: 500 })))).toBe(false);
  });

  it("cancelar não é queda (o AbortError de quem desistiu do pedido)", () => {
    const cancelado = new DOMException("This operation was aborted", "AbortError");
    expect(ehErroDeRede(cancelado)).toBe(false);
    expect(ehErroDeRede({ message: "AbortError: This operation was aborted", details: "", hint: "", code: "" }))
      .toBe(false);
    expect(ehErroDeRede(new AuthRetryableFetchError("This operation was aborted", 0))).toBe(false);
    expect(ehErroDeRede(new StorageUnknownError("aborted", cancelado))).toBe(false);
    expect(ehErroDeRede(new FunctionsFetchError(cancelado))).toBe(false);
  });

  it("não reconhece qualquer coisa", () => {
    expect(ehErroDeRede("Failed to fetch")).toBe(false);
    expect(ehErroDeRede("qualquer coisa")).toBe(false);
    expect(ehErroDeRede(null)).toBe(false);
    expect(ehErroDeRede(undefined)).toBe(false);
    expect(ehErroDeRede(new Error("x"))).toBe(false);
    expect(ehErroDeRede({ message: "falhou a rede" })).toBe(false);
    // Uma frase nossa que só cita a do navegador não é a queda.
    expect(ehErroDeRede(new Error("Não deu pra emitir: Failed to fetch the XML from Focus"))).toBe(false);
  });
});

describe("mensagemDeErro com a rede caída", () => {
  it("vira a frase de sem conexão, em todas as formas", () => {
    expect(mensagemDeErro(new TypeError("Failed to fetch"))).toBe(MENSAGEM_SEM_CONEXAO);
    expect(mensagemDeErro({ message: "TypeError: Failed to fetch", details: "", hint: "", code: "" }))
      .toBe(MENSAGEM_SEM_CONEXAO);
    expect(mensagemDeErro(new AuthRetryableFetchError("Failed to fetch", 0))).toBe(MENSAGEM_SEM_CONEXAO);
    expect(mensagemDeErro(new FunctionsFetchError(new TypeError("Failed to fetch")))).toBe(MENSAGEM_SEM_CONEXAO);
    expect(MENSAGEM_SEM_CONEXAO).toBe("Sem conexão com a internet. Confira a rede e tente de novo.");
  });

  it("e a recusa do banco continua com a frase dela", () => {
    expect(mensagemDeErro({ code: "42501", message: "new row violates row-level security policy" }))
      .toBe(MENSAGEM_SEM_PERMISSAO);
  });
});

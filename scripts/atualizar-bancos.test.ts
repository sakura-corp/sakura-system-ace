// A promessa deste teste em uma frase: o botão NUNCA deixa um banco pela
// metade sem dizer, e NUNCA aplica nada se algum ensaio falhou.
//
// Aqui o `psql` é de mentira — cada banco é um objeto que sabe em que versão
// está e quais migrations "quebram" nele. O teste com Postgres de verdade é o
// scripts/atualizar-bancos.integracao.mjs (roda no CI, no job da matriz de RLS).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DIAS_PARA_CONSIDERAR_EM_USO, compararVersoes as compararVersoesDaTela } from "../src/schemas/computadores";
import {
  atualizarBancos,
  avisosDaMigration,
  compararVersoes,
  DIAS_EM_USO,
  lerVersaoMinima,
  sqlComputadoresAtrasados,
  versaoMinimaExigida,
  lerEmpresas,
  listarMigrations,
  montarResumo,
  pendentes,
  resumirErro,
  scriptDeAplicacao,
  scriptDeEnsaio,
  segredosDaConexao,
  ultimaMigrationIniciada,
  // @ts-expect-error — script utilitário em .mjs puro, sem tipos
} from "./atualizar-bancos.mjs";

// No Windows, `path.resolve` devolve o caminho com `\` (C:\...\0057_x.sql), e
// listarMigrations recusa `\` (ele vai dentro do `\i '...'` do psql). O robô
// de verdade só roda no CI (Linux), então o conserto fica SÓ no teste (#511):
// o caminho é passado pra `/` antes de o script conferir — o Windows aceita
// `C:/...` pra ler o arquivo. `comoNoWindows` liga a imitação no Linux, pra
// provar o conserto sem precisar de um PC (a última describe deste arquivo).
// Efeito colateral: neste arquivo a trava contra `\` do script nunca dispara;
// um teste dessa trava precisa morar em outro arquivo, sem este mock.
const windows = vi.hoisted(() => ({ imitar: false }));
vi.mock("node:path", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:path")>();
  const resolve = (...partes: string[]) => {
    const caminho = original.resolve(...partes);
    const comBarraDoWindows = windows.imitar ? caminho.replaceAll("/", "\\") : caminho;
    return comBarraDoWindows.replaceAll("\\", "/");
  };
  const comResolve = { ...original, resolve };
  return { ...comResolve, default: comResolve };
});

function comoNoWindows<T>(fazer: () => T): T {
  windows.imitar = true;
  try {
    return fazer();
  } finally {
    windows.imitar = false;
  }
}

interface BancoFalso {
  /** null = banco sem schema_versao (anterior à 0055). */
  versao: number | null;
  /** Migrations que dão erro neste banco (o "dado da loja" que não deixa). */
  quebraEm?: number[];
  /** Não responde nem à conexão. */
  fora?: boolean;
  aplicadas: number[];
  ensaios: number;
  /**
   * Os computadores registrados neste banco (migration 0063). `undefined` =
   * banco sem a tabela `computadores`.
   */
  computadores?: { nome: string; versao: string; dias: number }[];
  /** A consulta aos computadores dá erro. */
  computadoresQuebra?: boolean;
  /** Quantas vezes perguntaram pelos computadores. */
  consultasComputadores?: number;
}

function migracoes(...numeros: number[]) {
  return numeros.map((n) => ({
    numero: n,
    arquivo: `${String(n).padStart(4, "0")}_x.sql`,
    caminho: `/repo/supabase/migrations/${String(n).padStart(4, "0")}_x.sql`,
    versaoMinima: null as string | null,
  }));
}

/** As mesmas migrations, com uma delas exigindo uma versão mínima do programa. */
function comVersaoMinima(lista: ReturnType<typeof migracoes>, numero: number, versao: string) {
  return lista.map((m) => (m.numero === numero ? { ...m, versaoMinima: versao } : m));
}

const AGORA = Date.now();

function psqlFalso(bancos: Record<string, BancoFalso>) {
  return async ({ banco, argumentos = [], entrada }: { banco: string; argumentos?: string[]; entrada?: string }) => {
    const b = bancos[banco];
    if (!b) throw new Error(`banco desconhecido ${banco}`);
    if (b.fora) return { codigo: 2, saida: "", erro: 'psql: error: connection to server at "x" failed: timeout expired' };

    const sql = argumentos[1] ?? "";
    if (sql.includes("to_regclass('public.computadores')")) {
      return { codigo: 0, saida: b.computadores === undefined ? "f\n" : "t\n", erro: "" };
    }
    if (sql.includes("from computadores")) {
      b.consultasComputadores = (b.consultasComputadores ?? 0) + 1;
      if (b.computadoresQuebra) return { codigo: 1, saida: "", erro: "ERROR:  permission denied for table computadores\n" };
      const exigida = /string_to_array\('([\d.]+)'/.exec(sql)![1];
      const emUso = (b.computadores ?? []).filter((c) => c.dias < 30);
      const atrasados = emUso
        .filter((c) => compararVersoesDaTela(c.versao, exigida) < 0)
        .map((c) => ({ nome: c.nome, versao: c.versao, vistoEm: new Date(AGORA - c.dias * 86_400_000).toISOString() }));
      return { codigo: 0, saida: `${JSON.stringify({ emUso: emUso.length, atrasados })}\n`, erro: "" };
    }
    if (sql.includes("to_regclass")) return { codigo: 0, saida: b.versao === null ? "f\n" : "t\n", erro: "" };
    if (sql.includes("max(versao)")) return { codigo: 0, saida: `${b.versao}\n`, erro: "" };

    const numeros = [...String(entrada).matchAll(/(\d{4})_x\.sql/g)].map((m) => Number(m[1]));
    const ensaio = String(entrada).includes("rollback;");
    if (ensaio) {
      b.ensaios++;
      let saida = "";
      for (const n of numeros) {
        saida += `@@sakura-migration ${n}\n`;
        if (b.quebraEm?.includes(n)) {
          return { codigo: 3, saida, erro: `psql:/repo/${n}_x.sql:7: ERROR:  check constraint "ck_x" is violated by some row\n` };
        }
      }
      return { codigo: 0, saida, erro: "NOTICE:  relation \"x\" already exists, skipping\nNOTICE:  trava ck_y NAO criada: 2 linhas violam\n" };
    }
    // aplicação: uma migration por vez
    const [n] = numeros;
    if (b.quebraEm?.includes(n)) return { codigo: 3, saida: "", erro: "ERROR:  deu ruim de verdade\n" };
    b.aplicadas.push(n);
    b.versao = n;
    return { codigo: 0, saida: "", erro: "" };
  };
}

function banco(versao: number | null, extra: Partial<BancoFalso> = {}): BancoFalso {
  return { versao, aplicadas: [], ensaios: 0, ...extra };
}

const empresas = (...nomes: string[]) => nomes.map((nome) => ({ nome, banco: nome }));
const silencio = () => {};

describe("lerEmpresas", () => {
  it("lê a lista do BACKUP_EMPRESAS, ignorando os campos do backup", () => {
    const texto = JSON.stringify([
      { nome: "pneus-amigao", banco: "postgresql://u:s@h/p", supabase_url: "x", service_role_key: "y" },
      { nome: "loja-2", banco: "postgresql://u:t@h/p" },
    ]);
    expect(lerEmpresas(texto)).toEqual([
      { nome: "pneus-amigao", banco: "postgresql://u:s@h/p" },
      { nome: "loja-2", banco: "postgresql://u:t@h/p" },
    ]);
  });

  it("explica em português cada defeito de formato", () => {
    expect(() => lerEmpresas("")).toThrow(/vazio/);
    expect(() => lerEmpresas("eyJhbGciOi")).toThrow(/LISTA inteira/);
    expect(() => lerEmpresas('{"nome":"a","banco":"b"}')).toThrow(/precisa ser uma LISTA/);
    expect(() => lerEmpresas("[]")).toThrow(/lista vazia/);
    expect(() => lerEmpresas('[{"nome":"a"}]')).toThrow(/número 1.*"banco"/);
    expect(() => lerEmpresas('[{"nome":"a","banco":"x"},{"banco":"y"}]')).toThrow(/número 2.*"nome"/);
    expect(() => lerEmpresas('[{"nome":"a","banco":"x"},{"nome":"a","banco":"y"}]')).toThrow(/duas vezes/);
  });
});

describe("segredosDaConexao", () => {
  it("esconde a linha inteira e a senha sozinha", () => {
    expect(segredosDaConexao("postgresql://postgres.abc:S3nha%21@host:5432/postgres")).toEqual([
      "postgresql://postgres.abc:S3nha%21@host:5432/postgres",
      "S3nha!",
    ]);
    expect(segredosDaConexao("host=x password=y")).toEqual(["host=x password=y"]);
  });
});

describe("listarMigrations", () => {
  it("ordena por NÚMERO, não por texto", () => {
    const pasta = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      for (const nome of ["0058_b.sql", "0057_a.sql", "10000_futura.sql", "9999_c.sql", "leia-me.md", "sem_numero.sql"]) {
        writeFileSync(join(pasta, nome), "select 1;");
      }
      expect(listarMigrations(pasta).map((m: { numero: number }) => m.numero)).toEqual([57, 58, 9999, 10000]);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it("recusa dois arquivos com o mesmo número", () => {
    const pasta = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      writeFileSync(join(pasta, "0058_a.sql"), "");
      writeFileSync(join(pasta, "0058_b.sql"), "");
      expect(() => listarMigrations(pasta)).toThrow(/número 58/);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it("lê as migrations reais do repositório, sem buraco na numeração", () => {
    const reais = listarMigrations("supabase/migrations");
    expect(reais.length).toBeGreaterThan(55);
    reais.forEach((m: { numero: number }, i: number) => expect(m.numero).toBe(i + 1));
  });
});

describe("pendentes e scripts do psql", () => {
  it("pendentes = as de número maior que a versão do banco", () => {
    expect(pendentes(migracoes(55, 56, 57), 55).map((m: { numero: number }) => m.numero)).toEqual([56, 57]);
    expect(pendentes(migracoes(55, 56, 57), 57)).toEqual([]);
  });

  it("o ensaio termina SEMPRE em rollback, e a aplicação em commit", () => {
    const [a, b] = migracoes(56, 57);
    const ensaio = scriptDeEnsaio([a, b]);
    expect(ensaio).toMatch(/^\\set ON_ERROR_STOP on\nbegin;\nset local lock_timeout/);
    expect(ensaio.trim().endsWith("rollback;")).toBe(true);
    expect(ensaio).not.toMatch(/commit/);
    expect(ensaio.indexOf("0056")).toBeLessThan(ensaio.indexOf("0057"));

    const aplicacao = scriptDeAplicacao(a);
    expect(aplicacao.trim().endsWith("commit;")).toBe(true);
    expect(aplicacao).toMatch(/lock_timeout/);
    expect(aplicacao).not.toMatch(/rollback/);
  });

  it("acha em qual migration o ensaio parou", () => {
    expect(ultimaMigrationIniciada("@@sakura-migration 56\n@@sakura-migration 57\n")).toBe(57);
    expect(ultimaMigrationIniciada("")).toBeNull();
  });

  it("tira os NOTICE do motivo do erro, e guarda só os avisos da própria migration", () => {
    const saida = [
      'psql:/r/0056_x.sql:3: NOTICE:  relation "a" already exists, skipping',
      'psql:/r/0056_x.sql:9: NOTICE:  policy "b" for relation "c" does not exist, skipping',
      "psql:/r/0058_x.sql:20: NOTICE:  trava ck_itens_quantidade NAO criada: 3 linhas violam",
      'psql:/r/0058_x.sql:40: ERROR:  column "y" does not exist',
      "LINE 1: select y from z",
    ].join("\n");
    expect(resumirErro(saida)).toBe('ERROR:  column "y" does not exist');
    expect(avisosDaMigration(saida)).toEqual(["trava ck_itens_quantidade NAO criada: 3 linhas violam"]);
  });
});

describe("atualizarBancos — ensaiar", () => {
  it("ensaia em todos, não muda nada, e diz o que falta em cada um", async () => {
    const bancos = { a: banco(55), b: banco(56), c: banco(57) };
    const r = await atualizarBancos({
      modo: "ensaiar",
      empresas: empresas("a", "b", "c"),
      migrations: migracoes(55, 56, 57),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(true);
    expect(r.situacoes.map((s: { pendentes: number[] }) => s.pendentes)).toEqual([[56, 57], [57], []]);
    expect(Object.values(bancos).map((b) => b.aplicadas)).toEqual([[], [], []]);
    expect(bancos.c.ensaios).toBe(0); // em dia: nem ensaia
    expect(r.situacoes[0].avisos).toEqual(["trava ck_y NAO criada: 2 linhas violam"]);
  });

  it("continua ensaiando os outros bancos depois de um problema (ensaio não muda nada)", async () => {
    const bancos = { a: banco(55, { quebraEm: [57] }), b: banco(null), c: banco(55), d: banco(56, { fora: true }) };
    const r = await atualizarBancos({
      modo: "ensaiar",
      empresas: empresas("a", "b", "c", "d"),
      migrations: migracoes(55, 56, 57),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    const [a, b, c, d] = r.situacoes;
    expect(a).toMatchObject({ ensaio: "problema", falhouEm: 57 });
    expect(a.motivo).toMatch(/ck_x/);
    expect(b.motivo).toMatch(/schema_versao.*0055/);
    expect(c.ensaio).toBe("ok");
    expect(d.motivo).toMatch(/não consegui falar com o banco/);
    expect(Object.values(bancos).flatMap((x) => x.aplicadas)).toEqual([]);
  });

  it("acusa banco MAIS NOVO que o código (rodado de uma branch antiga)", async () => {
    const r = await atualizarBancos({
      modo: "ensaiar",
      empresas: empresas("a"),
      migrations: migracoes(55, 56),
      psql: psqlFalso({ a: banco(57) }),
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    expect(r.situacoes[0].motivo).toMatch(/MAIS NOVO.*branch antiga/);
  });
});

describe("atualizarBancos — aplicar", () => {
  it("aplica em ordem, banco por banco, e confere de fora", async () => {
    const bancos = { a: banco(55), b: banco(56), c: banco(57) };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a", "b", "c"),
      migrations: migracoes(55, 56, 57),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(true);
    expect(bancos.a.aplicadas).toEqual([56, 57]);
    expect(bancos.b.aplicadas).toEqual([57]);
    expect(bancos.c.aplicadas).toEqual([]);
    expect(r.situacoes.map((s: { aplicacao: string }) => s.aplicacao)).toEqual(["aplicado", "aplicado", "em-dia"]);
    expect(r.situacoes.map((s: { versaoFinal: number }) => s.versaoFinal)).toEqual([57, 57, 57]);
  });

  it("se QUALQUER ensaio falha, não aplica em NENHUM banco — nem nos que passariam", async () => {
    const bancos = { a: banco(55), b: banco(55, { quebraEm: [57] }), c: banco(56) };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a", "b", "c"),
      migrations: migracoes(55, 56, 57),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    expect(Object.values(bancos).flatMap((x) => x.aplicadas)).toEqual([]);
    expect(r.conclusao).toMatch(/Nada foi aplicado/);
    expect(r.situacoes.every((s: { aplicacao: string }) => s.aplicacao === "nao-tocado")).toBe(true);
  });

  it("banco sem schema_versao também impede aplicar nos outros", async () => {
    const bancos = { a: banco(55), b: banco(null) };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a", "b"),
      migrations: migracoes(55, 56),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    expect(bancos.a.aplicadas).toEqual([]);
  });

  it("falha na hora de aplicar (passou no ensaio): para ali, e os seguintes não são tocados", async () => {
    // O ensaio passa (quebraEm só vale na aplicação desse banco falso b).
    const bancos = { a: banco(55), b: banco(55), c: banco(55) };
    const psqlBase = psqlFalso(bancos);
    const psql = async (p: { banco: string; argumentos?: string[]; entrada?: string }) => {
      if (p.banco === "b" && p.entrada && !p.entrada.includes("rollback;") && p.entrada.includes("0057")) {
        return { codigo: 3, saida: "", erro: 'ERROR:  canceling statement due to lock timeout\n' };
      }
      return psqlBase(p);
    };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a", "b", "c"),
      migrations: migracoes(55, 56, 57),
      psql,
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    expect(bancos.a.aplicadas).toEqual([56, 57]);
    expect(bancos.b.aplicadas).toEqual([56]); // a 56 ficou; a 57 foi desfeita
    expect(bancos.c.aplicadas).toEqual([]);
    const [, b, c] = r.situacoes;
    expect(b).toMatchObject({ aplicacao: "falhou", falhouEm: 57, versaoFinal: 56 });
    expect(b.motivo).toMatch(/lock timeout/);
    expect(c.aplicacao).toBe("nao-tocado");

    const resumo = montarResumo(r);
    expect(resumo).toMatch(/\| b \| 0055 \| ❌ falhou \(desfeito\) na 0057/);
    expect(resumo).toMatch(/\| c \| 0055 \| — não mexido \| 0055 \|/);
  });

  it("recusa modo inventado antes de encostar em banco", async () => {
    const bancos = { a: banco(55) };
    await expect(
      atualizarBancos({ modo: "aplicar-tudo", empresas: empresas("a"), migrations: migracoes(55, 56), psql: psqlFalso(bancos), log: silencio }),
    ).rejects.toThrow(/não existe/);
    expect(bancos.a.ensaios).toBe(0);
  });
});

describe("montarResumo", () => {
  it("o ensaio diz em letras que nada foi mudado", async () => {
    const r = await atualizarBancos({
      modo: "ensaiar",
      empresas: empresas("pneus-amigao", "loja-b"),
      migrations: migracoes(55, 56, 57),
      psql: psqlFalso({ "pneus-amigao": banco(56), "loja-b": banco(57) }),
      log: silencio,
    });
    const texto = montarResumo(r);
    expect(texto).toMatch(/Ensaio — nada foi mudado/);
    expect(texto).toMatch(/\| pneus-amigao \| 0056 \| 0057 \| ✅ passaria \|/);
    expect(texto).toMatch(/\| loja-b \| 0057 \| nada \| ✅ em dia \|/);
    expect(texto).toMatch(/O que as migrations avisaram/);
  });
});

describe("versão mínima do programa (migration 0063)", () => {
  it("lê a linha do cabeçalho; sem a linha, não há exigência nenhuma", () => {
    expect(lerVersaoMinima("-- Migration 0070\n-- versao-minima-do-programa: 0.9.45\ncreate table x();")).toBe("0.9.45");
    expect(lerVersaoMinima("--   versao-minima-do-programa:   1.2.3   \n")).toBe("1.2.3");
    expect(lerVersaoMinima("-- Migration 0063\ncreate table x();")).toBeNull();
  });

  it("linha com versão torta recusa a rodada — ignorar faria a migration que pediu cuidado passar sem cuidado", () => {
    expect(() => lerVersaoMinima("-- versao-minima-do-programa: 0.9", "0070_x.sql")).toThrow(/0070_x.sql.*não é uma versão/);
    expect(() => lerVersaoMinima("-- versao-minima-do-programa: próxima")).toThrow(/não é uma versão/);
  });

  it("listarMigrations lê a exigência de dentro de cada arquivo", () => {
    const pasta = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      writeFileSync(join(pasta, "0070_a.sql"), "-- versao-minima-do-programa: 0.9.45\nselect 1;");
      writeFileSync(join(pasta, "0071_b.sql"), "select 1;");
      expect(listarMigrations(pasta).map((m: { versaoMinima: string | null }) => m.versaoMinima)).toEqual(["0.9.45", null]);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it("entre as que faltam, manda a MAIOR — comparada como número", () => {
    const lista = comVersaoMinima(comVersaoMinima(migracoes(70, 71, 72), 70, "0.9.10"), 71, "0.9.9");
    expect(versaoMinimaExigida(lista)).toBe("0.9.10");
    expect(versaoMinimaExigida(migracoes(70))).toBeNull();
  });

  it("compara versão igual à tela, e a SQL recusa texto que não é versão (vai dentro do comando)", () => {
    for (const [a, b] of [["0.9.9", "0.9.10"], ["0.10.0", "0.9.99"], ["1.0.0", "1.0.0"], ["0.9.44", "0.9.43"]]) {
      expect(Math.sign(compararVersoes(a, b))).toBe(Math.sign(compararVersoesDaTela(a, b)));
    }
    expect(() => sqlComputadoresAtrasados("0.9.43'); drop table lojas; --")).toThrow(/não é uma versão/);
    expect(sqlComputadoresAtrasados("0.9.43")).toMatch(/string_to_array\('0\.9\.43', '\.'\)::int\[\]/);
  });

  it("a janela de 'em uso' do robô é a mesma da tela de Configurações", () => {
    expect(DIAS_EM_USO).toBe(DIAS_PARA_CONSIDERAR_EM_USO);
  });

  it("migration SEM exigência nem pergunta pelos computadores — nada muda pro caso comum", async () => {
    const bancos = { a: banco(62, { computadores: [{ nome: "Balcão", versao: "0.0.1", dias: 0 }] }) };
    const r = await atualizarBancos({ modo: "aplicar", empresas: empresas("a"), migrations: migracoes(62, 63), psql: psqlFalso(bancos), log: silencio });
    expect(r.sucesso).toBe(true);
    expect(bancos.a.consultasComputadores ?? 0).toBe(0);
    expect(bancos.a.aplicadas).toEqual([63]);
  });

  it("computador EM USO abaixo da exigida: o ensaio avisa que a aplicação vai esperar", async () => {
    const bancos = {
      "pneus-amigao": banco(63, {
        computadores: [
          { nome: "Balcão", versao: "0.9.45", dias: 0 },
          { nome: "DESKTOP-A1C3F9", versao: "0.9.44", dias: 2 },
        ],
      }),
    };
    const r = await atualizarBancos({
      modo: "ensaiar",
      empresas: empresas("pneus-amigao"),
      migrations: comVersaoMinima(migracoes(63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    expect(r.esperando).toBe(true);
    expect(r.conclusao).toMatch(/vai ESPERAR/);
    const texto = montarResumo(r);
    expect(texto).toMatch(/\| pneus-amigao \| 0063 \| 0064 \| ⏸ passaria, mas espera 1 computador abaixo da 0\.9\.45 \|/);
    expect(texto).toMatch(/DESKTOP-A1C3F9 \(0\.9\.44, visto há 2 dias\)/);
    expect(texto).not.toMatch(/Balcão \(/);
    expect(bancos["pneus-amigao"].aplicadas).toEqual([]);
  });

  it("aplicar com computador atrasado: NÃO aplica em banco nenhum — nem no que estava em dia com os computadores", async () => {
    const bancos = {
      a: banco(63, { computadores: [{ nome: "Balcão", versao: "0.9.45", dias: 0 }] }),
      b: banco(63, { computadores: [{ nome: "Notebook", versao: "0.9.44", dias: 5 }] }),
    };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a", "b"),
      migrations: comVersaoMinima(migracoes(63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    expect(Object.values(bancos).flatMap((x) => x.aplicadas)).toEqual([]);
    expect(r.situacoes.every((s: { aplicacao: string }) => s.aplicacao === "nao-tocado")).toBe(true);
    expect(r.conclusao).toMatch(/Nada foi aplicado.*computadores.*Esquecer.*aplicar mesmo com computadores atrasados/s);
  });

  it("a caixinha 'aplicar mesmo com computadores atrasados' passa por cima, e o resumo diz isso", async () => {
    const bancos = { a: banco(63, { computadores: [{ nome: "Notebook", versao: "0.9.44", dias: 5 }] }) };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a"),
      migrations: comVersaoMinima(migracoes(63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
      aplicarComAtrasados: true,
    });
    expect(r.sucesso).toBe(true);
    expect(bancos.a.aplicadas).toEqual([64]);
    expect(montarResumo(r)).toMatch(/Notebook \(0\.9\.44, visto há 5 dias\) — seguindo mesmo assim, como pedido/);
  });

  it("computador SUMIDO (30 dias ou mais) não segura nada", async () => {
    const bancos = { a: banco(63, { computadores: [{ nome: "Velho", versao: "0.9.30", dias: 41 }, { nome: "Balcão", versao: "0.9.45", dias: 0 }] }) };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a"),
      migrations: comVersaoMinima(migracoes(63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(true);
    expect(bancos.a.aplicadas).toEqual([64]);
    expect(montarResumo(r)).toMatch(/o computador em uso já está nela ou numa mais nova/);
  });

  it("banco que ainda não registra computadores: segue, mas o resumo diz que não deu pra conferir", async () => {
    const bancos = { a: banco(62) }; // sem a tabela `computadores`
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a"),
      migrations: comVersaoMinima(migracoes(62, 63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(true);
    expect(bancos.a.aplicadas).toEqual([63, 64]);
    expect(montarResumo(r)).toMatch(/exige a 0\.9\.45; este banco ainda não registra os computadores — não deu pra conferir/);
  });

  it("nenhum computador visto nos últimos 30 dias: segue, avisando", async () => {
    const bancos = { a: banco(63, { computadores: [] }) };
    const r = await atualizarBancos({
      modo: "ensaiar",
      empresas: empresas("a"),
      migrations: comVersaoMinima(migracoes(63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(true);
    expect(montarResumo(r)).toMatch(/nenhum computador apareceu nos últimos 30 dias — não deu pra conferir/);
  });

  it("não conseguir perguntar pelos computadores SEGURA — não saber não vira 'então pode'", async () => {
    const bancos = { a: banco(63, { computadores: [], computadoresQuebra: true }), b: banco(63, { computadores: [] }) };
    const r = await atualizarBancos({
      modo: "aplicar",
      empresas: empresas("a", "b"),
      migrations: comVersaoMinima(migracoes(63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(false);
    expect(r.situacoes[0].motivo).toMatch(/não consegui conferir os computadores/);
    expect(Object.values(bancos).flatMap((x) => x.aplicadas)).toEqual([]);
  });

  it("banco em dia não é perguntado — só quem tem migration pendente que exige versão", async () => {
    const bancos = { a: banco(64, { computadores: [{ nome: "X", versao: "0.0.1", dias: 0 }] }) };
    const r = await atualizarBancos({
      modo: "ensaiar",
      empresas: empresas("a"),
      migrations: comVersaoMinima(migracoes(63, 64), 64, "0.9.45"),
      psql: psqlFalso(bancos),
      log: silencio,
    });
    expect(r.sucesso).toBe(true);
    expect(bancos.a.consultasComputadores ?? 0).toBe(0);
  });
});

describe("no Windows (caminho com \\ e fim de linha CRLF, #511)", () => {
  it("listarMigrations lê a pasta mesmo com o caminho vindo com \\", () => {
    const pasta = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      writeFileSync(join(pasta, "0071_b.sql"), "select 1;\r\n");
      writeFileSync(join(pasta, "0070_a.sql"), "-- versao-minima-do-programa: 0.9.45\r\nselect 1;\r\n");
      const lista = comoNoWindows(() => listarMigrations(pasta));
      expect(lista.map((m: { numero: number }) => m.numero)).toEqual([70, 71]);
      expect(lista.map((m: { versaoMinima: string | null }) => m.versaoMinima)).toEqual(["0.9.45", null]);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it("a trava do número repetido continua acusando o número, e não o caminho", () => {
    const pasta = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      writeFileSync(join(pasta, "0058_a.sql"), "");
      writeFileSync(join(pasta, "0058_b.sql"), "");
      expect(() => comoNoWindows(() => listarMigrations(pasta))).toThrow(/número 58/);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});

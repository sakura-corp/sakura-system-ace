// Guarda contra o arquivo de instalação ficar pra trás.
//
// O risco real: alguém cria a migration 0048, mescla na main, e esquece de
// rodar `npm run gerar-instalacao`. O banco de quem já usa o sistema continua
// certo (essa pessoa roda a migration nova à mão), mas a PRÓXIMA loja instalada
// nasce com um banco desatualizado — e isso só aparece bem depois, como um erro
// estranho numa tela específica. Este teste transforma esse esquecimento num
// `npm test` vermelho.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  listarMigrations,
  migrationsSemRegistroDeVersao,
  montarInstalacaoCompleta,
  // @ts-expect-error — script utilitário em .mjs puro, sem tipos
} from "./gerar-instalacao-completa.mjs";

const ARQUIVO = "supabase/instalacao/instalacao-completa.sql";

// No Windows, o Git entrega os .sql com fim de linha CRLF (\r\n), e o arquivo
// gravado e o montado diferem só nisso (#511). O que importa é o conteúdo:
// o fim de linha é passado pra \n antes de comparar, nos dois lados.
const semCRLF = (texto: string) => texto.replace(/\r\n/g, "\n");

function confereAtualizado(gravado: string, esperado: string) {
  expect(
    semCRLF(gravado),
    "O arquivo de instalação está desatualizado. Rode: npm run gerar-instalacao",
  ).toBe(semCRLF(esperado));
}

/** Onde cada migration aparece como cabeçalho de seção no arquivo gerado (-1 = não aparece). */
function posicoesDasMigrations(gravado: string, migrations: string[]) {
  const texto = semCRLF(gravado);
  return migrations.map((nome) => texto.indexOf(`\n-- ${nome}\n`));
}

describe("arquivo de instalação completa", () => {
  it("está atualizado com as migrations de hoje", () => {
    const gravado = readFileSync(ARQUIVO, "utf8");
    const esperado: string = montarInstalacaoCompleta();

    confereAtualizado(gravado, esperado);
  });

  it("inclui todas as migrations, na ordem numérica", () => {
    const gravado = readFileSync(ARQUIVO, "utf8");
    const migrations: string[] = listarMigrations();

    const posicoes = posicoesDasMigrations(gravado, migrations);

    expect(posicoes.every((p) => p >= 0), "alguma migration ficou de fora").toBe(true);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });
});

// A prova no Linux, imitando o checkout do Windows: as migrations e o arquivo
// gravado com CRLF. As duas checagens de cima têm que continuar valendo —
// passar quando está em dia e reprovar quando não está.
describe("no Windows (fim de linha CRLF, #511)", () => {
  const comCRLF = (texto: string) => texto.replace(/\r?\n/g, "\r\n");

  function pastaComCRLF() {
    const pasta = mkdtempSync(join(tmpdir(), "migrations-"));
    writeFileSync(join(pasta, "0001_a.sql"), comCRLF("create table a ();\ninsert into a values (1);\n"));
    writeFileSync(join(pasta, "0002_b.sql"), comCRLF("create table b ();\n"));
    return pasta;
  }

  it("o arquivo em dia passa, mesmo com tudo em CRLF", () => {
    const pasta = pastaComCRLF();
    try {
      const gravado = comCRLF(montarInstalacaoCompleta(pasta));
      expect(gravado).toContain("\r\n");
      confereAtualizado(gravado, montarInstalacaoCompleta(pasta));
      const posicoes = posicoesDasMigrations(gravado, listarMigrations(pasta));
      expect(posicoes.every((p) => p >= 0)).toBe(true);
      expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });

  it("e o arquivo desatualizado continua reprovando", () => {
    const pasta = pastaComCRLF();
    try {
      const gravado = comCRLF(montarInstalacaoCompleta(pasta));
      writeFileSync(join(pasta, "0003_nova.sql"), comCRLF("create table c ();\n"));
      expect(() => confereAtualizado(gravado, montarInstalacaoCompleta(pasta))).toThrow(/desatualizado/);
      expect(posicoesDasMigrations(gravado, listarMigrations(pasta))).toContain(-1);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});

describe("registro da própria versão em schema_versao", () => {
  it("todas as migrations de hoje registram a própria versão", () => {
    const esquecidas: string[] = migrationsSemRegistroDeVersao();

    expect(
      esquecidas,
      "Migration nova precisa terminar com: insert into schema_versao (versao) values (N) on conflict do nothing;",
    ).toEqual([]);
  });

  // A checagem acima passaria sozinha hoje, porque ainda não existe migration
  // depois da 0055 — ou seja, ela ainda não provou nada. Este teste planta o
  // esquecimento de propósito, que é a única forma de saber que a trava
  // funciona no dia em que alguém esquecer (a lição do item 53 da seção 6).
  it("acusa a migration que esqueceu, e só ela", () => {
    const pasta = mkdtempSync(join(tmpdir(), "migrations-"));
    try {
      writeFileSync(join(pasta, "0055_schema_versao.sql"), "create table schema_versao ();");
      writeFileSync(
        join(pasta, "0056_com_registro.sql"),
        "alter table pecas add column x int;\ninsert into schema_versao (versao) values (56) on conflict do nothing;",
      );
      writeFileSync(join(pasta, "0057_esqueceu.sql"), "alter table pecas add column y int;");
      // O número tem que ser o DELA: copiar a linha da migration anterior é o
      // engano mais provável, e passaria batido numa busca só por "schema_versao".
      writeFileSync(
        join(pasta, "0058_numero_errado.sql"),
        "alter table pecas add column z int;\ninsert into schema_versao (versao) values (57);",
      );

      expect(migrationsSemRegistroDeVersao(pasta)).toEqual([
        "0057_esqueceu.sql",
        "0058_numero_errado.sql",
      ]);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});

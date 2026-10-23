import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MIGRATIONS_QUE_ESPERAM_OS_COMPUTADORES,
  PRIMEIRA_VERSAO_REGISTRADA,
  VERSAO_ESQUEMA_ESPERADA,
  numeroDaMigration,
  situacaoDoEsquema,
} from "./versaoEsquema";

describe("VERSAO_ESQUEMA_ESPERADA", () => {
  // A trava que faz o aviso valer alguma coisa. Se a constante ficar pra trás,
  // o app diz "está tudo em dia" contra um banco que não recebeu a migration
  // nova — ou seja, o item inteiro deixa de funcionar justo no dia em que
  // precisaria. Isso tem que ser um `npm test` vermelho, não uma surpresa na
  // loja.
  it("é a maior migration da pasta", () => {
    const maior = readdirSync("supabase/migrations")
      .filter((nome) => nome.endsWith(".sql"))
      .map((nome) => Number(nome.slice(0, 4)))
      .reduce((a, b) => Math.max(a, b), 0);

    expect(
      VERSAO_ESQUEMA_ESPERADA,
      "Criou migration nova? Suba VERSAO_ESQUEMA_ESPERADA em src/schemas/versaoEsquema.ts",
    ).toBe(maior);
  });
});

describe("MIGRATIONS_QUE_ESPERAM_OS_COMPUTADORES", () => {
  // Se uma migration nova declarar a espera e ficar fora da lista, a faixa
  // amarela volta a aparecer nas lojas por dias (#757). Se a lista tiver uma
  // que não declara, a faixa some justo quando falta migration de verdade.
  it("é exatamente as migrations que declaram versao-minima-do-programa", () => {
    const declaradas: Record<number, string> = {};
    for (const nome of readdirSync("supabase/migrations").filter((n) => n.endsWith(".sql"))) {
      const casou = /^--\s*versao-minima-do-programa:\s*(\S+)\s*$/m.exec(
        readFileSync(`supabase/migrations/${nome}`, "utf8"),
      );
      if (casou) declaradas[Number(nome.slice(0, 4))] = casou[1];
    }

    expect(
      MIGRATIONS_QUE_ESPERAM_OS_COMPUTADORES,
      "Migration nova com versao-minima-do-programa? Acrescente em src/schemas/versaoEsquema.ts",
    ).toEqual(declaradas);
  });
});

describe("situacaoDoEsquema", () => {
  it("não mostra nada quando não deu pra perguntar", () => {
    expect(situacaoDoEsquema(null).estado).toBe("desconhecido");
    expect(situacaoDoEsquema(null).faltando).toEqual([]);
  });

  it("fica quieto quando os dois números batem", () => {
    expect(situacaoDoEsquema(60, 60).estado).toBe("em_dia");
  });

  it("lista o que falta rodar quando o banco está atrás", () => {
    const situacao = situacaoDoEsquema(57, 60);

    expect(situacao.estado).toBe("banco_atrasado");
    expect(situacao.faltando).toEqual(["0058", "0059", "0060"]);
  });

  it("não lista o mundo inteiro quando o banco é anterior à tabela", () => {
    // Banco sem `schema_versao` responde 0. Ele rodou as 54 primeiras (senão
    // o app nem abriria), então listar "0001 a 0057" seria assustar sem
    // informar — o que se sabe é que falta da 0055 pra frente.
    const situacao = situacaoDoEsquema(0, 57);

    expect(situacao.faltando).toEqual(["0055", "0056", "0057"]);
    expect(situacao.faltando[0]).toBe(numeroDaMigration(PRIMEIRA_VERSAO_REGISTRADA));
  });

  it("avisa o contrário quando o banco está na frente", () => {
    // Acontece quando ela roda a migration nova antes do auto-update chegar
    // naquele computador — a ordem CERTA, aliás. Não é erro, é "atualize o
    // programa".
    const situacao = situacaoDoEsquema(61, 60);

    expect(situacao.estado).toBe("app_atrasado");
    expect(situacao.faltando).toEqual([]);
  });

  describe("migration que espera os computadores de propósito (#757)", () => {
    const esperam = { 62: "0.9.43", 69: "0.9.54" };

    it("não é banco atrasado quando só falta ela", () => {
      const situacao = situacaoDoEsquema(68, 69, esperam);

      expect(situacao.estado).toBe("esperando_computadores");
      expect(situacao.faltando).toEqual(["0069"]);
      expect(situacao.versaoMinimaDosComputadores).toBe("0.9.54");
    });

    it("continua banco atrasado, listando todas, quando falta outra junto", () => {
      const situacao = situacaoDoEsquema(67, 69, esperam);

      expect(situacao.estado).toBe("banco_atrasado");
      expect(situacao.faltando).toEqual(["0068", "0069"]);
    });

    it("guarda a maior versão quando faltam duas que esperam", () => {
      const situacao = situacaoDoEsquema(61, 62, { 61: "0.9.40", 62: "0.9.43" });

      expect(situacao.estado).toBe("esperando_computadores");
      expect(situacao.versaoMinimaDosComputadores).toBe("0.9.43");
    });
  });
});

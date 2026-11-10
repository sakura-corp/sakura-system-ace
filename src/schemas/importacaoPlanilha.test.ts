import { describe, expect, it } from "vitest";
import { decodificarArquivo, lerCsv } from "./importacaoPlanilha";

const utf8 = (s: string) => new TextEncoder().encode(s);
// Latin-1 de verdade: cada caractere vira 1 byte.
const latin1 = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

describe("decodificarArquivo", () => {
  it("lê UTF-8 com acento", () => {
    const r = decodificarArquivo(utf8("João;Conceição"));
    expect(r).toEqual({ texto: "João;Conceição", codificacao: "utf-8" });
  });

  it("tira o BOM do UTF-8", () => {
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8("Nome;CPF")]);
    const r = decodificarArquivo(bytes);
    expect(r.texto).toBe("Nome;CPF");
    expect(r.codificacao).toBe("utf-8");
  });

  it("cai pro Latin-1 quando os bytes não são UTF-8 (Excel do Windows)", () => {
    const bytes = latin1("João;Conceição;Antônio");
    expect([...bytes].some((b) => b > 127)).toBe(true);
    const r = decodificarArquivo(bytes);
    expect(r).toEqual({ texto: "João;Conceição;Antônio", codificacao: "latin-1" });
  });
});

describe("lerCsv", () => {
  it("acha o ponto e vírgula", () => {
    const r = lerCsv("Nome;CPF\nAna;111\n");
    expect(r.separador).toBe(";");
    expect(r.cabecalho).toEqual(["Nome", "CPF"]);
    expect(r.linhas).toEqual([["Ana", "111"]]);
  });

  it("acha a vírgula", () => {
    const r = lerCsv("Nome,CPF\nAna,111\n");
    expect(r.separador).toBe(",");
    expect(r.linhas).toEqual([["Ana", "111"]]);
  });

  it("só olha o separador fora de aspas: vírgula dentro de aspas não decide", () => {
    const r = lerCsv('"Nome, completo";CPF\nAna;1\n');
    expect(r.separador).toBe(";");
    expect(r.cabecalho).toEqual(["Nome, completo", "CPF"]);
  });

  it("o separador sai só do cabeçalho: vírgulas nas linhas de dados não enganam", () => {
    const r = lerCsv("Nome;Obs\nAna;a,b,c,d,e\nBia;x,y,z\n");
    expect(r.separador).toBe(";");
    expect(r.linhas[0]).toEqual(["Ana", "a,b,c,d,e"]);
  });

  it("respeita ';' dentro de aspas e aspas escapadas", () => {
    const r = lerCsv('Nome;Obs\n"Silva; Irmãos";"disse ""oi"""\n');
    expect(r.linhas).toEqual([["Silva; Irmãos", 'disse "oi"']]);
  });

  it("respeita quebra de linha dentro de aspas", () => {
    const r = lerCsv('Nome;Obs\r\nAna;"linha 1\r\nlinha 2"\r\nBia;x\r\n');
    expect(r.linhas).toEqual([
      ["Ana", "linha 1\r\nlinha 2"],
      ["Bia", "x"],
    ]);
  });

  it("aceita \\r\\n e \\n", () => {
    expect(lerCsv("a;b\r\n1;2\r\n3;4").linhas).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(lerCsv("a;b\n1;2\n3;4").linhas).toHaveLength(2);
  });

  it("ignora linha em branco no fim, no meio e a só de separadores", () => {
    const r = lerCsv("a;b\n1;2\n\n;\n3;4\n\n\n");
    expect(r.linhas).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("completa linha curta com texto vazio", () => {
    expect(lerCsv("a;b;c\n1\n").linhas).toEqual([["1", "", ""]]);
  });

  it("tira o BOM se ele vier no texto", () => {
    expect(lerCsv("﻿Nome;CPF\nA;1").cabecalho).toEqual(["Nome", "CPF"]);
  });

  it("arquivo vazio não quebra", () => {
    expect(lerCsv("")).toEqual({ separador: ";", cabecalho: [], linhas: [], numerosDeLinha: [] });
  });

  it("aspa no meio do campo é texto comum: não abre campo entre aspas", () => {
    const r = lerCsv('Nome;Obs\nJoao;Pneu 17" aro\nMaria;ok\nPedro;x');
    expect(r.linhas).toEqual([
      ["Joao", 'Pneu 17" aro'],
      ["Maria", "ok"],
      ["Pedro", "x"],
    ]);
  });

  it("devolve o número da linha do arquivo onde cada registro começa", () => {
    // 1 cabeçalho, 2 Ana, 3 em branco, 4-5 Bia (quebra dentro de aspas), 6 Caio
    const r = lerCsv('Nome;Obs\nAna;a\n\nBia;"x\ny"\nCaio;c');
    expect(r.linhas.map((l) => l[0])).toEqual(["Ana", "Bia", "Caio"]);
    expect(r.numerosDeLinha).toEqual([2, 4, 6]);
  });

  it("numerosDeLinha conta \\r\\n como uma quebra só", () => {
    const r = lerCsv("Nome;Obs\r\nAna;a\r\n;;\r\nBia;b");
    expect(r.numerosDeLinha).toEqual([2, 4]);
  });
});

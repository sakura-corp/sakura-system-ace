// Lê o cabeçalho de 5 linhas da issue (modelo de docs/tarefas.md). Função pura: sem rede, sem tela, nunca lança erro.
import { CHEFES, numeroValido, type Chefe } from "./comecarComClaude";
import { lerEstimativa } from "./estado";

export type Cabecalho = {
  chefe?: Chefe;
  ajudantes?: string;
  estimativaHoras?: number;
  dependeDe: number[];
  sessoesFilhas?: boolean;
  /** O que não está certo no cabeçalho, em frases curtas. Vazio = cabeçalho completo. */
  falta: string[];
};

const LIMITE_AJUDANTES = 200;

// As 5 linhas, na ordem em que precisam aparecer.
const LINHAS = [
  { chave: "chefe", nome: "Chefe", padrao: "chefe" },
  { chave: "ajudantes", nome: "Ajudantes", padrao: "ajudantes" },
  { chave: "estimativa", nome: "Estimativa", padrao: "estimativa" },
  { chave: "depende", nome: "Depende de", padrao: "depende[ \\t]+de" },
  { chave: "filhas", nome: "Sessões filhas", padrao: "sess(?:ões|oes)[ \\t]+filhas" },
] as const;

type Chave = (typeof LINHAS)[number]["chave"];

// Aceita negrito/marcador no começo (`**Chefe**: x`, `- Chefe: x`) e o `:` dentro do negrito (`**Chefe:** x`).
const REGEX_DAS_LINHAS = LINHAS.map((l) => ({
  chave: l.chave,
  regex: new RegExp(`^[ \\t>*_-]*${l.padrao}[*_]*[ \\t]*:[*_]*[ \\t]*(.*)$`, "i"),
}));

/** O trecho do começo do texto: pula linhas em branco iniciais e vai até a primeira linha em branco ou título (`#`). */
function linhasDoCabecalho(texto: string): string[] {
  const todas = texto.replace(/^﻿/, "").split(/\r?\n/);
  let i = 0;
  while (i < todas.length && todas[i].trim() === "") i++;
  const achadas: string[] = [];
  for (; i < todas.length; i++) {
    const linha = todas[i];
    if (linha.trim() === "" || /^\s*#/.test(linha)) break;
    achadas.push(linha);
  }
  return achadas;
}

function lerDependencias(valor: string, falta: string[]): number[] {
  const limpo = valor.replace(/[*_]/g, "").trim();
  if (limpo === "") {
    falta.push("a linha Depende de está vazia");
    return [];
  }
  if (limpo.toLowerCase() === "nada") return [];
  const numeros: number[] = [];
  let estranho = false;
  for (const item of limpo.split(",")) {
    const achou = /^#(\d{1,12})$/.exec(item.trim());
    const n = achou ? Number(achou[1]) : NaN;
    if (!numeroValido(n)) {
      estranho = true;
    } else if (!numeros.includes(n)) {
      numeros.push(n);
    }
  }
  if (estranho) falta.push("a linha Depende de tem um item que não é #número (ou nada)");
  return numeros;
}

/**
 * Lê o cabeçalho da issue. Nunca lança erro: o que não der pra ler vai em `falta`.
 * `chefeDaEtiqueta`: se for passado (mesmo vazio), confere se a etiqueta `chefe:` diz o mesmo que a linha Chefe.
 * Sem o 2º parâmetro, não confere a etiqueta.
 */
export function lerCabecalho(texto: string | null | undefined, chefeDaEtiqueta?: string): Cabecalho {
  const conferirEtiqueta = arguments.length >= 2;
  const resultado: Cabecalho = { dependeDe: [], falta: [] };
  try {
    const linhas = linhasDoCabecalho(typeof texto === "string" ? texto : "");
    const achadas = new Map<Chave, { posicao: number; valor: string; linha: string }>();
    linhas.forEach((linha, posicao) => {
      for (const { chave, regex } of REGEX_DAS_LINHAS) {
        const m = regex.exec(linha);
        if (m) {
          if (!achadas.has(chave)) achadas.set(chave, { posicao, valor: m[1].trim(), linha });
          return;
        }
      }
    });

    for (const l of LINHAS) {
      if (!achadas.has(l.chave)) resultado.falta.push(`falta a linha ${l.nome}`);
    }
    if (achadas.size === LINHAS.length) {
      const posicoes = LINHAS.map((l) => achadas.get(l.chave)!.posicao);
      if (posicoes.some((p, i) => i > 0 && p < posicoes[i - 1])) {
        resultado.falta.push("as linhas do cabeçalho estão fora de ordem");
      }
    }

    const chefe = achadas.get("chefe");
    if (chefe) {
      const nome = chefe.valor.replace(/[*_]/g, "").trim().toLowerCase();
      const conhecido = CHEFES.find((c) => c === nome);
      if (conhecido) {
        resultado.chefe = conhecido;
        if (conferirEtiqueta && chefeDaEtiqueta !== conhecido) {
          resultado.falta.push("a linha Chefe e a etiqueta chefe: não dizem o mesmo");
        }
      } else {
        resultado.falta.push("a linha Chefe não tem um chefe conhecido");
      }
    }

    const ajudantes = achadas.get("ajudantes");
    if (ajudantes) {
      const texto200 = ajudantes.valor.slice(0, LIMITE_AJUDANTES).trim();
      if (texto200 === "") resultado.falta.push("a linha Ajudantes está vazia");
      else resultado.ajudantes = texto200;
    }

    const estimativa = achadas.get("estimativa");
    if (estimativa) {
      const horas = lerEstimativa(estimativa.linha);
      if (horas === undefined) resultado.falta.push("a linha Estimativa não tem um número de horas");
      else resultado.estimativaHoras = horas;
    }

    const depende = achadas.get("depende");
    if (depende) resultado.dependeDe = lerDependencias(depende.valor, resultado.falta);

    const filhas = achadas.get("filhas");
    if (filhas) {
      const v = filhas.valor.replace(/[*_]/g, "").trim().toLowerCase();
      if (v === "sim") resultado.sessoesFilhas = true;
      else if (v === "não" || v === "nao") resultado.sessoesFilhas = false;
      else resultado.falta.push("a linha Sessões filhas precisa ser sim ou não");
    }
  } catch {
    resultado.falta.push("não deu pra ler o cabeçalho");
  }
  return resultado;
}

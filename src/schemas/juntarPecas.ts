/**
 * "Juntar peças repetidas" (issue #656) — a parte que dá pra conferir sem
 * banco: quais campos das duas peças são diferentes, o que a pessoa escolheu
 * de cada lado, e a prévia ("Estoque 4 + 2 = 6. 12 OS, 3 compras e 1
 * contagem passam pra Pneu 175/70 R13 Pirelli.").
 *
 * Quem junta de verdade é o banco (RPC `juntar_pecas`), numa transação só.
 * Este arquivo só prepara a pergunta e mostra a resposta antes, pela regra da
 * Sofia: o sistema NUNCA junta sozinho. Ele lista os pares suspeitos (a regra
 * de `pecaParecida.ts`, a mesma do cadastro), a pessoa abre um par, vê o que
 * vai acontecer e confirma. Quando as duas peças têm preço, código ou dado
 * fiscal diferente, ela escolhe campo por campo; nada é escolhido "no
 * escuro".
 *
 * Vocabulário: a peça que FICA é a que continua existindo (OS, compras,
 * contagens e estoque passam pra ela); a que SAI é a repetida.
 *
 * Mora em `src/schemas/`, e não na tela, pelo motivo de sempre: regra de
 * negócio escrita em tela diverge (docs/licoes.md, itens 40 e 49).
 */
import type { Peca } from "@/types/peca";
import { arredondarCentavo } from "./dinheiro";
import {
  acharPecasParecidas,
  type MotivoParecida,
  type PecaComparavel,
} from "./pecaParecida";

/**
 * Quantidade de estoque é `numeric(12,2)`: fecha em 2 casas, com a MESMA
 * conta de `dinheiro.ts` (não é dinheiro, mas é a mesma regra de 2 casas, e
 * copiar a conta é o que `dinheiro.ts` existe pra evitar). Sem isso,
 * 0,1 + 0,2 vira 0,30000000000000004 e a prévia mostraria lixo.
 */
const duasCasas = arredondarCentavo;

/**
 * Os campos que a pessoa pode trazer da peça que sai. É a MESMA lista fechada
 * da RPC `juntar_pecas` (o banco recusa nome fora dela). Na ordem da tela de
 * Produtos, com o rótulo de lá, pra pessoa reconhecer o campo.
 *
 * `tipo` diz como comparar: número compara como número ("10.00" == 10, o
 * PostgREST às vezes devolve `numeric` como texto); texto compara como texto
 * (código "0012" não é o mesmo que "12").
 */
export const CAMPOS_JUNTAVEIS = [
  { campo: "descricao", rotulo: "Descrição", tipo: "texto" },
  { campo: "codigo_barras", rotulo: "Código de barras", tipo: "texto" },
  { campo: "codigo_interno", rotulo: "Referência", tipo: "texto" },
  { campo: "marca", rotulo: "Marca", tipo: "texto" },
  { campo: "modelo", rotulo: "Modelo", tipo: "texto" },
  { campo: "unidade", rotulo: "Unidade", tipo: "texto" },
  { campo: "categoria_id", rotulo: "Categoria", tipo: "texto" },
  { campo: "estoque_minimo", rotulo: "Estoque mínimo", tipo: "numero" },
  { campo: "prazo_garantia_dias", rotulo: "Garantia (dias)", tipo: "numero" },
  { campo: "aplicacao", rotulo: "Aplicação", tipo: "texto" },
  { campo: "preco_custo", rotulo: "Preço custo", tipo: "numero" },
  { campo: "preco_venda", rotulo: "Preço venda", tipo: "numero" },
  { campo: "ncm", rotulo: "NCM", tipo: "texto" },
  { campo: "cest", rotulo: "C.E.S.T", tipo: "texto" },
  { campo: "cfop_padrao", rotulo: "CFOP padrão", tipo: "texto" },
  { campo: "origem", rotulo: "Origem", tipo: "texto" },
  { campo: "cst_ou_csosn", rotulo: "CST / CSOSN", tipo: "texto" },
  { campo: "aliquota_icms", rotulo: "Alíquota ICMS (%)", tipo: "numero" },
  { campo: "medida", rotulo: "Medida", tipo: "texto" },
  { campo: "indice_carga_velocidade", rotulo: "Índice de carga e velocidade", tipo: "texto" },
  { campo: "dot", rotulo: "DOT (semana/ano)", tipo: "texto" },
] as const satisfies readonly { campo: keyof Peca; rotulo: string; tipo: "texto" | "numero" }[];

export type CampoJuntavel = (typeof CAMPOS_JUNTAVEIS)[number]["campo"];

/** O que a tela precisa de uma peça pra comparar e juntar. */
export type PecaParaJuntar = Pick<Peca, CampoJuntavel | "id" | "ativo">;

/** Os campos de uma peça como a tela mostrou pra escolher. */
export type PecaVista = Pick<Peca, CampoJuntavel>;

/**
 * Os campos que a pessoa comparou, pra ir junto na prévia (`p_esperado`): o
 * banco recusa a junção se algum deles mudou desde que a tela abriu (senão a
 * pessoa escolheria "R$ 250,00" e ficaria gravado o preço de agora).
 */
export function pecaVista(peca: PecaParaJuntar): PecaVista {
  const vista: Partial<Record<CampoJuntavel, unknown>> = {};
  for (const { campo } of CAMPOS_JUNTAVEIS) vista[campo] = peca[campo] ?? null;
  return vista as PecaVista;
}

export interface CampoDiferente {
  campo: CampoJuntavel;
  rotulo: string;
  /** O valor como veio do banco, pra tela mostrar. */
  fica: unknown;
  sai: unknown;
}

/** null, undefined e texto só de espaço são "vazio". */
function vazio(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  return typeof valor === "string" && valor.trim() === "";
}

function iguais(a: unknown, b: unknown, tipo: "texto" | "numero"): boolean {
  if (vazio(a) || vazio(b)) return vazio(a) && vazio(b);
  if (tipo === "numero") {
    const x = Number(a);
    const y = Number(b);
    // Número que não é número (não devia acontecer) cai pra comparação de texto.
    if (Number.isFinite(x) && Number.isFinite(y)) return x === y;
  }
  return String(a).trim() === String(b).trim();
}

/** Só os campos em que as duas peças discordam, na ordem da tela. */
export function camposDiferentes(fica: PecaParaJuntar, sai: PecaParaJuntar): CampoDiferente[] {
  return CAMPOS_JUNTAVEIS.filter(({ campo, tipo }) => !iguais(fica[campo], sai[campo], tipo)).map(
    ({ campo, rotulo }) => ({ campo, rotulo, fica: fica[campo], sai: sai[campo] }),
  );
}

export type LadoEscolhido = "fica" | "sai";

/** De qual peça vem cada campo diferente. Campo que não aparece fica com a que fica. */
export type EscolhasDaJuntada = Partial<Record<CampoJuntavel, LadoEscolhido>>;

/**
 * O ponto de partida das escolhas: cada campo diferente fica com o valor da
 * peça que fica, menos quando ela está vazia e a que sai tem valor. Aí o
 * padrão é aproveitar o da que sai (juntar não pode apagar informação que só
 * a repetida tinha, como o código de barras). A pessoa pode trocar qualquer um.
 */
export function escolhasPadrao(fica: PecaParaJuntar, sai: PecaParaJuntar): EscolhasDaJuntada {
  const escolhas: EscolhasDaJuntada = {};
  for (const { campo } of camposDiferentes(fica, sai)) {
    escolhas[campo] = vazio(fica[campo]) && !vazio(sai[campo]) ? "sai" : "fica";
  }
  return escolhas;
}

/** O que vai pra RPC em `p_campos_da_que_sai`: só os campos escolhidos da peça que sai. */
export function camposDaQueSai(escolhas: EscolhasDaJuntada): CampoJuntavel[] {
  return CAMPOS_JUNTAVEIS.map(({ campo }) => campo).filter((campo) => escolhas[campo] === "sai");
}

/**
 * Como a peça que fica vai ficar, pra prévia mostrar. Faz o mesmo que a RPC:
 * copia da que sai os campos escolhidos, e a peça continua ativa se qualquer
 * uma das duas estava ativa (juntar não desativa peça em uso).
 */
export function pecaDepoisDaJuntada<T extends PecaParaJuntar>(
  fica: T,
  sai: PecaParaJuntar,
  escolhas: EscolhasDaJuntada,
): T {
  const depois = { ...fica, ativo: fica.ativo || sai.ativo };
  for (const campo of camposDaQueSai(escolhas)) {
    (depois as Record<CampoJuntavel, unknown>)[campo] = sai[campo];
  }
  return depois;
}

/** O saldo da peça numa loja, como o banco conta. */
export interface EstoqueNaLoja {
  loja_id: string;
  loja_nome: string;
  saldo: number;
}

/**
 * O que a RPC `resumo_peca_para_juntar` devolve sobre UMA peça.
 *
 * `lojas_sem_acesso` > 0: a peça aparece em loja que este admin não
 * administra, e o banco não conta nada (nem deixaria juntar). Nesse caso o
 * resto vem zerado aqui, e a tela tem que dizer isso em vez de mostrar prévia.
 *
 * `os` e `compras` são OS e pedidos DISTINTOS (pro texto da prévia);
 * `itens_os` e `itens_compra` são as linhas (pra conferir com o banco depois).
 */
export interface ResumoPecaJuntar {
  lojas_sem_acesso: number;
  movimentos: number;
  itens_os: number;
  os: number;
  contagens: number;
  itens_compra: number;
  compras: number;
  cotacoes: number;
  estoque: EstoqueNaLoja[];
}

/** Número do jsonb: o PostgREST manda `numeric` às vezes como texto. Ausente vira 0. */
function numero(valor: unknown): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Normaliza a resposta da RPC (número como número, saldo em 2 casas). */
export function lerResumo(json: unknown): ResumoPecaJuntar {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("O banco respondeu o resumo da peça num formato inesperado.");
  }
  const r = json as Record<string, unknown>;
  const estoque = Array.isArray(r.estoque) ? (r.estoque as Record<string, unknown>[]) : [];
  return {
    lojas_sem_acesso: numero(r.lojas_sem_acesso),
    movimentos: numero(r.movimentos),
    itens_os: numero(r.itens_os),
    os: numero(r.os),
    contagens: numero(r.contagens),
    itens_compra: numero(r.itens_compra),
    compras: numero(r.compras),
    cotacoes: numero(r.cotacoes),
    estoque: estoque.map((e) => ({
      loja_id: String(e.loja_id),
      loja_nome: String(e.loja_nome ?? ""),
      saldo: duasCasas(numero(e.saldo)),
    })),
  };
}

/** Uma linha da tabela de estoque da prévia. */
export interface EstoqueNaPrevia {
  loja_id: string;
  loja_nome: string;
  fica: number;
  sai: number;
  depois: number;
}

/**
 * Tudo o que a tela mostra antes do "Juntar".
 *
 * - `completa`: falso quando o admin não cuida de alguma loja de uma das
 *   duas peças. Aí os números vêm zerados, a `frase` explica isso, e a tela
 *   não deve oferecer o "Juntar" (o banco também recusaria).
 * - `estoquePorLoja`: as lojas das duas peças (primeiro as da que fica, na
 *   ordem do banco; depois as que só a que sai tem). Loja que só um lado tem
 *   aparece com 0 do outro.
 * - `totaisDepois`: quanto a peça que fica vai ter depois, somando as duas.
 *   Depois de juntar, o resumo que a RPC devolve tem que bater com isto.
 *   OS e compras distintas não entram: uma OS com as duas peças contaria duas
 *   vezes na soma, então a conferência é pelas linhas (`itens_os`,
 *   `itens_compra`).
 * - `passa`: o que muda de peça (o que a que sai tinha).
 */
export interface PreviaDaJuntada {
  completa: boolean;
  descricaoFinal: string;
  estoquePorLoja: EstoqueNaPrevia[];
  estoqueTotal: { fica: number; sai: number; depois: number };
  totaisDepois: {
    movimentos: number;
    itens_os: number;
    contagens: number;
    itens_compra: number;
    cotacoes: number;
  };
  passa: { os: number; compras: number; contagens: number; movimentos: number; cotacoes: number };
  frase: string;
}

/** Soma de quantidades, fechada em 2 casas (a soma de 2 casas também deixa cauda). */
function somarQtd(...valores: number[]): number {
  return duasCasas(valores.reduce((soma, v) => soma + v, 0));
}

function estoquePorLoja(fica: ResumoPecaJuntar, sai: ResumoPecaJuntar): EstoqueNaPrevia[] {
  const linhas = new Map<string, EstoqueNaPrevia>();
  const linha = (e: EstoqueNaLoja): EstoqueNaPrevia => {
    let l = linhas.get(e.loja_id);
    if (!l) {
      l = { loja_id: e.loja_id, loja_nome: e.loja_nome, fica: 0, sai: 0, depois: 0 };
      linhas.set(e.loja_id, l);
    }
    return l;
  };
  for (const e of fica.estoque) linha(e).fica = somarQtd(linha(e).fica, e.saldo);
  for (const e of sai.estoque) linha(e).sai = somarQtd(linha(e).sai, e.saldo);
  return [...linhas.values()].map((l) => ({ ...l, depois: somarQtd(l.fica, l.sai) }));
}

/** Quantidade como a pessoa lê: "4", "4,5", "1.234,25" (no máximo 2 casas). */
function qtd(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** "a", "a e b", "a, b e c". */
function emLista(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

/**
 * A frase da Sofia: "Estoque 4 + 2 = 6. 12 OS, 3 compras e 1 contagem passam
 * pra Pneu 175/70 R13 Pirelli." O estoque é o total de todas as lojas; o
 * detalhe por loja fica na tabela. Movimento de estoque não entra no texto (é
 * o estoque, já dito na primeira parte).
 */
function montarFrase(
  estoque: { fica: number; sai: number; depois: number },
  passa: PreviaDaJuntada["passa"],
  descricao: string,
): string {
  const conta =
    estoque.sai < 0
      ? `${qtd(estoque.fica)} - ${qtd(-estoque.sai)}`
      : `${qtd(estoque.fica)} + ${qtd(estoque.sai)}`;
  const inicio = `Estoque ${conta} = ${qtd(estoque.depois)}.`;

  const itens: [number, string, string][] = [
    [passa.os, "OS", "OS"],
    [passa.compras, "compra", "compras"],
    [passa.contagens, "contagem", "contagens"],
    [passa.cotacoes, "cotação", "cotações"],
  ];
  const presentes = itens.filter(([n]) => n > 0); // zero não aparece
  const partes = presentes.map(([n, um, varios]) => `${qtd(n)} ${n === 1 ? um : varios}`);
  if (partes.length === 0) {
    return `${inicio} Nenhuma OS, compra, contagem ou cotação passa pra ${descricao}.`;
  }
  // "1 OS passa"; "2 OS passam"; "1 OS e 1 compra passam".
  const verbo = presentes.length === 1 && presentes[0][0] === 1 ? "passa" : "passam";
  return `${inicio} ${emLista(partes)} ${verbo} pra ${descricao}.`;
}

const FRASE_SEM_ACESSO =
  "Uma das peças aparece em loja que você não administra. " +
  "Só quem administra todas as lojas dela pode juntar.";

export function previaDaJuntada({
  fica,
  sai,
  resumoFica,
  resumoSai,
  escolhas,
}: {
  fica: PecaParaJuntar;
  sai: PecaParaJuntar;
  resumoFica: ResumoPecaJuntar;
  resumoSai: ResumoPecaJuntar;
  escolhas: EscolhasDaJuntada;
}): PreviaDaJuntada {
  const completa = resumoFica.lojas_sem_acesso === 0 && resumoSai.lojas_sem_acesso === 0;
  const porLoja = estoquePorLoja(resumoFica, resumoSai);
  const totalFica = somarQtd(...porLoja.map((l) => l.fica));
  const totalSai = somarQtd(...porLoja.map((l) => l.sai));
  const passa = {
    os: resumoSai.os,
    compras: resumoSai.compras,
    contagens: resumoSai.contagens,
    movimentos: resumoSai.movimentos,
    cotacoes: resumoSai.cotacoes,
  };
  const estoqueTotal = { fica: totalFica, sai: totalSai, depois: somarQtd(totalFica, totalSai) };
  const descricaoFinal = pecaDepoisDaJuntada(fica, sai, escolhas).descricao.trim();
  const soma = (campo: "movimentos" | "itens_os" | "contagens" | "itens_compra" | "cotacoes") =>
    resumoFica[campo] + resumoSai[campo];
  return {
    completa,
    descricaoFinal,
    estoquePorLoja: porLoja,
    estoqueTotal,
    totaisDepois: {
      movimentos: soma("movimentos"),
      itens_os: soma("itens_os"),
      contagens: soma("contagens"),
      itens_compra: soma("itens_compra"),
      cotacoes: soma("cotacoes"),
    },
    passa,
    frase: completa
      ? montarFrase(estoqueTotal, passa, descricaoFinal)
      : FRASE_SEM_ACESSO,
  };
}

/** Um par de peças que a regra de `pecaParecida.ts` acha que são a mesma. */
export interface ParSuspeito<T> {
  /** `a` veio antes de `b` na lista recebida; quem fica é `quemFicaPorPadrao`. */
  a: T;
  b: T;
  motivo: MotivoParecida;
  semelhanca: number;
}

/** Do mais forte pro mais fraco: código de barras, código interno, nome. */
const ORDEM_MOTIVO: Record<MotivoParecida, number> = {
  codigo_barras: 0,
  codigo_interno: 1,
  nome: 2,
};

/*
 * Por que os grupos. Comparar cada peça com todas as outras é conta de
 * n × n: com 3.000 peças eram uns 17 segundos com a tela travada. Mas a regra
 * de `pecaParecida.ts` só junta duas peças por um de três caminhos, e cada um
 * exige uma coisa em comum:
 *   - mesmo código de barras (válido);
 *   - mesmo código interno (válido);
 *   - nome parecido, que só vale com o MESMO conjunto de números (a medida).
 * Então basta separar as peças em grupos por essas três chaves e comparar só
 * dentro de cada grupo. Os grupos precisam ser um SUPERCONJUNTO do que a regra
 * acharia: chave mais larga só custa tempo; chave mais estreita perde par. O
 * teste de propriedade (`juntarPecas.test.ts`) compara com a comparação de
 * todas contra todas em catálogos aleatórios.
 *
 * As chaves copiam a normalização de `pecaParecida.ts` (lá ela é privada).
 * Se a regra de lá mudar, o teste de propriedade avisa.
 */

/** O mesmo `normalizar` de `pecaParecida.ts`: sem acento, minúsculo, sem espaço nas pontas. */
function normalizarComoParecida(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Código que nunca casa em `pecaParecida.ts` (vazio, ou "SEM GTIN" da nota). */
const NAO_E_CODIGO = new Set(["", "sem gtin"]);

/** Chave do código, ou null quando ele nunca casa (aí a peça não entra no grupo). */
function chaveDoCodigo(codigo: string | null): string | null {
  const chave = normalizarComoParecida(codigo);
  return NAO_E_CODIGO.has(chave) ? null : chave;
}

/** Os números da descrição + medida, sem zero à esquerda, como `numerosDaPeca`. */
function chaveDosNumeros(p: PecaComparavel): string {
  const texto = `${normalizarComoParecida(p.descricao)} ${normalizarComoParecida(p.medida)}`;
  const unicos = new Set((texto.match(/\d+/g) ?? []).map((n) => String(Number(n))));
  return [...unicos].sort().join(",");
}

/**
 * Os pares suspeitos do cadastro, cada um uma vez só (nunca (a,b) e (b,a)),
 * do mais forte pro mais fraco (empate: na ordem da lista). É SUGESTÃO: a
 * pessoa abre o par e decide; o sistema nunca junta sozinho. Quem diz se o par
 * é parecido é a mesma regra do aviso do cadastro (`acharPecasParecidas`), pra
 * "parecida" querer dizer a mesma coisa nos dois lugares; os grupos acima só
 * evitam comparar peças que nunca poderiam ser parecidas.
 */
export function paresSuspeitos<T extends PecaComparavel & { id: string }>(
  pecas: T[],
): ParSuspeito<T>[] {
  const grupos = new Map<string, number[]>();
  const entrar = (chave: string, i: number) => {
    const grupo = grupos.get(chave);
    if (grupo) grupo.push(i);
    else grupos.set(chave, [i]);
  };
  pecas.forEach((p, i) => {
    // Prefixo diferente por chave: código "13" e medida "13" não se misturam.
    const barras = chaveDoCodigo(p.codigo_barras);
    if (barras !== null) entrar(`b:${barras}`, i);
    const interno = chaveDoCodigo(p.codigo_interno);
    if (interno !== null) entrar(`i:${interno}`, i);
    entrar(`n:${chaveDosNumeros(p)}`, i);
  });

  // Cada par (i < j) uma vez só, mesmo que as duas peças dividam mais de um grupo.
  const vistos = new Set<string>();
  const pares: (ParSuspeito<T> & { i: number; j: number })[] = [];
  for (const grupo of grupos.values()) {
    for (let x = 0; x < grupo.length; x++) {
      for (let y = x + 1; y < grupo.length; y++) {
        const i = grupo[x];
        const j = grupo[y]; // os índices entram em ordem crescente, então i < j
        const chave = `${i},${j}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        const [achada] = acharPecasParecidas(pecas[i], [pecas[j]]);
        if (achada) {
          const { motivo, semelhanca } = achada;
          pares.push({ a: pecas[i], b: pecas[j], motivo, semelhanca, i, j });
        }
      }
    }
  }
  return pares
    .sort(
      (x, y) =>
        ORDEM_MOTIVO[x.motivo] - ORDEM_MOTIVO[y.motivo] ||
        y.semelhanca - x.semelhanca ||
        x.i - y.i ||
        x.j - y.j,
    )
    .map(({ a, b, motivo, semelhanca }) => ({ a, b, motivo, semelhanca }));
}

/** Os dígitos depois do milissegundo ("…00.123456" → 456), que o `Date` joga fora. */
function microssegundos(iso: string): number {
  const fracao = /\.(\d+)/.exec(iso)?.[1] ?? "";
  return Number(fracao.padEnd(6, "0").slice(3, 6));
}

/** Negativo se `x` foi cadastrada antes de `y`. */
function compararCriacao(x: string, y: string): number {
  const dx = Date.parse(x);
  const dy = Date.parse(y);
  if (Number.isNaN(dx) || Number.isNaN(dy)) return x < y ? -1 : x > y ? 1 : 0;
  return dx - dy || microssegundos(x) - microssegundos(y);
}

/**
 * O padrão de quem fica: a cadastrada primeiro (é a que tem mais história e
 * a que a loja conhece há mais tempo). Empate: o menor id, só pra a resposta
 * nunca depender da ordem em que as duas chegaram. A pessoa pode inverter.
 */
export function quemFicaPorPadrao<T extends { id: string; criado_em: string }>(
  a: T,
  b: T,
): { fica: T; sai: T } {
  const porId = a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const ordem = compararCriacao(a.criado_em, b.criado_em) || porId;
  return ordem <= 0 ? { fica: a, sai: b } : { fica: b, sai: a };
}

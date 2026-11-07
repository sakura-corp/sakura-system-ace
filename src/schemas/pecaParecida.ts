/**
 * "Essa peça já existe?" — a regra de peça parecida, em um lugar só.
 *
 * Mora aqui, e não dentro da tela de Produtos, porque a MESMA pergunta
 * aparece em dois lugares: o cadastro de peça avulsa no orçamento e a
 * ferramenta de juntar peças repetidas (issue #653). Regra de negócio
 * repetida é regra de negócio que diverge (docs/licoes.md).
 *
 * É só AVISO, nunca tranca (docs/licoes.md, item 33): quem chama mostra
 * "parece com tal peça" e a pessoa decide. Por isso a função prefere errar
 * pra menos: avisar de peça que não é igual ensina a ignorar o aviso.
 *
 * Parecida = mesmo código de barras, OU mesmo código interno, OU nome muito
 * parecido. Código vazio nunca casa (duas peças sem código não são iguais).
 *
 * No nome, a MEDIDA CONTA MAIS que o resto do texto: se os números da peça
 * (da descrição + do campo `medida`) forem diferentes, não é parecida pelo
 * nome, por mais parecido que o texto seja. É o que separa R13 de R14 e o
 * filtro PSL55 do PSL56 — pra um autocenter, são peças diferentes.
 *
 * O LADO também manda (#708, Sofia 23/10): "LE" × "LD" (ou esquerdo × direito)
 * é peça diferente, como R13 × R14. Se só uma das duas diz o lado, o nome decide.
 *
 * No pneu, o índice de carga e velocidade ("82T", "91H") NÃO é medida (#708):
 * com ele ou sem ele, é a mesma peça. Só vale quando há uma MEDIDA de pneu
 * (175/70 R13, 90/90-18, aro 14): a palavra "pneu" sozinha não basta, senão o
 * "compressor para pneu 12V" × "220V" virava a mesma peça; e fora de pneu,
 * "55W" × "60W" numa lâmpada é peça diferente.
 */

export interface PecaComparavel {
  id?: string;
  descricao: string;
  codigo_interno: string | null;
  codigo_barras: string | null;
  medida: string | null;
}

export type MotivoParecida = "codigo_barras" | "codigo_interno" | "nome";

export interface PecaParecida<T> {
  peca: T;
  motivo: MotivoParecida;
  /** De 0 a 1. Os códigos valem 1; o nome vale o coeficiente de Dice. */
  semelhanca: number;
}

/** Frase curta pra tela. */
export const MOTIVO_PARECIDA_ROTULO: Record<MotivoParecida, string> = {
  codigo_barras: "mesmo código de barras",
  codigo_interno: "mesmo código interno",
  nome: "nome muito parecido",
};

/** A partir daqui o nome conta como "muito parecido". */
const LIMITE_NOME = 0.8;

/**
 * Pra lista que só ORDENA (o "É uma peça que já tenho" do orçamento, #741): lá a pessoa já disse que a peça existe,
 * e pôr uma peça a mais no topo não avisa nem tranca nada. "Bico de valvula cromado" × "Bico de válvula (exemplo)"
 * dá 0,68. A medida continua mandando (R13 × R14 dá 0).
 */
export const LIMITE_NOME_PARA_ORDENAR = 0.6;

/** Do mais forte pro mais fraco, pra ordenar o resultado. */
const FORCA: Record<MotivoParecida, number> = { codigo_barras: 3, codigo_interno: 2, nome: 1 };

function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acento
    .toLowerCase()
    .trim();
}

/** É pneu? Uma medida de pneu na descrição ou na medida: 175/70 R13 (ou ZR, ou colado), 90/90-18 (moto), aro 14. */
const PARECE_PNEU =
  /\d{3}\s*\/\s*\d{2}\s*z?r\s*\d{2}|\d{2,3}\s*\/\s*\d{2}\s*-\s*\d{2}|(^|[^a-z0-9])aro\s*\d{2}(?!\d)/;

/** O índice de carga e velocidade do pneu: 2 ou 3 dígitos e a letra da velocidade ("82T", "91H"), palavra solta. */
const INDICE_DE_CARGA = /(^|[^a-z0-9])\d{2,3}[hjklmnpqrstuvwyz](?![a-z0-9])/g;

/** O texto normalizado, sem o índice de carga quando a peça é pneu (#708). */
function semIndiceDeCarga(texto: string, ehPneu: boolean): string {
  return ehPneu ? texto.replace(INDICE_DE_CARGA, "$1") : texto;
}

function ehPneu(p: PecaComparavel): boolean {
  return PARECE_PNEU.test(`${normalizar(p.descricao)} ${normalizar(p.medida)}`);
}

/** Pedaços do nome: letra separada de número, sem pontuação, em ordem alfabética. */
function pedacos(texto: string): string[] {
  return (texto.match(/\d+|[a-z]+/g) ?? []).sort();
}

/** As palavras que dizem o lado da peça, e o lado de cada uma. */
const LADOS: Record<string, "e" | "d"> = {
  le: "e",
  esquerdo: "e",
  esquerda: "e",
  ld: "d",
  direito: "d",
  direita: "d",
};

/** O lado da peça ("e", "d", "de" se diz os dois) ou "" quando não diz. */
function ladoDaPeca(descricao: string): string {
  const lados = new Set<string>();
  for (const palavra of descricao.match(/[a-z]+/g) ?? []) {
    const lado = LADOS[palavra];
    if (lado) lados.add(lado);
  }
  return [...lados].sort().join("");
}

/** Conjunto de números (sequências de dígitos) da descrição + medida, como texto ordenado. */
function numerosDaPeca(p: PecaComparavel, pneu: boolean): string {
  const texto = `${normalizar(p.descricao)} ${normalizar(p.medida)}`;
  const todos = semIndiceDeCarga(texto, pneu).match(/\d+/g) ?? [];
  // Sem zeros à esquerda: "070" e "70" são o mesmo número.
  const unicos = new Set(todos.map((n) => String(Number(n))));
  return [...unicos].sort().join(",");
}

/**
 * Os bigramas (pares de letras vizinhas) do texto, cada um virado número
 * (código da 1ª letra × 65536 + da 2ª) e em ordem crescente, com repetição.
 * Número e lista ordenada, e não um mapa de textos, pra a conta dos comuns ser
 * uma passada só pelas duas listas (#721: o "juntar peças" faz essa conta
 * centenas de milhares de vezes).
 */
function bigramas(texto: string): number[] {
  const lista: number[] = [];
  for (let i = 0; i < texto.length - 1; i++) {
    lista.push(texto.charCodeAt(i) * 65536 + texto.charCodeAt(i + 1));
  }
  return lista.sort((a, b) => a - b);
}

/**
 * Quantos bigramas as duas listas ordenadas têm em comum, contando repetição
 * (um "aa" de um lado e dois do outro: 1 em comum).
 */
function bigramasEmComum(a: number[], b: number[]): number {
  let comuns = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      comuns++;
      i++;
      j++;
    } else if (a[i] < b[j]) i++;
    else j++;
  }
  return comuns;
}

/** "SEM GTIN" é o que a nota do fornecedor traz quando a peça não tem código
 *  de barras; digitado à mão, não pode virar "o mesmo código" de todas. */
const NAO_E_CODIGO = new Set(["", "sem gtin"]);

/** O código normalizado, ou null quando ele nunca casa (vazio, "SEM GTIN"). */
function codigoQueCasa(codigo: string | null): string | null {
  const x = normalizar(codigo);
  return NAO_E_CODIGO.has(x) ? null : x;
}

/**
 * A peça já normalizada pra comparar (#721): o que a regra olha, calculado
 * uma vez só por peça. Quem compara muitas peças entre si (o "juntar peças
 * repetidas") prepara cada uma uma vez e compara as preparadas, em vez de
 * normalizar as duas de novo a cada par.
 *
 * `codigoBarras`, `codigoInterno` e `numeros` também servem de CHAVE de
 * grupo: duas peças só podem ser parecidas se tiverem o mesmo código de
 * barras, o mesmo código interno ou os mesmos números (`compararPreparadas`).
 */
export interface PecaPreparada {
  /** Normalizado; null quando nunca casa (vazio, "SEM GTIN"). */
  codigoBarras: string | null;
  codigoInterno: string | null;
  /** Os números da descrição + medida, sem zero à esquerda, ordenados ("13,175,70"). */
  numeros: string;
  /** O lado que a descrição diz ("e", "d", "de"), ou "" quando não diz (#708). */
  lado: string;
  /**
   * O nome, preparado só quando a regra chega a comparar nomes (mesmos
   * números, nenhum código igual): no aviso do cadastro, a maioria das peças
   * para antes, e preparar o nome de todas seria trabalho jogado fora.
   */
  descricao: string;
  /** É pneu? Decide se o índice de carga ("82T") sai do nome. */
  pneu: boolean;
  nomePreparado?: { nome: string; bigramas: number[] };
}

export function prepararPeca(p: PecaComparavel): PecaPreparada {
  const pneu = ehPneu(p);
  return {
    codigoBarras: codigoQueCasa(p.codigo_barras),
    codigoInterno: codigoQueCasa(p.codigo_interno),
    numeros: numerosDaPeca(p, pneu),
    lado: ladoDaPeca(normalizar(p.descricao)),
    descricao: p.descricao,
    pneu,
  };
}

/** Os pedaços do nome em ordem alfabética (unidos por espaço) e os bigramas, na 1ª vez que precisa. */
function nomeDe(p: PecaPreparada): { nome: string; bigramas: number[] } {
  if (!p.nomePreparado) {
    const nome = pedacos(semIndiceDeCarga(normalizar(p.descricao), p.pneu)).join(" ");
    p.nomePreparado = { nome, bigramas: bigramas(nome) };
  }
  return p.nomePreparado;
}

/** Coeficiente de Dice de bigramas das duas, de 0 a 1 (o mesmo `dice` de antes). */
function diceDasPreparadas(pa: PecaPreparada, pb: PecaPreparada, limite: number): number {
  const a = nomeDe(pa);
  const b = nomeDe(pb);
  if (a.nome === b.nome) return a.nome.length > 0 ? 1 : 0;
  const ta = Math.max(a.nome.length - 1, 0);
  const tb = Math.max(b.nome.length - 1, 0);
  const total = ta + tb;
  if (total === 0) return 0;
  // Atalho: no máximo todos os bigramas do nome menor são comuns. Se nem
  // assim chega no limite, nem conta (a resposta seria "não parecida" igual).
  if ((2 * Math.min(ta, tb)) / total < limite) return 0;
  return (2 * bigramasEmComum(a.bigramas, b.bigramas)) / total;
}

/**
 * A regra inteira, entre duas peças já preparadas: o motivo mais forte, ou
 * null quando não são parecidas. `acharPecasParecidas` é esta função
 * aplicada a cada peça do cadastro.
 */
export function compararPreparadas(
  a: PecaPreparada,
  b: PecaPreparada,
  limiteNome: number = LIMITE_NOME,
): { motivo: MotivoParecida; semelhanca: number } | null {
  if (a.codigoBarras !== null && a.codigoBarras === b.codigoBarras) {
    return { motivo: "codigo_barras", semelhanca: 1 };
  }
  if (a.codigoInterno !== null && a.codigoInterno === b.codigoInterno) {
    return { motivo: "codigo_interno", semelhanca: 1 };
  }
  if (a.numeros !== b.numeros) return null; // a medida manda
  if (a.lado !== "" && b.lado !== "" && a.lado !== b.lado) return null; // o lado também (#708)
  const semelhanca = diceDasPreparadas(a, b, limiteNome);
  return semelhanca >= limiteNome ? { motivo: "nome", semelhanca } : null;
}

export function acharPecasParecidas<T extends PecaComparavel>(
  nova: PecaComparavel,
  cadastro: T[],
  { limiteNome = LIMITE_NOME }: { limiteNome?: number } = {},
): PecaParecida<T>[] {
  const achadas: PecaParecida<T>[] = [];
  const preparada = prepararPeca(nova);
  for (const peca of cadastro) {
    if (nova.id !== undefined && peca.id === nova.id) continue;
    const achada = compararPreparadas(preparada, prepararPeca(peca), limiteNome);
    if (achada) achadas.push({ peca, ...achada });
  }
  return achadas.sort(
    (x, y) => FORCA[y.motivo] - FORCA[x.motivo] || y.semelhanca - x.semelhanca,
  );
}

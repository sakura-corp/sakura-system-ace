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

/** Do mais forte pro mais fraco, pra ordenar o resultado. */
const FORCA: Record<MotivoParecida, number> = { codigo_barras: 3, codigo_interno: 2, nome: 1 };

function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acento
    .toLowerCase()
    .trim();
}

/** Pedaços do nome: letra separada de número, sem pontuação, em ordem alfabética. */
function pedacos(texto: string): string[] {
  return (normalizar(texto).match(/\d+|[a-z]+/g) ?? []).sort();
}

/** Conjunto de números (sequências de dígitos) da descrição + medida, como texto ordenado. */
function numerosDaPeca(p: PecaComparavel): string {
  const todos = `${normalizar(p.descricao)} ${normalizar(p.medida)}`.match(/\d+/g) ?? [];
  // Sem zeros à esquerda: "070" e "70" são o mesmo número.
  const unicos = new Set(todos.map((n) => String(Number(n))));
  return [...unicos].sort().join(",");
}

function bigramas(texto: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (let i = 0; i < texto.length - 1; i++) {
    const par = texto.slice(i, i + 2);
    mapa.set(par, (mapa.get(par) ?? 0) + 1);
  }
  return mapa;
}

/** Coeficiente de Dice de bigramas, de 0 a 1. */
function dice(a: string, b: string): number {
  if (a === b) return a.length > 0 ? 1 : 0;
  const ba = bigramas(a);
  const bb = bigramas(b);
  let comuns = 0;
  for (const [par, qtd] of ba) comuns += Math.min(qtd, bb.get(par) ?? 0);
  const total = Math.max(a.length - 1, 0) + Math.max(b.length - 1, 0);
  return total === 0 ? 0 : (2 * comuns) / total;
}

/** "SEM GTIN" é o que a nota do fornecedor traz quando a peça não tem código
 *  de barras; digitado à mão, não pode virar "o mesmo código" de todas. */
const NAO_E_CODIGO = new Set(["", "sem gtin"]);

function mesmoCodigo(a: string | null, b: string | null): boolean {
  const x = normalizar(a);
  return !NAO_E_CODIGO.has(x) && x === normalizar(b);
}

function semelhancaDoNome(a: PecaComparavel, b: PecaComparavel): number {
  if (numerosDaPeca(a) !== numerosDaPeca(b)) return 0; // a medida manda
  return dice(pedacos(a.descricao).join(" "), pedacos(b.descricao).join(" "));
}

export function acharPecasParecidas<T extends PecaComparavel>(
  nova: PecaComparavel,
  cadastro: T[],
): PecaParecida<T>[] {
  const achadas: PecaParecida<T>[] = [];
  for (const peca of cadastro) {
    if (nova.id !== undefined && peca.id === nova.id) continue;
    if (mesmoCodigo(nova.codigo_barras, peca.codigo_barras)) {
      achadas.push({ peca, motivo: "codigo_barras", semelhanca: 1 });
    } else if (mesmoCodigo(nova.codigo_interno, peca.codigo_interno)) {
      achadas.push({ peca, motivo: "codigo_interno", semelhanca: 1 });
    } else {
      const semelhanca = semelhancaDoNome(nova, peca);
      if (semelhanca >= LIMITE_NOME) achadas.push({ peca, motivo: "nome", semelhanca });
    }
  }
  return achadas.sort(
    (x, y) => FORCA[y.motivo] - FORCA[x.motivo] || y.semelhanca - x.semelhanca,
  );
}

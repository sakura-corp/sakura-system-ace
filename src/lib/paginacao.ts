// O Supabase corta toda resposta em 1.000 linhas (`max_rows`), sem erro nem
// aviso: uma loja grande simplesmente "perde" clientes e ordens da lista. Aqui
// a consulta é refeita por páginas (`.range()`) até uma vir menor que o
// tamanho da página.
export const TAMANHO_DA_PAGINA = 1000;

interface Resposta<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * `consultar(de, ate)` monta a consulta COMPLETA daquela faixa, já com
 * `.range(de, ate)` — ex.: `(de, ate) => supabase.from("x").select("*")
 * .order("nome").order("id").range(de, ate)`.
 *
 * A consulta precisa ter uma ordem TOTAL (o último `.order()` numa coluna
 * única, como `id`): com empate na ordem, uma linha pode cair em duas páginas
 * ou em nenhuma.
 */
export async function buscarTudoEmPaginas<T>(
  consultar: (de: number, ate: number) => PromiseLike<Resposta<T>>,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += TAMANHO_DA_PAGINA) {
    const { data, error } = await consultar(de, de + TAMANHO_DA_PAGINA - 1);
    if (error) throw error;
    const pagina = data ?? [];
    todas.push(...pagina);
    if (pagina.length < TAMANHO_DA_PAGINA) return todas;
  }
}

// Uma consulta por lista de ids (`.in(coluna, ids)`) leva os ids no endereço,
// e endereço grande demais é recusado (#498). 200 ids de 36 letras já dão uns
// 7,9 KB, colado no teto comum de 8 KB; 100 deixa folga pro resto da consulta.
export const IDS_POR_BLOCO = 100;
// Quantos blocos vão ao banco ao mesmo tempo: em fila, uma loja com 10 mil OS
// esperaria 100 idas e voltas; tudo junto, dispararia 100 consultas de uma vez.
export const BLOCOS_AO_MESMO_TEMPO = 6;

/**
 * Busca as linhas de uma lista de ids, quantos forem: os ids vão em blocos de
 * `IDS_POR_BLOCO` (sem repetição), até `BLOCOS_AO_MESMO_TEMPO` por vez, e cada
 * bloco é lido por páginas (`buscarTudoEmPaginas`), porque um bloco também
 * pode passar de 1.000 linhas.
 *
 * `consultar(bloco, de, ate)` monta a consulta COMPLETA daquele bloco e faixa,
 * com `.in(coluna, bloco)`, ordem total (último `.order()` em coluna única) e
 * `.range(de, ate)`. Os blocos não se cruzam, então nenhuma linha vem duas
 * vezes, desde que cada linha case com um id só (o `.in` é numa coluna só).
 *
 * A ordem vale só DENTRO de cada bloco: o resultado é um bloco depois do
 * outro. Quem precisa da lista ordenada no total ordena depois.
 */
export async function buscarPorIdsEmBlocos<T>(
  ids: readonly string[],
  consultar: (bloco: string[], de: number, ate: number) => PromiseLike<Resposta<T>>,
): Promise<T[]> {
  const unicos = [...new Set(ids)];
  const blocos: string[][] = [];
  for (let i = 0; i < unicos.length; i += IDS_POR_BLOCO) {
    blocos.push(unicos.slice(i, i + IDS_POR_BLOCO));
  }
  const todas: T[] = [];
  for (let i = 0; i < blocos.length; i += BLOCOS_AO_MESMO_TEMPO) {
    const leva = blocos.slice(i, i + BLOCOS_AO_MESMO_TEMPO);
    const respostas = await Promise.all(
      leva.map((bloco) => buscarTudoEmPaginas((de, ate) => consultar(bloco, de, ate))),
    );
    for (const linhas of respostas) todas.push(...linhas);
  }
  return todas;
}

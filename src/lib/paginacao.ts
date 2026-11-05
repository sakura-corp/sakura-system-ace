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
// e endereço grande demais é recusado (#498): 200 ids de 36 letras já dão uns
// 8 KB. Por isso a lista vai em blocos.
export const IDS_POR_BLOCO = 200;

/**
 * Busca as linhas de uma lista de ids, quantos forem: os ids vão em blocos de
 * `IDS_POR_BLOCO` (sem repetição) e cada bloco é lido por páginas
 * (`buscarTudoEmPaginas`), porque um bloco também pode passar de 1.000 linhas.
 *
 * `consultar(bloco, de, ate)` monta a consulta COMPLETA daquele bloco e faixa,
 * com `.in(coluna, bloco)`, ordem total (último `.order()` em coluna única) e
 * `.range(de, ate)`. Os blocos não se cruzam, então nenhuma linha vem duas
 * vezes, desde que cada linha case com um id só (o `.in` é numa coluna só).
 */
export async function buscarPorIdsEmBlocos<T>(
  ids: readonly string[],
  consultar: (bloco: string[], de: number, ate: number) => PromiseLike<Resposta<T>>,
): Promise<T[]> {
  const unicos = [...new Set(ids)];
  const todas: T[] = [];
  for (let i = 0; i < unicos.length; i += IDS_POR_BLOCO) {
    const bloco = unicos.slice(i, i + IDS_POR_BLOCO);
    todas.push(...(await buscarTudoEmPaginas((de, ate) => consultar(bloco, de, ate))));
  }
  return todas;
}

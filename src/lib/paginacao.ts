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

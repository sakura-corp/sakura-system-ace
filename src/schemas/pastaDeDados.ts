// A pasta de dados do `npm run dev` (#1157).
//
// O Electron escolhe a pasta de dados pelo nome do app (`"name"` do
// package.json), então o `npm run dev` e o programa instalado no mesmo
// computador caíam na MESMA pasta e dividiam o conexao.json, o canal de
// atualização, a identidade do computador e os logs. Trocar a conexão num
// trocava no outro: em 21/11/2026 o programa instalado passou a abrir no
// banco de teste depois de a conexão do `npm run dev` ser trocada.
//
// Só o `npm run dev` muda de pasta: o programa instalado continua lendo a de
// sempre, e nenhuma loja perde a conexão ao atualizar.

export const SUFIXO_PASTA_DO_DESENVOLVIMENTO = "-dev";

/**
 * A pasta que o `npm run dev` deve usar, ou `null` quando é o programa
 * instalado (que fica na pasta padrão).
 */
export function pastaDeDadosDoDesenvolvimento(pastaPadrao: string, empacotado: boolean): string | null {
  if (empacotado) return null;
  return pastaPadrao.replace(/[\\/]+$/, "") + SUFIXO_PASTA_DO_DESENVOLVIMENTO;
}

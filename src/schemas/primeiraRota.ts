import { GRUPOS_DO_MENU, MODULOS, type ModuloChave } from "@/types/operador";

/**
 * Pra onde vai quem abre o programa (#1016): o Início, se o login tem; senão
 * o primeiro módulo que ele vê no menu (grupo por grupo, na ordem do menu, e
 * dentro do grupo na ordem de `MODULOS`, como o `Sidebar` desenha). Sem
 * nenhum módulo: `null`, e a tela mostra a mensagem pra falar com quem
 * administra a loja.
 *
 * A regra é uma só, aqui, pra nenhum caminho decidir diferente.
 */
export function primeiraRotaPermitida(
  permissoes: readonly ModuloChave[],
  admin: boolean,
): string | null {
  if (admin || permissoes.includes("painel")) return "/";
  for (const grupo of GRUPOS_DO_MENU) {
    const modulo = MODULOS.find(
      (m) => m.grupo === grupo.chave && m.chave !== "painel" && permissoes.includes(m.chave),
    );
    if (modulo) return modulo.rota;
  }
  return null;
}

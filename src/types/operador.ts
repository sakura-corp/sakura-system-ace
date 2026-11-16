/**
 * Os grupos do menu (visual novo, #990; regras, seção 7), na ordem em que
 * aparecem. A ordem é provisória: a Sofia avisou que vai repensar.
 */
export const GRUPOS_DO_MENU = [
  { chave: "atendimento", label: "Atendimento" },
  { chave: "estoque", label: "Estoque" },
  { chave: "financeiro", label: "Financeiro" },
  { chave: "gestao", label: "Gestão" },
] as const;

export type GrupoDoMenu = (typeof GRUPOS_DO_MENU)[number]["chave"];

// `chave` e `rota` NÃO mudam: as permissões guardadas no banco e os atalhos
// dependem delas. `grupo` é só do menu (o ícone de cada um está no Sidebar.tsx: este
// arquivo é lido também por código que não desenha nada, e fica sem React). Dentro de um grupo, o
// menu mostra os itens na ordem desta lista.
export const MODULOS = [
  { chave: "painel", label: "Início", rota: "/", grupo: "atendimento" },
  { chave: "clientes", label: "Clientes", rota: "/clientes", grupo: "atendimento" },
  { chave: "ordens_servico", label: "Ordens de Serviço", rota: "/ordens-servico", grupo: "atendimento" },
  { chave: "estoque", label: "Estoque", rota: "/estoque", grupo: "estoque" },
  { chave: "fornecedores", label: "Fornecedores", rota: "/fornecedores", grupo: "estoque" },
  { chave: "servicos", label: "Serviços", rota: "/servicos", grupo: "estoque" },
  { chave: "caixa", label: "Caixa Diário", rota: "/caixa", grupo: "financeiro" },
  { chave: "contas_pagar", label: "Contas a Pagar", rota: "/contas-pagar", grupo: "financeiro" },
  { chave: "contas_receber", label: "Contas a Receber", rota: "/contas-receber", grupo: "financeiro" },
  { chave: "relatorios", label: "Relações", rota: "/relatorios", grupo: "gestao" },
  { chave: "garantias", label: "Garantias", rota: "/garantias", grupo: "atendimento" },
  { chave: "notas_fiscais", label: "Notas Fiscais", rota: "/notas-fiscais", grupo: "financeiro" },
  { chave: "funcionarios", label: "Funcionários", rota: "/funcionarios", grupo: "gestao" },
] as const satisfies readonly {
  chave: string;
  label: string;
  rota: string;
  grupo: GrupoDoMenu;
}[];

export type ModuloChave = (typeof MODULOS)[number]["chave"];

export interface Operador {
  id: string;
  usuario: string;
  nome: string;
  admin: boolean;
  permissoes: ModuloChave[];
  ativo: boolean;
  deve_trocar_senha: boolean;
  criado_em: string;
}

// `deve_trocar_senha` não é um campo de formulário — nasce `false` (default
// do banco) e só vira `true` via a Edge Function de redefinir senha.
export type NovoOperador = Omit<Operador, "id" | "criado_em" | "deve_trocar_senha">;

export function temPermissao(
  operador: Operador | null,
  modulo: ModuloChave,
): boolean {
  if (!operador) return false;
  if (operador.admin) return true;
  return operador.permissoes.includes(modulo);
}

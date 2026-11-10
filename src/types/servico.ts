export interface Servico {
  id: string;
  codigo_interno: string | null;
  descricao: string;
  preco_padrao: number | null;
  custo: number | null;
  categoria_id: string | null;
  ativo: boolean;
  /**
   * De quanto em quanto tempo o serviço volta (lembrete de retorno, FN-06,
   * #381): em dias, em km rodados, ou os dois (vale o que vencer primeiro).
   * `null` nos dois = o serviço não gera retorno.
   */
  intervalo_dias: number | null;
  intervalo_km: number | null;
  criado_em: string;
}

// Os intervalos são opcionais no tipo de gravação pra quem grava serviço por
// outro caminho (sem o formulário) não precisar conhecê-los nem apagá-los. O
// formulário de Serviço manda os dois SEMPRE: num banco que ainda não recebeu
// a migration 0083, salvar serviço falha com o aviso de banco desatualizado.
// Por isso a 0083 sobe ANTES da versão do programa (regra de sempre).
export type NovoServico = Omit<Servico, "id" | "criado_em" | "intervalo_dias" | "intervalo_km"> &
  Partial<Pick<Servico, "intervalo_dias" | "intervalo_km">>;

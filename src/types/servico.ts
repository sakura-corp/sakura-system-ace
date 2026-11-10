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

// Os intervalos são opcionais na gravação: o formulário que ainda não tem os
// campos não manda a coluna, e assim nem apaga o que já estava lá nem quebra
// num banco que ainda não recebeu a migration 0084.
export type NovoServico = Omit<Servico, "id" | "criado_em" | "intervalo_dias" | "intervalo_km"> &
  Partial<Pick<Servico, "intervalo_dias" | "intervalo_km">>;

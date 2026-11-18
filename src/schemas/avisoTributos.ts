import { competenciaDoMes, mesPorExtenso } from "@/schemas/aliquotaCompetencia";
import type { ConfiguracaoFiscalLoja } from "@/types/configuracao";

// Lembrete mensal dos tributos aproximados na nota (Lei 12.741/2012, #1040):
// a alíquota efetiva do Simples muda todo mês e quem passa é a contabilidade.
// Mesmo jeito do lembrete da alíquota do ISS (`aliquotaCompetencia.ts`), mas
// aqui é só aviso: a nota continua saindo com o último número salvo.

export interface AvisoTributos {
  /** Se o aviso deve aparecer agora. */
  precisa: boolean;
  /** A competência do mês corrente ("YYYY-MM-01"), pra gravar ao confirmar. */
  competencia: string;
  /** O mês por extenso ("novembro"). */
  mes: string;
}

export function avisoTributosDoMes(
  configuracao: ConfiguracaoFiscalLoja | null,
  hoje: Date = new Date(),
): AvisoTributos {
  const competencia = competenciaDoMes(hoje);
  const confirmada = configuracao?.competencia_tributos_confirmada ?? null;
  const daLoja =
    configuracao?.regime_tributario === "simples_nacional" &&
    Boolean(configuracao?.focus_nfe_configurado);

  return {
    // Por mês ("YYYY-MM"), não por data exata, como o aviso do ISS.
    precisa: daLoja && (confirmada?.slice(0, 7) !== competencia.slice(0, 7) || semAliquotaDeTributos(configuracao)),
    competencia,
    mes: mesPorExtenso(competencia),
  };
}

/** Nenhuma alíquota configurada: a nota está saindo sem a linha dos tributos. */
export function semAliquotaDeTributos(configuracao: ConfiguracaoFiscalLoja | null): boolean {
  return (
    configuracao?.percentual_tributos_simples == null &&
    configuracao?.percentual_tributos_pecas == null
  );
}

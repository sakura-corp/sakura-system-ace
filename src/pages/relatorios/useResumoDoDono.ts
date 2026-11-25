import { useAuth } from "@/contexts/AuthContext";
import { buscarCustoDasOrdens, listarMovimentosCaixa } from "@/lib/caixa";
import { chaveData } from "@/lib/calendario";
import { listarContasPagar } from "@/lib/contasPagar";
import { listarOrdens } from "@/lib/ordensServico";
import type { EscolhaResumoDono } from "@/components/BotaoResumoDono";
import { custoDaOrdemPeloBanco } from "@/schemas/metricasCaixa";
import { mostraBlocosDeOS } from "@/schemas/painelInicio";
import { numerosDoResumoDono, periodoDoResumo, textoResumoDono, type PeriodoResumoDono } from "@/schemas/whatsapp";

/** Reconstrói a data a partir de "AAAA-MM-DD", sem fuso no meio do caminho. */
function dataDaChave(chave: string): Date {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

/**
 * As duas escolhas do "Resumo pro dono" (Hoje e Este mês), com a mesma
 * montagem do Início (#1086: o botão passa a morar em Relações; no Início ele
 * sai na #1101). Os dados são buscados de novo **no clique**, e o "hoje"
 * também é o do clique: uma tela parada desde cedo não manda ao dono os
 * números de horas atrás. As contas são as de `numerosDoResumoDono`.
 */
export function useResumoDoDono(): EscolhaResumoDono[] {
  const { lojaAtual } = useAuth();

  const escolhaDoResumo = (periodo: PeriodoResumoDono, rotulo: string): EscolhaResumoDono => ({
    rotulo,
    montarTexto: async ({ modelo, loja, podeVer }) => {
      if (!lojaAtual) throw new Error("Nenhuma loja selecionada.");
      const referencia = dataDaChave(chaveData(new Date()));
      const [modeloDaLoja, movimentosAgora, ordensAgora, contasAgora] = await Promise.all([
        modelo,
        listarMovimentosCaixa(lojaAtual.id),
        mostraBlocosDeOS(podeVer) ? listarOrdens(lojaAtual.id) : Promise.resolve([]),
        podeVer("contas_pagar") ? listarContasPagar(lojaAtual.id) : Promise.resolve([]),
      ]);
      // Sem o custo o lucro sairia inflado: se falhar, o botão mostra o erro.
      const custos = await buscarCustoDasOrdens(
        movimentosAgora.flatMap((m) => (m.ordem_servico_id ? [m.ordem_servico_id] : [])),
      );
      return textoResumoDono({
        loja,
        periodo: periodoDoResumo(periodo, referencia, referencia),
        modelo: modeloDaLoja,
        numeros: numerosDoResumoDono({
          periodo,
          referencia,
          hoje: referencia,
          movimentos: movimentosAgora,
          custoDaOrdem: custoDaOrdemPeloBanco(custos),
          ordens: ordensAgora,
          contas: contasAgora,
          podeVer,
        }),
      });
    },
  });

  return [escolhaDoResumo("dia", "Hoje"), escolhaDoResumo("mes", "Este mês")];
}

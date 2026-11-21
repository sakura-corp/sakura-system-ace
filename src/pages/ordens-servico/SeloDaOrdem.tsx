import { CircleX, Clock, Receipt } from "lucide-react";
import { Selo } from "@/components/Selo";
import { orcamentoVencido } from "@/schemas/orcamento";
import { ordemEstaFinalizada, situacaoFiscalOrdem } from "@/schemas/situacaoFiscal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import { STATUS_LABEL } from "@/types/os";

/**
 * O status da OS no visual novo (tarefa 7, #990): o `Selo`, com cor, ícone e
 * palavra (regras, seções 2 e 3). Mesma regra do `StatusOrdem` de antes, que
 * continua existindo (o PR #1038 da equipe mexe nele; este arquivo não briga
 * com aquele):
 *
 * | situação                          | selo                          |
 * |-----------------------------------|-------------------------------|
 * | em andamento                      | azul, "Em andamento"          |
 * | concluída (falta faturar)         | amarelo, "Concluída"          |
 * | faturada, mas falta nota          | amarelo, "Faturada", e embaixo "falta NFS-e" |
 * | faturada com todas as notas       | verde, "Finalizada"           |
 * | orçamento                         | cinza, "Orçamento" (e amarelo "Vencido" se passou da validade) |
 * | recusado                          | vermelho, "Recusado"          |
 *
 * "Faturada" que ainda falta nota fica amarela, como a concluída: as duas
 * pedem uma ação. O verde é só pra quando não há mais nada a fazer.
 *
 * #1091: o "Vencido" passou de cinza pra amarelo (atenção: o preço pode ter
 * mudado) e o "Recusado" de cinza pra vermelho, como pede a folha da tela.
 */
export function SeloDaOrdem({
  ordem,
  notas,
}: {
  ordem: OrdemServico;
  notas: NotaFiscalArquivo[];
}) {
  const situacao = situacaoFiscalOrdem(ordem.itens ?? [], notas);
  const finalizada = ordemEstaFinalizada(ordem, situacao);

  // As palavras vêm de `STATUS_LABEL` (a mesma fonte do resto do programa);
  // só "Finalizada" é desta tela, porque é deduzida das notas.
  const palavra = STATUS_LABEL[ordem.status];
  let selo;
  if (finalizada) selo = <Selo tipo="ok" palavra="Finalizada" />;
  else if (ordem.status === "faturada") selo = <Selo tipo="atencao" palavra={palavra} icone={Receipt} />;
  else if (ordem.status === "concluida") selo = <Selo tipo="atencao" palavra={palavra} />;
  else if (ordem.status === "em_andamento") selo = <Selo tipo="info" palavra={palavra} />;
  else if (ordem.status === "recusado") selo = <Selo tipo="perigo" palavra={palavra} icone={CircleX} />;
  else selo = <Selo tipo="neutro" palavra={palavra} />;

  return (
    <div className="flex flex-col items-start gap-1">
      {selo}
      {/* Orçamento passado da validade (#379): atenção, não alarme. Ainda dá
          pra aprovar; só avisa que o preço pode ter mudado. */}
      {ordem.status === "orcamento" && orcamentoVencido(ordem.validade) && (
        <Selo tipo="atencao" palavra="Vencido" icone={Clock} />
      )}
      {ordem.status === "faturada" && situacao.pendentes.length > 0 && (
        <span className="whitespace-nowrap text-meta font-medium text-texto-2">
          falta {situacao.pendentes.join(" e ")}
        </span>
      )}
    </div>
  );
}

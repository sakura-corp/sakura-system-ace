import {
  ordemEstaFinalizada,
  situacaoFiscalOrdem,
} from "@/schemas/situacaoFiscal";
import { orcamentoVencido } from "@/schemas/orcamento";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import type { OrdemServico } from "@/types/os";
import { STATUS_COR, STATUS_LABEL } from "@/types/os";

// A OS mostra "Finalizada" quando já foi faturada E todas as notas que ela
// precisava saíram — enquanto faltar alguma, continua "Faturada" com o aviso
// do que falta ao lado, pra não passar despercebido na lista.
export function StatusOrdem({
  ordem,
  notas,
}: {
  ordem: OrdemServico;
  notas: NotaFiscalArquivo[];
}) {
  const situacao = situacaoFiscalOrdem(ordem.itens ?? [], notas);
  const finalizada = ordemEstaFinalizada(ordem, situacao);

  // Cores separadas de propósito: "Faturada" agora só sobra quando ainda
  // falta nota, ou seja, ainda pede uma ação — então ganha um tom próprio
  // (azul), diferente do verde de "Finalizada", que é o estado em que não
  // há mais nada a fazer. Com os dois em verde, a lista ficava sem
  // distinção nenhuma de relance.
  const classe = finalizada
    ? "bg-emerald-100 text-emerald-900"
    : ordem.status === "faturada"
      ? "bg-sky-100 text-sky-900"
      : STATUS_COR[ordem.status];

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-rotulo font-medium ${classe}`}
      >
        {finalizada ? "Finalizada" : STATUS_LABEL[ordem.status]}
      </span>
      {/* Orçamento passado da validade (#379): etiqueta cinza, sem alarme —
          ainda dá pra aprovar, só avisa que o preço pode ter mudado. */}
      {ordem.status === "orcamento" && orcamentoVencido(ordem.validade) && (
        <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-rotulo font-medium text-slate-700">
          vencido
        </span>
      )}
      {ordem.status === "faturada" && situacao.pendentes.length > 0 && (
        <span className="whitespace-nowrap text-meta font-medium text-amber-400">
          falta {situacao.pendentes.join(" e ")}
        </span>
      )}
    </div>
  );
}

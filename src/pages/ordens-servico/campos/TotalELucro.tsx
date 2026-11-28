import { Valor } from "@/components/Valor";
import { formatarMoeda } from "@/schemas/dinheiro";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import { TEXTO_LUCRO_APARECE_AO_SALVAR, type LucroPrevisto } from "@/schemas/ordemServico";

/**
 * O que a barra do rodapé da OS, do orçamento e da venda de balcão mostra
 * (#1087). O número que decide é o TOTAL, o maior da barra; o "lucro previsto"
 * vem de apoio, ao lado, com a palavra sempre (a cor nunca avisa sozinha):
 * verde com ▲ se ganha, vermelho com "−" e ▼ se dá prejuízo, ou o motivo de
 * não haver número. Peças e serviços ficam pequenos, no máximo 3 de apoio.
 */

export function ApoioDoTotal({
  pecas,
  servicos,
  lucro,
  calculando = false,
}: {
  /**
   * Peças e serviços, separados. A venda de balcão (que só vende peça) não
   * passa nenhum dos dois: "Peças" ali seria o próprio total repetido.
   */
  pecas?: number;
  servicos?: number;
  lucro: LucroPrevisto;
  /** O custo ainda não chegou: "calculando…", nunca um número com custo velho. */
  calculando?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-rotulo text-texto-2">
      {pecas !== undefined && <span className="tabular-nums">{`Peças ${formatarMoeda(pecas)}`}</span>}
      {servicos !== undefined && (
        <span className="tabular-nums">{`Serviços ${formatarMoeda(servicos)}`}</span>
      )}
      <LucroPrevistoNaTela lucro={lucro} calculando={calculando} />
    </div>
  );
}

function LucroPrevistoNaTela({ lucro, calculando }: { lucro: LucroPrevisto; calculando: boolean }) {
  if (calculando) return <span>lucro previsto: calculando…</span>;
  if (lucro.lucro === null) {
    return (
      <span>
        lucro previsto:{" "}
        {lucro.falta === "custo-nao-informado" ? TEXTO_CUSTO_NAO_INFORMADO : TEXTO_LUCRO_APARECE_AO_SALVAR}
      </span>
    );
  }
  return (
    <span>
      lucro previsto{" "}
      <span className="font-semibold">
        {lucro.lucro >= 0 && (
          <span aria-hidden="true" className="mr-1 text-ok">
            ▲
          </span>
        )}
        <Valor valor={lucro.lucro} classeDeCor="text-ok" className="tabular-nums" />
      </span>
    </span>
  );
}

export function TotalGrande({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="text-right">
      <p className="text-meta font-semibold text-texto-2">{rotulo}</p>
      <p className="text-metrica font-semibold tabular-nums text-texto">{formatarMoeda(valor)}</p>
    </div>
  );
}

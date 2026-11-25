import { TriangleAlert } from "lucide-react";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Explicacao } from "@/components/Explicacao";
import { Valor, Variacao } from "@/components/Valor";
import { formatarMoeda } from "@/schemas/dinheiro";
import { deCadaCem } from "@/schemas/lucratividade";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import { variacaoPercentual } from "@/schemas/painelInicio";
import type { ResumoDoPeriodo } from "@/schemas/relacoes";

/** A comparação com o mês anterior, embaixo do número. Some quando não há com o que comparar. */
function Comparacao({
  atual,
  anterior,
  subirEBom = true,
  contra,
}: {
  atual: number;
  anterior: number | undefined;
  subirEBom?: boolean;
  contra: string | null;
}) {
  if (anterior === undefined || !contra) return null;
  return (
    <Variacao
      percentual={variacaoPercentual(atual, anterior)}
      subirEBom={subirEBom}
      comparadoCom={`o mesmo período de ${contra}`}
      contra={contra}
    />
  );
}

/**
 * O resumo do período (#1086): a Sobra das OS no cartão de destaque, com as
 * 100 bolinhas, e Vendido, Recebido e Falta receber de apoio, ao lado dele
 * (embaixo, em 3 colunas, nas telas mais estreitas). Cada um traz a comparação
 * com o mês anterior, só quando o período é um mês (`anterior` vem `null`
 * quando não é).
 */
export function BlocoResumo({
  resumo,
  anterior,
  contra,
}: {
  resumo: ResumoDoPeriodo;
  anterior: ResumoDoPeriodo | null;
  /** O nome do mês anterior ("outubro"), pra escrever "contra outubro". */
  contra: string | null;
}) {
  // "De cada R$ 100 vendidos, R$ 42 ficam com a loja": só faz sentido com
  // venda e sobra entre 0 e 100%; fora disso o número grande (vermelho, se for
  // prejuízo) já diz tudo.
  const cem = deCadaCem(resumo.vendido, resumo.sobraDasOS);
  const bolinhasDaLoja = cem ? Math.round(cem.margem) : 0;

  return (
    <section
      id="resumo"
      aria-label="Resumo do período"
      className="grid min-w-0 scroll-mt-6 grid-cols-12 gap-6"
    >
      {/* O cartão de destaque (o da Central do dia). */}
      <div
        className="sakura-capa-central sakura-grao col-span-12 min-w-0 overflow-hidden rounded-[1.125rem] border border-linha p-8 xl:col-span-8"
        data-cartao-de-destaque
      >
        {/* A partir de 1280 as bolinhas ficam ao lado do texto, sem descer
            (12 px, e 14 px a partir de 1536); abaixo disso o cartão vira
            coluna, com as bolinhas de 10 px embaixo. */}
        <div className="relative z-[2] flex flex-col items-start gap-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
          <div className="min-w-0 xl:flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-rotulo font-medium text-texto-2">Sobra das OS</h2>
              <Explicacao
                titulo="Sobra das OS"
                texto="O que sobrou das ordens de serviço abertas no período: o vendido menos o custo das peças e dos serviços. Ainda não desconta as despesas do caixa: elas entram no Sobrou, no gráfico Do vendido ao que sobrou."
              />
            </div>
            <p className="mt-1 whitespace-nowrap font-titulo text-capa font-extrabold tracking-[-0.02em] tabular-nums">
              <Valor valor={resumo.sobraDasOS} />
            </p>
            <div className="mt-2 flex min-h-5 items-center">
              <Comparacao atual={resumo.sobraDasOS} anterior={anterior?.sobraDasOS} contra={contra} />
            </div>
            {cem && (
              <p className="mt-3 text-subtitulo text-texto">
                De cada <strong>R$ 100</strong> vendidos, <strong>{formatarMoeda(cem.margem)}</strong> ficam
                com a loja.
              </p>
            )}
            {!cem && resumo.vendido === 0 && (
              <p className="mt-3 text-subtitulo text-texto">Nenhuma OS aberta neste período.</p>
            )}
            {resumo.algumCustoNaoInformado && (
              <div className="mt-3 space-y-1">
                <span className="inline-flex items-center gap-1 text-rotulo font-medium text-atencao">
                  <TriangleAlert aria-hidden="true" className="size-[13px] shrink-0" strokeWidth={2.25} />
                  Inclui item com {TEXTO_CUSTO_NAO_INFORMADO}
                </span>
                <p className="text-rotulo text-texto-2">
                  Item com {TEXTO_CUSTO_NAO_INFORMADO} conta como custo zero: a sobra pode estar maior que a
                  real.
                </p>
              </div>
            )}
          </div>
          {cem && (
            <div aria-hidden="true" className="shrink-0">
              {/* 100 bolinhas = R$ 100 vendidos: as apagadas são o custo, as cheias o que fica. */}
              <div className="grid grid-cols-[repeat(10,10px)] gap-1 xl:grid-cols-[repeat(10,12px)] 2xl:grid-cols-[repeat(10,14px)] 2xl:gap-1.5">
                {Array.from({ length: 100 }, (_, i) => (
                  <span
                    key={i}
                    className={`size-2.5 rounded-full xl:size-3 2xl:size-3.5 ${i < 100 - bolinhasDaLoja ? "bg-texto/30" : "bg-texto"}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex gap-5 text-rotulo text-texto-2 xl:flex-col xl:gap-1">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-texto/30" />
                  Custo {formatarMoeda(cem.custo)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-texto" />
                  Sobra {formatarMoeda(cem.margem)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-12 grid min-w-0 grid-cols-3 content-start gap-6 xl:col-span-4 xl:grid-cols-1">
        <CartaoNumero
          titulo="Vendido"
          explicacao="O que as ordens de serviço abertas neste período somam, já recebidas ou não. Orçamento fica de fora. Vendido não é o mesmo que Recebido: a diferença são as OS ainda não recebidas (Falta receber)."
          variacao={<Comparacao atual={resumo.vendido} anterior={anterior?.vendido} contra={contra} />}
        >
          <Valor valor={resumo.vendido} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Recebido"
          explicacao="O que entrou no Caixa neste período, das OS e dos lançamentos manuais. É só o que já entrou: o vendido e ainda não recebido está em Falta receber."
          variacao={<Comparacao atual={resumo.recebido} anterior={anterior?.recebido} contra={contra} />}
        >
          <Valor valor={resumo.recebido} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Falta receber"
          explicacao="Das OS abertas neste período, o que ainda não entrou no Caixa: Vendido menos o que já foi recebido delas. Não tem comparação com o mês anterior: o que falta dele hoje já foi quase todo recebido, e a seta não diria nada."
        >
          <Valor valor={resumo.faltaReceber} />
        </CartaoNumero>
      </div>
    </section>
  );
}

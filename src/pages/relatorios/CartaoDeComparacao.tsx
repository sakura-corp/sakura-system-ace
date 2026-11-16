import { Explicacao } from "@/components/Explicacao";
import { ContarAoAparecer } from "@/components/contagem";
import { Valor, Variacao } from "@/components/Valor";
import { variacaoPercentual } from "@/schemas/painelInicio";

/**
 * Um cartão do "Comparativo do período" (#990, tarefa 13; pedido da Sofia em
 * 16/11, no lugar do gráfico em triângulo): o valor de agora grande, o anterior
 * menor embaixo, a diferença em % com seta e cor, e duas barrinhas pra
 * comparar o tamanho (agora em laranja, anterior em cinza).
 *
 * **Nenhuma conta de dinheiro é feita aqui.** Os dois valores chegam prontos;
 * o % é o `variacaoPercentual` de `schemas/painelInicio.ts` (o mesmo do
 * Início); e o comprimento da barra é só o desenho: o valor dividido pelo
 * maior dos dois.
 *
 * Mesmo jeito do `CartaoNumero` (rótulo com o "?", número em 30 px que conta
 * de zero), mas com o espaço de baixo que as barras pedem.
 */
export function CartaoDeComparacao({
  titulo,
  explicacao,
  atual,
  anterior,
  subirEBom,
  contra,
}: {
  titulo: string;
  explicacao: string;
  atual: number;
  anterior: number;
  /** Vender e lucrar mais é bom; gastar mais não. */
  subirEBom: boolean;
  /** O nome do outro lado: "dia anterior", "mês anterior". */
  contra: string;
}) {
  // Valor negativo não tem barra: o número (vermelho, com seta) é quem avisa.
  const maior = Math.max(atual, anterior, 0);
  const larguraDa = (valor: number) => (maior > 0 && valor > 0 ? (valor / maior) * 100 : 0);

  return (
    <div data-cartao-comparacao className="sakura-card @container px-[18px] pb-4 pt-4">
      <div className="flex items-center gap-1.5">
        <p className="text-rotulo font-medium text-texto-2">{titulo}</p>
        <Explicacao titulo={titulo} texto={explicacao} />
      </div>

      <p className="mt-1.5 whitespace-nowrap font-titulo text-metrica font-bold tracking-[-0.02em] tabular-nums">
        <ContarAoAparecer.Provider value>
          <Valor valor={atual} />
        </ContarAoAparecer.Provider>
      </p>
      <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-3">
        <Variacao
          percentual={variacaoPercentual(atual, anterior)}
          subirEBom={subirEBom}
          comparadoCom={contra}
          contra={contra}
        />
      </div>
      <p className="mt-1 text-rotulo text-texto-2">
        Anterior: <Valor valor={anterior} classeDeCor="text-texto-2" className="font-medium" />
      </p>

      <div aria-hidden="true" className="mt-4 space-y-2">
        <Barra rotulo="Agora" largura={larguraDa(atual)} classeDaBarra="bg-acao" />
        <Barra rotulo="Anterior" largura={larguraDa(anterior)} classeDaBarra="bg-texto-3" />
      </div>
    </div>
  );
}

function Barra({
  rotulo,
  largura,
  classeDaBarra,
}: {
  rotulo: string;
  /** De 0 a 100. */
  largura: number;
  classeDaBarra: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[4.25rem] shrink-0 text-meta text-texto-2">{rotulo}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-texto/[0.08]">
        <div
          className={`h-full rounded-full ${classeDaBarra}`}
          style={{ width: `${largura}%` }}
        />
      </div>
    </div>
  );
}

import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Explicacao } from "./Explicacao";
import { FioDeGrafico } from "./FioDeGrafico";
import { ContarAoAparecer } from "./contagem";

/**
 * O cartão de número do visual novo (#990, seção 6 das regras): o rótulo
 * pequeno com o "?", o número em 30 px na letra dos títulos, e a variação
 * embaixo. É o cartão do Início ("Recebido no mês", "Lucro do mês"), e serve
 * pra qualquer tela que mostre um número de bater o olho.
 *
 *     <CartaoNumero
 *       titulo="Recebido no mês"
 *       explicacao="O que entrou no caixa neste mês…"
 *       variacao={<Variacao percentual={16} subirEBom comparadoCom="…" contra="outubro" />}
 *     >
 *       <Valor valor={24815} />
 *     </CartaoNumero>
 *
 * O número vem pronto de quem chama (o `Valor`, que já sabe mostrar
 * prejuízo): **conta de dinheiro nunca é feita aqui**.
 *
 * O fio de gráfico (`fio`) é opcional e fica à direita do número: os valores
 * (um por dia) vêm prontos de `schemas/serieDoMes.ts`. Sem `fio`, ou com
 * menos de 2 pontos, o cartão fica sem ele. Quando o cartão está estreito
 * (menos de 16 rem), o fio some pra não apertar o número.
 */
export function CartaoNumero({
  titulo,
  explicacao,
  variacao,
  semAcesso,
  para,
  fio,
  children,
}: {
  titulo: string;
  /** A frase do "?": o que este número quer dizer. Sem ela, o "?" não aparece. */
  explicacao?: string;
  /** A `Variacao` contra o período anterior. */
  variacao?: ReactNode;
  /**
   * O operador não tem o módulo de onde o número sai: o cartão mostra "—" e
   * este texto ("Sem acesso a Contas a Pagar"), **nunca um R$ 0,00**, que
   * pareceria um número de verdade.
   */
  semAcesso?: string;
  /** A rota que o cartão abre. Com ela, o cartão inteiro é clicável. */
  para?: string;
  /** Os valores do fio de gráfico, um por dia. Sem eles, o cartão não tem fio. */
  fio?: readonly number[] | null;
  /** O número: um `<Valor />`, ou um texto curto. */
  children: ReactNode;
}) {
  return (
    <div
      data-cartao-numero
      className={`sakura-card @container relative px-[18px] pb-3.5 pt-4 ${
        para
          ? "transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-linha-forte hover:bg-passar/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        {para ? (
          // O link se estica por cima do cartão inteiro (o `after`): clicar em
          // qualquer ponto abre a tela, e o leitor de tela ouve só o título,
          // não o cartão todo lido como um link só.
          <Link
            to={para}
            className="text-rotulo font-medium text-texto-2 after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
          >
            {titulo}
          </Link>
        ) : (
          <p className="text-rotulo font-medium text-texto-2">{titulo}</p>
        )}
        {explicacao && (
          // Por cima do link esticado, e IRMÃO dele: botão dentro de link é
          // HTML inválido, e o clique no "?" abriria a tela em vez de explicar.
          <span data-acima-do-link className="relative z-[1] inline-flex">
            <Explicacao titulo={titulo} texto={explicacao} />
          </span>
        )}
        {para && <ArrowUpRight aria-hidden="true" className="ml-auto size-4 shrink-0 text-texto-3" />}
      </div>

      {semAcesso ? (
        <>
          <p className="mt-1.5 font-titulo text-metrica font-bold text-texto-2">—</p>
          <p className="mt-1 text-rotulo text-texto-2">{semAcesso}</p>
        </>
      ) : (
        <div className="mt-1.5 flex items-end justify-between gap-3">
          {/* O bloco pode encolher (até a largura do número, que não quebra), e
              o texto de baixo quebra a linha sozinho: com ele fixo, uma frase
              comprida (a do KM, na ficha do veículo) saía do cartão. */}
          <div>
            <p className="whitespace-nowrap font-titulo text-metrica font-bold tracking-[-0.02em] tabular-nums">
              {/* O número conta de zero até o valor (tarefa 5): só aparência. */}
              <ContarAoAparecer.Provider value>{children}</ContarAoAparecer.Provider>
            </p>
            {variacao && <div className="mt-1 flex min-h-5 items-center">{variacao}</div>}
          </div>
          {fio && fio.length >= 2 && (
            <FioDeGrafico valores={fio} className="hidden h-11 min-w-14 max-w-[120px] flex-1 @[16rem]:block" />
          )}
        </div>
      )}
    </div>
  );
}

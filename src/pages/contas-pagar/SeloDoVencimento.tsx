import type { ReactNode } from "react";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/Botao";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { dataCurta, diaBrasileiro } from "@/lib/datas";
import { nomeDoMes, TODOS_OS_MESES, type MesDoFiltro } from "@/schemas/contas";
import { formatarMoeda } from "@/schemas/dinheiro";
import { diasParaVencer, situacaoDoVencimento } from "./vencimento";

/*
 * As peças das DUAS listas de contas (a Pagar e a Receber), num lugar só, pra
 * as duas telas ficarem iguais (#1094): o selo, o lado direito da linha, os
 * cartões de cima e o filtro de mês. As contas de dinheiro vêm prontas de
 * `src/schemas/contas.ts`; aqui só se desenha.
 */

/**
 * O selo da situação de uma conta pendente (visual novo, #990, regra 4: ícone
 * e palavra junto da cor). Atrasada é vermelho com o triângulo; vence hoje ou
 * nos próximos dias é amarelo com o relógio; a vencer é neutro, pra o amarelo
 * e o vermelho saltarem. Vale pra Contas a Pagar e a Receber.
 */
export function SeloDoVencimento({ vencimento, hoje }: { vencimento: string; hoje: string }) {
  switch (situacaoDoVencimento(vencimento, hoje)) {
    case "atrasada":
      return <Selo tipo="perigo" palavra="Atrasada" />;
    case "vence_hoje":
      return <Selo tipo="atencao" palavra="Vence hoje" />;
    case "vence_logo": {
      const dias = diasParaVencer(vencimento, hoje);
      return <Selo tipo="atencao" palavra={dias === 1 ? "Vence amanhã" : `Vence em ${dias} dias`} />;
    }
    default:
      return <Selo tipo="neutro" palavra="A vencer" icone={CalendarClock} />;
  }
}

/**
 * O selo verde da conta já quitada: só a palavra ("Paga", "Recebida"), pra
 * caber na coluna fixa (com o dia dentro, "Recebida em 15/12/2025" passava da
 * coluna e empurrava o valor daquela linha; achado da revisão). O dia vai na
 * linha de baixo, pelo `DiaDaQuitacao`.
 */
export function SeloDeQuitada({ palavra }: { palavra: string }) {
  return <Selo tipo="ok" palavra={palavra} />;
}

/**
 * "paga em 06/10 · ", na linha de baixo da conta quitada. `quando` é data COM
 * hora (`data_pagamento`/`data_recebimento`, timestamptz): o `dataCurta` lê o
 * dia local daquele instante (#1005).
 */
export function DiaDaQuitacao({ rotulo, quando, hoje }: { rotulo: string; quando: string | null; hoje: string }) {
  if (!quando) return null;
  return (
    <>
      {rotulo} em {dataCurta(quando, hoje)} ·{" "}
    </>
  );
}

/**
 * O dia do vencimento na linha de baixo, só quando a lista é estreita demais
 * pra coluna dele (o `LadoDaConta` esconde a coluna na mesma largura).
 */
export function DiaNaLinhaDeBaixo({ vencimento, rotulo }: { vencimento: string; rotulo: string }) {
  return (
    <span className="@3xl:hidden">
      {rotulo} {diaBrasileiro(vencimento)} ·{" "}
    </span>
  );
}

/**
 * O lado direito de uma linha de conta, IGUAL em Contas a Pagar e a Receber
 * (#1094: "as colunas de vencimento e valor batem igual nas duas"):
 *
 *     13/11/2026     R$ 1.340,00    [Atrasada]      [Pagar]   [⋯]
 *
 * Cada pedaço tem largura fixa, e o lugar da ação e do "⋯" fica reservado
 * mesmo na linha que não tem (a conta paga não tem "Pagar"): assim as colunas
 * batem de uma linha pra outra, como no Estoque (#1093). A ação mora aqui, e
 * não no `acao` da `LinhaDeLista`, justamente por isso.
 */
export function LadoDaConta({
  vencimento,
  valor,
  selo,
  acao,
  semMais,
}: {
  vencimento: string;
  valor: number;
  selo: ReactNode;
  /** O botão da UMA ação da linha ("Pagar", "Receber"), ou nada. */
  acao?: ReactNode;
  /** A linha não tem "⋯": guarda o lugar dele, pra coluna não andar. */
  semMais?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      {/* Some na lista estreita: aí o dia vai pra linha de baixo (`DiaNaLinhaDeBaixo`). */}
      <span className="hidden w-24 text-right text-corpo text-texto-2 tabular-nums @3xl:block">
        {diaBrasileiro(vencimento)}
      </span>
      {/* 128 px: cabe "R$ 123.456,78" sem a coluna andar. */}
      <span className="w-32 text-right text-corpo font-semibold text-texto tabular-nums">
        {formatarMoeda(valor)}
      </span>
      <span className="flex w-36 justify-start">{selo}</span>
      <span className="flex w-24 justify-end">{acao}</span>
      {/* O lugar do "⋯" (40 px; a distância de 16 px até ele é o próprio `gap`). */}
      {semMais && <span aria-hidden="true" className="w-10 shrink-0" />}
    </div>
  );
}

/**
 * Os cartões de cima das duas telas de contas (#1094): 1 número grande (a
 * soma das atrasadas, de qualquer mês, em vermelho quando tem) e 2 de apoio,
 * que são o "contra o quê?": o total do mês filtrado e o que falta pagar (ou
 * receber) nele. Enquanto carrega, "—" no lugar do número: nunca um R$ 0,00
 * que pareça de verdade, e a tela não pula quando os números chegam.
 */
export function CartoesDasContas({
  carregando,
  atrasadas,
  mes,
  doMes,
  rotuloDoQueFalta,
  explicacaoDasAtrasadas,
  aoVerAtrasadas,
}: {
  carregando: boolean;
  atrasadas: { quantas: number; total: number };
  mes: MesDoFiltro;
  doMes: { quantas: number; total: number; falta: number };
  /** "Falta pagar" ou "Falta receber". */
  rotuloDoQueFalta: string;
  explicacaoDasAtrasadas: string;
  /** Mostra só as atrasadas na lista. */
  aoVerAtrasadas: () => void;
}) {
  const sufixo = mes === TODOS_OS_MESES ? "em todos os meses" : `em ${nomeDoMes(mes)}`;
  const traco = <span className="text-texto-2">—</span>;
  return (
    <div className="flex flex-wrap items-stretch gap-4">
      <div className="min-w-0 flex-[1.6] basis-64">
        <CartaoNumero
          titulo="Atrasadas"
          explicacao={explicacaoDasAtrasadas}
          variacao={
            !carregando && (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-rotulo text-texto-2">
                {atrasadas.quantas === 0 ? (
                  "Nenhuma conta atrasada"
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 font-medium text-perigo">
                      <TriangleAlert aria-hidden="true" className="size-4" />
                      {atrasadas.quantas === 1 ? "1 conta" : `${atrasadas.quantas} contas`}
                    </span>
                    <Botao variante="fantasma" tamanho="pequeno" onClick={aoVerAtrasadas} className="relative z-[1]">
                      Ver as atrasadas
                    </Botao>
                  </>
                )}
              </span>
            )
          }
        >
          {carregando ? (
            traco
          ) : (
            <span className={atrasadas.total > 0 ? "text-perigo" : "text-texto"}>
              <Valor valor={atrasadas.total} />
            </span>
          )}
        </CartaoNumero>
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <CartaoNumero
          titulo={`Total ${sufixo}`}
          explicacao="A soma de todas as contas que vencem no mês escolhido, pagas ou não."
          variacao={
            !carregando && (
              <span className="text-rotulo text-texto-2">
                {doMes.quantas === 1 ? "1 conta" : `${doMes.quantas} contas`}
              </span>
            )
          }
        >
          {carregando ? traco : <Valor valor={doMes.total} />}
        </CartaoNumero>
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <CartaoNumero
          titulo={`${rotuloDoQueFalta} ${sufixo}`}
          explicacao="Das contas que vencem no mês escolhido, as que ainda estão pendentes (atrasadas ou não)."
        >
          {carregando ? traco : <Valor valor={doMes.falta} />}
        </CartaoNumero>
      </div>
    </div>
  );
}

/**
 * O filtro de mês da lista (#1079, item 16): pelo mês do vencimento. A lista
 * abre no mês de hoje; "Todos os meses" tira o filtro.
 */
export function FiltroDoMes({
  id,
  meses,
  valor,
  aoMudar,
}: {
  /** Pra tela devolver o foco aqui (o "Ver as atrasadas" que some depois do clique). */
  id?: string;
  meses: readonly string[];
  valor: MesDoFiltro;
  aoMudar: (mes: MesDoFiltro) => void;
}) {
  return (
    <select
      id={id}
      aria-label="Mês do vencimento"
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      className="sakura-campo sakura-campo-filtro !h-10 !w-52"
    >
      {meses.map((mes) => (
        <option key={mes} value={mes}>
          {nomeDoMes(mes).replace(/^./, (letra) => letra.toUpperCase())}
        </option>
      ))}
      <option value={TODOS_OS_MESES}>Todos os meses</option>
    </select>
  );
}

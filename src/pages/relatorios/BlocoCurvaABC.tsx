import { useMemo, useState, type ReactNode } from "react";
import { Abas } from "@/components/Abas";
import { Chips } from "@/components/Chips";
import { Explicacao } from "@/components/Explicacao";
import { CartaoDeGrafico, GraficoPareto, TabelaDoGrafico } from "@/components/graficos";
import { Valor } from "@/components/Valor";
import {
  CORTES_ABC,
  curvasABC,
  type CriterioABC,
  type CurvaABC,
  type LetraABC,
} from "@/schemas/curvaABC";
import { formatarMoeda, formatarPercentual } from "@/schemas/dinheiro";
import { lucratividadePorCliente, type LinhaLucro } from "@/schemas/lucratividade";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import {
  ITENS_A_VISTA,
  formatarMoedaCurta,
  fraseDaABC,
  itensDoPareto,
  resumoDaCurva,
  type PeriodoRelacoes,
} from "@/schemas/relacoes";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";

type ListaDaCurva = "pecas" | "servicos" | "clientes";

const CRITERIOS: { valor: CriterioABC; nome: string }[] = [
  { valor: "venda", nome: "Por venda" },
  { valor: "lucro", nome: "Por lucro" },
];

const LISTAS: { valor: ListaDaCurva; nome: string }[] = [
  { valor: "pecas", nome: "Peças" },
  { valor: "servicos", nome: "Serviços" },
  { valor: "clientes", nome: "Clientes" },
];

const TEXTOS: Record<ListaDaCurva, { umItem: string; variosItens: string; vazio: string }> = {
  pecas: { umItem: "peça", variosItens: "peças", vazio: "Nenhuma peça vendida neste período." },
  servicos: { umItem: "serviço", variosItens: "serviços", vazio: "Nenhum serviço vendido neste período." },
  clientes: { umItem: "cliente", variosItens: "clientes", vazio: "Nenhum cliente comprou neste período." },
};

// A letra é a palavra do aviso (a cor não avisa sozinha), no selo cinza; o
// laranja é só do grupo A: o que não pode faltar. Sem verde nem amarelo (a
// letra não é "bom" nem "ruim"). A letra fica escura nos dois: o contraste vem do texto.
const CLASSE_DO_SELO: Record<LetraABC, string> = {
  A: "bg-acao/[0.16] text-texto",
  B: "bg-texto/[0.08] text-texto-2",
  C: "bg-texto/[0.08] text-texto-2",
};

/** As três listas têm linhas de formatos diferentes: aqui ficam só com o nome. */
function comNome<T>(curva: CurvaABC<T>, nomeDe: (linha: T) => string): CurvaABC<{ nome: string }> {
  return { total: curva.total, linhas: curva.linhas.map((l) => ({ ...l, linha: { nome: nomeDe(l.linha) } })) };
}

/**
 * "Curva ABC": o que não pode faltar. Pareto deitado de Peças, Serviços e
 * Clientes (as `Abas`), por venda ou por lucro (os chips). As contas moram em
 * `schemas/` (as mesmas OS e o mesmo período da Sobra das OS, por isso a soma
 * bate); aqui é só ligar os fios e mostrar.
 */
export function BlocoCurvaABC({
  ordens,
  pecas,
  servicos,
  linhasPorItem,
  periodo,
  className,
}: {
  ordens: OrdemServico[];
  pecas: Peca[];
  servicos: Servico[];
  /** As linhas da Lucratividade do período (a página já as calculou). */
  linhasPorItem: readonly LinhaLucro[];
  periodo: PeriodoRelacoes;
  className?: string;
}) {
  const [criterio, setCriterio] = useState<CriterioABC>("venda");
  const [lista, setLista] = useState<ListaDaCurva>("pecas");

  const curvas = useMemo(
    () =>
      curvasABC({
        porItem: linhasPorItem,
        porCliente: lucratividadePorCliente({
          ordens,
          custoPeca: mapaCustoPecas(pecas),
          custoServico: mapaCustoServicos(servicos),
          de: periodo.de,
          ate: periodo.ate,
        }),
        criterio,
      }),
    [ordens, pecas, servicos, linhasPorItem, periodo, criterio],
  );

  const textos = TEXTOS[lista];
  const rotuloDoValor = criterio === "venda" ? "Venda" : "Lucro";
  const curva =
    lista === "pecas"
      ? comNome(curvas.pecas, (l) => l.descricao)
      : lista === "servicos"
        ? comNome(curvas.servicos, (l) => l.descricao)
        : comNome(curvas.clientes, (l) => l.nome);
  const resumo = resumoDaCurva(curva);
  const itens = itensDoPareto(curva, (l) => l.nome, ITENS_A_VISTA);
  const total = resumo.total;
  const balcao =
    lista === "clientes" && curvas.consumidor ? (
      <p className="mt-4 text-corpo text-texto">
        Venda de balcão sem cliente (fora da curva):{" "}
        {curvas.consumidor.valor === null ? (
          <span className="text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>
        ) : (
          <span className="font-medium">{formatarMoeda(curvas.consumidor.valor)}</span>
        )}
      </p>
    ) : null;

  const tabela: ReactNode =
    total === 0 ? undefined : (
      <TabelaDoGrafico
        legenda={`Curva ABC de ${textos.variosItens}`}
        colunas={[
          { chave: "curva", titulo: "Curva" },
          { chave: "nome", titulo: "Nome" },
          { chave: "valor", titulo: rotuloDoValor, numero: true },
          { chave: "parte", titulo: "% do total", numero: true },
          { chave: "acumulada", titulo: "% acumulada", numero: true },
        ]}
        linhas={curva.linhas.map((l, i) => ({
          chave: `${i}:${l.linha.nome}`,
          celulas: {
            curva: (
              <span
                className={`inline-flex size-7 items-center justify-center rounded-full text-rotulo font-semibold ${CLASSE_DO_SELO[l.letra]}`}
                role="img"
                aria-label={`Curva ${l.letra}`}
              >
                {l.letra}
              </span>
            ),
            nome: l.linha.nome,
            valor:
              l.valor === null ? (
                <span className="text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>
              ) : (
                <Valor valor={l.valor} />
              ),
            parte:
              l.participacao === null ? (
                <span className="text-texto-2">fora da conta</span>
              ) : (
                formatarPercentual(l.participacao)
              ),
            acumulada: l.acumulada === null ? "" : formatarPercentual(l.acumulada),
          },
        }))}
      />
    );

  return (
    <CartaoDeGrafico
      id="curva-abc"
      nome="Curva ABC"
      titulo={fraseDaABC({
        quantosNoA: resumo.quantosNoA,
        total,
        percentual: resumo.percentualDoA,
        umItem: textos.umItem,
        variosItens: textos.variosItens,
        criterio,
      })}
      className={className}
      acoes={
        <>
          <Chips rotulo="Classificar por" opcoes={CRITERIOS} valor={criterio} aoEscolher={setCriterio} />
          <Explicacao
            titulo="Curva ABC"
            texto={`${
              criterio === "venda"
                ? "A curva por venda mostra o que não pode faltar: A são os poucos que fazem a maior parte do que entrou no período."
                : "A curva por lucro mostra o que vale a pena: o que vendeu menos o custo."
            } A vai até ${CORTES_ABC.A}% do total (a linha que passa dos ${CORTES_ABC.A}% ainda é A), B até ${CORTES_ABC.B}%, C é o resto. Conta as mesmas OS da Sobra das OS (abertas no período, orçamento fora). ${
              criterio === "lucro"
                ? `Item com ${TEXTO_CUSTO_NAO_INFORMADO}, ou com lucro zero ou negativo, fica no C, fora da conta.`
                : "Item com venda zero fica no C, fora da conta."
            }`}
          />
        </>
      }
      tabela={tabela}
      verTodos={
        total > itens.length
          ? { rotulo: `Ver os ${total} ${textos.variosItens}`, conteudo: tabela }
          : undefined
      }
    >
      <Abas
        rotulo="Lista da curva ABC"
        abas={LISTAS}
        ativa={lista}
        aoEscolher={setLista}
        prefixoId="curva-abc-aba"
        painel="curva-abc-painel"
        className="mb-6"
      />
      <div role="tabpanel" id="curva-abc-painel" aria-labelledby={`curva-abc-aba-${lista}`}>
        {total === 0 ? (
          <p className="text-corpo text-texto-2">{textos.vazio}</p>
        ) : (
          <GraficoPareto
            grupos={resumo.grupos}
            itens={itens}
            formatarCurto={formatarMoedaCurta}
            limite={CORTES_ABC.A}
          />
        )}
        {balcao}
      </div>
    </CartaoDeGrafico>
  );
}

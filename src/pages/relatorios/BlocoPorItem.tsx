import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CartaoDeGrafico, GraficoRanking, TabelaDoGrafico, type LinhaDoRanking } from "@/components/graficos";
import { Valor } from "@/components/Valor";
import { formatarPercentual } from "@/schemas/dinheiro";
import { margemMediaComCusto, type LinhaLucro } from "@/schemas/lucratividade";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import {
  formatarMoedaCurta,
  fraseDoRanking,
  itensAVista,
  linhasDoRanking,
  type LinhaDoRankingDaSobra,
} from "@/schemas/relacoes";

/**
 * O link que resolve o "custo não informado". A tela de editar uma peça só se
 * abre de dentro da lista do Estoque (não há endereço por peça), então o link
 * leva à lista de peças; o serviço leva à lista de serviços.
 */
function AcaoDoCusto({ linha }: { linha: LinhaDoRankingDaSobra }) {
  const servico = linha.tipo === "servico";
  return (
    <Link
      to={servico ? "/servicos" : "/estoque"}
      className="whitespace-nowrap text-rotulo font-medium text-acao underline underline-offset-2"
    >
      {servico ? "cadastre o custo do serviço" : "cadastre o custo da peça"}
    </Link>
  );
}

/** "O que me dá dinheiro": o ranking pela Sobra das OS de cada peça e serviço. */
export function BlocoPorItem({ linhas, className }: { linhas: readonly LinhaLucro[]; className?: string }) {
  const todas = useMemo(() => linhasDoRanking(linhas), [linhas]);
  const aVista = useMemo(() => itensAVista(todas), [todas]);
  const media = useMemo(() => margemMediaComCusto(linhas), [linhas]);
  // Item sem custo não concorre a "quem mais deu dinheiro": a sobra dele seria inventada.
  const titulo = fraseDoRanking(
    todas.filter((l) => !l.custoNaoInformado).map((l) => ({ descricao: l.nome, valor: l.valor })),
  );

  const linhasDoGrafico: LinhaDoRanking[] = aVista.map((l) => ({
    chave: l.chave,
    nome: l.nome,
    valor: l.valor,
    percentual: l.percentual,
    tipo: l.tipo,
    custoNaoInformado: l.custoNaoInformado,
    acao: l.custoNaoInformado ? <AcaoDoCusto linha={l} /> : undefined,
  }));

  // A tabela completa de antes: Qtd., Vendido, Custo, Sobra das OS e "de cada R$ 100, sobra".
  const tabela = (
    <TabelaDoGrafico
      legenda="Vendido, custo e sobra de cada peça e serviço"
      colunas={[
        { chave: "descricao", titulo: "Descrição" },
        { chave: "quantidade", titulo: "Qtd. vendida", numero: true },
        { chave: "vendido", titulo: "Vendido", numero: true },
        { chave: "custo", titulo: "Custo", numero: true },
        { chave: "sobra", titulo: "Sobra das OS", numero: true },
        { chave: "percentual", titulo: "De cada R$ 100, sobra", numero: true },
      ]}
      linhas={linhas.map((l, i) => {
        const dela = todas[i];
        const percentual = dela.percentual;
        const acima = media !== null && percentual !== null && percentual > media;
        return {
          chave: dela.chave,
          celulas: {
            descricao: (
              <span className="flex flex-col items-start gap-1">
                {l.descricao}
                {l.custoNaoInformado && <AcaoDoCusto linha={dela} />}
              </span>
            ),
            quantidade: l.quantidade,
            vendido: <Valor valor={l.receita} />,
            custo: l.custoNaoInformado ? (
              <span className="text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>
            ) : (
              <Valor valor={l.custo} />
            ),
            sobra: l.custoNaoInformado ? (
              <span className="text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>
            ) : (
              <span className="font-semibold">
                <Valor valor={l.margem} />
              </span>
            ),
            percentual:
              percentual === null ? (
                <span className="text-texto-2">—</span>
              ) : (
                <span className={acima ? "font-semibold" : "text-texto-2"}>
                  {formatarPercentual(percentual)}
                  {acima && " · acima da média"}
                </span>
              ),
          },
        };
      })}
    />
  );

  return (
    <CartaoDeGrafico
      id="por-item"
      nome="O que me dá dinheiro"
      titulo={titulo}
      className={className}
      tabela={tabela}
      verTodos={
        todas.length > aVista.length
          ? { rotulo: `Ver os ${todas.length} itens`, conteudo: tabela }
          : undefined
      }
    >
      <GraficoRanking linhas={linhasDoGrafico} media={media} formatarCurto={formatarMoedaCurta} />
    </CartaoDeGrafico>
  );
}

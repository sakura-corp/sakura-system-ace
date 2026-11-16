import { Info } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Valor } from "@/components/Valor";
import { hojeLocal, primeiroDiaDoMesLocal } from "@/lib/datas";
import {
  CORTES_ABC,
  contarPorLetra,
  curvasABC,
  type CriterioABC,
  type CurvaABC,
  type LetraABC,
} from "@/schemas/curvaABC";
import { formatarMoeda } from "@/schemas/dinheiro";
import { lucratividadePorCliente, lucratividadePorItem } from "@/schemas/lucratividade";
import { mapaCustoPecas, mapaCustoServicos } from "@/schemas/metricasCaixa";
import { TEXTO_CUSTO_NAO_INFORMADO } from "@/schemas/orcamento";
import type { OrdemServico } from "@/types/os";
import type { Peca } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { FiltroDeDatas } from "./FiltroDeDatas";
import { GraficoDeRosca } from "./GraficoDeRosca";
import { Segmentos } from "./Segmentos";

interface CurvaABCSectionProps {
  ordens: OrdemServico[];
  pecas: Peca[];
  servicos: Servico[];
}

const CRITERIOS: { chave: CriterioABC; texto: string }[] = [
  { chave: "venda", texto: "Por venda" },
  { chave: "lucro", texto: "Por lucro" },
];

// O selo da curva (#990, tarefa 13): a LETRA é a palavra do aviso (regra 4), e a
// cor só reforça. Do mais importante pro menos: A verde, B amarelo, C cinza.
// Não usa o `Selo` porque ele pede um ícone com significado de status, e aqui
// a letra já diz tudo; o tom (fundo da cor a 12%, letra na cor) é o mesmo dele.
const CLASSE_DO_SELO: Record<LetraABC, string> = {
  A: "bg-ok/[0.12] text-ok",
  B: "bg-atencao/[0.12] text-atencao",
  C: "bg-texto/[0.08] text-texto-2",
};

function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

// #390. As contas moram em `schemas/lucratividade.ts` (as mesmas OS e o mesmo
// período da aba Lucratividade, por isso a soma bate) e `schemas/curvaABC.ts`
// (a letra). Aqui é só ligar os fios e mostrar.
export function CurvaABCSection({ ordens, pecas, servicos }: CurvaABCSectionProps) {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMesLocal());
  const [dataFim, setDataFim] = useState(hojeLocal());
  const [criterio, setCriterio] = useState<CriterioABC>("venda");

  const curvas = useMemo(() => {
    const parametros = {
      ordens,
      custoPeca: mapaCustoPecas(pecas),
      custoServico: mapaCustoServicos(servicos),
      de: dataInicio,
      ate: dataFim,
    };
    const porItem = lucratividadePorItem({
      ...parametros,
      nomePeca: new Map(pecas.map((peca) => [peca.id, peca.descricao])),
      nomeServico: new Map(servicos.map((servico) => [servico.id, servico.descricao])),
    });
    return curvasABC({
      porItem: porItem.linhas,
      porCliente: lucratividadePorCliente(parametros),
      criterio,
    });
  }, [ordens, pecas, servicos, dataInicio, dataFim, criterio]);

  const rotuloValor = criterio === "venda" ? "Venda" : "Lucro";

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <FiltroDeDatas
          de={dataInicio}
          ate={dataFim}
          aoMudarDe={setDataInicio}
          aoMudarAte={setDataFim}
        />
        <Segmentos
          rotulo="Classificar por"
          opcoes={CRITERIOS}
          valor={criterio}
          aoEscolher={setCriterio}
        />
      </div>

      <p className="flex items-start gap-2 text-rotulo text-texto-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
        {criterio === "venda"
          ? "A curva por venda mostra o que não pode faltar: A são os poucos que fazem a maior parte do que entrou no período."
          : "A curva por lucro mostra o que vale a pena: o que vendeu menos o custo."}{" "}
        A vai até {CORTES_ABC.A}% do total (a linha que passa dos {CORTES_ABC.A}% ainda é A), B até{" "}
        {CORTES_ABC.B}%, C é o resto. Conta as mesmas OS da aba Lucratividade (abertas no período,
        orçamento fora).{" "}
        {criterio === "lucro"
          ? `Item com ${TEXTO_CUSTO_NAO_INFORMADO}, ou com lucro zero ou negativo, fica no C, fora da conta.`
          : "Item com venda zero fica no C, fora da conta."}
        </span>
      </p>

      <ListaABC
        titulo="Peças"
        vazio="Nenhuma peça vendida nesse período."
        curva={curvas.pecas}
        nomeDe={(l) => l.descricao}
        rotuloValor={rotuloValor}
      />
      <ListaABC
        titulo="Serviços"
        vazio="Nenhum serviço vendido nesse período."
        curva={curvas.servicos}
        nomeDe={(l) => l.descricao}
        rotuloValor={rotuloValor}
      />
      <ListaABC
        titulo="Clientes"
        vazio="Nenhum cliente comprou nesse período."
        curva={curvas.clientes}
        nomeDe={(l) => l.nome}
        rotuloValor={rotuloValor}
        rodape={
          curvas.consumidor && (
            <p className="px-[18px] py-3 text-corpo text-texto">
              Venda de balcão sem cliente (fora da curva):{" "}
              {curvas.consumidor.valor === null ? (
                <span className="text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>
              ) : (
                <span className="font-medium">{formatarMoeda(curvas.consumidor.valor)}</span>
              )}
            </p>
          )
        }
      />
    </>
  );
}

function ListaABC<T>({
  titulo,
  vazio,
  curva,
  nomeDe,
  rotuloValor,
  rodape,
}: {
  titulo: string;
  vazio: string;
  curva: CurvaABC<T>;
  nomeDe: (linha: T) => string;
  rotuloValor: string;
  rodape?: ReactNode;
}) {
  const contagem = contarPorLetra(curva);

  return (
    <section aria-label={titulo}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">{titulo}</h2>
        {curva.linhas.length > 0 && (
          <p className="text-rotulo text-texto-2">
            {(["A", "B", "C"] as const).map((letra, i) => (
              <span key={letra}>
                {i > 0 && " · "}
                {letra}: {contagem[letra]}
              </span>
            ))}
          </p>
        )}
      </div>
      {curva.linhas.length === 0 ? (
        <>
          <p className="text-corpo text-texto-2">{vazio}</p>
          {rodape && <div className="sakura-card mt-2">{rodape}</div>}
        </>
      ) : (
        <div className="flex items-start gap-4">
        <div className="sakura-card min-w-0 flex-1 overflow-hidden">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th className="w-24">Curva</th>
                <th>Nome</th>
                <th className="text-right">{rotuloValor}</th>
                <th className="text-right">% do total</th>
                <th className="text-right">% acumulada</th>
              </tr>
            </thead>
            <tbody>
              {curva.linhas.map((l, i) => (
                // Duas linhas podem ter o mesmo nome (peça do cadastro e
                // avulsa iguais): a posição desempata a chave.
                <tr key={`${i}:${nomeDe(l.linha)}`}>
                  <td>
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-rotulo font-semibold ${CLASSE_DO_SELO[l.letra]}`}
                      role="img"
                      aria-label={`Curva ${l.letra}`}
                    >
                      {l.letra}
                    </span>
                  </td>
                  <td>{nomeDe(l.linha)}</td>
                  <td className="text-right">
                    {l.valor === null ? (
                      <span className="text-texto-2">{TEXTO_CUSTO_NAO_INFORMADO}</span>
                    ) : (
                      <Valor valor={l.valor} />
                    )}
                  </td>
                  <td className="text-right">
                    {l.participacao === null ? (
                      <span className="text-texto-2">fora da conta</span>
                    ) : (
                      formatarPercentual(l.participacao)
                    )}
                  </td>
                  <td className="text-right">
                    {l.acumulada === null ? "" : formatarPercentual(l.acumulada)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rodape && <div className="border-t border-linha">{rodape}</div>}
        </div>
        {/* Quantos itens em cada curva: a mesma contagem do "A: 3 · B: 2" de cima. */}
        <div className="sakura-card hidden shrink-0 p-4 xl:block">
          <GraficoDeRosca
            descricao={`${titulo} por curva`}
            fatias={[
              { nome: "Curva A", valor: contagem.A, cor: "var(--color-ok)", texto: `${contagem.A} ${contagem.A === 1 ? "item" : "itens"}` },
              { nome: "Curva B", valor: contagem.B, cor: "var(--color-atencao)", texto: `${contagem.B} ${contagem.B === 1 ? "item" : "itens"}` },
              { nome: "Curva C", valor: contagem.C, cor: "var(--color-texto-3)", texto: `${contagem.C} ${contagem.C === 1 ? "item" : "itens"}` },
            ]}
          />
        </div>
        </div>
      )}
    </section>
  );
}

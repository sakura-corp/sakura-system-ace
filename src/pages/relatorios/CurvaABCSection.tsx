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

interface CurvaABCSectionProps {
  ordens: OrdemServico[];
  pecas: Peca[];
  servicos: Servico[];
}

const CRITERIOS: { chave: CriterioABC; label: string }[] = [
  { chave: "venda", label: "Por venda" },
  { chave: "lucro", label: "Por lucro" },
];

// Do mais forte pro mais fraco: A cheio, B só o contorno, C contorno discreto.
// Contorno em vez de fundo claro: no tema escuro o rosa-claro some e o
// cinza-claro vira o selo mais chamativo da lista (visto na foto da tela).
const CLASSE_DO_SELO: Record<LetraABC, string> = {
  A: "bg-sakura-purple text-white",
  B: "border-2 border-sakura-purple text-sakura-purple-dark",
  C: "border border-sakura-gray/50 text-sakura-muted",
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
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          De:
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
        <label className="flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          Até:
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="rounded-lg border border-sakura-borda-campo px-3 py-1.5"
          />
        </label>
        <div
          role="group"
          aria-label="Classificar por"
          className="flex gap-1 rounded-full bg-white/10 p-1"
        >
          {CRITERIOS.map((c) => (
            <button
              key={c.chave}
              type="button"
              aria-pressed={criterio === c.chave}
              onClick={() => setCriterio(c.chave)}
              className={`rounded-full px-3 py-1 text-rotulo font-medium transition ${
                criterio === c.chave
                  ? "bg-sakura-purple text-white"
                  : "text-sakura-purple-dark/85 hover:bg-white/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-rotulo text-sakura-muted">
        {criterio === "venda"
          ? "A curva por venda mostra o que não pode faltar: A são os poucos que fazem a maior parte do que entrou no período."
          : "A curva por lucro mostra o que vale a pena: o que vendeu menos o custo."}{" "}
        A vai até {CORTES_ABC.A}% do total (a linha que passa dos {CORTES_ABC.A}% ainda é A), B até{" "}
        {CORTES_ABC.B}%, C é o resto. Conta as mesmas OS da aba Lucratividade (abertas no período,
        orçamento fora).{" "}
        {criterio === "lucro"
          ? `Item com ${TEXTO_CUSTO_NAO_INFORMADO}, ou com lucro zero ou negativo, fica no C, fora da conta.`
          : "Item com venda zero fica no C, fora da conta."}
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
            <p className="px-4 py-3 text-corpo text-sakura-purple-dark">
              Venda de balcão sem cliente (fora da curva):{" "}
              {curvas.consumidor.valor === null ? (
                <span className="text-sakura-muted">{TEXTO_CUSTO_NAO_INFORMADO}</span>
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
        <h2 className="text-corpo font-semibold text-sakura-purple-dark">{titulo}</h2>
        {curva.linhas.length > 0 && (
          <p className="text-rotulo text-sakura-muted">
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
          <p className="text-corpo text-sakura-muted">{vazio}</p>
          {rodape && <div className="mt-2 sakura-card">{rodape}</div>}
        </>
      ) : (
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="w-20 px-4 py-3 font-medium">Curva</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">{rotuloValor}</th>
                <th className="px-4 py-3 font-medium">% do total</th>
                <th className="px-4 py-3 font-medium">% acumulada</th>
              </tr>
            </thead>
            <tbody>
              {curva.linhas.map((l, i) => (
                // Duas linhas podem ter o mesmo nome (peça do cadastro e
                // avulsa iguais): a posição desempata a chave.
                <tr key={`${i}:${nomeDe(l.linha)}`} className="border-t border-sakura-gray/20">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-rotulo font-semibold ${CLASSE_DO_SELO[l.letra]}`}
                      role="img"
                      aria-label={`Curva ${l.letra}`}
                    >
                      {l.letra}
                    </span>
                  </td>
                  <td className="px-4 py-3">{nomeDe(l.linha)}</td>
                  <td className="px-4 py-3">
                    {l.valor === null ? (
                      <span className="text-sakura-muted">{TEXTO_CUSTO_NAO_INFORMADO}</span>
                    ) : (
                      <Valor valor={l.valor} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.participacao === null ? (
                      <span className="text-sakura-muted">fora da conta</span>
                    ) : (
                      formatarPercentual(l.participacao)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {l.acumulada === null ? "" : formatarPercentual(l.acumulada)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rodape && <div className="border-t border-sakura-gray/20">{rodape}</div>}
        </div>
      )}
    </section>
  );
}

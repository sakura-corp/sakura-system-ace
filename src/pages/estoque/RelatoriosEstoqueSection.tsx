import { useMemo, useState } from "react";
import type { MovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";

interface RelatoriosEstoqueSectionProps {
  pecas: Peca[];
  movimentos: MovimentoEstoque[];
  saldos: Map<string, number>;
}

type FiltroSaldo = "todos" | "positivo" | "negativo" | "zerado";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RelatoriosEstoqueSection({
  pecas,
  movimentos,
  saldos,
}: RelatoriosEstoqueSectionProps) {
  const [filtroSaldo, setFiltroSaldo] = useState<FiltroSaldo>("todos");

  const pecasAtivas = useMemo(() => pecas.filter((p) => p.ativo), [pecas]);

  const valorTotalEstoque = useMemo(
    () =>
      pecasAtivas.reduce((total, peca) => {
        const saldo = saldos.get(peca.id) ?? 0;
        return total + saldo * (peca.preco_custo ?? 0);
      }, 0),
    [pecasAtivas, saldos],
  );

  const pecasComMovimento = useMemo(
    () => new Set(movimentos.map((m) => m.peca_id)),
    [movimentos],
  );
  const pecasSemMovimento = useMemo(
    () => pecasAtivas.filter((p) => !pecasComMovimento.has(p.id)),
    [pecasAtivas, pecasComMovimento],
  );

  const pecasFiltradasPorSaldo = useMemo(() => {
    if (filtroSaldo === "todos") return pecasAtivas;
    return pecasAtivas.filter((peca) => {
      const saldo = saldos.get(peca.id) ?? 0;
      if (filtroSaldo === "positivo") return saldo > 0;
      if (filtroSaldo === "negativo") return saldo < 0;
      return saldo === 0;
    });
  }, [pecasAtivas, saldos, filtroSaldo]);

  return (
    <div className="space-y-6">
      <section className="sakura-card p-6">
        <h2 className="text-corpo font-semibold text-sakura-purple-dark">
          Estoque físico-financeiro
        </h2>
        <p className="mt-1 text-rotulo text-sakura-muted">
          Valor do estoque parado (saldo atual × preço de custo), só produtos ativos.
        </p>
        <p className="mt-3 text-destaque font-semibold text-sakura-purple-dark">
          {formatarMoeda(valorTotalEstoque)}
        </p>
      </section>

      <section className="sakura-card p-6">
        <h2 className="text-corpo font-semibold text-sakura-purple-dark">
          Saldo por situação
        </h2>
        <p className="mt-1 text-rotulo text-sakura-muted">
          Produtos ativos, agrupados pelo saldo atual calculado.
        </p>
        <div className="mt-3 flex gap-1 border-b border-sakura-gray/30">
          <FiltroBotao
            label={`Todos (${pecasAtivas.length})`}
            ativo={filtroSaldo === "todos"}
            onClick={() => setFiltroSaldo("todos")}
          />
          <FiltroBotao
            label={`Positivo (${pecasAtivas.filter((p) => (saldos.get(p.id) ?? 0) > 0).length})`}
            ativo={filtroSaldo === "positivo"}
            onClick={() => setFiltroSaldo("positivo")}
          />
          <FiltroBotao
            label={`Negativo (${pecasAtivas.filter((p) => (saldos.get(p.id) ?? 0) < 0).length})`}
            ativo={filtroSaldo === "negativo"}
            onClick={() => setFiltroSaldo("negativo")}
          />
          <FiltroBotao
            label={`Zerado (${pecasAtivas.filter((p) => (saldos.get(p.id) ?? 0) === 0).length})`}
            ativo={filtroSaldo === "zerado"}
            onClick={() => setFiltroSaldo("zerado")}
          />
        </div>

        {pecasFiltradasPorSaldo.length === 0 ? (
          <p className="mt-4 text-corpo text-sakura-muted">Nenhum produto nessa situação.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-sakura-gray/20">
            <table className="w-full text-left text-corpo">
              <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Produto</th>
                  <th className="px-4 py-2.5 font-medium">Saldo</th>
                  <th className="px-4 py-2.5 font-medium">Valor em estoque</th>
                </tr>
              </thead>
              <tbody>
                {pecasFiltradasPorSaldo.map((peca) => {
                  const saldo = saldos.get(peca.id) ?? 0;
                  return (
                    <tr key={peca.id} className="border-t border-sakura-gray/20">
                      <td className="px-4 py-2.5">{peca.descricao}</td>
                      <td className="px-4 py-2.5">{saldo}</td>
                      <td className="px-4 py-2.5">
                        {formatarMoeda(saldo * (peca.preco_custo ?? 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="sakura-card p-6">
        <h2 className="text-corpo font-semibold text-sakura-purple-dark">
          Produtos sem movimentação
        </h2>
        <p className="mt-1 text-rotulo text-sakura-muted">
          Produtos ativos que nunca tiveram entrada ou saída registrada.
        </p>
        {pecasSemMovimento.length === 0 ? (
          <p className="mt-4 text-corpo text-sakura-muted">
            Todos os produtos ativos já tiveram alguma movimentação.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {pecasSemMovimento.map((peca) => (
              <li
                key={peca.id}
                className="rounded-full bg-sakura-pink-soft px-3 py-1.5 text-rotulo font-medium text-sakura-purple-dark"
              >
                {peca.descricao}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FiltroBotao({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-rotulo font-medium transition-colors ${
        ativo
          ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
          : "text-sakura-purple-dark/85 hover:text-sakura-purple-dark"
      }`}
    >
      {label}
    </button>
  );
}

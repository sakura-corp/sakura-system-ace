import { useMemo, useState } from "react";
import { Abas } from "@/components/Abas";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Selo } from "@/components/Selo";
import { Valor } from "@/components/Valor";
import { valorDaPecaEmEstoque, valorDoEstoque } from "@/schemas/valorItem";
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
    () => valorDoEstoque(pecasAtivas, saldos),
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

  const quantosPositivos = pecasAtivas.filter((p) => (saldos.get(p.id) ?? 0) > 0).length;
  const quantosNegativos = pecasAtivas.filter((p) => (saldos.get(p.id) ?? 0) < 0).length;
  const quantosZerados = pecasAtivas.filter((p) => (saldos.get(p.id) ?? 0) === 0).length;

  return (
    <div className="space-y-6">
      {/* "Estoque físico-financeiro" era nome de quem programou: o que a loja
          quer saber é quanto dinheiro está parado nas prateleiras. */}
      <div className="max-w-sm">
        <CartaoNumero
          titulo="Valor do estoque"
          explicacao="Dinheiro parado nas prateleiras: o saldo atual de cada produto × o preço de custo dele. Só entram os produtos ativos."
        >
          <Valor valor={valorTotalEstoque} />
        </CartaoNumero>
      </div>

      <section className="sakura-card p-6">
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">Saldo por situação</h2>
        <p className="mt-1 text-rotulo text-texto-2">
          Produtos ativos, agrupados pelo saldo atual calculado.
        </p>
        <div className="mt-3">
          <Abas
            rotulo="Situação do saldo"
            className="flex-wrap"
            ativa={filtroSaldo}
            aoEscolher={setFiltroSaldo}
            abas={[
              { valor: "todos", nome: "Todos", conta: pecasAtivas.length },
              { valor: "positivo", nome: "Positivo", conta: quantosPositivos },
              { valor: "negativo", nome: "Negativo", conta: quantosNegativos },
              { valor: "zerado", nome: "Zerado", conta: quantosZerados },
            ]}
          />
        </div>

        {pecasFiltradasPorSaldo.length === 0 ? (
          <p className="mt-4 text-corpo text-texto-2">Nenhum produto nessa situação.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-linha">
            <table className="sakura-tabela">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="text-right">Saldo</th>
                  <th className="text-right">Valor em estoque</th>
                </tr>
              </thead>
              <tbody>
                {pecasFiltradasPorSaldo.map((peca) => {
                  const saldo = saldos.get(peca.id) ?? 0;
                  return (
                    <tr key={peca.id}>
                      <td>{peca.descricao}</td>
                      <td className="text-right">
                        <span className="inline-flex items-center justify-end gap-2">
                          {saldo}
                          {saldo < 0 && <Selo tipo="perigo" palavra="Negativo" />}
                          {saldo === 0 && <Selo tipo="atencao" palavra="Sem estoque" />}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {formatarMoeda(valorDaPecaEmEstoque(saldo, peca.preco_custo))}
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
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">
          Produtos sem movimentação
        </h2>
        <p className="mt-1 text-rotulo text-texto-2">
          Produtos ativos que nunca tiveram entrada ou saída registrada.
        </p>
        {pecasSemMovimento.length === 0 ? (
          <p className="mt-4 text-corpo text-texto-2">
            Todos os produtos ativos já tiveram alguma movimentação.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {pecasSemMovimento.map((peca) => (
              <li
                key={peca.id}
                className="rounded-full bg-passar px-3 py-1.5 text-rotulo font-medium text-texto"
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

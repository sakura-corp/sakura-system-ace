import { Fragment, useMemo, useState } from "react";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  calcularFluxoProjetado,
  PERIODOS_FLUXO,
  PERIODO_FLUXO_PADRAO,
} from "@/schemas/fluxoProjetado";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";

interface FluxoProjetadoSectionProps {
  /** null = quem está usando não tem o módulo Contas a Pagar. */
  contasPagar: ContaPagar[] | null;
  /** null = quem está usando não tem o módulo Contas a Receber. */
  contasReceber: ContaReceber[] | null;
  /** "AAAA-MM-DD"; só os testes passam. */
  hoje?: string;
}

function Valor({ valor }: { valor: number | null }) {
  if (valor === null) return <>—</>;
  return (
    <span className={valor < 0 ? "text-red-300" : undefined}>
      {formatarMoeda(valor)}
    </span>
  );
}

// Toda soma vem de `calcularFluxoProjetado` (`schemas/fluxoProjetado.ts`).
export function FluxoProjetadoSection({
  contasPagar,
  contasReceber,
  hoje,
}: FluxoProjetadoSectionProps) {
  const [periodo, setPeriodo] = useState<number>(PERIODO_FLUXO_PADRAO);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const diaDeHoje = hoje ?? hojeLocal();

  const fluxo = useMemo(
    () =>
      calcularFluxoProjetado({
        contasPagar,
        contasReceber,
        hoje: diaDeHoje,
        dias: periodo,
      }),
    [contasPagar, contasReceber, diaDeHoje, periodo],
  );

  const linhas = fluxo.dias.filter(
    (d) => d.dia === diaDeHoje || d.itens.length > 0,
  );

  function alternar(dia: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(dia)) novo.delete(dia);
      else novo.add(dia);
      return novo;
    });
  }

  return (
    <>
      <div
        role="group"
        aria-label="Período"
        className="flex items-center gap-2"
      >
        <span className="text-corpo text-sakura-purple-dark/80">Período:</span>
        {PERIODOS_FLUXO.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={periodo === p}
            onClick={() => setPeriodo(p)}
            className={`rounded-lg border px-3 py-1.5 text-corpo ${
              periodo === p
                ? "border-sakura-purple bg-sakura-pink-soft font-medium text-sakura-purple-dark"
                : "border-sakura-borda-campo text-sakura-purple-dark/85 hover:text-sakura-purple-dark"
            }`}
          >
            {p} dias
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Entra</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            <Valor valor={fluxo.totalEntra} />
          </p>
          {fluxo.totalEntra === null && (
            <p className="text-rotulo text-sakura-muted">
              Sem acesso a Contas a Receber
            </p>
          )}
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Sai</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            <Valor valor={fluxo.totalSai} />
          </p>
          {fluxo.totalSai === null && (
            <p className="text-rotulo text-sakura-muted">
              Sem acesso a Contas a Pagar
            </p>
          )}
        </div>
        <div className="sakura-card p-4">
          <p className="text-rotulo text-sakura-muted">Saldo do período</p>
          <p className="text-destaque font-semibold text-sakura-purple-dark">
            <Valor valor={fluxo.saldo} />
          </p>
          {fluxo.saldo === null && (
            <p className="text-rotulo text-sakura-muted">
              Precisa de Contas a Pagar e Contas a Receber
            </p>
          )}
        </div>
      </div>

      <p className="text-rotulo text-sakura-muted">
        O saldo começa do zero hoje: é quanto sobra ou falta a partir de hoje,
        não o saldo do banco. Cartão a receber ainda não entra nesta conta.
      </p>

      <section>
        <h2 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
          Dia a dia
        </h2>
        <div className="overflow-x-auto sakura-card">
          <table className="w-full text-left text-corpo">
            <thead className="bg-sakura-pink-soft text-sakura-purple-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Dia</th>
                <th className="px-4 py-3 font-medium">Entra</th>
                <th className="px-4 py-3 font-medium">Sai</th>
                <th className="px-4 py-3 font-medium">Saldo do dia</th>
                <th className="px-4 py-3 font-medium">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((d) => {
                const aberto = abertos.has(d.dia);
                const temItens = d.itens.length > 0;
                const rotuloDia = `${diaBrasileiro(d.dia)}${d.dia === diaDeHoje ? " (hoje)" : ""}`;
                return (
                  <Fragment key={d.dia}>
                    <tr className="border-t border-sakura-gray/20">
                      <td className="px-4 py-3">
                        {temItens ? (
                          <button
                            type="button"
                            aria-expanded={aberto}
                            onClick={() => alternar(d.dia)}
                            className="font-medium text-sakura-purple-dark underline-offset-2 hover:underline"
                          >
                            {rotuloDia}
                          </button>
                        ) : (
                          <span className="text-sakura-purple-dark">
                            {rotuloDia}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Valor valor={d.entra} />
                      </td>
                      <td className="px-4 py-3">
                        <Valor valor={d.sai} />
                      </td>
                      <td className="px-4 py-3">
                        <Valor valor={d.saldoDoDia} />
                      </td>
                      <td className="px-4 py-3">
                        <Valor valor={d.saldoAcumulado} />
                      </td>
                    </tr>
                    {aberto && temItens && (
                      <tr className="bg-sakura-pink-soft/40">
                        <td colSpan={5} className="px-4 py-3">
                          <ul className="space-y-1">
                            {d.itens.map((item) => (
                              <li
                                key={item.chave}
                                className="flex flex-wrap items-center gap-2 text-corpo text-sakura-purple-dark"
                              >
                                <span>
                                  {item.tipo === "entra" ? "Entra:" : "Sai:"}
                                </span>
                                <span>{item.descricao}</span>
                                <span className="font-medium">
                                  {formatarMoeda(item.valor)}
                                </span>
                                {item.prevista && (
                                  <span className="rounded-full border border-sakura-purple px-2 text-rotulo">
                                    prevista
                                  </span>
                                )}
                                {item.atrasada && (
                                  <>
                                    <span className="rounded-full border border-red-300 px-2 text-rotulo text-red-300">
                                      atrasada
                                    </span>
                                    <span className="text-rotulo text-sakura-muted">
                                      venceu em {diaBrasileiro(item.vencimento)}
                                    </span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

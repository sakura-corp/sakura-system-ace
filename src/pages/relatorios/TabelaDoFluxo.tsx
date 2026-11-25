import { ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";
import { Selo } from "@/components/Selo";
import { Valor as ValorEmDinheiro } from "@/components/Valor";
import { diaBrasileiro } from "@/lib/datas";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { FluxoProjetado } from "@/schemas/fluxoProjetado";

/**
 * Um valor do fluxo. `null` é "sem acesso ao módulo": mostra "—", nunca um
 * R$ 0,00. Negativo ganha seta, sinal e cor (o `Valor` das telas): o saldo
 * que fica no vermelho não pode passar batido.
 */
export function ValorDoFluxo({ valor }: { valor: number | null }) {
  if (valor === null) return <>—</>;
  return <ValorEmDinheiro valor={valor} />;
}

/**
 * A tabela dia a dia do fluxo (o "Ver como tabela" dos Próximos dias): cada
 * linha abre e mostra as contas do dia, com os selos Prevista e Atrasada.
 * Toda soma vem de `calcularFluxoProjetado` (`schemas/fluxoProjetado.ts`).
 */
export function TabelaDoFluxo({ fluxo, hoje }: { fluxo: FluxoProjetado; hoje: string }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const linhas = fluxo.dias.filter((d) => d.dia === hoje || d.itens.length > 0);

  function alternar(dia: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(dia)) novo.delete(dia);
      else novo.add(dia);
      return novo;
    });
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-linha">
      <table className="sakura-tabela">
        <caption className="sr-only">O fluxo dia a dia</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th className="text-right">Entra</th>
            <th className="text-right">Sai</th>
            <th className="text-right">Saldo do dia</th>
            <th className="text-right">Falta cobrir</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((d) => {
            const aberto = abertos.has(d.dia);
            const temItens = d.itens.length > 0;
            const rotuloDia = `${diaBrasileiro(d.dia)}${d.dia === hoje ? " (hoje)" : ""}`;
            return (
              <Fragment key={d.dia}>
                <tr>
                  <td>
                    {temItens ? (
                      // A setinha mostra que a linha abre.
                      <button
                        type="button"
                        aria-expanded={aberto}
                        onClick={() => alternar(d.dia)}
                        className="inline-flex items-center gap-1.5 rounded-md py-1 pr-2 font-semibold text-texto hover:bg-passar"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={`size-4 shrink-0 text-texto-2 transition-transform duration-150 motion-reduce:transition-none ${
                            aberto ? "rotate-90" : ""
                          }`}
                        />
                        {rotuloDia}
                      </button>
                    ) : (
                      <span className="pl-[22px] text-texto">{rotuloDia}</span>
                    )}
                  </td>
                  <td className="text-right">
                    <ValorDoFluxo valor={d.entra} />
                  </td>
                  <td className="text-right">
                    <ValorDoFluxo valor={d.sai} />
                  </td>
                  <td className="text-right">
                    <ValorDoFluxo valor={d.saldoDoDia} />
                  </td>
                  <td className="text-right font-semibold">
                    <ValorDoFluxo valor={d.saldoAcumulado} />
                  </td>
                </tr>
                {aberto && temItens && (
                  <tr className="bg-poco">
                    <td colSpan={5} className="!h-auto py-3 pl-[44px]">
                      <ul className="space-y-1.5">
                        {d.itens.map((item) => (
                          <li key={item.chave} className="flex flex-wrap items-center gap-2 text-corpo text-texto">
                            <span className="text-texto-2">{item.tipo === "entra" ? "Entra:" : "Sai:"}</span>
                            <span>{item.descricao}</span>
                            <span className="font-semibold">{formatarMoeda(item.valor)}</span>
                            {item.prevista && <Selo tipo="info" palavra="Prevista" />}
                            {item.atrasada && (
                              <>
                                <Selo tipo="perigo" palavra="Atrasada" />
                                <span className="text-rotulo text-texto-2">
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
  );
}

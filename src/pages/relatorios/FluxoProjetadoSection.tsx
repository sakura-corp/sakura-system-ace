import { ChevronRight } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Selo } from "@/components/Selo";
import { Valor as ValorEmDinheiro } from "@/components/Valor";
import { diaBrasileiro, hojeLocal } from "@/lib/datas";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  calcularFluxoProjetado,
  PERIODOS_FLUXO,
  PERIODO_FLUXO_PADRAO,
} from "@/schemas/fluxoProjetado";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import { Segmentos } from "./Segmentos";

interface FluxoProjetadoSectionProps {
  /** null = quem está usando não tem o módulo Contas a Pagar. */
  contasPagar: ContaPagar[] | null;
  /** null = quem está usando não tem o módulo Contas a Receber. */
  contasReceber: ContaReceber[] | null;
  /** "AAAA-MM-DD"; só os testes passam. */
  hoje?: string;
}

/**
 * Um valor do fluxo. `null` é "sem acesso ao módulo": mostra "—", nunca um
 * R$ 0,00. Negativo ganha seta, sinal e cor (o `Valor` das telas): o saldo
 * que fica no vermelho não pode passar batido.
 */
function Valor({ valor }: { valor: number | null }) {
  if (valor === null) return <>—</>;
  return <ValorEmDinheiro valor={valor} />;
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
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-corpo text-texto-2">Período:</span>
        <Segmentos
          rotulo="Período"
          opcoes={PERIODOS_FLUXO.map((p) => ({ chave: p, texto: `${p} dias` }))}
          valor={periodo}
          aoEscolher={setPeriodo}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <CartaoNumero
          titulo="Entra"
          explicacao="As contas a receber ainda não recebidas que vencem no período. As vencidas contam em hoje."
          semAcesso={fluxo.totalEntra === null ? "Sem acesso a Contas a Receber" : undefined}
        >
          <Valor valor={fluxo.totalEntra} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Sai"
          explicacao="As contas a pagar ainda não pagas que vencem no período, e as recorrentes que ainda não foram criadas. As vencidas contam em hoje."
          semAcesso={fluxo.totalSai === null ? "Sem acesso a Contas a Pagar" : undefined}
        >
          <Valor valor={fluxo.totalSai} />
        </CartaoNumero>
        <CartaoNumero
          titulo="Saldo do período"
          explicacao="O que entra menos o que sai, a partir de hoje. Não é o saldo do banco."
          semAcesso={
            fluxo.saldo === null ? "Precisa de Contas a Pagar e Contas a Receber" : undefined
          }
        >
          <Valor valor={fluxo.saldo} />
        </CartaoNumero>
      </div>

      <p className="text-rotulo text-texto-2">
        O saldo começa do zero hoje: é quanto sobra ou falta a partir de hoje,
        não o saldo do banco. Cartão a receber ainda não entra nesta conta.
      </p>

      <section aria-labelledby="dia-a-dia-titulo">
        <h2
          id="dia-a-dia-titulo"
          className="mb-3 font-titulo text-subtitulo font-semibold text-texto"
        >
          Dia a dia
        </h2>
        <div className="sakura-card overflow-hidden">
          <table className="sakura-tabela">
            <thead>
              <tr>
                <th>Dia</th>
                <th className="text-right">Entra</th>
                <th className="text-right">Sai</th>
                <th className="text-right">Saldo do dia</th>
                <th className="text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((d) => {
                const aberto = abertos.has(d.dia);
                const temItens = d.itens.length > 0;
                const rotuloDia = `${diaBrasileiro(d.dia)}${d.dia === diaDeHoje ? " (hoje)" : ""}`;
                return (
                  <Fragment key={d.dia}>
                    <tr>
                      <td>
                        {temItens ? (
                          // A setinha mostra que a linha abre (antes só o sublinhado
                          // do mouse dizia, e só com o mouse em cima).
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
                        <Valor valor={d.entra} />
                      </td>
                      <td className="text-right">
                        <Valor valor={d.sai} />
                      </td>
                      <td className="text-right">
                        <Valor valor={d.saldoDoDia} />
                      </td>
                      <td className="text-right font-semibold">
                        <Valor valor={d.saldoAcumulado} />
                      </td>
                    </tr>
                    {aberto && temItens && (
                      <tr className="bg-poco">
                        <td colSpan={5} className="!h-auto py-3 pl-[44px]">
                          <ul className="space-y-1.5">
                            {d.itens.map((item) => (
                              <li
                                key={item.chave}
                                className="flex flex-wrap items-center gap-2 text-corpo text-texto"
                              >
                                <span className="text-texto-2">
                                  {item.tipo === "entra" ? "Entra:" : "Sai:"}
                                </span>
                                <span>{item.descricao}</span>
                                <span className="font-semibold">
                                  {formatarMoeda(item.valor)}
                                </span>
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
      </section>
    </>
  );
}

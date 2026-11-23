import { useMemo, useState } from "react";
import { AvisoDeErro } from "@/components/Aviso";
import { CartaoNumero } from "@/components/CartaoNumero";
import { Chips } from "@/components/Chips";
import { Explicacao } from "@/components/Explicacao";
import { CartaoDeGrafico, GraficoDegraus } from "@/components/graficos";
import { hojeLocal } from "@/lib/datas";
import { formatarMoeda } from "@/schemas/dinheiro";
import {
  calcularFluxoProjetado,
  PERIODOS_FLUXO,
  PERIODO_FLUXO_PADRAO,
} from "@/schemas/fluxoProjetado";
import {
  formatarMoedaCurta,
  fraseDoFluxo,
  pontosDoFluxo,
  saldoAPartirDoInformado,
} from "@/schemas/relacoes";
import type { ContaPagar } from "@/types/contaPagar";
import type { ContaReceber } from "@/types/contaReceber";
import { TabelaDoFluxo, ValorDoFluxo } from "./TabelaDoFluxo";

const OPCOES = PERIODOS_FLUXO.map((dias) => ({ valor: dias, nome: `${dias} dias` }));

const EXPLICACAO =
  "Entra: as contas a receber ainda não recebidas que vencem no período; as vencidas contam em hoje. Sai: as contas a pagar ainda não pagas que vencem no período, e as recorrentes que ainda não foram criadas; as vencidas contam em hoje. O gráfico começa do zero hoje: mostra quanto falta cobrir, não o saldo do banco. Cartão a receber ainda não entra nesta conta.";

/**
 * "Próximos 30 dias" (o período é 7, 30, 60 ou 90): vai faltar dinheiro?
 * Quando? O saldo em degraus, a partir de hoje (sem o "quanto tenho hoje" ele
 * é o "quanto falta cobrir"). É projeção: não usa o período lá de cima.
 * Toda conta vem de `schemas/` (o fluxo e o saldo).
 */
export function BlocoProximos({
  contasPagar,
  contasReceber,
  carregando,
  erro,
  hoje,
  className,
}: {
  /** null = quem está usando não tem o módulo Contas a Pagar. */
  contasPagar: ContaPagar[] | null;
  /** null = quem está usando não tem o módulo Contas a Receber. */
  contasReceber: ContaReceber[] | null;
  carregando: boolean;
  erro: string | null;
  /** "AAAA-MM-DD"; só os testes passam. */
  hoje?: string;
  className?: string;
}) {
  const [dias, setDias] = useState<number>(PERIODO_FLUXO_PADRAO);
  const diaDeHoje = hoje ?? hojeLocal();
  const nome = `Próximos ${dias} dias`;

  const fluxo = useMemo(
    () => calcularFluxoProjetado({ contasPagar, contasReceber, hoje: diaDeHoje, dias }),
    [contasPagar, contasReceber, diaDeHoje, dias],
  );
  const saldo = useMemo(() => saldoAPartirDoInformado(fluxo, null), [fluxo]);
  const pontos = useMemo(() => (saldo ? pontosDoFluxo(saldo, fluxo) : null), [saldo, fluxo]);

  const chips = <Chips rotulo="Período do fluxo" opcoes={OPCOES} valor={dias} aoEscolher={setDias} />;

  if (carregando) {
    return (
      <CartaoDeGrafico id="proximos-30-dias" nome={nome} titulo="Carregando as contas..." className={className}>
        <div aria-hidden="true" className="h-[272px] animate-pulse rounded-xl bg-linha motion-reduce:animate-none" />
      </CartaoDeGrafico>
    );
  }

  if (erro) {
    return (
      <CartaoDeGrafico
        id="proximos-30-dias"
        nome={nome}
        titulo="Não deu pra projetar os próximos dias"
        className={className}
      >
        <AvisoDeErro>
          Não deu pra carregar as contas: {erro}. Confira a internet e abra Relações de novo.
        </AvisoDeErro>
      </CartaoDeGrafico>
    );
  }

  const acoes = (
    <>
      {chips}
      <Explicacao titulo={nome} texto={EXPLICACAO} />
    </>
  );

  // Sem acesso a um dos módulos não há saldo: o aviso fica no lugar do gráfico.
  if (!saldo || !pontos) {
    return (
      <CartaoDeGrafico
        id="proximos-30-dias"
        nome={nome}
        titulo="Falta acesso pra projetar o saldo"
        acoes={acoes}
        className={className}
        tabela={<TabelaDoFluxo fluxo={fluxo} hoje={diaDeHoje} />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CartaoNumero
            titulo="Entra"
            semAcesso={fluxo.totalEntra === null ? "Sem acesso a Contas a Receber" : undefined}
          >
            <ValorDoFluxo valor={fluxo.totalEntra} />
          </CartaoNumero>
          <CartaoNumero
            titulo="Sai"
            semAcesso={fluxo.totalSai === null ? "Sem acesso a Contas a Pagar" : undefined}
          >
            <ValorDoFluxo valor={fluxo.totalSai} />
          </CartaoNumero>
        </div>
        <p className="mt-4 text-rotulo text-texto-2">
          O gráfico do saldo precisa de Contas a Pagar e de Contas a Receber.
        </p>
      </CartaoDeGrafico>
    );
  }

  return (
    <CartaoDeGrafico
      id="proximos-30-dias"
      nome={nome}
      titulo={fraseDoFluxo(saldo)}
      acoes={acoes}
      className={className}
      tabela={<TabelaDoFluxo fluxo={fluxo} hoje={diaDeHoje} />}
    >
      <p className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-corpo text-texto">
        <span>
          <span className="text-texto-2">Entra </span>
          <span className="font-semibold tabular-nums">{formatarMoeda(fluxo.totalEntra ?? 0)}</span>
        </span>
        <span>
          <span className="text-texto-2">Sai </span>
          <span className="font-semibold tabular-nums">{formatarMoeda(fluxo.totalSai ?? 0)}</span>
        </span>
      </p>
      <GraficoDegraus
        dias={pontos.dias}
        maisBaixo={pontos.maisBaixo}
        fim={pontos.fim}
        nomeDoSaldo="Falta cobrir"
        formatarCurto={formatarMoedaCurta}
      />
    </CartaoDeGrafico>
  );
}

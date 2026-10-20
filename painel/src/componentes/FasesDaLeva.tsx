// As fases da leva no topo da tela da leva (#645): as cinco em linha, a atual acesa, as passadas feitas.
// No celular, só a atual e "fase N de 5". Cores só da tabela do docs/painel.md (Design).
import { Check } from "lucide-react";
import { FASES, ROTULO_DA_FASE } from "../logica/fases";
import type { FaseDaLeva } from "../tipos";

type Props = {
  numero: number;
  fase: FaseDaLeva;
  /** A leva 0: Aprovada, mas de antes das fases (sem relatório). */
  antesDasFases?: boolean;
};

const CORES = {
  feita: "border-borda bg-feita-fundo text-feita",
  atual: "border-destaque bg-destaque text-sobre-destaque",
  proxima: "border-borda bg-cartao text-texto-2",
} as const;

export function FasesDaLeva({ numero, fase, antesDasFases = false }: Props) {
  const posicao = FASES.indexOf(fase);
  // Fase que o painel não conhece: melhor nada do que "fase 0 de 5".
  if (posicao < 0) return null;
  return (
    <div role="group" aria-label={`Fases da leva ${numero}`} className="mt-4 min-w-0">
      {/* Celular: só a fase atual. */}
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:hidden">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 font-medium ${CORES.atual}`}>{ROTULO_DA_FASE[fase]}</span>
        <span className="text-texto-2">fase {posicao + 1} de {FASES.length}</span>
      </p>
      {/* Da largura de tablet pra cima: as cinco em linha (se não couberem, quebram a linha, nunca cortam o nome). */}
      <ol className="hidden min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:flex">
        {FASES.map((f, i) => {
          // A leva 0 nunca passou pelas fases: só a Aprovada acende, nenhuma aparece como feita.
          const situacao = i === posicao ? "atual" : i < posicao && !antesDasFases ? "feita" : "proxima";
          return (
            <li key={f} data-fase={f} data-situacao={situacao} className="flex items-center gap-2">
              <span
                aria-current={situacao === "atual" ? "step" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-sm ${situacao === "atual" ? "font-semibold" : "font-medium"} ${CORES[situacao]}`}
              >
                {situacao === "feita" && <Check aria-hidden="true" className="size-3.5 shrink-0" />}
                {ROTULO_DA_FASE[f]}
                {situacao === "feita" && <span className="sr-only"> (feita)</span>}
              </span>
              {i < FASES.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-borda lg:w-6" />}
            </li>
          );
        })}
      </ol>
      {antesDasFases && <p className="mt-2 text-sm text-texto-2">Esta leva é de antes das fases, sem relatório.</p>}
    </div>
  );
}

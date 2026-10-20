// "Levas anteriores" (#548): uma linha por leva, da mais nova pra mais velha, cada uma um link pra tela da leva.
import { ChevronRight } from "lucide-react";
import { enderecoDaLeva } from "../logica/dados";
import { levasDaMaisNovaPraMaisVelha, MAXIMO_DE_LEVAS, textoDasHoras, textoDoFim } from "../logica/levasAnteriores";
import type { ResumoDeLeva } from "../tipos";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";

export function PaginaDasLevas({ levas, atual }: { levas: ResumoDeLeva[]; atual: number | null }) {
  const lista = levasDaMaisNovaPraMaisVelha(levas);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <CabecalhoDaPagina trilha="1º · Produção" titulo="Levas anteriores" explicacao="O que cada leva entregou: tarefas feitas, horas e quando terminou." />
      {lista.length === 0 ? (
        <p className="mt-6 rounded-xl border border-borda bg-cartao px-4 py-6 text-center text-sm text-texto-2">Nenhuma leva ainda.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {lista.map((l) => (
            <li key={l.numero}>
              <a
                href={enderecoDaLeva(l.numero, atual)}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-borda bg-cartao px-4 py-3.5 hover:bg-livre-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-lg font-semibold text-texto">{l.nome}</span>
                    {l.numero === atual ? (
                      <span className="inline-flex items-center rounded-full bg-andamento-fundo px-2 py-0.5 text-xs font-medium text-andamento">atual</span>
                    ) : null}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-texto-2">
                    <span>
                      {l.feitas} de {l.total} feitas
                    </span>
                    <span>{textoDasHoras(l.horas)}</span>
                    <span>{textoDoFim(l)}</span>
                  </p>
                  {l.cortada ? <p className="mt-1 text-xs text-texto-2">mais de 100 tarefas: horas e data das 100 primeiras</p> : null}
                </div>
                <ChevronRight className="size-4 shrink-0 text-texto-2" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {lista.length >= MAXIMO_DE_LEVAS ? (
        <p className="mt-4 text-center text-xs text-texto-2">Mostrando as {MAXIMO_DE_LEVAS} mais novas.</p>
      ) : null}
    </div>
  );
}

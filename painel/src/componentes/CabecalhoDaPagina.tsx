// O começo de toda página do painel: trilha ("Equipe / Sala"), título em serifa, uma linha de explicação e as ações à direita.
import type { ReactNode } from "react";

export function CabecalhoDaPagina({
  trilha,
  titulo,
  explicacao,
  acoes,
  idDoTitulo,
}: {
  /** O grupo da barra lateral ("Equipe"); sem ele, a trilha mostra só o título em negrito. */
  trilha?: string;
  titulo: string;
  explicacao?: ReactNode;
  acoes?: ReactNode;
  /** Pra um `aria-labelledby` de fora apontar pro título. */
  idDoTitulo?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="text-[13px] text-texto-2">
          {trilha ? <>{trilha} / </> : null}
          <b className="font-medium text-texto">{titulo}</b>
        </p>
        <h1
          id={idDoTitulo}
          className="mt-1 font-serif text-3xl leading-[1.1] font-semibold tracking-[-0.015em] text-texto [overflow-wrap:anywhere] md:text-[38px]"
        >
          {titulo}
        </h1>
        {explicacao ? <p className="mt-2 max-w-[60ch] text-[15px] text-texto-2">{explicacao}</p> : null}
      </div>
      {acoes ? <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  );
}

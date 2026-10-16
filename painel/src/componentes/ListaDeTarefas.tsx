import type { Tarefa } from "../tipos";
import { agruparPorEstado } from "../logica/contador";
import { Avatar } from "./Avatar";
import { PLURAL, Selo } from "./Selo";

export function ListaDeTarefas({ tarefas }: { tarefas: Tarefa[] }) {
  return (
    <div className="space-y-8">
      {agruparPorEstado(tarefas)
        .filter((g) => g.tarefas.length > 0)
        .map((g) => (
          <section key={g.estado} aria-labelledby={`grupo-${g.estado}`}>
            <h2 id={`grupo-${g.estado}`} className="mb-2 text-sm font-medium text-texto-2">
              {PLURAL[g.estado]} <span className="tabular-nums">({g.tarefas.length})</span>
            </h2>
            <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-cartao">
              {g.tarefas.map((t) => (
                <li key={t.numero}>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-fundo focus-visible:-outline-offset-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="shrink-0 text-sm tabular-nums text-texto-2">#{t.numero}</span>
                      <span className="min-w-0 font-medium sm:truncate" title={t.titulo}>{t.titulo}</span>
                      <span className="sr-only"> (abre no GitHub, em aba nova)</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3 text-sm">
                      <Selo estado={t.estado} />
                      <span className="flex items-center gap-1.5 text-texto-2">
                        {t.dono ? (
                          <>
                            <Avatar login={t.dono.login} avatar={t.dono.avatar} />
                            {t.dono.login}
                          </>
                        ) : (
                          "livre"
                        )}
                      </span>
                      {t.estimativaHoras !== undefined && (
                        <span className="tabular-nums text-texto-2">{String(t.estimativaHoras).replace(".", ",")} h</span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

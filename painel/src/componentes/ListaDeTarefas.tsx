import type { Tarefa } from "../tipos";
import { agruparPorEstado } from "../logica/contador";
import { Avatar } from "./Avatar";
import { linkParaComecar } from "../logica/comecarComClaude";
import { linkDoClaude } from "../logica/link";
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
                <li key={t.numero} className="flex flex-col hover:bg-fundo sm:flex-row sm:items-center">
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 focus-visible:-outline-offset-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="shrink-0 text-sm tabular-nums text-texto-2">#{t.numero}</span>
                      <span className="min-w-0 font-medium sm:truncate" title={t.titulo}>{t.titulo}</span>
                      <span className="sr-only"> (abre no GitHub, em aba nova)</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3 text-sm">
                      <Selo estado={t.estado} />
                      {/* Livre já diz no selo que não tem dono; nos outros estados, avisa. */}
                      {t.dono ? (
                        <span className="flex items-center gap-1.5 text-texto-2">
                          <Avatar login={t.dono.login} avatar={t.dono.avatar} />
                          {t.dono.login}
                        </span>
                      ) : (
                        t.estado !== "livre" && <span className="text-texto-2">sem responsável</span>
                      )}
                      {t.estimativaHoras !== undefined && (
                        <span className="tabular-nums text-texto-2">{String(t.estimativaHoras).replace(".", ",")} h</span>
                      )}
                    </span>
                  </a>
                  <BotaoComecar tarefa={t} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

/** Só em tarefa que não está feita; abre o formulário do Claude, que não envia sozinho. */
function BotaoComecar({ tarefa }: { tarefa: Tarefa }) {
  if (tarefa.estado === "feita") return null;
  

  const href = linkDoClaude(linkParaComecar(tarefa.numero, tarefa.chefe));
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-4 mb-3 inline-flex shrink-0 items-center justify-center self-start rounded-lg bg-destaque px-3 py-1.5 text-sm font-medium text-sobre-destaque hover:opacity-90 sm:m-0 sm:mr-4 sm:self-center"
    >
      Começar com o Claude<span className="sr-only"> (tarefa #{tarefa.numero}; abre o Claude em aba nova)</span>
    </a>
  );
}

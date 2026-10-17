import { horasPorPessoa } from "../logica/contador";
import type { Tarefa } from "../tipos";
import { Avatar } from "./Avatar";

const horas = (h: number) => String(h).replace(".", ",");

/** Quadro "Horas por pessoa": o ritmo de cada um na leva, pela estimativa das tarefas. Some se ninguém tem tarefa. */
export function HorasPorPessoa({ tarefas }: { tarefas: Tarefa[] }) {
  const pessoas = horasPorPessoa(tarefas);
  if (pessoas.length === 0) return null;
  return (
    <section aria-labelledby="horas-por-pessoa" className="mt-8">
      <h2 id="horas-por-pessoa" className="mb-2 text-sm font-medium text-texto-2">
        Horas por pessoa
      </h2>
      <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-cartao">
        {pessoas.map((p) => (
          <li key={p.login} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="flex min-w-0 items-center gap-1.5 font-medium">
              <Avatar login={p.login} avatar={p.avatar} />
              <span className="min-w-0 break-words">{p.login}</span>
            </span>
            <span className="min-w-0 tabular-nums text-texto-2">
              {horas(p.entregues)} h entregues · {horas(p.segurando)} h segurando
              {p.semEstimativa > 0 && ` · ${p.semEstimativa} sem estimativa`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

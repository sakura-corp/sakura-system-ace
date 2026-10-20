import { horasPorPessoa } from "../logica/contador";
import type { Tarefa } from "../tipos";
import { Avatar } from "./Avatar";

const formatar = (h: number) => String(h).replace(".", ",");

/** Quadro "Horas por pessoa": o ritmo de cada um na leva, pela estimativa das tarefas. Some se ninguém tem tarefa com dono (feita, em andamento ou em revisão). */
export function HorasPorPessoa({ tarefas }: { tarefas: Tarefa[] }) {
  const pessoas = horasPorPessoa(tarefas);
  if (pessoas.length === 0) return null;
  // A barrinha é só desenho (o número ao lado diz tudo): o tamanho é em relação a quem tem mais horas.
  const maior = Math.max(...pessoas.map((p) => p.entregues + p.segurando), 1);
  return (
    <section aria-labelledby="horas-por-pessoa" className="overflow-hidden rounded-xl border border-borda bg-cartao">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pb-2 pt-4 sm:px-5">
        <h2 id="horas-por-pessoa" className="text-[15px] font-semibold">
          Horas por pessoa
        </h2>
        <p className="text-[13px] text-texto-2">entregues e em mãos, nesta leva; sem nota nem ranking</p>
      </div>
      <ul className="divide-y divide-borda">
        {pessoas.map((p) => (
          <li
            key={p.login}
            className="grid grid-cols-[minmax(0,1fr)] gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] sm:items-center sm:px-5"
          >
            <span className="flex min-w-0 items-center gap-1.5 font-medium">
              <Avatar login={p.login} avatar={p.avatar} />
              <span className="min-w-0 break-words">{p.login}</span>
            </span>
            <span aria-hidden="true" className="order-last flex h-1.5 overflow-hidden rounded-full bg-livre-fundo sm:order-none">
              <i className="block h-full bg-feita" style={{ width: `${(p.entregues / maior) * 100}%` }} />
              <i className="block h-full bg-texto-2" style={{ width: `${(p.segurando / maior) * 100}%` }} />
            </span>
            <span className="min-w-0 tabular-nums text-texto-2 sm:text-right">
              {/* Cada pedaço quebra inteiro no celular (nunca "1" numa linha e "sem estimativa" na outra). */}
              <span className="whitespace-nowrap">{formatar(p.entregues)} h entregues</span>
              {" · "}
              <span className="whitespace-nowrap">{formatar(p.segurando)} h segurando</span>
              {p.semEstimativa > 0 && (
                <>
                  {" · "}
                  <span className="whitespace-nowrap">{p.semEstimativa} sem estimativa</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

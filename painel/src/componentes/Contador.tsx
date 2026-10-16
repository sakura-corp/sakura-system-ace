import type { Tarefa } from "../tipos";
import { contarPorEstado, ESTADOS, horas, total } from "../logica/contador";
import { PLURAL } from "./Selo";

const formatar = (n: number) => String(n).replace(".", ",");

export function Contador({ tarefas }: { tarefas: Tarefa[] }) {
  const porEstado = contarPorEstado(tarefas);
  const h = horas(tarefas);
  const quantas = total(tarefas);
  const percentual = quantas === 0 ? 0 : Math.round((porEstado.feita / quantas) * 100);

  return (
    <section aria-label="Resumo da leva">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ESTADOS.map((estado) => (
          <li key={estado} className="rounded-xl border border-borda bg-cartao px-4 py-3">
            <p className="text-2xl font-semibold tabular-nums">{porEstado[estado]}</p>
            <p className="text-sm text-texto-2">{PLURAL[estado]}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-texto-2">
        {porEstado.feita} de {quantas} tarefas feitas · {formatar(h.feitas)} h de {formatar(h.todas)} h
      </p>
      <div
        role="progressbar"
        aria-label="Tarefas feitas"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        className="mt-2 h-2 overflow-hidden rounded-full bg-livre-fundo"
      >
        <div className="h-full rounded-full bg-destaque" style={{ width: `${percentual}%` }} />
      </div>
    </section>
  );
}

import type { Tarefa } from "../tipos";
import { contarPorEstado, ESTADOS, horas, total } from "../logica/contador";
import { PLURAL } from "./Selo";

const formatar = (n: number) => String(n).replace(".", ",");

export function Contador({ tarefas }: { tarefas: Tarefa[] }) {
  const porEstado = contarPorEstado(tarefas);
  const h = horas(tarefas);
  const quantas = total(tarefas);
  const percentual = quantas === 0 ? 0 : Math.round((porEstado.feita / quantas) * 100);

  // Uma faixa só (versão A, #547): os quatro números lado a lado (dois por linha no celular) e a barra embaixo.
  return (
    <section aria-label="Resumo da leva" className="overflow-hidden rounded-xl border border-borda bg-cartao">
      <ul className="grid grid-cols-2 sm:grid-cols-4">
        {ESTADOS.map((estado, i) => (
          <li
            key={estado}
            className={`min-w-0 px-4 py-3 sm:px-5 sm:pt-4 ${i % 2 === 1 ? "border-l border-borda" : ""} ${i >= 2 ? "border-t border-borda sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}
          >
            <p className="text-[28px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{porEstado[estado]}</p>
            <p className="text-[13px] text-texto-2">{PLURAL[estado]}</p>
          </li>
        ))}
      </ul>
      <div className="border-t border-borda px-4 pb-4 pt-3 sm:border-t-0 sm:px-5 sm:pt-1">
        <p className="text-[13px] text-texto-2">
          {porEstado.feita} de {quantas} tarefas feitas · {formatar(h.feitas)} h de {formatar(h.todas)} h
        </p>
        <div
          role="progressbar"
          aria-label="Tarefas feitas"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentual}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-livre-fundo"
        >
          <div className="h-full rounded-full bg-destaque" style={{ width: `${percentual}%` }} />
        </div>
      </div>
    </section>
  );
}

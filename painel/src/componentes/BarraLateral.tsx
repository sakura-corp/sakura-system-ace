import { Lock } from "lucide-react";

type Props = { levas: string[]; atual: string };

export function BarraLateral({ levas, atual }: Props) {
  return (
    <nav
      aria-label="Menu do painel"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-borda bg-cartao px-4 py-3 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:flex-col md:items-stretch md:gap-y-6 md:border-b-0 md:border-r md:px-5 md:py-6"
    >
      <p className="font-serif text-xl font-semibold">Sakura Corp</p>

      <div>
        <p className="mb-1 hidden text-xs font-medium uppercase tracking-wide text-texto-2 md:block">Levas</p>
        <ul className="flex flex-wrap gap-1 md:flex-col">
          {levas.map((leva) => (
            <li key={leva}>
              <a
                href="#"
                aria-current={leva === atual ? "page" : undefined}
                className={`block rounded-lg px-3 py-1.5 text-sm ${
                  leva === atual ? "bg-destaque font-medium text-sobre-destaque" : "text-texto hover:bg-livre-fundo"
                }`}
              >
                {leva}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="md:mt-auto">
        <p
          aria-disabled="true"
          className="flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm text-texto-2"
        >
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Financeiro
            <span className="block text-xs">em breve, depende do banco próprio da Sakura</span>
          </span>
        </p>
      </div>
    </nav>
  );
}

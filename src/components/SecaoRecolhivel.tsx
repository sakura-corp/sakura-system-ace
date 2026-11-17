import { useState } from "react";
import type { ReactNode } from "react";

interface SecaoRecolhivelProps {
  titulo: string;
  descricao?: ReactNode;
  abertaInicialmente?: boolean;
  children: ReactNode;
}

export function SecaoRecolhivel({
  titulo,
  descricao,
  abertaInicialmente = false,
  children,
}: SecaoRecolhivelProps) {
  const [aberta, setAberta] = useState(abertaInicialmente);

  return (
    <div className="sakura-card p-6">
      <button
        type="button"
        onClick={() => setAberta((atual) => !atual)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <h2 className="text-corpo font-semibold text-texto">{titulo}</h2>
          {descricao && <p className="mt-1 text-rotulo text-texto-2">{descricao}</p>}
        </div>
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-texto/85 transition-transform ${
            aberta ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberta && <div className="mt-4">{children}</div>}
    </div>
  );
}

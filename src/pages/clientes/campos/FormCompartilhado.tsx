import { TriangleAlert } from "lucide-react";

/** O campo do visual novo (#990, tarefa 8): a classe `sakura-campo`, das peças. */
export const inputClasse = "sakura-campo";

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-corpo font-semibold text-texto">{titulo}</h3>
      {children}
    </section>
  );
}

export function Campo({
  label,
  obrigatorio,
  erro,
  className,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  erro?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`sakura-rotulo ${className ?? ""}`}>
      <span>
        {label}
        {obrigatorio && <span className="text-perigo"> *</span>}
      </span>
      {children}
      {/* Ícone e palavra junto da cor (regra 4): a borda vermelha do campo
          sozinha não avisa quem confunde o vermelho. */}
      {erro && (
        <span className="flex items-center gap-1.5 text-rotulo text-perigo">
          <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {erro}
        </span>
      )}
    </label>
  );
}

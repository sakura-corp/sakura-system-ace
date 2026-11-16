import { TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A caixa de aviso das telas do Caixa no visual novo (#990): ícone e palavra
 * junto da cor (regra 4), fundo da própria cor bem fraco. Só aparência.
 *
 * Mora aqui, e não em `src/components/`, porque a tarefa 10 só mexe nas telas
 * do Caixa. Outras telas têm a mesma caixa escrita à mão (as Ordens, na tarefa
 * 7): virar peça compartilhada é sugestão no PR.
 */
export function Aviso({
  tipo,
  icone: Icone = TriangleAlert,
  alerta = false,
  className = "",
  children,
}: {
  tipo: "ok" | "atencao" | "perigo";
  icone?: LucideIcon;
  /** Erro que acabou de aparecer: o leitor de tela anuncia na hora. */
  alerta?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cor =
    tipo === "ok"
      ? "bg-ok/[0.12] text-ok"
      : tipo === "perigo"
        ? "bg-perigo/[0.12] text-perigo"
        : "bg-atencao/[0.12] text-atencao";
  return (
    <div
      role={alerta ? "alert" : undefined}
      className={`flex items-start gap-2 rounded-xl px-4 py-3 ${cor} ${className}`.trim()}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

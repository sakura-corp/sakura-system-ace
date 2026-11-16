import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A faixa de erro das telas de Clientes, da ficha do veículo e de Garantias
 * (tarefa 8, #990). Erro não some sozinho: fica na tela, junto do que falhou,
 * com ícone e palavra além da cor (regra 4 do visual novo).
 */
export function AvisoDeErro({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-perigo/[0.13] px-4 py-3 text-corpo text-perigo"
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A faixa de aviso desta tela (tarefa 14 do visual novo, #990): o fundo é a
 * própria cor a 12%, o texto na cor e **um ícone na frente** — cor sozinha não
 * avisa quem confunde vermelho, laranja e verde (regra 4).
 *
 * - `perigo`: o que falhou (erro de carregar, de salvar).
 * - `info`: um esclarecimento que não pede ação (por que a soma de uma coluna
 *   dá mais que o total).
 * - `atencao`: o que a pessoa precisa conferir antes de seguir (comissão que
 *   mudou, OS ainda não recebida, peça sem custo).
 *
 * Só aparência: o texto de cada aviso continua o de sempre.
 */
export function AvisoDaTela({
  tipo,
  children,
  className = "",
}: {
  tipo: "perigo" | "atencao" | "info";
  children: ReactNode;
  className?: string;
}) {
  const Icone = tipo === "perigo" ? TriangleAlert : Info;
  const cor = {
    perigo: "bg-perigo/[0.13] text-perigo",
    atencao: "bg-atencao/[0.12] text-atencao",
    info: "bg-info/[0.13] text-info",
  }[tipo];
  return (
    <div
      role={tipo === "perigo" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-corpo ${cor} ${className}`.trim()}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

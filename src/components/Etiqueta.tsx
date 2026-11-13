import type { ReactNode } from "react";

// A etiqueta de situação das listas ("Ativo", "Inativo", "Vencida",
// "Recebido parcialmente"...). Morava copiada em uns 16 lugares, e só alguns
// lembravam de não quebrar linha: etiqueta de duas palavras em coluna
// apertada (1366) quebrava, com o fundo redondo cortado (#932). Aqui ela
// nunca quebra. A cor continua sendo de cada tela, por `className`.
export function Etiqueta({
  className = "",
  title,
  children,
}: {
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-rotulo font-medium ${className}`}
    >
      {children}
    </span>
  );
}

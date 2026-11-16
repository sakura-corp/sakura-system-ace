import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * O aviso que fica na tela (o erro de quem tentou e não conseguiu), no visual
 * novo: a cor do tipo bem fraca no fundo, a letra na cor, e o triângulo na
 * frente, porque cor sozinha não avisa (regra 4). Erro não some sozinho: o
 * `avisar()` é só pra confirmação.
 *
 * - `perigo`: deu errado (não carregou, não salvou).
 * - `atencao`: dá pra seguir, mas olhe isto (o XML que o programa não
 *   entendeu inteiro, o PDF que a prefeitura não tem).
 */
export function AvisoNaTela({
  tipo = "perigo",
  children,
}: {
  tipo?: "perigo" | "atencao";
  children: ReactNode;
}) {
  const cores = tipo === "perigo" ? "bg-perigo/[0.12] text-perigo" : "bg-atencao/[0.12] text-atencao";
  return (
    // O erro interrompe (alert); a atenção é anunciada sem cortar o que o
    // leitor de tela está lendo (status).
    <p role={tipo === "perigo" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl px-4 py-3 text-corpo ${cores}`}>
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

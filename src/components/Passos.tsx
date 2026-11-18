import { Check } from "lucide-react";

/**
 * A trilha 1-2-3 (#1132): fechar o caixa, fechar a OS. Cada passo com o nome,
 * o atual marcado e os feitos com ✓.
 *
 * O estado se lê sem a cor (WCAG 1.4.1), por três jeitos ao mesmo tempo:
 * - **feito**: o número vira ✓ (verde, de contorno);
 * - **agora**: o círculo é cheio (laranja, regra 2: é o próximo passo) e o
 *   nome fica em negrito;
 * - **falta**: círculo só de contorno, com o número, e o nome mais apagado.
 * O leitor de tela ouve "feito" ou "agora" depois do nome, e o atual leva o
 * `aria-current="step"`.
 *
 * Só mostra: quem anda entre os passos é a tela. O fio entre dois passos
 * fica verde quando o da esquerda está feito.
 */
export function Passos({
  rotulo,
  passos,
  atual,
  className = "",
}: {
  /** O nome da trilha pro leitor de tela ("Fechar o caixa"). */
  rotulo: string;
  /** Os nomes, na ordem: curtos, com verbo ("Contar o dinheiro"). */
  passos: ReadonlyArray<string>;
  /** O índice do passo de agora, a contar do 0. `passos.length` = tudo feito. */
  atual: number;
  className?: string;
}) {
  return (
    <ol aria-label={rotulo} className={`flex min-w-0 items-center gap-2 ${className}`}>
      {passos.map((nome, indice) => {
        const estado = indice < atual ? "feito" : indice === atual ? "agora" : "falta";
        const ultimo = indice === passos.length - 1;
        return (
          <li
            key={indice}
            aria-current={estado === "agora" ? "step" : undefined}
            className={`flex min-w-0 items-center gap-2 ${ultimo ? "" : "flex-1"}`}
          >
            <span
              aria-hidden="true"
              className={[
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-rotulo font-bold tabular-nums",
                "transition-colors duration-(--duration-botao) ease-suave motion-reduce:transition-none",
                estado === "feito"
                  ? "border-2 border-ok text-ok"
                  : estado === "agora"
                    ? "bg-acao text-sobre-acao"
                    : "border border-linha-forte text-texto-2",
              ].join(" ")}
            >
              {estado === "feito" ? (
                <Check data-passo-feito className="size-4" strokeWidth={3} />
              ) : (
                indice + 1
              )}
            </span>
            {/* Espremido (janela estreita), o nome é cortado com "…": o
                `title` mostra ele inteiro ao passar o mouse. */}
            <span
              title={nome}
              className={`min-w-0 truncate text-corpo ${
                estado === "agora"
                  ? "font-semibold text-texto"
                  : estado === "feito"
                    ? "text-texto"
                    : "text-texto-2"
              }`}
            >
              {nome}
              {estado !== "falta" && <span className="sr-only"> ({estado})</span>}
            </span>
            {!ultimo && (
              <span
                aria-hidden="true"
                className={`h-px min-w-4 flex-1 ${estado === "feito" ? "bg-ok" : "bg-linha-forte"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

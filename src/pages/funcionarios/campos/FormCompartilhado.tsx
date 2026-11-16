import { TriangleAlert } from "lucide-react";

// O campo do visual novo (#990, tarefa 14): a classe `sakura-campo` é a
// aparência de input, select e textarea (altura 44, borda `borda-campo`, foco
// laranja). O nome `inputClasse` continua existindo pra os campos desta pasta
// não precisarem mudar de import.
export const inputClasse = "sakura-campo";

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-corpo font-semibold text-texto">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/** A mensagem de um campo recusado: ícone e palavra junto da cor (regra 4). */
export function MensagemDeErro({ children }: { children?: string }) {
  return (
    <span role="alert" className="flex items-center gap-1.5 text-rotulo text-perigo">
      <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0" />
      {children}
    </span>
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
    <label className={`sakura-rotulo ${className ?? ""}`.trim()}>
      <span>
        {label}{" "}
        {obrigatorio && (
          <span className="text-perigo">
            <span aria-hidden="true">*</span>
            <span className="sr-only">(obrigatório)</span>
          </span>
        )}
      </span>
      {children}
      {erro && <MensagemDeErro>{erro}</MensagemDeErro>}
    </label>
  );
}

/**
 * A aba do alto de uma tela ou de um formulário: laranja só na ativa (regra 2),
 * as outras na cor secundária. É botão de verdade (`type="button"`): dentro de
 * um <form>, um botão sem tipo enviaria o formulário.
 */
export function AbaBotao({
  label,
  ativa,
  onClick,
}: {
  label: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={`border-b-2 px-4 py-2.5 text-corpo font-medium transition-colors ${
        ativa
          ? "border-sakura-purple text-texto"
          : "border-transparent text-texto-2 hover:text-texto"
      }`}
    >
      {label}
    </button>
  );
}

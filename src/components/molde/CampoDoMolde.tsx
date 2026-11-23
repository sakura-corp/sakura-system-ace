import { TriangleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";

/**
 * Um campo do molde de formulário (visual da leva 8, #1085, parte 3/5 #1134):
 * o jeito único de pôr um campo num formulário do programa.
 *
 *     Nome do cliente  obrigatório
 *     ┌──────────────────────────────┐  ← 48 px
 *     │ Maria Souza                  │
 *     └──────────────────────────────┘
 *     △ Escreva o nome.                ← o erro (vermelho, com o triângulo do Aviso)
 *     Como aparece na nota.             ← a ajuda
 *
 * - **Rótulo em cima**, maior que o rótulo antigo (14 px, na cor do texto):
 *   é o que a pessoa lê primeiro.
 * - **Obrigatório escrito**, e não só um asterisco colorido (WCAG 1.4.1). O
 *   campo ganha `aria-required` (e não o `required` do navegador: a mensagem
 *   de campo vazio é a do zod, do programa, e não o balão do Windows).
 * - **A ajuda embaixo**, e o erro logo acima dela, os dois ligados ao campo
 *   (`aria-describedby`): o leitor de tela lê o rótulo, o erro e a ajuda.
 * - **Campo de uma linha com 48 px** (a leva 8). A área de texto
 *   (`multilinha`) cresce com o conteúdo.
 *
 * O campo de verdade é de quem chama, porque cada um é registrado de um jeito
 * (`register`, `Controller`, um `Combobox`): o molde entrega as props que ele
 * precisa por uma função, e quem chama espalha junto com o `register`:
 *
 *     <CampoDoMolde rotulo="Nome" obrigatorio erro={errors.nome?.message}>
 *       {(campo) => <input {...campo} {...register("nome")} />}
 *     </CampoDoMolde>
 *
 * Select com valor "sentinela" continua SEM `register` (docs/estrutura.md): é
 * só espalhar o `campo` e controlar o valor com `watch`/`setValue`.
 */
export type PropsDoCampo = {
  id: string;
  className: string;
  "aria-required"?: true;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
};

export type PropsDoCampoDoMolde = {
  rotulo: string;
  obrigatorio?: boolean;
  /** Uma frase curta embaixo do campo: o formato, pra que serve. */
  ajuda?: ReactNode;
  /** O que a validação recusou (o `errors.<campo>?.message` do react-hook-form). */
  erro?: string;
  /** Área de texto: sem a altura fixa de uma linha. */
  multilinha?: boolean;
  /** Na grade da seção, ocupar a linha inteira (endereço, observação). */
  largura?: "normal" | "inteira";
  children: (campo: PropsDoCampo) => ReactNode;
};

// O `!` vence a altura de 44 px do `sakura-campo` (a peça de campo das telas
// antigas, que continua igual): a mesma saída do molde de lista.
const CLASSE_UMA_LINHA = "sakura-campo !h-12";
const CLASSE_MULTILINHA = "sakura-campo";

export function CampoDoMolde({
  rotulo,
  obrigatorio = false,
  ajuda,
  erro,
  multilinha = false,
  largura = "normal",
  children,
}: PropsDoCampoDoMolde) {
  const base = useId();
  const id = `${base}campo`;
  const idDoErro = `${base}erro`;
  const idDaAjuda = `${base}ajuda`;
  const temErro = Boolean(erro);

  const descrito = [temErro ? idDoErro : null, ajuda ? idDaAjuda : null].filter(Boolean).join(" ");

  const campo: PropsDoCampo = {
    id,
    className: multilinha ? CLASSE_MULTILINHA : CLASSE_UMA_LINHA,
    ...(obrigatorio ? { "aria-required": true } : {}),
    ...(temErro ? { "aria-invalid": true, "aria-errormessage": idDoErro } : {}),
    ...(descrito ? { "aria-describedby": descrito } : {}),
  };

  return (
    <div data-campo-do-molde className={`flex min-w-0 flex-col gap-2 ${largura === "inteira" ? "col-span-full" : ""}`}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-corpo font-medium text-texto">
        {rotulo}
        {/* Escondida do leitor de tela, que já ouve o `aria-required` do campo:
            sem isso, ouviria "obrigatório" duas vezes. */}
        {obrigatorio && (
          <span aria-hidden="true" className="text-meta font-normal text-texto-2">
            obrigatório
          </span>
        )}
      </label>
      {children(campo)}
      {(temErro || ajuda) && (
        <div className="flex flex-col gap-1">
          {temErro && (
            <p
              id={idDoErro}
              data-erro-do-campo
              className="flex items-start gap-1.5 text-rotulo font-medium text-perigo"
            >
              <TriangleAlert aria-hidden="true" className="mt-px size-4 shrink-0" />
              <span>{erro}</span>
            </p>
          )}
          {ajuda && (
            <p id={idDaAjuda} className="text-rotulo text-texto-2">
              {ajuda}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

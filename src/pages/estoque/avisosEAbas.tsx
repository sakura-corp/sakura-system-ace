import type { KeyboardEvent } from "react";

/**
 * As abas que o Estoque e os Fornecedores repetem (tarefa 9 do visual novo,
 * #990). As caixas de aviso que moravam aqui viraram a peça `Aviso`
 * (src/components/Aviso.tsx).
 */

/**
 * As abas da tela: o traço laranja embaixo da escolhida (regra 2: "a aba
 * ativa" é um dos lugares do laranja), e a palavra em negrito, porque cor
 * sozinha não avisa. Mesma aparência do `sakura-abas` das Ordens, feita com as
 * classes do Tailwind (a aparência segue o `aria-selected`, que é o que o
 * leitor de tela anuncia).
 *
 * O NOME da aba é o texto dela, sem número junto: a varredura de telas e os
 * testes clicam pelo nome.
 */
export function AbasDaTela<T extends string>({
  rotulo,
  abas,
  ativa,
  aoEscolher,
}: {
  /** O que a fileira de abas escolhe, pro leitor de tela ("Partes do estoque"). */
  rotulo: string;
  abas: ReadonlyArray<readonly [T, string]>;
  ativa: T;
  aoEscolher: (aba: T) => void;
}) {
  // O teclado do padrão "abas" da WAI-ARIA: só a aba escolhida entra na ordem
  // do Tab, e as setas (e Home/End) andam entre as abas, escolhendo e dando o
  // foco à nova. Sem isto, o papel `tab` prometeria um teclado que não existe.
  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    let novo: number | null = null;
    if (evento.key === "ArrowRight") novo = (indice + 1) % abas.length;
    else if (evento.key === "ArrowLeft") novo = (indice - 1 + abas.length) % abas.length;
    else if (evento.key === "Home") novo = 0;
    else if (evento.key === "End") novo = abas.length - 1;
    if (novo === null) return;
    evento.preventDefault();
    aoEscolher(abas[novo][0]);
    const irmas = evento.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role='tab']");
    irmas?.[novo]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className="flex flex-wrap gap-1 border-b border-linha"
    >
      {abas.map(([valor, nome], indice) => (
        <button
          key={valor}
          type="button"
          role="tab"
          aria-selected={ativa === valor}
          tabIndex={ativa === valor ? 0 : -1}
          onClick={() => aoEscolher(valor)}
          onKeyDown={(e) => aoTeclar(e, indice)}
          className={[
            "relative inline-flex items-baseline rounded-t-[10px] px-4 pb-3 pt-2.5",
            "text-corpo font-medium text-texto-2 transition-colors",
            "hover:bg-passar hover:text-texto",
            "aria-selected:font-semibold aria-selected:text-texto",
            "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-sm after:bg-transparent after:content-['']",
            "aria-selected:after:bg-acao",
          ].join(" ")}
        >
          {nome}
        </button>
      ))}
    </div>
  );
}

/**
 * O `Combobox` (em `src/components/`, fora da tarefa 9) ainda desenha o campo
 * dele no estilo antigo. Estas classes, postas na `className` dele (que cai no
 * invólucro), vestem o campo de dentro com o `sakura-campo` até a peça ser
 * atualizada. Quando for, esta constante vira uma string vazia e sai.
 */
export const CAMPO_NOVO_NO_COMBOBOX = "[&_input]:sakura-campo";
/** O mesmo, na altura de filtro (38 px). */
export const CAMPO_NOVO_NO_COMBOBOX_FILTRO = "[&_input]:sakura-campo [&_input]:sakura-campo-filtro";

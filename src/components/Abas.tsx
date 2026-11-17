import type { KeyboardEvent, ReactNode } from "react";

/**
 * As abas do visual novo (#990), numa peça só. Antes cada tela fazia a sua
 * (Estoque, Fornecedores, Caixa, Relações, Ordens, Orçamentos, Notas), umas
 * com teclado e outras sem.
 *
 * A aparência é a das classes `sakura-abas`/`sakura-aba` (globals.css,
 * tarefa 7): o traço laranja embaixo da escolhida e a palavra em negrito,
 * porque cor sozinha não avisa. A aparência segue o `aria-selected`, o mesmo
 * estado que o leitor de tela anuncia.
 *
 * O teclado é o do padrão "abas" da WAI-ARIA: só a aba escolhida entra na
 * ordem do Tab, e as setas (e Home/End) andam entre as abas, escolhendo e
 * dando o foco à nova. Sem isto, o papel `tab` prometeria um teclado que não
 * existe.
 *
 * O NOME da aba é o texto dela. A `conta` (o número ao lado, menor) entra no
 * fim do nome que o leitor de tela lê ("Recusados 1"): é assim que os testes
 * das Ordens e dos Orçamentos acham a aba.
 */
export type Aba<T extends string> = {
  valor: T;
  nome: string;
  /** O número ao lado do nome (quantas OS, quantos orçamentos). */
  conta?: ReactNode;
};

export function Abas<T extends string>({
  rotulo,
  abas,
  ativa,
  aoEscolher,
  prefixoId,
  painel,
  className,
}: {
  /** O que a fileira de abas escolhe, pro leitor de tela ("Partes do estoque"). */
  rotulo: string;
  abas: ReadonlyArray<Aba<T>>;
  ativa: T;
  aoEscolher: (aba: T) => void;
  /**
   * Quando a tela tem um painel (`role="tabpanel"`) que aponta pra aba com
   * `aria-labelledby`: cada aba ganha o id `<prefixoId>-<valor>`.
   */
  prefixoId?: string;
  /** O id do painel que as abas mostram (vira o `aria-controls` de cada uma). */
  painel?: string;
  /** Classes a mais na fileira (por exemplo `flex-wrap`). */
  className?: string;
}) {
  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    let novo: number | null = null;
    if (evento.key === "ArrowRight") novo = (indice + 1) % abas.length;
    else if (evento.key === "ArrowLeft") novo = (indice - 1 + abas.length) % abas.length;
    else if (evento.key === "Home") novo = 0;
    else if (evento.key === "End") novo = abas.length - 1;
    if (novo === null) return;
    evento.preventDefault();
    aoEscolher(abas[novo].valor);
    const irmas = evento.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role='tab']");
    irmas?.[novo]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className={className ? `sakura-abas ${className}` : "sakura-abas"}
    >
      {abas.map(({ valor, nome, conta }, indice) => (
        <button
          key={valor}
          // `type="button"`: a fileira pode estar dentro de um formulário, e a
          // aba não pode enviá-lo.
          type="button"
          role="tab"
          id={prefixoId ? `${prefixoId}-${valor}` : undefined}
          aria-selected={ativa === valor}
          aria-controls={painel}
          tabIndex={ativa === valor ? 0 : -1}
          onClick={() => aoEscolher(valor)}
          onKeyDown={(e) => aoTeclar(e, indice)}
          className="sakura-aba"
        >
          {nome}
          {conta !== undefined && (
            <>
              {" "}
              <span className="sakura-aba-conta">{conta}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

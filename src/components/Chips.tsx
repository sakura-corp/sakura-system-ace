import { Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A escolha por botões do visual da leva 8 (#1085, parte 2/5 #1133): forma de
 * pagamento, "Tudo / Entradas / Saídas", o período. Uma opção só, ou várias
 * (`multipla`), como num filtro.
 *
 * Cada opção é um botão com `aria-pressed`: o leitor de tela diz qual está
 * escolhida. E o escolhido aparece também SEM a cor (WCAG 1.4.1): ganha o
 * visto na frente e a palavra em negrito; a borda laranja é só o reforço.
 *
 * Formato de pílula, borda de 1 px e 40 px de altura (o mínimo de alvo da
 * leva 8). Nunca fundo laranja cheio: o laranja cheio é do botão principal da
 * tela (regra 2), e um chip não disputa com ele.
 *
 * Na escolha única, clicar de novo no escolhido não apaga a escolha (sempre
 * tem uma); na de várias, clicar liga e desliga, e a lista devolvida segue a
 * ordem das opções, não a ordem dos cliques (um valor que não está nas
 * opções fica no fim, sem sumir).
 *
 * Teclado: cada opção é um botão comum (Tab passa por elas, Espaço ou Enter
 * escolhe). `type="button"`: o grupo pode estar dentro de um formulário, e
 * escolher não pode enviá-lo.
 */
export type Chip<T extends string | number> = {
  valor: T;
  nome: string;
  /** Um ícone pequeno antes do nome (some quando a opção está escolhida, pro visto entrar). */
  icone?: ReactNode;
  /** A opção aparece, mas não pode ser escolhida. */
  desligada?: boolean;
};

type PropsComuns<T extends string | number> = {
  /** O que o grupo escolhe, pro leitor de tela ("Forma de pagamento"). */
  rotulo: string;
  opcoes: ReadonlyArray<Chip<T>>;
  /** Classes a mais no grupo (por exemplo, `justify-end`). */
  className?: string;
};

type PropsUnica<T extends string | number> = PropsComuns<T> & {
  multipla?: false;
  valor: T | null;
  aoEscolher: (valor: T) => void;
};

type PropsVarias<T extends string | number> = PropsComuns<T> & {
  multipla: true;
  valor: ReadonlyArray<T>;
  aoEscolher: (valores: T[]) => void;
};

export function Chips<T extends string | number>(props: PropsUnica<T> | PropsVarias<T>) {
  const { rotulo, opcoes, className } = props;

  function estaEscolhido(valor: T): boolean {
    return props.multipla ? props.valor.includes(valor) : props.valor === valor;
  }

  function aoClicar(valor: T) {
    if (props.multipla) {
      const ligado = props.valor.includes(valor);
      const daTela = opcoes.map((o) => o.valor);
      const novos = daTela.filter((v) => (v === valor ? !ligado : props.valor.includes(v)));
      // Um valor guardado que a tela não oferece mais (uma opção que sumiu)
      // continua escolhido: clicar em outra opção não pode apagá-lo calado.
      const deFora = props.valor.filter((v) => !daTela.includes(v));
      props.aoEscolher([...novos, ...deFora]);
    } else if (props.valor !== valor) {
      props.aoEscolher(valor);
    }
  }

  return (
    <div
      role="group"
      aria-label={rotulo}
      className={className ? `flex min-w-0 flex-wrap gap-2 ${className}` : "flex min-w-0 flex-wrap gap-2"}
    >
      {opcoes.map(({ valor, nome, icone, desligada }) => {
        const escolhido = estaEscolhido(valor);
        return (
          <button
            key={valor}
            type="button"
            aria-pressed={escolhido}
            disabled={desligada}
            onClick={() => aoClicar(valor)}
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-corpo transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 ${
              escolhido
                ? "border-acao bg-acao/10 font-semibold text-texto"
                : "border-linha-forte bg-cartao font-medium text-texto-2 enabled:hover:bg-passar enabled:hover:text-texto"
            }`}
          >
            {escolhido ? (
              <Check aria-hidden="true" data-visto="" className="text-acao" strokeWidth={2.5} />
            ) : (
              icone
            )}
            {nome}
          </button>
        );
      })}
    </div>
  );
}

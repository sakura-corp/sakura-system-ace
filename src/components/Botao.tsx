import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

/**
 * O botão do visual novo (#990; regras em docs/referencia/visual-novo/README.md,
 * seção 6). Uma peça, um lugar: tela nova não escreve mais as classes do botão
 * dela à mão.
 *
 * As quatro variantes:
 * - `principal`: laranja com letra escura. **Um por tela**: o próximo passo.
 * - `secundario` (o padrão): sem fundo, com borda.
 * - `fantasma`: sem fundo nem borda ("Cancelar", "Adicionar forma de pagamento").
 * - `whatsapp`: borda e ícone verdes (é o que o `BotaoWhatsapp` usa).
 *
 * Os três tamanhos: `pequeno` (32 px, linha de tabela), `medio` (40 px, o
 * padrão) e `grande` (48 px, o Login).
 *
 * `type="button"` é o padrão de propósito: um <button> sem tipo dentro de um
 * <form> ENVIA o formulário, e "cliquei em Cancelar e salvou" é bug que não
 * precisa acontecer. Quem quer enviar escreve `type="submit"`.
 */

export type VarianteDoBotao = "principal" | "secundario" | "fantasma" | "whatsapp";
export type TamanhoDoBotao = "pequeno" | "medio" | "grande";

// Cada estado numa string separada, e não tudo numa linha só: a varredura
// `npm run contraste` olha string por string, e "bg-acao" na mesma string que a
// letra clara do botão DESLIGADO viraria um alarme falso. As classes vão por
// extenso porque o Tailwind só gera a classe que acha inteira no código.
const BASE = [
  "inline-flex shrink-0 items-center whitespace-nowrap font-semibold",
  "transition-[transform,background-color,border-color,box-shadow,color] duration-150",
  "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
  "disabled:cursor-not-allowed disabled:active:scale-100 aria-disabled:pointer-events-none",
];

const VARIANTE: Record<VarianteDoBotao, string[]> = {
  principal: [
    // Regra 3: a letra em cima do laranja é a `sobre-acao` (6,1:1). Branca dá 3,2:1.
    "bg-acao text-sobre-acao",
    "shadow-[0_6px_18px_rgba(255,87,34,0.28),inset_0_1px_0_rgba(255,255,255,0.3)]",
    "hover:bg-acao-clara",
    "hover:shadow-[0_8px_26px_rgba(255,87,34,0.42),inset_0_1px_0_rgba(255,255,255,0.35)]",
    // Desligado vira cinza sólido, e não laranja esmaecido: com meia opacidade
    // a letra escura dá 2,4:1 e não se lê o que o botão faria.
    "disabled:bg-passar disabled:shadow-none",
    "disabled:text-texto-2",
  ],
  secundario: [
    "border border-linha-forte text-texto",
    "hover:bg-passar",
    "disabled:border-linha disabled:bg-transparent",
    "disabled:text-texto-3",
  ],
  fantasma: [
    "text-texto-2",
    "hover:bg-passar hover:text-texto",
    "disabled:bg-transparent",
    "disabled:text-texto-3",
  ],
  whatsapp: [
    "border border-zap/45 text-ok",
    "hover:bg-zap/[0.12]",
    "disabled:border-linha disabled:bg-transparent",
    "disabled:text-texto-3",
  ],
};

const TAMANHO: Record<TamanhoDoBotao, string> = {
  pequeno: "h-8 gap-1.5 rounded-[10px] px-3 text-rotulo [&_svg]:size-4",
  medio: "h-10 gap-2 rounded-xl px-4 text-corpo [&_svg]:size-[17px]",
  grande: "h-12 justify-center gap-2 rounded-[14px] px-5 text-base [&_svg]:size-[18px]",
};

// Botão só com ícone: quadrado, do lado do tamanho.
const SO_ICONE: Record<TamanhoDoBotao, string> = {
  pequeno: "w-8 justify-center px-0",
  medio: "w-10 justify-center px-0",
  grande: "w-12 justify-center px-0",
};

function classesDoBotao(
  variante: VarianteDoBotao,
  tamanho: TamanhoDoBotao,
  soIcone: boolean,
  className: string,
): string {
  return [...BASE, ...VARIANTE[variante], TAMANHO[tamanho], soIcone ? SO_ICONE[tamanho] : "", className]
    .filter(Boolean)
    .join(" ");
}

interface AparenciaDoBotao {
  variante?: VarianteDoBotao;
  tamanho?: TamanhoDoBotao;
  /** Um ícone (da `lucide-react`) na frente do texto. É enfeite: o leitor de tela pula. */
  icone?: ReactNode;
}

/** Com texto, o nome do botão é o texto. */
interface ComTexto {
  soIcone?: false;
  children: ReactNode;
}

/**
 * Só com ícone ("Mais ações", "Fechar"): sem `aria-label` não compila, porque
 * um botão sem nome é um botão que o leitor de tela anuncia como "botão" e mais
 * nada. O nome visível, ao passar o mouse, vem da `Dica` em volta.
 */
interface SoIcone {
  soIcone: true;
  icone: ReactNode;
  "aria-label": string;
  children?: never;
}

type BotaoProps = AparenciaDoBotao &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> &
  (ComTexto | SoIcone) & {
    /** Fazendo o que o clique pediu: não aceita outro clique até acabar. */
    ocupado?: boolean;
  };

export function Botao({
  variante = "secundario",
  tamanho = "medio",
  icone,
  soIcone = false,
  ocupado = false,
  className = "",
  type = "button",
  disabled,
  children,
  ...resto
}: BotaoProps) {
  return (
    <button
      {...resto}
      type={type}
      disabled={disabled || ocupado}
      aria-busy={ocupado || undefined}
      className={classesDoBotao(variante, tamanho, soIcone, className)}
    >
      {icone && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icone}
        </span>
      )}
      {children}
    </button>
  );
}

type LinkBotaoProps = AparenciaDoBotao & LinkProps & { children: ReactNode };

/**
 * O mesmo botão, quando o clique é IR pra outra tela ("Nova ordem de
 * serviço"): continua sendo um link de verdade, que abre com Ctrl+clique e que
 * o leitor de tela anuncia como link.
 */
export function LinkBotao({
  variante = "secundario",
  tamanho = "medio",
  icone,
  className = "",
  children,
  ...resto
}: LinkBotaoProps) {
  return (
    <Link {...resto} className={classesDoBotao(variante, tamanho, false, className)}>
      {icone && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icone}
        </span>
      )}
      {children}
    </Link>
  );
}

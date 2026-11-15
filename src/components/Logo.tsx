import { useTema } from "@/lib/tema";

interface LogoProps {
  className?: string;
  /** Tamanho da flor em pixels (o padrão serve pro Login). */
  tamanho?: number;
}

/**
 * A logo de dentro do programa (visual novo, #990, tarefa 6): a flor da logo B
 * (escolhida pela Sofia em 14/11) em cima, e o nome em letra de verdade
 * (Plus Jakarta Sans), não mais uma imagem do nome desenhada à mão.
 *
 * Ela muda junto com o tema (pedido da Sofia): a flor é a mesma nos dois (o
 * degradê vai do claro ao carmesim e se lê nos dois fundos), mas no escuro ela
 * ganha um brilho laranja e, no claro, uma sombra fina que a descola do creme.
 * O nome usa as cores de papel (`texto`, `texto-2`), que já trocam sozinhas.
 */
export function Logo({ className = "", tamanho = 88 }: LogoProps) {
  const tema = useTema();
  return (
    <div
      role="img"
      aria-label="Sakura System, AutoCenter Edition, by Sakura Corp"
      className={`flex flex-col items-center text-center ${className}`}
    >
      <img
        src={`${import.meta.env.BASE_URL}sakura-icon.svg`}
        alt=""
        width={tamanho}
        height={tamanho}
        className={
          tema === "escuro"
            ? "drop-shadow-[0_0_18px_rgba(255,87,34,0.35)]"
            : "drop-shadow-[0_2px_6px_rgba(120,40,10,0.25)]"
        }
      />
      <p className="mt-3 font-titulo text-titulo font-extrabold leading-tight tracking-tight text-texto">
        Sakura System
      </p>
      <p className="mt-1 font-titulo text-meta font-medium uppercase tracking-[0.3em] text-texto-2">
        AutoCenter Edition
      </p>
      <p className="mt-1 text-meta text-texto-3">by Sakura Corp</p>
    </div>
  );
}

/**
 * A marca no alto do menu (visual novo, #990, tarefa 3): a flor e, com o menu
 * aberto, o nome em letra de verdade. A flor é a logo B, a escolhida pela
 * Sofia (14/11); ela é a mesma nos dois temas, e o nome usa a cor do texto.
 */
export function MarcaDoMenu({ encolhido }: { encolhido: boolean }) {
  return (
    <div className="flex h-11 flex-none items-center gap-2.5 overflow-hidden pl-1">
      <img src={`${import.meta.env.BASE_URL}sakura-icon.svg`} alt="" className="h-9 w-9 flex-none" />
      <div className={encolhido ? "sr-only" : "min-w-0 whitespace-nowrap"}>
        <p className="font-titulo text-botao-grande font-extrabold leading-tight text-texto">Sakura System</p>
        <p className="font-titulo text-meta font-medium tracking-[0.05em] text-texto-2">AUTOCENTER EDITION</p>
      </div>
    </div>
  );
}

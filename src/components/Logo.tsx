import { useTema } from "@/lib/tema";

interface LogoProps {
  className?: string;
}

// A logo de dentro do programa troca junto com o tema (pedido da Sofia,
// 14/11): a do escuro tem a letra clara e sumiria no fundo branco.
const ARQUIVO = { escuro: "sakura-logo.svg", claro: "sakura-logo-claro.svg" } as const;

export function Logo({ className = "" }: LogoProps) {
  const tema = useTema();
  return (
    <img
      src={`${import.meta.env.BASE_URL}${ARQUIVO[tema]}`}
      alt="Sakura System — by Sakura Corp"
      className={`h-auto w-full max-w-56 ${
        tema === "escuro" ? "drop-shadow-[0_0_12px_rgba(255,122,77,0.3)]" : ""
      } ${className}`}
    />
  );
}

/**
 * A marca no alto do menu (visual novo, #990, tarefa 3): a flor e, com o menu
 * aberto, o nome em letra de verdade. A flor é a logo B, a escolhida pela
 * Sofia (14/11); ela é a mesma nos dois temas, e o nome usa a cor do texto.
 * O Login e as telas irmãs continuam com a `Logo` antiga até a tarefa 6.
 */
export function MarcaDoMenu({ encolhido }: { encolhido: boolean }) {
  return (
    <div className="flex h-11 flex-none items-center gap-2.5 overflow-hidden pl-1">
      <img src={`${import.meta.env.BASE_URL}sakura-flor.svg`} alt="" className="h-9 w-9 flex-none" />
      <div className={encolhido ? "sr-only" : "min-w-0 whitespace-nowrap"}>
        <p className="font-titulo text-botao-grande font-extrabold leading-tight text-texto">Sakura System</p>
        <p className="font-titulo text-meta font-medium tracking-[0.05em] text-texto-2">AUTOCENTER EDITION</p>
      </div>
    </div>
  );
}

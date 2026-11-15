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

import type { EstadoTarefa } from "../tipos";

export const ROTULOS: Record<EstadoTarefa, string> = {
  livre: "Livre",
  andamento: "Em andamento",
  revisao: "Em revisão",
  feita: "Feita",
};

export const PLURAL: Record<EstadoTarefa, string> = {
  livre: "Livres",
  andamento: "Em andamento",
  revisao: "Em revisão",
  feita: "Feitas",
};

const CORES: Record<EstadoTarefa, string> = {
  livre: "bg-livre-fundo text-livre",
  andamento: "bg-andamento-fundo text-andamento",
  revisao: "bg-revisao-fundo text-revisao",
  feita: "bg-feita-fundo text-feita",
};

export function Selo({ estado }: { estado: EstadoTarefa }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${CORES[estado]}`}>
      {ROTULOS[estado]}
    </span>
  );
}

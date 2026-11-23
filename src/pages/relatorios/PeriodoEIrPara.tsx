import { TriangleAlert } from "lucide-react";
import { Botao } from "@/components/Botao";
import { Chips } from "@/components/Chips";
import {
  ATALHOS_DO_PERIODO,
  atalhoDoPeriodo,
  type AtalhoDoPeriodo,
  type PeriodoRelacoes,
} from "@/schemas/relacoes";
import { FiltroDeDatas } from "./FiltroDeDatas";

const NOME_DO_ATALHO: Record<AtalhoDoPeriodo, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
  mes_passado: "Mês passado",
  ano: "Este ano",
};

/** Os atalhos, na ordem de sempre (do mais curto pro mais longo). */
const OPCOES = ATALHOS_DO_PERIODO.map((valor) => ({ valor, nome: NOME_DO_ATALHO[valor] }));

export interface DestinoDoIrPara {
  id: string;
  nome: string;
}

/** Rola até o bloco; com "reduzir movimento" ligado, sem animação. */
function rolarAte(id: string) {
  const alvo = document.getElementById(id);
  if (!alvo || typeof alvo.scrollIntoView !== "function") return;
  const reduzido =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  alvo.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
}

/**
 * O topo de Relações (#1086): o período único, que vale pra todos os blocos
 * (os atalhos e o De/Até), e os botões "Ir para", juntos. Os campos De e Até
 * mostram o que a pessoa digita; quem decide quando o período vale é a página.
 */
export function PeriodoEIrPara({
  periodo,
  hoje,
  de,
  ate,
  aoEscolherAtalho,
  aoMudarDe,
  aoMudarAte,
  destinos,
  aviso = null,
}: {
  /** Aviso ao lado das datas (ex.: De depois de Até). */
  aviso?: string | null;
  periodo: PeriodoRelacoes;
  hoje: string;
  de: string;
  ate: string;
  aoEscolherAtalho: (atalho: AtalhoDoPeriodo) => void;
  aoMudarDe: (valor: string) => void;
  aoMudarAte: (valor: string) => void;
  destinos: readonly DestinoDoIrPara[];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-rotulo font-medium text-texto-2">Período</span>
          <Chips
            rotulo="Período"
            opcoes={OPCOES}
            valor={atalhoDoPeriodo(periodo, hoje)}
            aoEscolher={aoEscolherAtalho}
          />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <FiltroDeDatas de={de} ate={ate} aoMudarDe={aoMudarDe} aoMudarAte={aoMudarAte} />
        </div>
        {aviso && (
          <p role="alert" className="flex min-w-0 items-center gap-1.5 self-center text-rotulo font-medium text-atencao">
            <TriangleAlert aria-hidden="true" className="size-[13px] shrink-0" strokeWidth={2.25} />
            {aviso}
          </p>
        )}
      </div>
      <nav aria-label="Ir para" className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-rotulo font-medium text-texto-2">Ir para</span>
        {destinos.map((d) => (
          <Botao key={d.id} variante="secundario" onClick={() => rolarAte(d.id)}>
            {d.nome}
          </Botao>
        ))}
      </nav>
    </div>
  );
}

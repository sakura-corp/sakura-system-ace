import { AlertTriangle, CircleAlert, CircleCheck, Minus } from "lucide-react";
import { formatarQuantidade } from "@/schemas/quantidade";
import { lerBarraDoEstoque, type TomDaBarra } from "./contaDaBarra";

/**
 * A barra do estoque contra o mínimo (#1093): o número, o mínimo, a palavra
 * e a barra. Vermelho abaixo, amarelo perto, verde ok, **sempre com o número
 * e a palavra** (a cor nunca avisa sozinha). O mínimo é o risquinho no meio.
 *
 *     7 / mín. 10          ⚠ falta 3
 *     ███████░░░░░░│░░░░░░░░░░░░░░░
 *
 * Largura fixa (`w-48`): numa lista, as barras de uma linha batem com as da
 * outra. A regra mora em `contaDaBarra.ts`.
 */
const COR_DO_TEXTO: Record<TomDaBarra, string> = {
  falta: "text-perigo",
  negativo: "text-perigo",
  perto: "text-atencao",
  sem_estoque: "text-atencao",
  ok: "text-ok",
  sem_minimo: "text-texto-2",
};

const COR_DA_BARRA: Record<TomDaBarra, string> = {
  falta: "bg-perigo",
  negativo: "bg-perigo",
  perto: "bg-atencao",
  sem_estoque: "bg-atencao",
  ok: "bg-ok",
  sem_minimo: "bg-texto-3",
};

const ICONE: Record<TomDaBarra, typeof CircleAlert> = {
  falta: CircleAlert,
  negativo: CircleAlert,
  perto: AlertTriangle,
  sem_estoque: AlertTriangle,
  ok: CircleCheck,
  sem_minimo: Minus,
};

export function BarraDoEstoque({
  saldo,
  estoqueMinimo,
  className = "w-48",
  semNumero = false,
}: {
  saldo: number;
  estoqueMinimo: number | null | undefined;
  className?: string;
  /** O número já está grande em cima (o perfil da peça): aqui só o mínimo e a palavra. */
  semNumero?: boolean;
}) {
  const barra = lerBarraDoEstoque(saldo, estoqueMinimo);
  const Icone = ICONE[barra.tom];
  // O número com o sinal de menos de verdade ("−2"), e não o hífen.
  const numero = saldo < 0 ? `−${formatarQuantidade(-saldo)}` : formatarQuantidade(saldo);

  return (
    <div data-barra-do-estoque={barra.tom} className={`min-w-0 ${className}`}>
      <div className="flex min-w-0 items-baseline justify-between gap-2 text-rotulo">
        <span className="whitespace-nowrap tabular-nums">
          {!semNumero && (
            <span className={`text-corpo font-semibold ${barra.tom === "negativo" ? "text-perigo" : "text-texto"}`}>
              {numero}
            </span>
          )}
          {estoqueMinimo != null && (
            <span className="text-texto-2">
              {semNumero ? "contra o mínimo de " : " / mín. "}
              {formatarQuantidade(estoqueMinimo)}
            </span>
          )}
        </span>
        <span className={`inline-flex min-w-0 items-center gap-1 truncate font-medium ${COR_DO_TEXTO[barra.tom]}`}>
          <Icone aria-hidden="true" className="size-3.5 shrink-0" />
          {barra.palavra}
        </span>
      </div>
      {barra.preenchido !== null && (
        <div aria-hidden="true" className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-linha-forte">
          <div
            className={`h-full rounded-full ${COR_DA_BARRA[barra.tom]}`}
            style={{ width: `${Math.round(barra.preenchido * 100)}%` }}
          />
          {/* O risquinho do mínimo, na metade. */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-texto-2" />
        </div>
      )}
    </div>
  );
}

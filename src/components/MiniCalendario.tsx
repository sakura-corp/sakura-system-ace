import { chaveData, diasDoCalendario } from "@/lib/calendario";

export interface EventoCalendario {
  data: string; // "YYYY-MM-DD"
  tipo: "feriado" | "aniversario" | "conta_a_vencer" | "conta_vencida";
  nome: string;
}

interface MiniCalendarioProps {
  ano: number;
  mes: number; // 0-11
  eventos: EventoCalendario[];
  /**
   * Quando informado, aparecem as setas ‹ › pra andar de mês (e um "Hoje" pra
   * voltar). A grade de 6 semanas resolveu o dia 31 — mostrar o comecinho do
   * mês que vem —, mas "o que vence mês que vem?" continuava sem resposta.
   */
  aoMudarMes?: (ano: number, mes: number) => void;
}

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CLASSE_SETA =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sakura-purple transition hover:bg-white/10";

export function MiniCalendario({ ano, mes, eventos, aoMudarMes }: MiniCalendarioProps) {
  const agora = new Date();
  const chaveDeHoje = chaveData(agora);
  const noMesDeHoje = ano === agora.getFullYear() && mes === agora.getMonth();

  const eventosPorData = new Map<string, EventoCalendario[]>();
  for (const evento of eventos) {
    const lista = eventosPorData.get(evento.data) ?? [];
    lista.push(evento);
    eventosPorData.set(evento.data, lista);
  }

  // `new Date(ano, mes ± 1, 1)` resolve a virada de ano sozinho — dezembro
  // mais um vira janeiro do ano seguinte, sem conta na mão.
  function irParaMes(passo: number) {
    const destino = new Date(ano, mes + passo, 1);
    aoMudarMes?.(destino.getFullYear(), destino.getMonth());
  }

  return (
    <div className="sakura-card p-4">
      <div className="mb-3 flex items-center justify-between gap-1">
        {aoMudarMes && (
          <button
            type="button"
            onClick={() => irParaMes(-1)}
            aria-label="Mês anterior"
            title="Mês anterior"
            className={CLASSE_SETA}
          >
            ‹
          </button>
        )}
        <p className="text-corpo font-semibold text-sakura-purple-dark">
          {NOMES_MES[mes]} de {ano}
        </p>
        {aoMudarMes && (
          <button
            type="button"
            onClick={() => irParaMes(1)}
            aria-label="Próximo mês"
            title="Próximo mês"
            className={CLASSE_SETA}
          >
            ›
          </button>
        )}
      </div>

      {aoMudarMes && !noMesDeHoje && (
        <button
          type="button"
          onClick={() => aoMudarMes(agora.getFullYear(), agora.getMonth())}
          className="mb-3 w-full rounded-lg bg-white/10 py-1 text-rotulo font-medium text-sakura-pink hover:bg-white/20"
        >
          Voltar para hoje
        </button>
      )}

      <div className="grid grid-cols-7 gap-1 text-center text-rotulo">
        {DIAS_SEMANA.map((dia, i) => (
          <div key={i} className="py-1 font-medium text-sakura-purple-dark/75">
            {dia}
          </div>
        ))}
        {diasDoCalendario(ano, mes).map((data) => {
          const chave = chaveData(data);
          const eventosDoDia = eventosPorData.get(chave) ?? [];
          const feriado = eventosDoDia.find((e) => e.tipo === "feriado");
          const aniversario = eventosDoDia.find((e) => e.tipo === "aniversario");
          const contaVencida = eventosDoDia.find((e) => e.tipo === "conta_vencida");
          const contaAVencer = eventosDoDia.find((e) => e.tipo === "conta_a_vencer");
          const ehHoje = chave === chaveDeHoje;
          // Dia de outro mês: fica visível, mas apagado, pra ler como "isso
          // não é deste mês" sem esconder um vencimento que está chegando.
          const deOutroMes = data.getMonth() !== mes;

          return (
            <div
              key={chave}
              title={eventosDoDia.map((e) => e.nome).join(", ") || undefined}
              className={`flex flex-col items-center gap-0.5 rounded-lg py-1 ${
                ehHoje
                  ? "bg-sakura-purple text-sobre-acao"
                  : deOutroMes
                    ? "text-sakura-purple-dark/35"
                    : "text-sakura-purple-dark"
              } ${feriado && !ehHoje ? "bg-sakura-pink-soft" : ""} ${
                deOutroMes && !ehHoje ? "opacity-80" : ""
              }`}
            >
              <span>{data.getDate()}</span>
              {(feriado || aniversario || contaVencida || contaAVencer) && (
                <span className="flex gap-0.5">
                  {feriado && (
                    <span className="h-1.5 w-1.5 rounded-full bg-sakura-purple" />
                  )}
                  {aniversario && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                  {contaAVencer && (
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                  )}
                  {contaVencida && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {eventos.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-sakura-gray/20 pt-3">
          {[...eventos]
            .sort((a, b) => a.data.localeCompare(b.data))
            .map((evento, i) => {
              const [, mesEvento, diaEvento] = evento.data.split("-");
              const deOutroMes = Number(mesEvento) - 1 !== mes;
              return (
                <p key={i} className="text-rotulo text-sakura-muted">
                  <span className="font-medium text-sakura-purple-dark">
                    {deOutroMes ? `${diaEvento}/${mesEvento}` : diaEvento}
                  </span>{" "}
                  — {evento.nome}
                </p>
              );
            })}
        </div>
      )}
    </div>
  );
}

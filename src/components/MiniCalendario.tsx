import { ChevronLeft, ChevronRight, Clock, Gift, Star, TriangleAlert, type LucideIcon } from "lucide-react";
import { AreaRolavel } from "@/components/AreaRolavel";
import { Botao } from "@/components/Botao";
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

/**
 * Cada tipo de evento: a cor do ponto no dia, e o ícone e a cor da linha da
 * lista de datas (regra 4: a cor nunca avisa sozinha, a lista traz ícone e
 * palavra). Azul é feriado, verde aniversário, amarelo conta a vencer e
 * vermelho conta vencida: laranja é só de ação (hoje).
 */
const APARENCIA_DO_EVENTO: Record<EventoCalendario["tipo"], { ponto: string; cor: string; icone: LucideIcon; nome: string }> = {
  feriado: { ponto: "bg-info", cor: "text-info", icone: Star, nome: "Feriado" },
  aniversario: { ponto: "bg-ok", cor: "text-ok", icone: Gift, nome: "Aniversário" },
  conta_a_vencer: { ponto: "bg-atencao", cor: "text-atencao", icone: Clock, nome: "Conta a vencer" },
  conta_vencida: { ponto: "bg-perigo", cor: "text-perigo", icone: TriangleAlert, nome: "Conta vencida" },
};

/** Quantas datas cabem à vista na lista; com mais, ela rola por dentro (nada cresce sem limite). */
const DATAS_A_VISTA = 3;
const ALTURA_DA_LISTA_PX = 148;

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

  const datas = [...eventos].sort((a, b) => a.data.localeCompare(b.data));
  const lista = (
    <ul className="space-y-1.5 pr-3">
      {datas.map((evento, i) => {
        const [, mesEvento, diaEvento] = evento.data.split("-");
        const deOutroMes = Number(mesEvento) - 1 !== mes;
        const aparencia = APARENCIA_DO_EVENTO[evento.tipo];
        const Icone = aparencia.icone;
        return (
          <li key={i} className="flex items-start gap-2 text-rotulo text-texto-2">
            <Icone aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${aparencia.cor}`} />
            <span className="w-11 shrink-0 font-semibold text-texto">
              {deOutroMes ? `${diaEvento}/${mesEvento}` : diaEvento}
            </span>
            <span className="min-w-0">
              <span className="sr-only">{aparencia.nome}: </span>
              {evento.nome}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="sakura-card p-4">
      <div className="mb-3 flex items-center justify-between gap-1">
        {aoMudarMes ? (
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            soIcone
            aria-label="Mês anterior"
            icone={<ChevronLeft aria-hidden="true" />}
            onClick={() => irParaMes(-1)}
          />
        ) : (
          <span />
        )}
        <p className="font-titulo text-subtitulo font-semibold text-texto">
          {NOMES_MES[mes]} de {ano}
        </p>
        {aoMudarMes ? (
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            soIcone
            aria-label="Próximo mês"
            icone={<ChevronRight aria-hidden="true" />}
            onClick={() => irParaMes(1)}
          />
        ) : (
          <span />
        )}
      </div>

      {aoMudarMes && !noMesDeHoje && (
        <Botao
          variante="secundario"
          tamanho="pequeno"
          className="mb-3 w-full justify-center"
          onClick={() => aoMudarMes(agora.getFullYear(), agora.getMonth())}
        >
          Voltar para hoje
        </Botao>
      )}

      <div className="grid grid-cols-7 gap-1 text-center text-rotulo">
        {DIAS_SEMANA.map((dia, i) => (
          <div key={i} className="py-1 text-meta font-semibold text-texto-2">
            {dia}
          </div>
        ))}
        {diasDoCalendario(ano, mes).map((data) => {
          const chave = chaveData(data);
          const eventosDoDia = eventosPorData.get(chave) ?? [];
          const tipos = (["feriado", "aniversario", "conta_a_vencer", "conta_vencida"] as const).filter(
            (t) => eventosDoDia.some((e) => e.tipo === t),
          );
          const ehHoje = chave === chaveDeHoje;
          // Dia de outro mês: fica visível, mas apagado, pra ler como "isso
          // não é deste mês" sem esconder um vencimento que está chegando.
          const deOutroMes = data.getMonth() !== mes;

          return (
            <div
              key={chave}
              data-dia={chave}
              data-hoje={ehHoje ? "" : undefined}
              title={eventosDoDia.map((e) => e.nome).join(", ") || undefined}
              className={`flex h-9 flex-col items-center justify-center gap-0.5 rounded-[10px] ${
                ehHoje
                  ? "bg-acao font-bold text-sobre-acao"
                  : deOutroMes
                    ? "text-texto-3"
                    : "text-texto"
              }`}
            >
              <span className="leading-none">{data.getDate()}</span>
              <span className="flex h-1.5 gap-0.5">
                {tipos.map((t) => (
                  <span
                    key={t}
                    className={`size-1.5 rounded-full ${ehHoje ? "bg-sobre-acao" : APARENCIA_DO_EVENTO[t].ponto}`}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      {datas.length > 0 && (
        <div className="mt-3 border-t border-linha pt-3">
          {datas.length > DATAS_A_VISTA ? (
            <div style={{ height: ALTURA_DA_LISTA_PX }}>
              <AreaRolavel>{lista}</AreaRolavel>
            </div>
          ) : (
            lista
          )}
        </div>
      )}
    </div>
  );
}

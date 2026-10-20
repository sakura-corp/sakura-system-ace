// O que a página Início mostra (#546): "precisa de você" (a mesma regra da Sala), a sua tarefa e o resumo da leva.
// Função pura: não lê relógio nem busca nada; o `agora` e o `login` vêm de fora.
import type { Bonequinho, EstadoTarefa, FaseDaLeva, RespostaDaLeva, RespostaDaSala, Tarefa } from "../tipos";
import { contarPorEstado, horas } from "./contador";
import { mesmoLogin } from "./pegar";
import { montarSala } from "./sala";

export type ResumoDaLeva = {
  numero: number;
  total: number;
  feitas: number;
  contagem: Record<EstadoTarefa, number>;
  horas: { feitas: number; todas: number };
  cortada: boolean;
  /** A fase da leva (#645); falta quando a consulta das levas falhou. */
  fase?: FaseDaLeva;
};

export type Inicio = {
  precisaDeVoce: Bonequinho[];
  suaTarefa: Tarefa[];
  resumoDaLeva: ResumoDaLeva | null;
};

export function montarInicio(sala: RespostaDaSala | null, leva: RespostaDaLeva | null, login: string, agora: Date): Inicio {
  // A mesma regra da Sala, com a fase da leva (#645): em Relatório, a Sofia vê o relatório aqui também.
  const precisaDeVoce = sala ? montarSala(sala.entradas, agora, login, leva ?? undefined).filter((b) => b.estado === "precisa") : [];
  if (!leva) return { precisaDeVoce, suaTarefa: [], resumoDaLeva: null };

  const minhas = leva.tarefas.filter((t) => mesmoLogin(t.dono?.login, login));
  const suaTarefa = [...minhas.filter((t) => t.estado === "andamento"), ...minhas.filter((t) => t.estado === "revisao")];
  const contagem = contarPorEstado(leva.tarefas);
  return {
    precisaDeVoce,
    suaTarefa,
    resumoDaLeva: {
      numero: leva.numero,
      total: leva.tarefas.length,
      feitas: contagem.feita,
      contagem,
      horas: horas(leva.tarefas),
      cortada: leva.cortada,
      ...(leva.fase ? { fase: leva.fase } : {}),
    },
  };
}

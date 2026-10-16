// Regras de tempo da Sala (#467) e do Escritório: tempo corrido a partir do "agora" recebido por
// parâmetro, nunca dia de calendário e nunca toISOString.
export const MINUTO = 60_000;
export const HORA = 60 * MINUTO;
export const DIA = 24 * HORA;

/** Trabalhando = atividade há menos de 2 h. */
export const TRABALHANDO_ATE_MS = 2 * HORA;
/** Dormindo = sem atividade há 3 dias ou mais. */
export const DORMINDO_A_PARTIR_MS = 3 * DIA;

export function decorrido(iso: string, agora: Date): number {
  return agora.getTime() - new Date(iso).getTime();
}

/** "agora há pouco", "há 5 min", "há 3 h", "há 2 dias": tempo corrido, nunca dia de calendário. */
export function haQuantoTempo(iso: string, agora: Date): string {
  const ms = Math.max(0, decorrido(iso, agora));
  if (ms < MINUTO) return "agora há pouco";
  if (ms < HORA) return `há ${Math.floor(ms / MINUTO)} min`;
  if (ms < DIA) return `há ${Math.floor(ms / HORA)} h`;
  const dias = Math.floor(ms / DIA);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

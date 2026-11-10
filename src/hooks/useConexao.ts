import { useSyncExternalStore } from "react";
import { buscarVersaoDoBanco } from "@/lib/schemaVersao";
import { aoMudarARede } from "@/lib/supabase";

// #374: "estou sem conexão com o banco?". Um estado ÚNICO por programa, pra que a
// faixa do topo e os avisos perto dos botões mostrem a mesma coisa e exista só
// UMA verificação periódica, não uma por componente.
//
// É aviso, nunca tranca (docs/licoes.md, item 33): quem usa isto só mostra
// texto. E queda de rede não vira aviso de outra coisa.
//
// Sinais de queda: evento `offline`, `navigator.onLine === false` ao começar e
// um pedido ao Supabase que desistiu por rede ("falhou").
// Sinais de volta: qualquer resposta do servidor ("respondeu") ou a conferência
// com o banco devolvendo a versão. O evento `online` NÃO limpa sozinho (só diz
// que a placa de rede voltou, não que a internet chega): ele só dispara uma
// conferência na hora.

export const INTERVALO_CONFERIR_CONEXAO_MS = 30_000;

let semConexao = false;
let conferindo = false;
let temporizador: ReturnType<typeof setInterval> | null = null;
let desligarRede: (() => void) | null = null;
let inscritos = 0;
const ouvintes = new Set<() => void>();

function mudar(novo: boolean) {
  if (novo === semConexao) return;
  semConexao = novo;
  if (novo) ligarConferencia();
  else pararConferencia();
  for (const ouvinte of [...ouvintes]) ouvinte();
}

// Nunca duas conferências ao mesmo tempo.
async function conferir() {
  if (conferindo) return;
  conferindo = true;
  try {
    const versao = await buscarVersaoDoBanco();
    // null = não deu pra perguntar: a faixa continua.
    if (versao !== null) mudar(false);
  } catch {
    // Falha ao perguntar não é resposta: continua como estava.
  } finally {
    conferindo = false;
  }
}

function ligarConferencia() {
  if (temporizador !== null || inscritos === 0) return;
  temporizador = setInterval(() => void conferir(), INTERVALO_CONFERIR_CONEXAO_MS);
}

function pararConferencia() {
  if (temporizador === null) return;
  clearInterval(temporizador);
  temporizador = null;
}

const aoFicarOffline = () => mudar(true);
const aoVoltarAPlaca = () => void conferir();

function ligarOuvintes() {
  window.addEventListener("offline", aoFicarOffline);
  window.addEventListener("online", aoVoltarAPlaca);
  desligarRede = aoMudarARede((estado) => mudar(estado === "falhou"));
  if (typeof navigator !== "undefined" && navigator.onLine === false) mudar(true);
}

function desligarOuvintes() {
  window.removeEventListener("offline", aoFicarOffline);
  window.removeEventListener("online", aoVoltarAPlaca);
  desligarRede?.();
  desligarRede = null;
  pararConferencia();
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  inscritos += 1;
  if (inscritos === 1) ligarOuvintes();
  return () => {
    ouvintes.delete(ouvinte);
    inscritos -= 1;
    if (inscritos === 0) desligarOuvintes();
  };
}

// Só para teste: zera o estado do módulo entre um caso e outro.
export function reiniciarConexaoParaTeste() {
  desligarOuvintes();
  ouvintes.clear();
  inscritos = 0;
  semConexao = false;
  conferindo = false;
}

export function useConexao(): { semConexao: boolean } {
  const atual = useSyncExternalStore(
    inscrever,
    () => semConexao,
    () => false,
  );
  return { semConexao: atual };
}

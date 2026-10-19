// As regras de "Pegar tarefa" e "Largar" (#538). Funções puras, nunca lançam erro: o worker decide
// de verdade (usa estas mesmas regras) e a página só usa pra desligar o botão e dizer o porquê.
import type { Tarefa } from "../tipos";
import { numeroValido } from "./comecarComClaude";
import type { ResultadoDaAcao } from "./dados";

/** Logins do GitHub não diferenciam maiúscula. Vazio ou ausente nunca é igual. */
export function mesmoLogin(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a === "" || b === "") return false;
  return a.toLowerCase() === b.toLowerCase();
}

/** null = pode pegar; senão, o motivo em português, curto, pra aparecer no cartão. */
export function motivoPraNaoPegar(tarefa: Tarefa | undefined, tarefasDaLeva: Tarefa[], login: string | undefined): string | null {
  if (!login) return "entre no painel pra pegar uma tarefa";
  if (!tarefa) return "esta tarefa não está numa leva aberta";
  const n = tarefa.numero;
  if (tarefa.estado === "feita") return `a #${n} já está feita`;
  const dono = tarefa.dono?.login;
  if (dono) {
    if (mesmoLogin(dono, login)) return `a #${n} já é sua`;
    return `alguém pegou antes: a #${n} é de ${dono}`;
  }
  if (tarefa.estado !== "livre") return `a #${n} já tem um PR aberto`;
  if (tarefa.incompleta && tarefa.incompleta.length > 0) return `a #${n} está incompleta: falta coisa no cabeçalho`;
  const esperando = (tarefa.dependeDeAbertas ?? []).filter(numeroValido);
  if (esperando.length > 0) return `espera a ${esperando.map((d) => `#${d}`).join(", ")}`;
  // Só "andamento" conta: com o PR aberto (revisão) a pessoa já pode pegar outra.
  const outra = (tarefasDaLeva ?? []).find((t) => t.numero !== n && t.estado === "andamento" && mesmoLogin(t.dono?.login, login));
  if (outra) return `você já está com a #${outra.numero}`;
  return null;
}

/** null = pode largar; senão, o motivo. */
export function motivoPraNaoLargar(tarefa: Tarefa | undefined, login: string | undefined): string | null {
  if (!login) return "entre no painel pra largar uma tarefa";
  if (!tarefa) return "não achei esta tarefa";
  const n = tarefa.numero;
  if (!mesmoLogin(tarefa.dono?.login, login)) return `só quem pegou a #${n} pode largar`;
  switch (tarefa.estado) {
    case "revisao":
      return `a #${n} já tem um PR aberto: não dá pra largar`;
    case "feita":
      return `a #${n} já está feita`;
    case "livre":
      return `a #${n} não está com ninguém`;
    default:
      return null;
  }
}

/**
 * Depois da resposta do worker: o aviso que fica à vista no cartão e se busca a leva de novo.
 * Recusa também recarrega (Sofia, 17/10): o cartão não fica velho até o próximo aviso do tempo real,
 * e o aviso continua à vista mesmo que o cartão mude de grupo. Erro de conexão não recarrega (falharia igual).
 */
export function depoisDaAcao(numero: number, r: ResultadoDaAcao): { aviso: string; recarregar: boolean } {
  switch (r.tipo) {
    case "ok":
      return { aviso: "", recarregar: true };
    case "recusado":
      return { aviso: new RegExp(`#${numero}(?!\\d)`).test(r.motivo) ? r.motivo : `#${numero}: ${r.motivo}`, recarregar: true };
    case "erro":
      return { aviso: r.mensagem, recarregar: false };
    default:
      return { aviso: "Sua sessão acabou. Entre de novo.", recarregar: true };
  }
}

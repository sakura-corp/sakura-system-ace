import { Check } from "lucide-react";

/**
 * A trilha 1-2-3 (#1132, parte 1/5 da #1085): o fechar o caixa e o fechar a
 * OS mostram em que passo a pessoa está, o que já fez e o que falta.
 *
 * - Cada passo tem nome (sem nome, a trilha é só bolinha).
 * - Os feitos têm ✓ e, pro leitor de tela, a palavra "feito"; o atual é
 *   anunciado (`aria-current="step"`) e tem o número em negrito no laranja;
 *   os de depois ficam com o número apagado. Cor nunca sozinha (regra 4 do
 *   visual novo): o ✓, o negrito e a palavra dizem o mesmo que a cor.
 * - Com `aoVoltar`, um passo feito vira botão pra voltar nele. O atual e os de
 *   depois nunca são botão: pular passo é o que a trilha existe pra evitar.
 * - `atual` além do último = todos feitos (o fim da tarefa).
 *
 * A trilha só mostra; quem guarda o passo e decide quando avançar é a tela.
 */
export interface Passo {
  /** Curto, com verbo ou assunto: "Contar a gaveta", "Receber", "Garantia". */
  nome: string;
}

const BOLINHA_BASE =
  "relative z-10 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-rotulo font-bold tabular-nums transition-colors duration-(--duration-botao) ease-suave motion-reduce:transition-none";

const BOLINHA = {
  feito: "bg-ok/15 text-ok ring-1 ring-ok/40",
  atual: "bg-acao text-sobre-acao",
  depois: "bg-cartao text-texto-2 ring-1 ring-linha-forte",
} as const;

// O atual em azul ("em andamento", regra 4 do visual novo): pra tela em que o
// laranja já é o botão do próximo passo (o fechar a OS, #1088), e a trilha não
// pode virar um segundo laranja.
const BOLINHA_ATUAL_EM_ANDAMENTO = "bg-info/15 text-info ring-2 ring-info/60";

const NOME = {
  feito: "text-texto",
  atual: "font-semibold text-texto",
  depois: "text-texto-2",
} as const;

export function Passos({
  rotulo,
  passos,
  atual,
  aoVoltar,
  tomDoAtual = "acao",
}: {
  /** O que a trilha é, pro leitor de tela: "Fechar o caixa". */
  rotulo: string;
  passos: ReadonlyArray<Passo>;
  /** Em que passo está (do 0). */
  atual: number;
  /** Com isto, os passos feitos viram botão pra voltar neles. */
  aoVoltar?: (indice: number) => void;
  /** "acao" (o padrão): o atual no laranja. "andamento": no azul, quando o laranja da tela é outro botão. */
  tomDoAtual?: "acao" | "andamento";
}) {
  return (
    <ol aria-label={rotulo} className="flex w-full min-w-0 items-start">
      {passos.map((passo, indice) => {
        const estado = indice < atual ? "feito" : indice === atual ? "atual" : "depois";
        const ultimo = indice === passos.length - 1;

        const conteudo = (
          <>
            <span
              className={`${BOLINHA_BASE} ${
                estado === "atual" && tomDoAtual === "andamento" ? BOLINHA_ATUAL_EM_ANDAMENTO : BOLINHA[estado]
              }`}
            >
              {estado === "feito" ? (
                <Check data-passo-feito aria-hidden="true" strokeWidth={3} className="size-4" />
              ) : (
                <span aria-hidden="true">{indice + 1}</span>
              )}
            </span>
            <span className={`mt-2 block max-w-full px-1 text-center text-rotulo break-words ${NOME[estado]}`}>
              <span className="sr-only">Passo {indice + 1}: </span>
              {passo.nome}
              {estado === "feito" && (
                <span className="sr-only">{aoVoltar ? " (feito; voltar pra este passo)" : " (feito)"}</span>
              )}
            </span>
          </>
        );

        return (
          <li
            key={`${indice}-${passo.nome}`}
            aria-current={estado === "atual" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center"
          >
            {/* O fio até o próximo passo, de borda a borda das bolinhas (a
                bolinha feita é meio transparente: o fio não pode passar por
                dentro dela). 24 px = meia bolinha (16) + 8 de folga. Fica verde
                quando este passo já foi feito. */}
            {!ultimo && (
              <span
                aria-hidden="true"
                className={`absolute left-[calc(50%+24px)] top-4 h-0.5 w-[calc(100%-48px)] -translate-y-1/2 rounded-full ${
                  estado === "feito" ? "bg-ok/50" : "bg-linha-forte"
                }`}
              />
            )}
            {estado === "feito" && aoVoltar ? (
              <button
                type="button"
                onClick={() => aoVoltar(indice)}
                className="flex min-h-10 min-w-0 max-w-full flex-col items-center rounded-xl px-1 hover:bg-passar"
              >
                {conteudo}
              </button>
            ) : (
              <div className="flex min-w-0 max-w-full flex-col items-center px-1">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

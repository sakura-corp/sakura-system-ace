import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Botao } from "./Botao";
import { Modal } from "./Modal";

/**
 * A janela que troca o `confirm()` do navegador (#1132; decisão da #1079,
 * item 1). O `confirm()` não diz o NOME do que vai ser apagado, tem a cara do
 * Windows e não do programa, e o Enter dele confirma. Esta diz "Excluir o
 * produto Pneu 175/70 R13?", o botão de apagar é vermelho e o foco começa no
 * "Cancelar": um Enter no automático nunca apaga nada.
 *
 * Esc e clicar fora cancelam (é o `Modal`, sem mexer nele). O jeito fácil de
 * usar é o `useConfirmar()`, logo abaixo: `if (!(await confirmar({...})))
 * return;` fica no lugar exato do `if (!confirm(...)) return;` de hoje.
 */
export interface PerguntaDeConfirmar {
  /** O começo da pergunta, sem o item e sem "?": "Excluir o produto". */
  pergunta: string;
  /** O nome do que vai ser mexido: "Pneu 175/70 R13". Vai no título, em destaque. */
  item: string;
  /** O que acontece depois, numa frase. Sem dizer: "Depois, não dá pra desfazer." */
  consequencia?: ReactNode;
  /** O verbo do botão (nunca "OK"). Sem dizer: "Excluir". */
  textoDoBotao?: string;
  /**
   * Sem dizer, o botão é o vermelho de apagar. `false` quando a confirmação
   * não apaga nada ("Fechar o caixa de hoje?"): aí ele é o laranja de sempre.
   */
  perigo?: boolean;
}

interface JanelaDeConfirmarProps extends PerguntaDeConfirmar {
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

export function JanelaDeConfirmar({
  pergunta,
  item,
  consequencia = "Depois, não dá pra desfazer.",
  textoDoBotao = "Excluir",
  perigo = true,
  aoConfirmar,
  aoCancelar,
}: JanelaDeConfirmarProps) {
  // O `Botao` não repassa `ref`: o "Cancelar" é achado pelo id.
  const cancelarId = useId();
  const consequenciaId = useId();

  // Responde uma vez só: o clique duplo no botão (ou um Esc logo depois) não
  // chama a tela de novo enquanto a janela some.
  const respondeuRef = useRef(false);
  function responderUmaVez(acao: () => void) {
    if (respondeuRef.current) return;
    respondeuRef.current = true;
    acao();
  }
  const cancelar = () => responderUmaVez(aoCancelar);
  const confirmar = () => responderUmaVez(aoConfirmar);
  const cancelarAgoraRef = useRef(cancelar);
  cancelarAgoraRef.current = cancelar;

  useEffect(() => {
    const dialogo = document
      .getElementById(cancelarId)
      ?.closest<HTMLElement>('[role="dialog"]');

    // O Modal foca o ✕ ao abrir. O efeito do filho (o Modal) roda antes do
    // efeito do pai (esta janela), então aqui o foco passa pro "Cancelar" logo
    // depois, e o Modal continua lembrando quem abriu, pra devolver o foco.
    document.getElementById(cancelarId)?.focus();

    // O `descricao` do Modal só aceita texto; a consequência pode ser mais
    // que isso. Ligada assim, o leitor de tela lê a frase junto do título.
    dialogo?.setAttribute("aria-describedby", consequenciaId);

    // Esta janela costuma abrir EM CIMA de outra (o faturar da OS). Cada
    // Modal escuta o teclado no `document`, e o de trás, que começou a
    // escutar antes, pegaria o Esc primeiro e fecharia o faturar inteiro. Por
    // isso esta janela escuta antes de todas (no `window`, na captura) e
    // cuida sozinha do Esc e do Tab, sem deixar a tecla chegar nas de trás.
    function aoTeclar(evento: KeyboardEvent) {
      if (!dialogo) return;
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        cancelarAgoraRef.current();
        return;
      }
      if (evento.key !== "Tab") return;
      evento.preventDefault();
      evento.stopPropagation();
      // Só botões aqui dentro: o ✕, o "Cancelar" e o do verbo. Dá a volta.
      const botoes = Array.from(dialogo.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (botoes.length === 0) return;
      const agora = botoes.indexOf(document.activeElement as HTMLElement);
      const passo = evento.shiftKey ? -1 : 1;
      const proximo = agora === -1 ? 0 : (agora + passo + botoes.length) % botoes.length;
      botoes[proximo].focus();
    }
    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [cancelarId, consequenciaId]);

  return (
    <Modal
      titulo={`${pergunta} ${item}?`}
      onFechar={cancelar}
      rodape={
        <>
          <Botao id={cancelarId} variante="secundario" tamanho="grande" onClick={cancelar}>
            Cancelar
          </Botao>
          <Botao variante={perigo ? "perigo" : "principal"} tamanho="grande" onClick={confirmar}>
            {textoDoBotao}
          </Botao>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {perigo && (
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-perigo" />
        )}
        <div className="min-w-0 text-corpo text-texto-2">
          <p className="break-words font-semibold text-texto">{item}</p>
          <p id={consequenciaId} className="mt-1">{consequencia}</p>
        </div>
      </div>
    </Modal>
  );
}

/**
 * A janela como promessa. A tela põe `{janela}` em algum lugar do que
 * desenha e troca o `confirm()` por:
 *
 *     const { confirmar, janela } = useConfirmar();
 *     if (!(await confirmar({ pergunta: "Excluir o cliente", item: cliente.nome }))) return;
 *
 * Responde uma vez só: o segundo clique no "Excluir" (clique duplo) não
 * apaga duas vezes. Se outra confirmação for pedida com uma aberta, a de antes
 * responde "não".
 */
// O componente e o gancho moram juntos de propósito: a tarefa (#1132) entrega
// os dois neste arquivo, e um não serve sem o outro.
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirmar() {
  const [aberta, setAberta] = useState<PerguntaDeConfirmar | null>(null);
  const responderRef = useRef<((sim: boolean) => void) | null>(null);

  const responder = useCallback((sim: boolean) => {
    const resolver = responderRef.current;
    if (!resolver) return;
    responderRef.current = null;
    setAberta(null);
    resolver(sim);
  }, []);

  const confirmar = useCallback((pergunta: PerguntaDeConfirmar) => {
    responderRef.current?.(false);
    return new Promise<boolean>((resolver) => {
      responderRef.current = resolver;
      setAberta(pergunta);
    });
  }, []);

  // A tela saiu com a janela aberta: quem esperava ouve "não" e segue.
  useEffect(() => () => responderRef.current?.(false), []);

  const janela = aberta ? (
    <JanelaDeConfirmar
      {...aberta}
      aoConfirmar={() => responder(true)}
      aoCancelar={() => responder(false)}
    />
  ) : null;

  return { confirmar, janela };
}

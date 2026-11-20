import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Botao } from "./Botao";
import { Modal } from "./Modal";

/**
 * A janela que troca o `confirm()` do navegador (#1132, parte 1/5 da #1085;
 * #1079, item 1). O `confirm()` mostra um quadro cinza do Windows, sem o nome
 * do que vai sumir e com o "OK" já focado: um Enter no automático apaga.
 *
 * Esta janela:
 * - diz o NOME do item na pergunta ("Excluir o produto Pneu 175/70 R13?");
 * - começa com o foco no "Cancelar": Enter sem pensar não apaga nada;
 * - Esc, clicar fora e o ✕ cancelam (é o `Modal` de sempre por baixo);
 * - o botão de apagar é o vermelho (`perigo`) e diz o verbo ("Excluir
 *   produto", nunca "OK"). Pra confirmar o que não é apagar (fechar o caixa),
 *   `tom: "normal"` troca pelo laranja.
 *
 * Pra trocar um `confirm()` numa tela, o jeito fácil é o `useConfirmar()`
 * logo abaixo: `if (!(await confirmar({...}))) return;`.
 */
export interface PedidoDeConfirmar {
  /** O começo da pergunta, sem o nome e sem "?": "Excluir o produto". */
  acao: string;
  /** O nome do que vai ser mexido: "Pneu 175/70 R13". Entra no fim da pergunta. */
  item?: string;
  /** O que acontece depois (uma ou duas frases curtas). */
  explicacao?: ReactNode;
  /** O texto do botão que confirma, com verbo: "Excluir produto", "Fechar caixa". */
  botao: string;
  /** "perigo" (o padrão): botão vermelho. "normal": o laranja, pro que não apaga nada. */
  tom?: "perigo" | "normal";
}

/** A pergunta inteira, que vira o título da janela. */
function perguntaDoPedido({ acao, item }: PedidoDeConfirmar): string {
  return item ? `${acao} ${item}?` : `${acao}?`;
}

export function JanelaDeConfirmar({
  pedido,
  aoConfirmar,
  aoCancelar,
}: {
  pedido: PedidoDeConfirmar;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  // Pelo id, e não por ref: o `Botao` não repassa ref.
  const cancelarId = useId();

  // O Modal põe o foco no ✕ ao abrir (de propósito, ver lá). O efeito do filho
  // (o Modal) roda antes do efeito do pai (esta janela): então aqui, depois
  // dele, o foco passa pro "Cancelar", que é o combinado da tarefa.
  useEffect(() => {
    document.getElementById(cancelarId)?.focus();
  }, [cancelarId]);

  // Responde uma vez só: o segundo clique do clique duplo (ou um Esc logo
  // depois do "Excluir") não chega em quem chamou. A janela costuma sumir no
  // próximo desenho, mas até lá o botão ainda está na tela.
  const respondidoRef = useRef(false);
  function responderUmaVez(resposta: () => void) {
    if (respondidoRef.current) return;
    respondidoRef.current = true;
    resposta();
  }
  const cancelar = () => responderUmaVez(aoCancelar);
  const confirmar = () => responderUmaVez(aoConfirmar);

  // O Esc é desta pergunta, mesmo aberta por cima de outra janela (o faturar):
  // cada janela escuta as teclas na página inteira, e a de trás, que começou a
  // escutar antes, fecharia primeiro, jogando fora o que foi preenchido nela.
  // Aqui o Esc é pego antes de todos (fase de captura) e marcado como usado; a
  // janela de trás já ignora Esc marcado (ver Modal.tsx).
  const cancelarRef = useRef(cancelar);
  cancelarRef.current = cancelar;
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape" || evento.defaultPrevented) return;
      evento.preventDefault();
      cancelarRef.current();
    }
    document.addEventListener("keydown", aoTeclar, true);
    return () => document.removeEventListener("keydown", aoTeclar, true);
  }, []);

  return (
    <Modal
      titulo={perguntaDoPedido(pedido)}
      onFechar={cancelar}
      rodape={
        <>
          <Botao id={cancelarId} variante="fantasma" onClick={cancelar}>
            Cancelar
          </Botao>
          <Botao variante={pedido.tom === "normal" ? "principal" : "perigo"} onClick={confirmar}>
            {pedido.botao}
          </Botao>
        </>
      }
    >
      {pedido.explicacao ? (
        <div className="text-corpo text-texto-2">{pedido.explicacao}</div>
      ) : (
        <p className="text-corpo text-texto-2">
          {pedido.tom === "normal" ? "Confira antes de seguir." : "Isso não tem volta."}
        </p>
      )}
    </Modal>
  );
}

/**
 * O `confirm()` de volta, mas com a janela do programa:
 *
 * ```tsx
 * const { confirmar, janela } = useConfirmar();
 * async function excluir(peca) {
 *   if (!(await confirmar({ acao: "Excluir o produto", item: peca.nome, botao: "Excluir produto" }))) return;
 *   ...
 * }
 * return <>...{janela}</>;
 * ```
 *
 * Responde uma vez só por pedido: clicar 2 vezes no botão não apaga 2 vezes.
 * Pedido novo com outro aberto responde "não" ao de antes. A tela que sai com a
 * janela aberta também responde "não", pra ninguém ficar esperando pra sempre.
 */
export function useConfirmar(): {
  confirmar: (pedido: PedidoDeConfirmar) => Promise<boolean>;
  janela: ReactNode;
} {
  const [pedido, setPedido] = useState<PedidoDeConfirmar | null>(null);
  // Uma janela nova a cada pergunta (a `key`): a de antes não empresta o
  // "já respondi" pra próxima.
  const [numero, setNumero] = useState(0);
  const responderRef = useRef<((resposta: boolean) => void) | null>(null);

  const responder = useCallback((resposta: boolean) => {
    const responderAgora = responderRef.current;
    responderRef.current = null;
    // Some sempre, mesmo sem ninguém esperando (no modo de desenvolvimento, o
    // recarregar sozinho já respondeu "não" e a janela ficaria presa na tela).
    setPedido(null);
    // Já respondido (o segundo clique do clique duplo): não responde de novo.
    responderAgora?.(resposta);
  }, []);

  const confirmar = useCallback((novo: PedidoDeConfirmar) => {
    responderRef.current?.(false);
    return new Promise<boolean>((resolver) => {
      responderRef.current = resolver;
      setNumero((n) => n + 1);
      setPedido(novo);
    });
  }, []);

  useEffect(
    () => () => {
      responderRef.current?.(false);
      responderRef.current = null;
    },
    [],
  );

  const janela = pedido ? (
    <JanelaDeConfirmar
      key={numero}
      pedido={pedido}
      aoConfirmar={() => responder(true)}
      aoCancelar={() => responder(false)}
    />
  ) : null;

  return { confirmar, janela };
}

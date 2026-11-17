import { useEffect } from "react";

const SELETOR_CAMPOS =
  "input:not([type=hidden]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled)";

function ehCampoIgnorado(alvo: HTMLElement): boolean {
  if (alvo.tagName === "TEXTAREA") return true; // Enter deve quebrar linha normalmente
  if (alvo.tagName === "BUTTON") return true; // Enter já ativa o botão focado
  if (alvo instanceof HTMLInputElement) {
    return ["checkbox", "radio", "submit", "button", "file"].includes(alvo.type);
  }
  return false;
}

/**
 * Faz o Enter avançar pro próximo campo do formulário em vez de tentar
 * enviar o formulário — pensado pra quem trabalha só de teclado (comum em
 * balcão de loja) e não quer precisar do mouse pra preencher um cadastro.
 * Aplicado uma única vez, globalmente: funciona em qualquer <form> do app
 * sem precisar mexer em cada tela.
 */
export function useEnterParaProximoCampo() {
  useEffect(() => {
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key !== "Enter") return;

      const alvo = evento.target as HTMLElement;
      if (ehCampoIgnorado(alvo)) return;

      const formulario = alvo.closest("form");
      if (!formulario) return;

      const campos = Array.from(
        formulario.querySelectorAll<HTMLElement>(SELETOR_CAMPOS),
      ).filter((campo) => campo.offsetParent !== null);

      const indiceAtual = campos.indexOf(alvo);
      if (indiceAtual === -1) return;

      evento.preventDefault();

      const proximoCampo = campos[indiceAtual + 1];
      if (proximoCampo) {
        proximoCampo.focus();
        if (proximoCampo instanceof HTMLInputElement || proximoCampo instanceof HTMLTextAreaElement) {
          proximoCampo.select();
        }
        return;
      }

      // Último campo do formulário: leva o foco pro botão de enviar, em vez
      // de já submeter — mais uma tecla Enter confirma, evitando envio sem
      // querer, mas sem exigir o mouse em nenhum momento.
      // `elements`, e não `querySelector`: o botão de enviar pode morar FORA
      // do <form>, ligado a ele pelo atributo `form` (o "Confirmar
      // faturamento" fica no rodapé da janela, tarefa 7 do visual novo).
      Array.from(formulario.elements)
        .find(
          (campo): campo is HTMLButtonElement =>
            campo instanceof HTMLButtonElement && campo.type === "submit",
        )
        ?.focus();
    }

    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, []);
}

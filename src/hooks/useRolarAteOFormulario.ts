import { useEffect, useRef } from "react";

const SELETOR_PRIMEIRO_CAMPO =
  "input:not([type=hidden]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled)";

/**
 * Quando o formulário de cadastro abre (canetinha de editar ou "+ Novo"), rola
 * a tela até ele e põe o cursor no primeiro campo (#969).
 *
 * Nas listas (Estoque, Clientes, Serviços, Fornecedores) o formulário aparece
 * em cima da lista. Com a lista rolada pra baixo, ele abria fora da vista e a
 * tela não subia: parecia que o clique não tinha feito nada, e quem está no
 * balcão clicava de novo.
 *
 * `chave` diz qual formulário está aberto: `null`/`undefined`/`false` = fechado;
 * qualquer outro valor (o id do item, ou "novo") = aberto. Trocar a chave com
 * o formulário já aberto (o "Abrir a que já existe" do Estoque) rola de novo.
 * O ref devolvido vai numa caixa em volta do formulário.
 *
 * O `scrollIntoView` acha sozinho a área que rola de verdade (no app é a
 * `AreaRolavel`, não a janela). Aqui ele é seguro: estas telas não têm barra
 * fixa no rodapé (o problema do comentário em `OrdemServicoForm.tsx`), e o
 * alvo é o TOPO do formulário. O foco vem depois, com `preventScroll`, pra não
 * rolar uma segunda vez até o campo.
 */
export function useRolarAteOFormulario<T extends HTMLElement = HTMLDivElement>(chave: unknown) {
  const caixaRef = useRef<T>(null);

  useEffect(() => {
    if (chave === null || chave === undefined || chave === false) return;
    const caixa = caixaRef.current;
    if (!caixa) return;
    caixa.scrollIntoView?.({ block: "start" });
    caixa.querySelector<HTMLElement>(SELETOR_PRIMEIRO_CAMPO)?.focus({ preventScroll: true });
  }, [chave]);

  return caixaRef;
}

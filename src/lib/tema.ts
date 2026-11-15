import { useSyncExternalStore } from "react";

/**
 * O tema do programa: escuro (o padrão) ou claro (visual novo, #990).
 *
 * A escolha é **deste computador** (fica no `localStorage`, não no banco): o
 * PC do balcão, de frente pra rua, pode ficar no claro, e o do escritório no
 * escuro. Quem troca é a seção "Aparência" das Configurações.
 *
 * O tema é só um atributo no `<html>` (`data-tema`); os valores das cores de
 * cada um estão no `src/styles/globals.css`. Nenhuma tela pergunta qual é o
 * tema pra escolher cor: quem precisa saber é só o que troca de ARQUIVO (a
 * logo).
 */
export type Tema = "escuro" | "claro";

export const TEMAS: readonly Tema[] = ["escuro", "claro"];
export const TEMA_ROTULO: Record<Tema, string> = { escuro: "Escuro", claro: "Claro" };

const CHAVE = "sakura.tema";
const ouvintes = new Set<() => void>();

export function lerTema(): Tema {
  try {
    return window.localStorage.getItem(CHAVE) === "claro" ? "claro" : "escuro";
  } catch {
    return "escuro";
  }
}

function aplicar(tema: Tema) {
  document.documentElement.dataset.tema = tema;
}

/** Chamado uma vez, antes de desenhar a primeira tela (src/main.tsx). */
export function aplicarTemaGuardado() {
  aplicar(lerTema());
}

export function definirTema(tema: Tema) {
  try {
    window.localStorage.setItem(CHAVE, tema);
  } catch {
    // Computador que não deixa guardar: o tema troca assim mesmo, só não é
    // lembrado na próxima vez que o programa abrir.
  }
  aplicar(tema);
  for (const ouvinte of ouvintes) ouvinte();
}

export function ouvirTema(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function temaNaTela(): Tema {
  return document.documentElement.dataset.tema === "claro" ? "claro" : "escuro";
}

/** O tema que está na tela agora; redesenha quem usa quando ele troca. */
export function useTema(): Tema {
  return useSyncExternalStore(ouvirTema, temaNaTela, () => "escuro" as const);
}

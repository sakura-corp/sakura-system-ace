/**
 * A trava de `<form>` dentro de `<form>` (#1130).
 *
 * Por que existe: na loja, uma nota travou porque o "Cadastrar agora" da aba
 * Fechamento abria o formulário da peça DENTRO do formulário da OS. Um
 * `<form>` dentro de outro é HTML inválido: o "Salvar peça" enviava o
 * formulário de fora junto, e nada visível acontecia. O `Modal` deste projeto
 * não usa portal (ver o comentário de `inertizarFundo` em `Modal.tsx`), então
 * uma janela com formulário desenhada no meio do JSX de outro `<form>` cai
 * nesse buraco sem ninguém perceber.
 *
 * Como trava: todo teste de TELA que usa `@/testes/tela` liga isto sozinho
 * (os 4 da tela de OS que não usam chamam `vigiarFormDentroDeForm()` no
 * topo; os outros testes jsdom que não usam nenhum dos dois ficam de fora).
 * Se, em qualquer momento do teste, aparecer um `<form>` dentro de outro na
 * tela montada, o teste reprova no fim, dizendo onde. Quem pega de verdade é
 * a olhada no HTML (`form form`) a cada mudança da tela, que vê também a
 * janela que abre e fecha no meio do teste. O aviso do React no console é só
 * um reforço: ele sai uma vez por arquivo, e some num teste que troca o
 * `console.error` por um espião.
 *
 * **Ela só vê a janela que o teste abre.** Janela nova com formulário ganha
 * um teste que clica pra abrir (ver `janelasComFormulario.test.tsx`).
 *
 * O conserto, quando reprovar: desenhar a janela FORA do `<form>` (como a aba
 * Fechamento em `OrdemServicoForm.tsx`) — nunca tirar esta trava.
 */
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

const AVISO_DO_REACT = /<form> cannot (?:be a descendant of|appear as a descendant of) <form>/;

/**
 * Monta a frase do console como ela aparece: o React manda o aviso com `%s`
 * no lugar das palavras ("In HTML, %s cannot be a descendant of <%s>.", "<form>", "form").
 */
function frase(args: unknown[]): string {
  const [primeiro, ...resto] = args;
  if (typeof primeiro !== "string") return args.map(String).join(" ");
  const sobra = [...resto];
  const montada = primeiro.replace(/%[sdoOif]/g, () => (sobra.length ? String(sobra.shift()) : ""));
  return [montada, ...sobra.map(String)].join(" ");
}

/** Descreve um `<form>` pra mensagem: o nome acessível, senão o começo do texto. */
function descrever(form: Element): string {
  const nome = form.getAttribute("aria-label") || form.getAttribute("name") || form.id;
  if (nome) return `<form "${nome}">`;
  const texto = (form.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  return `<form> com o texto "${texto}"`;
}

/** Procura `<form>` dentro de `<form>` no documento. Devolve uma linha por caso. */
export function acharFormDentroDeForm(raiz: ParentNode = document): string[] {
  return Array.from(raiz.querySelectorAll("form form")).map((dentro) => {
    const fora = dentro.parentElement?.closest("form");
    return `${descrever(dentro)} está dentro de ${fora ? descrever(fora) : "outro <form>"}`;
  });
}

/**
 * A vigia, sem os ganchos do vitest: `comecar()` liga, `terminar()` desliga e
 * lança o erro se achou algo. Separada pra o próprio teste da trava conseguir
 * ver ela reprovar.
 */
export function criarVigia() {
  let achados: string[] = [];
  let observador: MutationObserver | undefined;
  let errorOriginal: typeof console.error | undefined;

  function anotar(linhas: string[]) {
    for (const linha of linhas) if (!achados.includes(linha)) achados.push(linha);
  }

  return {
    comecar() {
      achados = [];
      observador = new MutationObserver(() => anotar(acharFormDentroDeForm()));
      observador.observe(document.body, { childList: true, subtree: true });

      const anterior = console.error;
      errorOriginal = anterior;
      console.error = (...args: unknown[]) => {
        if (AVISO_DO_REACT.test(frase(args))) {
          anotar(["aviso do React: <form> dentro de <form>"]);
        }
        anterior(...args);
      };
    },

    terminar() {
      // A última olhada, com a tela ainda montada.
      anotar(acharFormDentroDeForm());
      observador?.disconnect();
      observador = undefined;
      if (errorOriginal) console.error = errorOriginal;
      errorOriginal = undefined;

      if (achados.length === 0) return;
      const lista = achados.map((linha) => `  - ${linha}`).join("\n");
      achados = [];
      throw new Error(
        "Um <form> foi desenhado dentro de outro <form> (HTML inválido: o botão de " +
          "salvar de dentro envia o de fora junto, #1130).\n" +
          `${lista}\n` +
          "Conserto: desenhe a janela FORA do <form> de fora (ver a aba Fechamento em " +
          "OrdemServicoForm.tsx). Não desligue esta trava.",
      );
    },
  };
}

/**
 * Liga a trava pro arquivo de teste inteiro (chamada uma vez, no topo do
 * módulo, DEPOIS do `afterEach(cleanup)`: o vitest roda os `afterEach` do
 * último pro primeiro, então a trava olha a tela ainda montada). No ambiente
 * node não existe `document`, e ela não faz nada.
 */
export function vigiarFormDentroDeForm() {
  const vigia = criarVigia();
  beforeEach(() => {
    if (typeof document !== "undefined") vigia.comecar();
  });
  afterEach(() => {
    if (typeof document === "undefined") return;
    try {
      vigia.terminar();
    } catch (erro) {
      // Quando um afterEach reprova, o vitest pula os outros, e o cleanup da
      // tela não rodaria: a tela deste teste vazaria pros seguintes do mesmo
      // arquivo, e todos reprovariam juntos. Limpa aqui, e só este reprova.
      cleanup();
      throw erro;
    }
  });
}

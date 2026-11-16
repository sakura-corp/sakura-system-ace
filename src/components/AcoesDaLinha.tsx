import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dica } from "./Dica";

/**
 * Ação de uma linha de lista.
 *
 * - "editar", "inativar", "reativar" e "icone" viram botão de ícone na própria
 *   linha (alvo de 32x32, WCAG 2.2 · 2.5.8).
 * - "menu" vai pro menu de três pontinhos. É onde mora o que não dá pra
 *   desfazer: excluir cadastro de cliente fica a dois gestos de distância, não
 *   a um clique torto do botão de editar.
 */
export type AcaoDaLinha =
  | { tipo: "editar"; aoClicar: () => void; desabilitada?: boolean }
  | { tipo: "inativar" | "reativar"; aoClicar: () => void; desabilitada?: boolean }
  | {
      tipo: "icone";
      rotulo: string;
      icone: ReactNode;
      aoClicar: () => void;
      desabilitada?: boolean;
    }
  /**
   * Ação de linha escrita por extenso, pra quando virar ícone seria
   * adivinhação ("Marcar como paga"). Continua com 32px de altura.
   */
  | { tipo: "texto"; rotulo: string; aoClicar: () => void; desabilitada?: boolean }
  | {
      tipo: "menu";
      rotulo: string;
      aoClicar: () => void;
      perigosa?: boolean;
      desabilitada?: boolean;
      /** Um ícone (da `lucide-react`) na frente do nome. Enfeite: o leitor de tela pula. */
      icone?: ReactNode;
    };

interface AcoesDaLinhaProps {
  /**
   * Como o registro é chamado, pra montar o rótulo de leitor de tela e o
   * balãozinho do mouse ("Editar o cliente Maria"). Numa tabela, "Editar"
   * sozinho repetido 40 vezes não diz em qual linha se está.
   */
  descricao: string;
  acoes: AcaoDaLinha[];
}

const CLASSE_BOTAO_ICONE =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sakura-purple transition hover:bg-texto/10 disabled:cursor-not-allowed disabled:opacity-40";

// O botão de três pontos do visual novo (tarefa 7, #990): cinza secundário,
// que acende ao passar o mouse e fica marcado enquanto o menu está aberto.
const CLASSE_BOTAO_MAIS =
  "inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-texto-2 transition-colors hover:bg-passar hover:text-texto aria-expanded:bg-passar aria-expanded:text-texto";

const CLASSE_BOTAO_TEXTO =
  "inline-flex h-8 items-center justify-center rounded-lg px-3 text-rotulo font-medium text-sakura-purple transition hover:bg-texto/10 disabled:cursor-not-allowed disabled:opacity-40";

function IconeLapis() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconeOlhoFechado() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.3 3.2M6.2 6.7C3.9 8.2 3 10.3 3 12c0 2.5 4 7 9 7a9.6 9.6 0 0 0 4-.9" />
    </svg>
  );
}

function IconeOlho() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function IconeTresPontinhos() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function rotuloEIcone(acao: AcaoDaLinha, descricao: string) {
  switch (acao.tipo) {
    case "editar":
      return { rotulo: `Editar ${descricao}`, icone: <IconeLapis /> };
    case "inativar":
      return { rotulo: `Inativar ${descricao}`, icone: <IconeOlhoFechado /> };
    case "reativar":
      return { rotulo: `Reativar ${descricao}`, icone: <IconeOlho /> };
    default:
      return { rotulo: `${acao.rotulo} — ${descricao}`, icone: null };
  }
}

/**
 * Menu de três pontinhos.
 *
 * Dois cuidados que este projeto já pagou pra aprender:
 *
 * 1. O painel é renderizado num portal pro <body>, com posição calculada na
 *    hora. Toda lista do app fica dentro de "overflow-hidden sakura-card" —
 *    um menu posicionado ali dentro nasceria cortado. E nem "position: fixed"
 *    resolveria: o sakura-card tem backdrop-filter, que vira bloco de
 *    contenção pra elemento fixo.
 * 2. A escolha do item acontece no onMouseDown, não só no onClick (seção 6,
 *    item 16 do PROJETO_STATUS): dentro do Electron o blur fecha a lista antes
 *    do clique acontecer, o item some do HTML no meio do caminho e o clique
 *    nunca dispara. O onClick fica só pro teclado (Enter/Espaço não geram
 *    mousedown) — disparo duplo não acontece porque escolher() fecha o menu e
 *    ignora chamada repetida.
 */
function ehPerigosa(acao: AcaoDaLinha) {
  return acao.tipo === "menu" && acao.perigosa === true;
}

function MenuDeAcoes({ acoes, descricao }: { acoes: AcaoDaLinha[]; descricao: string }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, right: 0 });
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const abertoRef = useRef(false);

  function abrir() {
    const retangulo = botaoRef.current?.getBoundingClientRect();
    if (!retangulo) return;
    setPosicao({
      top: retangulo.bottom + 6,
      right: Math.max(8, window.innerWidth - retangulo.right),
    });
    abertoRef.current = true;
    setAberto(true);
  }

  function fechar(devolverFoco = true) {
    abertoRef.current = false;
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  }

  function escolher(acao: AcaoDaLinha) {
    if (!abertoRef.current) return; // já disparou nesta interação
    fechar(false);
    acao.aoClicar();
  }

  useEffect(() => {
    if (!aberto) return;

    painelRef.current?.querySelector<HTMLElement>("[role='menuitem']:not(:disabled)")?.focus();

    function aoApontarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (painelRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return;
      fechar(false);
    }
    // O teclado do menu (o padrão "menu" da WAI-ARIA): as setas andam pelos
    // itens e dão a volta, Home e End vão pras pontas, Esc fecha e devolve o
    // foco pro botão, e o Tab fecha (o foco segue pro próximo da tela).
    function itensDoMenu() {
      return Array.from(
        painelRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)") ?? [],
      );
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        // A janela (Modal) também ouve o Esc, e ignora o que já veio
        // "usado" (defaultPrevented): este é do menu, não dela. Por isso o
        // menu ouve na captura, antes de qualquer outro.
        evento.preventDefault();
        fechar();
        return;
      }
      if (evento.key === "Tab") {
        // O painel mora no fim do <body> (portal): o Tab de lá sairia da
        // página. O foco volta pro botão ANTES do Tab acontecer, e o Tab
        // segue dali pro próximo da tela, como se o menu nem tivesse aberto.
        fechar();
        return;
      }
      const itens = itensDoMenu();
      if (itens.length === 0) return;
      const atual = itens.indexOf(document.activeElement as HTMLButtonElement);
      let proximo: number | null = null;
      if (evento.key === "ArrowDown") proximo = atual < 0 ? 0 : (atual + 1) % itens.length;
      else if (evento.key === "ArrowUp")
        proximo = atual < 0 ? itens.length - 1 : (atual - 1 + itens.length) % itens.length;
      else if (evento.key === "Home") proximo = 0;
      else if (evento.key === "End") proximo = itens.length - 1;
      if (proximo === null) return;
      evento.preventDefault();
      itens[proximo].focus();
    }
    // Rolar ou redimensionar deixaria o painel "solto" longe do botão, já que
    // a posição é calculada uma vez na abertura. Fechar é mais honesto que
    // mostrar um menu no lugar errado.
    function aoMexerNaTela() {
      fechar(false);
    }

    document.addEventListener("mousedown", aoApontarFora);
    document.addEventListener("keydown", aoTeclar, true);
    window.addEventListener("resize", aoMexerNaTela);
    window.addEventListener("scroll", aoMexerNaTela, true);
    return () => {
      document.removeEventListener("mousedown", aoApontarFora);
      document.removeEventListener("keydown", aoTeclar, true);
      window.removeEventListener("resize", aoMexerNaTela);
      window.removeEventListener("scroll", aoMexerNaTela, true);
    };
  }, [aberto]);

  // O que não dá pra desfazer vai pro fim da lista, sempre — previsibilidade
  // vale mais que a ordem em que a tela declarou as ações.
  //
  // O "=== true" não é enfeite: `acao.perigosa` é opcional, e a primeira
  // versão fazia Number(tipo === "menu" && acao.perigosa). Quando `perigosa`
  // vem `undefined`, esse "&&" devolve `undefined` e Number(undefined) é NaN
  // — não 0. Comparador que devolve NaN não ordena nada, e o "Excluir" ficava
  // em primeiro no menu, colado no lugar onde o dedo cai. Pego pelo teste de
  // tela, não pela leitura do código.
  const ordenadas = [...acoes].sort(
    (a, b) => Number(ehPerigosa(a)) - Number(ehPerigosa(b)),
  );

  return (
    <>
      <Dica texto="Mais ações">
        <button
          ref={botaoRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={aberto}
          aria-label={`Mais ações — ${descricao}`}
          onClick={() => (aberto ? fechar(false) : abrir())}
          className={CLASSE_BOTAO_MAIS}
        >
          <IconeTresPontinhos />
        </button>
      </Dica>

      {aberto &&
        createPortal(
          // `sakura-menu-acoes` é o gancho da animação de abrir (tarefa 5, o
          // movimento); sem a classe definida, o menu só aparece.
          <div
            ref={painelRef}
            role="menu"
            aria-label={`Ações — ${descricao}`}
            style={{ top: posicao.top, right: posicao.right }}
            className="sakura-menu-acoes fixed z-[60] min-w-48 rounded-[14px] border border-linha-forte bg-janela p-1.5 shadow-[0_18px_40px_var(--sombra-forte)]"
          >
            {ordenadas.map((acao) => {
              if (acao.tipo !== "menu") return null;
              return (
                <button
                  key={acao.rotulo}
                  type="button"
                  role="menuitem"
                  disabled={acao.desabilitada}
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    escolher(acao);
                  }}
                  onClick={() => escolher(acao)}
                  className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-corpo transition-colors focus-visible:bg-passar disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 ${
                    acao.perigosa
                      ? "text-perigo hover:bg-perigo/[0.12]"
                      : "text-texto hover:bg-passar [&_svg]:text-texto-2"
                  }`}
                >
                  {acao.icone && (
                    <span aria-hidden="true" className="inline-flex">
                      {acao.icone}
                    </span>
                  )}
                  {acao.rotulo}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Ações de uma linha de lista, num padrão único pro app inteiro: botão de
 * ícone de 32x32 pro que é do dia a dia, menu de três pontinhos pro que não
 * dá pra desfazer. Ordem sempre igual — editar primeiro, destrutivo por
 * último —, porque previsibilidade vale mais que economia de espaço.
 */
export function AcoesDaLinha({ descricao, acoes }: AcoesDaLinhaProps) {
  const naLinha = acoes.filter((acao) => acao.tipo !== "menu");
  const noMenu = acoes.filter((acao) => acao.tipo === "menu");

  return (
    <div className="flex items-center justify-end gap-2">
      {naLinha.map((acao) => {
        const { rotulo, icone } = rotuloEIcone(acao, descricao);
        const ehTexto = acao.tipo === "texto";
        return (
          <button
            key={acao.tipo === "icone" || ehTexto ? acao.rotulo : acao.tipo}
            type="button"
            onClick={acao.aoClicar}
            disabled={acao.desabilitada}
            aria-label={rotulo}
            title={rotulo}
            className={ehTexto ? CLASSE_BOTAO_TEXTO : CLASSE_BOTAO_ICONE}
          >
            {ehTexto ? acao.rotulo : acao.tipo === "icone" ? acao.icone : icone}
          </button>
        );
      })}
      {noMenu.length > 0 && <MenuDeAcoes acoes={noMenu} descricao={descricao} />}
    </div>
  );
}

import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
}

// O que conta como "dá pra focar" pra prender o Tab aqui dentro. Campo
// desabilitado e tabindex="-1" ficam de fora de propósito: o primeiro não
// recebe foco, e o segundo só existe pra foco por código.
const SELETOR_FOCAVEL = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function focaveisDentro(raiz: HTMLElement): HTMLElement[] {
  // getClientRects() vazio = elemento existe no HTML mas não aparece na tela
  // (seção recolhida, display:none). Focar nele deixaria o Tab "sumindo".
  return Array.from(raiz.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
    (elemento) => elemento.getClientRects().length > 0,
  );
}

/**
 * Marca como `inert` tudo que está FORA do modal — o resto da tela para de
 * receber clique, Tab e leitor de tela enquanto o modal estiver aberto.
 *
 * Por que subindo a árvore em vez do jeito comum (`inert` na raiz do app):
 * este Modal é renderizado dentro da própria página, não num portal pro
 * `document.body`. Marcar a raiz inteira marcaria o próprio modal junto. E
 * mudar pra portal seria pior: os campos de dentro do modal sairiam de dentro
 * do `<form>` da página no HTML, o que mexeria no envio do formulário e no
 * hook global que faz o Enter avançar de campo (ele procura o `<form>` pelo
 * `closest`). Então o caminho é: pra cada ancestral do modal, marcar os
 * irmãos que não estão no caminho até ele.
 *
 * Devolve a função que desfaz — e ela só desfaz o que ESTA chamada marcou,
 * pra um modal aberto em cima de outro não destravar o fundo do primeiro ao
 * fechar.
 */
function inertizarFundo(elementoDoModal: HTMLElement): () => void {
  const marcados: HTMLElement[] = [];
  let atual: HTMLElement | null = elementoDoModal;

  while (atual && atual.parentElement) {
    const pai: HTMLElement = atual.parentElement;
    for (const irmao of Array.from(pai.children)) {
      if (irmao === atual || !(irmao instanceof HTMLElement)) continue;
      if (irmao.hasAttribute("inert")) continue;
      irmao.setAttribute("inert", "");
      marcados.push(irmao);
    }
    atual = pai;
  }

  return () => {
    for (const elemento of marcados) elemento.removeAttribute("inert");
  };
}

export function Modal({ titulo, onFechar, children }: ModalProps) {
  const tituloId = useId();
  const sobreposicaoRef = useRef<HTMLDivElement>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);

  // onFechar costuma ser uma função nova a cada render (arrow inline no JSX).
  // Guardar numa ref deixa o efeito abaixo rodar UMA vez, na abertura — se ele
  // dependesse de onFechar, o modal refocaria o ✕ a cada tecla digitada.
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  useEffect(() => {
    const dialogo = dialogoRef.current;
    const sobreposicao = sobreposicaoRef.current;
    if (!dialogo || !sobreposicao) return;

    const elementoQueAbriu = document.activeElement as HTMLElement | null;

    // O primeiro focável é sempre o ✕ do cabeçalho (vem antes do conteúdo no
    // HTML). Isso é de propósito: num modal de confirmação — cancelar nota,
    // desfazer pagamento — um Enter no automático fecha, nunca confirma algo
    // que não dá pra desfazer.
    const primeiro = focaveisDentro(dialogo)[0];
    (primeiro ?? dialogo).focus();

    const desfazerInert = inertizarFundo(sobreposicao);

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onFecharRef.current();
        return;
      }

      if (evento.key !== "Tab" || !dialogo) return;

      const focaveis = focaveisDentro(dialogo);
      if (focaveis.length === 0) {
        evento.preventDefault();
        dialogo.focus();
        return;
      }

      const primeiroFocavel = focaveis[0];
      const ultimoFocavel = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;

      // Em vez de deixar o Tab escapar pra tela de trás, dá a volta: do último
      // vai pro primeiro e vice-versa. O "!dialogo.contains(ativo)" cobre o
      // caso de o foco ter escapado por outro caminho (clique no fundo).
      if (evento.shiftKey && (ativo === primeiroFocavel || !dialogo.contains(ativo))) {
        evento.preventDefault();
        ultimoFocavel.focus();
      } else if (!evento.shiftKey && (ativo === ultimoFocavel || !dialogo.contains(ativo))) {
        evento.preventDefault();
        primeiroFocavel.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      desfazerInert();
      // Devolve o foco pro botão que abriu o modal, pra quem usa só teclado
      // continuar de onde parou em vez de voltar pro começo da página.
      if (elementoQueAbriu && document.contains(elementoQueAbriu)) {
        elementoQueAbriu.focus();
      }
    };
  }, []);

  return (
    <div
      ref={sobreposicaoRef}
      className="sakura-modal-fundo"
      onClick={onFechar}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="sakura-modal max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={tituloId} className="text-subtitulo font-semibold text-sakura-purple-dark">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-full p-1.5 text-sakura-purple-dark/85 hover:bg-sakura-gray/10 hover:text-sakura-purple-dark"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

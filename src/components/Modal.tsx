import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

// Classes escritas por extenso: o Tailwind só gera a classe que acha inteira
// no código, nunca uma montada por texto (`max-w-${largura}`).
const CLASSE_DA_LARGURA = {
  lg: "max-w-lg",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const;

interface ModalProps {
  titulo: string;
  /** Linha de explicação embaixo do título (lida pelo leitor de tela junto). */
  descricao?: string;
  /** Sem dizer, "lg": o tamanho de sempre. As janelas com tabela usam as maiores. */
  largura?: keyof typeof CLASSE_DA_LARGURA;
  /**
   * Um valor em destaque no cabeçalho, à direita do título: o total da OS na
   * janela de faturar, por exemplo. O `valor` vem pronto de quem chama
   * (formatado; conta de dinheiro nunca é feita aqui).
   */
  total?: { rotulo: string; valor: ReactNode };
  /**
   * As ações da janela, embaixo à direita, **o botão principal por último**.
   * Ficam fora da parte que rola: numa janela comprida, "Confirmar" está
   * sempre à vista. Sem isto, a janela não tem rodapé (as que já existiam
   * trazem os botões dentro do conteúdo, e continuam funcionando).
   */
  rodape?: ReactNode;
  /** Um texto à esquerda das ações: a conta final, um aviso curto. */
  notaDoRodape?: ReactNode;
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
      // A região dos avisos que somem (AvisoQueSome.tsx): não pega clique nem
      // foco, e precisa continuar FALANDO com a janela aberta, porque o aviso
      // "OS faturada" sai no mesmo clique que fecha a janela.
      if (irmao.hasAttribute("data-fora-do-inert")) continue;
      irmao.setAttribute("inert", "");
      marcados.push(irmao);
    }
    atual = pai;
  }

  return () => {
    for (const elemento of marcados) elemento.removeAttribute("inert");
  };
}

/**
 * A janela do programa. Aparência do visual novo (#990, seção 6 das regras):
 * painel opaco, canto de 22 px, o título (e o total, se houver) em cima, o
 * conteúdo rolando no meio e as ações embaixo à direita.
 */
export function Modal({
  titulo,
  descricao,
  largura = "lg",
  total,
  rodape,
  notaDoRodape,
  onFechar,
  children,
}: ModalProps) {
  const tituloId = useId();
  const descricaoId = useId();
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
        // Um campo de dentro já usou esse Esc (o Combobox fecha a própria
        // lista): fechar a janela junto jogaria fora o que foi preenchido.
        if (evento.defaultPrevented) return;
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
        aria-describedby={descricao ? descricaoId : undefined}
        tabIndex={-1}
        className={`sakura-modal flex max-h-[85vh] w-full ${CLASSE_DA_LARGURA[largura]} flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-topo className="flex shrink-0 items-start gap-4 border-b border-linha px-[22px] pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-subtitulo font-bold text-texto">
              {titulo}
            </h2>
            {descricao && (
              <p id={descricaoId} className="mt-0.5 text-corpo text-texto-2">
                {descricao}
              </p>
            )}
          </div>
          {total && (
            <div className="shrink-0 text-right">
              <p className="text-meta text-texto-2">{total.rotulo}</p>
              <p className="font-titulo text-destaque font-bold tracking-[-0.02em] text-texto tabular-nums">
                {total.valor}
              </p>
            </div>
          )}
          {/* Depois do título e do total no HTML, mas antes do conteúdo: é o
              primeiro lugar onde o foco para ao abrir (ver o efeito acima). */}
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="-mr-1.5 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-texto-2 transition-colors hover:bg-passar hover:text-texto"
          >
            <X aria-hidden="true" className="size-[18px]" />
          </button>
        </div>
        {/* Só o corpo rola: o cabeçalho e o rodapé ficam parados. A barra é a
            nativa, discreta (a do globals.css), de propósito: ver o comentário
            de lá. */}
        <div data-modal-corpo className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[18px]">
          {children}
        </div>
        {rodape && (
          <div
            data-modal-rodape
            className="flex shrink-0 flex-wrap items-center gap-3 border-t border-linha px-[22px] pb-5 pt-4"
          >
            {notaDoRodape && <div className="min-w-0 text-corpo text-texto-2">{notaDoRodape}</div>}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{rodape}</div>
          </div>
        )}
      </div>
    </div>
  );
}

import { Search, SearchX } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Aviso } from "../Aviso";
import { Botao } from "../Botao";

/**
 * O molde de lista do visual da leva 8 (#1085, parte 4/5 #1135): o jeito
 * único de mostrar uma lista no programa (Clientes, Estoque, Contas,
 * Garantias, Notas). Cada tela troca pro molde na sua tarefa.
 *
 *     [ 🔍 Buscar cliente…            ]  [Todos] [Matão] [Araraquara]
 *     ┌──────────────────────────────────────────────────────────┐
 *     │ Maria Souza                              [Receber]  [⋯]  │
 *     │ (16) 99999-0000 · Araraquara                             │
 *     ├──────────────────────────────────────────────────────────┤
 *     │ …                                                        │
 *     │                   Ver todos (42)                         │
 *     └──────────────────────────────────────────────────────────┘
 *
 * O molde só MOSTRA: quem busca e filtra é a tela (ela sabe se a busca vai
 * no banco ou na lista que já tem). As linhas são `LinhaDeLista`.
 *
 * Os três estados que toda lista tem já vêm prontos (Doherty, "erro
 * evitado"):
 * - **carregando**: na primeira carga, o lugar das linhas fica reservado
 *   desde o primeiro instante (a tela não pula quando os dados chegam), e o
 *   esqueleto só aparece depois de 0,4 s: resposta rápida não pisca nada.
 *   Recarregando uma lista que JÁ tem linhas (a busca no banco, a cada
 *   letra), as linhas ficam onde estão, só marcadas como "ocupada".
 * - **vazio**: frase + botão pra começar. E o vazio de uma BUSCA (ou filtro)
 *   que não achou nada é outro: diz o que buscou e oferece limpar. "Nenhum
 *   cliente cadastrado" com 300 clientes no banco assusta.
 * - **erro**: o que aconteceu (a frase vem da tela, pelo `mensagemDeErro()`)
 *   e o que fazer: "Tentar de novo".
 *
 * "Ver todos": passando do `limite`, a lista mostra só o começo e o botão no
 * fim, com a conta. Sem `aoVerTodos`, abre ali mesmo (e volta a cortar quando
 * a busca ou o filtro mudam); com, a tela decide (abrir em outro lugar).
 *
 * Teclado: botão que some depois do clique ("Limpar a busca", "Ver todos",
 * "Tentar de novo") devolve o foco pra um lugar que faz sentido (o campo de
 * busca, a lista), e não pro começo da tela.
 */
export type EstadoDaLista = "carregando" | "erro" | "pronto";

/**
 * Filtro ligado exige quem o desligue: sem `aoLimparFiltros`, o "Limpar" da
 * lista vazia diria "Limpar os filtros" e não limparia nada.
 */
type FiltrosDaLista =
  | { filtroAtivo?: false; aoLimparFiltros?: () => void }
  | {
      /** Algum filtro está ligado (a lista vazia diz "nada encontrado", e não "comece cadastrando"). */
      filtroAtivo: boolean;
      /** Desliga os filtros (a busca o molde apaga sozinho). */
      aoLimparFiltros: () => void;
    };

export type PropsDoMoldeLista<T> = FiltrosDaLista & {
  /** O nome da lista pro leitor de tela ("Clientes"). */
  rotulo: string;
  estado: EstadoDaLista;
  itens: ReadonlyArray<T>;
  /** O `id` do item (a chave do React). */
  chave: (item: T) => string;
  /** Desenha uma linha: devolve um `<LinhaDeLista>`. */
  linha: (item: T) => ReactNode;

  /** A busca em cima. Lista longa tem busca. */
  busca?: {
    valor: string;
    aoMudar: (valor: string) => void;
    /** O nome do campo pro leitor de tela ("Buscar cliente"). */
    rotulo: string;
    /** O exemplo dentro do campo ("Nome, telefone ou CPF"). */
    dica?: string;
  };
  /** Os filtros ao lado da busca: um `<Chips>`. */
  filtros?: ReactNode;

  /** A lista vazia de verdade: frase + botão pra começar. */
  vazio: {
    frase: string;
    acao?: { rotulo: string; aoClicar: () => void };
  };
  /** O erro ao carregar. */
  erro?: {
    /** O que aconteceu, em português (o `mensagemDeErro()` do Supabase). */
    mensagem: string;
    tentarDeNovo?: () => void;
  };

  /** Quantas linhas mostrar antes do "Ver todos". Sem limite, mostra tudo. */
  limite?: number;
  /** Com ele, o "Ver todos" chama a tela em vez de abrir ali. */
  aoVerTodos?: () => void;
  /** Quantas linhas o esqueleto reserva (o normal é 5). */
  linhasNoEsqueleto?: number;
};

/** Depois de quanto tempo o esqueleto aparece (Doherty: até 0,4 s parece na hora). */
export const ESPERA_DO_ESQUELETO_MS = 400;

function useDepoisDe(ms: number, ligado: boolean): boolean {
  const [passou, setPassou] = useState(false);
  useEffect(() => {
    if (!ligado) {
      setPassou(false);
      return;
    }
    const relogio = window.setTimeout(() => setPassou(true), ms);
    return () => window.clearTimeout(relogio);
  }, [ms, ligado]);
  return passou;
}

/** Uma linha falsa do tamanho da `LinhaDeLista`: o nome e o detalhe em barras. */
function LinhaDoEsqueleto({ indice, visivel }: { indice: number; visivel: boolean }) {
  // Larguras diferentes por linha: barras todas iguais parecem uma grade, não uma lista.
  const largura = ["w-2/5", "w-1/3", "w-1/2", "w-1/4"][indice % 4];
  return (
    <li aria-hidden="true" className="flex min-h-16 items-center gap-4 border-b border-linha px-4 py-2 last:border-b-0">
      {visivel && (
        <div data-esqueleto="" className="min-w-0 flex-1 animate-pulse motion-reduce:animate-none">
          <div className={`h-4 rounded-md bg-linha-forte ${largura}`} />
          <div className="mt-2 h-3 w-1/5 rounded-md bg-linha-forte" />
        </div>
      )}
    </li>
  );
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

export function MoldeLista<T>(props: PropsDoMoldeLista<T>) {
  const {
    rotulo,
    estado,
    itens,
    chave,
    linha,
    busca,
    filtros,
    vazio,
    erro,
    limite,
    aoVerTodos,
    linhasNoEsqueleto = 5,
  } = props;
  const filtroAtivo = props.filtroAtivo === true;

  const campoRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const cartaoRef = useRef<HTMLDivElement>(null);
  // Pra onde o foco vai depois que o botão clicado some da tela.
  const [focarDepois, setFocarDepois] = useState<"lista" | "cartao" | null>(null);

  const termo = busca?.valor.trim() ?? "";
  // O "Ver todos" vale pra busca e filtro em que foi aberto: mudou um dos
  // dois, a lista volta a mostrar só o começo.
  const consultaAtual = `${termo}|${filtroAtivo}`;
  const [abertaEm, setAbertaEm] = useState<string | null>(null);
  const abriuTodos = abertaEm === consultaAtual;

  const primeiraCarga = estado === "carregando" && itens.length === 0;
  const esqueletoVisivel = useDepoisDe(ESPERA_DO_ESQUELETO_MS, primeiraCarga);

  const buscando = termo !== "" || filtroAtivo;
  const cortada = limite !== undefined && !abriuTodos && itens.length > limite;
  const visiveis = cortada ? itens.slice(0, limite) : itens;

  // Roda depois do desenho em que o botão clicado já sumiu e a lista (ou o
  // cartão) já está no lugar.
  useEffect(() => {
    if (focarDepois === null) return;
    (focarDepois === "lista" ? listaRef.current : cartaoRef.current)?.focus();
    setFocarDepois(null);
  }, [focarDepois]);

  function limpar() {
    busca?.aoMudar("");
    if (filtroAtivo) props.aoLimparFiltros?.();
    if (campoRef.current) campoRef.current.focus();
    else setFocarDepois("cartao");
  }

  function verTodos() {
    if (aoVerTodos) {
      aoVerTodos();
      return;
    }
    setAbertaEm(consultaAtual);
    setFocarDepois("lista");
  }

  function tentarDeNovo() {
    erro?.tentarDeNovo?.();
    setFocarDepois("cartao");
  }

  // O que o leitor de tela ouve, num lugar só que existe sempre (região que
  // já nasce preenchida não é lida por alguns leitores).
  let anuncio = "";
  if (estado === "carregando") anuncio = `Carregando ${rotulo.toLowerCase()}…`;
  else if (estado === "pronto" && buscando) {
    anuncio = itens.length === 0 ? "Nada encontrado." : `${plural(itens.length, "encontrado", "encontrados")}.`;
  }

  let corpo: ReactNode;
  if (primeiraCarga) {
    corpo = (
      <ul aria-label={rotulo} aria-busy="true">
        {Array.from({ length: linhasNoEsqueleto }, (_, i) => (
          <LinhaDoEsqueleto key={i} indice={i} visivel={esqueletoVisivel} />
        ))}
      </ul>
    );
  } else if (estado === "erro") {
    corpo = (
      <div className="p-4">
        <Aviso tipo="perigo" role="alert">
          <p>{erro?.mensagem ?? "Não deu pra carregar a lista."}</p>
          {erro?.tentarDeNovo ? (
            <Botao variante="secundario" className="mt-3" onClick={tentarDeNovo}>
              Tentar de novo
            </Botao>
          ) : (
            <p className="mt-1">Saia desta tela e entre de novo. Se continuar, chame o suporte.</p>
          )}
        </Aviso>
      </div>
    );
  } else if (itens.length === 0 && buscando) {
    const limpaFiltro = filtroAtivo;
    corpo = (
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
        <SearchX aria-hidden="true" className="size-6 text-texto-3" />
        <p className="text-corpo text-texto-2">
          {termo ? (
            <>
              Nada encontrado com “<span className="font-medium text-texto">{termo}</span>”
              {limpaFiltro ? " nesses filtros." : "."}
            </>
          ) : (
            "Nada encontrado nesses filtros."
          )}
        </p>
        <Botao variante="secundario" onClick={limpar}>
          {termo && limpaFiltro ? "Limpar a busca e os filtros" : termo ? "Limpar a busca" : "Limpar os filtros"}
        </Botao>
      </div>
    );
  } else if (itens.length === 0) {
    corpo = (
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
        <p className="text-corpo text-texto-2">{vazio.frase}</p>
        {vazio.acao && (
          <Botao variante="secundario" onClick={vazio.acao.aoClicar}>
            {vazio.acao.rotulo}
          </Botao>
        )}
      </div>
    );
  } else {
    corpo = (
      <>
        <ul
          ref={listaRef}
          tabIndex={-1}
          aria-label={rotulo}
          aria-busy={estado === "carregando" || undefined}
          className="outline-none"
        >
          {visiveis.map((item) => (
            <Fragment key={chave(item)}>{linha(item)}</Fragment>
          ))}
        </ul>
        {cortada && (
          <div className="flex justify-center border-t border-linha p-2">
            <Botao variante="fantasma" onClick={verTodos}>
              Ver todos ({itens.length})
            </Botao>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <span role="status" className="sr-only">
        {anuncio}
      </span>
      {(busca || filtros) && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          {busca && (
            <div className="relative min-w-0 max-w-md flex-1 basis-72">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-texto-3"
              />
              <input
                ref={campoRef}
                type="search"
                value={busca.valor}
                onChange={(e) => busca.aoMudar(e.target.value)}
                onKeyDown={(e) => {
                  // Esc apaga a busca. Só "gasta" o Esc quando tinha o que
                  // apagar: com o campo vazio, ele segue (fecha a janela em volta).
                  if (e.key === "Escape" && busca.valor !== "") {
                    e.preventDefault();
                    e.stopPropagation();
                    busca.aoMudar("");
                  }
                }}
                aria-label={busca.rotulo}
                placeholder={busca.dica}
                className="sakura-campo !h-12 !pl-10"
              />
            </div>
          )}
          {filtros && <div className="min-w-0">{filtros}</div>}
        </div>
      )}
      <div
        ref={cartaoRef}
        tabIndex={-1}
        className="sakura-card min-w-0 overflow-hidden outline-none"
      >
        {corpo}
      </div>
    </div>
  );
}

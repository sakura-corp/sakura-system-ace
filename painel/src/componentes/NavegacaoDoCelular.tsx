import { Ellipsis, LogOut, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ENDERECO_DA_LEVA_ATUAL } from "../logica/dados";
import { NAVEGACAO, type ItemDaNavegacao } from "../logica/navegacao";
import type { EstadoDoTempoReal } from "../logica/tempoReal";
import type { Pagina, Usuario } from "../tipos";
import { Avatar } from "./Avatar";
import { ICONES, ItemEmBreve, PONTO_DO_TEMPO_REAL, sair, type ItemDeLeva } from "./BarraLateral";

type Props = { levas: ItemDeLeva[]; pagina?: Pagina; usuario?: Usuario; tempoReal?: EstadoDoTempoReal };

/** Os quatro itens da barra de baixo, lidos da NAVEGACAO pelo id. O quinto é o "Mais". */
const IDS_DA_BARRA: Pagina[] = ["inicio", "leva", "sala", "pessoas"];
/** Rótulo curto na barra de baixo; os demais usam o da lista. */
const ROTULO_CURTO: Partial<Record<Pagina, string>> = { leva: "Leva" };

const TODOS_OS_ITENS = NAVEGACAO.flatMap((g) => g.itens);
const ITENS_DA_BARRA = IDS_DA_BARRA.flatMap((id) => TODOS_OS_ITENS.filter((i) => i.id === id));

/** O que a folha precisa de um <dialog>: assim dá pra testar sem DOM. */
export type FolhaMinima = {
  open: boolean;
  close(): void;
  addEventListener(tipo: "keydown" | "close", ouvinte: (e: never) => void): void;
  removeEventListener(tipo: "keydown" | "close", ouvinte: (e: never) => void): void;
  querySelectorAll(seletor: string): ArrayLike<{ focus(): void }>;
};
type TeclaDoTeclado = { key: string; shiftKey: boolean; target: unknown; preventDefault(): void };

const FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Liga o teclado e o foco da folha: Esc fecha; Tab no último volta pro primeiro (e Shift+Tab ao contrário);
 * ao fechar, avisa e devolve o foco ao botão "Mais". Devolve a função que desliga tudo.
 */
export function ligarFolha(folha: FolhaMinima, botao: { focus(): void }, aoFechar: () => void): () => void {
  const aoTeclar = (e: TeclaDoTeclado) => {
    if (e.key === "Escape") {
      e.preventDefault();
      folha.close();
      return;
    }
    if (e.key !== "Tab") return;
    const lista = Array.from(folha.querySelectorAll(FOCAVEIS));
    if (lista.length === 0) return;
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    if (e.shiftKey && e.target === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && e.target === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };
  const aoFicarFechada = () => {
    aoFechar();
    botao.focus();
  };
  folha.addEventListener("keydown", aoTeclar);
  folha.addEventListener("close", aoFicarFechada);
  return () => {
    folha.removeEventListener("keydown", aoTeclar);
    folha.removeEventListener("close", aoFicarFechada);
  };
}

/** Alvo da barra de baixo: ícone em cima, texto pequeno embaixo. */
function AlvoDaBarra({ item, atual, comAriaCurrent }: { item: ItemDaNavegacao; atual: boolean; comAriaCurrent: boolean }) {
  const Icone = ICONES[item.icone];
  const rotulo = ROTULO_CURTO[item.id] ?? item.rotulo;
  const base = "flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[11.5px]";
  const conteudo = (
    <>
      <Icone aria-hidden="true" className="size-5 shrink-0" />
      <span className="max-w-full truncate">{rotulo}</span>
    </>
  );
  // O link vem do endereço; o visual apagado e o "(em breve)", do emBreve (#544: em breve também tem endereço).
  const cor = atual ? "font-semibold text-destaque" : item.emBreve ? "text-texto-2" : "text-texto";
  const conteudoComAviso = (
    <>
      {conteudo}
      {item.emBreve && <span className="sr-only"> (em breve)</span>}
    </>
  );
  if (item.href) {
    return (
      <a href={item.href} aria-current={comAriaCurrent ? "page" : undefined} className={`${base} ${cor}`}>
        {conteudoComAviso}
      </a>
    );
  }
  return (
    <span aria-disabled="true" className={`${base} ${cor}`}>
      {conteudoComAviso}
    </span>
  );
}

/** Linha de link dentro da folha: no mínimo 44 px de altura de toque. */
function LinhaDaFolha({ href, rotulo, etiqueta, Icone, atual, recuado }: { href: string; rotulo: string; etiqueta?: string; Icone?: LucideIcon; atual: boolean; recuado?: boolean }) {
  return (
    <a
      href={href}
      aria-current={atual ? "page" : undefined}
      className={`flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2.5 py-2 text-base text-texto hover:bg-livre-fundo ${atual ? "bg-livre-fundo font-semibold" : ""} ${recuado ? "ml-6" : ""}`}
    >
      {Icone && <Icone aria-hidden="true" className={`size-5 shrink-0 ${atual ? "text-destaque" : "text-texto-2"}`} />}
      <span className="min-w-0 truncate">
        {rotulo}
        {etiqueta && <span className="text-sm font-normal text-texto-2"> ({etiqueta})</span>}
      </span>
    </a>
  );
}

/** A navegação do celular (#543): barra fixa embaixo + a folha do "Mais". Some a partir de 768 px. */
export function NavegacaoDoCelular({ levas, pagina = "leva", usuario, tempoReal }: Props) {
  const [aberto, setAberto] = useState(false);
  const [saidaFalhou, setSaidaFalhou] = useState(false);
  const folhaRef = useRef<HTMLDialogElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  // A leva na tela que não é a atual (ex.: /leva/0): vai na folha, e o "Leva" da barra perde o aria-current.
  const extra = levas.find((l) => l.atual && l.href !== ENDERECO_DA_LEVA_ATUAL);
  const naBarra = IDS_DA_BARRA.includes(pagina);
  // A página não encontrada (#560) não mora na barra nem na folha: o "Mais" não ganha destaque por causa dela.
  const naFolha = !naBarra && pagina !== "nao-encontrada";

  useEffect(() => {
    const folha = folhaRef.current;
    const botao = botaoRef.current;
    if (!folha || !botao) return;
    return ligarFolha(folha as unknown as FolhaMinima, botao, () => setAberto(false));
  }, []);

  useEffect(() => {
    const folha = folhaRef.current;
    if (!folha) return;
    if (aberto && !folha.open) folha.showModal();
    else if (!aberto && folha.open) folha.close();
  }, [aberto]);

  const grupos = NAVEGACAO.map((g) => ({ ...g, itens: g.itens.filter((i) => !IDS_DA_BARRA.includes(i.id)) })).filter((g) => g.itens.length > 0);

  return (
    <>
      <nav
        aria-label="Menu do celular"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-borda bg-cartao pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden"
      >
        {ITENS_DA_BARRA.map((item) => {
          const atual = pagina === item.id;
          return <AlvoDaBarra key={item.id} item={item} atual={atual} comAriaCurrent={atual && !(item.id === "leva" && extra)} />;
        })}
        <button
          ref={botaoRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={aberto}
          onClick={() => setAberto(true)}
          className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg text-[11.5px] ${naFolha ? "font-semibold text-destaque" : "text-texto"}`}
        >
          <Ellipsis aria-hidden="true" className="size-5 shrink-0" />
          <span>Mais</span>
        </button>
      </nav>

      <dialog
        ref={folhaRef}
        aria-labelledby="titulo-da-folha"
        onClick={(e) => {
          // Toque no fundo escurecido: o alvo é o próprio <dialog>.
          if (e.target === e.currentTarget) setAberto(false);
        }}
        className="m-0 mt-auto max-h-[85vh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-cartao p-0 text-texto backdrop:bg-black/40"
      >
        <div
          className="min-w-0 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setAberto(false);
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="titulo-da-folha" className="font-serif text-xl font-semibold">Mais</h2>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm text-texto-2 hover:bg-livre-fundo hover:text-texto"
            >
              <X aria-hidden="true" className="size-4" />
              Fechar
            </button>
          </div>

          {extra && (
            <ul className="mt-1">
              <li className="min-w-0">
                <LinhaDaFolha href={extra.href} rotulo={extra.nome} atual={pagina === "leva"} />
              </li>
            </ul>
          )}

          {grupos.map((grupo) => (
            <div key={grupo.id} className={`min-w-0 ${grupo.id === "rodape" ? "mt-3 border-t border-borda pt-2" : ""}`}>
              {grupo.titulo && <p className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-texto-2">{grupo.titulo}</p>}
              <ul className="flex flex-col gap-0.5">
                {grupo.itens.map((item) => (
                  <li key={item.id} className="min-w-0">
                    {item.emBreve ? (
                      <ItemEmBreve item={item} atual={pagina === item.id} />
                    ) : (
                      <LinhaDaFolha href={item.href} rotulo={item.rotulo} etiqueta={item.etiqueta} Icone={ICONES[item.icone]} atual={pagina === item.id} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-3 grid min-w-0 gap-2 border-t border-borda pt-3">
            {tempoReal && (
              <p role="status" className={`flex items-center gap-1.5 px-2.5 text-xs font-medium ${PONTO_DO_TEMPO_REAL[tempoReal].cor}`}>
                <span aria-hidden="true" className="size-2 rounded-full bg-current" />
                {PONTO_DO_TEMPO_REAL[tempoReal].texto}
              </p>
            )}
            {usuario && (
              <div className="min-w-0">
                <div className="flex items-center gap-2 px-2.5">
                  <Avatar login={usuario.login} avatar={usuario.avatar} />
                  <span className="min-w-0 truncate text-sm font-medium" title={usuario.login}>{usuario.login}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSaidaFalhou(false);
                      void sair().then((saiu) => setSaidaFalhou(!saiu));
                    }}
                    className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-3 text-sm text-texto-2 hover:bg-livre-fundo hover:text-texto"
                  >
                    <LogOut aria-hidden="true" className="size-3.5" />
                    Sair
                  </button>
                </div>
                {saidaFalhou && (
                  <p role="alert" className="mt-2 px-2.5 text-xs text-revisao">
                    Não deu pra sair. Tente de novo.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

import {
  BriefcaseBusiness,
  ChartColumn,
  CreditCard,
  FileText,
  History,
  House,
  ListChecks,
  Lock,
  LogOut,
  Milestone,
  SlidersHorizontal,
  Store,
  Tag,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { ENDERECO_DA_LEVA_ATUAL } from "../logica/dados";
import { NAVEGACAO, type ItemDaNavegacao, type NomeDoIcone } from "../logica/navegacao";
import type { EstadoDoTempoReal } from "../logica/tempoReal";
import type { Pagina, Usuario } from "../tipos";
import { Avatar } from "./Avatar";

/** Uma leva na barra lateral: `atual` = é a que está na tela (quando a página é a da leva). */
export type ItemDeLeva = { nome: string; href: string; atual: boolean };

type Props = { levas: ItemDeLeva[]; pagina?: Pagina; usuario?: Usuario; tempoReal?: EstadoDoTempoReal };

/** Um componente do lucide-react por nome de ícone da lista (NAVEGACAO). */
export const ICONES: Record<NomeDoIcone, LucideIcon> = {
  casa: House,
  lista: ListChecks,
  relogio: History,
  etiqueta: Tag,
  fases: Milestone,
  relatorio: FileText,
  pessoas: Users,
  pessoa: User,
  maleta: BriefcaseBusiness,
  cartao: CreditCard,
  grafico: ChartColumn,
  loja: Store,
  ajustes: SlidersHorizontal,
};

const LINHA = "relative flex min-h-8 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm";

/** Item que existe: link. O atual leva a barrinha de destaque à esquerda. */
function ItemComLink({ href, rotulo, etiqueta, Icone, atual, recuado }: { href: string; rotulo: string; etiqueta?: string; Icone?: LucideIcon; atual: boolean; recuado?: boolean }) {
  return (
    <a
      href={href}
      aria-current={atual ? "page" : undefined}
      className={`${LINHA} min-w-0 text-texto hover:bg-livre-fundo ${atual ? "bg-livre-fundo font-semibold" : ""} ${recuado ? "ml-6" : ""}`}
    >
      {atual && <span aria-hidden="true" className="absolute inset-y-[7px] left-0 w-[3px] rounded-full bg-destaque" />}
      {Icone && <Icone aria-hidden="true" className={`size-4 shrink-0 ${atual ? "text-destaque" : "text-texto-2"}`} />}
      <span className="min-w-0 truncate">
        {rotulo}
        {etiqueta && <span className="font-normal text-texto-2 text-xs"> ({etiqueta})</span>}
      </span>
    </a>
  );
}

/** Item em breve: apagado, com cadeado e o que falta; leva à página que explica (#544). Também na folha do "Mais". */
export function ItemEmBreve({ item, atual }: { item: Extract<ItemDaNavegacao, { emBreve: true }>; atual: boolean }) {
  const Icone = ICONES[item.icone];
  return (
    <a
      href={item.href}
      aria-current={atual ? "page" : undefined}
      className={`${LINHA} flex-wrap content-center gap-y-0 text-texto-2 hover:bg-livre-fundo ${atual ? "bg-livre-fundo" : ""}`}
    >
      {atual && <span aria-hidden="true" className="absolute inset-y-[7px] left-0 w-[3px] rounded-full bg-destaque" />}
      <Icone aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {item.rotulo}
        <span className="sr-only"> (em breve)</span>
      </span>
      <Lock aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="-mt-0.5 basis-full pl-[26px] text-xs font-normal leading-snug">{item.dependeDe}</span>
    </a>
  );
}

/** O ponto "ao vivo" (#355): sempre com texto, a cor sozinha não diz nada. */
export const PONTO_DO_TEMPO_REAL: Record<EstadoDoTempoReal, { texto: string; cor: string }> = {
  aovivo: { texto: "ao vivo", cor: "text-feita" },
  reconectando: { texto: "reconectando…", cor: "text-revisao" },
  desatualizado: { texto: "desatualizado", cor: "text-revisao" },
};

/**
 * Sai do painel (#353): o worker apaga a sessão, e a página volta pra tela de entrada.
 * Se não der (sem internet), avisa, em vez de fingir que saiu.
 */
export async function sair(): Promise<boolean> {
  try {
    const resposta = await fetch("/api/sair", { method: "POST" });
    if (!resposta.ok) return false;
  } catch {
    return false;
  }
  window.location.assign("/");
  return true;
}

export function BarraLateral({ levas, pagina = "leva", usuario, tempoReal }: Props) {
  const [saidaFalhou, setSaidaFalhou] = useState(false);
  // A leva na tela que não é a atual (ex.: /leva/0): aparece logo abaixo de "Leva atual".
  const extra = levas.find((l) => l.atual && l.href !== ENDERECO_DA_LEVA_ATUAL);

  function linhaDe(item: ItemDaNavegacao) {
    if (item.emBreve) {
      return (
        <li key={item.id}>
          <ItemEmBreve item={item} atual={pagina === item.id} />
        </li>
      );
    }
    const Icone = ICONES[item.icone];
    if (item.id === "leva") {
      return (
        <li key={item.id} className="min-w-0">
          <ItemComLink href={item.href} rotulo={item.rotulo} Icone={Icone} atual={pagina === "leva" && !extra} />
          {extra && (
            <ul className="mt-0.5">
              <li className="min-w-0">
                <ItemComLink href={extra.href} rotulo={extra.nome} atual={pagina === "leva"} recuado />
              </li>
            </ul>
          )}
        </li>
      );
    }
    return (
      <li key={item.id} className="min-w-0">
        <ItemComLink href={item.href} rotulo={item.rotulo} etiqueta={item.etiqueta} Icone={Icone} atual={pagina === item.id} />
      </li>
    );
  }

  const grupos = NAVEGACAO.filter((g) => g.id !== "rodape");
  const rodape = NAVEGACAO.find((g) => g.id === "rodape");

  return (
    <nav
      aria-label="Menu do painel"
      className="hidden min-w-0 border-borda bg-cartao md:sticky md:top-0 md:flex md:h-screen md:w-62 md:shrink-0 md:flex-col md:items-stretch md:overflow-y-auto md:border-r md:px-3 md:pb-3 md:pt-4"
    >
      <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5">
        <p className="font-serif text-xl font-semibold">Sakura Corp</p>
        {tempoReal && (
          <p role="status" className={`flex items-center gap-1.5 text-xs font-medium ${PONTO_DO_TEMPO_REAL[tempoReal].cor}`}>
            <span aria-hidden="true" className="size-2 rounded-full bg-current" />
            {PONTO_DO_TEMPO_REAL[tempoReal].texto}
          </p>
        )}
      </div>

      {grupos.map((grupo) => (
        <div key={grupo.id} className="min-w-0">
          {grupo.titulo && <p className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-texto-2">{grupo.titulo}</p>}
          <ul className="flex flex-col gap-0.5">{grupo.itens.map(linhaDe)}</ul>
        </div>
      ))}

      <div className="mt-auto grid min-w-0 max-w-full gap-2 border-t border-borda pt-3.5">
        {rodape && <ul>{rodape.itens.map(linhaDe)}</ul>}
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
                className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm text-texto-2 hover:bg-livre-fundo hover:text-texto"
              >
                <LogOut aria-hidden="true" className="size-3.5" />
                Sair
              </button>
            </div>
            {saidaFalhou && (
              <p role="alert" className="mt-2 text-xs text-revisao px-2.5">
                Não deu pra sair. Tente de novo.
              </p>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

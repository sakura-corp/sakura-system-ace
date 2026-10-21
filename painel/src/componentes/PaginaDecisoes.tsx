// As decisões da Sofia (#648): a lista das issues abertas com a etiqueta `sofia`, a mais antiga em cima. O painel só lê:
// não tem botão de fechar nem de responder (isso é no GitHub). O título vem do GitHub e aparece como texto puro.
import { CalendarClock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Decisao, RespostaDasDecisoes } from "../../worker/decisoes";
import { linkSeguro } from "../logica/link";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";
import { ErroDaLeva } from "./TelaDaLeva";

export type EstadoDasDecisoes =
  | { tipo: "carregando" }
  /** A sessão acabou (401). */
  | { tipo: "fora" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; resposta: RespostaDasDecisoes };

type Buscar = (endereco: string, init?: RequestInit) => Promise<Response>;

const ERRO_DO_GITHUB = "Não deu pra buscar as decisões no GitHub agora.";
const ERRO_DE_CONEXAO = "Sem conexão com o painel. Confira a internet.";
const TODAS_NO_GITHUB = "https://github.com/sakura-corp/sakura-system-ace/issues?q=is%3Aissue+is%3Aopen+label%3Asofia";
/** Quantas a lista mostra (o mesmo número da consulta do worker, MAXIMO_DE_DECISOES). */
const MAXIMO_MOSTRADO = 100;
const DIA_EM_MS = 86_400_000;
/** O prazo aparece em destaque quando faltam tantos dias ou menos. */
const DIAS_DO_DESTAQUE = 3;
/** "até 05/01" visto com a data mais de tanto tempo atrás é do ano que vem. */
const DIAS_PRA_TRAS = 180;

/** O dia de calendário LOCAL como número de dias (UTC dos componentes locais: o horário de verão não atrapalha). */
const diaLocal = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DIA_EM_MS;

/** Dias de calendário (no fuso de quem olha) desde que a issue foi aberta; nunca negativo. */
export function diasAberta(abertaEm: string, agora: Date): number {
  return Math.max(0, Math.round(diaLocal(agora) - diaLocal(new Date(abertaEm))));
}

export function textoDosDias(dias: number): string {
  return dias === 0 ? "aberta hoje" : dias === 1 ? "aberta há 1 dia" : `aberta há ${dias} dias`;
}

export type Prazo = { dia: number; mes: number; ano: number; faltam: number };

/** O dia existe no calendário? (31/02 e 29/02 de ano comum não.) */
function dataValida(dia: number, mes: number, ano: number): boolean {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** O prazo escrito no título ("até 26/10" ou "até 26/10/2026"), e quantos dias faltam de hoje até ele; sem prazo ou data inválida, null. */
export function prazoDoTitulo(titulo: string, agora: Date): Prazo | null {
  const achou = /(?<![\p{L}\p{N}_])at[ée](?![\p{L}\p{N}_])\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?![\d/])/iu.exec(titulo.normalize("NFC"));
  if (!achou) return null;
  const dia = Number(achou[1]);
  const mes = Number(achou[2]);
  const hoje = diaLocal(agora);
  let ano = achou[3] ? Number(achou[3]) : agora.getFullYear();
  if (!dataValida(dia, mes, ano)) return null;
  if (!achou[3] && hoje - Date.UTC(ano, mes - 1, dia) / DIA_EM_MS > DIAS_PRA_TRAS) {
    ano += 1;
    if (!dataValida(dia, mes, ano)) return null;
  }
  return { dia, mes, ano, faltam: Math.round(Date.UTC(ano, mes - 1, dia) / DIA_EM_MS - hoje) };
}

/** Como o prazo aparece: em destaque (faltam 3 dias ou menos, vence hoje, passou) ou só discreto. */
export function textoDoPrazo(faltam: number): { destaque: boolean; texto: string } {
  if (faltam > DIAS_DO_DESTAQUE) return { destaque: false, texto: "" };
  if (faltam < 0) return { destaque: true, texto: "passou do prazo" };
  if (faltam === 0) return { destaque: true, texto: "vence hoje" };
  return { destaque: true, texto: faltam === 1 ? "falta 1 dia" : `faltam ${faltam} dias` };
}

/** A mais antiga em cima (empate: o número menor). Devolve uma lista nova. */
export function ordenarDecisoes(decisoes: Decisao[]): Decisao[] {
  return [...decisoes].sort((a, b) => Date.parse(a.abertaEm) - Date.parse(b.abertaEm) || a.numero - b.numero);
}

const dois = (n: number) => String(n).padStart(2, "0");

function valida(d: unknown): d is Decisao {
  if (typeof d !== "object" || d === null) return false;
  const x = d as Partial<Decisao>;
  return typeof x.numero === "number" && typeof x.titulo === "string" && typeof x.abertaEm === "string" && !Number.isNaN(Date.parse(x.abertaEm));
}

/** Busca /api/decisoes e confere o formato. O link só passa se for da sakura-corp. */
export async function carregarDecisoes(buscar: Buscar = fetch): Promise<EstadoDasDecisoes> {
  let resposta: Response;
  try {
    resposta = await buscar("/api/decisoes", { headers: { accept: "application/json" } });
  } catch {
    return { tipo: "erro", mensagem: ERRO_DE_CONEXAO };
  }
  if (resposta.status === 401) return { tipo: "fora" };
  if (!resposta.ok) return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  let corpo: Partial<RespostaDasDecisoes> | null;
  try {
    corpo = (await resposta.json()) as Partial<RespostaDasDecisoes> | null;
  } catch {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  if (!corpo || !Array.isArray(corpo.decisoes) || !corpo.decisoes.every(valida) || typeof corpo.total !== "number") {
    return { tipo: "erro", mensagem: ERRO_DO_GITHUB };
  }
  const decisoes = ordenarDecisoes(corpo.decisoes.map((d) => {
    const url = linkSeguro(d.url);
    return { numero: d.numero, titulo: d.titulo, abertaEm: d.abertaEm, ...(url ? { url } : {}) };
  }));
  return { tipo: "pronto", resposta: { decisoes, total: corpo.total, ...(corpo.maisDoQueCabe === true ? { maisDoQueCabe: true as const } : {}) } };
}

const CAIXA = "mt-4 min-w-0 rounded-xl border border-borda bg-cartao px-4 py-4 sm:px-5";

/** O prazo da linha: em destaque (selo, com ícone e texto, sem depender só da cor) ou discreto. */
function PrazoDaLinha({ titulo, agora }: { titulo: string; agora: Date }) {
  const prazo = prazoDoTitulo(titulo, agora);
  if (!prazo) return null;
  const { destaque, texto } = textoDoPrazo(prazo.faltam);
  const data = `${dois(prazo.dia)}/${dois(prazo.mes)}`;
  if (!destaque) return <span className="text-[13px] text-texto-2">prazo {data}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-revisao-fundo px-2.5 py-0.5 text-[13px] font-medium text-revisao">
      <CalendarClock aria-hidden="true" className="size-3.5" />
      Prazo {data}: {texto}
    </span>
  );
}

function LinhaDaDecisao({ decisao, agora }: { decisao: Decisao; agora: Date }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5 px-4 py-3 sm:px-5">
      <div className="min-w-0 break-words text-sm font-medium">
        {decisao.url ? (
          <a
            href={decisao.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
          >
            {decisao.titulo}
            <span className="sr-only"> (abre em aba nova)</span>
          </a>
        ) : (
          decisao.titulo
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-texto-2">
        <span>#{decisao.numero}</span>
        <span>{textoDosDias(diasAberta(decisao.abertaEm, agora))}</span>
        <PrazoDaLinha titulo={decisao.titulo} agora={agora} />
      </div>
    </li>
  );
}

type PropsDoConteudo = { estado: EstadoDasDecisoes; agora: Date; tentarDeNovo?: () => void };

/** A lista, a partir do estado da busca (separado da busca pra dar pra testar sem rede). */
export function ConteudoDasDecisoes({ estado, agora, tentarDeNovo }: PropsDoConteudo) {
  if (estado.tipo === "carregando") {
    return (
      <p role="status" aria-busy="true" className={`${CAIXA} text-sm text-texto-2`}>
        Buscando as decisões no GitHub…
      </p>
    );
  }
  if (estado.tipo === "fora") {
    return (
      <p role="alert" className={`${CAIXA} text-sm`}>
        A sessão acabou. Recarregue a página e entre de novo para ver as decisões.
      </p>
    );
  }
  if (estado.tipo === "erro") {
    return (
      <div className="mt-4">
        <ErroDaLeva mensagem={estado.mensagem} tentarDeNovo={tentarDeNovo ?? (() => {})} />
      </div>
    );
  }
  const { decisoes, total, maisDoQueCabe } = estado.resposta;
  return (
    <section aria-label="Decisões da Sofia" className="mt-4 min-w-0">
      {decisoes.length === 0 ? (
        <p className={`${CAIXA} mt-0 text-sm`}>Nada esperando a Sofia agora.</p>
      ) : (
        <ol className="min-w-0 divide-y divide-borda rounded-xl border border-borda bg-cartao">
          {decisoes.map((d) => (
            <LinhaDaDecisao key={d.numero} decisao={d} agora={agora} />
          ))}
        </ol>
      )}
      {maisDoQueCabe ? <p className="mt-3 text-sm text-texto-2">Mostrando as {MAXIMO_MOSTRADO} mais antigas de {total}.</p> : null}
      <p className="mt-3 text-sm">
        <a
          href={TODAS_NO_GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
        >
          Ver a lista no GitHub<span className="sr-only"> (abre em aba nova)</span>
        </a>
      </p>
    </section>
  );
}

type Props = {
  /** Sem login (só no `npm run dev`): não busca nada. */
  semLogin?: boolean;
  /** Só nos testes: em vez de buscar no worker. */
  buscar?: Buscar;
  /** Só nos testes: o "agora" da conta dos dias. */
  agora?: Date;
};

/** A página inteira: o cabeçalho e a lista, buscada no worker. */
export function PaginaDecisoes({ semLogin = false, buscar = fetch, agora }: Props) {
  const [estado, setEstado] = useState<EstadoDasDecisoes>({ tipo: "carregando" });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (semLogin) return;
    let vale = true;
    setEstado({ tipo: "carregando" });
    void carregarDecisoes(buscar).then((novo) => {
      if (vale) setEstado(novo);
    });
    return () => {
      vale = false;
    };
  }, [buscar, vez, semLogin]);
  const tentarDeNovo = useCallback(() => setVez((v) => v + 1), []);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <CabecalhoDaPagina trilha="Cobertura · Diretoria" titulo="Decisões da Sofia" explicacao="O que está esperando uma decisão da Sofia, a mais antiga em cima." />
      {semLogin ? (
        <p className={`${CAIXA} text-sm text-texto-2`}>Sem login, a lista não abre. Entre pelo painel de verdade.</p>
      ) : (
        <ConteudoDasDecisoes estado={estado} agora={agora ?? new Date()} tentarDeNovo={tentarDeNovo} />
      )}
    </div>
  );
}

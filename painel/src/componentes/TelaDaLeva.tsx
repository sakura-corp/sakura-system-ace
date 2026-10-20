import { RotateCw } from "lucide-react";
import { pessoasComVariasEmAndamento } from "../logica/contador";
import type { Tarefa } from "../tipos";
import { CabecalhoDaPagina } from "./CabecalhoDaPagina";
import { Contador } from "./Contador";
import { HorasPorPessoa } from "./HorasPorPessoa";
import { ListaDeTarefas } from "./ListaDeTarefas";

type Props = {
  nome: string;
  tarefas: Tarefa[];
  /** Linha embaixo do título (ex.: "Dados de exemplo…", ou o link pro GitHub). */
  subtitulo: React.ReactNode;
  /** A leva tem mais de 100 tarefas, e só as 100 primeiras vieram. */
  cortada?: boolean;
  /** Quem está olhando (pra "Pegar tarefa" e "Largar"). Sem login, os botões ficam desligados. */
  login?: string;
  /** Busca a leva de novo depois de pegar ou largar. */
  aoMudar?: () => Promise<unknown>;
  /** Dá pra pegar tarefa da leva mostrada: a atual, ou uma anterior com tarefa aberta (`levaAceitaPegar`). */
  levaAberta?: boolean;
};

/** A leva (versão A, #547): o cabeçalho de toda página, aviso de "uma por vez", o contador numa faixa, as horas por pessoa e a lista compacta. */
export function TelaDaLeva({ nome, tarefas, subtitulo, cortada = false, login, aoMudar, levaAberta }: Props) {
  const avisos = pessoasComVariasEmAndamento(tarefas);
  return (
    <>
      <CabecalhoDaPagina trilha="1º · Produção" titulo={nome} explicacao={subtitulo} />

      {avisos.length > 0 && (
        <div role="status" className="mt-4 rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
          {avisos.map((a) => (
            <p key={a.login}>
              {a.login} está com {a.quantas} tarefas em andamento (a regra é uma por vez).
            </p>
          ))}
        </div>
      )}
      {cortada && (
        <p role="status" className="mt-4 rounded-xl border border-borda bg-revisao-fundo px-4 py-2 text-sm text-revisao">
          Esta leva tem mais de 100 tarefas: só as 100 primeiras aparecem aqui.
        </p>
      )}

      {tarefas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-borda bg-cartao px-4 py-6 text-center text-sm text-texto-2">
          Nenhuma tarefa nesta leva ainda.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <Contador tarefas={tarefas} />
          <HorasPorPessoa tarefas={tarefas} />
          <ListaDeTarefas tarefas={tarefas} login={login} aoMudar={aoMudar} levaAberta={levaAberta} />
        </div>
      )}
    </>
  );
}

/** Enquanto as tarefas chegam: o desenho da tela, apagado, sem piscar pra quem pediu menos movimento. */
export function EsqueletoDaLeva() {
  const bloco = "rounded-xl bg-livre-fundo motion-safe:animate-pulse";
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Buscando as tarefas no GitHub…
      </p>
      <div aria-hidden="true">
        <div className={`h-4 w-32 ${bloco}`} />
        <div className={`mt-2 h-8 w-40 ${bloco}`} />
        <div className={`mt-6 h-[132px] ${bloco}`} />
        <div className={`mt-6 h-48 ${bloco}`} />
      </div>
    </div>
  );
}

/** Erro ao buscar: a mensagem e o botão de tentar de novo. */
export function ErroDaLeva({ mensagem, tentarDeNovo }: { mensagem: string; tentarDeNovo: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-borda bg-cartao px-4 py-6 text-center">
      <p className="text-sm">{mensagem}</p>
      <button
        type="button"
        onClick={tentarDeNovo}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destaque px-4 py-2 text-sm font-medium text-sobre-destaque hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
      >
        <RotateCw aria-hidden="true" className="size-4" />
        Tentar de novo
      </button>
    </div>
  );
}

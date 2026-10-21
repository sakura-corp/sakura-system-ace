// As pessoas da equipe (#650): a foto, o login e a tarefa que cada uma está segurando agora (ou "Sem tarefa").
// Os dados são os mesmos da Sala (as entradas do tipo "pessoa"); aqui não há horas, contagem nem ranking por pessoa.
import { useState } from "react";
import { fotoSegura, iniciais, linkSeguro } from "../logica/sala";
import type { EstadoDaSala } from "../logica/salaDados";
import type { EntradaDaSala } from "../tipos";
import { ErroDaLeva } from "./TelaDaLeva";

const CAIXA = "min-w-0 rounded-xl border border-borda bg-cartao px-4 py-4 sm:px-5";
const LINK = "underline underline-offset-2 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque";

/** Foto redonda do GitHub; sem foto (ou se ela não carregar), as iniciais do login. O login vem escrito ao lado, então a foto é enfeite. */
function Foto({ login, avatar }: { login: string; avatar?: string }) {
  const [falhou, setFalhou] = useState(false);
  const foto = falhou ? undefined : fotoSegura(avatar);
  if (foto) {
    return <img src={foto} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full" onError={() => setFalhou(true)} />;
  }
  return (
    <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-livre-fundo text-sm font-semibold text-livre">
      {iniciais(login)}
    </span>
  );
}

function Tarefa({ pessoa }: { pessoa: EntradaDaSala }) {
  if (!pessoa.sinais.tarefaEmAndamento || !pessoa.fazendo) return <p className="mt-0.5 text-sm text-texto-2">Sem tarefa</p>;
  const url = linkSeguro(pessoa.url);
  return (
    <p className="mt-0.5 break-words text-sm">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={LINK}>
          {pessoa.fazendo}
          <span className="sr-only"> (abre em aba nova)</span>
        </a>
      ) : (
        pessoa.fazendo
      )}
    </p>
  );
}

function CartaoDaPessoa({ pessoa }: { pessoa: EntradaDaSala }) {
  return (
    <li className={`${CAIXA} flex items-center gap-3`}>
      <Foto login={pessoa.nome} avatar={pessoa.avatar} />
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{pessoa.nome}</p>
        <Tarefa pessoa={pessoa} />
      </div>
    </li>
  );
}

/** Ordem alfabética do login, sem diferenciar maiúscula (estável; nunca por quem trabalha mais). */
const porLogin = (a: EntradaDaSala, b: EntradaDaSala) => a.nome.toLowerCase().localeCompare(b.nome.toLowerCase(), "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR");

type Props = { dados: EstadoDaSala; tentarDeNovo: () => void };

/** O conteúdo da página (o cabeçalho é do App), a partir do estado da Sala. */
export function PaginaPessoas({ dados, tentarDeNovo }: Props) {
  if (dados.tipo === "carregando") {
    return (
      <p role="status" aria-busy="true" className={`${CAIXA} mt-6 text-sm text-texto-2`}>
        Carregando as pessoas…
      </p>
    );
  }
  if (dados.tipo === "fora") {
    return (
      <p role="alert" className={`${CAIXA} mt-6 text-sm`}>
        A sessão acabou. Recarregue a página e entre de novo.
      </p>
    );
  }
  if (dados.tipo === "erro") {
    return (
      <div className="mt-6">
        <ErroDaLeva mensagem={dados.mensagem} tentarDeNovo={tentarDeNovo} />
      </div>
    );
  }
  const pessoas = dados.entradas.filter((e) => e.tipo === "pessoa").sort(porLogin);
  if (pessoas.length === 0) return <p className={`${CAIXA} mt-6 text-sm`}>Ninguém com tarefa nesta leva.</p>;
  return (
    <ul aria-label="Pessoas da equipe" className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
      {pessoas.map((p) => (
        <CartaoDaPessoa key={p.id} pessoa={p} />
      ))}
    </ul>
  );
}

// A página de um item "em breve" da barra lateral: explica o que vai ter ali, do que depende e quem cuida.
import { Check, Clock, Info, Lock } from "lucide-react";
import { textoEmBreve } from "../logica/emBreve";

const LINK_DA_TAREFA = (numero: number) => `https://github.com/sakura-corp/sakura-system-ace/issues/${numero}`;

export function PaginaEmBreve({ id }: { id: string }) {
  const texto = textoEmBreve(id);
  if (!texto) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="font-serif text-3xl font-semibold text-texto">Página não encontrada</h1>
        <p className="mt-2 text-texto-2">Esse endereço não existe no painel.</p>
        <a
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destaque px-4 py-2 text-sm font-medium text-sobre-destaque hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destaque"
        >
          Voltar pra leva atual
        </a>
      </div>
    );
  }
  const cartao = "rounded-xl border border-borda bg-cartao";
  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-texto-2">
            {texto.grupo ? <>{texto.grupo} / </> : null}
            <b className="font-semibold text-texto">{texto.titulo}</b>
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-texto">{texto.titulo}</h1>
          <p className="mt-1 text-texto-2">{texto.subtitulo}</p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-livre-fundo px-2 py-0.5 text-xs font-medium text-livre">Em breve</span>
      </header>

      <section className={`${cartao} mt-6 flex items-start gap-4 p-5`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-livre-fundo text-livre" aria-hidden="true">
          <Lock className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-texto">Ainda não está pronto</h2>
          <p className="mt-1 text-sm text-texto-2">{texto.resumo}</p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={`${cartao} p-5`} aria-labelledby="h-vai">
          <h2 id="h-vai" className="text-base font-semibold text-texto">O que vai mostrar</h2>
          <ul className="mt-3 space-y-2">
            {texto.vaiMostrar.map((linha) => (
              <li key={linha} className="flex min-w-0 items-start gap-2 text-sm text-texto">
                <Check className="mt-0.5 size-4 shrink-0 text-destaque" aria-hidden="true" />
                <span className="min-w-0">{linha}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={`${cartao} p-5`} aria-labelledby="h-depende">
          <h2 id="h-depende" className="text-base font-semibold text-texto">Do que depende</h2>
          <ul className="mt-3 space-y-2">
            {texto.dependeDe.map((d) => (
              <li key={d.texto} className="flex min-w-0 items-start gap-2 text-sm text-texto">
                <Clock className="mt-0.5 size-4 shrink-0 text-revisao" aria-hidden="true" />
                <span className="min-w-0">
                  {d.texto}
                  {d.detalhe ? <small className="block text-xs text-texto-2">{d.detalhe}</small> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {texto.tarefa ? (
        <p className="mt-4 text-sm text-texto-2">
          Quem cuida: a tarefa{" "}
          <a
            href={LINK_DA_TAREFA(texto.tarefa)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-texto underline underline-offset-2 hover:text-destaque"
          >
            #{texto.tarefa}
            <span className="sr-only"> (abre em aba nova)</span>
          </a>
        </p>
      ) : null}

      {texto.semDinheiro ? (
        <div role="note" className="mt-4 flex min-w-0 items-start gap-3 rounded-xl border border-borda bg-revisao-fundo px-4 py-3 text-sm text-revisao">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0">
            <strong className="block font-semibold">
              {texto.id === "lojas"
                ? "Dinheiro da empresa e nome de cliente nunca moram no GitHub, que é público."
                : "Dinheiro da empresa nunca mora no GitHub, que é público."}
            </strong>
            Por isso esta página fica desligada até o banco privado existir.
          </p>
        </div>
      ) : null}
    </div>
  );
}

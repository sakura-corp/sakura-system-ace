import { Lock, LogOut } from "lucide-react";
import { useState } from "react";
import type { Pagina, Usuario } from "../tipos";
import { Avatar } from "./Avatar";

/** Uma leva na barra lateral: `atual` = é a que está na tela (quando a página é a da leva). */
export type ItemDeLeva = { nome: string; href: string; atual: boolean };

type Props = { levas: ItemDeLeva[]; pagina?: Pagina; usuario?: Usuario };

/**
 * Sai do painel (#353): o worker apaga a sessão, e a página volta pra tela de entrada.
 * Se não der (sem internet), avisa, em vez de fingir que saiu.
 */
async function sair(): Promise<boolean> {
  try {
    const resposta = await fetch("/api/sair", { method: "POST" });
    if (!resposta.ok) return false;
  } catch {
    return false;
  }
  window.location.assign("/");
  return true;
}

export function BarraLateral({ levas, pagina = "leva", usuario }: Props) {
  const [saidaFalhou, setSaidaFalhou] = useState(false);
  return (
    <nav
      aria-label="Menu do painel"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-borda bg-cartao px-4 py-3 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:flex-col md:items-stretch md:gap-y-6 md:border-b-0 md:border-r md:px-5 md:py-6"
    >
      <p className="font-serif text-xl font-semibold">Sakura Corp</p>

      <div>
        <p className="mb-1 hidden text-xs font-medium uppercase tracking-wide text-texto-2 md:block">Levas</p>
        <ul className="flex flex-wrap gap-1 md:flex-col">
          {levas.map((leva) => (
            <li key={leva.href}>
              <a
                href={leva.href}
                aria-current={pagina === "leva" && leva.atual ? "page" : undefined}
                className={`block rounded-lg px-3 py-1.5 text-sm ${
                  pagina === "leva" && leva.atual ? "bg-destaque font-medium text-sobre-destaque" : "text-texto hover:bg-livre-fundo"
                }`}
              >
                {leva.nome}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/sala"
              aria-current={pagina === "sala" ? "page" : undefined}
              className={`block rounded-lg px-3 py-1.5 text-sm ${
                pagina === "sala" ? "bg-destaque font-medium text-sobre-destaque" : "text-texto hover:bg-livre-fundo"
              }`}
            >
              Sala
            </a>
          </li>
        </ul>
      </div>

      <div>
        <p className="mb-1 hidden text-xs font-medium uppercase tracking-wide text-texto-2 md:block">Agentes</p>
        <a
          href="/escritorio"
          aria-current={pagina === "escritorio" ? "page" : undefined}
          className={`block rounded-lg px-3 py-1.5 text-sm ${
            pagina === "escritorio" ? "bg-destaque font-medium text-sobre-destaque" : "text-texto hover:bg-livre-fundo"
          }`}
        >
          Escritório <span className={pagina === "escritorio" ? "" : "text-texto-2"}>(exemplo)</span>
        </a>
      </div>

      <div className="md:mt-auto">
        <p
          aria-disabled="true"
          className="flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm text-texto-2"
        >
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Financeiro
            <span className="block text-xs">em breve, depende do banco próprio da Sakura</span>
          </span>
        </p>
      </div>

      {usuario && (
        <div className="flex flex-wrap items-center gap-2 md:border-t md:border-borda md:pt-4">
          <Avatar login={usuario.login} avatar={usuario.avatar} />
          <span className="min-w-0 truncate text-sm font-medium">{usuario.login}</span>
          <button
            type="button"
            onClick={() => {
              setSaidaFalhou(false);
              void sair().then((saiu) => setSaidaFalhou(!saiu));
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-texto-2 hover:bg-livre-fundo hover:text-texto"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
            Sair
          </button>
          {saidaFalhou && (
            <p role="alert" className="basis-full text-xs text-revisao">
              Não deu pra sair. Tente de novo.
            </p>
          )}
        </div>
      )}
    </nav>
  );
}

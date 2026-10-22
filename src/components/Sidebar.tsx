import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrcamentosAbertos } from "@/hooks/useOrcamentosAbertos";
import { MODULOS } from "@/types/operador";
import { AreaRolavel } from "./AreaRolavel";
import { Logo } from "./Logo";
import { LojaSwitcher } from "./LojaSwitcher";

function IconeEngrenagem({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconeAuditoria({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function IconeDiagnostico({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function Sidebar() {
  const { operador, lojaAtual, logout } = useAuth();

  const modulosLiberados: readonly { chave: string; label: string; rota: string }[] = operador?.admin
    ? MODULOS
    : MODULOS.filter((modulo) => operador?.permissoes.includes(modulo.chave));

  // "Orçamentos" (#379) não é um módulo à parte: é do mesmo módulo das OS,
  // então aparece pra quem tem "ordens_servico" e não ganha permissão nova.
  const temOrdens = modulosLiberados.some((modulo) => modulo.chave === "ordens_servico");
  const orcamentosAbertos = useOrcamentosAbertos(lojaAtual?.id, temOrdens);
  const itensDoMenu: { chave: string; label: string; rota: string; numero?: number }[] =
    modulosLiberados.flatMap((modulo) =>
      modulo.chave === "ordens_servico"
        ? [
            modulo,
            { chave: "orcamentos", label: "Orçamentos", rota: "/orcamentos", numero: orcamentosAbertos },
          ]
        : [modulo],
    );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col gap-4">
      <div className="sakura-card flex flex-1 flex-col overflow-hidden">
        <AreaRolavel className="flex flex-col">
          <div className="px-6 pb-6 pt-8">
            <Logo />
            <p className="mt-4 text-meta font-semibold tracking-widest text-sakura-pink drop-shadow-[0_0_5px_rgba(255,77,206,0.5)]">
              AUTOCENTER EDITION
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 pb-3">
            {modulosLiberados.length === 0 && (
              <p className="px-4 py-2.5 text-rotulo text-sakura-purple-dark/85">
                Nenhum módulo liberado. Fale com o administrador.
              </p>
            )}
            {itensDoMenu.map((modulo) => (
              <NavLink
                key={modulo.chave}
                to={modulo.rota}
                end={modulo.chave === "painel"}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2.5 text-corpo font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-sakura-pink/20 to-sakura-purple/10 text-white shadow-[0_0_15px_rgba(255,77,206,0.2)] border border-sakura-pink/30"
                      : "text-sakura-purple-dark/90 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <span className="flex items-center justify-between gap-2">
                  {modulo.label}
                  {!!modulo.numero && (
                    <span
                      aria-label={`${modulo.numero} em aberto`}
                      className="rounded-full bg-sakura-pink/20 px-2 py-0.5 text-meta font-semibold text-sakura-pink"
                    >
                      {modulo.numero}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}
          </nav>
        </AreaRolavel>
      </div>

      {operador && (
        <div className="sakura-card shrink-0 px-6 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-corpo font-medium text-sakura-purple-dark">
                {operador.nome}
              </p>
              <p className="truncate text-rotulo text-sakura-purple-dark/85">
                @{operador.usuario}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {/* Diagnóstico fica FORA do `operador.admin` de propósito: quem
                  liga pedindo socorro é quem está no balcão com o cliente na
                  frente, e não é ele quem tem senha de administrador. */}
              <NavLink
                to="/diagnostico"
                title="Diagnóstico"
                className={({ isActive }) =>
                  `rounded-full p-2 transition-all ${
                    isActive
                      ? "bg-sakura-purple/20 text-sakura-pink"
                      : "text-sakura-purple-dark/85 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <IconeDiagnostico className="h-5 w-5" />
              </NavLink>
              {operador.admin && (
                <>
                  <NavLink
                    to="/auditoria"
                    title="Auditoria"
                    className={({ isActive }) =>
                      `rounded-full p-2 transition-all ${
                        isActive
                          ? "bg-sakura-purple/20 text-sakura-pink"
                          : "text-sakura-purple-dark/85 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <IconeAuditoria className="h-5 w-5" />
                  </NavLink>
                  <NavLink
                    to="/configuracoes"
                    title="Configurações"
                    className={({ isActive }) =>
                      `rounded-full p-2 transition-all ${
                        isActive
                          ? "bg-sakura-purple/20 text-sakura-pink"
                          : "text-sakura-purple-dark/85 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <IconeEngrenagem className="h-5 w-5" />
                  </NavLink>
                </>
              )}
            </div>
          </div>
          <LojaSwitcher />
          <button
            onClick={() => logout()}
            className="mt-2 text-rotulo font-medium text-sakura-purple hover:underline"
          >
            Sair
          </button>
        </div>
      )}
    </aside>
  );
}

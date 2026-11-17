import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { temPermissao } from "@/types/operador";
import type { ModuloChave } from "@/types/operador";

function AcessoNegado() {
  return (
    <div className="sakura-card p-8 text-center">
      <p className="text-corpo text-texto/90">
        Você não tem permissão para acessar este módulo. Fale com o administrador.
      </p>
    </div>
  );
}

// Com uma lista, basta ter UM dos módulos — é o caso de tela que pertence a
// mais de um (a ficha do veículo é tanto de Clientes quanto de Ordens de
// Serviço).
export function PermissaoRoute({
  modulo,
  children,
}: {
  modulo: ModuloChave | ModuloChave[];
  children: ReactNode;
}) {
  const { operador } = useAuth();
  const modulos = Array.isArray(modulo) ? modulo : [modulo];
  if (!modulos.some((m) => temPermissao(operador, m))) return <AcessoNegado />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { operador } = useAuth();
  if (!operador?.admin) return <AcessoNegado />;
  return <>{children}</>;
}

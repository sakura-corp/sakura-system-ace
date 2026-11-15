import { CircleCheck } from "lucide-react";
import { useSyncExternalStore } from "react";
import { assinarAvisos, avisosAtuais } from "@/lib/avisoQueSome";

/**
 * Onde os avisos que somem sozinhos aparecem: embaixo, no meio, com o visto
 * verde (visual novo, #990, seção 6 das regras). Montado UMA vez, no App; as
 * telas só chamam `avisar("OS 148 faturada")`, de `@/lib/avisoQueSome`.
 *
 * A região com `role="status"` fica sempre na tela, mesmo vazia: o leitor de
 * tela só anuncia o que ENTRA numa região que ele já conhecia. Criada junto
 * com o primeiro aviso, esse primeiro passaria calado.
 */
export function AvisosQueSomem() {
  const avisos = useSyncExternalStore(assinarAvisos, avisosAtuais, avisosAtuais);

  return (
    <div
      role="status"
      aria-live="polite"
      // Não pega clique: o aviso fica por cima da tela sem tampar o botão que
      // estiver embaixo dele.
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className="flex max-w-[min(32rem,100%)] items-center gap-2.5 rounded-[14px] border border-linha-forte bg-passar py-3 pl-3.5 pr-[18px] text-corpo font-medium text-texto shadow-[0_18px_40px_rgba(0,0,0,0.6)]"
        >
          <CircleCheck aria-hidden="true" className="size-[18px] shrink-0 text-ok" />
          <span className="min-w-0">{aviso.texto}</span>
        </div>
      ))}
    </div>
  );
}

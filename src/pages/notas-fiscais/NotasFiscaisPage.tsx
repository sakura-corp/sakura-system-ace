import { useState } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { TipoNotaFiscal } from "@/types/notaFiscal";
import { ArquivosSection } from "./ArquivosSection";

export function NotasFiscaisPage() {
  const [aba, setAba] = useState<TipoNotaFiscal>("nfe");

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <BotaoVoltar />
        <div>
          <h1 className="text-titulo font-semibold text-sakura-purple-dark">Notas Fiscais</h1>
          <p className="text-corpo text-sakura-muted">
            As notas de cada mês: as emitidas pelo sistema entram aqui sozinhas, e as feitas
            por fora você envia pelo XML.
          </p>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-corpo text-amber-800">
          O Supabase ainda não está configurado. Defina{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>{" "}
          no arquivo <code>.env</code> para começar a enviar arquivos de verdade.
        </p>
      )}

      <div className="flex gap-1 border-b border-sakura-gray/30">
        <AbaBotao label="NFe" ativa={aba === "nfe"} onClick={() => setAba("nfe")} />
        <AbaBotao label="NFS-e" ativa={aba === "nfse"} onClick={() => setAba("nfse")} />
      </div>

      {isSupabaseConfigured && <ArquivosSection tipo={aba} />}
    </div>
  );
}

function AbaBotao({
  label,
  ativa,
  onClick,
}: {
  label: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-corpo font-medium transition-colors ${
        ativa
          ? "border-b-2 border-sakura-purple text-sakura-purple-dark"
          : "text-sakura-purple-dark/85 hover:text-sakura-purple-dark"
      }`}
    >
      {label}
    </button>
  );
}

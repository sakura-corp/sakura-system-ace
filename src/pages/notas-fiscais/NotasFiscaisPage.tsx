import { useState } from "react";
import { Abas } from "@/components/Abas";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import type { TipoNotaFiscal } from "@/types/notaFiscal";
import { ArquivosSection } from "./ArquivosSection";

// As abas dizem o que tem em cada uma, com a sigla junto (visual novo,
// tarefa 12, #990): "NFC-e" sozinho é nome de quem programa. Os mesmos nomes
// da "Nota do cliente" das Ordens de Serviço (tarefa 7).
const ABAS: { valor: TipoNotaFiscal; nome: string }[] = [
  { valor: "nfe", nome: "Notas das peças (NFC-e)" },
  { valor: "nfse", nome: "Notas dos serviços (NFS-e)" },
];

export function NotasFiscaisPage() {
  const [aba, setAba] = useState<TipoNotaFiscal>("nfe");
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <BotaoVoltar />
        <div className="min-w-0">
          <h1 className="font-titulo text-titulo font-bold text-texto">Notas Fiscais</h1>
          <p className="text-corpo text-texto-2">
            As notas de cada mês: as emitidas pelo sistema entram aqui sozinhas, e as feitas
            por fora você envia pelo XML.
          </p>
        </div>
      </header>

      <Abas
        rotulo="Qual tipo de nota"
        ativa={aba}
        aoEscolher={setAba}
        prefixoId="aba-notas"
        painel="painel-notas"
        abas={ABAS}
      />

      <div role="tabpanel" id="painel-notas" aria-labelledby={`aba-notas-${aba}`}>
        <ArquivosSection tipo={aba} />
      </div>
    </div>
  );
}

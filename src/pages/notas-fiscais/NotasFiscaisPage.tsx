import { useRef, useState, type KeyboardEvent } from "react";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import type { TipoNotaFiscal } from "@/types/notaFiscal";
import { ArquivosSection } from "./ArquivosSection";

// As abas dizem o que tem em cada uma, com a sigla junto (visual novo,
// tarefa 12, #990): "NFC-e" sozinho é nome de quem programa. Os mesmos nomes
// da "Nota do cliente" das Ordens de Serviço (tarefa 7).
const ABAS: { tipo: TipoNotaFiscal; rotulo: string }[] = [
  { tipo: "nfe", rotulo: "Notas das peças (NFC-e)" },
  { tipo: "nfse", rotulo: "Notas dos serviços (NFS-e)" },
];

// A aba no visual novo: a palavra na cor do texto e em negrito, e um traço
// laranja embaixo (o laranja é da ação, e "a aba ativa" é um dos lugares dele,
// regra 2). A aparência segue o `aria-selected`, o mesmo estado que o leitor
// de tela anuncia. Igual à `sakura-aba` da tarefa 7, escrita aqui porque
// aquela ainda não está na `main` (sugestão no PR: trocar pela classe quando
// ela entrar).
//
// O traço é uma constante à parte de propósito: ele é um risco de 2 px
// EMBAIXO da palavra, não o fundo dela. Juntos na mesma string, o
// `npm run contraste` lê "fundo laranja com letra clara" e avisa à toa.
const TRACO_DA_ABA =
  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:content-[''] aria-selected:after:bg-acao";
const CLASSE_ABA = [
  "relative rounded-t-[10px] px-4 pb-3 pt-2.5 text-corpo font-medium text-texto-2 transition-colors",
  "hover:bg-passar hover:text-texto aria-selected:font-semibold aria-selected:text-texto",
  TRACO_DA_ABA,
].join(" ");

export function NotasFiscaisPage() {
  const [aba, setAba] = useState<TipoNotaFiscal>("nfe");
  const abasRef = useRef<(HTMLButtonElement | null)[]>([]);

  // As setas trocam de aba e dão a volta, Home e End vão pras pontas (o
  // padrão das abas da WAI-ARIA): o Tab sai das abas direto pra lista, sem
  // passar pela outra aba.
  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const atual = ABAS.findIndex((a) => a.tipo === aba);
    let proxima: number;
    if (evento.key === "ArrowRight") proxima = (atual + 1) % ABAS.length;
    else if (evento.key === "ArrowLeft") proxima = (atual - 1 + ABAS.length) % ABAS.length;
    else if (evento.key === "Home") proxima = 0;
    else if (evento.key === "End") proxima = ABAS.length - 1;
    else return;
    evento.preventDefault();
    setAba(ABAS[proxima].tipo);
    abasRef.current[proxima]?.focus();
  }

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

      <div
        role="tablist"
        aria-label="Qual tipo de nota"
        onKeyDown={aoTeclar}
        className="flex gap-1 border-b border-linha"
      >
        {ABAS.map(({ tipo, rotulo }, indice) => (
          <button
            key={tipo}
            ref={(elemento) => {
              abasRef.current[indice] = elemento;
            }}
            type="button"
            role="tab"
            id={`aba-notas-${tipo}`}
            aria-selected={aba === tipo}
            aria-controls="painel-notas"
            tabIndex={aba === tipo ? 0 : -1}
            onClick={() => setAba(tipo)}
            className={CLASSE_ABA}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="painel-notas" aria-labelledby={`aba-notas-${aba}`}>
        <ArquivosSection tipo={aba} />
      </div>
    </div>
  );
}

interface AvisoRascunhoProps {
  // Complemento da frase "Encontramos um rascunho não salvo ___."
  // Ex: "deste cliente", "desta ordem de serviço".
  descricao: string;
  onRestaurar: () => void;
  onDescartar: () => void;
}

// Faixa que aparece no topo de um formulário quando o autosave local guardou
// algo que nunca chegou a ser salvo de verdade (app fechou/recarregou no meio
// do preenchimento). Ver `useRascunho` em hooks/useRascunhoFormulario.ts.
export function AvisoRascunho({
  descricao,
  onRestaurar,
  onDescartar,
}: AvisoRascunhoProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-atencao/[0.12] px-4 py-2 text-corpo text-atencao">
      <span>Encontramos um rascunho não salvo {descricao}. Restaurar?</span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onDescartar}
          className="rounded-lg px-3 py-1 text-rotulo font-medium text-atencao hover:bg-atencao/[0.2]"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={onRestaurar}
          className="rounded-lg bg-atencao px-3 py-1 text-rotulo font-medium text-fundo hover:opacity-90"
        >
          Restaurar
        </button>
      </div>
    </div>
  );
}

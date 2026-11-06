import { useState } from "react";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { cancelarArquivoEmitido } from "@/lib/notasFiscais";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

interface CancelarNotaModalProps {
  arquivo: NotaFiscalArquivo;
  onFechar: () => void;
  onCancelado: () => void;
}

// A Focus NFe exige uma justificativa com pelo menos 15 caracteres pra
// cancelar uma nota — validar aqui evita mandar a chamada só pra ela voltar
// com um erro de validação sobre o tamanho do texto.
const TAMANHO_MINIMO_JUSTIFICATIVA = 15;

export function CancelarNotaModal({ arquivo, onFechar, onCancelado }: CancelarNotaModalProps) {
  const [justificativa, setJustificativa] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleConfirmar() {
    setErro("");
    setCancelando(true);
    try {
      // O porteiro (TR-04.2) confere se esta loja emitiu a nota e se quem
      // pede tem o módulo Notas Fiscais — a tela não precisa mais do token.
      await cancelarArquivoEmitido(arquivo, justificativa.trim());
      onCancelado();
      onFechar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setCancelando(false);
    }
  }

  const justificativaValida = justificativa.trim().length >= TAMANHO_MINIMO_JUSTIFICATIVA;

  return (
    <Modal titulo="Cancelar nota fiscal" onFechar={onFechar}>
      <div className="space-y-4">
        <p className="text-corpo text-sakura-purple-dark/90">
          Isso cancela <strong>{arquivo.nome_arquivo}</strong> direto na SEFAZ/prefeitura, pelo
          serviço de notas. Não dá pra desfazer.
        </p>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Justificativa <span className="text-red-500">*</span> (mínimo{" "}
            {TAMANHO_MINIMO_JUSTIFICATIVA} caracteres)
          </span>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={3}
            placeholder="Ex: nota emitida por engano, valor errado, teste do sistema..."
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo focus:border-sakura-purple"
          />
        </label>

        {erro && <p className="rounded-xl bg-red-50 px-4 py-3 text-corpo text-red-700">{erro}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!justificativaValida || cancelando}
            className="rounded-xl bg-red-600 px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {cancelando ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

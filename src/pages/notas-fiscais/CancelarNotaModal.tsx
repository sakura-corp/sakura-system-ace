import { useId, useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { avisar } from "@/lib/avisoQueSome";
import { mensagemDeErro } from "@/lib/errors";
import { cancelarArquivoEmitido } from "@/lib/notasFiscais";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { AvisoDeErro } from "@/components/Aviso";

interface CancelarNotaModalProps {
  arquivo: NotaFiscalArquivo;
  onFechar: () => void;
  onCancelado: () => void;
}

// A Focus NFe exige uma justificativa com pelo menos 15 caracteres pra
// cancelar uma nota — validar aqui evita mandar a chamada só pra ela voltar
// com um erro de validação sobre o tamanho do texto.
const TAMANHO_MINIMO_JUSTIFICATIVA = 15;

// O botão de confirmar: vermelho cheio com letra branca quando dá pra
// clicar; cinza com a letra secundária quando não (como o botão desligado
// das peças: dá pra ler o que ele faria).
const VERMELHO_LIGADO = "bg-red-600 text-white hover:bg-red-700 active:scale-[0.97]";
const CINZA_DESLIGADO = "cursor-not-allowed bg-passar text-texto-2";

export function CancelarNotaModal({ arquivo, onFechar, onCancelado }: CancelarNotaModalProps) {
  const [justificativa, setJustificativa] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState("");
  const contadorId = useId();

  async function handleConfirmar() {
    setErro("");
    setCancelando(true);
    try {
      // O porteiro (TR-04.2) confere se esta loja emitiu a nota e se quem
      // pede tem o módulo Notas Fiscais — a tela não precisa mais do token.
      await cancelarArquivoEmitido(arquivo, justificativa.trim());
      avisar(`Nota ${arquivo.nome_arquivo} cancelada`);
      onCancelado();
      onFechar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setCancelando(false);
    }
  }

  const justificativaValida = justificativa.trim().length >= TAMANHO_MINIMO_JUSTIFICATIVA;
  const faltam = TAMANHO_MINIMO_JUSTIFICATIVA - justificativa.trim().length;

  // O botão de confirmar é vermelho cheio, com a letra branca: é o único
  // lugar da tela que desfaz uma nota lá fora, e não volta atrás. O `Botao`
  // não tem uma variante "perigo" (sugestão no PR); a forma (altura 40, canto
  // 12) é a dele, e o vermelho-600 dá 4,8:1 com o branco nos dois temas.
  return (
    <Modal
      titulo="Cancelar nota fiscal"
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Voltar
          </Botao>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!justificativaValida || cancelando}
            aria-busy={cancelando || undefined}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-corpo font-semibold transition ${
              justificativaValida && !cancelando ? VERMELHO_LIGADO : CINZA_DESLIGADO
            }`}
          >
            {cancelando ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-corpo text-texto">
          Isso cancela <strong>{arquivo.nome_arquivo}</strong> direto na SEFAZ/prefeitura, pelo
          serviço de notas. Não dá pra desfazer.
        </p>

        <label className="sakura-rotulo">
          <span>
            Justificativa <span className="text-perigo">*</span> (mínimo{" "}
            {TAMANHO_MINIMO_JUSTIFICATIVA} caracteres)
          </span>
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={3}
            aria-describedby={contadorId}
            placeholder="Ex: nota emitida por engano, valor errado, teste do sistema..."
            className="sakura-campo"
          />
        </label>
        <p id={contadorId} className="-mt-2 text-meta text-texto-2">
          {justificativaValida
            ? "Pronto: já dá pra confirmar."
            : `Falta${faltam === 1 ? "" : "m"} ${faltam} caractere${faltam === 1 ? "" : "s"}.`}
        </p>

        {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
      </div>
    </Modal>
  );
}

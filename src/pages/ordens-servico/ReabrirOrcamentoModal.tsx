import { useState } from "react";
import { AvisoDeErro } from "@/components/Aviso";
import { Botao } from "@/components/Botao";
import { Chips } from "@/components/Chips";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import {
  MOTIVOS_REABERTURA,
  MOTIVO_REABERTURA_LABEL,
  erroDaReabertura,
  pecasAvulsas,
  textoDaReabertura,
  validadePadrao,
  type MotivoReabertura,
} from "@/schemas/orcamento";
import type { OrdemServico } from "@/types/os";
import { nomeDocumento } from "@/types/os";

/**
 * "Reabrir o Orçamento N?" (#1181). O orçamento recusado volta pra aberto,
 * com o mesmo número. Motivo obrigatório em um clique ("Cliente voltou e
 * aceitou" já marcado), a validade nova (hoje + 7, dá pra mudar) e a caixinha
 * "Já aprovar agora", que depois de reabrir faz a aprovação de sempre.
 *
 * Quem confere de verdade (recusado, loja, permissão) é o banco
 * (`reabrir_orcamento`, migration 0093); esta janela só monta o texto do
 * histórico, com a recusa antiga, e confere o que falta antes de mandar.
 */

interface ReabrirOrcamentoModalProps {
  ordem: OrdemServico;
  /**
   * `motivo`: o texto do histórico, já com a recusa antiga. `aprovarAgora`:
   * com a caixinha marcada, quem aprovou; senão `null`. Erro fica na janela.
   */
  onConfirmar: (motivo: string, validade: string, aprovarAgora: { aprovadoPor: string } | null) => Promise<void>;
  onFechar: () => void;
}

const inputClasse = "rounded-lg border border-borda-campo px-3 py-2 text-corpo text-texto";

export function ReabrirOrcamentoModal({ ordem, onConfirmar, onFechar }: ReabrirOrcamentoModalProps) {
  const [motivo, setMotivo] = useState<MotivoReabertura>("cliente_voltou");
  const [outroTexto, setOutroTexto] = useState("");
  const [validade, setValidade] = useState(() => validadePadrao());
  const [aprovarAgora, setAprovarAgora] = useState(false);
  const [aprovadoPor, setAprovadoPor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Peça digitada sem cadastro precisa ser ligada ao cadastro na aprovação
  // (#1128), e isso é a janela da aprovação do orçamento: aqui não dá.
  const temAvulsa = pecasAvulsas(ordem.itens ?? []).length > 0;

  async function reabrir() {
    const problema = erroDaReabertura(motivo, outroTexto, validade);
    if (problema) {
      setErro(problema);
      return;
    }
    if (aprovarAgora && !aprovadoPor.trim()) {
      setErro("Diga quem aprovou (ex.: o cliente, no balcão) ou desmarque \"Já aprovar agora\".");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await onConfirmar(
        textoDaReabertura(motivo, outroTexto, ordem),
        validade,
        aprovarAgora ? { aprovadoPor: aprovadoPor.trim() } : null,
      );
    } catch (err) {
      console.error("Erro ao reabrir o orçamento:", err);
      setErro(mensagemDeErro(err));
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={`Reabrir o ${nomeDocumento(ordem)}?`}
      descricao="Volta pra orçamento aberto, com o mesmo número. Fica registrado no histórico, com o motivo."
      // Esc, ✕ e clique fora não fecham no meio do envio.
      onFechar={() => {
        if (!enviando) onFechar();
      }}
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao variante="principal" onClick={() => void reabrir()} ocupado={enviando}>
            Reabrir
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        {erro && <AvisoDeErro className="text-corpo">{erro}</AvisoDeErro>}

        <div className="space-y-2">
          <p className="text-corpo text-texto">Por que reabrir?</p>
          <Chips
            rotulo="Por que reabrir?"
            opcoes={MOTIVOS_REABERTURA.map((m) => ({ valor: m, nome: MOTIVO_REABERTURA_LABEL[m] }))}
            valor={motivo}
            aoEscolher={(m) => {
              setMotivo(m);
              setErro(null);
            }}
          />
          {motivo === "outro" && (
            <label className="flex flex-col gap-2 text-corpo">
              Qual o motivo?
              <input
                type="text"
                value={outroTexto}
                onChange={(e) => setOutroTexto(e.target.value)}
                placeholder="Ex.: pediu pra trocar a marca do pneu"
                className={inputClasse}
              />
            </label>
          )}
        </div>

        <label className="flex flex-col gap-2 text-corpo">
          Nova validade
          <input
            type="date"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            className={inputClasse}
          />
        </label>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-corpo">
            <input
              type="checkbox"
              checked={aprovarAgora}
              disabled={temAvulsa}
              onChange={(e) => setAprovarAgora(e.target.checked)}
            />
            Já aprovar agora (vira OS em andamento e as peças saem do estoque)
          </label>
          {temAvulsa && (
            <p className="text-rotulo text-texto-2">
              Este orçamento tem peça digitada sem cadastro: depois de reabrir, aprove pelo
              orçamento, que pede pra ligar a peça ao cadastro.
            </p>
          )}
          {aprovarAgora && (
            <label className="flex flex-col gap-2 text-corpo">
              Quem aprovou?
              <input
                type="text"
                value={aprovadoPor}
                onChange={(e) => setAprovadoPor(e.target.value)}
                placeholder="Ex.: o cliente, no balcão"
                className={inputClasse}
              />
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}

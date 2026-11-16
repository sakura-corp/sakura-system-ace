import { FileText } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { VerDanfeModal } from "@/pages/notas-fiscais/VerDanfeModal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";
import { fraseDaEscolha, rotuloDaNota } from "./notaDoCliente";

/**
 * "Nota do cliente" (pedido da Sofia, 15/11; decidido em 16/11): da linha da
 * OS finalizada direto pra nota, sem ir até Notas Fiscais procurar. Abre a
 * janela de nota que já existe (`VerDanfeModal`: ver, imprimir e baixar o PDF
 * pra mandar). Com duas notas (peças e serviço), primeiro a pessoa escolhe
 * qual. Nada muda na emissão nem no conteúdo da nota.
 */
export function NotaDoClienteModal({
  documento,
  venda,
  notas,
  onFechar,
}: {
  /** "OS 148", "Venda 149". */
  documento: string;
  /** Venda de balcão (muda a frase: "Esta venda tem..."). */
  venda: boolean;
  /** Já filtradas por `notasDoCliente`. */
  notas: NotaFiscalArquivo[];
  onFechar: () => void;
}) {
  const [escolhida, setEscolhida] = useState<NotaFiscalArquivo | null>(
    notas.length === 1 ? notas[0] : null,
  );

  if (escolhida) {
    return (
      <VerDanfeModal
        arquivo={escolhida}
        onFechar={notas.length === 1 ? onFechar : () => setEscolhida(null)}
      />
    );
  }

  return (
    <Modal
      titulo={`Nota do cliente · ${documento}`}
      descricao={fraseDaEscolha(venda, notas)}
      onFechar={onFechar}
    >
      <div className="flex flex-col gap-2">
        {notas.map((nota) => (
          <Botao key={nota.id} icone={<FileText />} onClick={() => setEscolhida(nota)}>
            {rotuloDaNota(nota, notas)}
          </Botao>
        ))}
      </div>
    </Modal>
  );
}

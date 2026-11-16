import { FileText } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { VerDanfeModal } from "@/pages/notas-fiscais/VerDanfeModal";
import type { NotaFiscalArquivo } from "@/types/notaFiscal";

/**
 * As notas que dá pra abrir pelo programa: as que ele mesmo emitiu e não
 * foram canceladas (a mesma regra do Fechamento, que mostra o "Ver PDF").
 */
export function notasDoCliente(notas: NotaFiscalArquivo[]): NotaFiscalArquivo[] {
  return notas.filter((nota) => nota.origem === "automatica" && nota.status !== "cancelado");
}

/** O nome de cada nota pra quem está no balcão, sem sigla sozinha. */
export function nomeDaNota(nota: NotaFiscalArquivo): string {
  return nota.tipo === "nfe" ? "Nota das peças (NFC-e)" : "Nota do serviço (NFS-e)";
}

/**
 * "Nota do cliente" (pedido da Sofia, 15/11; decidido em 16/11): da linha da
 * OS finalizada direto pra nota, sem ir até Notas Fiscais procurar. Abre a
 * janela de nota que já existe (`VerDanfeModal`: ver, imprimir e baixar o PDF
 * pra mandar). Com duas notas (peças e serviço), primeiro a pessoa escolhe
 * qual. Nada muda na emissão nem no conteúdo da nota.
 */
export function NotaDoClienteModal({
  documento,
  notas,
  onFechar,
}: {
  /** "OS 148", "Venda 149". */
  documento: string;
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
      descricao="Esta OS tem duas notas. Qual você quer ver, imprimir ou mandar?"
      onFechar={onFechar}
    >
      <div className="flex flex-col gap-2">
        {notas.map((nota) => (
          <Botao key={nota.id} icone={<FileText />} onClick={() => setEscolhida(nota)}>
            {nomeDaNota(nota)}
          </Botao>
        ))}
      </div>
    </Modal>
  );
}

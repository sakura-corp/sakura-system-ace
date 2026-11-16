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

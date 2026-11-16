import { CircleX } from "lucide-react";
import { Selo } from "@/components/Selo";
import { STATUS_LABEL, type StatusOS } from "@/types/os";

/**
 * O status de uma OS nas fichas (do cliente e do veículo), no visual novo
 * (tarefa 8, #990): o `Selo`, com cor, ícone e palavra (regras, seções 2 e 3).
 *
 * | status                  | selo                      |
 * |-------------------------|---------------------------|
 * | em andamento            | azul, "Em andamento"      |
 * | concluída (falta faturar) | amarelo, "Concluída"    |
 * | faturada                | verde, "Faturada"         |
 * | orçamento               | cinza, "Orçamento"        |
 * | recusado                | cinza, "Recusado"         |
 *
 * As palavras vêm de `STATUS_LABEL`, a mesma fonte do resto do programa.
 *
 * Aqui "faturada" é verde, e não amarela como na lista de OS (que sabe das
 * notas fiscais e diz "falta nota"): as fichas só leem o status da OS, não as
 * notas, e dizer "falta nota" ou "finalizada" sem saber seria palpite. Quando
 * a tarefa 7 entrar, vale ligar as fichas ao `SeloDaOrdem` dela (sugestão no
 * PR da tarefa 8).
 */
export function SeloDoStatusDaOrdem({ status }: { status: StatusOS }) {
  const palavra = STATUS_LABEL[status];
  switch (status) {
    case "em_andamento":
      return <Selo tipo="info" palavra={palavra} />;
    case "concluida":
      return <Selo tipo="atencao" palavra={palavra} />;
    case "faturada":
      return <Selo tipo="ok" palavra={palavra} />;
    case "recusado":
      return <Selo tipo="neutro" palavra={palavra} icone={CircleX} />;
    default:
      return <Selo tipo="neutro" palavra={palavra} />;
  }
}

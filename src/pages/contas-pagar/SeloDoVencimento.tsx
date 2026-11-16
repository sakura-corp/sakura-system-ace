import { CalendarClock } from "lucide-react";
import { Selo } from "@/components/Selo";
import { situacaoDoVencimento } from "./vencimento";

/**
 * O selo da coluna "Status" das contas pendentes (visual novo, #990, regra 4:
 * ícone e palavra junto da cor). Atrasada é vermelho com o triângulo; vence
 * hoje é amarelo com o relógio; a vencer é neutro, pra o amarelo e o vermelho
 * saltarem. Vale pra Contas a Pagar e a Receber.
 */
export function SeloDoVencimento({ vencimento, hoje }: { vencimento: string; hoje: string }) {
  switch (situacaoDoVencimento(vencimento, hoje)) {
    case "atrasada":
      return <Selo tipo="perigo" palavra="Atrasada" />;
    case "vence_hoje":
      return <Selo tipo="atencao" palavra="Vence hoje" />;
    default:
      return <Selo tipo="neutro" palavra="A vencer" icone={CalendarClock} />;
  }
}

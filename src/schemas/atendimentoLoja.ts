import { z } from "zod";
import type { ConfiguracaoAtendimento } from "@/types/configuracao";

/**
 * O atendimento e a garantia dos serviços da loja, como a tela de Configurações
 * os valida (#1033): WhatsApp (10 a 13 dígitos), horário de funcionamento (até
 * 80 letras) e garantia em dias (1 a 3650). Tudo opcional. O banco tem as mesmas
 * travas (migration 0094); aqui a mensagem chega antes do erro dele.
 */
export const atendimentoLojaSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    // Só número e os sinais da máscara: letra ("ramal 2") é recusada, nunca descartada calada.
    .refine((v) => v === "" || (/^[\d\s()+.-]+$/.test(v) && /^\d{10,13}$/.test(v.replace(/\D/g, ""))), {
      message: "O WhatsApp precisa ter de 10 a 13 números, com o DDD.",
    }),
  horario_funcionamento: z.string().trim().max(80, "O horário pode ter no máximo 80 letras."),
  garantia_servico_dias: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 3650), {
      message: "A garantia precisa ser um número inteiro de dias, de 1 a 3.650.",
    }),
});

export type AtendimentoLojaFormValores = z.infer<typeof atendimentoLojaSchema>;

/** O que `salvarConfiguracaoAtendimento` recebe. */
export type DadosAtendimento = Omit<ConfiguracaoAtendimento, "loja_id">;

/** Do formulário (já validado) pro que vai ao banco: dígitos, trim e vazio = null. */
export function paraConfiguracaoAtendimento(v: AtendimentoLojaFormValores): DadosAtendimento {
  const whatsapp = v.whatsapp.replace(/\D/g, "");
  const horario = v.horario_funcionamento.trim();
  const dias = v.garantia_servico_dias.trim();
  return {
    whatsapp: whatsapp === "" ? null : whatsapp,
    horario_funcionamento: horario === "" ? null : horario,
    garantia_servico_dias: dias === "" ? null : Number(dias),
  };
}

/** "16955500199" → "(16) 95550-0199"; com 55 na frente → "+55 (16) ...". */
function comMascara(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  // 12 ou 13 dígitos: os dois primeiros são o código do país.
  const pais = d.length >= 12 ? `+${d.slice(0, 2)} ` : "";
  const resto = pais ? d.slice(2) : d;
  if (resto.length === 11) return `${pais}(${resto.slice(0, 2)}) ${resto.slice(2, 7)}-${resto.slice(7)}`;
  if (resto.length === 10) return `${pais}(${resto.slice(0, 2)}) ${resto.slice(2, 6)}-${resto.slice(6)}`;
  return digitos;
}

/** Do banco pro formulário. */
export function paraValoresFormularioAtendimento(
  c: ConfiguracaoAtendimento | null,
): AtendimentoLojaFormValores {
  return {
    whatsapp: c?.whatsapp ? comMascara(c.whatsapp) : "",
    horario_funcionamento: c?.horario_funcionamento ?? "",
    garantia_servico_dias: c?.garantia_servico_dias == null ? "" : String(c.garantia_servico_dias),
  };
}

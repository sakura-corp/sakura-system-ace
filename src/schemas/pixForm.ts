import { z } from "zod";
import { sobraTextoNoPix, tipoDaChavePix, type TipoChavePix } from "./pix";
import type { ConfiguracaoPix } from "@/types/configuracao";

/** O formulário do Pix em Configurações (#456). Limites iguais aos da migration 0081. */
export const pixFormSchema = z.object({
  chave: z
    .string()
    .trim()
    .min(1, "Digite a chave Pix.")
    .refine(
      (chave) => tipoDaChavePix(chave) !== null,
      "Não reconheci essa chave. Use CPF, CNPJ, telefone com DDD, e-mail ou chave aleatória.",
    ),
  nome_recebedor: z
    .string()
    .trim()
    .min(1, "Digite o nome de quem recebe.")
    .max(25, "O nome pode ter no máximo 25 letras.")
    .refine(sobraTextoNoPix, "Use letras no nome: símbolo e emoji não entram no Pix."),
  cidade_recebedor: z
    .string()
    .trim()
    .min(1, "Digite a cidade.")
    .max(15, "A cidade pode ter no máximo 15 letras.")
    .refine(sobraTextoNoPix, "Use letras na cidade: símbolo e emoji não entram no Pix."),
});

export type PixFormValues = z.infer<typeof pixFormSchema>;

export const pixFormVazio: PixFormValues = { chave: "", nome_recebedor: "", cidade_recebedor: "" };

export function paraValoresFormularioPix(
  config: ConfiguracaoPix | null,
  sugestao?: { nome?: string | null; cidade?: string | null },
): PixFormValues {
  return {
    chave: config?.chave ?? "",
    nome_recebedor: config?.nome_recebedor ?? (sugestao?.nome ?? "").trim().slice(0, 25),
    cidade_recebedor: config?.cidade_recebedor ?? (sugestao?.cidade ?? "").trim().slice(0, 15),
  };
}

export function paraConfiguracaoPix(
  valores: PixFormValues,
): Pick<ConfiguracaoPix, "chave" | "nome_recebedor" | "cidade_recebedor"> {
  return {
    chave: valores.chave.trim(),
    nome_recebedor: valores.nome_recebedor.trim(),
    cidade_recebedor: valores.cidade_recebedor.trim(),
  };
}

export const ROTULO_TIPO_CHAVE_PIX: Record<TipoChavePix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  telefone: "telefone",
  email: "e-mail",
  aleatoria: "chave aleatória",
};

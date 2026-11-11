import { z } from "zod";

/**
 * O contato da contabilidade da loja, como a tela de Configurações o valida
 * (#383): nome obrigatório, pelo menos WhatsApp ou e-mail, WhatsApp com 10 a 13
 * dígitos (DDD + número, com ou sem o 55). O banco tem as mesmas travas
 * (migration 0083); aqui a mensagem chega antes do erro dele.
 */
export const contatoContabilidadeSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome do contador ou do escritório."),
    whatsapp: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{10,13}$/.test(v.replace(/\D/g, "")), {
        message: "O WhatsApp precisa ter de 10 a 13 números, com o DDD.",
      }),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: "Esse e-mail não parece certo.",
      }),
  })
  .refine((v) => v.whatsapp !== "" || v.email !== "", {
    message: "Informe o WhatsApp ou o e-mail.",
    path: ["whatsapp"],
  });

export type ContatoContabilidadeFormValores = z.infer<typeof contatoContabilidadeSchema>;

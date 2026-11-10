import { z } from "zod";
import type { NovoServico, Servico } from "@/types/servico";

// Intervalo de retorno (FN-06, #381): inteiro maior que zero, ou vazio (o
// serviço não gera lembrete). Texto no formulário, número só na borda. O teto
// é o mesmo da trava `ck_servicos_intervalo` (0083): sem ele, um número
// gigante passava aqui e virava erro técnico no banco, ou uma data inválida
// na conta dos retornos.
export const INTERVALO_MAXIMO_DIAS = 3650;
export const INTERVALO_MAXIMO_KM = 1_000_000;

const intervaloOpcional = (maximo: number, unidade: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) > 0), {
      message: "Use um número inteiro maior que zero, ou deixe vazio.",
    })
    .refine((v) => v === "" || Number(v) <= maximo, {
      message: `No máximo ${maximo.toLocaleString("pt-BR")} ${unidade}.`,
    });

export const servicoFormSchema = z.object({
  codigo_interno: z.string(),
  descricao: z.string().trim().min(1, "Descrição é obrigatória."),
  preco_padrao: z.string(),
  custo: z.string(),
  categoria_id: z.string(),
  intervalo_dias: intervaloOpcional(INTERVALO_MAXIMO_DIAS, "dias (10 anos)"),
  intervalo_km: intervaloOpcional(INTERVALO_MAXIMO_KM, "km"),
});

export type ServicoFormValues = z.infer<typeof servicoFormSchema>;

export function paraValoresFormulario(servico?: Servico): ServicoFormValues {
  return {
    codigo_interno: servico?.codigo_interno ?? "",
    descricao: servico?.descricao ?? "",
    preco_padrao: servico?.preco_padrao?.toString() ?? "",
    custo: servico?.custo?.toString() ?? "",
    categoria_id: servico?.categoria_id ?? "",
    intervalo_dias: servico?.intervalo_dias?.toString() ?? "",
    intervalo_km: servico?.intervalo_km?.toString() ?? "",
  };
}

const paraNumeroOuNulo = (valor: string) => (valor.trim() === "" ? null : Number(valor));

// `ativo` não tem campo nenhum neste formulário (é alternado pela lista, ver
// ServicosPage) — precisa ser repassado de fora pra não resetar um serviço
// inativo pra ativo só por editar outro campo dele.
export function paraNovoServico(valores: ServicoFormValues, ativoAtual: boolean): NovoServico {
  return {
    codigo_interno: valores.codigo_interno.trim() || null,
    descricao: valores.descricao.trim(),
    preco_padrao: paraNumeroOuNulo(valores.preco_padrao),
    custo: paraNumeroOuNulo(valores.custo),
    categoria_id: valores.categoria_id || null,
    intervalo_dias: paraNumeroOuNulo(valores.intervalo_dias),
    intervalo_km: paraNumeroOuNulo(valores.intervalo_km),
    ativo: ativoAtual,
  };
}

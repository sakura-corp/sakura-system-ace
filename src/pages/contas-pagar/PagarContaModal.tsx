import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Info, TriangleAlert } from "lucide-react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { ContaPagar } from "@/types/contaPagar";
import { fraseDoVencimento } from "./vencimento";

interface PagarContaModalProps {
  conta: ContaPagar;
  /** O dia de hoje ("AAAA-MM-DD"), o mesmo que a lista usou pros selos. */
  hoje: string;
  onConfirmar: (valorPago: number, formaPagamento: string) => Promise<void>;
  onFechar: () => void;
}

// Schema pequeno o bastante pra ficar direto no componente — não é um
// formulário de entidade própria (ver "Padrão de formulário" no
// PROJETO_STATUS.md), então não precisa de um arquivo em src/schemas/.
const pagarContaSchema = z.object({
  valor: z.string().refine((v) => Number(v) > 0, "Informe um valor maior que zero."),
  formaPagamento: z.string(),
});

type PagarContaValues = z.infer<typeof pagarContaSchema>;

export function PagarContaModal({ conta, hoje, onConfirmar, onFechar }: PagarContaModalProps) {
  const [erro, setErro] = useState<string | null>(null);
  const idDoErroDoValor = useId();
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PagarContaValues>({
    resolver: zodResolver(pagarContaSchema),
    defaultValues: { valor: String(conta.valor), formaPagamento: "dinheiro" },
  });

  async function aoConfirmar(valores: PagarContaValues) {
    setErro(null);
    try {
      await onConfirmar(Number(valores.valor), valores.formaPagamento);
    } catch (err) {
      console.error("Erro ao marcar conta como paga:", err);
      setErro(mensagemDeErro(err));
    }
  }

  const valorAtual = Number(watch("valor")) || 0;

  return (
    <Modal
      titulo="Marcar como paga"
      total={{ rotulo: "Valor da conta", valor: formatarMoeda(conta.valor) }}
      onFechar={onFechar}
    >
      <form onSubmit={handleSubmit(aoConfirmar)} className="space-y-4 text-corpo">
        <p className="text-texto-2">
          <span className="font-medium text-texto">{conta.descricao}</span> —{" "}
          {fraseDoVencimento(conta.vencimento, hoje)}
          {conta.recorrente ? " · a próxima ocorrência já é criada automaticamente" : ""}
        </p>

        {erro && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-perigo/[0.12] px-3 py-2 text-perigo"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">{erro}</span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <label className="sakura-rotulo">
            Valor pago
            <input
              type="number"
              min="0.01"
              step="0.01"
              aria-invalid={errors.valor ? "true" : undefined}
              aria-describedby={errors.valor ? idDoErroDoValor : undefined}
              {...register("valor")}
              className="sakura-campo"
            />
            {errors.valor && (
              <span id={idDoErroDoValor} className="text-rotulo font-normal text-perigo">
                {errors.valor.message}
              </span>
            )}
          </label>
          <label className="sakura-rotulo">
            Forma de pagamento
            <input type="text" {...register("formaPagamento")} className="sakura-campo" />
          </label>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-poco px-3 py-2 text-rotulo text-texto-2">
          <Info aria-hidden="true" className="mt-px size-4 shrink-0 text-info" />
          <span>
            Isso lança uma Saída de{" "}
            <span className="font-semibold text-texto">{formatarMoeda(valorAtual)}</span> no Caixa
            automaticamente.
          </span>
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Botao variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="principal" ocupado={isSubmitting}>
            {isSubmitting ? "Confirmando..." : "Confirmar pagamento"}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

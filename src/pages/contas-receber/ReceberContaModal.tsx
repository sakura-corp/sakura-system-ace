import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Info } from "lucide-react";
import { Botao } from "@/components/Botao";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import { formatarMoeda } from "@/schemas/dinheiro";
import type { ContaReceber } from "@/types/contaReceber";
import { fraseDaPrevisao } from "@/pages/contas-pagar/vencimento";
import { AvisoDeErro } from "@/components/Aviso";

interface ReceberContaModalProps {
  conta: ContaReceber;
  /** O dia de hoje ("AAAA-MM-DD"), o mesmo que a lista usou pros selos. */
  hoje: string;
  onConfirmar: (valorRecebido: number, formaPagamento: string) => Promise<void>;
  onFechar: () => void;
}

// Schema pequeno o bastante pra ficar direto no componente — mesma decisão
// do PagarContaModal.tsx (não é formulário de entidade própria).
const receberContaSchema = z.object({
  valor: z.string().refine((v) => Number(v) > 0, "Informe um valor maior que zero."),
  formaPagamento: z.string(),
});

type ReceberContaValues = z.infer<typeof receberContaSchema>;

export function ReceberContaModal({ conta, hoje, onConfirmar, onFechar }: ReceberContaModalProps) {
  const [erro, setErro] = useState<string | null>(null);
  const idDoErroDoValor = useId();
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceberContaValues>({
    resolver: zodResolver(receberContaSchema),
    defaultValues: { valor: String(conta.valor), formaPagamento: "dinheiro" },
  });

  async function aoConfirmar(valores: ReceberContaValues) {
    setErro(null);
    try {
      await onConfirmar(Number(valores.valor), valores.formaPagamento);
    } catch (err) {
      console.error("Erro ao marcar conta como recebida:", err);
      setErro(mensagemDeErro(err));
    }
  }

  const valorAtual = Number(watch("valor")) || 0;

  return (
    <Modal
      titulo="Marcar como recebido"
      total={{ rotulo: "Valor da conta", valor: formatarMoeda(conta.valor) }}
      onFechar={onFechar}
    >
      <form onSubmit={handleSubmit(aoConfirmar)} className="space-y-4 text-corpo">
        <p className="text-texto-2">
          <span className="font-medium text-texto">{conta.descricao}</span> —{" "}
          {conta.cliente?.nome ?? "cliente"} · {fraseDaPrevisao(conta.vencimento, hoje)}
        </p>

        {erro && (
          <AvisoDeErro>{erro}</AvisoDeErro>
        )}

        <div className="grid grid-cols-2 gap-4">
          <label className="sakura-rotulo">
            Valor recebido
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
            Isso lança uma Entrada de{" "}
            <span className="font-semibold text-texto">{formatarMoeda(valorAtual)}</span> no Caixa
            automaticamente.
          </span>
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Botao variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="principal" ocupado={isSubmitting}>
            {isSubmitting ? "Confirmando..." : "Confirmar recebimento"}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}

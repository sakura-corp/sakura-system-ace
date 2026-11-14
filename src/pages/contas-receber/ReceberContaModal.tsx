import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import type { ContaReceber } from "@/types/contaReceber";

interface ReceberContaModalProps {
  conta: ContaReceber;
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

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ReceberContaModal({ conta, onConfirmar, onFechar }: ReceberContaModalProps) {
  const [erro, setErro] = useState<string | null>(null);
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
    <Modal titulo="Marcar como recebido" onFechar={onFechar}>
      <form onSubmit={handleSubmit(aoConfirmar)} className="space-y-3 text-corpo">
        <p className="text-sakura-purple-dark/80">
          {conta.descricao} — {conta.cliente?.nome ?? "cliente"} · previsto para{" "}
          {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
        </p>

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>}

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sakura-purple-dark/80">Valor recebido</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              {...register("valor")}
              className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
            />
            {errors.valor && (
              <span className="text-rotulo text-red-600">{errors.valor.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sakura-purple-dark/80">Forma de pagamento</span>
            <input
              type="text"
              {...register("formaPagamento")}
              className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
            />
          </label>
        </div>

        <p className="rounded-lg bg-sakura-pink-soft/60 px-3 py-2 text-rotulo text-sakura-purple-dark/90">
          Isso lança uma Entrada de {formatarMoeda(valorAtual)} no Caixa automaticamente.
        </p>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Confirmando..." : "Confirmar recebimento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

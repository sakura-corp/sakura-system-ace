import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/Modal";
import { mensagemDeErro } from "@/lib/errors";
import type { ContaPagar } from "@/types/contaPagar";

interface PagarContaModalProps {
  conta: ContaPagar;
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

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PagarContaModal({ conta, onConfirmar, onFechar }: PagarContaModalProps) {
  const [erro, setErro] = useState<string | null>(null);
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
    <Modal titulo="Marcar como paga" onFechar={onFechar}>
      <form onSubmit={handleSubmit(aoConfirmar)} className="space-y-3 text-corpo">
        <p className="text-sakura-purple-dark/80">
          {conta.descricao} — venceu em {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
          {conta.recorrente ? " · a próxima ocorrência já é criada automaticamente" : ""}
        </p>

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>}

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sakura-purple-dark/80">Valor pago</span>
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
          Isso lança uma Saída de {formatarMoeda(valorAtual)} no Caixa automaticamente.
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
            {isSubmitting ? "Confirmando..." : "Confirmar pagamento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

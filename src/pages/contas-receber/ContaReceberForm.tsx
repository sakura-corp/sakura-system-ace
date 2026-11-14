import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  contaReceberFormSchema,
  contaReceberFormVazio,
  paraNovaContaReceber,
  type ContaReceberFormValues,
} from "@/schemas/contaReceber";
import type { Cliente } from "@/types/cliente";
import type { NovaContaReceber } from "@/types/contaReceber";

interface ContaReceberFormProps {
  clientes: Cliente[];
  onSalvar: (conta: NovaContaReceber) => Promise<void>;
  onCancelar: () => void;
}

export function ContaReceberForm({ clientes, onSalvar, onCancelar }: ContaReceberFormProps) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContaReceberFormValues>({
    resolver: zodResolver(contaReceberFormSchema),
    defaultValues: contaReceberFormVazio,
  });

  async function aoSubmeter(valores: ContaReceberFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovaContaReceber(valores));
    } catch (err) {
      console.error("Erro ao cadastrar conta a receber:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">Nova conta a receber</h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Cliente <span className="text-red-500">*</span>
          </span>
          <Combobox
            opcoes={clientes.map((cliente) => ({
              valor: cliente.id,
              rotulo: cliente.nome,
            }))}
            valor={watch("cliente_id")}
            onMudar={(v) => setValue("cliente_id", v, { shouldValidate: true })}
            placeholder="Escolha o cliente"
          />
          {errors.cliente_id && (
            <span className="text-rotulo text-red-600">{errors.cliente_id.message}</span>
          )}
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Descrição <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            placeholder="Ex: Acerto de serviço fora de OS"
            {...register("descricao")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.descricao && (
            <span className="text-rotulo text-red-600">{errors.descricao.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Valor <span className="text-red-500">*</span>
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            {...register("valor")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.valor && <span className="text-rotulo text-red-600">{errors.valor.message}</span>}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Previsão de recebimento <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            {...register("vencimento")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.vencimento && (
            <span className="text-rotulo text-red-600">{errors.vencimento.message}</span>
          )}
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Cadastrar"}
        </button>
      </div>
    </form>
  );
}

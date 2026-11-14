import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  movimentoFormSchema,
  movimentoFormVazio,
  paraNovoMovimentoEstoque,
  type MovimentoFormValues,
} from "@/schemas/movimentoEstoque";
import type { Deposito } from "@/types/deposito";
import type { NovoMovimentoEstoque } from "@/types/estoque";
import type { Peca } from "@/types/peca";

interface MovimentoFormProps {
  pecas: Peca[];
  depositos: Deposito[];
  onSalvar: (movimento: NovoMovimentoEstoque) => Promise<void>;
  onCancelar: () => void;
}

const motivos = [
  { valor: "compra", rotulo: "Compra (entrada de fornecedor)" },
  { valor: "venda", rotulo: "Venda" },
  { valor: "ajuste", rotulo: "Ajuste manual" },
  { valor: "uso_em_os", rotulo: "Uso em ordem de serviço" },
] as const;

export function MovimentoForm({ pecas, depositos, onSalvar, onCancelar }: MovimentoFormProps) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MovimentoFormValues>({
    resolver: zodResolver(movimentoFormSchema),
    defaultValues: movimentoFormVazio(pecas[0]?.id ?? "", depositos[0]?.id ?? ""),
  });

  async function aoSubmeter(valores: MovimentoFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoMovimentoEstoque(valores));
      setValue("quantidade", "");
      setValue("referencia", "");
    } catch (err) {
      console.error("Erro ao registrar movimentação:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">Nova movimentação</h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Peça</span>
          <Combobox
            opcoes={pecas.map((peca) => ({ valor: peca.id, rotulo: peca.descricao }))}
            valor={watch("peca_id")}
            onMudar={(v) => setValue("peca_id", v)}
            placeholder={pecas.length === 0 ? "Nenhuma peça cadastrada" : "Selecione a peça"}
          />
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Depósito</span>
          <select
            {...register("deposito_id")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          >
            {depositos.map((deposito) => (
              <option key={deposito.id} value={deposito.id}>
                {deposito.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Tipo</span>
          <select
            {...register("tipo")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Quantidade</span>
          <input
            type="number"
            step="1"
            min="1"
            {...register("quantidade")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.quantidade && (
            <span className="text-rotulo text-red-600">{errors.quantidade.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Motivo</span>
          <select
            {...register("motivo")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          >
            {motivos.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Referência (opcional — ex: nº da nota, nº da OS)
          </span>
          <input
            type="text"
            {...register("referencia")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
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
          disabled={isSubmitting || pecas.length === 0}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Registrar movimentação"}
        </button>
      </div>
    </form>
  );
}

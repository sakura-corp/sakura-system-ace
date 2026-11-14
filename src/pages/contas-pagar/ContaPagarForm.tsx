import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  contaPagarFormSchema,
  contaPagarFormVazio,
  paraNovaContaPagar,
  type ContaPagarFormValues,
} from "@/schemas/contaPagar";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { NovaContaPagar } from "@/types/contaPagar";

interface ContaPagarFormProps {
  categorias: CategoriaCaixa[];
  onSalvar: (conta: NovaContaPagar) => Promise<void>;
  onCancelar: () => void;
}

export function ContaPagarForm({ categorias, onSalvar, onCancelar }: ContaPagarFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  const categoriasSaida = categorias.filter((c) => c.tipo === "saida");

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContaPagarFormValues>({
    resolver: zodResolver(contaPagarFormSchema),
    defaultValues: contaPagarFormVazio,
  });

  async function aoSubmeter(valores: ContaPagarFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovaContaPagar(valores));
    } catch (err) {
      console.error("Erro ao cadastrar conta a pagar:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">Nova conta</h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Descrição <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            placeholder="Ex: Aluguel"
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
            Vencimento <span className="text-red-500">*</span>
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

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Categoria (opcional)</span>
          <Combobox
            opcoes={categoriasSaida.map((categoria) => ({
              valor: categoria.id,
              rotulo: categoria.nome,
            }))}
            valor={watch("categoria_id")}
            onMudar={(v) => setValue("categoria_id", v)}
            opcaoVazia="Sem categoria"
            placeholder="Sem categoria"
          />
        </label>

        <label className="col-span-2 flex items-center gap-2 text-corpo text-sakura-purple-dark/80">
          <input
            type="checkbox"
            {...register("recorrente")}
            className="h-4 w-4 rounded border-sakura-borda-campo"
          />
          Conta mensal recorrente (ao pagar, já cria a próxima automaticamente)
        </label>

        {watch("recorrente") && (
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Recorrente até (opcional)</span>
            <input
              type="date"
              {...register("recorrente_ate")}
              className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
            />
            <span className="text-rotulo text-sakura-muted">
              Deixe em branco pra continuar repetindo sem data pra parar.
            </span>
          </label>
        )}
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

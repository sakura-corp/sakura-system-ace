import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  caixaFormSchema,
  caixaFormVazio,
  paraNovoMovimentoCaixa,
  type CaixaFormValues,
} from "@/schemas/caixa";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { NovoMovimentoCaixa, TipoCaixa } from "@/types/caixa";

interface CaixaFormProps {
  categorias: CategoriaCaixa[];
  tipoInicial?: TipoCaixa;
  tipoBloqueado?: boolean;
  onSalvar: (movimento: NovoMovimentoCaixa) => Promise<void>;
  onCancelar: () => void;
}

export function CaixaForm({
  categorias,
  tipoInicial = "entrada",
  tipoBloqueado = false,
  onSalvar,
  onCancelar,
}: CaixaFormProps) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CaixaFormValues>({
    resolver: zodResolver(caixaFormSchema),
    defaultValues: caixaFormVazio(tipoInicial),
  });

  const tipo = watch("tipo");
  const tipoField = register("tipo");
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  async function aoSubmeter(valores: CaixaFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoMovimentoCaixa(valores));
      setValue("valor", "");
      setValue("descricao", "");
      setValue("categoria_id", "");
    } catch (err) {
      console.error("Erro ao registrar movimento de caixa:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">Novo lançamento</h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Tipo</span>
          <select
            {...tipoField}
            onChange={(e) => {
              tipoField.onChange(e);
              setValue("categoria_id", "");
            }}
            disabled={tipoBloqueado}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple disabled:bg-sakura-gray/10 disabled:text-sakura-muted"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Valor</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            {...register("valor")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.valor && <span className="text-rotulo text-red-400">{errors.valor.message}</span>}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Categoria</span>
          <Combobox
            opcoes={categoriasDoTipo.map((categoria) => ({
              valor: categoria.id,
              rotulo: categoria.nome,
            }))}
            valor={watch("categoria_id")}
            onMudar={(v) => setValue("categoria_id", v, { shouldValidate: true })}
            placeholder="Escolha uma categoria"
            desabilitado={categoriasDoTipo.length === 0}
          />
          {categoriasDoTipo.length === 0 ? (
            <span className="text-rotulo text-amber-300">
              Nenhuma categoria de {tipo === "saida" ? "saída" : "entrada"} cadastrada ainda —
              um administrador cria em Configurações → Categorias de caixa.
            </span>
          ) : (
            errors.categoria_id && (
              <span className="text-rotulo text-red-400">{errors.categoria_id.message}</span>
            )
          )}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Forma de pagamento</span>
          <input
            type="text"
            {...register("forma_pagamento")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Descrição</span>
          <input
            type="text"
            {...register("descricao")}
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
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}

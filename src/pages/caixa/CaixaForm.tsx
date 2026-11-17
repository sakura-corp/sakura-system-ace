import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
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
import { Aviso } from "@/components/Aviso";

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
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-5 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">Novo lançamento</h2>
      </div>

      {erro && (
        <Aviso tipo="perigo" role="alert" className="text-corpo">
          {erro}
        </Aviso>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="sakura-rotulo">
          Tipo
          <select
            {...tipoField}
            onChange={(e) => {
              tipoField.onChange(e);
              setValue("categoria_id", "");
            }}
            disabled={tipoBloqueado}
            className="sakura-campo"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <label className="sakura-rotulo">
          Valor
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            aria-invalid={errors.valor ? true : undefined}
            {...register("valor")}
            className="sakura-campo text-right tabular-nums"
          />
          {errors.valor && <span className="text-rotulo text-perigo">{errors.valor.message}</span>}
        </label>

        <label className="sakura-rotulo">
          Categoria
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
            <span className="flex items-start gap-1.5 text-rotulo font-normal text-atencao">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0">
                Nenhuma categoria de {tipo === "saida" ? "saída" : "entrada"} cadastrada ainda —
                um administrador cria em Configurações → Categorias de caixa.
              </span>
            </span>
          ) : (
            errors.categoria_id && (
              <span className="text-rotulo text-perigo">{errors.categoria_id.message}</span>
            )
          )}
        </label>

        <label className="sakura-rotulo">
          Forma de pagamento
          <input type="text" {...register("forma_pagamento")} className="sakura-campo" />
        </label>

        <label className="sakura-rotulo col-span-2">
          Descrição
          <input type="text" {...register("descricao")} className="sakura-campo" />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao variante="principal" type="submit" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Registrar"}
        </Botao>
      </div>
    </form>
  );
}

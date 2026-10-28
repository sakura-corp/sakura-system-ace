import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { mensagemDeErro } from "@/lib/errors";
import {
  itemPedidoVazio,
  paraItensPedido,
  paraNovoPedidoCompra,
  pedidoCompraFormSchema,
  pedidoCompraFormVazio,
  type PedidoCompraFormValues,
} from "@/schemas/pedidoCompra";
import type { Fornecedor } from "@/types/fornecedor";
import type { NovoItemPedidoCompra, NovoPedidoCompra } from "@/types/pedidoCompra";
import type { PecaJanela } from "@/types/peca";
import { PedidoCompraItemRow } from "./PedidoCompraItemRow";

interface PedidoCompraFormProps {
  fornecedores: Fornecedor[];
  pecas: PecaJanela[];
  onSalvar: (pedido: NovoPedidoCompra, itens: NovoItemPedidoCompra[]) => Promise<void>;
  onCancelar: () => void;
}

const inputClasse =
  "rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple";

export function PedidoCompraForm({
  fornecedores,
  pecas,
  onSalvar,
  onCancelar,
}: PedidoCompraFormProps) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PedidoCompraFormValues>({
    resolver: zodResolver(pedidoCompraFormSchema),
    defaultValues: pedidoCompraFormVazio,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "itens" });

  const rascunho = useRascunho("rascunho-pedido-compra-novo", watch, reset);

  async function aoSubmeter(valores: PedidoCompraFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoPedidoCompra(valores), paraItensPedido(valores.itens));
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao criar pedido de compra:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">Novo pedido de compra</h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao="deste pedido de compra"
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Fornecedor <span className="text-red-500">*</span>
          </span>
          <Combobox
            opcoes={fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))}
            valor={watch("fornecedor_id")}
            onMudar={(v) => setValue("fornecedor_id", v)}
            placeholder="Selecione o fornecedor"
          />
          {errors.fornecedor_id && (
            <span className="text-rotulo text-red-600">{errors.fornecedor_id.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Data do pedido <span className="text-red-500">*</span>
          </span>
          <input type="date" {...register("data_pedido")} className={inputClasse} />
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Observação (opcional)</span>
          <textarea rows={2} {...register("observacao")} className={inputClasse} />
        </label>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-corpo font-semibold text-sakura-purple-dark">Itens do pedido</h3>
          <button
            type="button"
            onClick={() => append({ ...itemPedidoVazio })}
            className="text-rotulo font-medium text-sakura-purple hover:underline"
          >
            + adicionar item
          </button>
        </div>

        {errors.itens?.message && (
          <p className="mb-2 text-rotulo text-red-600">{errors.itens.message}</p>
        )}

        <div className="space-y-2">
          {fields.map((campo, index) => (
            <PedidoCompraItemRow
              key={campo.id}
              index={index}
              register={register}
              watch={watch}
              setValue={setValue}
              pecas={pecas}
              podeRemover={fields.length > 1}
              onRemover={() => remove(index)}
              erroPecaId={errors.itens?.[index]?.peca_id?.message}
            />
          ))}
        </div>
      </section>

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
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Criar pedido"}
        </button>
      </div>
    </form>
  );
}

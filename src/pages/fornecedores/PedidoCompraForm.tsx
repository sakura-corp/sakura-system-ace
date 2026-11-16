import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { ehErroDeRede, mensagemDeErro } from "@/lib/errors";
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
import { AvisoDeErro, CAMPO_NOVO_NO_COMBOBOX } from "@/pages/estoque/avisosEAbas";
import { PedidoCompraItemRow } from "./PedidoCompraItemRow";

interface PedidoCompraFormProps {
  fornecedores: Fornecedor[];
  pecas: PecaJanela[];
  onSalvar: (pedido: NovoPedidoCompra, itens: NovoItemPedidoCompra[]) => Promise<void>;
  onCancelar: () => void;
}

const inputClasse = "sakura-campo";

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
      // Sem rede: o que foi digitado vai pro rascunho na hora, não só aos 30 s.
      if (ehErroDeRede(err)) rascunho.salvarAgora();
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">Novo pedido de compra</h2>
      </div>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao="deste pedido de compra"
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="sakura-rotulo">
          Fornecedor <span className="text-perigo">*</span>
          <Combobox
            className={CAMPO_NOVO_NO_COMBOBOX}
            opcoes={fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))}
            valor={watch("fornecedor_id")}
            onMudar={(v) => setValue("fornecedor_id", v)}
            placeholder="Selecione o fornecedor"
          />
          {errors.fornecedor_id && (
            <span className="text-rotulo text-perigo">{errors.fornecedor_id.message}</span>
          )}
        </label>

        <label className="sakura-rotulo">
          Data do pedido <span className="text-perigo">*</span>
          <input
            type="date"
            {...register("data_pedido")}
            aria-invalid={errors.data_pedido ? true : undefined}
            className={inputClasse}
          />
        </label>

        <label className="sakura-rotulo col-span-2">
          Observação (opcional)
          <textarea rows={2} {...register("observacao")} className={inputClasse} />
        </label>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-titulo text-corpo font-semibold text-texto">Itens do pedido</h3>
          <Botao tamanho="pequeno" onClick={() => append({ ...itemPedidoVazio })}>
            + adicionar item
          </Botao>
        </div>

        {errors.itens?.message && (
          <p className="mb-2 text-rotulo text-perigo">{errors.itens.message}</p>
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
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="principal" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Criar pedido"}
        </Botao>
      </div>
    </form>
  );
}

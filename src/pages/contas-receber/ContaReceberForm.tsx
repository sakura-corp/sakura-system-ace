import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
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
import { AvisoDeErro } from "@/components/Aviso";

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
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-5 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-texto">Nova conta a receber</h2>
      </div>

      {erro && (
        <AvisoDeErro>{erro}</AvisoDeErro>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="sakura-rotulo col-span-2">
          <span>
            Cliente <span className="text-perigo">*</span>
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
            <span className="text-rotulo font-normal text-perigo">{errors.cliente_id.message}</span>
          )}
        </label>

        <label className="sakura-rotulo col-span-2">
          <span>
            Descrição <span className="text-perigo">*</span>
          </span>
          <input
            type="text"
            placeholder="Ex: Acerto de serviço fora de OS"
            aria-invalid={errors.descricao ? "true" : undefined}
            {...register("descricao")}
            className="sakura-campo"
          />
          {errors.descricao && (
            <span className="text-rotulo font-normal text-perigo">{errors.descricao.message}</span>
          )}
        </label>

        <label className="sakura-rotulo">
          <span>
            Valor <span className="text-perigo">*</span>
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            aria-invalid={errors.valor ? "true" : undefined}
            {...register("valor")}
            className="sakura-campo"
          />
          {errors.valor && <span className="text-rotulo font-normal text-perigo">{errors.valor.message}</span>}
        </label>

        <label className="sakura-rotulo">
          <span>
            Previsão de recebimento <span className="text-perigo">*</span>
          </span>
          <input
            type="date"
            aria-invalid={errors.vencimento ? "true" : undefined}
            {...register("vencimento")}
            className="sakura-campo"
          />
          {errors.vencimento && (
            <span className="text-rotulo font-normal text-perigo">{errors.vencimento.message}</span>
          )}
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="principal" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Cadastrar"}
        </Botao>
      </div>
    </form>
  );
}

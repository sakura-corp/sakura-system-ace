import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AvisoRascunho } from "@/components/AvisoRascunho";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { useRascunho } from "@/hooks/useRascunhoFormulario";
import { ehErroDeRede, mensagemDeErro } from "@/lib/errors";
import {
  type ClienteFormValues,
  clienteFormSchema,
  paraNovoCliente,
  paraValoresFormulario,
  paraVeiculosPreenchidos,
} from "@/schemas/cliente";
import type { Cliente, NovoCliente, VeiculoFormulario } from "@/types/cliente";
import { DadosClienteFields } from "./campos/DadosClienteFields";
import { EnderecoFields } from "./campos/EnderecoFields";
import { VeiculosFields } from "./campos/VeiculosFields";

interface ClienteFormProps {
  clienteExistente?: Cliente;
  onSalvar: (cliente: NovoCliente, veiculos: VeiculoFormulario[]) => Promise<void>;
  onCancelar: () => void;
}

export function ClienteForm({
  clienteExistente,
  onSalvar,
  onCancelar,
}: ClienteFormProps) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: paraValoresFormulario(clienteExistente),
  });

  const rascunho = useRascunho(
    `rascunho-cliente-${clienteExistente?.id ?? "novo"}`,
    watch,
    reset,
  );

  async function aoSubmeter(valores: ClienteFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoCliente(valores), paraVeiculosPreenchidos(valores.veiculos));
      rascunho.limpar();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      // Sem rede: o que foi digitado vai pro rascunho na hora, não só aos 30 s.
      if (ehErroDeRede(err)) rascunho.salvarAgora();
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
          {clienteExistente ? "Editar cliente" : "Novo cliente"}
        </h2>
      </div>

      {erro && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">
          {erro}
        </p>
      )}

      {rascunho.rascunho && (
        <AvisoRascunho
          descricao="deste cliente"
          onRestaurar={rascunho.restaurar}
          onDescartar={rascunho.descartar}
        />
      )}

      <div className="space-y-6 sakura-card p-6 shadow-sm">
        <DadosClienteFields
          register={register}
          errors={errors}
          tipoPessoa={watch("tipo_pessoa")}
        />
        <EnderecoFields register={register} setValue={setValue} />
      </div>

      <div className="sakura-card p-6 shadow-sm">
        <VeiculosFields control={control} register={register} watch={watch} setValue={setValue} />
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
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting
            ? "Salvando..."
            : clienteExistente
              ? "Salvar alterações"
              : "Salvar cliente"}
        </button>
      </div>
    </form>
  );
}

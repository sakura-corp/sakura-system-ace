import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { CampoDoMolde } from "@/components/molde/CampoDoMolde";
import { MoldeFormulario, SecaoDoFormulario } from "@/components/molde/MoldeFormulario";
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

/**
 * A "Nova conta" de Contas a Receber, em janela (molde de formulário da leva
 * 8, #1094). Na ordem da conversa do balcão: quem deve, o quê, quanto e
 * quando promete pagar.
 */
export function ContaReceberForm({ clientes, onSalvar, onCancelar }: ContaReceberFormProps) {
  const [erro, setErro] = useState<string | undefined>();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ContaReceberFormValues>({
    resolver: zodResolver(contaReceberFormSchema),
    defaultValues: contaReceberFormVazio,
  });

  async function aoSubmeter(valores: ContaReceberFormValues) {
    setErro(undefined);
    try {
      await onSalvar(paraNovaContaReceber(valores));
    } catch (err) {
      console.error("Erro ao cadastrar conta a receber:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <MoldeFormulario
      em="janela"
      titulo="Nova conta a receber"
      descricao="Pra cobrança que não passou por OS. As de OS faturada “a receber” já aparecem sozinhas."
      rotuloDoEnviar="Cadastrar conta"
      aoEnviar={handleSubmit(aoSubmeter)}
      aoCancelar={onCancelar}
      erro={erro}
    >
      <SecaoDoFormulario>
        <CampoDoMolde rotulo="Cliente" obrigatorio largura="inteira" erro={errors.cliente_id?.message}>
          {(campo) => (
            <Combobox
              id={campo.id}
              opcoes={clientes.map((cliente) => ({
                valor: cliente.id,
                rotulo: cliente.nome,
              }))}
              valor={watch("cliente_id")}
              onMudar={(v) => setValue("cliente_id", v, { shouldValidate: true })}
              placeholder="Escolha o cliente"
            />
          )}
        </CampoDoMolde>

        <CampoDoMolde rotulo="Descrição" obrigatorio largura="inteira" erro={errors.descricao?.message}>
          {(campo) => (
            <input
              {...campo}
              type="text"
              placeholder="Ex: Acerto de serviço fora de OS"
              {...register("descricao")}
            />
          )}
        </CampoDoMolde>

        <CampoDoMolde rotulo="Valor" obrigatorio erro={errors.valor?.message}>
          {(campo) => (
            <input
              {...campo}
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              className={`${campo.className} text-right tabular-nums`}
              {...register("valor")}
            />
          )}
        </CampoDoMolde>

        <CampoDoMolde rotulo="Previsão de recebimento" obrigatorio erro={errors.vencimento?.message}>
          {(campo) => <input {...campo} type="date" {...register("vencimento")} />}
        </CampoDoMolde>
      </SecaoDoFormulario>
    </MoldeFormulario>
  );
}

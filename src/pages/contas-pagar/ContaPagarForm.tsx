import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { CampoDoMolde } from "@/components/molde/CampoDoMolde";
import { MoldeFormulario, SecaoDoFormulario } from "@/components/molde/MoldeFormulario";
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

/**
 * A "Nova conta" de Contas a Pagar, em janela (molde de formulário da leva 8,
 * #1094): antes o formulário abria em cima da lista e empurrava tudo pra
 * baixo. Os campos na ordem da conversa: o que é, quanto, quando vence, a
 * categoria e se repete todo mês.
 */
export function ContaPagarForm({ categorias, onSalvar, onCancelar }: ContaPagarFormProps) {
  const [erro, setErro] = useState<string | undefined>();
  const categoriasSaida = categorias.filter((c) => c.tipo === "saida");

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ContaPagarFormValues>({
    resolver: zodResolver(contaPagarFormSchema),
    defaultValues: contaPagarFormVazio,
  });

  async function aoSubmeter(valores: ContaPagarFormValues) {
    setErro(undefined);
    try {
      await onSalvar(paraNovaContaPagar(valores));
    } catch (err) {
      console.error("Erro ao cadastrar conta a pagar:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <MoldeFormulario
      em="janela"
      titulo="Nova conta a pagar"
      descricao="Conta com vencimento (aluguel, luz, fornecedor). Ao pagar, sai do Caixa sozinha."
      rotuloDoEnviar="Cadastrar conta"
      aoEnviar={handleSubmit(aoSubmeter)}
      aoCancelar={onCancelar}
      erro={erro}
    >
      <SecaoDoFormulario>
        <CampoDoMolde rotulo="Descrição" obrigatorio largura="inteira" erro={errors.descricao?.message}>
          {(campo) => <input {...campo} type="text" placeholder="Ex: Aluguel" {...register("descricao")} />}
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

        <CampoDoMolde rotulo="Vencimento" obrigatorio erro={errors.vencimento?.message}>
          {(campo) => <input {...campo} type="date" {...register("vencimento")} />}
        </CampoDoMolde>

        <CampoDoMolde rotulo="Categoria" largura="inteira" ajuda="Opcional. É a mesma lista das Saídas do Caixa.">
          {(campo) => (
            <Combobox
              id={campo.id}
              opcoes={categoriasSaida.map((categoria) => ({
                valor: categoria.id,
                rotulo: categoria.nome,
              }))}
              valor={watch("categoria_id")}
              onMudar={(v) => setValue("categoria_id", v)}
              opcaoVazia="Sem categoria"
              placeholder="Sem categoria"
            />
          )}
        </CampoDoMolde>

        <label className="col-span-full flex min-h-10 items-center gap-3 text-corpo text-texto">
          <input type="checkbox" {...register("recorrente")} className="size-5 shrink-0 accent-acao" />
          Conta mensal recorrente (ao pagar, já cria a próxima automaticamente)
        </label>

        {watch("recorrente") && (
          <CampoDoMolde
            rotulo="Recorrente até"
            ajuda="Opcional. Deixe em branco pra continuar repetindo sem data pra parar."
          >
            {(campo) => <input {...campo} type="date" {...register("recorrente_ate")} />}
          </CampoDoMolde>
        )}
      </SecaoDoFormulario>
    </MoldeFormulario>
  );
}

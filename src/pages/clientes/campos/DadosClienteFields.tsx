import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { ClienteFormValues } from "@/schemas/cliente";
import type { TipoPessoa } from "@/types/cliente";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

export function DadosClienteFields({
  register,
  errors,
  tipoPessoa,
}: {
  register: UseFormRegister<ClienteFormValues>;
  errors: FieldErrors<ClienteFormValues>;
  tipoPessoa: TipoPessoa;
}) {
  return (
    <Secao titulo="Dados do cliente">
      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2 text-corpo">
          <input
            type="radio"
            value="fisica"
            {...register("tipo_pessoa")}
            className="h-4 w-4 text-sakura-purple focus:ring-sakura-purple"
          />
          <span className="text-sakura-purple-dark/80">Pessoa física</span>
        </label>
        <label className="flex items-center gap-2 text-corpo">
          <input
            type="radio"
            value="juridica"
            {...register("tipo_pessoa")}
            className="h-4 w-4 text-sakura-purple focus:ring-sakura-purple"
          />
          <span className="text-sakura-purple-dark/80">Pessoa jurídica</span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo
          label={tipoPessoa === "juridica" ? "Razão social" : "Nome completo"}
          obrigatorio
          erro={errors.nome?.message}
        >
          <input type="text" {...register("nome")} className={inputClasse} />
        </Campo>
        <Campo label={tipoPessoa === "juridica" ? "CNPJ" : "CPF"}>
          <input type="text" {...register("cpf_cnpj")} className={inputClasse} />
        </Campo>
        <Campo label="Telefone">
          <input type="text" {...register("telefone")} className={inputClasse} />
        </Campo>
        <Campo label="E-mail">
          <input type="email" {...register("email")} className={inputClasse} />
        </Campo>
        <Campo label="Data de nascimento">
          <input type="date" {...register("data_nascimento")} className={inputClasse} />
        </Campo>
      </div>
      <label className="mt-4 flex items-center gap-2 text-corpo">
        <input
          type="checkbox"
          {...register("nao_avisar")}
          className="h-4 w-4 rounded border-sakura-borda-campo text-sakura-purple focus:ring-sakura-purple"
        />
        <span className="text-sakura-purple-dark/80">Não mandar lembrete pra este cliente</span>
      </label>
      <p className="mt-1 text-rotulo text-sakura-muted">
        Ele não aparece na lista de Retornos nem na de clientes que sumiram.
      </p>
    </Secao>
  );
}

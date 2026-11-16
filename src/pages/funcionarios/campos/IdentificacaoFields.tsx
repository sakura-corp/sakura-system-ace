import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { FuncionarioFormValues } from "@/schemas/funcionario";
import { ESTADOS_CIVIS, TIPOS_SANGUINEOS } from "@/types/funcionario";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

export function IdentificacaoFields({
  register,
  errors,
}: {
  register: UseFormRegister<FuncionarioFormValues>;
  errors: FieldErrors<FuncionarioFormValues>;
}) {
  return (
    <Secao titulo="Identificação">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Campo label="Nome" obrigatorio erro={errors.nome?.message}>
          <input
            type="text"
            aria-invalid={errors.nome ? true : undefined}
            {...register("nome")}
            className={inputClasse}
          />
        </Campo>
        <Campo label="Cargo">
          <input
            type="text"
            placeholder="Ex: Mecânico, Vendedor, Faxineira"
            {...register("cargo")}
            className={inputClasse}
          />
        </Campo>
        <Campo label="Data de nascimento">
          <input type="date" {...register("data_nascimento")} className={inputClasse} />
        </Campo>
        <Campo label="Sexo">
          <select {...register("sexo")} className={inputClasse}>
            <option value="">Selecione</option>
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
          </select>
        </Campo>
        <Campo label="Estado civil">
          <select {...register("estado_civil")} className={inputClasse}>
            <option value="">Selecione</option>
            {ESTADOS_CIVIS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Tipo sanguíneo">
          <select {...register("tipo_sanguineo")} className={inputClasse}>
            <option value="">Selecione</option>
            {TIPOS_SANGUINEOS.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </select>
        </Campo>
      </div>
    </Secao>
  );
}

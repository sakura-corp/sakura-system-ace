import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { buscarEnderecoPorCep } from "@/lib/viaCep";
import type { ClienteFormValues } from "@/schemas/cliente";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

export function EnderecoFields({
  register,
  setValue,
}: {
  register: UseFormRegister<ClienteFormValues>;
  setValue: UseFormSetValue<ClienteFormValues>;
}) {
  const uf = register("uf");
  const cep = register("cep");

  async function aoSairDoCep(valor: string) {
    const endereco = await buscarEnderecoPorCep(valor);
    if (!endereco) return;
    setValue("rua", endereco.logradouro);
    setValue("bairro", endereco.bairro);
    setValue("cidade", endereco.localidade);
    setValue("uf", endereco.uf);
    if (endereco.ibge) setValue("codigo_municipio", endereco.ibge);
  }

  return (
    <Secao titulo="Endereço">
      <div className="grid grid-cols-3 gap-4">
        <Campo label="CEP">
          <input
            type="text"
            {...cep}
            onBlur={(e) => {
              cep.onBlur(e);
              aoSairDoCep(e.target.value);
            }}
            className={inputClasse}
          />
        </Campo>
        <Campo label="Rua">
          <input type="text" {...register("rua")} className={inputClasse} />
        </Campo>
        <Campo label="Número">
          <input type="text" {...register("numero")} className={inputClasse} />
        </Campo>
        <Campo label="Bairro">
          <input type="text" {...register("bairro")} className={inputClasse} />
        </Campo>
        <Campo label="Cidade">
          <input type="text" {...register("cidade")} className={inputClasse} />
        </Campo>
        <Campo label="UF">
          <input
            type="text"
            {...uf}
            onChange={(e) => {
              e.target.value = e.target.value.toUpperCase();
              uf.onChange(e);
            }}
            className={inputClasse}
          />
        </Campo>
        <Campo label="Código da cidade (IBGE), só pra nota de serviço">
          <input type="text" {...register("codigo_municipio")} className={inputClasse} />
        </Campo>
      </div>
    </Secao>
  );
}

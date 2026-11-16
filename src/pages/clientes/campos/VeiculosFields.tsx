import type { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { Combobox } from "@/components/Combobox";
import { MARCAS_VEICULO } from "@/lib/marcasVeiculo";
import { type ClienteFormValues, veiculoFormVazio } from "@/schemas/cliente";
import { TIPO_VEICULO_LABEL, type TipoVeiculo } from "@/types/cliente";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

const OPCOES_MARCA = MARCAS_VEICULO.map((marca) => ({ valor: marca, rotulo: marca }));

export function VeiculosFields({
  control,
  register,
  watch,
  setValue,
}: {
  control: Control<ClienteFormValues>;
  register: UseFormRegister<ClienteFormValues>;
  watch: UseFormWatch<ClienteFormValues>;
  setValue: UseFormSetValue<ClienteFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "veiculos" });

  return (
    <Secao titulo="Veículos">
      <div className="space-y-4">
        {fields.map((campo, index) => {
          const placa = register(`veiculos.${index}.placa`);
          return (
            <div key={campo.id} className="relative rounded-xl border border-linha bg-poco p-4">
              {fields.length > 1 && (
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-rotulo font-medium text-texto-2">Veículo {index + 1}</p>
                  <Botao
                    tamanho="pequeno"
                    variante="fantasma"
                    onClick={() => remove(index)}
                    className="text-perigo hover:text-perigo"
                  >
                    Remover
                  </Botao>
                </div>
              )}
              <input type="hidden" {...register(`veiculos.${index}.id`)} />
              <div className="grid grid-cols-3 gap-4">
                <Campo label="Placa">
                  <input
                    type="text"
                    {...placa}
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                      placa.onChange(e);
                    }}
                    className={inputClasse}
                  />
                </Campo>
                <Campo label="Marca">
                  <Combobox
                    opcoes={OPCOES_MARCA}
                    valor={watch(`veiculos.${index}.marca`)}
                    onMudar={(v) => setValue(`veiculos.${index}.marca`, v)}
                    opcaoVazia="Sem marca"
                    placeholder="Selecione ou digite..."
                    permitirLivre
                  />
                </Campo>
                <Campo label="Modelo">
                  <input
                    type="text"
                    {...register(`veiculos.${index}.modelo`)}
                    className={inputClasse}
                  />
                </Campo>
                <Campo label="Ano">
                  <input
                    type="number"
                    {...register(`veiculos.${index}.ano`)}
                    className={inputClasse}
                  />
                </Campo>
                <Campo label="Cor">
                  <input
                    type="text"
                    {...register(`veiculos.${index}.cor`)}
                    className={inputClasse}
                  />
                </Campo>
                <Campo label="KM atual">
                  <input
                    type="number"
                    {...register(`veiculos.${index}.km_atual`)}
                    className={inputClasse}
                  />
                </Campo>
                <Campo label="Tipo">
                  <select {...register(`veiculos.${index}.tipo`)} className={inputClasse}>
                    <option value="">Selecione...</option>
                    {(Object.keys(TIPO_VEICULO_LABEL) as TipoVeiculo[]).map((chave) => (
                      <option key={chave} value={chave}>
                        {TIPO_VEICULO_LABEL[chave]}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            </div>
          );
        })}
      </div>

      <Botao
        tamanho="pequeno"
        className="mt-4"
        onClick={() => append({ ...veiculoFormVazio })}
      >
        + Adicionar veículo
      </Botao>
    </Secao>
  );
}

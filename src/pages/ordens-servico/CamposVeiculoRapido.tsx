import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { FieldValues, Path } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import { MARCAS_VEICULO } from "@/lib/marcasVeiculo";
import { TIPO_VEICULO_LABEL, type TipoVeiculo } from "@/types/cliente";
import { Campo, inputClasse } from "./campos/FormCompartilhado";

const OPCOES_MARCA = MARCAS_VEICULO.map((marca) => ({ valor: marca, rotulo: marca }));

/**
 * Placa, marca, modelo, tipo e cor — o mínimo pra identificar o carro que acabou de
 * chegar. Os dois modais de cadastro rápido (cliente novo e carro novo de
 * cliente que já existe) mostram exatamente esses campos, então eles
 * vivem aqui em vez de aparecerem escritos duas vezes.
 *
 * `prefixo` é o caminho do veículo dentro do formulário que estiver usando:
 * `"veiculos.0"` no cadastro de cliente (onde o veículo é um item da lista) e
 * `""` no de veículo avulso (onde o formulário É o veículo).
 */
export function CamposVeiculoRapido<T extends FieldValues>({
  register,
  watch,
  setValue,
  prefixo,
}: {
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  setValue: UseFormSetValue<T>;
  prefixo: string;
}) {
  const caminho = (campo: string) => (prefixo ? `${prefixo}.${campo}` : campo) as Path<T>;
  const placa = register(caminho("placa"));

  return (
    <>
      <Campo label="Placa">
        <input
          type="text"
          {...placa}
          // Placa em caixa alta, igual ao cadastro completo de Clientes
          // (VeiculosFields.tsx): o onChange próprio precisa chamar o do
          // react-hook-form no fim, senão o campo deixa de ser registrado e
          // o valor nunca chega no formulário.
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
            placa.onChange(e);
          }}
          className={inputClasse}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Marca">
          <Combobox
            tamanho="filtro"
            opcoes={OPCOES_MARCA}
            valor={(watch(caminho("marca")) as string) ?? ""}
            onMudar={(v) => setValue(caminho("marca"), v as never)}
            permitirLivre
            placeholder="Selecione ou digite"
          />
        </Campo>

        <Campo label="Modelo">
          <input type="text" {...register(caminho("modelo"))} className={inputClasse} />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Tipo">
          {/* A lista vem de TIPO_VEICULO_LABEL: quando a trilha C (#1096)
              trocar os tipos, é só trocar lá; aqui nada muda. Vazio é
              permitido (aviso, nunca tranca). */}
          <select {...register(caminho("tipo"))} className={inputClasse}>
            <option value="">Escolha o tipo</option>
            {(Object.keys(TIPO_VEICULO_LABEL) as TipoVeiculo[]).map((chave) => (
              <option key={chave} value={chave}>
                {TIPO_VEICULO_LABEL[chave]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Cor">
          <input type="text" {...register(caminho("cor"))} className={inputClasse} />
        </Campo>
      </div>
    </>
  );
}

import { useState } from "react";
import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import {
  UNIDADE_OUTRA,
  UNIDADES_PADRAO,
  unidadeEstaNaLista,
  type PecaFormValues,
} from "@/schemas/peca";
import type { Categoria } from "@/types/categoria";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

export function DadosCadastraisFields({
  register,
  watch,
  setValue,
  errors,
  categorias,
}: {
  register: UseFormRegister<PecaFormValues>;
  watch: UseFormWatch<PecaFormValues>;
  setValue: UseFormSetValue<PecaFormValues>;
  errors: FieldErrors<PecaFormValues>;
  categorias: Categoria[];
}) {
  // A unidade virou lista fechada (item TL-12): "UN", "Un" e "un" viravam
  // três coisas em qualquer agrupamento, e unidade divergente do que a nota
  // espera é rejeição. Mas lista fechada sem saída é tranca — quem precisar
  // de uma unidade que não está na lista escolhe "Outra" e digita. Uma peça
  // já cadastrada com unidade fora da lista abre direto no modo digitável,
  // em vez de ter o valor dela trocado por um da lista sem avisar.
  const [unidadeLivre, setUnidadeLivre] = useState(
    () => !unidadeEstaNaLista(watch("unidade") || "UN"),
  );

  return (
    <Secao titulo="Dados cadastrais">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Descrição" obrigatorio erro={errors.descricao?.message}>
          <input type="text" {...register("descricao")} className={inputClasse} />
        </Campo>
        <Campo
          label="Código de barras"
          explicacao="O código que o leitor lê na embalagem. Preenchido aqui, a peça passa a ser encontrada bipando o código no campo de busca da lista de Produtos."
        >
          <input type="text" {...register("codigo_barras")} className={inputClasse} />
        </Campo>
        <Campo label="Referência">
          <input type="text" {...register("codigo_interno")} className={inputClasse} />
        </Campo>
        <Campo label="Marca">
          <input type="text" {...register("marca")} className={inputClasse} />
        </Campo>
        <Campo label="Modelo">
          <input type="text" {...register("modelo")} className={inputClasse} />
        </Campo>

        <Campo label="Unidade" obrigatorio erro={errors.unidade?.message}>
          {unidadeLivre ? (
            <input
              type="text"
              {...register("unidade")}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                setValue("unidade", e.target.value);
              }}
              placeholder="Digite a unidade"
              className={inputClasse}
            />
          ) : (
            <select
              value={watch("unidade")}
              onChange={(e) => {
                if (e.target.value === UNIDADE_OUTRA) {
                  setUnidadeLivre(true);
                  setValue("unidade", "");
                  return;
                }
                setValue("unidade", e.target.value);
              }}
              className={inputClasse}
            >
              {UNIDADES_PADRAO.map((unidade) => (
                <option key={unidade.valor} value={unidade.valor}>
                  {unidade.rotulo}
                </option>
              ))}
              <option value={UNIDADE_OUTRA}>Outra...</option>
            </select>
          )}
        </Campo>

        <Campo label="Categoria">
          <Combobox
            opcoes={categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.nome }))}
            valor={watch("categoria_id")}
            onMudar={(v) => setValue("categoria_id", v)}
            opcaoVazia="Sem categoria"
            placeholder="Sem categoria"
          />
        </Campo>

        <Campo
          label="Estoque mínimo (opcional)"
          explicacao="A quantidade a partir da qual esta peça precisa ser recomprada. Chegando nela, a peça aparece destacada na lista e no filtro 'Precisa comprar'. Em branco, o sistema não avisa nada sobre esta peça."
        >
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("estoque_minimo")}
            className={inputClasse}
          />
        </Campo>

        <Campo label="Garantia (dias, opcional)">
          <input
            type="number"
            step="1"
            {...register("prazo_garantia_dias")}
            className={inputClasse}
          />
        </Campo>
      </div>
      <Campo label="Aplicação" className="mt-4">
        <textarea rows={2} {...register("aplicacao")} className={inputClasse} />
      </Campo>
    </Secao>
  );
}

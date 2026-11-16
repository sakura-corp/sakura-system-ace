import { Plus } from "lucide-react";
import type { Control, UseFormRegister } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Botao } from "@/components/Botao";
import type { FuncionarioFormValues } from "@/schemas/funcionario";
import { Campo, inputClasse, Secao } from "./FormCompartilhado";

export function FilhosFields({
  control,
  register,
}: {
  control: Control<FuncionarioFormValues>;
  register: UseFormRegister<FuncionarioFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "filhos" });

  return (
    <Secao titulo="Filhos">
      <div className="space-y-3">
        {fields.map((campo, index) => (
          <div key={campo.id} className="flex items-end gap-3">
            <Campo label="Nome do filho(a)" className="flex-1">
              <input
                type="text"
                {...register(`filhos.${index}.nome`)}
                className={inputClasse}
              />
            </Campo>
            <Campo label="Nascimento">
              <input
                type="date"
                {...register(`filhos.${index}.data_nascimento`)}
                className={inputClasse}
              />
            </Campo>
            {/* Só tira a linha do formulário: nada é apagado do cadastro até
                o "Salvar funcionário". */}
            <Botao
              variante="fantasma"
              onClick={() => remove(index)}
              className="!text-perigo hover:!text-perigo"
            >
              Remover
            </Botao>
          </div>
        ))}
        <Botao
          variante="fantasma"
          icone={<Plus />}
          onClick={() => append({ nome: "", data_nascimento: "" })}
        >
          Adicionar filho(a)
        </Botao>
      </div>
    </Secao>
  );
}

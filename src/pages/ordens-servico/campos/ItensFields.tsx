import type { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { itemFormVazio, type OrdemServicoFormValues } from "@/schemas/ordemServico";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { ItemOS, PatchItemOS } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { ItemExistenteRow } from "../ItemExistenteRow";
import { ItemOSRow } from "../ItemOSRow";

export function ItensFields({
  control,
  register,
  watch,
  setValue,
  itensExistentes,
  podeAdicionarItem,
  podeEditarItem,
  avisoItens,
  onEditarItem,
  pecas,
  servicos,
  funcionarios,
  saldoPorPeca,
  saldoCarregado,
  permitePecaAvulsa = false,
}: {
  control: Control<OrdemServicoFormValues>;
  register: UseFormRegister<OrdemServicoFormValues>;
  watch: UseFormWatch<OrdemServicoFormValues>;
  setValue: UseFormSetValue<OrdemServicoFormValues>;
  itensExistentes: ItemOS[];
  podeAdicionarItem: boolean;
  podeEditarItem: boolean;
  avisoItens: string | null;
  onEditarItem: (item: ItemOS, patch: PatchItemOS) => Promise<void>;
  pecas: PecaJanela[];
  servicos: Servico[];
  funcionarios: FuncionarioPublico[];
  saldoPorPeca: Map<string, number>;
  saldoCarregado: boolean;
  /** Só o orçamento (#655): peça digitada sem cadastro. */
  permitePecaAvulsa?: boolean;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "itens" });

  return (
    <section>
      <h3 className="mb-3 text-corpo font-semibold text-texto">Peças e serviços</h3>

      {avisoItens && <p className="mb-3 text-rotulo text-texto-2">{avisoItens}</p>}

      {itensExistentes.length > 0 && (
        <div className="mb-3 space-y-1.5 rounded-lg bg-poco p-3">
          <p className="mb-1 text-rotulo font-medium text-texto/85">Já lançados nesta OS</p>
          {itensExistentes.map((item) => (
            <ItemExistenteRow
              key={item.id}
              item={item}
              podeEditar={podeEditarItem}
              pecas={pecas}
              servicos={servicos}
              funcionarios={funcionarios}
              permitePecaAvulsa={permitePecaAvulsa}
              onSalvar={onEditarItem}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {fields.map((campo, index) => (
          <ItemOSRow
            key={campo.id}
            index={index}
            register={register}
            watch={watch}
            setValue={setValue}
            pecas={pecas}
            servicos={servicos}
            funcionarios={funcionarios}
            saldoPorPeca={saldoPorPeca}
            saldoCarregado={saldoCarregado}
            permitePecaAvulsa={permitePecaAvulsa}
            onRemover={() => remove(index)}
          />
        ))}
        {fields.length === 0 && (
          <p className="text-rotulo text-texto-2">
            Nenhum item novo — use "+ adicionar item" pra lançar mais peças ou serviços.
          </p>
        )}
      </div>

      {/* O botão fica embaixo, colado no último item: com a OS cheia de peça,
          subir a tela toda pra adicionar mais uma era o que atrapalhava. */}
      {podeAdicionarItem && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => append({ ...itemFormVazio })}
            className="rounded-lg border border-acao/40 px-3 py-1.5 text-rotulo font-medium text-acao hover:bg-acao/10"
          >
            + adicionar item
          </button>
        </div>
      )}
    </section>
  );
}

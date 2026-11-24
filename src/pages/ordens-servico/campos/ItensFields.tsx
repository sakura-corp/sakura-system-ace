import { useState, type RefObject } from "react";
import type { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Combobox } from "@/components/Combobox";
import {
  aplicarTecnicoATodos,
  incluirNaOS,
  itemAvulso,
  type ResultadoDaBusca,
} from "@/schemas/buscaDeItens";
import type { OrdemServicoFormValues } from "@/schemas/ordemServico";
import type { FuncionarioPublico } from "@/types/funcionario";
import type { ItemOS, PatchItemOS } from "@/types/os";
import type { PecaJanela } from "@/types/peca";
import type { Servico } from "@/types/servico";
import { ItemExistenteRow } from "../ItemExistenteRow";
import { ItemOSRow } from "../ItemOSRow";
import { BuscaDeItens } from "./BuscaDeItens";
import { TabelaDeItens } from "./TabelaDeItens";

/**
 * Os itens da OS e do orçamento (#1087): a busca única em cima, o "Técnico pra
 * todos" ao lado dela, e a tabela embaixo, com os itens já gravados e os novos
 * na mesma tabela.
 */
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
  buscaRef,
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
  /** Pro formulário pôr o foco na busca ao abrir. */
  buscaRef?: RefObject<HTMLInputElement | null>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "itens" });
  // O técnico que vale pros PRÓXIMOS itens (e que "pra todos" acabou de pôr).
  const [tecnicoPadrao, setTecnicoPadrao] = useState("");

  function aoEscolher(escolha: ResultadoDaBusca) {
    const antes = watch("itens");
    const depois = incluirNaOS(antes, escolha, tecnicoPadrao);
    if (depois.length > antes.length) {
      // `shouldFocus: false`: o foco volta pra busca (quem chama), não pro
      // primeiro campo da linha nova.
      append(depois[depois.length - 1], { shouldFocus: false });
      return;
    }
    // Já estava na lista: só a quantidade mudou (soma 1).
    depois.forEach((item, i) => {
      if (item.quantidade !== antes[i]?.quantidade) {
        setValue(`itens.${i}.quantidade`, item.quantidade, { shouldDirty: true });
      }
    });
  }

  function aoEscolherAvulso(tipo: "peca" | "servico", descricao: string) {
    append(itemAvulso(tipo, descricao, tecnicoPadrao), { shouldFocus: false });
  }

  function aoEscolherTecnicoParaTodos(tecnicoId: string) {
    setTecnicoPadrao(tecnicoId);
    aplicarTecnicoATodos(watch("itens"), tecnicoId).forEach((item, i) => {
      setValue(`itens.${i}.tecnico_id`, item.tecnico_id, { shouldDirty: true });
    });
  }

  return (
    <section className="space-y-4">
      <h3 className="text-subtitulo font-semibold text-texto">Peças e serviços</h3>

      {avisoItens && <p className="text-rotulo text-texto-2">{avisoItens}</p>}

      {podeAdicionarItem && (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <BuscaDeItens
            className="min-w-0 flex-1 basis-80"
            pecas={pecas}
            servicos={servicos}
            saldoPorPeca={saldoPorPeca}
            saldoCarregado={saldoCarregado}
            permitePecaAvulsa={permitePecaAvulsa}
            onEscolher={aoEscolher}
            onAvulso={aoEscolherAvulso}
            inputRef={buscaRef}
          />
          <div className="sakura-rotulo w-64 min-w-0 shrink-0">
            Técnico pra todos
            <Combobox
              opcoes={funcionarios.map((funcionario) => ({
                valor: funcionario.id,
                rotulo: funcionario.nome,
              }))}
              valor={tecnicoPadrao}
              onMudar={aoEscolherTecnicoParaTodos}
              opcaoVazia="Sem técnico definido"
              placeholder="Sem técnico definido"
            />
            <span className="text-meta font-normal text-texto-2">Vale pros itens novos</span>
          </div>
        </div>
      )}

      <TabelaDeItens
        comTecnico
        vazio={itensExistentes.length === 0 && fields.length === 0}
        textoVazio={
          podeAdicionarItem
            ? "Nenhum item ainda: busque uma peça ou serviço acima."
            : "Nenhum item nesta OS."
        }
      >
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
      </TabelaDeItens>
    </section>
  );
}

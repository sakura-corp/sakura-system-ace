import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  paraNovoServico,
  paraValoresFormulario,
  servicoFormSchema,
  type ServicoFormValues,
} from "@/schemas/servico";
import type { CategoriaServico } from "@/types/categoriaServico";
import type { NovoServico, Servico } from "@/types/servico";

interface ServicoFormProps {
  categorias: CategoriaServico[];
  servicoExistente?: Servico;
  onSalvar: (servico: NovoServico) => Promise<void>;
  onSalvarEdicao?: (id: string, servico: NovoServico) => Promise<void>;
  onCancelar: () => void;
}

export function ServicoForm({
  categorias,
  servicoExistente,
  onSalvar,
  onSalvarEdicao,
  onCancelar,
}: ServicoFormProps) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoFormSchema),
    defaultValues: paraValoresFormulario(servicoExistente),
  });

  async function aoSubmeter(valores: ServicoFormValues) {
    setErro(null);
    try {
      const novoServico = paraNovoServico(valores, servicoExistente?.ativo ?? true);
      if (servicoExistente && onSalvarEdicao) {
        await onSalvarEdicao(servicoExistente.id, novoServico);
      } else {
        await onSalvar(novoServico);
      }
    } catch (err) {
      console.error("Erro ao salvar serviço:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-texto">
          {servicoExistente ? "Editar serviço" : "Novo serviço"}
        </h2>
      </div>

      {erro && <p className="rounded-lg bg-perigo/[0.12] px-4 py-2 text-corpo text-perigo">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="sakura-rotulo col-span-2">
          Descrição <span className="text-perigo">*</span>
          <input
            type="text"
            {...register("descricao")}
            className="sakura-campo"
          />
          {errors.descricao && (
            <span className="text-rotulo text-perigo">{errors.descricao.message}</span>
          )}
        </label>

        <label className="sakura-rotulo">
          Código (opcional)
          <input
            type="text"
            {...register("codigo_interno")}
            className="sakura-campo"
          />
        </label>

        <label className="sakura-rotulo">
          Preço padrão
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("preco_padrao")}
            className="sakura-campo"
          />
        </label>

        <label className="sakura-rotulo">
          Custo (ex: mão de obra)
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("custo")}
            className="sakura-campo"
          />
        </label>

        <label className="sakura-rotulo">
          Categoria
          <Combobox
            opcoes={categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.nome }))}
            valor={watch("categoria_id")}
            onMudar={(v) => setValue("categoria_id", v)}
            opcaoVazia="Sem categoria"
            placeholder="Sem categoria"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-texto-2 hover:bg-passar"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : servicoExistente ? "Salvar alterações" : "Salvar serviço"}
        </button>
      </div>
    </form>
  );
}

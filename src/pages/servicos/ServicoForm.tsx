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
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
          {servicoExistente ? "Editar serviço" : "Novo serviço"}
        </h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Descrição <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            {...register("descricao")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.descricao && (
            <span className="text-rotulo text-red-600">{errors.descricao.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Código (opcional)</span>
          <input
            type="text"
            {...register("codigo_interno")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Preço padrão</span>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("preco_padrao")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Custo (ex: mão de obra)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register("custo")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Categoria</span>
          <Combobox
            opcoes={categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.nome }))}
            valor={watch("categoria_id")}
            onMudar={(v) => setValue("categoria_id", v)}
            opcaoVazia="Sem categoria"
            placeholder="Sem categoria"
          />
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Retorno a cada (dias)</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            {...register("intervalo_dias")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.intervalo_dias && (
            <span className="text-rotulo text-red-600">{errors.intervalo_dias.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Retorno a cada (km)</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            {...register("intervalo_km")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.intervalo_km && (
            <span className="text-rotulo text-red-600">{errors.intervalo_km.message}</span>
          )}
        </label>

        <p className="col-span-2 text-rotulo text-sakura-muted">
          A cada quantos dias ou quantos km o cliente deve voltar; 6 meses = 180 dias. Vazio: este
          serviço não gera lembrete.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl px-4 py-2 text-corpo font-medium text-sakura-purple-dark/90 hover:bg-sakura-gray/10"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : servicoExistente ? "Salvar alterações" : "Salvar serviço"}
        </button>
      </div>
    </form>
  );
}

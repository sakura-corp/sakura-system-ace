import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import { AvisoDeErro, CAMPO_NOVO_NO_COMBOBOX } from "@/pages/estoque/avisosEAbas";
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
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="font-titulo text-subtitulo font-semibold text-texto">
          {servicoExistente ? "Editar serviço" : "Novo serviço"}
        </h2>
      </div>

      {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

      <div className="grid grid-cols-2 gap-4">
        <label className="sakura-rotulo col-span-2">
          <span>Descrição <span className="text-perigo">*</span></span>
          <input
            type="text"
            {...register("descricao")}
            aria-invalid={errors.descricao ? true : undefined}
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
            className={CAMPO_NOVO_NO_COMBOBOX}
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
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="principal" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : servicoExistente ? "Salvar alterações" : "Salvar serviço"}
        </Botao>
      </div>
    </form>
  );
}

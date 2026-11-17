import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { Combobox } from "@/components/Combobox";
import { mensagemDeErro } from "@/lib/errors";
import {
  contaPagarFormSchema,
  contaPagarFormVazio,
  paraNovaContaPagar,
  type ContaPagarFormValues,
} from "@/schemas/contaPagar";
import type { CategoriaCaixa } from "@/types/categoriaCaixa";
import type { NovaContaPagar } from "@/types/contaPagar";
import { AvisoDeErro } from "@/components/Aviso";

interface ContaPagarFormProps {
  categorias: CategoriaCaixa[];
  onSalvar: (conta: NovaContaPagar) => Promise<void>;
  onCancelar: () => void;
}

export function ContaPagarForm({ categorias, onSalvar, onCancelar }: ContaPagarFormProps) {
  const [erro, setErro] = useState<string | null>(null);
  const categoriasSaida = categorias.filter((c) => c.tipo === "saida");

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContaPagarFormValues>({
    resolver: zodResolver(contaPagarFormSchema),
    defaultValues: contaPagarFormVazio,
  });

  async function aoSubmeter(valores: ContaPagarFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovaContaPagar(valores));
    } catch (err) {
      console.error("Erro ao cadastrar conta a pagar:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-5 sakura-card p-6">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-texto">Nova conta</h2>
      </div>

      {erro && (
        <AvisoDeErro>{erro}</AvisoDeErro>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="sakura-rotulo col-span-2">
          <span>
            Descrição <span className="text-perigo">*</span>
          </span>
          <input
            type="text"
            placeholder="Ex: Aluguel"
            aria-invalid={errors.descricao ? "true" : undefined}
            {...register("descricao")}
            className="sakura-campo"
          />
          {errors.descricao && (
            <span className="text-rotulo font-normal text-perigo">{errors.descricao.message}</span>
          )}
        </label>

        <label className="sakura-rotulo">
          <span>
            Valor <span className="text-perigo">*</span>
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            aria-invalid={errors.valor ? "true" : undefined}
            {...register("valor")}
            className="sakura-campo"
          />
          {errors.valor && <span className="text-rotulo font-normal text-perigo">{errors.valor.message}</span>}
        </label>

        <label className="sakura-rotulo">
          <span>
            Vencimento <span className="text-perigo">*</span>
          </span>
          <input
            type="date"
            aria-invalid={errors.vencimento ? "true" : undefined}
            {...register("vencimento")}
            className="sakura-campo"
          />
          {errors.vencimento && (
            <span className="text-rotulo font-normal text-perigo">{errors.vencimento.message}</span>
          )}
        </label>

        <label className="sakura-rotulo">
          <span>Categoria (opcional)</span>
          <Combobox
            opcoes={categoriasSaida.map((categoria) => ({
              valor: categoria.id,
              rotulo: categoria.nome,
            }))}
            valor={watch("categoria_id")}
            onMudar={(v) => setValue("categoria_id", v)}
            opcaoVazia="Sem categoria"
            placeholder="Sem categoria"
          />
        </label>

        <label className="col-span-2 flex items-center gap-2.5 text-corpo text-texto">
          <input
            type="checkbox"
            {...register("recorrente")}
            className="size-4 shrink-0 accent-acao"
          />
          Conta mensal recorrente (ao pagar, já cria a próxima automaticamente)
        </label>

        {watch("recorrente") && (
          <label className="sakura-rotulo">
            <span>Recorrente até (opcional)</span>
            <input
              type="date"
              {...register("recorrente_ate")}
              className="sakura-campo"
            />
            <span className="text-rotulo font-normal text-texto-2">
              Deixe em branco pra continuar repetindo sem data pra parar.
            </span>
          </label>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="principal" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Cadastrar"}
        </Botao>
      </div>
    </form>
  );
}

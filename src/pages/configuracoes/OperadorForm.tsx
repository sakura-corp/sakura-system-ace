import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { BotaoVoltar } from "@/components/BotaoVoltar";
import { mensagemDeErro } from "@/lib/errors";
import {
  criarOperadorFormSchema,
  paraNovoOperador,
  paraValoresFormulario,
  type OperadorFormValues,
} from "@/schemas/operador";
import type { Loja } from "@/types/loja";
import { MODULOS } from "@/types/operador";
import type { NovoOperador, Operador } from "@/types/operador";

interface OperadorFormProps {
  operadorExistente?: Operador;
  lojasDisponiveis: Loja[];
  lojaIdsExistente?: string[];
  onSalvar: (operador: NovoOperador, senha: string, lojaIds: string[]) => Promise<void>;
  onCancelar: () => void;
}

export function OperadorForm({
  operadorExistente,
  lojasDisponiveis,
  lojaIdsExistente,
  onSalvar,
  onCancelar,
}: OperadorFormProps) {
  const editando = Boolean(operadorExistente);
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OperadorFormValues>({
    resolver: zodResolver(criarOperadorFormSchema(editando)),
    defaultValues: paraValoresFormulario(operadorExistente, lojaIdsExistente),
  });

  const admin = watch("admin");

  async function aoSubmeter(valores: OperadorFormValues) {
    setErro(null);
    try {
      await onSalvar(paraNovoOperador(valores), valores.senha, valores.lojaIds);
    } catch (err) {
      console.error("Erro ao salvar operador:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-6 sakura-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h2 className="text-subtitulo font-semibold text-sakura-purple-dark">
          {editando ? "Editar operador" : "Novo operador"}
        </h2>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Usuário {!editando && <span className="text-red-500">*</span>}
          </span>
          <input
            type="text"
            disabled={editando}
            {...register("usuario")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple disabled:bg-sakura-gray/10 disabled:text-sakura-muted"
          />
          {errors.usuario && (
            <span className="text-rotulo text-red-600">{errors.usuario.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">
            Nome completo <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            {...register("nome")}
            className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
          />
          {errors.nome && <span className="text-rotulo text-red-600">{errors.nome.message}</span>}
        </label>

        {!editando && (
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">
              Senha <span className="text-red-500">*</span>
            </span>
            <input
              type="password"
              {...register("senha")}
              className="rounded-lg border border-sakura-borda-campo px-3 py-2 focus:border-sakura-purple"
            />
            {errors.senha && (
              <span className="text-rotulo text-red-600">{errors.senha.message}</span>
            )}
          </label>
        )}

        {editando && (
          <label className="flex items-center gap-2 text-corpo">
            <input
              type="checkbox"
              {...register("ativo")}
              className="h-4 w-4 rounded border-sakura-borda-campo text-sakura-purple focus:ring-sakura-purple"
            />
            <span className="text-sakura-purple-dark/80">
              Operador ativo (desmarque para bloquear o login)
            </span>
          </label>
        )}
      </div>

      <section>
        <label className="flex items-center gap-2 text-corpo">
          <input
            type="checkbox"
            {...register("admin")}
            className="h-4 w-4 rounded border-sakura-borda-campo text-sakura-purple focus:ring-sakura-purple"
          />
          <span className="font-medium text-sakura-purple-dark">
            Administrador (acesso total, inclusive Configurações)
          </span>
        </label>

        {!admin && (
          <div className="mt-4">
            <h3 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">
              Módulos liberados
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {MODULOS.map((modulo) => (
                <label key={modulo.chave} className="flex items-center gap-2 text-corpo">
                  <input
                    type="checkbox"
                    value={modulo.chave}
                    {...register("permissoes")}
                    className="h-4 w-4 rounded border-sakura-borda-campo text-sakura-purple focus:ring-sakura-purple"
                  />
                  <span className="text-sakura-purple-dark/80">{modulo.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {lojasDisponiveis.length > 1 && (
        <section>
          <h3 className="mb-3 text-corpo font-semibold text-sakura-purple-dark">Lojas com acesso</h3>
          <div className="grid grid-cols-2 gap-3">
            {lojasDisponiveis.map((loja) => (
              <label key={loja.id} className="flex items-center gap-2 text-corpo">
                <input
                  type="checkbox"
                  value={loja.id}
                  {...register("lojaIds")}
                  className="h-4 w-4 rounded border-sakura-borda-campo text-sakura-purple focus:ring-sakura-purple"
                />
                <span className="text-sakura-purple-dark/80">{loja.nome}</span>
              </label>
            ))}
          </div>
        </section>
      )}

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
          className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-sobre-acao hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Salvar operador"}
        </button>
      </div>
    </form>
  );
}

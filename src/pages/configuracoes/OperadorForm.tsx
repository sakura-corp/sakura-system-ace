import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Botao } from "@/components/Botao";
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
import { MensagemDeErro } from "./pecas";

// A caixinha de marcar: 18 px, na cor de ação, com o foco do teclado visível.
const CAIXINHA = "size-[18px] shrink-0 rounded accent-acao";

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
    <form
      onSubmit={handleSubmit(aoSubmeter)}
      className="space-y-6 rounded-2xl border border-linha bg-fundo/40 p-6"
    >
      <div className="flex items-center gap-3">
        <BotaoVoltar onClick={onCancelar} />
        <h3 className="text-subtitulo font-semibold text-texto">
          {editando ? "Editar operador" : "Novo operador"}
        </h3>
      </div>

      {erro && <MensagemDeErro>{erro}</MensagemDeErro>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="sakura-rotulo">
          <span>
            Usuário {!editando && <span className="text-perigo">*</span>}
          </span>
          <input
            type="text"
            disabled={editando}
            aria-invalid={errors.usuario ? true : undefined}
            {...register("usuario")}
            className="sakura-campo"
          />
          {errors.usuario && (
            <span className="text-rotulo text-perigo">{errors.usuario.message}</span>
          )}
        </label>

        <label className="sakura-rotulo">
          <span>
            Nome completo <span className="text-perigo">*</span>
          </span>
          <input
            type="text"
            aria-invalid={errors.nome ? true : undefined}
            {...register("nome")}
            className="sakura-campo"
          />
          {errors.nome && <span className="text-rotulo text-perigo">{errors.nome.message}</span>}
        </label>

        {!editando && (
          <label className="sakura-rotulo">
            <span>
              Senha <span className="text-perigo">*</span>
            </span>
            <input
              type="password"
              aria-invalid={errors.senha ? true : undefined}
              {...register("senha")}
              className="sakura-campo"
            />
            {errors.senha && (
              <span className="text-rotulo text-perigo">{errors.senha.message}</span>
            )}
          </label>
        )}

        {editando && (
          <label className="flex items-center gap-2 self-end pb-3 text-corpo">
            <input type="checkbox" {...register("ativo")} className={CAIXINHA} />
            <span className="text-texto">Operador ativo (desmarque para bloquear o login)</span>
          </label>
        )}
      </div>

      <section>
        <label className="flex items-center gap-2 text-corpo">
          <input type="checkbox" {...register("admin")} className={CAIXINHA} />
          <span className="font-medium text-texto">
            Administrador (acesso total, inclusive Configurações)
          </span>
        </label>

        {!admin && (
          <div className="mt-4">
            <h4 className="mb-3 text-corpo font-semibold text-texto">Módulos liberados</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODULOS.map((modulo) => (
                <label key={modulo.chave} className="flex items-center gap-2 text-corpo">
                  <input
                    type="checkbox"
                    value={modulo.chave}
                    {...register("permissoes")}
                    className={CAIXINHA}
                  />
                  <span className="text-texto">{modulo.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {lojasDisponiveis.length > 1 && (
        <section>
          <h4 className="mb-3 text-corpo font-semibold text-texto">Lojas com acesso</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {lojasDisponiveis.map((loja) => (
              <label key={loja.id} className="flex items-center gap-2 text-corpo">
                <input
                  type="checkbox"
                  value={loja.id}
                  {...register("lojaIds")}
                  className={CAIXINHA}
                />
                <span className="text-texto">{loja.nome}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-3">
        <Botao variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="principal" ocupado={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar operador"}
        </Botao>
      </div>
    </form>
  );
}

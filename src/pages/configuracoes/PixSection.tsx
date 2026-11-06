import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { apagarConfiguracaoPix, salvarConfiguracaoPix } from "@/lib/configuracoes";
import { mensagemDeErro } from "@/lib/errors";
import { tipoDaChavePix } from "@/schemas/pix";
import {
  paraConfiguracaoPix,
  paraValoresFormularioPix,
  pixFormSchema,
  ROTULO_TIPO_CHAVE_PIX,
  type PixFormValues,
} from "@/schemas/pixForm";
import type { ConfiguracaoPix } from "@/types/configuracao";

interface PixSectionProps {
  configuracao: ConfiguracaoPix | null;
  lojaId: string;
  /** Só o admin da loja grava (a RLS também recusa os outros). */
  podeEditar: boolean;
  /** Nome e cidade da loja, só pra sugerir quando ainda não há Pix cadastrado. */
  sugestao: { nome?: string | null; cidade?: string | null };
  /** Avisa a página do que ficou gravado (null = sem Pix), sem recarregar a tela toda. */
  onMudou: (nova: ConfiguracaoPix | null) => void;
}

const campoClasse =
  "w-full rounded-lg border border-sakura-borda-campo px-3 py-2 text-corpo text-sakura-purple-dark focus:border-sakura-purple disabled:opacity-60";

export function PixSection({ configuracao, lojaId, podeEditar, sugestao, onMudou }: PixSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PixFormValues>({
    resolver: zodResolver(pixFormSchema),
    defaultValues: paraValoresFormularioPix(configuracao, sugestao),
  });

  const chave = watch("chave");
  const tipo = chave.trim() ? tipoDaChavePix(chave) : null;

  async function aoSalvar(valores: PixFormValues) {
    setErro(null);
    setAviso(null);
    try {
      const dados = paraConfiguracaoPix(valores);
      await salvarConfiguracaoPix(lojaId, dados);
      reset(valores);
      onMudou({ loja_id: lojaId, ...dados });
      setAviso("Pix salvo.");
    } catch (err) {
      console.error("Erro ao salvar o Pix da loja:", err);
      setErro(mensagemDeErro(err));
    }
  }

  async function aoTirar() {
    setErro(null);
    setAviso(null);
    try {
      await apagarConfiguracaoPix(lojaId);
      reset(paraValoresFormularioPix(null, sugestao));
      onMudou(null);
      setAviso("Pix retirado. A cobrança e o faturamento voltam a ser como antes.");
    } catch (err) {
      console.error("Erro ao tirar o Pix da loja:", err);
      setErro(mensagemDeErro(err));
    }
  }

  return (
    <>
      <p className="mt-3 text-rotulo text-sakura-muted">
        É o Pix estático do Banco Central, sem banco intermediário e sem custo. O sistema não fica
        sabendo que foi pago: a baixa continua à mão.
      </p>

      {erro && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-corpo text-red-700">{erro}</p>}
      {aviso && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-2 text-corpo text-emerald-700">{aviso}</p>
      )}
      {!podeEditar && (
        <p className="mt-3 text-rotulo text-sakura-muted">
          Só quem é administrador da loja pode mudar o Pix.
        </p>
      )}

      <form onSubmit={handleSubmit(aoSalvar)} className="mt-4 space-y-4">
        <label className="flex flex-col gap-1 text-corpo">
          <span className="text-sakura-purple-dark/80">Chave Pix</span>
          <input
            type="text"
            autoComplete="off"
            placeholder="CPF, CNPJ, telefone com DDD, e-mail ou chave aleatória"
            disabled={!podeEditar}
            {...register("chave")}
            className={campoClasse}
          />
          {errors.chave ? (
            <span className="text-rotulo text-red-700">{errors.chave.message}</span>
          ) : tipo ? (
            <span className="text-rotulo text-sakura-muted">
              Reconhecida como {ROTULO_TIPO_CHAVE_PIX[tipo]}.
            </span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Nome de quem recebe (até 25 letras)</span>
            <input
              type="text"
              maxLength={25}
              disabled={!podeEditar}
              {...register("nome_recebedor")}
              className={campoClasse}
            />
            {errors.nome_recebedor && (
              <span className="text-rotulo text-red-700">{errors.nome_recebedor.message}</span>
            )}
          </label>
          <label className="flex flex-col gap-1 text-corpo">
            <span className="text-sakura-purple-dark/80">Cidade (até 15 letras)</span>
            <input
              type="text"
              maxLength={15}
              disabled={!podeEditar}
              {...register("cidade_recebedor")}
              className={campoClasse}
            />
            {errors.cidade_recebedor && (
              <span className="text-rotulo text-red-700">{errors.cidade_recebedor.message}</span>
            )}
          </label>
        </div>

        {podeEditar && (
          <div className="flex justify-end gap-3">
            {configuracao && (
              <button
                type="button"
                onClick={aoTirar}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2 text-corpo font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Tirar o Pix
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-sakura-purple px-5 py-2 text-corpo font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Salvar Pix"}
            </button>
          </div>
        )}
      </form>
    </>
  );
}

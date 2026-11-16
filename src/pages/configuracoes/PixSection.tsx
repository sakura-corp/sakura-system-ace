import { Botao } from "@/components/Botao";
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
import { AvisoDeSalvo, MensagemDeErro } from "./pecas";

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

export function PixSection({ configuracao, lojaId, podeEditar, sugestao, onMudou }: PixSectionProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tirando, setTirando] = useState(false);

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
    if (tirando) return;
    if (!confirm("Tirar o Pix desta loja? A cobrança e o faturamento deixam de mostrar o Pix.")) return;
    setTirando(true);
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
    } finally {
      setTirando(false);
    }
  }

  return (
    <>
      <p className="text-rotulo text-texto-2">
        É o Pix estático do Banco Central, sem banco intermediário e sem custo. O sistema não fica
        sabendo que foi pago: a baixa continua à mão.
      </p>

      {erro && <MensagemDeErro className="mt-4">{erro}</MensagemDeErro>}
      {!podeEditar && (
        <p className="mt-4 text-rotulo text-texto-2">
          Só quem é administrador da loja pode mudar o Pix.
        </p>
      )}

      <form onSubmit={handleSubmit(aoSalvar)} className="mt-5 space-y-4">
        <label className="sakura-rotulo">
          Chave Pix
          <input
            type="text"
            autoComplete="off"
            placeholder="CPF, CNPJ, telefone com DDD, e-mail ou chave aleatória"
            disabled={!podeEditar}
            aria-invalid={errors.chave ? true : undefined}
            {...register("chave")}
            className="sakura-campo"
          />
          {errors.chave ? (
            <span className="text-rotulo text-perigo">{errors.chave.message}</span>
          ) : tipo ? (
            <span className="text-rotulo text-texto-2">
              Reconhecida como {ROTULO_TIPO_CHAVE_PIX[tipo]}.
            </span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sakura-rotulo">
            Nome de quem recebe (até 25 letras)
            <input
              type="text"
              maxLength={25}
              disabled={!podeEditar}
              aria-invalid={errors.nome_recebedor ? true : undefined}
              {...register("nome_recebedor")}
              className="sakura-campo"
            />
            {errors.nome_recebedor && (
              <span className="text-rotulo text-perigo">{errors.nome_recebedor.message}</span>
            )}
          </label>
          <label className="sakura-rotulo">
            Cidade (até 15 letras)
            <input
              type="text"
              maxLength={15}
              disabled={!podeEditar}
              aria-invalid={errors.cidade_recebedor ? true : undefined}
              {...register("cidade_recebedor")}
              className="sakura-campo"
            />
            {errors.cidade_recebedor && (
              <span className="text-rotulo text-perigo">{errors.cidade_recebedor.message}</span>
            )}
          </label>
        </div>

        {podeEditar && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {aviso && <AvisoDeSalvo>{aviso}</AvisoDeSalvo>}
            {configuracao && (
              <Botao
                variante="fantasma"
                onClick={aoTirar}
                disabled={isSubmitting}
                ocupado={tirando}
                className="enabled:text-perigo! enabled:hover:bg-perigo/[0.13]!"
              >
                Tirar o Pix
              </Botao>
            )}
            <Botao type="submit" variante="principal" ocupado={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Pix"}
            </Botao>
          </div>
        )}
      </form>
    </>
  );
}
